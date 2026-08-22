import React, { useState } from 'react';
import { Customer, Loan, Payment, RepaymentSchedule } from '../types';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  FileSpreadsheet,
  PieChart,
  Car,
  Store,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { downloadCSV } from '../services/exportService';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface ReportsProps {
  customers: Customer[];
  loans: Loan[];
  payments: Payment[];
  schedules: RepaymentSchedule[];
}

export const Reports: React.FC<ReportsProps> = ({
  customers,
  loans,
  payments,
  schedules
}) => {
  const [reportPeriod, setReportPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');

  const today = new Date();

  // Period filtering
  const filteredLoans = loans.filter(l => {
    if (reportPeriod === 'all') return true;
    const loanDate = new Date(l.startDate);
    if (reportPeriod === 'today') {
      return format(loanDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
    }
    if (reportPeriod === 'week') {
      return isWithinInterval(loanDate, { start: startOfDay(subDays(today, 7)), end: endOfDay(today) });
    }
    if (reportPeriod === 'month') {
      return isWithinInterval(loanDate, { start: startOfDay(subDays(today, 30)), end: endOfDay(today) });
    }
    return true;
  });

  const filteredPayments = payments.filter(p => {
    if (reportPeriod === 'all') return true;
    const payDate = new Date(p.paymentDate);
    if (reportPeriod === 'today') {
      return format(payDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
    }
    if (reportPeriod === 'week') {
      return isWithinInterval(payDate, { start: startOfDay(subDays(today, 7)), end: endOfDay(today) });
    }
    if (reportPeriod === 'month') {
      return isWithinInterval(payDate, { start: startOfDay(subDays(today, 30)), end: endOfDay(today) });
    }
    return true;
  });

  // Analytics Metrics
  const totalLent = filteredLoans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
  const totalInterestExpected = filteredLoans.reduce((sum, l) => sum + (l.totalInterest || 0), 0);
  const totalFeesExpected = filteredLoans.reduce((sum, l) => sum + (l.processingFee || 0), 0);
  const totalCollectedInPeriod = filteredPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

  const activeLoans = loans.filter(l => l.status !== 'completed' && l.status !== 'defaulted');
  const overdueLoansAllTime = loans.filter(l => l.status === 'overdue');
  const overdueAmountAllTime = overdueLoansAllTime.reduce((sum, l) => sum + (l.outstandingBalance || 0), 0);

  // Recovery Rate
  const totalAllTimeLent = loans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
  const totalAllTimeRepayments = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const recoveryRate = totalAllTimeLent > 0 
    ? Math.min(100, Math.round((totalAllTimeRepayments / loans.reduce((sum, l) => sum + (l.totalRepayment || 0), 0)) * 100))
    : 100;

  // Driver vs Trader Ratio
  const driversCount = customers.filter(c => c.customerType === 'driver').length;
  const tradersCount = customers.filter(c => c.customerType === 'trader').length;

  // Export Loan Portfolio CSV
  const handleExportLoansCSV = () => {
    const headers = [
      'Loan ID',
      'Customer ID',
      'Customer Name',
      'Category',
      'Principal (GH₵)',
      'Interest Rate (%)',
      'Total Repayment (GH₵)',
      'Amount Paid (GH₵)',
      'Outstanding (GH₵)',
      'Frequency',
      'Start Date',
      'Maturity Date',
      'Status'
    ];

    const rows = loans.map(l => [
      l.loanId,
      l.customerId,
      l.customerName || '',
      l.customerType || '',
      l.principalAmount,
      l.interestRate,
      l.totalRepayment,
      l.totalPaid,
      l.outstandingBalance,
      l.repaymentFrequency,
      l.startDate,
      l.maturityDate,
      l.status
    ]);

    downloadCSV(`BFL_Loan_Portfolio_${format(today, 'yyyy-MM-dd')}.csv`, rows, headers);
  };

  // Export Payments CSV
  const handleExportPaymentsCSV = () => {
    const headers = [
      'Payment ID',
      'Loan ID',
      'Customer ID',
      'Amount Paid (GH₵)',
      'Payment Mode',
      'Reference No',
      'Date Time',
      'Recorded By'
    ];

    const rows = payments.map(p => [
      p.paymentId,
      p.loanId,
      p.customerId,
      p.amountPaid,
      p.paymentMethod.toUpperCase(),
      p.referenceNumber || '',
      p.paymentDate,
      p.recordedBy
    ]);

    downloadCSV(`BFL_Payment_Collections_${format(today, 'yyyy-MM-dd')}.csv`, rows, headers);
  };

  return (
    <div className="space-y-5 pb-24 animate-fade-in">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-navy-950">Financial Reports</h1>
          <p className="text-xs text-slate-500 font-medium">Portfolio analytics & statements</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExportLoansCSV}
            className="px-3 py-1.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition"
            title="Export Loans CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Loans CSV
          </button>
          
          <button
            onClick={handleExportPaymentsCSV}
            className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-700 hover:to-teal-800 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition"
            title="Export Payments CSV"
          >
            <Download className="w-3.5 h-3.5" /> Pays CSV
          </button>
        </div>
      </div>

      {/* Period Selector Tabs */}
      <div className="grid grid-cols-4 gap-1.5 bg-sky-100/70 p-1.5 rounded-2xl border border-sky-200">
        {[
          { id: 'today', label: 'Today' },
          { id: 'week', label: '7 Days' },
          { id: 'month', label: '30 Days' },
          { id: 'all', label: 'All Time' },
        ].map(p => (
          <button
            key={p.id}
            onClick={() => setReportPeriod(p.id as any)}
            className={`py-2 rounded-xl text-xs font-black transition ${
              reportPeriod === p.id 
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md' 
                : 'text-slate-600 hover:text-sky-900'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Key Financial Analytics Metrics */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Collections in Period */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-cyan-50 via-sky-50 to-teal-50 border-2 border-cyan-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black text-cyan-900 uppercase tracking-wider">Collections</span>
            <DollarSign className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-xl font-black text-cyan-950">
            {formatCurrency(totalCollectedInPeriod)}
          </div>
          <div className="text-[11px] text-cyan-800 mt-1 font-semibold">
            {filteredPayments.length} transactions
          </div>
        </div>

        {/* Disbursements in Period */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 border-2 border-sky-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black text-blue-900 uppercase tracking-wider">Disbursed</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-blue-950">
            {formatCurrency(totalLent)}
          </div>
          <div className="text-[11px] text-blue-800 mt-1 font-semibold">
            {filteredLoans.length} loan(s) issued
          </div>
        </div>

        {/* Gross Interest Earned */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black text-indigo-900 uppercase tracking-wider">Margin (Int + Fee)</span>
            <BarChart3 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-950">
            {formatCurrency(totalInterestExpected + totalFeesExpected)}
          </div>
          <div className="text-[11px] text-indigo-800 mt-1 font-semibold">
            Earned for period
          </div>
        </div>

        {/* Portfolio Recovery Rate */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black text-emerald-900 uppercase tracking-wider">Recovery Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-950">
            {recoveryRate}%
          </div>
          <div className="text-[11px] text-emerald-800 mt-1 font-semibold">
            Collection efficiency
          </div>
        </div>

      </div>

      {/* Portfolio Breakdown by Archetype */}
      <div className="p-4 rounded-3xl bg-white border-2 border-sky-100 shadow-sm space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <PieChart className="w-4 h-4 text-sky-600" />
          Borrower Portfolio Distribution
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl border-2 border-blue-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-navy-950">{driversCount} Drivers</div>
              <div className="text-[10px] text-slate-500 font-medium">
                {customers.length > 0 ? Math.round((driversCount / customers.length) * 100) : 0}% of client base
              </div>
            </div>
          </div>

          <div className="p-3 bg-gradient-to-br from-cyan-50 to-emerald-50 rounded-2xl border-2 border-emerald-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-navy-950">{tradersCount} Traders</div>
              <div className="text-[10px] text-slate-500 font-medium">
                {customers.length > 0 ? Math.round((tradersCount / customers.length) * 100) : 0}% of client base
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Risk Summary */}
      <div className="p-4 rounded-3xl bg-white border-2 border-rose-100 shadow-sm space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          Portfolio Overdue Aging
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-gradient-to-br from-rose-50 to-red-50 rounded-2xl border-2 border-rose-200">
            <div className="text-[10px] text-rose-800 font-black uppercase">Total Overdue Principal</div>
            <div className="text-base font-black text-rose-950 mt-0.5">
              {formatCurrency(overdueAmountAllTime)}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border-2 border-slate-200">
            <div className="text-[10px] text-slate-600 font-black uppercase">Delinquent Count</div>
            <div className="text-base font-black text-navy-950 mt-0.5">
              {overdueLoansAllTime.length} loans
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
