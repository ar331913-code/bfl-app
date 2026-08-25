import React from 'react';
import { Customer, Loan, RepaymentSchedule, Payment, AppNotification } from '../types';
import { 
  Users, 
  Banknote, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  UserPlus, 
  ArrowUpRight, 
  DollarSign, 
  ChevronRight, 
  Wallet, 
  Calendar 
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

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
  onNavigate,
  onOpenNewCustomer,
  onOpenNewLoan,
  onOpenRecordPayment
}) => {
  // Aggregate Metrics
  const totalCustomers = customers.length;
  const activeLoans = loans.filter(l => (l.outstandingBalance || 0) > 0.01 && l.status !== 'completed' && l.status !== 'defaulted');
  const overdueLoans = loans.filter(l => (l.outstandingBalance || 0) > 0.01 && l.status === 'overdue');
  const dueTodayLoans = loans.filter(l => (l.outstandingBalance || 0) > 0.01 && l.status === 'due_today');

  const totalCollected = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.outstandingBalance || 0), 0);

  // Schedules due today
  const dueTodaySchedules = schedules.filter(s => s.status === 'due_today' && s.remainingBalance > 0.01);
  const dueTodayAmount = dueTodaySchedules.reduce((sum, s) => sum + s.remainingBalance, 0);

  // Overdue schedules
  const overdueSchedules = schedules.filter(s => s.status === 'overdue' && s.remainingBalance > 0.01);
  const overdueAmount = overdueSchedules.reduce((sum, s) => sum + s.remainingBalance, 0);

  // Recent payments
  const recentPayments = [...payments].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 4);

  return (
    <div className="space-y-4 pb-24 animate-fade-in text-slate-800">
      
      {/* 1. Main Outstanding Money Card */}
      <div className="bg-gradient-to-br from-blue-950 via-indigo-950 to-slate-950 rounded-3xl p-4 sm:p-5 text-white shadow-xl border border-sky-500/30 relative overflow-hidden">
        
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-36 h-36 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between text-sky-300 text-xs font-bold uppercase tracking-wider mb-1 gap-2">
          <span className="flex items-center gap-1.5 truncate">
            <Wallet className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="truncate">Money Outside (To Collect)</span>
          </span>
          <span className="bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[10px] px-2.5 py-0.5 rounded-full font-black shrink-0">
            {activeLoans.length} Active {activeLoans.length === 1 ? 'Loan' : 'Loans'}
          </span>
        </div>

        <div className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-3 drop-shadow-sm truncate">
          {formatCurrency(totalOutstanding)}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/15 text-xs">
          <div className="bg-white/5 p-2 sm:p-2.5 rounded-2xl border border-white/10 min-w-0">
            <div className="text-slate-400 text-[9px] sm:text-[10px] font-bold uppercase truncate">Total Collected</div>
            <div className="font-black text-sky-300 text-xs sm:text-sm mt-0.5 truncate">{formatCurrency(totalCollected)}</div>
          </div>
          <div className="bg-white/5 p-2 sm:p-2.5 rounded-2xl border border-white/10 min-w-0">
            <div className="text-slate-400 text-[9px] sm:text-[10px] font-bold uppercase truncate">Registered Clients</div>
            <div className="font-black text-white text-xs sm:text-sm mt-0.5 truncate">{totalCustomers} People</div>
          </div>
        </div>
      </div>

      {/* 2. Four Big, Simple Action Buttons */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 px-1">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          
          {/* Button 1: Register Client */}
          <button
            onClick={onOpenNewCustomer}
            type="button"
            className="p-2.5 sm:p-3 rounded-2xl bg-white border-2 border-sky-100 hover:border-sky-400 hover:bg-sky-50/50 shadow-sm active:scale-95 transition flex items-center gap-2 text-left group overflow-hidden"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-100 text-blue-700 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-slate-900 leading-tight truncate">Add Client</div>
              <div className="text-[10px] text-slate-500 font-medium truncate">New borrower</div>
            </div>
          </button>

          {/* Button 2: Give Loan */}
          <button
            onClick={() => onOpenNewLoan()}
            type="button"
            className="p-2.5 sm:p-3 rounded-2xl bg-white border-2 border-blue-100 hover:border-blue-400 hover:bg-blue-50/50 shadow-sm active:scale-95 transition flex items-center gap-2 text-left group overflow-hidden"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition">
              <Banknote className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-slate-900 leading-tight truncate">Give Loan</div>
              <div className="text-[10px] text-slate-500 font-medium truncate">Disburse cash</div>
            </div>
          </button>

          {/* Button 3: Collect Money */}
          <button
            onClick={() => onOpenRecordPayment()}
            type="button"
            className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-md active:scale-95 transition flex items-center gap-2 text-left group overflow-hidden"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold shrink-0 shadow-sm group-hover:scale-105 transition">
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-white leading-tight truncate">Collect Pay</div>
              <div className="text-[10px] text-sky-100 font-semibold truncate">Get money</div>
            </div>
          </button>

          {/* Button 4: Overdue List */}
          <button
            onClick={() => onNavigate('loans', { filter: 'overdue' })}
            type="button"
            className="p-2.5 sm:p-3 rounded-2xl bg-white border-2 border-rose-200 hover:border-rose-400 hover:bg-rose-50/50 shadow-sm active:scale-95 transition flex items-center gap-2 text-left group overflow-hidden"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-slate-900 leading-tight truncate">Owing / Late</div>
              <div className="text-[10px] text-rose-600 font-bold truncate">{overdueLoans.length} defaulters</div>
            </div>
          </button>

        </div>
      </div>

      {/* 3. Due Today & Overdue Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        
        {/* Due Today */}
        <div 
          onClick={() => onNavigate('loans', { filter: 'due_today' })}
          className="bg-sky-50/80 border-2 border-sky-200 rounded-3xl p-3 sm:p-3.5 cursor-pointer hover:shadow-md transition active:scale-98 min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-1 gap-1">
            <span className="text-[10px] sm:text-[11px] font-black uppercase text-sky-900 flex items-center gap-1 truncate">
              <Clock className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <span className="truncate">Due Today</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold bg-sky-200 text-sky-900 px-1.5 py-0.2 rounded-full shrink-0">
              {dueTodayLoans.length}
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-sky-950 truncate">
            {formatCurrency(dueTodayAmount)}
          </div>
          <p className="text-[9px] sm:text-[10px] text-sky-800 font-semibold mt-0.5 truncate">
            Tap to view
          </p>
        </div>

        {/* Overdue */}
        <div 
          onClick={() => onNavigate('loans', { filter: 'overdue' })}
          className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-3 sm:p-3.5 cursor-pointer hover:shadow-md transition active:scale-98 min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-1 gap-1">
            <span className="text-[10px] sm:text-[11px] font-black uppercase text-rose-900 flex items-center gap-1 truncate">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="truncate">Overdue</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold bg-rose-200 text-rose-900 px-1.5 py-0.2 rounded-full shrink-0">
              {overdueLoans.length}
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-rose-950 truncate">
            {formatCurrency(overdueAmount)}
          </div>
          <p className="text-[9px] sm:text-[10px] text-rose-800 font-semibold mt-0.5 truncate">
            Tap to follow up
          </p>
        </div>

      </div>

      {/* 4. Action List: Who Must Pay Today */}
      {(dueTodayLoans.length > 0 || overdueLoans.length > 0) && (
        <div className="bg-white border-2 border-sky-100 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Collections to Make Today</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-500 shrink-0">
              {dueTodayLoans.length + overdueLoans.length} people
            </span>
          </div>

          <div className="space-y-2">
            {/* Due Today */}
            {dueTodayLoans.map(loan => (
              <div 
                key={loan.loanId}
                className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200 flex items-center justify-between gap-2 overflow-hidden"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-slate-900 truncate">{loan.customerName}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Due Today: <strong className="text-sky-900 font-black">{formatCurrency(loan.installmentAmount)}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenRecordPayment(loan.loanId)}
                  className="px-3 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1 shrink-0"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Collect</span>
                </button>
              </div>
            ))}

            {/* Overdue */}
            {overdueLoans.slice(0, 3).map(loan => (
              <div 
                key={loan.loanId}
                className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200 flex items-center justify-between gap-2 overflow-hidden"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-slate-900 truncate">{loan.customerName}</div>
                  <div className="text-[11px] text-rose-700 font-bold truncate">
                    Overdue: {formatCurrency(loan.outstandingBalance)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenRecordPayment(loan.loanId)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1 shrink-0"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Collect</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Recent Collections */}
      <div className="bg-white border-2 border-sky-100 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Recent Money Received</span>
          </h3>
          <button
            onClick={() => onNavigate('payments')}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-0.5 shrink-0"
          >
            <span>All Payments</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentPayments.length === 0 ? (
          <div className="text-center py-5 text-xs text-slate-400 font-medium">
            No payments recorded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {recentPayments.map(p => (
              <div 
                key={p.paymentId}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-sky-50/50 transition gap-2 overflow-hidden"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                    <ArrowUpRight className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      Loan {p.loanId} <span className="text-[10px] font-semibold text-slate-500 uppercase">({p.paymentMethod})</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {formatDate(p.paymentDate)}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-blue-700 truncate">
                    +{formatCurrency(p.amountPaid)}
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono truncate">
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
