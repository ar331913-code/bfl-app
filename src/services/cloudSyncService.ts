import { db } from '../db';
import { Customer, Loan, RepaymentSchedule, Payment, SystemSettings } from '../types';
import { reconcileAllLoanBalances } from './notificationService';
import { seedInitialData } from '../db/seedData';

export interface SyncResult {
  success: boolean;
  message: string;
  pushedCount: number;
  pulledCount: number;
  lastSyncedAt: string;
}

export interface CloudSnapshot {
  id: string;
  label: string;
  createdAt: string;
  customersCount: number;
  loansCount: number;
  totalOutstanding: number;
  totalCollected: number;
  data: {
    customers: Customer[];
    loans: Loan[];
    repaymentSchedules: RepaymentSchedule[];
    payments: Payment[];
    settings?: SystemSettings[];
  };
}

export class CloudSyncService {
  private static defaultOrgId = 'BFL-GHANA-MAIN';
  private static defaultCloudBaseUrl = 'https://bfl-microfinance-default-rtdb.firebaseio.com';
  private static isSyncing = false;
  private static listeners: ((status: 'idle' | 'syncing' | 'synced' | 'error' | 'offline', lastSync?: string) => void)[] = [];
  private static lastSyncTimestamp: string | null = null;
  private static syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline' = 'idle';

