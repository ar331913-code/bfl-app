import { db } from '../db';
import { Payment, PaymentMethod, Loan, RepaymentSchedule } from '../types';
import { format } from 'date-fns';

export interface RecordPaymentParams {
  loanId: string;
  customerId: string;
  installmentId?: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  recordedBy?: string;
  paymentDate?: string;
}

export interface PaymentResult {
  success: boolean;
  payment?: Payment;
  loanCompleted: boolean;
  updatedLoan?: Loan;
  message: string;
}

export async function recordPayment(params: RecordPaymentParams): Promise<PaymentResult> {
  const {
    loanId,
    customerId,
    installmentId,
    amountPaid,
    paymentMethod,
    referenceNumber,
    notes,
    recordedBy = 'Operator',
    paymentDate = format(new Date(), 'yyyy-MM-dd HH:mm')
  } = params;

  if (!amountPaid || amountPaid <= 0 || isNaN(amountPaid)) {
    return { success: false, loanCompleted: false, message: 'Payment amount must be greater than GH₵0.00' };
  }

  // 1. Fetch Loan
  const loan = await db.loans.where('loanId').equals(loanId).first();
  if (!loan) {
    return { success: false, loanCompleted: false, message: `Loan ${loanId} not found.` };
  }

  if (loan.status === 'completed') {
    return { success: false, loanCompleted: false, message: `Loan ${loanId} is already fully paid.` };
  }

  if (amountPaid > loan.outstandingBalance + 0.05) {
    return { 
      success: false, 
      loanCompleted: false, 
      message: `Amount GH₵${amountPaid.toFixed(2)} exceeds total outstanding loan balance of GH₵${loan.outstandingBalance.toFixed(2)}.` 
    };
  }

  // 2. Fetch Repayment Schedules for this loan in order
  const schedules = await db.repaymentSchedules
    .where('loanId')
    .equals(loanId)
    .sortBy('installmentNumber');

  if (!schedules.length) {
    return { success: false, loanCompleted: false, message: 'No repayment schedule found for this loan.' };
  }

  let remainingPaymentAmount = amountPaid;
  const paymentId = await db.getNextPaymentId();
  let isLoanNowFullySettled = false;

  await db.transaction('rw', [db.loans, db.repaymentSchedules, db.payments, db.auditLogs, db.notifications], async () => {
    // If specific installment targeted, pay that first
    if (installmentId) {
      const targetSched = schedules.find(s => s.id === installmentId);
      if (targetSched && targetSched.remainingBalance > 0) {
        const payToTarget = Math.min(remainingPaymentAmount, targetSched.remainingBalance);
        targetSched.amountPaid = Math.round((targetSched.amountPaid + payToTarget) * 100) / 100;
        targetSched.remainingBalance = Math.round((targetSched.remainingBalance - payToTarget) * 100) / 100;
        targetSched.lastPaymentDate = paymentDate;
        targetSched.status = targetSched.remainingBalance <= 0.01 ? 'paid' : 'partially_paid';
        
        await db.repaymentSchedules.update(targetSched.id!, targetSched);
        remainingPaymentAmount = Math.round((remainingPaymentAmount - payToTarget) * 100) / 100;
      }
    }

    // Waterfall allocation to any remaining unpaid installments
    if (remainingPaymentAmount > 0) {
      for (const sched of schedules) {
        if (remainingPaymentAmount <= 0) break;
        if (sched.remainingBalance <= 0.01) continue;

        const alloc = Math.min(remainingPaymentAmount, sched.remainingBalance);
        sched.amountPaid = Math.round((sched.amountPaid + alloc) * 100) / 100;
        sched.remainingBalance = Math.round((sched.remainingBalance - alloc) * 100) / 100;
        sched.lastPaymentDate = paymentDate;
        sched.status = sched.remainingBalance <= 0.01 ? 'paid' : 'partially_paid';

        await db.repaymentSchedules.update(sched.id!, sched);
        remainingPaymentAmount = Math.round((remainingPaymentAmount - alloc) * 100) / 100;
      }
    }

    // Update Loan Balances
    const newTotalPaid = Math.round((loan.totalPaid + amountPaid) * 100) / 100;
    const newOutstanding = Math.max(0, Math.round((loan.totalRepayment - newTotalPaid) * 100) / 100);

    isLoanNowFullySettled = newOutstanding <= 0.01;

    let newStatus = loan.status;
    if (isLoanNowFullySettled) {
      newStatus = 'completed';
    } else if (newTotalPaid > 0) {
      // Check if any schedule is still overdue
      const hasOverdue = schedules.some(s => s.status === 'overdue' && s.remainingBalance > 0.01);
      newStatus = hasOverdue ? 'overdue' : 'active';
    }

    const updatedLoanData: Partial<Loan> = {
      totalPaid: newTotalPaid,
      outstandingBalance: newOutstanding,
      status: newStatus,
      updatedAt: paymentDate
    };

    await db.loans.update(loan.id!, updatedLoanData);

    // Save Payment Record
    const newPayment: Payment = {
      paymentId,
      loanId,
      customerId,
      installmentId,
      amountPaid,
      paymentDate,
      paymentMethod,
      referenceNumber: referenceNumber?.trim() || undefined,
      notes: notes?.trim() || undefined,
      recordedBy,
      createdAt: new Date().toISOString()
    };

    await db.payments.add(newPayment);

    // Audit Log
    await db.auditLogs.add({
      action: 'PAYMENT_RECORDED',
      entityType: 'payment',
      entityId: paymentId,
      details: `Payment of GH₵${amountPaid.toFixed(2)} recorded for Loan ${loanId} (${loan.customerName || customerId}) via ${paymentMethod.toUpperCase()}`,
      timestamp: new Date().toISOString()
    });

    // Notify if loan completed
    if (isLoanNowFullySettled) {
      await db.notifications.add({
        type: 'loan_completed',
        title: `Loan ${loanId} Fully Paid! 🎉`,
        message: `Customer ${loan.customerName || customerId} has successfully completed loan ${loanId} (GH₵${loan.totalRepayment.toFixed(2)}).`,
        customerId,
        loanId,
        isRead: false,
        createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
      });
    }
  });

  const updatedLoan = await db.loans.where('loanId').equals(loanId).first();

  return {
    success: true,
    loanCompleted: isLoanNowFullySettled,
    updatedLoan,
    message: isLoanNowFullySettled 
      ? `Payment recorded! Loan ${loanId} is now FULLY SETTLED! 🎉`
      : `Payment of GH₵${amountPaid.toFixed(2)} successfully recorded. Remaining balance: GH₵${updatedLoan?.outstandingBalance.toFixed(2)}.`
  };
}
