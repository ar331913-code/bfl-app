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
  Share2, 
  ChevronRight,
  Filter
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { generatePaymentReceiptPDF } from '../services/exportService';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const customerMap = new Map(customers.map(c => [c.customerId, c]));
  const loanMap = new Map(loans.map(l => [l.loanId, l]));

  const totalCollected = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

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

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-black text-navy-950">Payment Collections</h1>
          <p className="text-xs text-slate-500 font-medium">Total Remitted: <strong className="text-blue-700 font-black">{formatCurrency(totalCollected)}</strong></p>
        </div>

        <button
          onClick={onOpenRecordPayment}
          type="button"
          className="px-3.5 py-2 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition"
        >
          <Plus className="w-4 h-4" /> Record Pay
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search receipt no, loan ID, reference, customer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs font-semibold pl-9 pr-4 py-2.5 bg-white rounded-2xl border-2 border-sky-100 shadow-sm focus:border-sky-500 focus:outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Method Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: `All Receipts (${payments.length})`, activeBg: 'bg-blue-900 text-white' },
          { id: 'momo', label: `MoMo (${payments.filter(p => p.paymentMethod === 'momo').length})`, activeBg: 'bg-amber-600 text-white' },
          { id: 'cash', label: `Cash (${payments.filter(p => p.paymentMethod === 'cash').length})`, activeBg: 'bg-blue-700 text-white' },
          { id: 'bank', label: `Bank (${payments.filter(p => p.paymentMethod === 'bank').length})`, activeBg: 'bg-indigo-700 text-white' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setMethodFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition border ${
              methodFilter === tab.id
                ? `${tab.activeBg} shadow-md border-transparent`
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="text-sm font-black text-navy-950">No payment receipts found</div>
          <div className="text-xs text-slate-400 max-w-xs mx-auto">
            {searchTerm ? `No receipts match "${searchTerm}"` : 'No payments under this category.'}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredPayments.map(p => {
            const customer = customerMap.get(p.customerId);

            return (
              <div
                key={p.paymentId}
                className="bg-white rounded-2xl p-4 border-2 border-sky-100 shadow-sm flex items-center justify-between transition hover:border-sky-400"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-sky-200 shadow-xs">
                    {p.paymentMethod === 'momo' ? <Smartphone className="w-5 h-5" /> :
                     p.paymentMethod === 'bank' ? <Building2 className="w-5 h-5" /> :
                     <DollarSign className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-navy-950">
                        {customer?.fullName || p.customerId}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400">({p.paymentId})</span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                      Loan: <strong className="text-blue-800">{p.loanId}</strong> • {formatDate(p.paymentDate)}
                    </div>

                    {p.referenceNumber && (
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                        Ref: {p.referenceNumber}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1.5">
                  <div className="text-sm font-black text-blue-700">
                    +{formatCurrency(p.amountPaid)}
                  </div>

                  <button
                    onClick={() => handleDownloadReceipt(p)}
                    className="px-2.5 py-1 bg-gradient-to-r from-sky-50 to-blue-100 hover:from-sky-100 hover:to-blue-200 border border-sky-200 rounded-lg text-[10px] font-black text-blue-800 flex items-center gap-1 transition shadow-xs"
                    title="Download PDF Receipt"
                  >
                    <Download className="w-3 h-3 text-blue-600" /> Receipt
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
