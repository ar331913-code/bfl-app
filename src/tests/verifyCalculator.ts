import { calculateLoan, parseDateComponents, addDaysToDateStr, addMonthsToDateStr } from '../services/loanCalculator';
import { formatDate } from '../utils/formatters';

function runTests() {
  console.log('--- RUNNING B-F-L FINANCIAL & CALENDAR ENGINE TESTS ---');

  // Test 1: Standard Flat Rate Microloan (GH₵5,000, 10% flat, 10 weekly installments, GH₵100 fee)
  const test1 = calculateLoan({
    principalAmount: 5000,
    interestRate: 10,
    interestType: 'flat',
    durationValue: 10,
    durationUnit: 'weeks',
    repaymentFrequency: 'weekly',
    startDate: '2026-08-25',
    processingFee: 100
  });

  console.log('Test 1: Flat Rate Loan');
  console.log('Principal:', test1.principalAmount);
  console.log('Interest Expected (GH₵500):', test1.totalInterest);
  console.log('Total Repayment Expected (GH₵5600):', test1.totalRepayment);
  console.log('Installment Amount Expected (GH₵560):', test1.installmentAmount);
  console.log('Installments Count Expected (10):', test1.totalInstallments);

  if (test1.totalInterest !== 500) throw new Error(`Test 1 Failed: Expected interest 500, got ${test1.totalInterest}`);
  if (test1.totalRepayment !== 5600) throw new Error(`Test 1 Failed: Expected total 5600, got ${test1.totalRepayment}`);
  if (test1.installmentAmount !== 560) throw new Error(`Test 1 Failed: Expected installment 560, got ${test1.installmentAmount}`);
  if (test1.schedulePreview.length !== 10) throw new Error(`Test 1 Failed: Expected 10 schedule items, got ${test1.schedulePreview.length}`);

  // Test 2: Daily Microloan for Trader (GH₵1,200, 15% flat, 20 days, GH₵0 fee)
  const test2 = calculateLoan({
    principalAmount: 1200,
    interestRate: 15,
    interestType: 'flat',
    durationValue: 20,
    durationUnit: 'days',
    repaymentFrequency: 'daily',
    startDate: '2026-08-25'
  });

  console.log('\nTest 2: Daily Trader Microloan');
  console.log('Principal:', test2.principalAmount);
  console.log('Interest Expected (GH₵180):', test2.totalInterest);
  console.log('Total Repayment Expected (GH₵1380):', test2.totalRepayment);
  console.log('Daily Installment Expected (GH₵69):', test2.installmentAmount);
  console.log('Installments Count Expected (20):', test2.totalInstallments);

  if (test2.totalInterest !== 180) throw new Error(`Test 2 Failed: Expected interest 180, got ${test2.totalInterest}`);
  if (test2.totalRepayment !== 1380) throw new Error(`Test 2 Failed: Expected total 1380, got ${test2.totalRepayment}`);
  if (test2.installmentAmount !== 69) throw new Error(`Test 2 Failed: Expected installment 69, got ${test2.installmentAmount}`);
  if (test2.schedulePreview.length !== 20) throw new Error(`Test 2 Failed: Expected 20 schedule items, got ${test2.schedulePreview.length}`);

  // Verify daily increments:
  console.log('Daily First Due Date:', test2.firstRepaymentDate, 'Expected: 2026-08-26');
  console.log('Daily Maturity Date:', test2.maturityDate, 'Expected: 2026-09-14');
  if (test2.firstRepaymentDate !== '2026-08-26') throw new Error(`Daily Inst 1 wrong: got ${test2.firstRepaymentDate}`);
  if (test2.maturityDate !== '2026-09-14') throw new Error(`Daily Maturity wrong: got ${test2.maturityDate}`);

  // Test 3: Weekly Loan - Exact Weekday Verification
  // 2026-09-11 is a Friday. Disbursing weekly for 4 weeks should produce 4 Fridays: 2026-09-18, 2026-09-25, 2026-10-02, 2026-10-09
  const testWeekly = calculateLoan({
    principalAmount: 2000,
    interestRate: 10,
    interestType: 'flat',
    durationValue: 4,
    durationUnit: 'weeks',
    repaymentFrequency: 'weekly',
    startDate: '2026-09-11'
  });

  console.log('\nTest 3: Weekly Exact Weekday Lock');
  const expectedWeeklyDates = ['2026-09-18', '2026-09-25', '2026-10-02', '2026-10-09'];
  testWeekly.schedulePreview.forEach((item, idx) => {
    console.log(`Weekly Inst ${item.installmentNumber}: ${item.dueDate} (Expected: ${expectedWeeklyDates[idx]})`);
    if (item.dueDate !== expectedWeeklyDates[idx]) {
      throw new Error(`Weekly date mismatch at index ${idx}: expected ${expectedWeeklyDates[idx]}, got ${item.dueDate}`);
    }
  });

  // Test 4: Monthly Shorter Months Clamping & Recovery (Jan 31 disbursement)
  // Jan 31 -> Feb 28 -> Mar 31 -> Apr 30 -> May 31 -> Jun 30
  const testMonthly = calculateLoan({
    principalAmount: 6000,
    interestRate: 20,
    interestType: 'flat',
    durationValue: 5,
    durationUnit: 'months',
    repaymentFrequency: 'monthly',
    startDate: '2026-01-31'
  });

  console.log('\nTest 4: Monthly Shorter-Month Handling');
  const expectedMonthlyDates = ['2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30'];
  testMonthly.schedulePreview.forEach((item, idx) => {
    console.log(`Monthly Inst ${item.installmentNumber}: ${item.dueDate} (Expected: ${expectedMonthlyDates[idx]})`);
    if (item.dueDate !== expectedMonthlyDates[idx]) {
      throw new Error(`Monthly date mismatch at index ${idx}: expected ${expectedMonthlyDates[idx]}, got ${item.dueDate}`);
    }
  });

  // Test 5: Leap Year Monthly Clamping (2024-01-31)
  const testLeapYear = calculateLoan({
    principalAmount: 1000,
    interestRate: 10,
    interestType: 'flat',
    durationValue: 2,
    durationUnit: 'months',
    repaymentFrequency: 'monthly',
    startDate: '2024-01-31'
  });

  console.log('\nTest 5: Leap Year Handling');
  console.log('2024 Feb Due Date:', testLeapYear.schedulePreview[0].dueDate, 'Expected: 2024-02-29');
  console.log('2024 Mar Due Date:', testLeapYear.schedulePreview[1].dueDate, 'Expected: 2024-03-31');
  if (testLeapYear.schedulePreview[0].dueDate !== '2024-02-29') throw new Error('Leap year Feb failed');
  if (testLeapYear.schedulePreview[1].dueDate !== '2024-03-31') throw new Error('Leap year Mar failed');

  // Test 6: Timezone-Safe Formatting Verification
  console.log('\nTest 6: Date Formatting Timezone-Proof Check');
  const formatted1 = formatDate('2026-09-11');
  const formatted2 = formatDate('2026-02-28');
  console.log('Formatted 2026-09-11:', formatted1);
  console.log('Formatted 2026-02-28:', formatted2);
  if (!formatted1.includes('11 Sep 2026')) throw new Error(`formatDate mismatch: ${formatted1}`);
  if (!formatted2.includes('28 Feb 2026')) throw new Error(`formatDate mismatch: ${formatted2}`);

  console.log('\n✅ ALL MATHEMATICAL & CALENDAR CALCULATION TESTS PASSED PERFECTLY!');
}

runTests();
