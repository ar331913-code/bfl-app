import React, { useState } from 'react';
import { Customer, Loan, RepaymentSchedule } from '../types';
import { 
  Banknote, 
  Search, 
  Plus, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  Filter,
  DollarSign,
  Wallet,
  TrendingUp
} from 'lucide-react';
import { formatCurrency, formatDate, isLoanOwing, getTrueOutstanding } from '../utils/formatters';

interface LoansProps {
  loans: Loan[];
  customers: Customer[];
  schedules: RepaymentSchedule[];
  initialFilter?: string;
  onSelectLoan: (loan: Loan) => void;
  onOpenNewLoan: () => void;
  onOpenRecordPayment: (loanId: string) => void;
}

export const Loans: React.FC<LoansProps> = ({
  loans,
  initialFilter = 'active',
  onSelectLoan,
  onOpenNewLoan,
  onOpenRecordPayment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);

  // Sync initialFilter prop if navigation passes a specific filter (e.g. from Dashboard)
  React.useEffect(() => {
    setStatusFilter(initialFilter);
  }, [initialFilter]);

  const activeLoans = loans.filter(l => isLoanOwing(l));
  const dueTodayLoans = loans.filter(l => isLoanOwing(l) && l.status === 'due_today');
  const overdueLoans = loans.filter(l => isLoanOwing(l) && l.status === 'overdue');
  const completedLoans = loans.filter(l => !isLoanOwing(l));

  const totalOutstanding = activeLoans.reduce((sum, l) => sum + getTrueOutstanding(l), 0);
  const totalPrincipal = loans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);

  const filteredLoans = loans.filter(l => {
    const matchesSearch = 
      l.loanId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.customerName && l.customerName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return isLoanOwing(l);
    if (statusFilter === 'due_today') return isLoanOwing(l) && l.status === 'due_today';
    if (statusFilter === 'overdue') return isLoanOwing(l) && l.status === 'overdue';
    if (statusFilter === 'completed') return !isLoanOwing(l);

    return true;
  });

  return (
    <div className="space-y-4 pb-24 lg:pb-8 animate-fade-in text-slate-800">
      
      {/* 1. Header Banner & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border-2 border-slate-200 shadow-sm">
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-black text-slate-950 truncate">Loan Portfolio Management</h1>
          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
            {activeLoans.length} active borrower{activeLoans.length === 1 ? '' : 's'} owing • {formatCurrency(totalOutstanding)} total active balance
          </p>
        </div>

        <button
          onClick={onOpenNewLoan}
          type="button"
          className="px-4 py-2.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-2xl shadow-md flex items-center gap-1.5 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Disburse New Loan</span>
        </button>
      </div>

      {/* 2. Top Summary Metrics Grid (4-Column on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Total Active Loans */}
        <div 
          onClick={() => setStatusFilter('active')}
          className={`p-3.5 sm:p-4 rounded-3xl border-2 cursor-pointer transition flex items-center justify-between ${
            statusFilter === 'active' 
              ? 'bg-blue-900 text-white border-blue-900 shadow-md' 
              : 'bg-white border-slate-200 hover:border-slate-400'
          }`}
        >
          <div>
            <div className={`text-[10px] sm:text-[11px] font-bold uppercase ${statusFilter === 'active' ? 'text-blue-200' : 'text-slate-400'}`}>
              Active Portfolio
            </div>
            <div className="text-lg sm:text-2xl font-black mt-0.5">
              {activeLoans.length} Loans
            </div>
            <div className={`text-[10px] font-bold truncate ${statusFilter === 'active' ? 'text-blue-200' : 'text-blue-700'}`}>
              {formatCurrency(totalOutstanding)}
            </div>
          </div>
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold ${
            statusFilter === 'active' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
          }`}>
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Due Today */}
        <div 
          onClick={() => setStatusFilter('due_today')}
          className={`p-3.5 sm:p-4 rounded-3xl border-2 cursor-pointer transition flex items-center justify-between ${
            statusFilter === 'due_today' 
              ? 'bg-sky-600 text-white border-sky-600 shadow-md' 
              : 'bg-white border-sky-200 hover:border-sky-400'
          }`}
        >
          <div>
            <div className={`text-[10px] sm:text-[11px] font-bold uppercase ${statusFilter === 'due_today' ? 'text-sky-100' : 'text-sky-700'}`}>
              Due Today
            </div>
            <div className="text-lg sm:text-2xl font-black mt-0.5">
              {dueTodayLoans.length}
            </div>
            <div className={`text-[10px] font-bold truncate ${statusFilter === 'due_today' ? 'text-sky-200' : 'text-slate-500'}`}>
              Ready to collect
            </div>
          </div>
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold ${
            statusFilter === 'due_today' ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-700'
          }`}>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Overdue */}
        <div 
          onClick={() => setStatusFilter('overdue')}
          className={`p-3.5 sm:p-4 rounded-3xl border-2 cursor-pointer transition flex items-center justify-between ${
            statusFilter === 'overdue' 
              ? 'bg-rose-600 text-white border-rose-600 shadow-md' 
              : 'bg-white border-rose-200 hover:border-rose-400'
          }`}
        >
          <div>
            <div className={`text-[10px] sm:text-[11px] font-bold uppercase ${statusFilter === 'overdue' ? 'text-rose-100' : 'text-rose-700'}`}>
              Overdue / Defaulters
            </div>
            <div className="text-lg sm:text-2xl font-black mt-0.5">
              {overdueLoans.length}
            </div>
            <div className={`text-[10px] font-bold truncate ${statusFilter === 'overdue' ? 'text-rose-200' : 'text-rose-600'}`}>
              Requires follow up
            </div>
          </div>
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold ${
            statusFilter === 'overdue' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-700'
          }`}>
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Paid Off History */}
        <div 
          onClick={() => setStatusFilter('completed')}
          className={`p-3.5 sm:p-4 rounded-3xl border-2 cursor-pointer transition flex items-center justify-between ${
            statusFilter === 'completed' 
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-md' 
              : 'bg-white border-emerald-200 hover:border-emerald-400'
          }`}
        >
          <div>
            <div className={`text-[10px] sm:text-[11px] font-bold uppercase ${statusFilter === 'completed' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              Paid Off History
            </div>
            <div className="text-lg sm:text-2xl font-black mt-0.5">
              {completedLoans.length}
            </div>
            <div className={`text-[10px] font-bold truncate ${statusFilter === 'completed' ? 'text-emerald-200' : 'text-slate-500'}`}>
              100% Cleared
            </div>
          </div>
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold ${
            statusFilter === 'completed' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
          }`}>
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

      </div>

      {/* 3. Search and Status Tabs */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by borrower name, Customer ID, or Loan ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-semibold pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white shadow-xs"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-black shrink-0">
          {[
            { id: 'active', label: 'Active Loans', count: activeLoans.length },
            { id: 'due_today', label: 'Due Today', count: dueTodayLoans.length },
            { id: 'overdue', label: 'Overdue', count: overdueLoans.length },
            { id: 'completed', label: 'Paid Off', count: completedLoans.length },
            { id: 'all', label: 'All Records', count: loans.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2.5 rounded-2xl transition shrink-0 flex items-center gap-1.5 border-2 ${
                statusFilter === tab.id
                  ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

      </div>

      {/* 4. Loan Cards Responsive Grid */}
      {filteredLoans.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Banknote className="w-7 h-7" />
          </div>
          <div className="text-base font-black text-slate-950">
            {statusFilter === 'active' 
              ? 'No active loans owing' 
              : statusFilter === 'completed'
              ? 'No paid off loans recorded'
              : 'No loans found'}
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {statusFilter === 'active'
              ? 'All borrowers are fully settled! Tap "+ Disburse New Loan" to create a new loan.'
              : 'Try adjusting your search query or switching filter tabs.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredLoans.map(loan => {
            const isCompleted = loan.status === 'completed' || (loan.outstandingBalance || 0) <= 0.01;
            const progress = isCompleted ? 100 : Math.min(100, Math.round((loan.totalPaid / loan.totalRepayment) * 100));

            return (
              <div
                key={loan.loanId}
                onClick={() => onSelectLoan(loan)}
                className={`bg-white rounded-3xl p-4 sm:p-5 border-2 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between gap-3.5 group overflow-hidden ${
                  isCompleted ? 'border-sky-200 hover:border-sky-400 bg-sky-50/20' :
                  loan.status === 'overdue' ? 'border-rose-300 hover:border-rose-500 bg-rose-50/20' :
                  loan.status === 'due_today' ? 'border-sky-300 hover:border-sky-500 bg-sky-50/30' :
                  'border-slate-200 hover:border-sky-400'
                }`}
              >
                {/* Top Row: Customer Name, Loan ID, Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-xs sm:text-sm font-black text-slate-950 group-hover:text-blue-700 transition truncate">
                        {loan.customerName || loan.customerId}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">({loan.loanId})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-medium truncate">
                      Lent {formatDate(loan.startDate)} • Due {formatDate(loan.maturityDate)}
                    </div>
                  </div>

                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shrink-0 shadow-xs ${
                    isCompleted ? 'bg-sky-600 text-white' :
                    loan.status === 'overdue' ? 'bg-rose-600 text-white' :
                    loan.status === 'due_today' ? 'bg-blue-600 text-white' :
                    'bg-slate-900 text-white'
                  }`}>
                    {isCompleted ? 'PAID OFF' : loan.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Middle Financial Summary */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Total to Pay</div>
                    <div className="font-black text-slate-900 text-sm mt-0.5">{formatCurrency(loan.totalRepayment)}</div>
                    <div className="text-[10px] text-slate-500">Principal: {formatCurrency(loan.principalAmount)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Balance Due</div>
                    <div className={`font-black text-sm mt-0.5 ${isCompleted ? 'text-emerald-600' : loan.status === 'overdue' ? 'text-rose-600' : 'text-slate-900'}`}>
                      {formatCurrency(loan.outstandingBalance)}
                    </div>
                    <div className="text-[10px] text-slate-500">Paid: {formatCurrency(loan.totalPaid)}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-500">Repayment Progress</span>
                    <span className={isCompleted ? 'text-emerald-700' : 'text-blue-700'}>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                        loan.status === 'overdue' ? 'bg-gradient-to-r from-amber-500 to-rose-500' :
                        'bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Row: Installment Details & Action Buttons */}
                <div 
                  className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[11px] text-slate-500 truncate">
                    <span>Inst: </span>
                    <strong className="text-slate-900 font-black">{formatCurrency(loan.installmentAmount)}</strong>
                    <span className="capitalize"> ({loan.repaymentFrequency})</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => onOpenRecordPayment(loan.loanId)}
                        className="px-3 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Collect</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectLoan(loan)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                      title="View Details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
