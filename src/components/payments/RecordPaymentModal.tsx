import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Loan, Customer, RepaymentSchedule, Payment, PaymentMethod } from '../../types';
import { 
  X, 
  DollarSign, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Share2, 
  Download, 
  ArrowRight,
  ShieldCheck,
  Receipt,
  ArrowLeft,
  MessageSquare,
  MessageCircle,
  Send
} from 'lucide-react';
import { recordPayment } from '../../services/paymentService';
import { formatCurrency, formatDate, formatGhanaPhone } from '../../utils/formatters';
import { generatePaymentReceiptPDF } from '../../services/exportService';
import { SMSService } from '../../services/smsService';
import { useAuth } from '../../context/AuthContext';
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
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
        
        // Fetch saved payment
        const lastPayment = await db.payments.orderBy('id').last();
        if (lastPayment) {
          setCompletedPayment(lastPayment);
          onPaymentSuccess(lastPayment);

          // Auto-dispatch SMS receipt
          if ((settings?.autoSmsOnPayment ?? true) && currentCustomer?.primaryPhone && currentLoan) {
            const receiptText = SMSService.generatePaymentReceiptSMS({
              customer: currentCustomer,
              loan: currentLoan,
              payment: lastPayment,
              businessName: settings?.businessName,
              businessPhone: settings?.businessPhone
            });
            SMSService.dispatchSMS(currentCustomer.primaryPhone, receiptText, settings);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to record payment', err);
      setError('Payment recording failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    if (currentCustomer && currentLoan && completedPayment) {
      generatePaymentReceiptPDF(currentCustomer, currentLoan, completedPayment);
    }
  };

  const handleSendSMSReceipt = () => {
    if (!currentCustomer || !currentLoan || !completedPayment) return;
    const text = SMSService.generatePaymentReceiptSMS({
      customer: currentCustomer,
      loan: currentLoan,
      payment: completedPayment,
      businessName: settings?.businessName,
      businessPhone: settings?.businessPhone
    });
    SMSService.dispatchSMS(currentCustomer.primaryPhone, text, settings);
  };

  const handleShareWhatsApp = () => {
    if (!currentCustomer || !completedPayment || !currentLoan) return;
    const text = `*B-F-L PAYMENT RECEIPT*\n` +
      `Receipt No: ${completedPayment.paymentId}\n` +
      `Customer: ${currentCustomer.fullName}\n` +
      `Loan ID: ${completedPayment.loanId}\n` +
      `Amount Paid: GH₵${completedPayment.amountPaid.toFixed(2)}\n` +
      `Method: ${completedPayment.paymentMethod.toUpperCase()}\n` +
      `Date: ${completedPayment.paymentDate}\n` +
      `Remaining Balance: GH₵${currentLoan.outstandingBalance.toFixed(2)}\n\n` +
      `Thank you for your prompt repayment! - ${settings?.businessName || 'B-F-L'}`;

    const cleanPhone = currentCustomer.primaryPhone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('0') ? '233' + cleanPhone.slice(1) : cleanPhone;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/85 backdrop-blur-sm p-3.5 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] border border-slate-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white flex items-center justify-between border-b border-sky-400/30">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (isConfirming) setIsConfirming(false);
                else onClose();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold transition border border-white/20"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-sky-200" />
              <span>Back</span>
            </button>
            <div>
              <h2 className="text-sm font-black text-white">
                {completedPayment ? 'Repayment Successful! 🎉' : isConfirming ? 'Confirm Payment Entry' : 'Record Loan Repayment'}
              </h2>
              <p className="text-[10px] text-sky-100 font-semibold">
                {completedPayment ? 'Official Receipt & SMS Ready' : 'Remit collection to customer account'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-sky-200 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. SUCCESS RECEIPT STATE */}
        {completedPayment && currentCustomer && currentLoan ? (
          <div className="p-6 text-center space-y-4 animate-fade-in flex-1 overflow-y-auto">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9 text-white" />
            </div>

            <div>
              <div className="text-xs uppercase font-black tracking-wider text-slate-400">Payment Processed</div>
              <div className="text-2xl font-black text-navy-950 mt-0.5">
                {formatCurrency(completedPayment.amountPaid)}
              </div>
              <div className="text-xs text-sky-700 font-mono font-bold mt-1">
                Receipt #{completedPayment.paymentId}
              </div>
            </div>

            {/* Receipt Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Borrower:</span>
                <span className="font-black text-navy-950">{currentCustomer.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Loan ID:</span>
                <span className="font-mono font-bold text-navy-950">{completedPayment.loanId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Payment Mode:</span>
                <span className="font-bold uppercase text-sky-800">{completedPayment.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Remaining Balance:</span>
                <span className="font-black text-rose-700 text-sm">{formatCurrency(currentLoan.outstandingBalance)}</span>
              </div>
            </div>

            {/* Receipt Sharing Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSendSMSReceipt}
                className="w-full py-3 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-cyan-200" />
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
                className="w-full py-2.5 bg-navy-900 hover:bg-navy-800 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-2"
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
          <form onSubmit={handleProceedConfirm} className="p-5 overflow-y-auto space-y-4 flex-1">
            
            {/* Loan Selector */}
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">Select Loan *</label>
              <select
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white text-navy-950"
              >
                {loans.filter(l => l.status !== 'completed').map(l => (
                  <option key={l.loanId} value={l.loanId}>
                    {l.loanId} - {l.customerName || l.customerId} (Owing: {formatCurrency(l.outstandingBalance)})
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Dossier Card */}
            {currentCustomer && currentLoan && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 text-xs space-y-1">
                <div className="flex justify-between font-black text-navy-950">
                  <span>{currentCustomer.fullName}</span>
                  <span className="text-sky-800 font-mono">{currentCustomer.customerId}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Phone: <strong className="text-navy-900">{formatGhanaPhone(currentCustomer.primaryPhone)}</strong></span>
                  <span>Total Lent: <strong className="text-navy-900">{formatCurrency(currentLoan.principalAmount)}</strong></span>
                </div>
                <div className="flex justify-between text-[11px] pt-1 border-t border-sky-200/80">
                  <span className="text-slate-600 font-medium">Remaining Outstanding:</span>
                  <span className="font-black text-rose-700">{formatCurrency(currentLoan.outstandingBalance)}</span>
                </div>
              </div>
            )}

            {/* Installment Target Selector */}
            {loanSchedules.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Apply to Specific Installment</label>
                <select
                  value={selectedInstallmentId || ''}
                  onChange={(e) => setSelectedInstallmentId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white"
                >
                  <option value="">Auto-Apply (Pay oldest due installment first)</option>
                  {loanSchedules.map(s => (
                    <option key={s.id} value={s.id}>
                      Installment #{s.installmentNumber} (Due: {formatDate(s.dueDate)}) - Rem: {formatCurrency(s.remainingBalance)} {s.penaltyAmount ? `(+GH₵${s.penaltyAmount} late fee)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount Paid (GH₵) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className="w-full text-sm font-black px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Payment Method</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'momo', label: 'MoMo' },
                  { id: 'cash', label: 'Cash' },
                  { id: 'bank_transfer', label: 'Bank' },
                  { id: 'cheque', label: 'Cheque' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMethod(mode.id as PaymentMethod)}
                    className={`py-2 text-xs font-black rounded-xl border-2 transition ${
                      paymentMethod === mode.id
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference Number / MoMo Transaction ID */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                MoMo Transaction ID / Reference
              </label>
              <input
                type="text"
                placeholder="e.g. 19283746592"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full text-xs font-mono font-semibold px-3.5 py-2 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                Review Repayment Entry
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </form>
        ) : (
          /* 3. CONFIRMATION SCREEN */
          <div className="p-5 overflow-y-auto space-y-4 flex-1 animate-fade-in">
            <div className="text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
              Verify Repayment Entry
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-medium">Borrower:</span>
                <span className="font-black text-navy-950">{currentCustomer?.fullName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-medium">Loan ID:</span>
                <span className="font-mono font-bold text-navy-950">{currentLoan?.loanId}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-medium">Amount Received:</span>
                <span className="font-black text-emerald-700 text-base">{formatCurrency(amountPaid)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-medium">Method:</span>
                <span className="font-bold uppercase text-navy-950">{paymentMethod}</span>
              </div>
              {referenceNumber && (
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500 font-medium">Ref ID:</span>
                  <span className="font-mono font-bold text-sky-800">{referenceNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Projected Balance:</span>
                <span className="font-black text-navy-950">
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
                className="flex-1 py-3 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
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
