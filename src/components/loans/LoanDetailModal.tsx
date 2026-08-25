import React from 'react';
import { Loan, RepaymentSchedule, Payment, Customer } from '../../types';
import { 
  X, 
  Banknote, 
  Calendar, 
  DollarSign, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Percent, 
  Layers, 
  ArrowLeft, 
  MessageSquare, 
  Phone, 
  Check, 
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { SMSService } from '../../services/smsService';
import { useAuth } from '../../context/AuthContext';

interface LoanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  schedules: RepaymentSchedule[];
  payments: Payment[];
  customer?: Customer;
  onOpenRecordPayment: (loanId: string, scheduleId?: number) => void;
}

export const LoanDetailModal: React.FC<LoanDetailModalProps> = ({
  isOpen,
  onClose,
  loan,
  schedules,
  payments,
  customer,
  onOpenRecordPayment
}) => {
  const { settings } = useAuth();

  if (!isOpen || !loan) return null;

  const loanSchedules = schedules
    .filter(s => s.loanId === loan.loanId)
    .sort((a, b) => a.installmentNumber - b.installmentNumber);

  const loanPayments = payments.filter(p => p.loanId === loan.loanId);

  const progressPercent = Math.min(
    100,
    Math.round((loan.totalPaid / loan.totalRepayment) * 100)
  );

  const handleSendReminderSMS = () => {
    if (!customer) return;
    const isOverdue = loan.status === 'overdue';
    const nextSched = loanSchedules.find(s => s.status !== 'paid');
    
    let text = '';
    if (isOverdue) {
      text = SMSService.generateOverdueSMS({
        customer,
        loan,
        businessName: settings?.businessName,
        businessPhone: settings?.businessPhone
      });
    } else {
      text = SMSService.generateDueReminderSMS({
        customer,
        loan,
        schedule: nextSched || loanSchedules[0],
        businessName: settings?.businessName,
        businessPhone: settings?.businessPhone
      });
    }

    SMSService.dispatchSMS(customer.primaryPhone, text, settings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3.5 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] border border-slate-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 text-white flex items-center justify-between border-b border-emerald-500/20">
          <div className="flex items-center gap-2 min-w-0">
            <button 
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition border border-white/15 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-300" />
              <span>Back</span>
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-white flex items-center gap-1.5 truncate">
                <span>Loan {loan.loanId}</span>
                <span className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold shrink-0 ${
                  loan.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' :
                  loan.status === 'due_today' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' :
                  loan.status === 'overdue' ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30' :
                  loan.status === 'completed' ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/40' :
                  'bg-white/20 text-white'
                }`}>
                  {loan.status.replace('_', ' ')}
                </span>
              </h2>
              <p className="text-[11px] text-emerald-300 font-medium truncate">
                {loan.customerName}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-slate-800">
          
          {/* Progress Bar & Repayment Metric Header */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white space-y-2.5 border border-emerald-500/30 shadow-md">
            <div className="flex justify-between items-end gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Outstanding Balance</div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                  {formatCurrency(loan.outstandingBalance)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Repaid</div>
                <div className="text-xs sm:text-sm font-black text-emerald-400 truncate">
                  {formatCurrency(loan.totalPaid)} / {formatCurrency(loan.totalRepayment)}
                </div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div>
              <div className="h-2 w-full bg-white/15 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                <span>{progressPercent}% Complete</span>
                <span>{loanSchedules.filter(s => s.status === 'paid').length} of {loan.totalInstallments} Installments Paid</span>
              </div>
            </div>
          </div>

          {/* Key Loan Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
              <div className="text-[10px] font-bold text-slate-500 uppercase truncate">Principal</div>
              <div className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 truncate">{formatCurrency(loan.principalAmount)}</div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
              <div className="text-[10px] font-bold text-slate-500 uppercase truncate">Interest ({loan.interestRate}%)</div>
              <div className="text-xs sm:text-sm font-black text-emerald-700 mt-0.5 truncate">{formatCurrency(loan.totalInterest)}</div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
              <div className="text-[10px] font-bold text-slate-500 uppercase truncate">Installment</div>
              <div className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 truncate">{formatCurrency(loan.installmentAmount)}</div>
            </div>
          </div>

          {/* Repayment Schedules Breakdown */}
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Repayment Schedule ({loanSchedules.length} Installments)</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">{loan.repaymentFrequency}</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {loanSchedules.map(sched => (
                <div 
                  key={sched.installmentNumber}
                  className={`p-3 rounded-2xl border-2 flex items-center justify-between text-xs transition gap-2 ${
                    sched.status === 'paid' ? 'bg-slate-50 border-slate-200 opacity-60' :
                    sched.status === 'overdue' ? 'bg-rose-50 border-rose-300 shadow-xs' :
                    sched.status === 'due_today' ? 'bg-amber-50 border-amber-300 shadow-xs' :
                    'bg-white border-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-slate-900 flex items-center gap-1.5 truncate">
                      <span>Installment #{sched.installmentNumber}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase shrink-0 ${
                        sched.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                        sched.status === 'overdue' ? 'bg-rose-600 text-white' :
                        sched.status === 'due_today' ? 'bg-amber-500 text-white' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {sched.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      Due: <strong className="text-slate-900">{formatDate(sched.dueDate)}</strong> • Amount: <strong className="text-slate-900">{formatCurrency(sched.expectedAmount)}</strong>
                    </div>
                  </div>

                  {sched.status !== 'paid' && (
                    <button
                      onClick={() => onOpenRecordPayment(loan.loanId, sched.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-black rounded-xl shadow-sm transition shrink-0"
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
              <div className="text-xs font-black uppercase tracking-wider text-slate-700">
                Payment Collections History ({loanPayments.length})
              </div>
              <div className="space-y-1.5">
                {loanPayments.map(p => (
                  <div key={p.paymentId} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 truncate">{formatCurrency(p.amountPaid)} ({p.paymentMethod.toUpperCase()})</div>
                      <div className="text-[10px] text-slate-500 truncate">{formatDate(p.paymentDate)} • {p.paymentId}</div>
                    </div>
                    {p.referenceNumber && (
                      <div className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded shrink-0 truncate max-w-[120px]">
                        Ref: {p.referenceNumber}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer with SMS Reminder & Record Repayment */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
          {loan.status !== 'completed' ? (
            <>
              {customer && (
                <button
                  type="button"
                  onClick={handleSendReminderSMS}
                  className="py-3 px-3.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-black rounded-xl border border-emerald-300 transition flex items-center justify-center gap-1 active:scale-95 shrink-0"
                  title="Send Direct SMS Reminder"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-700" />
                  SMS Reminder
                </button>
              )}
              <button
                onClick={() => onOpenRecordPayment(loan.loanId)}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <DollarSign className="w-4 h-4" /> Record Repayment
              </button>
            </>
          ) : (
            <div className="w-full py-3 bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black rounded-xl text-center flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" /> This Loan is 100% Fully Settled
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
