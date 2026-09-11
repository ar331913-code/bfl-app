import React, { useState } from 'react';
import { Customer } from '../../types';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  User, 
  Phone, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  Car,
  Store,
  ShieldAlert
} from 'lucide-react';
import { formatCurrency, formatGhanaPhone, maskGhanaCard } from '../../utils/formatters';
import { db } from '../../db';
import { CloudSyncService } from '../../services/cloudSyncService';

interface DeleteCustomerConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  totalOwing?: number;
  onCustomerDeleted?: (customerId: string) => void;
}

export const DeleteCustomerConfirmModal: React.FC<DeleteCustomerConfirmModalProps> = ({
  isOpen,
  onClose,
  customer,
  totalOwing = 0,
  onCustomerDeleted
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [acknowledged, setAcknowledged] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  if (!isOpen || !customer) return null;

  const hasOwing = totalOwing > 0.01;

  const handleDelete = async () => {
    if (hasOwing && !acknowledged) {
      setError('Please check the confirmation box to authorize deleting a client with active debt.');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const success = await db.deleteCustomer(customer.customerId);
      if (success) {
        CloudSyncService.triggerBackgroundSync();
        onCustomerDeleted?.(customer.customerId);
        onClose();
      } else {
        setError('Failed to delete client. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to delete customer:', err);
      setError('Error deleting client record. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fade-in text-slate-800">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto border-2 border-rose-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 text-white flex items-center justify-between border-b border-rose-400/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center text-white border border-white/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Delete Client Record</h2>
              <p className="text-[10px] text-rose-100 font-semibold">Approval required before deletion</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-full text-rose-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          
          {/* Client Dossier Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-200 overflow-hidden flex items-center justify-center text-slate-700 shrink-0 font-bold border border-slate-300">
              {customer.photoUrl ? (
                <img src={customer.photoUrl} alt={customer.fullName} className="w-full h-full object-cover" />
              ) : customer.customerType === 'driver' ? (
                <Car className="w-6 h-6 text-slate-600" />
              ) : (
                <Store className="w-6 h-6 text-slate-600" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-slate-950 truncate leading-tight">
                {customer.fullName}
              </div>
              <div className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
                {customer.customerId} • <span className="capitalize">{customer.customerType}</span>
              </div>
              <div className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                Phone: <strong className="font-mono text-slate-900">{formatGhanaPhone(customer.primaryPhone)}</strong>
              </div>
            </div>
          </div>

          {/* Active Debt Alert if client owes money */}
          {hasOwing ? (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-950 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-black text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Borrower Has Active Unpaid Balance!</span>
              </div>
              <p className="text-[11px] text-rose-900 leading-snug">
                <strong>{customer.fullName}</strong> currently has an active outstanding balance of <strong className="text-rose-700 font-black text-xs">{formatCurrency(totalOwing)}</strong>.
              </p>
              <p className="text-[10px] text-rose-800 font-medium">
                Deleting this client will permanently purge their borrower profile, loan ledger, and payment receipts from this device and cloud sync.
              </p>

              <div className="pt-2 border-t border-rose-200">
                <label className="flex items-start gap-2 text-xs font-bold text-slate-900 cursor-pointer bg-white p-2 rounded-xl border border-rose-300">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => {
                      setAcknowledged(e.target.checked);
                      setError('');
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-[11px] leading-tight text-rose-950 font-bold">
                    I approve deleting this client despite the active balance of {formatCurrency(totalOwing)}.
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Permanent Action Notice</span>
              </div>
              <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                Are you sure you want to delete <strong>{customer.fullName}</strong>? This will permanently remove their records from the directory.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isDeleting || (hasOwing && !acknowledged)}
              onClick={handleDelete}
              className={`flex-1 py-2.5 active:scale-95 text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5 text-white ${
                hasOwing && !acknowledged
                  ? 'bg-rose-300 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800'
              }`}
            >
              {isDeleting ? (
                <span>Deleting...</span>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Approve & Delete</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
