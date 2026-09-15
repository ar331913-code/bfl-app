import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { CloudSyncService } from '../../services/cloudSyncService';
import { 
  X, 
  Search, 
  RefreshCw, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Phone, 
  CreditCard, 
  Calendar, 
  Layers, 
  ShieldCheck
} from 'lucide-react';
import { formatGhanaPhone, formatDate } from '../../utils/formatters';

interface RecoverableItem {
  customer: Customer;
  source: 'tombstone' | 'snapshot' | 'audit_log' | 'cloud_backup';
  snapshotLabel?: string;
  isDuplicate: boolean;
}

interface CustomerRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerRestored?: (customer: Customer) => void;
}

export const CustomerRecoveryModal: React.FC<CustomerRecoveryModalProps> = ({
  isOpen,
  onClose,
  onCustomerRestored
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [recoverableList, setRecoverableList] = useState<RecoverableItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const scanRecords = async () => {
    setIsScanning(true);
    setFeedback(null);
    try {
      const results = await CloudSyncService.scanRecoverableCustomers();
      setRecoverableList(results);
    } catch (e: any) {
      console.error('Failed to scan recoverable customers:', e);
      setFeedback({
        type: 'error',
        message: 'Failed to scan backup sources. Please ensure internet is connected.'
      });
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      scanRecords();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredList = recoverableList.filter(item => {
    const c = item.customer;
    if (!c) return false;
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.fullName || '').toLowerCase().includes(q) ||
      (c.customerId || '').toLowerCase().includes(q) ||
      (c.primaryPhone || '').includes(q) ||
      (c.ghanaCardNumber || '').toLowerCase().includes(q)
    );
  });

  const handleRestore = async (item: RecoverableItem) => {
    setRestoringId(item.customer.customerId);
    setFeedback(null);

    try {
      const res = await CloudSyncService.restoreCustomer(item.customer);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setRecoverableList(prev => prev.filter(r => r.customer.customerId !== item.customer.customerId));
        onCustomerRestored?.(item.customer);
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to restore client dossier.' });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/85 backdrop-blur-sm p-3.5 overflow-y-auto animate-fade-in text-slate-800">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] border border-slate-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-sky-900 text-white flex items-center justify-between border-b border-sky-400/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center text-white border border-white/20">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Recover Missing Clients</h2>
              <p className="text-[10px] text-sky-100 font-semibold">
                Scan backups, cloud snapshots, and deleted records to restore original client dossiers
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-sky-200 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Search */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, phone number, or Ghana Card..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs font-semibold pl-9 pr-4 py-2 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none bg-white"
            />
          </div>

          <button
            type="button"
            onClick={scanRecords}
            disabled={isScanning}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Re-scan Backups'}</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-3 mx-4 mt-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' 
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}>
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* List Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {isScanning ? (
            <div className="text-center py-12 space-y-2">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <div className="text-xs font-bold text-slate-600">Scanning cloud snapshots and deleted records...</div>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-sm font-black text-slate-800">No Missing Clients Detected</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All registered clients in your backup snapshots are already active in your directory.
              </p>
            </div>
          ) : (
            filteredList.map((item) => {
              const c = item.customer;
              const isRestoring = restoringId === c.customerId;

              return (
                <div 
                  key={`${item.source}-${c.customerId}`}
                  className="p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-slate-300 transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-950">{c.fullName}</span>
                        <span className="text-[10px] font-mono font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                          #{c.customerId}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {c.customerType}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {formatGhanaPhone(c.primaryPhone)}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          {c.ghanaCardNumber}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isRestoring}
                      onClick={() => handleRestore(item)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-60 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                      <span>{isRestoring ? 'Restoring...' : 'Restore Client'}</span>
                    </button>
                  </div>

                  {/* Metadata Bar */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>Source: <strong>{item.snapshotLabel || item.source}</strong></span>
                    </div>

                    {c.createdAt && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Registered: <strong>{formatDate(c.createdAt)}</strong></span>
                      </div>
                    )}

                    {item.isDuplicate && (
                      <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Possible active phone / ID conflict
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            {filteredList.length} recoverable client{filteredList.length === 1 ? '' : 's'} found
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 text-xs font-bold rounded-xl transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
