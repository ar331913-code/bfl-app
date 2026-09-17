import Dexie, { Table } from 'dexie';
import { 
  Customer, 
  Loan, 
  RepaymentSchedule, 
  Payment, 
  AppNotification, 
  AuditLog, 
  SystemSettings 
} from '../types';

export class BFLDatabase extends Dexie {
  customers!: Table<Customer, number>;
  loans!: Table<Loan, number>;
  repaymentSchedules!: Table<RepaymentSchedule, number>;
  payments!: Table<Payment, number>;
  notifications!: Table<AppNotification, number>;
  auditLogs!: Table<AuditLog, number>;
  settings!: Table<SystemSettings, number>;

  constructor() {
    super('BFL_LoanManagementDB');
    
    this.version(1).stores({
      customers: '++id, customerId, fullName, primaryPhone, ghanaCardNumber, customerType, status, createdAt',
      loans: '++id, loanId, customerId, status, startDate, firstRepaymentDate, maturityDate, createdAt',
      repaymentSchedules: '++id, loanId, customerId, installmentNumber, dueDate, status',
      payments: '++id, paymentId, loanId, customerId, paymentDate, paymentMethod, createdAt',
      notifications: '++id, type, customerId, loanId, isRead, createdAt',
      auditLogs: '++id, action, entityType, entityId, timestamp',
      settings: '++id'
    });
  }

