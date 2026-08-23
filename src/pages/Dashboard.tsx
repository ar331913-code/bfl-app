import React from 'react';
import { Customer, Loan, RepaymentSchedule, Payment, AppNotification } from '../types';
import { 
  Users, 
  Banknote, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  PlusCircle, 
  ArrowUpRight, 
  DollarSign, 
  CreditCard,
  ChevronRight,
  Phone,
  MessageCircle,
  Car,
  Store,
  Wallet,
  CalendarDays,
  Sparkles
} from 'lucide-react';
import { formatCurrency, formatDate, formatGhanaPhone } from '../utils/formatters';

interface DashboardProps {
  customers: Customer[];
  loans: Loan[];
  schedules: RepaymentSchedule[];
  payments: Payment[];
  notifications: AppNotification[];
  onNavigate: (tab: string, extra?: any) => void;
  onOpenNewCustomer: () => void;
  onOpenNewLoan: (customerId?: string) => void;
  onOpenRecordPayment: (loanId?: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  onSelectLoan: (loan: Loan) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  customers,
  loans,
  schedules,
  payments,
  notifications,
  onNavigate,
  onOpenNewCustomer,
  onOpenNewLoan,
  onOpenRecordPayment,
  onSelectCustomer,
  onSelectLoan
}) => {
  // Aggregate Metrics
  const totalCustomers = customers.length;
  const activeLoans = loans.filter(l => l.status !== 'completed' && l.status !== 'defaulted');
  const completedLoans = loans.filter(l => l.status === 'completed');
  const overdueLoans = loans.filter(l => l.status === 'overdue');
  const dueTodayLoans = loans.filter(l => l.status === 'due_today');

  const totalLent = loans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
  const totalCollected = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.outstandingBalance || 0), 0);

  // Schedules due today and overdue
  const dueTodaySchedules = schedules.filter(s => s.status === 'due_today' && s.remainingBalance > 0.01);
  const dueTodayAmount = dueTodaySchedules.reduce((sum, s) => sum + s.remainingBalance, 0);

  const overdueSchedules = schedules.filter(s => s.status === 'overdue' && s.remainingBalance > 0.01);
  const overdueAmount = overdueSchedules.reduce((sum, s) => sum + s.remainingBalance, 0);

  // Recent payments
  const recentPayments = [...payments].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 4);

  return (
    <div className="space-y-5 pb-24 animate-fade-in">
      
      {/* 1. Quick Action Bar */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={onOpenNewCustomer}
          type="button"
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border-2 border-emerald-200 shadow-sm hover:border-emerald-400 hover:bg-emerald-50/60 active:scale-95 transition group"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-700 text-white flex items-center justify-center mb-1.5 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-black text-slate-800 leading-tight">Add Client</span>
        </button>

        <button
          onClick={() => onOpenNewLoan()}
          type="button"
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border-2 border-teal-200 shadow-sm hover:border-teal-400 hover:bg-teal-50/60 active:scale-95 transition group"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-600 to-slate-800 text-white flex items-center justify-center mb-1.5 shadow-md shadow-teal-500/20 group-hover:scale-105 transition">
            <Banknote className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-black text-slate-800 leading-tight">Issue Loan</span>
        </button>

        <button
          onClick={() => onOpenRecordPayment()}
          type="button"
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border-2 border-emerald-200 shadow-sm hover:border-emerald-400 hover:bg-emerald-50/60 active:scale-95 transition group"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 text-white flex items-center justify-center mb-1.5 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
            <DollarSign className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-black text-slate-800 leading-tight">Collect Pay</span>
        </button>

        <button
          onClick={() => onNavigate('loans', { filter: 'overdue' })}
          type="button"
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border-2 border-rose-200 shadow-sm hover:border-rose-400 hover:bg-rose-50/60 active:scale-95 transition group"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 text-white flex items-center justify-center mb-1.5 shadow-md shadow-rose-500/20 group-hover:scale-105 transition">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-black text-slate-800 leading-tight">Overdue</span>
        </button>
      </div>

      {/* 2. Hero Financial Summary Cards (Emerald & Deep Slate Theme) */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Total Outstanding Hero Card */}
        <div className="col-span-2 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 rounded-3xl p-5 text-white shadow-xl shadow-emerald-950/20 border border-emerald-500/30 relative overflow-hidden">
          {/* Subtle light glowing circles */}
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-36 h-36 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-32 h-32 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-400" />
              Active Portfolio Outstanding
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] px-2.5 py-0.5 rounded-full font-black backdrop-blur-xs">
              {activeLoans.length} Active Loans
            </span>
          </div>

          <div className="text-3xl font-black tracking-tight text-white mb-4 drop-shadow-sm">
            {formatCurrency(totalOutstanding)}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/15 text-xs">
            <div className="bg-white/5 p-2.5 rounded-2xl backdrop-blur-xs border border-white/10">
              <div className="text-slate-400 text-[11px] font-semibold">Total Lent</div>
              <div className="font-black text-white text-sm">{formatCurrency(totalLent)}</div>
            </div>
            <div className="bg-white/5 p-2.5 rounded-2xl backdrop-blur-xs border border-white/10">
              <div className="text-emerald-400 text-[11px] font-semibold">Total Collected</div>
              <div className="font-black text-white text-sm">{formatCurrency(totalCollected)}</div>
            </div>
          </div>
        </div>

        {/* Due Today Card */}
        <div 
          onClick={() => onNavigate('loans', { filter: 'due_today' })}
          className="bg-gradient-to-br from-amber-50 via-orange-50/30 to-amber-100/50 border-2 border-amber-300 rounded-3xl p-4 cursor-pointer hover:shadow-lg transition active:scale-98 shadow-sm group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              Due Today
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-200 animate-pulse" />
          </div>
          <div className="text-xl font-black text-amber-950">
            {formatCurrency(dueTodayAmount)}
          </div>
          <div className="text-[11px] font-bold text-amber-800 mt-1 flex items-center justify-between">
            <span>{dueTodaySchedules.length} installment(s)</span>
            <ChevronRight className="w-4 h-4 text-amber-700 group-hover:translate-x-0.5 transition" />
          </div>
        </div>

        {/* Overdue Card */}
        <div 
          onClick={() => onNavigate('loans', { filter: 'overdue' })}
          className="bg-gradient-to-br from-rose-50 via-red-50/30 to-rose-100/50 border-2 border-rose-300 rounded-3xl p-4 cursor-pointer hover:shadow-lg transition active:scale-98 shadow-sm group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-900 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Overdue
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 ring-4 ring-rose-200 animate-ping" />
          </div>
          <div className="text-xl font-black text-rose-950">
            {formatCurrency(overdueAmount)}
          </div>
          <div className="text-[11px] font-bold text-rose-800 mt-1 flex items-center justify-between">
            <span>{overdueLoans.length} delinquent loan(s)</span>
            <ChevronRight className="w-4 h-4 text-rose-700 group-hover:translate-x-0.5 transition" />
          </div>
        </div>

        {/* Total Customers */}
        <div 
          onClick={() => onNavigate('customers')}
          className="bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 border-2 border-emerald-200 rounded-3xl p-4 shadow-sm cursor-pointer hover:shadow-lg transition group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-950">Borrowers</span>
            <Users className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {totalCustomers}
          </div>
          <div className="text-[11px] font-bold text-emerald-800 mt-1">
            {customers.filter(c => c.customerType === 'driver').length} Drivers • {customers.filter(c => c.customerType === 'trader').length} Traders
          </div>
        </div>

        {/* Completed Loans */}
        <div 
          onClick={() => onNavigate('loans', { filter: 'completed' })}
          className="bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 border-2 border-slate-200 rounded-3xl p-4 shadow-sm cursor-pointer hover:shadow-lg transition group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">Paid Off</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {completedLoans.length}
          </div>
          <div className="text-[11px] font-bold text-emerald-700 mt-1">
            100% Repaid
          </div>
        </div>

      </div>

      {/* 3. Action Required Section: Urgent Due Today / Overdue */}
      {(dueTodayLoans.length > 0 || overdueLoans.length > 0) && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
              Action Required Today
            </h3>
          </div>

          <div className="space-y-2">
            {/* Due Today Items */}
            {dueTodayLoans.slice(0, 2).map(loan => (
              <div 
                key={loan.loanId}
                className="bg-white border-l-4 border-l-amber-500 border-2 border-amber-200/80 rounded-2xl p-3.5 shadow-sm flex items-center justify-between hover:border-amber-400 transition"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-navy-950">{loan.customerName}</span>
                    <span className="text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.2 rounded-full">
                      DUE TODAY
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Loan {loan.loanId} • Due: <strong className="text-amber-800">{formatCurrency(loan.installmentAmount)}</strong>
                  </div>
                </div>
                <button
                  onClick={() => onOpenRecordPayment(loan.loanId)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-sky-500 via-blue-600 to-cyan-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition"
                >
                  Pay Now
                </button>
              </div>
            ))}

            {/* Overdue Items */}
            {overdueLoans.slice(0, 2).map(loan => (
              <div 
                key={loan.loanId}
                className="bg-white border-l-4 border-l-rose-500 border-2 border-rose-200/80 rounded-2xl p-3.5 shadow-sm flex items-center justify-between hover:border-rose-400 transition"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-navy-950">{loan.customerName}</span>
                    <span className="text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.2 rounded-full">
                      OVERDUE
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Loan {loan.loanId} • Balance: <strong className="text-rose-800">{formatCurrency(loan.outstandingBalance)}</strong>
                  </div>
                </div>
                <button
                  onClick={() => onOpenRecordPayment(loan.loanId)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-bold rounded-xl shadow-md active:scale-95 transition"
                >
                  Collect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Recent Payment Stream */}
      <div className="bg-white border-2 border-sky-100 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
            Recent Collections
          </h3>
          <button
            onClick={() => onNavigate('payments')}
            className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-0.5 transition"
          >
            View All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentPayments.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            No payments recorded yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentPayments.map(p => (
              <div 
                key={p.paymentId}
                className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-sky-50/50 to-blue-50/30 hover:from-sky-100/60 hover:to-blue-100/50 transition border border-sky-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
                    <ArrowUpRight className="w-4 h-4 text-sky-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-navy-950">
                      {p.loanId} <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-1.5 py-0.2 rounded">({p.paymentMethod.toUpperCase()})</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {formatDate(p.paymentDate)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-sky-700">
                    +{formatCurrency(p.amountPaid)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {p.paymentId}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
