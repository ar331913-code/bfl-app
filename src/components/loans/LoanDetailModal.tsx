import React from 'react';
import { Loan, RepaymentSchedule, Payment, Customer } from '../../types';
import { 
  X, 
  Banknote, 
  Calendar, 
  User, 
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
  Send
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
        schedule: nextSched,
        businessName: settings?.businessName,
        businessPhone: settings?.businessPhone
      });
    }

    SMSService.sendSMS(customer.primaryPhone, text);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/85 backdrop-blur-sm p-3.5 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] border border-slate-200">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white relative border-b border-sky-400/30">
          
          {/* Top Bar with Back Arrow & Close */}
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold transition border border-white/20"
            >
              <ArrowLeft className="w-4 h-4 text-sky-200" />
              <span>Back</span>
            </button>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-full text-sky-200 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-black text-amber-200 bg-amber-400/20 px-2.5 py-0.5 rounded-lg border border-amber-400/30">
              {loan.loanId}
            </span>
            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shadow-sm ${
              loan.status === 'completed' ? 'bg-emerald-500 text-white' :
              loan.status === 'overdue' ? 'bg-rose-600 text-white animate-pulse' :
              loan.status === 'due_today' ? 'bg-amber-500 text-white' :
              'bg-blue-800 text-white'
            }`}>
              {loan.status.replace('_', ' ')}
            </span>
          </div>

          <h2 className="text-lg font-black text-white tracking-tight">
            {loan.customerName || loan.customerId}
          </h2>
          <p className="text-xs text-sky-100 mt-0.5">
            Lent: <strong className="text-white">{formatCurrency(loan.principalAmount)}</strong> • Total: <strong className="text-cyan-200">{formatCurrency(loan.totalRepayment)}</strong>
          </p>

          {/* Repayment Progress Bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-[11px] font-bold text-sky-100">
              <span>Repayment Progress</span>
              <span className="text-cyan-200 font-black">{progressPercent}% Paid</span>
            </div>
            <div className="w-full bg-navy-950/40 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/20">
              <div 
                className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Financial Breakdown Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-sky-50 border-2 border-sky-200 rounded-2xl">
              <div className="text-[10px] text-sky-800 font-black uppercase">Principal Lent</div>
              <div className="text-xs font-black text-navy-950 mt-0.5">{formatCurrency(loan.principalAmount)}</div>
            </div>

            <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-2xl">
              <div className="text-[10px] text-blue-800 font-black uppercase">Interest & Fees</div>
              <div className="text-xs font-black text-blue-950 mt-0.5">
                +{formatCurrency(loan.totalInterest + loan.processingFee)} ({loan.interestRate}%)
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

          {/* Late Penalty Notice if applied */}
          {loan.totalPenalties > 0 && (
            <div className="p-3 bg-rose-50 border-2 border-rose-200 rounded-2xl text-rose-900 text-xs flex items-center justify-between">
              <div>
                <span className="font-black text-rose-700 block">Late Payment Fees Applied:</span>
                <span className="text-[11px] text-rose-600">GH₵{loan.totalPenalties.toFixed(2)} added due to overdue default</span>
              </div>
              <span className="text-xs font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-300">
                +GH₵{loan.totalPenalties.toFixed(2)}
              </span>
            </div>
          )}

          {/* Schedule Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Repayment Schedule ({loanSchedules.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                Matures: {formatDate(loan.maturityDate)}
              </span>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {loanSchedules.map(sched => (
                <div
                  key={sched.installmentNumber}
                  className={`p-3 rounded-2xl border-2 flex items-center justify-between text-xs transition ${
                    sched.status === 'paid' ? 'bg-slate-50 border-slate-200 opacity-60' :
                    sched.status === 'overdue' ? 'bg-rose-50 border-rose-300 shadow-xs' :
                    sched.status === 'due_today' ? 'bg-amber-50 border-amber-300 shadow-xs' :
                    'bg-white border-slate-200'
                  }`}
                >
                  <div>
                    <div className="font-black text-navy-950 flex items-center gap-1.5">
                      <span>Installment #{sched.installmentNumber}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                        sched.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                        sched.status === 'overdue' ? 'bg-rose-600 text-white' :
                        sched.status === 'due_today' ? 'bg-amber-500 text-white' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {sched.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Due: <strong className="text-navy-900">{formatDate(sched.dueDate)}</strong> • Amount: <strong>{formatCurrency(sched.expectedAmount)}</strong>
                      {sched.penaltyAmount ? <span className="text-rose-600 font-bold ml-1">(+GH₵{sched.penaltyAmount} late fee)</span> : null}
                    </div>
                  </div>

                  {sched.status !== 'paid' && (
                    <button
                      onClick={() => onOpenRecordPayment(loan.loanId, sched.id)}
                      className="px-3 py-1.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-[11px] font-black rounded-xl shadow-sm transition shrink-0"
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

        {/* Footer with SMS Reminder & Record Repayment */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
          {loan.status !== 'completed' ? (
            <>
              {customer && (
                <button
                  type="button"
                  onClick={handleSendReminderSMS}
                  className="py-3 px-3.5 bg-sky-100 hover:bg-sky-200 text-sky-900 text-xs font-black rounded-xl border border-sky-300 transition flex items-center justify-center gap-1 active:scale-95 shrink-0"
                  title="Send Direct SMS Reminder"
                >
                  <MessageSquare className="w-4 h-4 text-sky-700" />
                  SMS Reminder
                </button>
              )}
              <button
                onClick={() => onOpenRecordPayment(loan.loanId)}
                className="flex-1 py-3 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <DollarSign className="w-4 h-4" /> Record Repayment
              </button>
            </>
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
