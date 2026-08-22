import { Customer, Loan, Payment, RepaymentSchedule } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export interface SMSTemplateData {
  customer: Customer;
  loan?: Loan;
  payment?: Payment;
  schedule?: RepaymentSchedule;
  operatorName?: string;
  businessName?: string;
  businessPhone?: string;
}

export class SMSService {
  /**
   * Generates a Welcome & Registration SMS
   */
  static generateWelcomeSMS(data: SMSTemplateData): string {
    const biz = data.businessName || 'B-F-L Micro Credit';
    const phone = data.businessPhone || '';
    return `Welcome to ${biz}, ${data.customer.fullName}! Your Client ID is ${data.customer.customerId}. For inquiries, contact ${phone}.`;
  }

  /**
   * Generates a Loan Disbursement SMS
   */
  static generateLoanDisbursedSMS(data: SMSTemplateData): string {
    if (!data.loan) return '';
    const biz = data.businessName || 'B-F-L';
    return `Dear ${data.customer.fullName}, your loan ${data.loan.loanId} of ${formatCurrency(data.loan.principalAmount)} has been disbursed. Total repayment: ${formatCurrency(data.loan.totalRepayment)} in ${data.loan.totalInstallments} installments of ${formatCurrency(data.loan.installmentAmount)} (${data.loan.repaymentFrequency}). First due date: ${formatDate(data.loan.firstRepaymentDate)}. Thank you, ${biz}.`;
  }

  /**
   * Generates a Payment Confirmation Receipt SMS
   */
  static generatePaymentReceiptSMS(data: SMSTemplateData): string {
    if (!data.payment || !data.loan) return '';
    const biz = data.businessName || 'B-F-L';
    return `Dear ${data.customer.fullName}, payment of ${formatCurrency(data.payment.amountPaid)} received on ${formatDate(data.payment.paymentDate)} (Receipt: ${data.payment.paymentId}). Outstanding balance: ${formatCurrency(data.loan.outstandingBalance)}. Thank you, ${biz}.`;
  }

  /**
   * Generates an Upcoming / Due Today Reminder SMS
   */
  static generateDueReminderSMS(data: SMSTemplateData): string {
    if (!data.schedule || !data.loan) return '';
    const biz = data.businessName || 'B-F-L';
    const bizPhone = data.businessPhone || '';
    return `Payment Reminder: Dear ${data.customer.fullName}, your loan installment of ${formatCurrency(data.schedule.remainingBalance)} is due on ${formatDate(data.schedule.dueDate)}. Please remit via MoMo or cash. Contact: ${bizPhone}. - ${biz}`;
  }

  /**
   * Generates an Overdue / Default Notice SMS with Late Fees
   */
  static generateOverdueSMS(data: SMSTemplateData): string {
    if (!data.loan) return '';
    const biz = data.businessName || 'B-F-L Micro Credit';
    const bizPhone = data.businessPhone || '';
    const penaltyText = data.loan.totalPenalties > 0 ? ` (including GH₵${data.loan.totalPenalties.toFixed(2)} late fee)` : '';
    return `URGENT OVERDUE NOTICE: Dear ${data.customer.fullName}, your loan ${data.loan.loanId} is overdue with an outstanding balance of ${formatCurrency(data.loan.outstandingBalance)}${penaltyText}. Kindly settle immediately to avoid further penalties. MoMo / Inquiries: ${bizPhone}. - ${biz}`;
  }

  /**
   * Opens the device's native SMS app pre-populated with recipient and text
   */
  static sendSMS(phone: string, message: string): void {
    const cleanPhone = phone.replace(/\s+/g, '');
    const encodedMessage = encodeURIComponent(message);
    
    // Standard cross-platform SMS URI scheme
    const smsUrl = `sms:${cleanPhone}?body=${encodedMessage}`;
    
    window.location.href = smsUrl;
  }
}