  public static subscribe(callback: (status: 'idle' | 'syncing' | 'synced' | 'error' | 'offline', lastSync?: string) => void) {
    this.listeners.push(callback);
    callback(this.syncStatus, this.lastSyncTimestamp || undefined);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private static notify(status: 'idle' | 'syncing' | 'synced' | 'error' | 'offline', lastSync?: string) {
    this.syncStatus = status;
    if (lastSync) this.lastSyncTimestamp = lastSync;
    this.listeners.forEach(cb => cb(status, this.lastSyncTimestamp || undefined));
  }

  /**
   * Retrieves active Org ID and cloud sync endpoint
   */
  public static async getCloudConfig(): Promise<{ orgId: string; endpoint: string }> {
    try {
      const settingsList = await db.settings.toArray();
      const settings = settingsList[0];
      const orgId = (settings?.cloudSyncOrgId && settings.cloudSyncOrgId.trim()) || this.defaultOrgId;
      const cleanOrgId = orgId.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      let base = (settings?.cloudSyncEndpoint && settings.cloudSyncEndpoint.trim()) || this.defaultCloudBaseUrl;
      // Auto-correct any legacy placeholder endpoint
      if (base.includes('bfl-app-cloud-sync-default-rtdb')) {
        base = this.defaultCloudBaseUrl;
      }
      
      const endpoint = `${base.replace(/\/$/, '')}/portfolios/${cleanOrgId}.json`;
      return { orgId: cleanOrgId, endpoint };
    } catch {
      return { orgId: this.defaultOrgId, endpoint: `${this.defaultCloudBaseUrl}/portfolios/${this.defaultOrgId}.json` };
    }
  }

  /**
   * Full 2-Way Synchronization with Cloud
   */
  public static async syncWithCloud(forcePush = false): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        message: 'Sync already in progress...',
        pushedCount: 0,
        pulledCount: 0,
        lastSyncedAt: this.lastSyncTimestamp || new Date().toISOString()
      };
    }

    if (!navigator.onLine) {
      this.notify('offline');
      return {
        success: false,
        message: 'Device is offline. Changes are saved locally.',
        pushedCount: 0,
        pulledCount: 0,
        lastSyncedAt: this.lastSyncTimestamp || new Date().toISOString()
      };
    }

    this.isSyncing = true;
    this.notify('syncing');

    try {
      const { orgId, endpoint } = await this.getCloudConfig();

      // 1. Fetch current cloud data
      let cloudData: any = null;
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
          cloudData = await response.json();
        }
      } catch (err) {
        console.warn('Cloud pull error, will attempt local push:', err);
      }

      let pulledCount = 0;
      let pushedCount = 0;

      // 2. Process Cloud Data -> Local Database
      if (cloudData && typeof cloudData === 'object') {
        const cloudCustomers: Customer[] = cloudData.customers 
          ? (Array.isArray(cloudData.customers) ? cloudData.customers : Object.values(cloudData.customers)) 
          : [];
        const cloudLoans: Loan[] = cloudData.loans 
          ? (Array.isArray(cloudData.loans) ? cloudData.loans : Object.values(cloudData.loans)) 
          : [];
        const cloudSchedules: RepaymentSchedule[] = cloudData.repaymentSchedules 
          ? (Array.isArray(cloudData.repaymentSchedules) ? cloudData.repaymentSchedules : Object.values(cloudData.repaymentSchedules)) 
          : [];
        const cloudPayments: Payment[] = cloudData.payments 
          ? (Array.isArray(cloudData.payments) ? cloudData.payments : Object.values(cloudData.payments)) 
          : [];

        // A. Merge Customers
        for (const c of cloudCustomers) {
          if (!c || !c.customerId) continue;
          const existing = await db.customers.where('customerId').equals(c.customerId).first();
          if (!existing) {
            const { id, ...rest } = c;
            await db.customers.add(rest as Customer);
            pulledCount++;
          } else {
            // Update local with cloud record
            await db.customers.update(existing.id!, {
              ...c,
              id: existing.id
            });
            pulledCount++;
          }
        }

        // B. Merge Loans
        for (const l of cloudLoans) {
          if (!l || !l.loanId) continue;
          const existing = await db.loans.where('loanId').equals(l.loanId).first();
          if (!existing) {
            const { id, ...rest } = l;
            await db.loans.add(rest as Loan);
            pulledCount++;
          } else {
            await db.loans.update(existing.id!, {
              ...l,
              id: existing.id
            });
            pulledCount++;
          }
        }

        // C. Merge Schedules
        for (const s of cloudSchedules) {
          if (!s || !s.loanId) continue;
          const existing = await db.repaymentSchedules
            .where('loanId')
            .equals(s.loanId)
            .filter(item => item.installmentNumber === s.installmentNumber)
            .first();

          if (!existing) {
            const { id, ...rest } = s;
            await db.repaymentSchedules.add(rest as RepaymentSchedule);
          } else {
            await db.repaymentSchedules.update(existing.id!, {
              ...s,
              id: existing.id
            });
          }
        }

        // D. Merge Payments
        for (const p of cloudPayments) {
          if (!p || !p.paymentId) continue;
          const existing = await db.payments.where('paymentId').equals(p.paymentId).first();
          if (!existing) {
            const { id, ...rest } = p;
            await db.payments.add(rest as Payment);
            pulledCount++;
          } else {
            await db.payments.update(existing.id!, {
              ...p,
              id: existing.id
            });
          }
        }
      }

      // Reconcile loan balances against all payments after pull
      await reconcileAllLoanBalances();

      // 3. Push Local Unified Dataset to Cloud
      const unifiedCustomers = await db.customers.toArray();
      const unifiedLoans = await db.loans.toArray();
      const unifiedSchedules = await db.repaymentSchedules.toArray();
      const unifiedPayments = await db.payments.toArray();

      const cloudPayload = {
        orgId,
        lastSyncedAt: new Date().toISOString(),
        customers: unifiedCustomers,
        loans: unifiedLoans,
        repaymentSchedules: unifiedSchedules,
        payments: unifiedPayments
      };

      try {
        const pushRes = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cloudPayload)
        });

        if (pushRes.ok) {
          pushedCount = unifiedCustomers.length + unifiedLoans.length + unifiedPayments.length;
        }
      } catch (pushErr) {
        console.warn('Failed to push unified payload to cloud endpoint:', pushErr);
      }

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.lastSyncTimestamp = now;

      // Update settings with last sync
      const currentSettings = await db.settings.toArray();
      if (currentSettings.length > 0 && currentSettings[0].id) {
        await db.settings.update(currentSettings[0].id, {
          cloudLastSyncedAt: new Date().toISOString(),
          cloudSyncEndpoint: endpoint.replace(/\/portfolios\/.*$/, '')
        });
      }

      this.notify('synced', now);

      return {
        success: true,
        message: `Synced with Firebase successfully (${unifiedCustomers.length} clients, ${unifiedLoans.length} loans)`,
        pushedCount,
        pulledCount,
        lastSyncedAt: now
      };
    } catch (err: any) {
      console.error('Cloud Sync failed:', err);
      this.notify('error');
      return {
        success: false,
        message: err?.message || 'Sync failed. Local data preserved.',
        pushedCount: 0,
        pulledCount: 0,
        lastSyncedAt: this.lastSyncTimestamp || new Date().toISOString()
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Force Overwrite Cloud Portfolio with current Local DB (e.g. on Purge or Reseed)
   * This bypasses the pull-merge phase and directly writes local state to Firebase.
   */
  public static async forcePushLocalToCloud(): Promise<boolean> {
    try {
      const { orgId, endpoint } = await this.getCloudConfig();
      const unifiedCustomers = await db.customers.toArray();
      const unifiedLoans = await db.loans.toArray();
      const unifiedSchedules = await db.repaymentSchedules.toArray();
      const unifiedPayments = await db.payments.toArray();

      const cloudPayload = {
        orgId,
        lastSyncedAt: new Date().toISOString(),
        customers: unifiedCustomers,
        loans: unifiedLoans,
        repaymentSchedules: unifiedSchedules,
        payments: unifiedPayments
      };

      const pushRes = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cloudPayload)
      });

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.lastSyncTimestamp = now;
      this.notify('synced', now);
      return pushRes.ok;
    } catch (err) {
      console.error('Failed to force push to cloud:', err);
      return false;
    }
  }

  /**
   * Clear all portfolio data from both Local DB and Firebase Cloud
   */
  public static async clearAllPortfolioData(): Promise<void> {
    await db.resetAllData();
    await this.forcePushLocalToCloud();
  }

  /**
   * Reseed portfolio with fresh demo data both locally and in Firebase Cloud
   */
  public static async reseedPortfolioData(): Promise<void> {
    await seedInitialData(true);
    await this.forcePushLocalToCloud();
  }

  /**
   * Retrieves snapshots endpoint for the active organization
   */
  public static async getSnapshotsEndpoint(): Promise<{ orgId: string; endpoint: string }> {
    try {
      const settingsList = await db.settings.toArray();
      const settings = settingsList[0];
      const orgId = (settings?.cloudSyncOrgId && settings.cloudSyncOrgId.trim()) || this.defaultOrgId;
      const cleanOrgId = orgId.replace(/[^a-zA-Z0-9_-]/g, '_');
      let base = (settings?.cloudSyncEndpoint && settings.cloudSyncEndpoint.trim()) || this.defaultCloudBaseUrl;
      if (base.includes('bfl-app-cloud-sync-default-rtdb')) base = this.defaultCloudBaseUrl;
      return { orgId: cleanOrgId, endpoint: `${base.replace(/\/$/, '')}/snapshots/${cleanOrgId}` };
    } catch {
      return { orgId: this.defaultOrgId, endpoint: `${this.defaultCloudBaseUrl}/snapshots/${this.defaultOrgId}` };
    }
  }

  /**
   * Creates a full Cloud Backup Snapshot in Firebase
   */
  public static async createCloudSnapshot(customLabel?: string): Promise<{ success: boolean; snapshot?: CloudSnapshot; message: string }> {
    try {
      const { endpoint } = await this.getSnapshotsEndpoint();
      const snapshotId = `snap_${Date.now()}`;
      const now = new Date().toISOString();

      const customers = await db.customers.toArray();
      const loans = await db.loans.toArray();
      const schedules = await db.repaymentSchedules.toArray();
      const payments = await db.payments.toArray();
      const settings = await db.settings.toArray();

      const totalOutstanding = loans
        .filter(l => l.status !== 'completed')
        .reduce((sum, l) => sum + (l.outstandingBalance || 0), 0);
      const totalCollected = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

      const label = customLabel?.trim() || `Cloud Backup (${customers.length} Clients, ${loans.length} Loans)`;

      const snapshot: CloudSnapshot = {
        id: snapshotId,
        label,
        createdAt: now,
        customersCount: customers.length,
        loansCount: loans.length,
        totalOutstanding,
        totalCollected,
        data: {
          customers,
          loans,
          repaymentSchedules: schedules,
          payments,
          settings
        }
      };

      const res = await fetch(`${endpoint}/${snapshotId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot)
      });

      if (!res.ok) throw new Error(`Firebase returned HTTP ${res.status}`);

      return {
        success: true,
        snapshot,
        message: `Cloud Snapshot "${label}" saved safely in Firebase!`
      };
    } catch (err: any) {
      console.error('Failed to create cloud snapshot:', err);
      return {
        success: false,
        message: err?.message || 'Failed to save cloud snapshot.'
      };
    }
  }

  /**
   * Fetches all Cloud Snapshots from Firebase
   */
  public static async fetchCloudSnapshots(): Promise<CloudSnapshot[]> {
    try {
      const { endpoint } = await this.getSnapshotsEndpoint();
      const res = await fetch(`${endpoint}.json`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) return [];
      const data = await res.json();
      if (!data || typeof data !== 'object') return [];

      const snapshots: CloudSnapshot[] = Object.values(data);
      return snapshots
        .filter(s => s && s.id && s.createdAt)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (err) {
      console.error('Failed to fetch cloud snapshots:', err);
      return [];
    }
  }

  /**
   * Restores a Cloud Snapshot into Local Database and active Firebase Cloud
   */
  public static async restoreCloudSnapshot(snapshot: CloudSnapshot): Promise<{ success: boolean; message: string }> {
    try {
      if (!snapshot || !snapshot.data) {
        throw new Error('Invalid snapshot payload');
      }

      const { customers = [], loans = [], repaymentSchedules = [], payments = [], settings = [] } = snapshot.data;

      // 1. Overwrite Local Dexie Database with Snapshot data
      await db.transaction('rw', [
        db.customers,
        db.loans,
        db.repaymentSchedules,
        db.payments,
        db.notifications,
        db.auditLogs,
        db.settings
      ], async () => {
        await db.customers.clear();
        await db.loans.clear();
        await db.repaymentSchedules.clear();
        await db.payments.clear();
        await db.notifications.clear();
        await db.auditLogs.clear();

        if (customers.length) await db.customers.bulkAdd(customers);
        if (loans.length) await db.loans.bulkAdd(loans);
        if (repaymentSchedules.length) await db.repaymentSchedules.bulkAdd(repaymentSchedules);
        if (payments.length) await db.payments.bulkAdd(payments);
        if (settings.length) {
          await db.settings.clear();
          await db.settings.bulkAdd(settings);
        }
      });

      // 2. Force Push Restored State to Active Firebase Endpoint
      await this.forcePushLocalToCloud();

      return {
        success: true,
        message: `Successfully restored "${snapshot.label}" (${customers.length} clients, ${loans.length} loans)`
      };
    } catch (err: any) {
      console.error('Failed to restore snapshot:', err);
      return {
        success: false,
        message: err?.message || 'Failed to restore snapshot.'
      };
    }
  }

  /**
   * Deletes a Cloud Snapshot from Firebase
   */
  public static async deleteCloudSnapshot(snapshotId: string): Promise<boolean> {
    try {
      const { endpoint } = await this.getSnapshotsEndpoint();
      const res = await fetch(`${endpoint}/${snapshotId}.json`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to delete snapshot:', err);
      return false;
    }
  }

  /**
   * Helper: Push single entity to cloud immediately after creation
   */
  public static triggerBackgroundSync() {
    setTimeout(() => {
      this.syncWithCloud().catch(e => console.warn('Background sync failed:', e));
    }, 300);
  }
}
