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
  Sparkles
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { recordPayment } from '../../services/paymentService';
import { generatePaymentReceiptPDF } from '../../utils/pdfGenerator';
import { SMSService } from '../../services/smsService';
import { CloudSyncService } from '../../services/cloudSyncService';
import { useAuth } from '../../context/AuthContext';
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
  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    preselectedLoanId || (loans.length > 0 ? loans[0].loanId : '')
  );
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<number | undefined>(
    preselectedInstallmentId
  );
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('momo');
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

  const currentLoan = loans.find(l => l.loanId === selectedLoanId);
  const currentCustomer = customers.find(c => c.customerId === currentLoan?.customerId);

  const loanSchedules = schedules
    .filter(s => s.loanId === selectedLoanId && s.remainingBalance > 0.01)
    .sort((a, b) => a.installmentNumber - b.installmentNumber);

  // Auto-fill amount based on selected loan / installment
  useEffect(() => {
    if (preselectedLoanId) {
      setSelectedLoanId(preselectedLoanId);
    }
  }, [preselectedLoanId]);

  useEffect(() => {
    if (preselectedInstallmentId) {
      setSelectedInstallmentId(preselectedInstallmentId);
      const targetSched = schedules.find(s => s.id === preselectedInstallmentId);
      if (targetSched) {
        setAmountPaid(targetSched.remainingBalance);
      }
    } else if (loanSchedules.length > 0) {
      setAmountPaid(loanSchedules[0].remainingBalance);
    } else if (currentLoan) {
      setAmountPaid(currentLoan.outstandingBalance);
    }
  }, [selectedLoanId, preselectedInstallmentId]);

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
    if (amountPaid > currentLoan.outstandingBalance + 0.05) {
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
            particleCount: 90,
            spread: 75,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3.5 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] border border-slate-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex items-center justify-between border-b border-emerald-500/30">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-white/15 text-emerald-300 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-white truncate">Record Repayment</h2>
              <p className="text-[11px] text-emerald-200 truncate">Receive Cash or MoMo</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {completedPayment && currentCustomer && activeLoanObj ? (
          /* 1. SUCCESS RECEIPT VIEW */
          <div className="p-5 text-center space-y-4 animate-fade-in flex-1 overflow-y-auto">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>

            <div>
              <div className="text-[11px] uppercase font-black tracking-wider text-slate-400">Payment Processed Successfully</div>
              <div className="text-2xl sm:text-3xl font-black text-slate-950 mt-0.5">
                {formatCurrency(completedPayment.amountPaid)}
              </div>
              <div className="text-xs text-emerald-700 font-mono font-bold mt-1">
                Receipt #{completedPayment.paymentId}
              </div>
            </div>

            {/* Loan Status Banner if Completed */}
            {(activeLoanObj.status === 'completed' || activeLoanObj.outstandingBalance <= 0.01) && (
              <div className="p-3 bg-emerald-100 border-2 border-emerald-300 rounded-2xl text-emerald-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-xs">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>LOAN IS 100% FULLY PAID OFF! 🎉</span>
              </div>
            )}

            {/* Receipt Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 font-medium">Borrower:</span>
                <span className="font-black text-slate-950 truncate">{currentCustomer.fullName}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 font-medium">Loan ID:</span>
                <span className="font-mono font-bold text-slate-950">{completedPayment.loanId}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 font-medium">Payment Mode:</span>
                <span className="font-bold uppercase text-emerald-800">{completedPayment.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center gap-2 pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Remaining Balance:</span>
                {(activeLoanObj.status === 'completed' || activeLoanObj.outstandingBalance <= 0.01) ? (
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    GH₵0.00 (Settled)
                  </span>
                ) : (
                  <span className="font-black text-rose-700 text-sm">{formatCurrency(activeLoanObj.outstandingBalance)}</span>
                )}
              </div>
            </div>

            {/* Receipt Sharing Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSendSMSReceipt}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-emerald-200" />
                Send Instant SMS Receipt
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" /> Share via WhatsApp
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download PDF Receipt
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : !isConfirming ? (
          /* 2. FORM ENTRY STATE */
          <form onSubmit={handleProceedConfirm} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            
            {/* Loan Selector */}
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">Select Loan *</label>
              <select
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white text-slate-950"
              >
                {loans.filter(l => l.status !== 'completed').map(l => (
                  <option key={l.loanId} value={l.loanId}>
                    {l.loanId} — {l.customerName} (Bal: {formatCurrency(l.outstandingBalance)})
                  </option>
                ))}
              </select>
            </div>

            {currentLoan && (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Borrower: </span>
                  <strong className="text-slate-950">{currentCustomer?.fullName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Owed: </span>
                  <strong className="text-rose-700 font-black">{formatCurrency(currentLoan.outstandingBalance)}</strong>
                </div>
              </div>
            )}

            {/* Installment Target Selector */}
            {loanSchedules.length > 0 && (
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">Target Installment (Optional)</label>
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
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white text-slate-950"
                >
                  <option value="">Auto-allocate across oldest unpaid schedules</option>
                  {loanSchedules.map(s => (
                    <option key={s.id} value={s.id}>
                      Installment #{s.installmentNumber} — Due: {formatDate(s.dueDate)} (Bal: {formatCurrency(s.remainingBalance)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payment Amount Input */}
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">Amount Received (GH₵) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">GH₵</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full text-base font-black pl-12 pr-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white text-slate-950"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'momo', label: 'MTN MoMo' },
                  { id: 'cash', label: 'Cash Hand' },
                  { id: 'bank_transfer', label: 'Bank' }
                ].map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                    className={`py-2 rounded-xl text-xs font-black transition border-2 ${
                      paymentMethod === method.id 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs' 
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference Number / MoMo ID */}
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">Transaction Ref / MoMo ID (Optional)</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. 2389482939"
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white text-slate-950"
              />
            </div>

            {/* Date Recorded */}
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none bg-white text-slate-950"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                Review Repayment Entry
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </form>
        ) : (
          /* 3. CONFIRMATION SCREEN */
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 animate-fade-in">
            <div className="text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
              Verify Repayment Entry
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 gap-2">
                <span className="text-slate-500 font-medium">Borrower:</span>
                <span className="font-black text-slate-950 truncate">{currentCustomer?.fullName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 gap-2">
                <span className="text-slate-500 font-medium">Loan ID:</span>
                <span className="font-mono font-bold text-slate-950">{currentLoan?.loanId}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 gap-2">
                <span className="text-slate-500 font-medium">Amount Received:</span>
                <span className="font-black text-emerald-700 text-base">{formatCurrency(amountPaid)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 gap-2">
                <span className="text-slate-500 font-medium">Method:</span>
                <span className="font-bold uppercase text-slate-950">{paymentMethod}</span>
              </div>
              {referenceNumber && (
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 gap-2">
                  <span className="text-slate-500 font-medium">Ref ID:</span>
                  <span className="font-mono font-bold text-emerald-800">{referenceNumber}</span>
                </div>
              )}
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 font-medium">Projected Balance:</span>
                <span className="font-black text-slate-950">
                  {formatCurrency(Math.max(0, (currentLoan?.outstandingBalance || 0) - amountPaid))}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
              >
                Modify
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
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
