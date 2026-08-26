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
  DollarSign
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
    <div className="space-y-4 pb-24 animate-fade-in text-slate-800">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-black text-slate-950 truncate">Loan Portfolio</h1>
          <p className="text-xs text-slate-500 font-medium truncate">
            {activeLoans.length} active borrower{activeLoans.length === 1 ? '' : 's'} with loans to repay
          </p>
        </div>

        <button
          onClick={onOpenNewLoan}
          type="button"
          className="px-3.5 py-2 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Give Loan</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by borrower name, ID, or Loan ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 rounded-2xl border-2 border-sky-100 focus:border-sky-500 focus:outline-none bg-white shadow-xs"
        />
      </div>

      {/* Filter Tabs - Active Loans is first and default */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-black">
        {[
          { id: 'active', label: 'Active Loans', count: activeLoans.length },
          { id: 'due_today', label: 'Due Today', count: dueTodayLoans.length },
          { id: 'overdue', label: 'Overdue', count: overdueLoans.length },
          { id: 'completed', label: 'Paid Off History', count: completedLoans.length },
          { id: 'all', label: 'All Records', count: loans.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 border ${
              statusFilter === tab.id
                ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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

      {/* Loan Cards List */}
      {filteredLoans.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 space-y-2">
          <Banknote className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="text-xs font-bold text-slate-500">
            {statusFilter === 'active' 
              ? 'No active loans owing' 
              : statusFilter === 'completed'
              ? 'No paid off loans recorded'
              : 'No loans found'}
          </div>
          <p className="text-[11px] text-slate-400">
            {statusFilter === 'active'
              ? 'All borrowers are fully settled! Tap "Give Loan" to disburse a new loan.'
              : 'Try adjusting your search or filter tab.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLoans.map(loan => {
            const isCompleted = loan.status === 'completed' || (loan.outstandingBalance || 0) <= 0.01;
            const progress = isCompleted ? 100 : Math.min(100, Math.round((loan.totalPaid / loan.totalRepayment) * 100));

            return (
              <div
                key={loan.loanId}
                onClick={() => onSelectLoan(loan)}
                className={`bg-white rounded-2xl p-4 border-2 shadow-sm transition cursor-pointer space-y-3 group overflow-hidden ${
                  isCompleted ? 'border-sky-200 hover:border-sky-400 bg-sky-50/20' :
                  loan.status === 'overdue' ? 'border-rose-300 hover:border-rose-500 bg-rose-50/20' :
                  loan.status === 'due_today' ? 'border-sky-300 hover:border-sky-500 bg-sky-50/30' :
                  'border-sky-100 hover:border-sky-400'
                }`}
              >
                {/* Top Row: Customer Name, Loan ID, Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-xs font-black text-slate-950 group-hover:text-blue-700 transition truncate">
                        {loan.customerName || loan.customerId}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">({loan.loanId})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-medium truncate">
                      Lent {formatDate(loan.startDate)} • Due {formatDate(loan.maturityDate)}
                    </div>
                  </div>

                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shrink-0 shadow-xs ${
                    isCompleted ? 'bg-sky-600 text-white' :
                    loan.status === 'overdue' ? 'bg-rose-600 text-white' :
                    loan.status === 'due_today' ? 'bg-blue-500 text-white' :
                    'bg-blue-600 text-white'
                  }`}>
                    {isCompleted ? 'PAID OFF' : loan.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Middle Row: Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-600 font-bold gap-2">
                    <span className="truncate">Paid: <strong className="text-blue-700 font-black">{formatCurrency(loan.totalPaid)}</strong></span>
                    <span className="truncate text-right">Expected: <strong className="text-slate-950 font-black">{formatCurrency(loan.totalRepayment)}</strong></span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden p-0.5 border border-slate-200">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-sky-500' :
                        loan.status === 'overdue' ? 'bg-rose-500' :
                        'bg-gradient-to-r from-sky-400 to-blue-600'
                      }`} 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Row: Balances & Pay Action */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 font-black uppercase block truncate">Outstanding Balance</span>
                    <div className={`font-black text-sm truncate ${isCompleted ? 'text-sky-700' : 'text-slate-950'}`}>
                      {isCompleted ? 'GH₵0.00 (Settled)' : formatCurrency(loan.outstandingBalance)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!isCompleted && (
                      <button
                        onClick={() => onOpenRecordPayment(loan.loanId)}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition"
                      >
                        Record Pay
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition" />
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
