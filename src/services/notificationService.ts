import { db } from '../db';
import { format, parseISO, isToday, isBefore, isAfter, addDays, startOfDay, differenceInDays } from 'date-fns';

/**
 * Permanent Loan Balance & Settlement Reconciler
 * Calculates true payments and permanently marks completed loans as completed with GH₵0.00 balance.
 */
export async function reconcileAllLoanBalances(): Promise<void> {
  try {
    const [loans, payments, schedules] = await Promise.all([
      db.loans.toArray(),
      db.payments.toArray(),
      db.repaymentSchedules.toArray()
    ]);

    const paymentsByLoan = new Map<string, number>();
    for (const p of payments) {
      if (!p.loanId) continue;
      const cur = paymentsByLoan.get(p.loanId) || 0;
      paymentsByLoan.set(p.loanId, cur + (p.amountPaid || 0));
    }

    for (const loan of loans) {
      const loanPaymentsTotal = paymentsByLoan.get(loan.loanId) || 0;
      const loanSchedules = schedules.filter(s => s.loanId === loan.loanId);
      const totalPenalties = loanSchedules.reduce((sum, s) => sum + (s.penaltyAmount || 0), 0);
      const totalExpected = Math.round(((loan.totalRepayment || 0) + totalPenalties) * 100) / 100;
      
      const actualPaid = Math.round(Math.max(loan.totalPaid || 0, loanPaymentsTotal) * 100) / 100;
      const actualOutstanding = Math.max(0, Math.round((totalExpected - actualPaid) * 100) / 100);

      const isSettled = actualOutstanding <= 0.01 || actualPaid >= (loan.totalRepayment || 0) - 0.05 || loan.status === 'completed' || (loan.outstandingBalance || 0) <= 0.01;

      if (isSettled) {
        // PERMANENT FIX: Loan is 100% completed, zero out outstanding and mark all schedules paid
        await db.loans.update(loan.id!, {
          status: 'completed',
          outstandingBalance: 0,
          totalPaid: Math.max(actualPaid, loan.totalRepayment || 0),
          totalPenalties: 0
        });

        for (const s of loanSchedules) {
          if (s.status !== 'paid' || s.remainingBalance > 0) {
            await db.repaymentSchedules.update(s.id!, {
              status: 'paid',
              remainingBalance: 0,
              penaltyAmount: 0
            });
          }
        }
      } else {
        const hasOverdue = loanSchedules.some(s => s.status === 'overdue' && s.remainingBalance > 0.01);
        const hasDueToday = loanSchedules.some(s => s.status === 'due_today' && s.remainingBalance > 0.01);
        const newStatus = hasOverdue ? 'overdue' : (hasDueToday ? 'due_today' : 'active');

        await db.loans.update(loan.id!, {
          status: newStatus,
          outstandingBalance: actualOutstanding,
          totalPaid: actualPaid,
          totalPenalties: totalPenalties
        });
      }
    }
  } catch (err) {
    console.error('Error during loan balance reconciliation:', err);
  }
}

export async function checkAndUpdateLoanStatusesAndAlerts(): Promise<{
  dueTodayCount: number;
  overdueCount: number;
  upcomingCount: number;
  penaltiesAppliedCount: number;
}> {
  const today = startOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');
  const threeDaysAhead = addDays(today, 3);

  let dueTodayCount = 0;
  let overdueCount = 0;
  let upcomingCount = 0;
  let penaltiesAppliedCount = 0;

  // Run reconciliation first so any settled loan is cleaned up
  await reconcileAllLoanBalances();

  const schedules = await db.repaymentSchedules.toArray();
  const loans = await db.loans.toArray();
  const settingsList = await db.settings.toArray();
  const settings = settingsList[0];
  const enablePenalties = settings?.enablePenalties ?? true;
  const defaultPenaltyRate = settings?.defaultPenaltyRate || 2.5;

  const completedLoanIds = new Set(
    loans.filter(l => l.status === 'completed' || (l.outstandingBalance || 0) <= 0.01).map(l => l.loanId)
  );

  // 1. Process Schedules and Apply Late Fees (ONLY on non-completed loans)
  for (const sched of schedules) {
    if (completedLoanIds.has(sched.loanId) || sched.remainingBalance <= 0.01) {
      if (sched.status !== 'paid' || sched.remainingBalance !== 0) {
        sched.status = 'paid';
        sched.remainingBalance = 0;
        await db.repaymentSchedules.update(sched.id!, { status: 'paid', remainingBalance: 0 });
      }
      continue;
    }

    const dueDate = startOfDay(parseISO(sched.dueDate));
    let newStatus = sched.status;

    if (isToday(dueDate)) {
      newStatus = 'due_today';
      dueTodayCount++;
    } else if (isBefore(dueDate, today)) {
      newStatus = 'overdue';
      overdueCount++;

      // Automatically calculate and add late payment fee if enabled and not already applied
      if (enablePenalties && (!sched.penaltyAmount || sched.penaltyAmount === 0)) {
        const calculatedLateFee = Math.max(
          10, // Minimum flat GH₵10 late fee
          Math.round(sched.expectedAmount * (defaultPenaltyRate / 100) * 100) / 100
        );

        sched.penaltyAmount = calculatedLateFee;
        sched.remainingBalance = Math.round((sched.remainingBalance + calculatedLateFee) * 100) / 100;
        penaltiesAppliedCount++;

        await db.repaymentSchedules.update(sched.id!, {
          penaltyAmount: sched.penaltyAmount,
          remainingBalance: sched.remainingBalance,
          status: 'overdue'
        });

        await db.auditLogs.add({
          action: 'PENALTY_APPLIED',
          entityType: 'loan',
          entityId: sched.loanId,
          details: `Automatic late payment fee of GH₵${calculatedLateFee.toFixed(2)} applied to installment #${sched.installmentNumber} on loan ${sched.loanId}`,
          timestamp: new Date().toISOString()
        });
      }
    } else if (isAfter(dueDate, today) && isBefore(dueDate, threeDaysAhead)) {
      newStatus = 'upcoming';
      upcomingCount++;
    }

    if (newStatus !== sched.status) {
      sched.status = newStatus;
      await db.repaymentSchedules.update(sched.id!, { status: newStatus });
    }
  }

  // 2. Run final reconciliation pass
  await reconcileAllLoanBalances();

  // 3. Create Daily Reminder Notifications if not already generated today
  const existingTodayNotifs = await db.notifications
    .where('createdAt')
    .startsWith(todayStr)
    .toArray();

  if (existingTodayNotifs.length === 0) {
    if (dueTodayCount > 0) {
      await db.notifications.add({
        type: 'due_today',
        title: `Payments Due Today (${dueTodayCount})`,
        message: `You have ${dueTodayCount} customer installment(s) due for collection today.`,
        isRead: false,
        createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
      });
    }

    if (overdueCount > 0) {
      await db.notifications.add({
        type: 'overdue',
        title: `Overdue Installments & Penalties (${overdueCount})`,
        message: `${overdueCount} installment(s) are overdue. Automatic late payment fees have been added to their balances.`,
        isRead: false,
        createdAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
      });
    }
  }

  return { dueTodayCount, overdueCount, upcomingCount, penaltiesAppliedCount };
}
