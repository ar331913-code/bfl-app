import { Customer, Loan, Payment, RepaymentSchedule, SystemSettings } from '../types';
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
   * Normalize Ghanaian phone number to International format (233XXXXXXXXX)
   */
  static normalizeGhanaPhone(phone: string): string {
    let clean = phone.replace(/[^0-9+]/g, '');
    if (clean.startsWith('+233')) {
      return clean.slice(1);
    }
    if (clean.startsWith('233')) {
      return clean;
    }
    if (clean.startsWith('0')) {
      return '233' + clean.slice(1);
    }
    return clean;
  }

  /**
   * Sends automated background SMS via Cloud Gateway (mNotify / Arkesel / Hubtel / Webhook)
   */
  static async sendAutomatedGatewaySMS(
    phone: string,
    message: string,
    settings?: SystemSettings | null
  ): Promise<{ success: boolean; message: string }> {
    if (!settings || !settings.smsApiKey || settings.smsProvider === 'native') {
      return { success: false, message: 'No SMS Gateway API configured. Using direct SIM messaging.' };
    }

    const recipient = this.normalizeGhanaPhone(phone);
    const sender = settings.smsSenderId || 'BFL-LOANS';

    try {
      if (settings.smsProvider === 'mnotify') {
        const response = await fetch(`https://apps.mnotify.net/smsapi?key=${encodeURIComponent(settings.smsApiKey)}&to=${recipient}&msg=${encodeURIComponent(message)}&sender_id=${encodeURIComponent(sender)}`);
        const result = await response.json();
        return { success: true, message: 'Automated SMS dispatched via mNotify.' };
      }

      if (settings.smsProvider === 'arkesel') {
        const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
          method: 'POST',
          headers: {
            'api-key': settings.smsApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sender: sender,
            message: message,
            recipients: [recipient]
          })
        });
        const result = await response.json();
        return { success: true, message: 'Automated SMS dispatched via Arkesel.' };
      }

      if (settings.smsProvider === 'hubtel') {
        const response = await fetch('https://api.hubtel.com/v1/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${settings.smsApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            From: sender,
            To: recipient,
            Content: message
          })
        });
        return { success: true, message: 'Automated SMS dispatched via Hubtel.' };
      }

      return { success: false, message: 'Unknown SMS provider.' };
    } catch (err: any) {
      console.warn('Automated SMS Gateway call failed:', err);
      return { success: false, message: err.message || 'SMS Gateway error' };
    }
  }

  /**
   * Opens the device's native SMS app pre-populated with recipient and text
   */
  static sendNativeSMS(phone: string, message: string): void {
    const cleanPhone = phone.replace(/\s+/g, '');
    const encodedMessage = encodeURIComponent(message);
    const smsUrl = `sms:${cleanPhone}?body=${encodedMessage}`;
    window.location.href = smsUrl;
  }

  /**
   * Main Dispatcher: Sends automatically via Gateway if configured, else opens native SMS
   */
  static async dispatchSMS(
    phone: string,
    message: string,
    settings?: SystemSettings | null
  ): Promise<void> {
    if (settings && settings.smsApiKey && settings.smsProvider && settings.smsProvider !== 'native') {
      const res = await this.sendAutomatedGatewaySMS(phone, message, settings);
      if (res.success) return;
    }

    // Fallback to native 1-tap SIM SMS
    this.sendNativeSMS(phone, message);
  }

  /**
   * Compatibility alias for dispatchSMS
   */
  static sendSMS(phone: string, message: string, settings?: SystemSettings | null): void {
    this.dispatchSMS(phone, message, settings);
  }
}
