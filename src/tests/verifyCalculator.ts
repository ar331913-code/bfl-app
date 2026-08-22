import { calculateLoan } from '../services/loanCalculator';

function runTests() {
  console.log('--- RUNNING B-F-L FINANCIAL ENGINE TESTS ---');

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

  // Test 3: Reducing Balance Loan (GH₵10,000, 12% p.a., 4 monthly installments)
  const test3 = calculateLoan({
    principalAmount: 10000,
    interestRate: 12,
    interestType: 'reducing_balance',
    durationValue: 4,
    durationUnit: 'months',
    repaymentFrequency: 'monthly',
    startDate: '2026-08-25'
  });

  console.log('\nTest 3: Reducing Balance Loan');
  console.log('Principal:', test3.principalAmount);
  console.log('Total Repayment:', test3.totalRepayment);
  console.log('Installment Amount:', test3.installmentAmount);
  console.log('Maturity Date:', test3.maturityDate);

  if (test3.totalRepayment <= 10000) throw new Error('Test 3 Failed: Total repayment should exceed principal');
  if (test3.schedulePreview.length !== 4) throw new Error(`Test 3 Failed: Expected 4 monthly installments, got ${test3.schedulePreview.length}`);

  console.log('\n✅ ALL MATHEMATICAL FINANCIAL CALCULATION TESTS PASSED PERFECTLY!');
}

runTests();
