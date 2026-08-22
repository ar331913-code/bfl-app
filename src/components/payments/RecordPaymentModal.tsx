import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { Customer, Loan, RepaymentSchedule, PaymentMethod, Payment } from '../../types';
import { 
  X, 
  ArrowLeft,
  Receipt, 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Share2, 
  Download,
  ShieldCheck
} from 'lucide-react';
import { recordPayment } from '../../services/paymentService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { generatePaymentReceiptPDF } from '../../services/exportService';
import confetti from 'canvas-confetti';
import { format } from 'date-fns';

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
  const activeLoans = loans.filter(l => l.status !== 'completed');

  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    preselectedLoanId || (activeLoans.length > 0 ? activeLoans[0].loanId : '')
  );
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<number | undefined>(
    preselectedInstallmentId
  );
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('momo');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd HH:mm'));

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

  const handleShareWhatsApp = () => {
    if (!currentCustomer || !completedPayment) return;
    const text = `*B-F-L PAYMENT RECEIPT*\n` +
      `Receipt No: ${completedPayment.paymentId}\n` +
      `Customer: ${currentCustomer.fullName}\n` +
      `Loan ID: ${completedPayment.loanId}\n` +
      `Amount Paid: GH₵${completedPayment.amountPaid.toFixed(2)}\n` +
      `Method: ${completedPayment.paymentMethod.toUpperCase()}\n` +
      `Date: ${completedPayment.paymentDate}\n` +
      `Thank you for your prompt repayment!`;

    const cleanPhone = currentCustomer.primaryPhone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('0') ? '233' + cleanPhone.slice(1) : cleanPhone;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-navy-950 via-navy-900 to-amber-950 text-white flex items-center justify-between border-b border-navy-800">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (isConfirming) setIsConfirming(false);
                else onClose();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Back</span>
            </button>
            <div>
              <h2 className="text-sm font-black">
                {completedPayment ? 'Repayment Successful! 🎉' : isConfirming ? 'Confirm Payment Entry' : 'Record Loan Repayment'}
              </h2>
              <p className="text-[10px] text-amber-300">
                {completedPayment ? 'Official Receipt Generated' : 'Remit collection to customer account'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-navy-300 hover:text-white hover:bg-navy-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. SUCCESS RECEIPT STATE */}
        {completedPayment && currentCustomer && currentLoan ? (
          <div className="p-6 text-center space-y-4 animate-fade-in flex-1 overflow-y-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <div className="text-xs uppercase font-bold text-slate-400">Payment Processed</div>
              <div className="text-2xl font-extrabold text-navy-950 mt-0.5">
                {formatCurrency(completedPayment.amountPaid)}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-1">
                Receipt #{completedPayment.paymentId}
              </div>
            </div>

            {/* Receipt Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Borrower:</span>
                <span className="font-bold text-navy-950">{currentCustomer.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Loan ID:</span>
                <span className="font-mono font-bold text-navy-950">{completedPayment.loanId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-bold uppercase text-navy-950">{completedPayment.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Remaining Balance:</span>
                <span className="font-bold text-brand-700">{formatCurrency(currentLoan.outstandingBalance)}</span>
              </div>
            </div>

            {/* Receipt Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleShareWhatsApp}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Share Receipt via WhatsApp
              </button>

              <button
                onClick={handleDownloadPDF}
                className="w-full py-3 bg-navy-900 hover:bg-navy-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download PDF Receipt
              </button>

              <button
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
              <label className="text-xs font-semibold text-slate-700 block mb-1">Select Loan *</label>
              <select
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:outline-none bg-white"
              >
                {activeLoans.map(l => (
                  <option key={l.loanId} value={l.loanId}>
                    {l.loanId} - {l.customerName || l.customerId} (Bal: {formatCurrency(l.outstandingBalance)})
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Specific Installment Target */}
            {loanSchedules.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Target Installment</label>
                <select
                  value={selectedInstallmentId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    setSelectedInstallmentId(val);
                    if (val) {
                      const s = loanSchedules.find(item => item.id === val);
                      if (s) setAmountPaid(s.remainingBalance);
                    }
                  }}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:outline-none bg-white"
                >
                  <option value="">Auto-allocate across oldest installments</option>
                  {loanSchedules.map(s => (
                    <option key={s.id} value={s.id}>
                      Inst #{s.installmentNumber} (Due: {formatDate(s.dueDate)}) - Bal: {formatCurrency(s.remainingBalance)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Repayment Amount */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Amount Paid (GH₵) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-navy-900 text-xs">GH₵</span>
                <input
                  type="number"
                  min="1"
                  step="0.50"
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className="w-full text-base font-extrabold pl-12 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:outline-none text-navy-950"
                />
              </div>
              {currentLoan && (
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>Total Loan Balance:</span>
                  <span className="font-bold text-navy-950">{formatCurrency(currentLoan.outstandingBalance)}</span>
                </div>
              )}
            </div>

            {/* Payment Method Pills */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Payment Method *</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'momo', label: 'MoMo', icon: Smartphone },
                  { id: 'cash', label: 'Cash', icon: DollarSign },
                  { id: 'bank', label: 'Bank', icon: Building2 },
                ].map(m => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`py-2.5 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold transition ${
                        isSelected 
                          ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reference Number / Transaction ID */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Transaction / Reference ID
              </label>
              <input
                type="text"
                placeholder="e.g. MM-782910482 or Cash Receipt No."
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Payment Date & Notes */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Date</label>
                <input
                  type="text"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="Notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-navy-900 hover:bg-navy-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                Continue to Verify <DollarSign className="w-4 h-4" />
              </button>
            </div>

          </form>
        ) : (
          /* 3. CONFIRMATION SCREEN */
          <div className="p-5 overflow-y-auto space-y-4 flex-1 animate-fade-in">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Verify Payment Remittance
              </div>
              Please ensure you have physically or digitally received the funds before confirming.
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Borrower:</span>
                <span className="font-bold text-navy-950">{currentCustomer?.fullName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Loan ID:</span>
                <span className="font-mono font-bold text-navy-950">{currentLoan?.loanId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Payment Mode:</span>
                <span className="font-bold uppercase text-navy-950">{paymentMethod}</span>
              </div>
              {referenceNumber && (
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Reference:</span>
                  <span className="font-mono text-navy-950">{referenceNumber}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-b border-slate-200/60 text-sm">
                <span className="font-bold text-navy-900">Amount Remitted:</span>
                <span className="font-extrabold text-emerald-700">{formatCurrency(amountPaid)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">New Outstanding:</span>
                <span className="font-bold text-navy-950">
                  {formatCurrency(Math.max(0, (currentLoan?.outstandingBalance || 0) - amountPaid))}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm Payment
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
