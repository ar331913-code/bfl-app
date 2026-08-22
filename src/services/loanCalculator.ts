import { addDays, addWeeks, addMonths, format, parseISO } from 'date-fns';
import { InterestType, RepaymentFrequency, RepaymentSchedule } from '../types';

export interface LoanCalculationParams {
  principalAmount: number;
  interestRate: number; // e.g. 10 for 10%
  interestType: InterestType;
  durationValue: number;
  durationUnit: 'days' | 'weeks' | 'months';
  repaymentFrequency: RepaymentFrequency;
  startDate: string; // YYYY-MM-DD
  firstRepaymentDate?: string; // Optional custom start
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
  if (durationValue <= 0) {
    throw new Error('Duration must be greater than 0');
  }

  // 1. Calculate Total Installments based on Duration and Frequency
  let totalInstallments = 0;

  // Convert duration to total days approx
  let totalDays = 0;
  if (durationUnit === 'days') totalDays = durationValue;
  else if (durationUnit === 'weeks') totalDays = durationValue * 7;
  else if (durationUnit === 'months') totalDays = durationValue * 30;

  if (repaymentFrequency === 'daily') {
    totalInstallments = durationUnit === 'days' ? durationValue : (durationUnit === 'weeks' ? durationValue * 6 : durationValue * 26);
  } else if (repaymentFrequency === 'weekly') {
    totalInstallments = durationUnit === 'weeks' ? durationValue : Math.max(1, Math.round(totalDays / 7));
  } else if (repaymentFrequency === 'biweekly') {
    totalInstallments = Math.max(1, Math.round(totalDays / 14));
  } else if (repaymentFrequency === 'monthly') {
    totalInstallments = durationUnit === 'months' ? durationValue : Math.max(1, Math.round(totalDays / 30));
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
    // Note: For microloans, interest rate is usually the flat total rate or flat monthly rate
    totalInterest = Math.round(principalAmount * (interestRate / 100) * 100) / 100;
    const totalRepay = principalAmount + totalInterest + processingFee;
    installmentAmount = Math.round((totalRepay / totalInstallments) * 100) / 100;
    principalPerInstallment = Math.round((principalAmount / totalInstallments) * 100) / 100;
    interestPerInstallment = Math.round((totalInterest / totalInstallments) * 100) / 100;

    formulaExplanation = `Flat Interest: GH₵${principalAmount.toLocaleString()} × ${interestRate}% = GH₵${totalInterest.toLocaleString()} interest. Total: GH₵${totalRepay.toLocaleString()} spread across ${totalInstallments} installments at GH₵${installmentAmount.toLocaleString()} per ${repaymentFrequency.replace('ly', '')}.`;
  } else if (interestType === 'fixed_sum') {
    // Fixed lump sum fee as interest
    totalInterest = interestRate;
    const totalRepay = principalAmount + totalInterest + processingFee;
    installmentAmount = Math.round((totalRepay / totalInstallments) * 100) / 100;
    principalPerInstallment = Math.round((principalAmount / totalInstallments) * 100) / 100;
    interestPerInstallment = Math.round((totalInterest / totalInstallments) * 100) / 100;

    formulaExplanation = `Fixed Fee: Principal GH₵${principalAmount.toLocaleString()} + Fixed Markup GH₵${totalInterest.toLocaleString()} = GH₵${totalRepay.toLocaleString()} across ${totalInstallments} installments.`;
  } else if (interestType === 'reducing_balance') {
    // Standard Amortization formula E = P * r * (1+r)^n / ((1+r)^n - 1)
    const periodicRate = (interestRate / 100) / totalInstallments;
    if (periodicRate === 0) {
      installmentAmount = (principalAmount + processingFee) / totalInstallments;
      totalInterest = 0;
    } else {
      const emi = (principalAmount * periodicRate * Math.pow(1 + periodicRate, totalInstallments)) /
                  (Math.pow(1 + periodicRate, totalInstallments) - 1);
      installmentAmount = Math.round((emi + (processingFee / totalInstallments)) * 100) / 100;
      totalInterest = Math.round(((emi * totalInstallments) - principalAmount) * 100) / 100;
    }
    principalPerInstallment = Math.round((principalAmount / totalInstallments) * 100) / 100;
    interestPerInstallment = Math.round((totalInterest / totalInstallments) * 100) / 100;
    const totalRepay = principalAmount + totalInterest + processingFee;

    formulaExplanation = `Reducing Balance: Principal GH₵${principalAmount.toLocaleString()} amortized at ${interestRate}% p.a. over ${totalInstallments} installments. Total interest = GH₵${totalInterest.toLocaleString()}.`;
  }

  const totalRepayment = principalAmount + totalInterest + processingFee;

  // 3. Compute Schedule Dates
  const baseStart = parseISO(startDate);
  let firstDate = customFirstDate ? parseISO(customFirstDate) : baseStart;

  // If first repayment date not specified, calculate based on frequency
  if (!customFirstDate) {
    if (repaymentFrequency === 'daily') firstDate = addDays(baseStart, 1);
    else if (repaymentFrequency === 'weekly') firstDate = addWeeks(baseStart, 1);
    else if (repaymentFrequency === 'biweekly') firstDate = addWeeks(baseStart, 2);
    else if (repaymentFrequency === 'monthly') firstDate = addMonths(baseStart, 1);
  }

  const schedulePreview: LoanCalculationResult['schedulePreview'] = [];
  let currentDate = firstDate;
  let maturityDate = format(firstDate, 'yyyy-MM-dd');

  for (let i = 1; i <= totalInstallments; i++) {
    if (i > 1) {
      if (repaymentFrequency === 'daily') {
        currentDate = addDays(currentDate, 1);
        // Optional: skip Sunday if preferred, but standard daily is continuous
      } else if (repaymentFrequency === 'weekly') {
        currentDate = addWeeks(currentDate, 1);
      } else if (repaymentFrequency === 'biweekly') {
        currentDate = addWeeks(currentDate, 2);
      } else if (repaymentFrequency === 'monthly') {
        currentDate = addMonths(currentDate, 1);
      }
    }

    const dueDateStr = format(currentDate, 'yyyy-MM-dd');
    maturityDate = dueDateStr;

    schedulePreview.push({
      installmentNumber: i,
      dueDate: dueDateStr,
      expectedAmount: installmentAmount,
      principalComponent: principalPerInstallment,
      interestComponent: interestPerInstallment
    });
  }

  return {
    principalAmount,
    interestRate,
    totalInterest,
    processingFee,
    totalRepayment,
    installmentAmount,
    totalInstallments,
    maturityDate,
    firstRepaymentDate: format(firstDate, 'yyyy-MM-dd'),
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
