import React, { useState } from 'react';
import { Customer, Loan, Payment } from '../types';
import { 
  Receipt, 
  Search, 
  Plus, 
  Smartphone, 
  DollarSign, 
  Building2, 
  Download, 
  MessageCircle, 
  ChevronRight,
  Filter,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { formatCurrency, formatDate, formatGhanaPhone } from '../utils/formatters';
import { generatePaymentReceiptPDF } from '../services/exportService';
import { useAuth } from '../context/AuthContext';

interface PaymentsProps {
  payments: Payment[];
  loans: Loan[];
  customers: Customer[];
  onOpenRecordPayment: () => void;
}

export const Payments: React.FC<PaymentsProps> = ({
  payments,
  loans,
  customers,
  onOpenRecordPayment
}) => {
  const { settings } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const customerMap = new Map(customers.map(c => [c.customerId, c]));
  const loanMap = new Map(loans.map(l => [l.loanId, l]));

  const totalCollected = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const momoCollected = payments.filter(p => p.paymentMethod === 'momo').reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const cashCollected = payments.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + (p.amountPaid || 0), 0);

  const filteredPayments = payments.filter(p => {
    const cust = customerMap.get(p.customerId);
    const matchesSearch = 
      p.paymentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.loanId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.referenceNumber && p.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cust && cust.fullName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (methodFilter !== 'all' && p.paymentMethod !== methodFilter) return false;

    return true;
  }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const handleDownloadReceipt = (payment: Payment) => {
    const cust = customerMap.get(payment.customerId);
    const loan = loanMap.get(payment.loanId);
    if (cust && loan) {
      generatePaymentReceiptPDF(cust, loan, payment);
    }
  };

  const handleShareWhatsAppReceipt = (payment: Payment) => {
    const cust = customerMap.get(payment.customerId);
    const loan = loanMap.get(payment.loanId);
    if (!cust || !loan) return;

    const isCompleted = loan.status === 'completed' || (loan.outstandingBalance || 0) <= 0.01;
    const balanceLine = isCompleted
      ? `*STATUS: 100% FULLY PAID OFF! 🎉*\nRemaining Balance: GH₵0.00`
      : `Remaining Balance: GH₵${loan.outstandingBalance.toFixed(2)}`;

    const text = `*B-F-L PAYMENT RECEIPT*\n` +
      `Receipt No: ${payment.paymentId}\n` +
      `Customer: ${cust.fullName}\n` +
      `Loan ID: ${payment.loanId}\n` +
      `Amount Paid: GH₵${payment.amountPaid.toFixed(2)}\n` +
      `Method: ${payment.paymentMethod.toUpperCase()}\n` +
      `Date: ${payment.paymentDate}\n` +
      `${balanceLine}\n\n` +
      `Thank you for your repayment! - ${settings?.businessName || 'B-F-L'}`;

    const cleanPhone = cust.primaryPhone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('0') ? '233' + cleanPhone.slice(1) : cleanPhone;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-24 animate-fade-in text-slate-800">
      
      {/* 1. Header with Main Metrics Card */}
      <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 rounded-3xl p-4 sm:p-5 text-white shadow-xl border border-sky-500/30 relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-300">
              <Receipt className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-sky-300 uppercase tracking-wider">Collections Ledger</span>
          </div>

          <button
            onClick={onOpenRecordPayment}
            type="button"
            className="px-3.5 py-1.5 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 hover:from-sky-500 hover:to-blue-600 active:scale-95 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition shrink-0"
          >
            <Plus className="w-4 h-4" /> Record Pay
          </button>
        </div>

        <div className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-3 drop-shadow-sm">
          {formatCurrency(totalCollected)}
          <span className="text-xs text-sky-300 font-bold block mt-0.5">Total Repayments Collected</span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/15 text-xs">
          <div className="bg-white/5 p-2 sm:p-2.5 rounded-2xl border border-white/10 min-w-0">
            <div className="text-slate-400 text-[9px] sm:text-[10px] font-bold uppercase truncate">MTN MoMo</div>
            <div className="font-black text-amber-300 text-xs sm:text-sm mt-0.5 truncate">{formatCurrency(momoCollected)}</div>
          </div>
          <div className="bg-white/5 p-2 sm:p-2.5 rounded-2xl border border-white/10 min-w-0">
            <div className="text-slate-400 text-[9px] sm:text-[10px] font-bold uppercase truncate">Cash Hand</div>
            <div className="font-black text-sky-300 text-xs sm:text-sm mt-0.5 truncate">{formatCurrency(cashCollected)}</div>
          </div>
          <div className="bg-white/5 p-2 sm:p-2.5 rounded-2xl border border-white/10 min-w-0">
            <div className="text-slate-400 text-[9px] sm:text-[10px] font-bold uppercase truncate">Receipts</div>
            <div className="font-black text-white text-xs sm:text-sm mt-0.5 truncate">{payments.length} Records</div>
          </div>
        </div>
      </div>

      {/* 2. Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search receipt no, loan ID, reference, customer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-white rounded-2xl border-2 border-sky-100 shadow-xs focus:border-sky-500 focus:outline-none placeholder:text-slate-400"
        />
      </div>

      {/* 3. Method Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-black">
        {[
          { id: 'all', label: 'All Receipts', count: payments.length },
          { id: 'momo', label: 'MTN MoMo', count: payments.filter(p => p.paymentMethod === 'momo').length },
          { id: 'cash', label: 'Cash Hand', count: payments.filter(p => p.paymentMethod === 'cash').length },
          { id: 'bank', label: 'Bank', count: payments.filter(p => p.paymentMethod === 'bank').length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setMethodFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl transition shrink-0 flex items-center gap-1.5 border ${
              methodFilter === tab.id
                ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              methodFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 4. Payments List */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-slate-200 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="text-sm font-black text-slate-900">No payment receipts found</div>
          <div className="text-xs text-slate-400 max-w-xs mx-auto">
            {searchTerm ? `No receipts match "${searchTerm}"` : 'No payments under this category.'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map(p => {
            const customer = customerMap.get(p.customerId);
            const loan = loanMap.get(p.loanId);

            return (
              <div
                key={p.paymentId}
                className="bg-white rounded-2xl p-4 border-2 border-sky-100/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition hover:border-sky-400"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border shadow-xs ${
                    p.paymentMethod === 'momo' 
                      ? 'bg-amber-50 text-amber-700 border-amber-200' 
                      : p.paymentMethod === 'cash'
                      ? 'bg-sky-50 text-blue-700 border-sky-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}>
                    {p.paymentMethod === 'momo' ? <Smartphone className="w-5 h-5" /> :
                     p.paymentMethod === 'bank' ? <Building2 className="w-5 h-5" /> :
                     <DollarSign className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-950 truncate">
                        {customer?.fullName || p.customerId}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">#{p.paymentId}</span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-0.5 font-medium flex items-center gap-1.5 flex-wrap">
                      <span>Loan: <strong className="text-blue-800">{p.loanId}</strong></span>
                      <span>•</span>
                      <span>{formatDate(p.paymentDate)}</span>
                      {p.referenceNumber && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-blue-700">Ref: {p.referenceNumber}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Amount and Action buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <div className="text-sm sm:text-base font-black text-blue-700">
                      +{formatCurrency(p.amountPaid)}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {p.paymentMethod}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleShareWhatsAppReceipt(p)}
                      className="p-2 bg-sky-50 hover:bg-sky-100 text-blue-700 border border-sky-200 rounded-xl transition shadow-xs active:scale-95"
                      title="Share Receipt on WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDownloadReceipt(p)}
                      className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black flex items-center gap-1 transition shadow-xs active:scale-95"
                      title="Download PDF Receipt"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
