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

  // ID Generators with prefix and zero-padding (collision-proof)
  async getNextCustomerId(): Promise<string> {
    const all = await this.customers.toArray();
    let maxNum = 0;
    for (const c of all) {
      const match = c.customerId?.match(/BFL-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `BFL-${String(maxNum + 1).padStart(5, '0')}`;
  }

  async getNextLoanId(): Promise<string> {
    const all = await this.loans.toArray();
    let maxNum = 0;
    for (const l of all) {
      const match = l.loanId?.match(/LN-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `LN-${String(maxNum + 1).padStart(5, '0')}`;
  }

  async getNextPaymentId(): Promise<string> {
    const all = await this.payments.toArray();
    let maxNum = 0;
    for (const p of all) {
      const match = p.paymentId?.match(/RCP-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
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

      // 1. Purge any customers in tombstone list that might have re-appeared
      if (localDeletedCustIds.length > 0) {
        for (const deletedId of localDeletedCustIds) {
          await this.customers.where('customerId').equals(deletedId).delete();
        }
      }

      // 2. Fetch all valid customers
      const allCustomers = await this.customers.toArray();
      const validCustIdSet = new Set<string>();
      for (const c of allCustomers) {
        if (c.customerId && !localDeletedCustIds.includes(c.customerId)) {
          validCustIdSet.add(c.customerId);
        }
      }

      // 3. Find and purge orphaned loans
      const allLoans = await this.loans.toArray();
      const orphanedLoanIds: number[] = [];
      const orphanedLoanCodeSet = new Set<string>();
      const validLoanCodeSet = new Set<string>();

      for (const l of allLoans) {
        if (!l.id) continue;
        if (!l.customerId || !validCustIdSet.has(l.customerId) || localDeletedCustIds.includes(l.customerId)) {
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
        const isOrphan = 
          !s.loanId || 
          orphanedLoanCodeSet.has(s.loanId) || 
          !validLoanCodeSet.has(s.loanId) ||
          (s.customerId && (!validCustIdSet.has(s.customerId) || localDeletedCustIds.includes(s.customerId)));

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
        const isOrphan = 
          !p.loanId || 
          orphanedLoanCodeSet.has(p.loanId) || 
          !validLoanCodeSet.has(p.loanId) ||
          (p.customerId && (!validCustIdSet.has(p.customerId) || localDeletedCustIds.includes(p.customerId)));

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
      await this.transaction('rw', [
        this.customers,
        this.loans,
        this.repaymentSchedules,
        this.payments,
        this.notifications,
        this.auditLogs
      ], async () => {
        // 1. Delete customer
        await this.customers.where('customerId').equals(customerId).delete();

        // 2. Find and delete loans, schedules, payments, notifications for this customer
        const customerLoans = await this.loans.where('customerId').equals(customerId).toArray();
        for (const l of customerLoans) {
          if (l.loanId) {
            await this.repaymentSchedules.where('loanId').equals(l.loanId).delete();
            await this.payments.where('loanId').equals(l.loanId).delete();
          }
        }

        await this.loans.where('customerId').equals(customerId).delete();
        await this.repaymentSchedules.where('customerId').equals(customerId).delete();
        await this.payments.where('customerId').equals(customerId).delete();
        await this.notifications.where('customerId').equals(customerId).delete();

        // 3. Add audit log
        await this.auditLogs.add({
          action: 'CUSTOMER_DELETED',
          entityType: 'customer',
          entityId: customerId,
          details: `Deleted client ${customerId} and associated loan/payment records`,
          timestamp: new Date().toISOString()
        });
      });

      // Track tombstone in localStorage
      try {
        const stored = localStorage.getItem('bfl_deleted_customer_ids');
        const list: string[] = stored ? JSON.parse(stored) : [];
        if (!list.includes(customerId)) {
          list.push(customerId);
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
