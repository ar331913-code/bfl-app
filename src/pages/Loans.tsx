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
import { formatCurrency, formatDate } from '../utils/formatters';

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
  initialFilter = 'all',
  onSelectLoan,
  onOpenNewLoan,
  onOpenRecordPayment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);

  const activeLoans = loans.filter(l => l.status !== 'completed' && l.status !== 'defaulted');
  const dueTodayLoans = loans.filter(l => l.status === 'due_today');
  const overdueLoans = loans.filter(l => l.status === 'overdue');
  const completedLoans = loans.filter(l => l.status === 'completed');

  const filteredLoans = loans.filter(l => {
    const matchesSearch = 
      l.loanId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.customerName && l.customerName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return l.status !== 'completed' && l.status !== 'defaulted';
    if (statusFilter === 'due_today') return l.status === 'due_today';
    if (statusFilter === 'overdue') return l.status === 'overdue';
    if (statusFilter === 'completed') return l.status === 'completed';

    return true;
  });

  return (
    <div className="space-y-4 pb-24 animate-fade-in text-slate-800">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-black text-slate-950 truncate">Loan Portfolio</h1>
          <p className="text-xs text-slate-500 font-medium truncate">{activeLoans.length} active microloans</p>
        </div>

        <button
          onClick={onOpenNewLoan}
          type="button"
          className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Give Loan</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by borrower name, ID, or Loan ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white shadow-xs"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-black">
        {[
          { id: 'all', label: 'All', count: loans.length },
          { id: 'active', label: 'Active', count: activeLoans.length },
          { id: 'due_today', label: 'Due Today', count: dueTodayLoans.length },
          { id: 'overdue', label: 'Overdue', count: overdueLoans.length },
          { id: 'completed', label: 'Paid Off', count: completedLoans.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 border ${
              statusFilter === tab.id
                ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
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
          <div className="text-xs font-bold text-slate-500">No loans found</div>
          <p className="text-[11px] text-slate-400">Try adjusting your search or issue a new loan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLoans.map(loan => {
            const progress = Math.min(100, Math.round((loan.totalPaid / loan.totalRepayment) * 100));

            return (
              <div
                key={loan.loanId}
                onClick={() => onSelectLoan(loan)}
                className={`bg-white rounded-2xl p-4 border-2 shadow-sm transition cursor-pointer space-y-3 group overflow-hidden ${
                  loan.status === 'overdue' ? 'border-rose-300 hover:border-rose-500 bg-rose-50/20' :
                  loan.status === 'due_today' ? 'border-amber-300 hover:border-amber-500 bg-amber-50/20' :
                  loan.status === 'completed' ? 'border-emerald-200 hover:border-emerald-400' :
                  'border-slate-200 hover:border-emerald-500'
                }`}
              >
                {/* Top Row: Customer Name, Loan ID, Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-xs font-black text-slate-950 group-hover:text-emerald-700 transition truncate">
                        {loan.customerName || loan.customerId}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">({loan.loanId})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-medium truncate">
                      Lent {formatDate(loan.startDate)} • {loan.durationValue} {loan.durationUnit} ({loan.repaymentFrequency})
                    </div>
                  </div>

                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shrink-0 shadow-xs ${
                    loan.status === 'completed' ? 'bg-emerald-600 text-white' :
                    loan.status === 'overdue' ? 'bg-rose-600 text-white' :
                    loan.status === 'due_today' ? 'bg-amber-500 text-white' :
                    'bg-emerald-700 text-white'
                  }`}>
                    {loan.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Middle Row: Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-600 font-bold gap-2">
                    <span className="truncate">Paid: <strong className="text-emerald-700 font-black">{formatCurrency(loan.totalPaid)}</strong></span>
                    <span className="truncate text-right">Expected: <strong className="text-slate-950 font-black">{formatCurrency(loan.totalRepayment)}</strong></span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden p-0.5 border border-slate-200">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        loan.status === 'completed' ? 'bg-emerald-500' :
                        loan.status === 'overdue' ? 'bg-rose-500' :
                        'bg-emerald-600'
                      }`} 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Row: Balances & Pay Action */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 font-black uppercase block truncate">Outstanding Balance</span>
                    <div className="font-black text-slate-950 text-sm truncate">{formatCurrency(loan.outstandingBalance)}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {loan.status !== 'completed' && (
                      <button
                        onClick={() => onOpenRecordPayment(loan.loanId)}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition"
                      >
                        Record Pay
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition" />
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
