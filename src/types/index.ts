export type CustomerType = 'driver' | 'trader' | 'other';
export type CustomerStatus = 'active' | 'inactive' | 'blacklisted';

export interface DriverDetails {
  vehicleType: string;
  registrationNumber: string;
  licenseNumber: string;
  stationLocation: string;
}

export interface TraderDetails {
  businessName: string;
  businessType: string;
  marketLocation: string;
  stallNumber?: string;
  description?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Customer {
  id?: number;
  customerId: string; // e.g. "BFL-00001"
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  customerType: CustomerType;
  
  // Contact
  primaryPhone: string;
  secondaryPhone?: string;
  residentialAddress: string;
  workAddress: string;
  
  // Ghana Card & Photo
  ghanaCardNumber: string; // "GHA-XXXXXXXXX-X"
  ghanaCardFrontUrl?: string; // Base64 or Blob URL
  ghanaCardBackUrl?: string;
  photoUrl?: string;
  
  // Specific Archetypes
  driverDetails?: DriverDetails;
  traderDetails?: TraderDetails;
  
  // Emergency Contact
  emergencyContact: EmergencyContact;
  
  // Status & Metadata
  status: CustomerStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type InterestType = 'flat' | 'reducing_balance' | 'fixed_sum';
export type RepaymentFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type LoanStatus = 
  | 'active' 
  | 'due_today' 
  | 'due_soon' 
  | 'partially_paid' 
  | 'overdue' 
  | 'completed' 
  | 'defaulted';

export interface Loan {
  id?: number;
  loanId: string; // e.g. "LN-00001"
  customerId: string; // References Customer.customerId
  customerName?: string; // Denormalized for fast list rendering
  customerType?: CustomerType;
  
  // Financial specifics
  principalAmount: number; // e.g. GH₵5,000
  interestRate: number; // e.g. 10 (%)
  interestType: InterestType;
  durationValue: number; // e.g. 10
  durationUnit: 'days' | 'weeks' | 'months';
  repaymentFrequency: RepaymentFrequency;
  
  // Dates
  startDate: string; // YYYY-MM-DD
  firstRepaymentDate: string; // YYYY-MM-DD
  maturityDate: string; // YYYY-MM-DD
  
  // Computed values
  totalInterest: number;
  processingFee: number;
  totalRepayment: number; // Principal + Interest + Fees
  installmentAmount: number;
  totalInstallments: number;
  
  // Dynamic Balances
  totalPaid: number;
  outstandingBalance: number;
  penaltyRate: number; // Daily percentage or fixed
  totalPenalties: number;
  
  // Status & Audit
  status: LoanStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type InstallmentStatus = 
  | 'upcoming' 
  | 'due_today' 
  | 'paid' 
  | 'partially_paid' 
  | 'overdue' 
  | 'waived';

export interface RepaymentSchedule {
  id?: number;
  loanId: string;
  customerId: string;
  installmentNumber: number;
  dueDate: string; // YYYY-MM-DD
  expectedAmount: number;
  principalComponent: number;
  interestComponent: number;
  amountPaid: number;
  remainingBalance: number;
  status: InstallmentStatus;
  lastPaymentDate?: string;
  penaltyAmount: number;
}

export type PaymentMethod = 'cash' | 'momo' | 'bank' | 'other';

export interface Payment {
  id?: number;
  paymentId: string; // e.g. "RCP-00001"
  loanId: string;
  customerId: string;
  installmentId?: number;
  amountPaid: number;
  paymentDate: string; // YYYY-MM-DD HH:mm
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export type NotificationType = 'due_today' | 'upcoming' | 'overdue' | 'loan_completed' | 'system';

export interface AppNotification {
  id?: number;
  type: NotificationType;
  title: string;
  message: string;
  customerId?: string;
  loanId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id?: number;
  action: string;
  entityType: 'customer' | 'loan' | 'payment' | 'system' | 'auth';
  entityId?: string;
  details: string;
  timestamp: string;
}

export interface SystemSettings {
  id?: number;
  operatorName: string;
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  defaultInterestRate: number;
  defaultInterestType: InterestType;
  defaultFrequency: RepaymentFrequency;
  defaultDurationValue: number;
  defaultDurationUnit: 'days' | 'weeks' | 'months';
  enablePenalties: boolean;
  defaultPenaltyRate: number;
  gracePeriodDays: number;
  autoLockMinutes: number;
  biometricEnabled: boolean;
  pinHash?: string;
  username?: string;
  passwordHash?: string;
  salt: string;
  smsReminderTemplate: string;
  
  // Automated SMS Gateway
  smsProvider?: 'native' | 'mnotify' | 'hubtel' | 'arkesel' | 'custom_webhook';
  smsApiKey?: string;
  smsSenderId?: string;
  autoSmsOnRegister?: boolean;
  autoSmsOnDisburse?: boolean;
  autoSmsOnPayment?: boolean;
  autoSmsOnOverdue?: boolean;
}

export interface CustomerFinancialSummary {
  totalLoans: number;
  activeLoans: number;
  completedLoans: number;
  overdueLoans: number;
  totalBorrowed: number;
  totalRepaid: number;
  totalOutstanding: number;
  punctualityScore: 'A+' | 'A' | 'B' | 'C' | 'High Risk';
  lastPaymentDate?: string;
}
