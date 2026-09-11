import { InterestType, RepaymentFrequency, RepaymentSchedule } from '../types';

export interface LoanCalculationParams {
  principalAmount: number;
  interestRate: number; // e.g. 10 for 10%
  interestType: InterestType;
  durationValue: number;
  durationUnit: 'days' | 'weeks' | 'months';
  repaymentFrequency: RepaymentFrequency;
  startDate: string; // YYYY-MM-DD
  firstRepaymentDate?: string; // Optional custom start YYYY-MM-DD
  processingFee?: number;
}

export interface LoanCalculationResult {
  principalAmount: number;
  interestRate: number;
  totalInterest: number;
  processingFee: number;
  totalRepayment: number;
  installmentAmount: number;
  totalInstallments: number;
  maturityDate: string;
  firstRepaymentDate: string;
  formulaExplanation: string;
  breakdownSummary: {
    interestPerInstallment: number;
    principalPerInstallment: number;
  };
  schedulePreview: Array<{
    installmentNumber: number;
    dueDate: string;
    expectedAmount: number;
    principalComponent: number;
    interestComponent: number;
  }>;
}

/**
 * Parses YYYY-MM-DD string into year, month (1-12), and day (1-31)
 * Immune to any timezone offset or DST shifts.
 */
export function parseDateComponents(dateStr: string): { year: number; month: number; day: number } {
  if (!dateStr) {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }
  const clean = dateStr.split('T')[0].trim();
  const parts = clean.split('-').map(p => parseInt(p, 10));
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return { year: parts[0], month: parts[1], day: parts[2] };
  }
  const d = new Date(dateStr);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

/**
 * Formats year, month (1-12), and day (1-31) to YYYY-MM-DD string
 */
