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
import { formatCurrency, formatDate, isLoanOwing, getTrueOutstanding } from '../../utils/formatters';
import { SMSService } from '../../services/smsService';
import { useAuth } from '../../context/AuthContext';

interface LoanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  schedules: RepaymentSchedule[];
  payments: Payment[];
  customer?: Customer;
  onOpenRecordPayment?: (loanId: string, installmentId?: number) => void;
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

  const isOwing = isLoanOwing(loan);
  const trueOutstanding = getTrueOutstanding(loan);

  const loanSchedules = schedules
    .filter(s => s.loanId === loan.loanId)
    .sort((a, b) => a.installmentNumber - b.installmentNumber);

  const loanPayments = payments.filter(p => p.loanId === loan.loanId);

  const progressPercent = isOwing 
    ? Math.min(99, Math.round(((loan.totalPaid || 0) / (loan.totalRepayment || 1)) * 100))
    : 100;

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
      <div className="w-full max-w-xl md:max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] border border-slate-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white flex items-center justify-between border-b border-sky-500/20">
          <div className="flex items-center gap-2 min-w-0">
            <button 
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition border border-white/15 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-sky-300" />
              <span>Back</span>
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-white flex items-center gap-1.5 truncate">
                <span>Loan {loan.loanId}</span>
                <span className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold shrink-0 ${
                  loan.status === 'active' ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30' :
                  loan.status === 'due_today' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' :
                  loan.status === 'overdue' ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30' :
                  loan.status === 'completed' ? 'bg-sky-400/20 text-sky-200 border border-sky-400/40' :
                  'bg-white/20 text-white'
                }`}>
                  {loan.status.replace('_', ' ')}
                </span>
              </h2>
              <p className="text-[11px] text-sky-300 font-medium truncate">
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
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950 via-indigo-950 to-slate-950 text-white space-y-2.5 border border-sky-500/30 shadow-md">
            <div className="flex justify-between items-end gap-2">
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Outstanding Balance</div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                  {formatCurrency(trueOutstanding)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Repaid</div>
                <div className="text-xs sm:text-sm font-black text-sky-300 truncate">
                  {formatCurrency(loan.totalPaid)} / {formatCurrency(loan.totalRepayment)}
                </div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div>
              <div className="h-2 w-full bg-white/15 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all duration-500"
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
              <div className="text-xs sm:text-sm font-black text-blue-700 mt-0.5 truncate">{formatCurrency(loan.totalInterest)}</div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
              <div className="text-[10px] font-bold text-slate-500 uppercase truncate">Installment</div>
              <div className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 truncate">{formatCurrency(loan.installmentAmount)}</div>
            </div>
          </div>

          {/* Repayment Schedules Breakdown */}
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Repayment Schedule</span>
              <span className="text-[10px] text-slate-500 font-bold">Due {formatDate(loan.maturityDate)}</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {loanSchedules.map(sched => (
                <div 
                  key={sched.installmentNumber}
                  className={`p-3 rounded-2xl border-2 flex items-center justify-between text-xs transition gap-2 ${
                    sched.status === 'paid' ? 'bg-slate-50 border-slate-200 opacity-60' :
                    sched.status === 'overdue' ? 'bg-rose-50 border-rose-300 shadow-xs' :
                    sched.status === 'due_today' ? 'bg-sky-50 border-sky-300 shadow-xs' :
                    'bg-white border-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-slate-900 flex items-center gap-1.5 truncate">
                      <span>Installment #{sched.installmentNumber}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase shrink-0 ${
                        sched.status === 'paid' ? 'bg-sky-100 text-blue-800' :
                        sched.status === 'overdue' ? 'bg-rose-600 text-white' :
                        sched.status === 'due_today' ? 'bg-blue-500 text-white' :
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
                      onClick={() => onOpenRecordPayment?.(loan.loanId, sched.id)}
                      className="px-3 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-[11px] font-black rounded-xl shadow-sm transition shrink-0"
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
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="text-xs font-black uppercase tracking-wider text-slate-700">
                Payment History ({loanPayments.length})
              </div>
              <div className="space-y-1.5">
                {loanPayments.map(p => (
                  <div 
                    key={p.paymentId}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center"
                  >
                    <div>
                      <span className="font-black text-slate-900">+{formatCurrency(p.amountPaid)}</span>
                      <span className="text-[10px] text-slate-500 uppercase ml-1.5">({p.paymentMethod})</span>
                      <div className="text-[10px] text-slate-400">{formatDate(p.paymentDate)}</div>
                    </div>
                    {p.referenceNumber && (
                      <div className="text-[10px] font-mono text-slate-500">
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
          {isOwing ? (
            <>
              {customer && (
                <button
                  type="button"
                  onClick={handleSendReminderSMS}
                  className="py-3 px-3.5 bg-sky-50 hover:bg-sky-100 text-blue-900 text-xs font-black rounded-xl border border-sky-300 transition flex items-center justify-center gap-1 active:scale-95 shrink-0"
                  title="Send Direct SMS Reminder"
                >
                  <MessageSquare className="w-4 h-4 text-blue-700" />
                  SMS Reminder
                </button>
              )}
              <button
                onClick={() => onOpenRecordPayment?.(loan.loanId)}
                className="flex-1 py-3 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <DollarSign className="w-4 h-4" /> Record Repayment
              </button>
            </>
          ) : (
            <div className="w-full py-3 bg-sky-50 text-blue-900 border border-sky-300 text-xs font-black rounded-xl text-center flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-700" /> This Loan is 100% Fully Settled (GH₵0.00 Outstanding)
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
