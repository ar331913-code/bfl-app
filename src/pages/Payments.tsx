import React, { useState } from 'react';
import { Customer, Loan, Payment } from '../types';
import { 
  Receipt, 
  Search, 
  Plus, 
  DollarSign, 
  Building2, 
  Download, 
  MessageCircle, 
  ChevronRight,
  Filter,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Calendar,
  CreditCard
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
  const cashCollected = payments.filter(p => p.paymentMethod === 'cash' || !p.paymentMethod).reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const bankCollected = payments.filter(p => p.paymentMethod === 'bank').reduce((sum, p) => sum + (p.amountPaid || 0), 0);

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
      `Method: ${(payment.paymentMethod || 'CASH').toUpperCase()}\n` +
      `Date: ${payment.paymentDate}\n` +
      `${balanceLine}\n\n` +
      `Thank you for your repayment! - ${settings?.businessName || 'B-F-L'}`;

    const cleanPhone = cust.primaryPhone.replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('0') ? '233' + cleanPhone.slice(1) : cleanPhone;
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-24 lg:pb-8 animate-fade-in text-slate-800">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border-2 border-slate-200 shadow-sm">
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-black text-slate-950 truncate">Collections & Payment History</h1>
          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
            {payments.length} total payments recorded • {formatCurrency(totalCollected)} cumulative collections
          </p>
        </div>

        <button
          onClick={onOpenRecordPayment}
          type="button"
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 active:scale-95 text-white text-xs font-black rounded-2xl shadow-md flex items-center gap-1.5 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Record Repayment</span>
        </button>
      </div>

      {/* 2. Top Summary KPI Cards (3-Column on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Total Collected Card */}
        <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 rounded-3xl p-4 sm:p-5 text-white shadow-xl border border-sky-500/30 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-300 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Collected</span>
            <Receipt className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {formatCurrency(totalCollected)}
          </div>
          <div className="text-[11px] text-sky-300 font-medium mt-1">
            {payments.length} successful receipts issued
          </div>
        </div>

        {/* Cash Hand Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-emerald-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Cash Hand</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(cashCollected)}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Physical cash collections
          </div>
        </div>

        {/* Bank Transfer Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-indigo-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-800 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Bank Transfer</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(bankCollected)}
          </div>
          <div className="text-[11px] text-indigo-700 font-medium mt-1">
            Direct bank deposits
          </div>
        </div>

      </div>

      {/* 3. Search and Payment Channel Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, Loan ID, Payment ID, or Ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-semibold pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white shadow-xs"
          />
        </div>

        {/* Method Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-black shrink-0">
          {[
            { id: 'all', label: `All (${payments.length})` },
            { id: 'cash', label: `Cash Hand (${payments.filter(p => p.paymentMethod === 'cash' || !p.paymentMethod).length})` },
            { id: 'bank', label: `Bank (${payments.filter(p => p.paymentMethod === 'bank').length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMethodFilter(tab.id)}
              className={`px-3.5 py-2.5 rounded-2xl transition shrink-0 border-2 ${
                methodFilter === tab.id
                  ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* 4. Payment Records Responsive Grid */}
      {filteredPayments.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Receipt className="w-7 h-7" />
          </div>
          <div className="text-base font-black text-slate-950">No payments found</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm ? `No results match "${searchTerm}"` : 'No repayment transactions recorded for this filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPayments.map(payment => {
            const customer = customerMap.get(payment.customerId);
            const loan = loanMap.get(payment.loanId);

            return (
              <div
                key={payment.paymentId}
                className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between gap-3.5 group overflow-hidden"
              >
                {/* Top Row: Amount & Channel Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg sm:text-xl font-black text-emerald-700">
                      +{formatCurrency(payment.amountPaid)}
                    </div>
                    <div className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">
                      {payment.paymentId} • {formatDate(payment.paymentDate)}
                    </div>
                  </div>

                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl uppercase shrink-0 shadow-xs flex items-center gap-1 ${
                    payment.paymentMethod === 'bank'
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {payment.paymentMethod === 'bank' ? <Building2 className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                    <span>{payment.paymentMethod || 'cash'}</span>
                  </span>
                </div>

                {/* Middle Info: Customer & Loan Reference */}
                <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Client Name:</span>
                    <span className="font-black text-slate-900 truncate max-w-[160px]">
                      {customer?.fullName || payment.customerId}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Loan Account:</span>
                    <span className="font-mono font-bold text-blue-700">
                      {payment.loanId}
                    </span>
                  </div>

                  {payment.referenceNumber && (
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Reference:</span>
                      <span className="font-mono text-slate-600 truncate max-w-[160px]">
                        {payment.referenceNumber}
                      </span>
                    </div>
                  )}

                  {loan && (
                    <div className="flex items-center justify-between text-slate-700 pt-1 border-t border-slate-200/60">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Remaining Debt:</span>
                      <span className={`font-black ${loan.outstandingBalance <= 0.01 ? 'text-emerald-700' : 'text-slate-900'}`}>
                        {loan.outstandingBalance <= 0.01 ? 'PAID OFF 🎉' : formatCurrency(loan.outstandingBalance)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Actions (Download PDF Receipt, WhatsApp Share) */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleDownloadReceipt(payment)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                    title="Download Official PDF Receipt"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-700" />
                    <span>PDF Receipt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareWhatsAppReceipt(payment)}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                    title="Share Receipt on WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
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