export function formatDateToISO(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Safely adds days to a YYYY-MM-DD string using UTC calendar arithmetic.
 * Ensures exact day/weekday increments without timezone or DST drift.
 */
export function addDaysToDateStr(dateStr: string, daysToAdd: number): string {
  const { year, month, day } = parseDateComponents(dateStr);
  const utcDate = new Date(Date.UTC(year, month - 1, day + daysToAdd, 12, 0, 0));
  return formatDateToISO(utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, utcDate.getUTCDate());
}

/**
 * Returns number of days in a given year and month (1-12)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Safely adds months to a YYYY-MM-DD string.
 * Uses baseDayOfMonth to handle shorter months correctly (e.g. Jan 31 -> Feb 28 -> Mar 31 -> Apr 30 -> May 31).
 */
export function addMonthsToDateStr(dateStr: string, monthsToAdd: number, baseDayOfMonth?: number): string {
  const { year, month, day } = parseDateComponents(dateStr);
  const targetDay = baseDayOfMonth !== undefined ? baseDayOfMonth : day;

  const totalMonths = (month - 1) + monthsToAdd;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonthIndex = ((totalMonths % 12) + 12) % 12; // 0 to 11
  const targetMonth = targetMonthIndex + 1; // 1 to 12

  const maxDaysInTarget = getDaysInMonth(targetYear, targetMonth);
  const clampedDay = Math.min(targetDay, maxDaysInTarget);

  return formatDateToISO(targetYear, targetMonth, clampedDay);
}

export function calculateLoan(params: LoanCalculationParams): LoanCalculationResult {
  const {
    principalAmount,
    interestRate,
    interestType,
    durationValue,
    durationUnit,
    repaymentFrequency,
    startDate,
    firstRepaymentDate: customFirstDate,
    processingFee = 0
  } = params;

  if (principalAmount <= 0) {
    throw new Error('Principal amount must be greater than 0');
  }
  if (interestRate < 0) {
    throw new Error('Interest rate cannot be negative');
  }
  if (durationValue <= 0 && repaymentFrequency !== 'custom_date') {
    throw new Error('Duration must be greater than 0');
  }

  // 1. Calculate Total Installments based on Duration and Repayment Frequency
  let totalInstallments = 1;

  if (repaymentFrequency === 'custom_date') {
    totalInstallments = 1;
  } else if (repaymentFrequency === 'daily') {
    if (durationUnit === 'days') {
      totalInstallments = durationValue;
    } else if (durationUnit === 'weeks') {
      totalInstallments = durationValue * 7;
    } else if (durationUnit === 'months') {
      totalInstallments = durationValue * 30;
    }
  } else if (repaymentFrequency === 'weekly') {
    if (durationUnit === 'weeks') {
      totalInstallments = durationValue;
    } else if (durationUnit === 'months') {
      totalInstallments = durationValue * 4;
    } else if (durationUnit === 'days') {
      totalInstallments = Math.max(1, Math.round(durationValue / 7));
    }
  } else if (repaymentFrequency === 'biweekly') {
    if (durationUnit === 'weeks') {
      totalInstallments = Math.max(1, Math.round(durationValue / 2));
    } else if (durationUnit === 'months') {
      totalInstallments = durationValue * 2;
    } else if (durationUnit === 'days') {
      totalInstallments = Math.max(1, Math.round(durationValue / 14));
    }
  } else if (repaymentFrequency === 'monthly') {
    if (durationUnit === 'months') {
      totalInstallments = durationValue;
    } else if (durationUnit === 'weeks') {
      totalInstallments = Math.max(1, Math.round(durationValue / 4));
    } else if (durationUnit === 'days') {
      totalInstallments = Math.max(1, Math.round(durationValue / 30));
    }
  }

  if (totalInstallments < 1) totalInstallments = 1;

  // 2. Calculate Interest and Total Repayment
  let totalInterest = 0;
  let installmentAmount = 0;
  let formulaExplanation = '';
  let principalPerInstallment = 0;
  let interestPerInstallment = 0;

  if (interestType === 'flat') {
    // Flat Rate = Principal * (Rate / 100)
    totalInterest = Math.round(principalAmount * (interestRate / 100) * 100) / 100;
    const totalRepay = Math.round((principalAmount + totalInterest + processingFee) * 100) / 100;
    installmentAmount = Math.round((totalRepay / totalInstallments) * 100) / 100;
    principalPerInstallment = Math.round((principalAmount / totalInstallments) * 100) / 100;
    interestPerInstallment = Math.round((totalInterest / totalInstallments) * 100) / 100;

    formulaExplanation = `Flat Interest: GH₵${principalAmount.toLocaleString()} × ${interestRate}% = GH₵${totalInterest.toLocaleString()} interest. Total: GH₵${totalRepay.toLocaleString()} across ${totalInstallments} installments of GH₵${installmentAmount.toLocaleString()} (${repaymentFrequency}).`;
  } else if (interestType === 'fixed_sum') {
    totalInterest = Math.round(interestRate * 100) / 100;
    const totalRepay = Math.round((principalAmount + totalInterest + processingFee) * 100) / 100;
    installmentAmount = Math.round((totalRepay / totalInstallments) * 100) / 100;
    principalPerInstallment = Math.round((principalAmount / totalInstallments) * 100) / 100;
    interestPerInstallment = Math.round((totalInterest / totalInstallments) * 100) / 100;

    formulaExplanation = `Fixed Fee: Principal GH₵${principalAmount.toLocaleString()} + Fixed Markup GH₵${totalInterest.toLocaleString()} = GH₵${totalRepay.toLocaleString()} across ${totalInstallments} installments.`;
  } else if (interestType === 'reducing_balance') {
    const periodicRate = (interestRate / 100) / totalInstallments;
    if (periodicRate === 0) {
      installmentAmount = Math.round(((principalAmount + processingFee) / totalInstallments) * 100) / 100;
      totalInterest = 0;
    } else {
      const emi = (principalAmount * periodicRate * Math.pow(1 + periodicRate, totalInstallments)) /
                  (Math.pow(1 + periodicRate, totalInstallments) - 1);
      installmentAmount = Math.round((emi + (processingFee / totalInstallments)) * 100) / 100;
      totalInterest = Math.round(((emi * totalInstallments) - principalAmount) * 100) / 100;
    }
    principalPerInstallment = Math.round((principalAmount / totalInstallments) * 100) / 100;
    interestPerInstallment = Math.round((totalInterest / totalInstallments) * 100) / 100;

    formulaExplanation = `Reducing Balance: Principal GH₵${principalAmount.toLocaleString()} amortized at ${interestRate}% p.a. over ${totalInstallments} installments. Total interest = GH₵${totalInterest.toLocaleString()}.`;
  }

  const totalRepayment = Math.round((principalAmount + totalInterest + processingFee) * 100) / 100;

  // 3. Compute Schedule Dates using accurate calendar arithmetic
  const schedulePreview: LoanCalculationResult['schedulePreview'] = [];
  const startComponents = parseDateComponents(startDate);
  const baseDayOfMonth = customFirstDate ? parseDateComponents(customFirstDate).day : startComponents.day;

  for (let i = 1; i <= totalInstallments; i++) {
    let dueDateStr = '';

    if (repaymentFrequency === 'custom_date') {
      dueDateStr = customFirstDate || startDate;
    } else if (customFirstDate) {
      // If a custom starting repayment date was supplied
      if (i === 1) {
        dueDateStr = customFirstDate;
      } else {
        const offset = i - 1;
        if (repaymentFrequency === 'daily') {
          dueDateStr = addDaysToDateStr(customFirstDate, offset);
        } else if (repaymentFrequency === 'weekly') {
          dueDateStr = addDaysToDateStr(customFirstDate, 7 * offset);
        } else if (repaymentFrequency === 'biweekly') {
          dueDateStr = addDaysToDateStr(customFirstDate, 14 * offset);
        } else if (repaymentFrequency === 'monthly') {
          dueDateStr = addMonthsToDateStr(customFirstDate, offset, baseDayOfMonth);
        }
      }
    } else {
      // Default: starting date is disbursement date (startDate)
      if (repaymentFrequency === 'daily') {
        dueDateStr = addDaysToDateStr(startDate, i);
      } else if (repaymentFrequency === 'weekly') {
        // Keeps exact same weekday as disbursement date with exact 7-day increments
        dueDateStr = addDaysToDateStr(startDate, 7 * i);
      } else if (repaymentFrequency === 'biweekly') {
        dueDateStr = addDaysToDateStr(startDate, 14 * i);
      } else if (repaymentFrequency === 'monthly') {
        // Uses the same day number in next month, handling shorter months correctly
        dueDateStr = addMonthsToDateStr(startDate, i, baseDayOfMonth);
      }
    }

    schedulePreview.push({
      installmentNumber: i,
      dueDate: dueDateStr,
      expectedAmount: installmentAmount,
      principalComponent: principalPerInstallment,
      interestComponent: interestPerInstallment
    });
  }

  const firstRepaymentDate = schedulePreview.length > 0 ? schedulePreview[0].dueDate : startDate;
  const maturityDate = schedulePreview.length > 0 ? schedulePreview[schedulePreview.length - 1].dueDate : startDate;

  return {
    principalAmount,
    interestRate,
    totalInterest,
    processingFee,
    totalRepayment,
    installmentAmount,
    totalInstallments,
    maturityDate,
    firstRepaymentDate,
    formulaExplanation,
    breakdownSummary: {
      interestPerInstallment,
      principalPerInstallment
    },
    schedulePreview
  };
}

// Generate concrete RepaymentSchedule objects ready to insert into Dexie
export function generateRepaymentSchedulesForLoan(
  loanId: string,
  customerId: string,
  calculation: LoanCalculationResult
): RepaymentSchedule[] {
  return calculation.schedulePreview.map((item) => ({
    loanId,
    customerId,
    installmentNumber: item.installmentNumber,
    dueDate: item.dueDate,
    expectedAmount: item.expectedAmount,
    principalComponent: item.principalComponent,
    interestComponent: item.interestComponent,
    amountPaid: 0,
    remainingBalance: item.expectedAmount,
    status: 'upcoming',
    penaltyAmount: 0
  }));
}
