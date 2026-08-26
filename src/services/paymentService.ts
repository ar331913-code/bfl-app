import { db } from '../db';
import { Payment, PaymentMethod, Loan, RepaymentSchedule } from '../types';
import { format } from 'date-fns';
import { reconcileAllLoanBalances } from './notificationService';

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
  let schedules = await db.repaymentSchedules
    .where('loanId')
    .equals(loanId)
    .sortBy('installmentNumber');

  // If loan has no schedules (e.g. legacy or seed data), generate fallback schedules
  if (!schedules.length) {
    const totalInst = loan.totalInstallments || 1;
    const instAmt = loan.installmentAmount || Math.round((loan.totalRepayment / totalInst) * 100) / 100;
    const fallbackSchedules: RepaymentSchedule[] = [];
    for (let i = 1; i <= totalInst; i++) {
      fallbackSchedules.push({
        loanId,
        customerId,
        installmentNumber: i,
        dueDate: loan.maturityDate || format(new Date(), 'yyyy-MM-dd'),
        expectedAmount: instAmt,
        principalComponent: Math.round((loan.principalAmount / totalInst) * 100) / 100,
        interestComponent: Math.round(((loan.totalInterest || 0) / totalInst) * 100) / 100,
        amountPaid: 0,
        remainingBalance: instAmt,
        status: 'upcoming',
        penaltyAmount: 0
      });
    }
    await db.repaymentSchedules.bulkAdd(fallbackSchedules);
    schedules = await db.repaymentSchedules
      .where('loanId')
      .equals(loanId)
      .sortBy('installmentNumber');
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
        targetSched.remainingBalance = Math.max(0, Math.round((targetSched.remainingBalance - payToTarget) * 100) / 100);
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
        sched.remainingBalance = Math.max(0, Math.round((sched.remainingBalance - alloc) * 100) / 100);
        sched.lastPaymentDate = paymentDate;
        sched.status = sched.remainingBalance <= 0.01 ? 'paid' : 'partially_paid';

        await db.repaymentSchedules.update(sched.id!, sched);
        remainingPaymentAmount = Math.round((remainingPaymentAmount - alloc) * 100) / 100;
      }
    }

    // Update Loan Balances including any penalties
    const totalLoanPenalties = schedules.reduce((sum, s) => sum + (s.penaltyAmount || 0), 0) || loan.totalPenalties || 0;
    const totalPayable = Math.round((loan.totalRepayment + totalLoanPenalties) * 100) / 100;
    const newTotalPaid = Math.min(totalPayable, Math.round((loan.totalPaid + amountPaid) * 100) / 100);
    const newOutstanding = Math.max(0, Math.round((totalPayable - newTotalPaid) * 100) / 100);

    isLoanNowFullySettled = newOutstanding <= 0.01;

    let newStatus: Loan['status'] = loan.status;
    if (isLoanNowFullySettled) {
      newStatus = 'completed';
    } else {
      // Check remaining unpaid schedules to see if any are overdue or due today
      const hasOverdue = schedules.some(s => s.remainingBalance > 0.01 && s.status === 'overdue');
      const hasDueToday = schedules.some(s => s.remainingBalance > 0.01 && s.status === 'due_today');
      if (hasOverdue) {
        newStatus = 'overdue';
      } else if (hasDueToday) {
        newStatus = 'due_today';
      } else if (newTotalPaid > 0) {
        newStatus = 'active';
      } else {
        newStatus = 'active';
      }
    }

    const updatedLoanData: Partial<Loan> = {
      totalPaid: isLoanNowFullySettled ? Math.max(newTotalPaid, loan.totalRepayment) : newTotalPaid,
      outstandingBalance: isLoanNowFullySettled ? 0 : newOutstanding,
      totalPenalties: isLoanNowFullySettled ? 0 : totalLoanPenalties,
      status: isLoanNowFullySettled ? 'completed' : newStatus,
      updatedAt: paymentDate
    };

    await db.loans.update(loan.id!, updatedLoanData);

    // If fully settled, ensure all schedules are explicitly zeroed out
    if (isLoanNowFullySettled) {
      for (const s of schedules) {
        s.status = 'paid';
        s.remainingBalance = 0;
        s.penaltyAmount = 0;
        if (s.id) {
          await db.repaymentSchedules.update(s.id, {
            status: 'paid',
            remainingBalance: 0,
            penaltyAmount: 0
          });
        }
      }
    }

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

  // Reconcile all balances immediately
  await reconcileAllLoanBalances();

  const updatedLoan = await db.loans.where('loanId').equals(loanId).first();

  return {
    success: true,
    loanCompleted: isLoanNowFullySettled || (updatedLoan?.status === 'completed'),
    updatedLoan: updatedLoan ? {
      ...updatedLoan,
      outstandingBalance: isLoanNowFullySettled ? 0 : updatedLoan.outstandingBalance
    } : undefined,
    message: isLoanNowFullySettled 
      ? `Payment recorded! Loan ${loanId} is now FULLY SETTLED (GH₵0.00 balance)! 🎉`
      : `Payment of GH₵${amountPaid.toFixed(2)} successfully recorded. Remaining balance: GH₵${updatedLoan?.outstandingBalance.toFixed(2)}.`
  };
}
