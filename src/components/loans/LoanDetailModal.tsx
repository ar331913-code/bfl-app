import React, { useState } from 'react';
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
  CreditCard,
  Edit3,
  CalendarDays,
  Save
} from 'lucide-react';
import { formatCurrency, formatDate, isLoanOwing, getTrueOutstanding } from '../../utils/formatters';
import { SMSService } from '../../services/smsService';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db';
import { CloudSyncService } from '../../services/cloudSyncService';
import { checkAndUpdateLoanStatusesAndAlerts } from '../../services/notificationService';

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
  const [editingSchedId, setEditingSchedId] = useState<number | null>(null);
  const [editingDueDate, setEditingDueDate] = useState<string>('');
  const [isEditingMaturityDate, setIsEditingMaturityDate] = useState<boolean>(false);
  const [customMaturityDate, setCustomMaturityDate] = useState<string>('');
  const [dateUpdateFeedback, setDateUpdateFeedback] = useState<string>('');

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
      text = SMSService.generateBalanceReminderSMS({
        customer,
        loan,
        totalBalance: trueOutstanding,
        dueDate: nextSched?.dueDate || loan.maturityDate || loan.firstRepaymentDate,
        businessName: settings?.businessName,
        businessPhone: settings?.businessPhone
      });
    }

    SMSService.dispatchSMS(customer.primaryPhone, text, settings);
  };

  const handleSendPaymentReceiptSMS = (payment: Payment) => {
    if (!customer) return;
    const text = SMSService.generatePaymentReceiptSMS({
      customer,
      loan,
      payment,
      businessName: settings?.businessName,
      businessPhone: settings?.businessPhone
    });
    SMSService.dispatchSMS(customer.primaryPhone, text, settings);
  };

  const handleSaveInstallmentDate = async (schedId: number) => {
    if (!editingDueDate) {
      setEditingSchedId(null);
      return;
    }
    try {
      await db.repaymentSchedules.update(schedId, {
        dueDate: editingDueDate
      });

      const targetSched = schedules.find(s => s.id === schedId);
      if (targetSched && targetSched.installmentNumber === loan.totalInstallments) {
        await db.loans.update(loan.id!, {
          maturityDate: editingDueDate,
          updatedAt: new Date().toISOString()
        });
      } else if (targetSched && targetSched.installmentNumber === 1) {
        await db.loans.update(loan.id!, {
          firstRepaymentDate: editingDueDate,
          updatedAt: new Date().toISOString()
        });
      }

      await checkAndUpdateLoanStatusesAndAlerts();
      CloudSyncService.triggerBackgroundSync();

      setDateUpdateFeedback(`Installment #${targetSched?.installmentNumber} due date changed to ${formatDate(editingDueDate)}!`);
      setTimeout(() => setDateUpdateFeedback(''), 3500);
      setEditingSchedId(null);
      setEditingDueDate('');
    } catch (err) {
      console.error('Failed to update repayment date:', err);
    }
  };

  const handleSaveOverallMaturityDate = async () => {
    if (!customMaturityDate) {
      setIsEditingMaturityDate(false);
      return;
    }
    try {
      await db.loans.update(loan.id!, {
        maturityDate: customMaturityDate,
        updatedAt: new Date().toISOString()
      });

      const lastSched = loanSchedules[loanSchedules.length - 1];
      if (lastSched && lastSched.id) {
        await db.repaymentSchedules.update(lastSched.id, {
          dueDate: customMaturityDate
        });
      }

      await checkAndUpdateLoanStatusesAndAlerts();
      CloudSyncService.triggerBackgroundSync();

      setDateUpdateFeedback(`Loan maturity date changed to ${formatDate(customMaturityDate)}!`);
      setTimeout(() => setDateUpdateFeedback(''), 3500);
      setIsEditingMaturityDate(false);
    } catch (err) {
      console.error('Failed to update overall maturity date:', err);
    }
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

          {/* Repayment Schedules Breakdown & Calendar Date Editor */}
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between flex-wrap gap-1.5">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                <span>Repayment Schedule</span>
              </span>
              
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingMaturityDate(!isEditingMaturityDate);
                    setCustomMaturityDate(loan.maturityDate || '');
                  }}
                  className="px-2 py-1 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded-lg text-[10px] font-black transition flex items-center gap-1"
                  title="Change final loan due date"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{isEditingMaturityDate ? 'Close Due Date' : 'Edit Loan Due Date'}</span>
                </button>
                <span className="text-[10px] text-slate-500 font-bold">Due {formatDate(loan.maturityDate)}</span>
              </div>
            </div>

            {/* Overall Loan Due Date Editor */}
            {isEditingMaturityDate && (
              <div className="p-3 bg-sky-50 border-2 border-sky-300 rounded-2xl flex items-center justify-between gap-2 animate-fade-in text-xs">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-[11px] font-black text-sky-950 whitespace-nowrap">New Maturity Date:</label>
                  <input
                    type="date"
                    value={customMaturityDate}
                    onChange={(e) => setCustomMaturityDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border-2 border-sky-400 bg-white text-slate-950 font-black text-xs focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleSaveOverallMaturityDate}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-black text-[11px] flex items-center gap-1 shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Date</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingMaturityDate(false)}
                    className="p-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {dateUpdateFeedback && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold animate-fade-in flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{dateUpdateFeedback}</span>
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {loanSchedules.map(sched => {
                const isEditingThis = editingSchedId === sched.id;

                return (
                  <div 
                    key={sched.installmentNumber}
                    className={`p-3 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs transition gap-2 ${
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

                      {/* Due Date & Inline Date Editor */}
                      {isEditingThis ? (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <label className="text-[10px] font-bold text-slate-600">New Due Date:</label>
                          <input
                            type="date"
                            value={editingDueDate}
                            onChange={(e) => setEditingDueDate(e.target.value)}
                            className="px-2 py-1 rounded-lg border-2 border-blue-500 text-xs font-bold bg-white focus:outline-none text-slate-950"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveInstallmentDate(sched.id!)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Save</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSchedId(null);
                              setEditingDueDate('');
                            }}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>
                            Due: <strong className="text-slate-900 font-bold">{formatDate(sched.dueDate)}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Amount: <strong className="text-slate-900 font-bold">{formatCurrency(sched.expectedAmount)}</strong>
                          </span>
                          
                          {/* Inline Calendar Edit Trigger */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSchedId(sched.id!);
                              setEditingDueDate(sched.dueDate || '');
                            }}
                            className="text-[10px] text-blue-700 hover:text-blue-900 font-black flex items-center gap-0.5 underline"
                            title="Edit installment date with calendar"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Change Date</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {sched.status !== 'paid' && !isEditingThis && (
                      <button
                        onClick={() => onOpenRecordPayment?.(loan.loanId, sched.id)}
                        className="px-3 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-[11px] font-black rounded-xl shadow-sm transition shrink-0 self-end sm:self-auto"
                      >
                        Pay Inst.
                      </button>
                    )}
                  </div>
                );
              })}
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
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-black text-slate-900">+{formatCurrency(p.amountPaid)}</span>
                      <span className="text-[10px] text-slate-500 uppercase ml-1.5">({p.paymentMethod})</span>
                      <div className="text-[10px] text-slate-400">{formatDate(p.paymentDate)}</div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.referenceNumber && (
                        <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                          Ref: {p.referenceNumber}
                        </span>
                      )}
                      {customer && (
                        <button
                          type="button"
                          onClick={() => handleSendPaymentReceiptSMS(p)}
                          className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-blue-700 border border-sky-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                          title="Send SMS Receipt"
                        >
                          <MessageSquare className="w-3 h-3 text-blue-600" />
                          <span>SMS Receipt</span>
                        </button>
                      )}
                    </div>
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
