import React, { useState, useEffect } from 'react';
import { Payment, Loan, Customer, PaymentMethod } from '../../types';
import { 
  X, 
  DollarSign, 
  Calendar, 
  Check, 
  CreditCard, 
  Building2, 
  Banknote, 
  Smartphone, 
  Receipt,
  Save,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { db } from '../../db';
import { reconcileAllLoanBalances, checkAndUpdateLoanStatusesAndAlerts } from '../../services/notificationService';
import { CloudSyncService } from '../../services/cloudSyncService';

interface EditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  loan?: Loan | null;
  customer?: Customer | null;
  onPaymentUpdated?: (updatedPayment: Payment) => void;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  isOpen,
  onClose,
  payment,
  loan,
  customer,
  onPaymentUpdated
}) => {
  const [amountInput, setAmountInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && payment) {
      setAmountInput(payment.amountPaid?.toString() || '');
      setPaymentMethod(payment.paymentMethod || 'cash');
      setPaymentDate(payment.paymentDate ? payment.paymentDate.split(' ')[0] : new Date().toISOString().split('T')[0]);
      setReferenceNumber(payment.referenceNumber || '');
      setNotes(payment.notes || '');
      setError('');
    }
  }, [isOpen, payment]);

  if (!isOpen || !payment) return null;

  const parsedAmount = parseFloat(amountInput) || 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid payment amount greater than GH₵0.00');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const oldAmount = payment.amountPaid;
      const updatedData: Partial<Payment> = {
        amountPaid: parsedAmount,
        paymentMethod,
        paymentDate: paymentDate || payment.paymentDate,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        updatedAt: new Date().toISOString()
      };

      await db.payments.update(payment.id!, updatedData);

      // Add audit log
      await db.auditLogs.add({
        action: 'PAYMENT_AMOUNT_EDITED',
        entityType: 'payment',
        entityId: payment.paymentId,
        details: `Payment #${payment.paymentId} amount changed from GH₵${oldAmount.toFixed(2)} to GH₵${parsedAmount.toFixed(2)} for ${customer?.fullName || payment.customerId} (Loan: ${payment.loanId})`,
        timestamp: new Date().toISOString()
      });

      // Recalculate loan balances and sync
      await reconcileAllLoanBalances();
      await checkAndUpdateLoanStatusesAndAlerts();
      CloudSyncService.triggerBackgroundSync();

      const updatedPayment: Payment = {
        ...payment,
        ...updatedData
      };

      onPaymentUpdated?.(updatedPayment);
      onClose();
    } catch (err: any) {
      console.error('Failed to update payment:', err);
      setError(err?.message || 'Failed to update payment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-scale-in"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">Edit Repayment Amount</h3>
              <p className="text-[11px] text-sky-200">
                Receipt #{payment.paymentId} • Loan {payment.loanId}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          
          {/* Client & Loan Details Card */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-bold">Client:</span>
              <span className="font-black text-slate-900">{customer?.fullName || payment.customerId}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-bold">Loan Account:</span>
              <span className="font-mono font-bold text-blue-700">{payment.loanId}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span className="font-bold">Original Amount:</span>
              <span className="font-bold text-slate-700">{formatCurrency(payment.amountPaid)}</span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1">
              Repayment Amount (GH₵) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-base">GH₵</span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                className="w-full text-xl font-black pl-12 pr-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none bg-white text-slate-950 font-outfit shadow-xs"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'momo', label: 'MTN MoMo', icon: Smartphone, color: 'text-amber-600' },
                { id: 'cash', label: 'Cash Hand', icon: Banknote, color: 'text-emerald-600' },
                { id: 'bank', label: 'Bank Transfer', icon: Building2, color: 'text-indigo-600' }
              ].map(m => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                    className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 font-black text-xs transition ${
                      isSelected
                        ? 'border-blue-600 bg-sky-50 text-blue-950 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : m.color}`} />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Date & Reference */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none bg-white text-slate-950"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Ref / Receipt #</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Optional ref"
                className="w-full text-xs font-bold px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none bg-white text-slate-950"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for adjustment..."
              className="w-full text-xs font-medium px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none bg-white text-slate-950"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-1.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
