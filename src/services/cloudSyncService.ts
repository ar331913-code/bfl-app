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
   * Helper: Push single entity to cloud immediately after creation
   */
  public static triggerBackgroundSync() {
    setTimeout(() => {
      this.syncWithCloud().catch(e => console.warn('Background sync failed:', e));
    }, 300);
  }
}
