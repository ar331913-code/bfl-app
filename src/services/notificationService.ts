import { db } from '../db';
import { format, parseISO, isToday, isBefore, isAfter, addDays, startOfDay, differenceInDays } from 'date-fns';

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

  const schedules = await db.repaymentSchedules.toArray();
  const loans = await db.loans.toArray();
  const settingsList = await db.settings.toArray();
  const settings = settingsList[0];
  const enablePenalties = settings?.enablePenalties ?? true;
  const defaultPenaltyRate = settings?.defaultPenaltyRate || 2.5; // e.g. 2.5% of expected installment or flat minimum

  // 1. Process Schedules and Apply Late Fees
  for (const sched of schedules) {
    if (sched.remainingBalance <= 0.01) {
      if (sched.status !== 'paid') {
        sched.status = 'paid';
        await db.repaymentSchedules.update(sched.id!, { status: 'paid' });
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

        // Add an audit log and alert
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

  // 2. Process Loan Top-level Statuses & Recompute Outstanding Balance with Penalties
  for (const loan of loans) {
    const loanSchedules = schedules.filter(s => s.loanId === loan.loanId);
    const totalLoanPenalties = loanSchedules.reduce((sum, s) => sum + (s.penaltyAmount || 0), 0);
    const totalPaidOnLoan = loan.totalPaid || 0;
    const computedOutstanding = Math.max(0, Math.round((loan.totalRepayment + totalLoanPenalties - totalPaidOnLoan) * 100) / 100);

    if (computedOutstanding <= 0.01) {
      if (loan.status !== 'completed') {
        await db.loans.update(loan.id!, { 
          status: 'completed',
          outstandingBalance: 0,
          totalPenalties: totalLoanPenalties
        });
      }
      continue;
    }

    const hasOverdue = loanSchedules.some(s => s.status === 'overdue' && s.remainingBalance > 0.01);
    const hasDueToday = loanSchedules.some(s => s.status === 'due_today' && s.remainingBalance > 0.01);
    const hasUpcoming = loanSchedules.some(s => s.status === 'upcoming' && s.remainingBalance > 0.01);

    let loanStatus: typeof loan.status = 'active';
    if (hasOverdue) {
      loanStatus = 'overdue';
    } else if (hasDueToday) {
      loanStatus = 'due_today';
    } else if (hasUpcoming) {
      loanStatus = 'due_soon';
    } else if (loan.totalPaid > 0) {
      loanStatus = 'partially_paid';
    }

    await db.loans.update(loan.id!, {
      status: loanStatus,
      totalPenalties: totalLoanPenalties,
      outstandingBalance: computedOutstanding
    });
  }

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
