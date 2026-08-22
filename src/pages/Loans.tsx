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
    <div className="space-y-4 pb-24 animate-fade-in">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-black text-navy-950">Loan Portfolio</h1>
          <p className="text-xs text-slate-500 font-medium">{activeLoans.length} active microloans</p>
        </div>

        <button
          onClick={onOpenNewLoan}
          type="button"
          className="px-3.5 py-2 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 active:scale-95 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" /> Issue Loan
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search Loan ID, customer name or BFL ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs font-semibold pl-9 pr-4 py-2.5 bg-white rounded-2xl border-2 border-slate-200 shadow-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: `All (${loans.length})`, activeBg: 'bg-navy-950 text-white' },
          { id: 'active', label: `Active (${activeLoans.length})`, activeBg: 'bg-blue-700 text-white' },
          { id: 'due_today', label: `Due Today (${dueTodayLoans.length})`, activeBg: 'bg-amber-600 text-white' },
          { id: 'overdue', label: `Overdue (${overdueLoans.length})`, activeBg: 'bg-rose-700 text-white' },
          { id: 'completed', label: `Completed (${completedLoans.length})`, activeBg: 'bg-emerald-700 text-white' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition border ${
              statusFilter === tab.id
                ? `${tab.activeBg} shadow-md border-transparent`
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loans List */}
      {filteredLoans.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Banknote className="w-6 h-6" />
          </div>
          <div className="text-sm font-black text-navy-950">No loans found</div>
          <div className="text-xs text-slate-400 max-w-xs mx-auto">
            {searchTerm ? `No loans match "${searchTerm}"` : 'No loans under this filter category.'}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLoans.map(loan => {
            const progress = Math.min(100, Math.round((loan.totalPaid / loan.totalRepayment) * 100));

            return (
              <div
                key={loan.loanId}
                onClick={() => onSelectLoan(loan)}
                className={`bg-white rounded-2xl p-4 border-2 shadow-sm transition cursor-pointer space-y-3 group ${
                  loan.status === 'overdue' ? 'border-rose-300 hover:border-rose-500 bg-rose-50/20' :
                  loan.status === 'due_today' ? 'border-amber-300 hover:border-amber-500 bg-amber-50/20' :
                  loan.status === 'completed' ? 'border-emerald-200 hover:border-emerald-400' :
                  'border-slate-200 hover:border-blue-500'
                }`}
              >
                {/* Top Row: Customer Name, Loan ID, Status Badge */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-navy-950 group-hover:text-blue-700 transition">
                        {loan.customerName || loan.customerId}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-500">({loan.loanId})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                      Lent {formatDate(loan.startDate)} • {loan.durationValue} {loan.durationUnit} ({loan.repaymentFrequency})
                    </div>
                  </div>

                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shrink-0 shadow-xs ${
                    loan.status === 'completed' ? 'bg-emerald-600 text-white' :
                    loan.status === 'overdue' ? 'bg-rose-600 text-white animate-pulse' :
                    loan.status === 'due_today' ? 'bg-amber-500 text-white' :
                    'bg-blue-600 text-white'
                  }`}>
                    {loan.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Middle Row: Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-600 font-bold">
                    <span>Paid: <strong className="text-emerald-700 font-black">{formatCurrency(loan.totalPaid)}</strong></span>
                    <span>Expected: <strong className="text-navy-950 font-black">{formatCurrency(loan.totalRepayment)}</strong></span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden p-0.5 border border-slate-200">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        loan.status === 'completed' ? 'bg-emerald-500' :
                        loan.status === 'overdue' ? 'bg-rose-500' :
                        'bg-blue-600'
                      }`} 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Row: Balances & Pay Action */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase">Outstanding Balance</span>
                    <div className="font-black text-navy-950 text-sm">{formatCurrency(loan.outstandingBalance)}</div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {loan.status !== 'completed' && (
                      <button
                        onClick={() => onOpenRecordPayment(loan.loanId)}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition"
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
