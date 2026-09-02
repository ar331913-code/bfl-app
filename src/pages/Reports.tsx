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
  ArrowUpRight,
  ShieldCheck
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
      'Interest (GH₵)',
      'Processing Fee (GH₵)',
      'Total Repayment (GH₵)',
      'Total Paid (GH₵)',
      'Outstanding Balance (GH₵)',
      'Installment (GH₵)',
      'Frequency',
      'Status',
      'Start Date',
      'Maturity Date'
    ];

    const rows = filteredLoans.map(l => [
      l.loanId,
      l.customerId,
      l.customerName || '',
      l.customerType || 'other',
      (l.principalAmount || 0).toFixed(2),
      l.interestRate,
      (l.totalInterest || 0).toFixed(2),
      (l.processingFee || 0).toFixed(2),
      (l.totalRepayment || 0).toFixed(2),
      (l.totalPaid || 0).toFixed(2),
      (l.outstandingBalance || 0).toFixed(2),
      (l.installmentAmount || 0).toFixed(2),
      l.repaymentFrequency,
      l.status,
      l.startDate,
      l.maturityDate
    ]);

    downloadCSV(`BFL_Loans_Report_${format(today, 'yyyy-MM-dd')}.csv`, rows, headers);
  };

  // Export Payments CSV
  const handleExportPaymentsCSV = () => {
    const headers = [
      'Payment ID',
      'Loan ID',
      'Customer ID',
      'Amount Paid (GH₵)',
      'Method',
      'Payment Date',
      'Reference No',
      'Recorded By'
    ];

    const rows = filteredPayments.map(p => [
      p.paymentId,
      p.loanId,
      p.customerId,
      (p.amountPaid || 0).toFixed(2),
      p.paymentMethod,
      p.paymentDate,
      p.referenceNumber || '',
      p.recordedBy
    ]);

    downloadCSV(`BFL_Payment_Collections_${format(today, 'yyyy-MM-dd')}.csv`, rows, headers);
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-8 animate-fade-in text-slate-800">
      
      {/* 1. Header Banner & CSV Exports */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border-2 border-slate-200 shadow-sm">
        <div>
          <h1 className="text-base sm:text-xl font-black text-slate-950">Financial Reports & Portfolio Analytics</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Comprehensive audit statements, revenue metrics, and data exports</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportLoansCSV}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-black rounded-2xl shadow-md flex items-center gap-1.5 transition"
            title="Export Loans CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Loans CSV</span>
          </button>
          
          <button
            onClick={handleExportPaymentsCSV}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black rounded-2xl shadow-md flex items-center gap-1.5 transition"
            title="Export Payments CSV"
          >
            <Download className="w-4 h-4" />
            <span>Pays CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Period Selector Tabs */}
      <div className="grid grid-cols-4 gap-2 bg-slate-200/80 p-1.5 rounded-2xl border border-slate-200 max-w-lg">
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
                ? 'bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white shadow-md' 
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 3. Key Financial Analytics Metrics (4 Columns on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Collections in Period */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border-2 border-emerald-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">Collections</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(totalCollectedInPeriod)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-semibold">
            {filteredPayments.length} receipts issued
          </div>
        </div>

        {/* Disbursements in Period */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border-2 border-blue-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black text-blue-800 uppercase tracking-wider">Disbursed</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(totalLent)}
          </div>
          <div className="text-[11px] text-blue-700 mt-1 font-semibold">
            {filteredLoans.length} loan(s) granted
          </div>
        </div>

        {/* Margin Earned */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border-2 border-indigo-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black text-indigo-800 uppercase tracking-wider">Earned Margin</span>
            <BarChart3 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(totalInterestExpected + totalFeesExpected)}
          </div>
          <div className="text-[11px] text-indigo-700 mt-1 font-semibold">
            Interest + admin fees
          </div>
        </div>

        {/* Repayment Health Rate */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border-2 border-sky-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black text-sky-800 uppercase tracking-wider">Recovery Rate</span>
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-950 mt-1">
            {recoveryRate}%
          </div>
          <div className="text-[11px] text-sky-700 mt-1 font-semibold">
            Overall collection efficiency
          </div>
        </div>

      </div>

      {/* 4. Portfolio Breakdown Section (2-Column on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Borrower Demographics */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-600" />
              <span>Borrower Demographics</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">{customers.length} Total</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900">{driversCount} Drivers</div>
                <div className="text-[10px] text-slate-500">Commercial & Taxi</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900">{tradersCount} Traders</div>
                <div className="text-[10px] text-slate-500">Market & Retail</div>
              </div>
            </div>
          </div>
        </div>

        {/* Overdue Risk Assessment */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Overdue Risk Assessment</span>
            </h3>
            <span className="text-xs font-bold text-rose-600">{overdueLoansAllTime.length} Accounts</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase text-rose-800">Total Delinquent Balance</div>
              <div className="text-xl font-black text-rose-950 mt-0.5">{formatCurrency(overdueAmountAllTime)}</div>
            </div>
            <span className="text-xs font-bold bg-rose-200 text-rose-900 px-3 py-1 rounded-xl">
              Needs Follow Up
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
