import React, { useState, useEffect } from 'react';
import { Loan, Customer, PaymentMethod, Payment, RepaymentSchedule } from '../../types';
import { 
  X, 
  DollarSign, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Receipt, 
  ArrowRight, 
  User, 
  Download, 
  Share2, 
  MessageSquare, 
  MessageCircle, 
  Sparkles,
  Smartphone,
  Banknote,
  Building2,
  Check,
  TrendingUp,
  Clock
} from 'lucide-react';
import { formatCurrency, formatDate, formatGhanaPhone, isLoanOwing, getTrueOutstanding } from '../../utils/formatters';
import { recordPayment } from '../../services/paymentService';
import { generatePaymentReceiptPDF } from '../../utils/pdfGenerator';
import { SMSService } from '../../services/smsService';
import { CloudSyncService } from '../../services/cloudSyncService';
import { useAuth } from '../../context/AuthContext';
import { checkAndUpdateLoanStatusesAndAlerts } from '../../services/notificationService';
import { db } from '../../db';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loans: Loan[];
  customers: Customer[];
  schedules: RepaymentSchedule[];
  preselectedLoanId?: string;
  preselectedInstallmentId?: number;
  onPaymentSuccess: (payment: Payment) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  loans,
  customers,
  schedules,
  preselectedLoanId,
  preselectedInstallmentId,
  onPaymentSuccess
}) => {
  const { settings } = useAuth();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Form State
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<number | undefined>(undefined);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentDate, setPaymentDate] = useState<string>(todayStr);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Confirmation state
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Successful receipt state
  const [completedPayment, setCompletedPayment] = useState<Payment | null>(null);
  const [updatedLoanState, setUpdatedLoanState] = useState<Loan | null>(null);

  // Active Loans Only
  const activeLoans = loans.filter(l => isLoanOwing(l));

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setCompletedPayment(null);
      setUpdatedLoanState(null);
      setIsConfirming(false);
      setIsSubmitting(false);
      setError('');
      setNotes('');
      setReferenceNumber('');
      setPaymentDate(todayStr);

      let targetLoanId = '';
      if (preselectedLoanId && loans.some(l => l.loanId === preselectedLoanId)) {
        targetLoanId = preselectedLoanId;
      } else if (activeLoans.length > 0) {
        targetLoanId = activeLoans[0].loanId;
      } else if (loans.length > 0) {
        targetLoanId = loans[0].loanId;
      }

      setSelectedLoanId(targetLoanId);

      const targetLoan = loans.find(l => l.loanId === targetLoanId);
      const targetLoanSchedules = schedules
        .filter(s => s.loanId === targetLoanId && s.remainingBalance > 0.01)
        .sort((a, b) => a.installmentNumber - b.installmentNumber);

      if (preselectedInstallmentId && targetLoanSchedules.some(s => s.id === preselectedInstallmentId)) {
        setSelectedInstallmentId(preselectedInstallmentId);
        const sched = targetLoanSchedules.find(s => s.id === preselectedInstallmentId);
        setAmountPaid(sched ? sched.remainingBalance : 0);
      } else if (targetLoanSchedules.length > 0) {
        setSelectedInstallmentId(targetLoanSchedules[0].id);
        setAmountPaid(targetLoanSchedules[0].remainingBalance);
      } else if (targetLoan) {
        setSelectedInstallmentId(undefined);
        setAmountPaid(targetLoan.outstandingBalance);
      } else {
        setSelectedInstallmentId(undefined);
        setAmountPaid(0);
      }
    }
  }, [isOpen, preselectedLoanId, preselectedInstallmentId, loans, schedules]);

  const currentLoan = loans.find(l => l.loanId === selectedLoanId);
  const currentCustomer = customers.find(c => c.customerId === currentLoan?.customerId);

  const loanSchedules = schedules
    .filter(s => s.loanId === selectedLoanId && s.remainingBalance > 0.01)
    .sort((a, b) => a.installmentNumber - b.installmentNumber);

  const handleLoanChange = (newLoanId: string) => {
    setSelectedLoanId(newLoanId);
    setSelectedInstallmentId(undefined);
    setError('');

    const targetLoan = loans.find(l => l.loanId === newLoanId);
    const targetLoanSchedules = schedules
      .filter(s => s.loanId === newLoanId && s.remainingBalance > 0.01)
      .sort((a, b) => a.installmentNumber - b.installmentNumber);

    if (targetLoanSchedules.length > 0) {
      setSelectedInstallmentId(targetLoanSchedules[0].id);
      setAmountPaid(targetLoanSchedules[0].remainingBalance);
    } else if (targetLoan) {
      setAmountPaid(targetLoan.outstandingBalance);
    } else {
      setAmountPaid(0);
    }
  };

  if (!isOpen) return null;

  const handleProceedConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLoan) {
      setError('Please select an active loan.');
      return;
    }
    if (!amountPaid || amountPaid <= 0) {
      setError('Please enter a valid repayment amount.');
      return;
    }
    if (amountPaid > (currentLoan.outstandingBalance || 0) + 0.05) {
      setError(`Amount exceeds total outstanding loan balance of ${formatCurrency(currentLoan.outstandingBalance)}.`);
      return;
    }
    setError('');
    setIsConfirming(true);
  };

  const handleFinalSubmit = async () => {
    if (!currentLoan) return;
    setIsSubmitting(true);

    try {
      const result = await recordPayment({
        loanId: currentLoan.loanId,
        customerId: currentLoan.customerId,
        installmentId: selectedInstallmentId,
        amountPaid,
        paymentMethod,
        referenceNumber,
        notes,
        paymentDate
      });

      if (!result.success) {
        setError(result.message);
        setIsConfirming(false);
      } else {
        if (result.loanCompleted) {
          confetti({
            particleCount: 110,
            spread: 80,
            origin: { y: 0.6 }
          });
        }

        if (result.updatedLoan) {
          setUpdatedLoanState(result.updatedLoan);
        }
        
        // Fetch saved payment
        const lastPayment = await db.payments.orderBy('id').last();
        if (lastPayment) {
          setCompletedPayment(lastPayment);
          onPaymentSuccess(lastPayment);

          // Auto-dispatch SMS receipt with updated loan state
          const loanForSms = result.updatedLoan || currentLoan;
          if ((settings?.autoSmsOnPayment ?? true) && currentCustomer?.primaryPhone && loanForSms) {
            const receiptText = SMSService.generatePaymentReceiptSMS({
              customer: currentCustomer,
              loan: loanForSms,
              payment: lastPayment,
              businessName: settings?.businessName,
              businessPhone: settings?.businessPhone
            });
            SMSService.dispatchSMS(currentCustomer.primaryPhone, receiptText, settings);
          }

          CloudSyncService.triggerBackgroundSync();
          await checkAndUpdateLoanStatusesAndAlerts();
        }
      }
    } catch (err: any) {
      console.error('Failed to record payment', err);
      setError('Payment recording failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeLoanObj = updatedLoanState || currentLoan;

  const handleDownloadPDF = () => {
    if (currentCustomer && activeLoanObj && completedPayment) {
      generatePaymentReceiptPDF(currentCustomer, activeLoanObj, completedPayment);
    }
  };

  const handleSendSMSReceipt = () => {
    if (!currentCustomer || !activeLoanObj || !completedPayment) return;
    const text = SMSService.generatePaymentReceiptSMS({
      customer: currentCustomer,
      loan: activeLoanObj,
      payment: completedPayment,
      businessName: settings?.businessName,
      businessPhone: settings?.businessPhone
    });
    SMSService.dispatchSMS(currentCustomer.primaryPhone, text, settings);
  };

  const handleShareWhatsApp = () => {
    if (!currentCustomer || !completedPayment || !activeLoanObj) return;
    
    const isCompleted = activeLoanObj.status === 'completed' || activeLoanObj.outstandingBalance <= 0.01;
    const balanceLine = isCompleted
      ? `*STATUS: 100% FULLY PAID OFF! 🎉*\nRemaining Balance: GH₵0.00`
      : `Remaining Balance: GH₵${activeLoanObj.outstandingBalance.toFixed(2)}`;

    const text = `*B-F-L PAYMENT RECEIPT*\n` +
      `Receipt No: ${completedPayment.paymentId}\n` +
      `Customer: ${currentCustomer.fullName}\n` +
      `Loan ID: ${completedPayment.loanId}\n` +
      `Amount Paid: GH₵${completedPayment.amountPaid.toFixed(2)}\n` +
      `Method: ${completedPayment.paymentMethod.toUpperCase()}\n` +
      `Date: ${completedPayment.paymentDate}\n` +
      `${balanceLine}\n\n` +
      (isCompleted 
        ? `Congratulations on completing your loan! Thank you for choosing ${settings?.businessName || 'B-F-L'}` 
        : `Thank you for your prompt repayment! - ${settings?.businessName || 'B-F-L'}`);

    const cleanPhone = currentCustomer.primaryPhone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('0') ? '233' + cleanPhone.slice(1) : cleanPhone;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Projected Balance calculation
  const projectedRemaining = Math.max(0, (currentLoan?.outstandingBalance || 0) - (amountPaid || 0));
  const willBeFullySettled = (currentLoan?.outstandingBalance || 0) > 0 && amountPaid >= (currentLoan?.outstandingBalance || 0) - 0.01;

  // Loan Progress Percentage
  const loanProgress = currentLoan 
    ? Math.min(100, Math.round(((currentLoan.totalPaid || 0) / (currentLoan.totalRepayment || 1)) * 100)) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3.5 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh] border border-slate-200/80">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white flex items-center justify-between border-b border-sky-500/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-600 text-white shadow-md shadow-sky-500/25 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white truncate tracking-tight">Record Repayment</h2>
              <p className="text-[11px] text-sky-300 font-medium truncate">Accept Cash or Bank collections</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {completedPayment && currentCustomer && activeLoanObj ? (
          /* 1. SUCCESS RECEIPT VIEW */
          <div className="p-5 sm:p-6 text-center space-y-4 animate-fade-in flex-1 overflow-y-auto">
            <div className="w-16 h-16 bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-sky-500/30 ring-4 ring-sky-100 animate-pulse">
              <CheckCircle2 className="w-9 h-9 text-white" />
            </div>

            <div>
              <div className="text-[11px] uppercase font-black tracking-wider text-sky-800 bg-sky-50 inline-block px-3 py-1 rounded-full border border-sky-200">
                Payment Processed Successfully
              </div>
              <div className="text-3xl sm:text-4xl font-black text-slate-950 mt-1.5 tracking-tight">
                {formatCurrency(completedPayment.amountPaid)}
              </div>
              <div className="text-xs text-blue-700 font-mono font-bold mt-1">
                Receipt #{completedPayment.paymentId}
              </div>
            </div>

            {/* Loan Status Banner if Completed */}
            {(activeLoanObj.status === 'completed' || activeLoanObj.outstandingBalance <= 0.01) && (
              <div className="p-3.5 bg-gradient-to-r from-sky-100 to-blue-100 border-2 border-sky-300 rounded-2xl text-blue-950 text-xs font-black flex items-center justify-center gap-2 shadow-xs animate-bounce">
                <Sparkles className="w-4 h-4 text-blue-700 shrink-0" />
                <span>LOAN IS 100% FULLY PAID OFF! 🎉</span>
              </div>
            )}

            {/* Digital Receipt Summary Card */}
            <div className="p-4 rounded-3xl bg-slate-50 border-2 border-sky-100 text-left text-xs space-y-2.5 shadow-xs">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 font-medium">Borrower:</span>
                <span className="font-black text-slate-950 truncate text-sm">{currentCustomer.fullName}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 font-medium">Loan Reference:</span>
                <span className="font-mono font-bold text-slate-950">{completedPayment.loanId}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 font-medium">Payment Mode:</span>
                <span className="font-bold uppercase text-blue-800 bg-sky-100 px-2 py-0.5 rounded-md text-[10px]">
                  {completedPayment.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Remaining Balance:</span>
                {(activeLoanObj.status === 'completed' || activeLoanObj.outstandingBalance <= 0.01) ? (
                  <span className="bg-sky-100 text-blue-900 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                    GH₵0.00 (Settled)
                  </span>
                ) : (
                  <span className="font-black text-rose-700 text-sm">{formatCurrency(activeLoanObj.outstandingBalance)}</span>
                )}
              </div>
            </div>

            {/* Receipt Sharing Suite */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSendSMSReceipt}
                className="w-full py-3.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-sky-200" />
                Send Instant SMS Receipt
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black rounded-2xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-black rounded-2xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> PDF Receipt
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-2xl transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : !isConfirming ? (
          /* 2. REDESIGNED REPAYMENT FORM */
          <form onSubmit={handleProceedConfirm} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
            
            {/* 1. Borrower & Loan Selector */}
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                Select Active Loan *
              </label>
              <select
                value={selectedLoanId}
                onChange={(e) => handleLoanChange(e.target.value)}
                className="w-full text-xs font-bold px-3.5 py-3 rounded-2xl border-2 border-sky-100 focus:border-sky-500 focus:outline-none bg-slate-50 focus:bg-white text-slate-950 transition shadow-xs"
              >
                {activeLoans.map(l => (
                  <option key={l.loanId} value={l.loanId}>
                    {l.customerName} ({l.loanId}) — Owing: {formatCurrency(l.outstandingBalance)}
                  </option>
                ))}
                {loans.filter(l => l.status === 'completed' || (l.outstandingBalance || 0) <= 0.01).map(l => (
                  <option key={l.loanId} value={l.loanId} disabled>
                    {l.customerName} ({l.loanId}) — 100% Fully Settled
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Hero Borrower Balance Card */}
            {currentLoan && (
              <div className="p-4 rounded-3xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 border-2 border-sky-200 text-xs space-y-3 shadow-xs">
                
                {/* Top Row: Customer Info */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-950 truncate">
                      {currentCustomer?.fullName || currentLoan.customerName}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {currentCustomer ? formatGhanaPhone(currentCustomer.primaryPhone) : currentLoan.customerId} • Loan {currentLoan.loanId}
                    </div>
                  </div>

                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shrink-0 ${
                    currentLoan.status === 'overdue' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                    currentLoan.status === 'due_today' ? 'bg-sky-100 text-blue-900 border border-sky-300' :
                    'bg-blue-100 text-blue-800 border border-blue-300'
                  }`}>
                    {currentLoan.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600">
                    <span>
                      Paid So Far: <strong className="text-blue-700">{formatCurrency(currentLoan.totalPaid)}</strong>
                    </span>
                    <span>
                      Total Loan Due: <strong>{formatCurrency(currentLoan.totalRepayment)}</strong>
                    </span>
                  </div>
                  <div className="w-full bg-white rounded-full h-2 overflow-hidden border border-sky-200 p-0.5">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-600 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.round((((currentLoan.totalPaid || 0) + (amountPaid || 0)) / (currentLoan.totalRepayment || 1)) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Outstanding & Live Projection Highlight */}
                <div className="pt-2 border-t border-sky-200/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      Before Payment Balance:
                    </span>
                    <span className="text-slate-900 font-bold">
                      {formatCurrency(getTrueOutstanding(currentLoan))}
                    </span>
                  </div>

                  {amountPaid > 0 && (
                    <div className="p-2.5 bg-white rounded-2xl border border-sky-200 flex items-center justify-between shadow-xs animate-fade-in">
                      <div>
                        <span className="text-blue-950 font-black text-[10px] uppercase block">
                          Projected Balance After Payment:
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Deducting {formatCurrency(amountPaid)}
                        </span>
                      </div>

                      {amountPaid >= getTrueOutstanding(currentLoan) - 0.05 ? (
                        <span className="bg-sky-100 text-blue-900 border border-sky-300 text-[11px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-blue-600" />
                          GH₵0.00 (100% PAID OFF 🎉)
                        </span>
                      ) : (
                        <span className="text-rose-700 font-black text-sm">
                          {formatCurrency(Math.max(0, getTrueOutstanding(currentLoan) - amountPaid))}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Installment Allocation Selector */}
            {loanSchedules.length > 0 && (
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  Allocate Installment (Waterfall Schedule)
                </label>
                <select
                  value={selectedInstallmentId || ''}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : undefined;
                    setSelectedInstallmentId(id);
                    if (id) {
                      const s = loanSchedules.find(item => item.id === id);
                      if (s) setAmountPaid(s.remainingBalance);
                    }
                  }}
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white text-slate-950 transition"
                >
                  <option value="">Auto-allocate across oldest unpaid installments</option>
                  {loanSchedules.map(s => (
                    <option key={s.id} value={s.id}>
                      Installment #{s.installmentNumber} — Due {formatDate(s.dueDate)} ({formatCurrency(s.remainingBalance)} remaining)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 4. Payment Amount Input with Quick Preset Chips */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Amount Received (GH₵) *
                </label>
                <span className="text-[11px] font-bold text-blue-700">
                  Max: {formatCurrency(currentLoan?.outstandingBalance || 0)}
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">GH₵</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full text-xl font-black pl-14 pr-4 py-3 rounded-2xl border-2 border-sky-100 focus:border-sky-500 focus:outline-none bg-white text-slate-950 shadow-xs"
                />
              </div>

              {/* Quick Amount Chips */}
              {currentLoan && (
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 no-scrollbar">
                  {loanSchedules.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmountPaid(loanSchedules[0].remainingBalance)}
                      className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-blue-800 text-[11px] font-bold rounded-xl whitespace-nowrap active:scale-95 transition"
                    >
                      1 Installment ({formatCurrency(loanSchedules[0].remainingBalance)})
                    </button>
                  )}
                  {loanSchedules.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setAmountPaid(loanSchedules[0].remainingBalance + loanSchedules[1].remainingBalance)}
                      className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-blue-800 text-[11px] font-bold rounded-xl whitespace-nowrap active:scale-95 transition"
                    >
                      2 Installments ({formatCurrency(loanSchedules[0].remainingBalance + loanSchedules[1].remainingBalance)})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAmountPaid(currentLoan.outstandingBalance)}
                    className="px-2.5 py-1 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[11px] font-black rounded-xl whitespace-nowrap active:scale-95 transition shadow-xs"
                  >
                    Full Payoff ({formatCurrency(currentLoan.outstandingBalance)})
                  </button>
                </div>
              )}
            </div>

            {/* Live Projected Settlement Banner */}
            {amountPaid > 0 && currentLoan && (
              <div className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between border-2 animate-fade-in ${
                willBeFullySettled 
                  ? 'bg-sky-100 text-blue-950 border-sky-300 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}>
                <div className="flex items-center gap-1.5">
                  {willBeFullySettled ? (
                    <>
                      <Sparkles className="w-4 h-4 text-blue-700 shrink-0" />
                      <span>100% FULL PAYOFF! Loan will be marked settled.</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Projected balance after pay:</span>
                    </>
                  )}
                </div>
                <strong className={willBeFullySettled ? 'text-blue-900 text-sm' : 'text-slate-950 text-sm'}>
                  {formatCurrency(projectedRemaining)}
                </strong>
              </div>
            )}

            {/* 5. Payment Method Cards */}
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                Payment Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cash', label: 'Cash Hand', icon: Banknote, color: 'text-emerald-600' },
                  { id: 'bank', label: 'Bank Transfer', icon: Building2, color: 'text-indigo-600' }
                ].map(method => {
                  const Icon = method.icon;
                  const isSelected = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                      className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-black transition border-2 active:scale-95 ${
                        isSelected 
                          ? 'border-blue-600 bg-gradient-to-br from-sky-50 to-blue-50 text-blue-950 shadow-sm' 
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : method.color}`} />
                      <span className="truncate">{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. Transaction Reference & Payment Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Receipt / Bank Ref (Optional)
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. REC-8492049"
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white text-slate-950"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white text-slate-950"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-2xl shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2"
              >
                <span>Review & Confirm Repayment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </form>
        ) : (
          /* 3. CONFIRMATION SCREEN */
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 animate-fade-in">
            <div className="text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
              Verify Repayment Details
            </div>

            <div className="p-4 rounded-3xl bg-slate-50 border-2 border-sky-100 space-y-2.5 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2 gap-2">
                <span className="text-slate-500 font-medium">Borrower:</span>
                <span className="font-black text-slate-950 truncate text-sm">{currentCustomer?.fullName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2 gap-2">
                <span className="text-slate-500 font-medium">Loan ID:</span>
                <span className="font-mono font-bold text-slate-950">{currentLoan?.loanId}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2 gap-2">
                <span className="text-slate-500 font-medium">Amount Received:</span>
                <span className="font-black text-blue-700 text-lg">{formatCurrency(amountPaid)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-2 gap-2">
                <span className="text-slate-500 font-medium">Payment Mode:</span>
                <span className="font-bold uppercase text-slate-950">{paymentMethod}</span>
              </div>
              {referenceNumber && (
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 gap-2">
                  <span className="text-slate-500 font-medium">Reference:</span>
                  <span className="font-mono font-bold text-blue-800">{referenceNumber}</span>
                </div>
              )}
              <div className="flex justify-between items-center gap-2 pt-1">
                <span className="text-slate-500 font-medium">Projected Balance:</span>
                <span className="font-black text-slate-950 text-sm">
                  {formatCurrency(projectedRemaining)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-700 text-xs font-black hover:bg-slate-200 transition"
              >
                Modify
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="flex-1 py-3.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-2xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm & Issue Receipt
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
