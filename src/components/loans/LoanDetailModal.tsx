import React from 'react';
import { Customer, Loan, RepaymentSchedule, Payment } from '../../types';
import { 
  X, 
  ArrowLeft,
  Banknote, 
  Calendar, 
  Receipt, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Download, 
  DollarSign, 
  Layers
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { generateLoanStatementPDF } from '../../services/exportService';

interface LoanDetailModalProps {
  loan: Loan | null;
  customer?: Customer;
  schedules: RepaymentSchedule[];
  payments: Payment[];
  isOpen: boolean;
  onClose: () => void;
  onOpenRecordPayment: (loanId: string, installmentId?: number) => void;
}

export const LoanDetailModal: React.FC<LoanDetailModalProps> = ({
  loan,
  customer,
  schedules,
  payments,
  isOpen,
  onClose,
  onOpenRecordPayment
}) => {
  if (!isOpen || !loan) return null;

  const loanSchedules = schedules
    .filter(s => s.loanId === loan.loanId)
    .sort((a, b) => a.installmentNumber - b.installmentNumber);

  const loanPayments = payments.filter(p => p.loanId === loan.loanId);

  const progressPercent = Math.min(100, Math.round((loan.totalPaid / loan.totalRepayment) * 100));

  const handleDownloadStatement = () => {
    if (customer) {
      generateLoanStatementPDF(customer, loan, loanSchedules, loanPayments);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/85 backdrop-blur-sm p-3.5 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] border border-slate-200">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-blue-950 text-white p-5 relative border-b border-navy-800">
          
          {/* Top Bar with Back Arrow & Close */}
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>Back</span>
            </button>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-full text-navy-300 hover:text-white hover:bg-navy-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-black text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-lg border border-amber-400/30">
              {loan.loanId}
            </span>
            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shadow-sm ${
              loan.status === 'completed' ? 'bg-emerald-500 text-white' :
              loan.status === 'overdue' ? 'bg-rose-600 text-white animate-pulse' :
              loan.status === 'due_today' ? 'bg-amber-500 text-white' :
              'bg-blue-600 text-white'
            }`}>
              {loan.status.replace('_', ' ')}
            </span>
          </div>

          <h2 className="text-lg font-black text-white tracking-tight">
            {loan.customerName || loan.customerId}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Lent: <strong className="text-white">{formatCurrency(loan.principalAmount)}</strong> • Total: <strong className="text-emerald-300">{formatCurrency(loan.totalRepayment)}</strong>
          </p>

          {/* Progress Bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold text-slate-200">
              <span>Repayment Progress</span>
              <span className="text-emerald-400 font-black">{progressPercent}% Paid</span>
            </div>
            <div className="w-full bg-navy-950/80 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10">
              <div 
                className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full rounded-full transition-all duration-500 shadow-sm" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Financial Breakdown Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-2xl">
              <div className="text-[10px] text-blue-800 font-black uppercase">Principal Lent</div>
              <div className="text-xs font-black text-blue-950 mt-0.5">{formatCurrency(loan.principalAmount)}</div>
            </div>

            <div className="p-3 bg-purple-50 border-2 border-purple-200 rounded-2xl">
              <div className="text-[10px] text-purple-800 font-black uppercase">Interest & Fees</div>
              <div className="text-xs font-black text-purple-950 mt-0.5">
                {formatCurrency(loan.totalInterest + loan.processingFee)} ({loan.interestRate}%)
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border-2 border-emerald-200 rounded-2xl">
              <div className="text-[10px] text-emerald-800 font-black uppercase">Total Repaid</div>
              <div className="text-xs font-black text-emerald-950 mt-0.5">{formatCurrency(loan.totalPaid)}</div>
            </div>

            <div className="p-3 bg-amber-50 border-2 border-amber-200 rounded-2xl">
              <div className="text-[10px] text-amber-800 font-black uppercase">Outstanding Balance</div>
              <div className="text-xs font-black text-amber-950 mt-0.5">{formatCurrency(loan.outstandingBalance)}</div>
            </div>
          </div>

          {/* Schedule Installments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black uppercase tracking-wider text-slate-600">
                Repayment Schedule ({loanSchedules.length} installments)
              </div>
              <button
                onClick={handleDownloadStatement}
                disabled={!customer}
                className="text-xs font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition"
                title="Download PDF Loan Statement"
              >
                <Download className="w-3.5 h-3.5" /> PDF Statement
              </button>
            </div>

            <div className="space-y-2">
              {loanSchedules.map(sched => (
                <div
                  key={sched.installmentNumber}
                  className={`p-3 rounded-2xl border-2 transition flex items-center justify-between shadow-xs ${
                    sched.status === 'paid' 
                      ? 'bg-slate-50 border-slate-200 opacity-85' 
                      : sched.status === 'overdue'
                      ? 'bg-rose-50 border-rose-300 shadow-sm'
                      : sched.status === 'due_today'
                      ? 'bg-amber-50 border-amber-300 shadow-sm'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
                      sched.status === 'paid' ? 'bg-emerald-600 text-white' :
                      sched.status === 'overdue' ? 'bg-rose-600 text-white' :
                      sched.status === 'due_today' ? 'bg-amber-500 text-white' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      #{sched.installmentNumber}
                    </div>

                    <div>
                      <div className="text-xs font-black text-navy-950 flex items-center gap-1.5">
                        {formatCurrency(sched.expectedAmount)}
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                          sched.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                          sched.status === 'overdue' ? 'bg-rose-100 text-rose-800' :
                          sched.status === 'due_today' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {sched.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Due: {formatDate(sched.dueDate)}
                        {sched.amountPaid > 0 && ` • Paid: ${formatCurrency(sched.amountPaid)}`}
                      </div>
                    </div>
                  </div>

                  {sched.status !== 'paid' && (
                    <button
                      onClick={() => onOpenRecordPayment(loan.loanId, sched.id)}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white text-[11px] font-black rounded-xl shadow-sm transition shrink-0"
                    >
                      Pay Inst.
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment History for this Loan */}
          {loanPayments.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-black uppercase tracking-wider text-slate-600">
                Payment Collections History ({loanPayments.length})
              </div>
              <div className="space-y-1.5">
                {loanPayments.map(p => (
                  <div key={p.paymentId} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between text-xs">
                    <div>
                      <div className="font-bold text-navy-950">{formatCurrency(p.amountPaid)} ({p.paymentMethod.toUpperCase()})</div>
                      <div className="text-[10px] text-slate-500">{formatDate(p.paymentDate)} • {p.paymentId}</div>
                    </div>
                    {p.referenceNumber && (
                      <div className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded self-center">
                        Ref: {p.referenceNumber}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
          {loan.status !== 'completed' ? (
            <button
              onClick={() => onOpenRecordPayment(loan.loanId)}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
            >
              <DollarSign className="w-4 h-4" /> Record Repayment
            </button>
          ) : (
            <div className="w-full py-2.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black rounded-xl text-center flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" /> This Loan is 100% Fully Settled
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
