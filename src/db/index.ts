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