  // ID Generators with prefix and zero-padding (collision-proof & tombstone-aware)
  async getNextCustomerId(): Promise<string> {
    const [allCustomers, allLoans, allAudit] = await Promise.all([
      this.customers.toArray(),
      this.loans.toArray(),
      this.auditLogs.toArray()
    ]);

    const deletedIds: string[] = (() => {
      try {
        const raw = localStorage.getItem('bfl_deleted_customer_ids');
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    })();

    let maxNum = 0;

    // 1. Check existing active customers
    for (const c of allCustomers) {
      const match = c.customerId?.match(/BFL-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    // 2. Check all loans (protects orphaned/historical loans)
    for (const l of allLoans) {
      const match = l.customerId?.match(/BFL-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    // 3. Check deleted tombstones so deleted IDs are never recycled
    for (const id of deletedIds) {
      const match = id?.match(/BFL-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    // 4. Check audit logs
    for (const a of allAudit) {
      if (a.entityType === 'customer' && a.entityId) {
        const match = a.entityId.match(/BFL-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    return `BFL-${String(maxNum + 1).padStart(5, '0')}`;
  }

  async getNextLoanId(): Promise<string> {
    const [allLoans, allSchedules, allPayments, allAudit] = await Promise.all([
      this.loans.toArray(),
      this.repaymentSchedules.toArray(),
      this.payments.toArray(),
      this.auditLogs.toArray()
    ]);

    let maxNum = 0;
    for (const l of allLoans) {
      const match = l.loanId?.match(/LN-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    for (const s of allSchedules) {
      const match = s.loanId?.match(/LN-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    for (const p of allPayments) {
      const match = p.loanId?.match(/LN-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    for (const a of allAudit) {
      if (a.entityType === 'loan' && a.entityId) {
        const match = a.entityId.match(/LN-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    return `LN-${String(maxNum + 1).padStart(5, '0')}`;
  }

  async getNextPaymentId(): Promise<string> {
    const [allPayments, allAudit] = await Promise.all([
      this.payments.toArray(),
      this.auditLogs.toArray()
    ]);

    let maxNum = 0;
    for (const p of allPayments) {
      const match = p.paymentId?.match(/RCP-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    for (const a of allAudit) {
      if (a.entityType === 'payment' && a.entityId) {
        const match = a.entityId.match(/RCP-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
    return `RCP-${String(maxNum + 1).padStart(5, '0')}`;
  }

  // Full Database Export as JSON
  async exportFullDatabase(): Promise<string> {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      customers: await this.customers.toArray(),
      loans: await this.loans.toArray(),
      repaymentSchedules: await this.repaymentSchedules.toArray(),
      payments: await this.payments.toArray(),
      notifications: await this.notifications.toArray(),
      auditLogs: await this.auditLogs.toArray(),
      settings: await this.settings.toArray()
    };
    return JSON.stringify(data, null, 2);
  }

  // Restore Database from JSON
  async restoreFromJSON(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      if (!data.customers || !data.loans) {
        throw new Error('Invalid backup file format');
      }

      await this.transaction('rw', [
        this.customers,
        this.loans,
        this.repaymentSchedules,
        this.payments,
        this.notifications,
        this.auditLogs,
        this.settings
      ], async () => {
        await this.customers.clear();
        await this.loans.clear();
        await this.repaymentSchedules.clear();
        await this.payments.clear();
        await this.notifications.clear();
        await this.auditLogs.clear();
        await this.settings.clear();

        if (data.customers?.length) await this.customers.bulkAdd(data.customers);
        if (data.loans?.length) await this.loans.bulkAdd(data.loans);
        if (data.repaymentSchedules?.length) await this.repaymentSchedules.bulkAdd(data.repaymentSchedules);
        if (data.payments?.length) await this.payments.bulkAdd(data.payments);
        if (data.notifications?.length) await this.notifications.bulkAdd(data.notifications);
        if (data.auditLogs?.length) await this.auditLogs.bulkAdd(data.auditLogs);
        if (data.settings?.length) await this.settings.bulkAdd(data.settings);
      });

      return true;
    } catch (err) {
      console.error('Failed to restore database:', err);
      return false;
    }
  }

  // Deduplicate all tables to permanently ensure no cloned records exist
  async deduplicateDatabaseTables(): Promise<{
    customersRemoved: number;
    loansRemoved: number;
    schedulesRemoved: number;
    paymentsRemoved: number;
  }> {
    let customersRemoved = 0;
    let loansRemoved = 0;
    let schedulesRemoved = 0;
    let paymentsRemoved = 0;

    try {
      // 1. Customers
      const allCustomers = await this.customers.toArray();
      const seenCustomerIds = new Map<string, number>();
      const duplicateCustomerIds: number[] = [];
      for (const c of allCustomers) {
        if (!c.customerId || !c.id) continue;
        if (seenCustomerIds.has(c.customerId)) {
          duplicateCustomerIds.push(c.id);
        } else {
          seenCustomerIds.set(c.customerId, c.id);
        }
      }
      if (duplicateCustomerIds.length > 0) {
        await this.customers.bulkDelete(duplicateCustomerIds);
        customersRemoved = duplicateCustomerIds.length;
      }

      // 2. Loans
      const allLoans = await this.loans.toArray();
      const seenLoanIds = new Map<string, number>();
      const duplicateLoanIds: number[] = [];
      for (const l of allLoans) {
        if (!l.loanId || !l.id) continue;
        if (seenLoanIds.has(l.loanId)) {
          duplicateLoanIds.push(l.id);
        } else {
          seenLoanIds.set(l.loanId, l.id);
        }
      }
      if (duplicateLoanIds.length > 0) {
        await this.loans.bulkDelete(duplicateLoanIds);
        loansRemoved = duplicateLoanIds.length;
      }

      // 3. Schedules
      const allSchedules = await this.repaymentSchedules.toArray();
      const seenScheduleKeys = new Map<string, number>();
      const duplicateScheduleIds: number[] = [];
      for (const s of allSchedules) {
        if (!s.loanId || !s.id) continue;
        const key = `${s.loanId}-${s.installmentNumber}`;
        if (seenScheduleKeys.has(key)) {
          duplicateScheduleIds.push(s.id);
        } else {
          seenScheduleKeys.set(key, s.id);
        }
      }
      if (duplicateScheduleIds.length > 0) {
        await this.repaymentSchedules.bulkDelete(duplicateScheduleIds);
        schedulesRemoved = duplicateScheduleIds.length;
      }

      // 4. Payments
      const allPayments = await this.payments.toArray();
      const seenPaymentIds = new Map<string, number>();
      const duplicatePaymentIds: number[] = [];
      for (const p of allPayments) {
        if (!p.paymentId || !p.id) continue;
        if (seenPaymentIds.has(p.paymentId)) {
          duplicatePaymentIds.push(p.id);
        } else {
          seenPaymentIds.set(p.paymentId, p.id);
        }
      }
      if (duplicatePaymentIds.length > 0) {
        await this.payments.bulkDelete(duplicatePaymentIds);
        paymentsRemoved = duplicatePaymentIds.length;
      }

      // 5. Settings (Ensure strictly 1 record exists)
      const allSettings = await this.settings.toArray();
      if (allSettings.length > 1) {
        allSettings.sort((a, b) => {
          const timeA = new Date(a.updatedAt || '1970-01-01').getTime();
          const timeB = new Date(b.updatedAt || '1970-01-01').getTime();
          return timeB - timeA;
        });
        const duplicateSettingsIds = allSettings.slice(1).map(s => s.id!).filter(Boolean);
        if (duplicateSettingsIds.length > 0) {
          await this.settings.bulkDelete(duplicateSettingsIds);
        }
      }
    } catch (e) {
      console.warn('Error during database deduplication:', e);
    }

    await this.enforceReferentialIntegrity();

    return { customersRemoved, loansRemoved, schedulesRemoved, paymentsRemoved };
  }

  // Enforce referential integrity: remove orphaned loans, schedules, and payments for non-existent/deleted customers
  async enforceReferentialIntegrity(): Promise<{
    orphanedLoansRemoved: number;
    orphanedSchedulesRemoved: number;
    orphanedPaymentsRemoved: number;
  }> {
    let orphanedLoansRemoved = 0;
    let orphanedSchedulesRemoved = 0;
    let orphanedPaymentsRemoved = 0;

    try {
      const localDeletedCustIds: string[] = (() => {
        try {
          const raw = localStorage.getItem('bfl_deleted_customer_ids');
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      })();
      const deletedCustIdSet = new Set(localDeletedCustIds.map(id => (id || '').trim().toLowerCase()));

      // 1. Fetch all customers currently in the database
      const allCustomers = await this.customers.toArray();
      
      // If any customer in Dexie is in the deleted tombstones, purge them from Dexie immediately!
      const customersToPurge = allCustomers.filter(c => c.customerId && deletedCustIdSet.has(c.customerId.trim().toLowerCase()));
      if (customersToPurge.length > 0) {
        const idsToPurge = customersToPurge.map(c => c.id!).filter(Boolean);
        await this.customers.bulkDelete(idsToPurge);
      }

      const activeCustomers = allCustomers.filter(c => !c.customerId || !deletedCustIdSet.has(c.customerId.trim().toLowerCase()));
      const validCustIdSet = new Set(activeCustomers.map(c => c.customerId));

      // 3. Find and purge orphaned loans
      const allLoans = await this.loans.toArray();
      const orphanedLoanIds: number[] = [];
      const orphanedLoanCodeSet = new Set<string>();
      const validLoanCodeSet = new Set<string>();

      for (const l of allLoans) {
        if (!l.id) continue;
        const isDeletedCust = l.customerId && deletedCustIdSet.has(l.customerId.trim().toLowerCase());
        if (!l.customerId || !validCustIdSet.has(l.customerId) || isDeletedCust) {
          orphanedLoanIds.push(l.id);
          if (l.loanId) orphanedLoanCodeSet.add(l.loanId);
        } else {
          if (l.loanId) validLoanCodeSet.add(l.loanId);
        }
      }

      if (orphanedLoanIds.length > 0) {
        await this.loans.bulkDelete(orphanedLoanIds);
        orphanedLoansRemoved = orphanedLoanIds.length;
      }

      // 4. Find and purge orphaned schedules
      const allSchedules = await this.repaymentSchedules.toArray();
      const orphanedScheduleIds: number[] = [];
      for (const s of allSchedules) {
        if (!s.id) continue;
        const isDeletedCust = s.customerId && deletedCustIdSet.has(s.customerId.trim().toLowerCase());
        const isOrphan = 
          !s.loanId || 
          orphanedLoanCodeSet.has(s.loanId) || 
          !validLoanCodeSet.has(s.loanId) ||
          isDeletedCust ||
          (s.customerId && !validCustIdSet.has(s.customerId));

        if (isOrphan) {
          orphanedScheduleIds.push(s.id);
        }
      }

      if (orphanedScheduleIds.length > 0) {
        await this.repaymentSchedules.bulkDelete(orphanedScheduleIds);
        orphanedSchedulesRemoved = orphanedScheduleIds.length;
      }

      // 5. Find and purge orphaned payments
      const allPayments = await this.payments.toArray();
      const orphanedPaymentIds: number[] = [];
      for (const p of allPayments) {
        if (!p.id) continue;
        const isDeletedCust = p.customerId && deletedCustIdSet.has(p.customerId.trim().toLowerCase());
        const isOrphan = 
          !p.loanId || 
          orphanedLoanCodeSet.has(p.loanId) || 
          !validLoanCodeSet.has(p.loanId) ||
          isDeletedCust ||
          (p.customerId && !validCustIdSet.has(p.customerId));

        if (isOrphan) {
          orphanedPaymentIds.push(p.id);
        }
      }

      if (orphanedPaymentIds.length > 0) {
        await this.payments.bulkDelete(orphanedPaymentIds);
        orphanedPaymentsRemoved = orphanedPaymentIds.length;
      }
    } catch (err) {
      console.warn('Error enforcing referential integrity:', err);
    }

    return { orphanedLoansRemoved, orphanedSchedulesRemoved, orphanedPaymentsRemoved };
  }

  // Delete customer and associated records
  async deleteCustomer(customerId: string): Promise<boolean> {
    try {
      const cleanId = (customerId || '').trim();
      if (!cleanId) return false;

      await this.transaction('rw', [
        this.customers,
        this.loans,
        this.repaymentSchedules,
        this.payments,
        this.notifications,
        this.auditLogs
      ], async () => {
        // 1. Delete matching customer records
        const allCusts = await this.customers.toArray();
        const idsToDelete = allCusts
          .filter(c => c.customerId && c.customerId.trim().toLowerCase() === cleanId.toLowerCase())
          .map(c => c.id!)
          .filter(Boolean);

        if (idsToDelete.length > 0) {
          await this.customers.bulkDelete(idsToDelete);
        } else {
          await this.customers.where('customerId').equals(cleanId).delete();
        }

        // 2. Find and delete loans, schedules, payments, notifications for this customer
        const allLoans = await this.loans.toArray();
        const loanIdsToDelete: number[] = [];
        const loanCodeSet = new Set<string>();

        for (const l of allLoans) {
          if (l.customerId && l.customerId.trim().toLowerCase() === cleanId.toLowerCase()) {
            if (l.id) loanIdsToDelete.push(l.id);
            if (l.loanId) loanCodeSet.add(l.loanId);
          }
        }

        if (loanIdsToDelete.length > 0) {
          await this.loans.bulkDelete(loanIdsToDelete);
        }

        const allSchedules = await this.repaymentSchedules.toArray();
        const schedIdsToDelete = allSchedules
          .filter(s => (s.customerId && s.customerId.trim().toLowerCase() === cleanId.toLowerCase()) || (s.loanId && loanCodeSet.has(s.loanId)))
          .map(s => s.id!)
          .filter(Boolean);
        if (schedIdsToDelete.length > 0) {
          await this.repaymentSchedules.bulkDelete(schedIdsToDelete);
        }

        const allPayments = await this.payments.toArray();
        const payIdsToDelete = allPayments
          .filter(p => (p.customerId && p.customerId.trim().toLowerCase() === cleanId.toLowerCase()) || (p.loanId && loanCodeSet.has(p.loanId)))
          .map(p => p.id!)
          .filter(Boolean);
        if (payIdsToDelete.length > 0) {
          await this.payments.bulkDelete(payIdsToDelete);
        }

        const allNotifs = await this.notifications.toArray();
        const notifIdsToDelete = allNotifs
          .filter(n => n.customerId && n.customerId.trim().toLowerCase() === cleanId.toLowerCase())
          .map(n => n.id!)
          .filter(Boolean);
        if (notifIdsToDelete.length > 0) {
          await this.notifications.bulkDelete(notifIdsToDelete);
        }

        // 3. Add audit log
        await this.auditLogs.add({
          action: 'CUSTOMER_DELETED',
          entityType: 'customer',
          entityId: cleanId,
          details: `Deleted client ${cleanId} and associated loan/payment records`,
          timestamp: new Date().toISOString()
        });
      });

      // Track tombstone in localStorage
      try {
        const stored = localStorage.getItem('bfl_deleted_customer_ids');
        const list: string[] = stored ? JSON.parse(stored) : [];
        if (!list.includes(cleanId)) {
          list.push(cleanId);
          localStorage.setItem('bfl_deleted_customer_ids', JSON.stringify(list));
        }
      } catch (e) {
        console.warn('Failed to update deleted customer tombstone:', e);
      }

      return true;
    } catch (err) {
      console.error(`Failed to delete customer ${customerId}:`, err);
      return false;
    }
  }

  // Clear all transactional data for fresh start
  async resetAllData(): Promise<void> {
    await this.transaction('rw', [
      this.customers,
      this.loans,
      this.repaymentSchedules,
      this.payments,
      this.notifications,
      this.auditLogs
    ], async () => {
      await this.customers.clear();
      await this.loans.clear();
      await this.repaymentSchedules.clear();
      await this.payments.clear();
      await this.notifications.clear();
      await this.auditLogs.clear();
    });
  }
}

export const db = new BFLDatabase();
