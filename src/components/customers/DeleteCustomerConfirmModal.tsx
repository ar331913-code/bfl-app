import React, { useState } from 'react';
import { Customer } from '../../types';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  Car, 
  Store, 
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatGhanaPhone } from '../../utils/formatters';
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
  const [error, setError] = useState<string>('');

  if (!isOpen || !customer) return null;

  const hasOwing = totalOwing > 0.01;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');

    try {
      const res = await CloudSyncService.deleteCustomerDirectFromCentralDatabase(customer.customerId);
      if (res.success) {
        onCustomerDeleted?.(customer.customerId);
        onClose();
      } else {
        setError(res.message || 'Failed to delete client. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to delete customer:', err);
      setError('Error deleting client record. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 animate-fade-in text-slate-800">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border-2 border-rose-200">
        
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white border border-white/20">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white leading-tight">Delete Client</h2>
              <p className="text-[10px] text-rose-100 font-semibold">Approval Required</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-full text-rose-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Ultra Compact, Zero Scrolling */}
        <div className="p-4 space-y-3">
          
          {/* Client Identity Mini Card */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center text-slate-700 shrink-0 font-bold border border-slate-300">
              {customer.photoUrl ? (
                <img src={customer.photoUrl} alt={customer.fullName} className="w-full h-full object-cover" />
              ) : customer.customerType === 'driver' ? (
                <Car className="w-5 h-5 text-slate-600" />
              ) : (
                <Store className="w-5 h-5 text-slate-600" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-slate-950 truncate leading-tight">
                {customer.fullName}
              </div>
              <div className="text-[10px] font-mono font-bold text-slate-500">
                {customer.customerId} • <span className="capitalize">{customer.customerType}</span>
              </div>
              <div className="text-[10px] text-slate-600 font-medium truncate">
                Phone: <strong className="font-mono text-slate-900">{formatGhanaPhone(customer.primaryPhone)}</strong>
              </div>
            </div>
          </div>

          {/* Alert Message */}
          {hasOwing ? (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl text-rose-950 text-xs space-y-1">
              <div className="flex items-center gap-1 font-black text-rose-800 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Active Debt: {formatCurrency(totalOwing)}</span>
              </div>
              <p className="text-[10px] text-rose-900 leading-snug">
                <strong>{customer.fullName}</strong> owes an unpaid balance. Deleting will permanently remove this client and linked records across all devices.
              </p>
            </div>
          ) : (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-[10px] text-amber-900 leading-tight">
                Are you sure you want to permanently delete <strong>{customer.fullName}</strong>?
              </p>
            </div>
          )}

          {error && (
            <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[10px] flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons - Always Visible Without Scrolling */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition active:scale-95"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="flex-1 py-2 active:scale-95 text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1 text-white bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 disabled:opacity-50"
            >
              {isDeleting ? (
                <span>Deleting...</span>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
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
