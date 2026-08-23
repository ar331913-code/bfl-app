import React, { useState } from 'react';
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
  AlertTriangle, 
  Plus, 
  Check, 
  TrendingUp,
  ShieldAlert
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { SMSService } from '../../services/smsService';
import { CloudSyncService } from '../../services/cloudSyncService';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db';

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
  
  // Late fee state
  const [showPenaltyForm, setShowPenaltyForm] = useState(false);
  const [penaltyType, setPenaltyType] = useState<'percent' | 'fixed'>('percent');
  const [penaltyPercent, setPenaltyPercent] = useState<number>(10);
  const [penaltyAmount, setPenaltyAmount] = useState<number>(50);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | 'all'>('all');
  const [penaltySuccessMessage, setPenaltySuccessMessage] = useState<string | null>(null);
  const [isApplyingPenalty, setIsApplyingPenalty] = useState(false);

  if (!isOpen || !loan) return null;

  const loanSchedules = schedules
    .filter(s => s.loanId === loan.loanId)
    .sort((a, b) => a.installmentNumber - b.installmentNumber);

  const loanPayments = payments.filter(p => p.loanId === loan.loanId);

  const progressPercent = Math.min(
    100,
    Math.round((loan.totalPaid / loan.totalRepayment) * 100)
  );

  const unpaidSchedules = loanSchedules.filter(s => s.status !== 'paid');

  // Calculate preview penalty
  const targetBaseAmount = selectedScheduleId === 'all' 
    ? (unpaidSchedules[0]?.remainingBalance || loan.installmentAmount)
    : (loanSchedules.find(s => s.id === selectedScheduleId)?.remainingBalance || loan.installmentAmount);

  const calculatedLateFee = penaltyType === 'percent' 
    ? Math.round(((targetBaseAmount * penaltyPercent) / 100) * 100) / 100
    : Number(penaltyAmount) || 0;

  const handleApplyLateFee = async () => {
    if (calculatedLateFee <= 0) return;
    setIsApplyingPenalty(true);

    try {
      const now = new Date().toISOString();

      if (selectedScheduleId === 'all') {
        // Apply to earliest unpaid schedule or distribute
        const targetSched = unpaidSchedules[0];
        if (targetSched && targetSched.id) {
          const newPenalty = (targetSched.penaltyAmount || 0) + calculatedLateFee;
          const newExpected = targetSched.expectedAmount + calculatedLateFee;
          const newRemaining = targetSched.remainingBalance + calculatedLateFee;

          await db.repaymentSchedules.update(targetSched.id, {
            penaltyAmount: newPenalty,
            expectedAmount: newExpected,
            remainingBalance: newRemaining,
            status: 'overdue'
          });
        }
      } else {
        const targetSched = loanSchedules.find(s => s.id === selectedScheduleId);
        if (targetSched && targetSched.id) {
          const newPenalty = (targetSched.penaltyAmount || 0) + calculatedLateFee;
          const newExpected = targetSched.expectedAmount + calculatedLateFee;
          const newRemaining = targetSched.remainingBalance + calculatedLateFee;

          await db.repaymentSchedules.update(targetSched.id, {
            penaltyAmount: newPenalty,
            expectedAmount: newExpected,
            remainingBalance: newRemaining,
            status: 'overdue'
          });
        }
      }

      // Update loan balance
      const newOutstanding = loan.outstandingBalance + calculatedLateFee;
      const newTotalRepayment = loan.totalRepayment + calculatedLateFee;
      const newTotalPenalties = (loan.totalPenalties || 0) + calculatedLateFee;

      await db.loans.update(loan.id!, {
        outstandingBalance: newOutstanding,
        totalRepayment: newTotalRepayment,
        totalPenalties: newTotalPenalties,
        status: 'overdue',
        updatedAt: now
      });

      // Audit log
      await db.auditLogs.add({
        action: 'PENALTY_FEE_APPLIED',
        entityType: 'loan',
        entityId: loan.loanId,
        details: `Applied late payment fee of GH₵${calculatedLateFee.toFixed(2)} (${penaltyType === 'percent' ? penaltyPercent + '%' : 'Fixed'}) to Loan ${loan.loanId} for ${loan.customerName}`,
        timestamp: now
      });

      // Trigger Cloud Sync
      CloudSyncService.triggerBackgroundSync();

      setPenaltySuccessMessage(`Late payment fee of GH₵${calculatedLateFee.toFixed(2)} applied successfully!`);
      setTimeout(() => {
        setPenaltySuccessMessage(null);
        setShowPenaltyForm(false);
      }, 2500);

    } catch (err) {
      console.error('Failed to apply penalty fee', err);
    } finally {
      setIsApplyingPenalty(false);
    }
  };

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
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition border border-white/15"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-300" />
              <span>Back</span>
            </button>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <span>Loan {loan.loanId}</span>
                <span className={`text-[10px] uppercase px-2 py-0.2 rounded-full font-bold ${
                  loan.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' :
                  loan.status === 'due_today' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' :
                  loan.status === 'overdue' ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30' :
                  'bg-white/20 text-white'
                }`}>
                  {loan.status.replace('_', ' ')}
                </span>
              </h2>
              <p className="text-[11px] text-emerald-300 font-medium">
                {loan.customerName}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-800">
          
          {/* Progress Bar & Repayment Metric Header */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white space-y-2.5 border border-emerald-500/30 shadow-md">
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Outstanding Balance</div>
                <div className="text-2xl font-black text-white tracking-tight">{formatCurrency(loan.outstandingBalance)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Repaid</div>
                <div className="text-sm font-black text-emerald-400">{formatCurrency(loan.totalPaid)} / {formatCurrency(loan.totalRepayment)}</div>
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

          {/* Late Fee / Penalty Management Card */}
          {loan.status !== 'completed' && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 border-2 border-rose-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-black text-xs text-rose-950 uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Late Payment Penalty & Default Fees</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPenaltyForm(!showPenaltyForm)}
                  className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[11px] font-bold transition shadow-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showPenaltyForm ? 'Close' : 'Add Late Fee'}</span>
                </button>
              </div>

              <p className="text-[11px] text-rose-900 leading-snug font-medium">
                Add a custom percentage or flat penalty fee if the borrower is late or defaults on their scheduled payment.
              </p>

              {penaltySuccessMessage && (
                <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-1.5 animate-fade-in">
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>{penaltySuccessMessage}</span>
                </div>
              )}

              {showPenaltyForm && (
                <div className="pt-2 border-t border-rose-200 space-y-3 animate-fade-in">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Penalty Fee Type</label>
                      <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-rose-200">
                        <button
                          type="button"
                          onClick={() => setPenaltyType('percent')}
                          className={`py-1 rounded-lg text-[10px] font-black transition ${
                            penaltyType === 'percent' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Percent (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPenaltyType('fixed')}
                          className={`py-1 rounded-lg text-[10px] font-black transition ${
                            penaltyType === 'fixed' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Fixed (GH₵)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        {penaltyType === 'percent' ? 'Penalty Rate (%)' : 'Penalty Amount (GH₵)'}
                      </label>
                      {penaltyType === 'percent' ? (
                        <select
                          value={penaltyPercent}
                          onChange={(e) => setPenaltyPercent(Number(e.target.value))}
                          className="w-full text-xs font-bold px-3 py-1.5 rounded-xl border border-rose-300 focus:outline-none bg-white"
                        >
                          <option value={5}>5% of installment</option>
                          <option value={10}>10% of installment</option>
                          <option value={15}>15% of installment</option>
                          <option value={20}>20% of installment</option>
                          <option value={25}>25% of installment</option>
                          <option value={30}>30% of installment</option>
                        </select>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          step="5"
                          value={penaltyAmount}
                          onChange={(e) => setPenaltyAmount(Number(e.target.value))}
                          className="w-full text-xs font-bold px-3 py-1.5 rounded-xl border border-rose-300 focus:outline-none bg-white"
                        />
                      )}
                    </div>
                  </div>

                  {/* Calculated Fee Preview Box */}
                  <div className="p-2.5 rounded-xl bg-white border border-rose-300 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">Fee Added to Loan</div>
                      <div className="text-xs font-black text-slate-900">
                        {penaltyType === 'percent' ? `${penaltyPercent}% Late Penalty` : 'Fixed Late Penalty'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-rose-700">
                        +{formatCurrency(calculatedLateFee)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyLateFee}
                    disabled={isApplyingPenalty || calculatedLateFee <= 0}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Apply GH₵{calculatedLateFee.toFixed(2)} Late Fee Now</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Key Loan Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Principal</div>
              <div className="text-xs font-black text-slate-900 mt-0.5">{formatCurrency(loan.principalAmount)}</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Interest ({loan.interestRate}%)</div>
              <div className="text-xs font-black text-emerald-700 mt-0.5">{formatCurrency(loan.totalInterest)}</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Installment</div>
              <div className="text-xs font-black text-slate-900 mt-0.5">{formatCurrency(loan.installmentAmount)}</div>
            </div>
          </div>

          {/* Repayment Schedules Breakdown */}
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Repayment Schedule ({loanSchedules.length} Installments)</span>
              <span className="text-[10px] text-slate-500 font-bold">{loan.repaymentFrequency.toUpperCase()}</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
                    <div className="font-black text-slate-900 flex items-center gap-1.5">
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
                      Due: <strong className="text-slate-900">{formatDate(sched.dueDate)}</strong> • Amount: <strong>{formatCurrency(sched.expectedAmount)}</strong>
                      {sched.penaltyAmount ? <span className="text-rose-600 font-bold ml-1">(+GH₵{sched.penaltyAmount.toFixed(2)} penalty)</span> : null}
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
                  <div key={p.paymentId} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{formatCurrency(p.amountPaid)} ({p.paymentMethod.toUpperCase()})</div>
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
            <div className="w-full py-2.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black rounded-xl text-center flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" /> This Loan is 100% Fully Settled
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
