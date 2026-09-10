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
  MessageSquare,
  Send,
  X,
  Check,
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
import { SMSService } from '../services/smsService';
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

  const customerMap = new Map((customers || []).filter(c => c && c.customerId).map(c => [c.customerId, c]));
  const loanMap = new Map((loans || []).filter(l => l && l.loanId).map(l => [l.loanId, l]));

  const totalCollected = (payments || []).reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const cashCollected = (payments || []).filter(p => p.paymentMethod === 'cash' || !p.paymentMethod).reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const momoCollected = (payments || []).filter(p => p.paymentMethod === 'momo').reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const bankCollected = (payments || []).filter(p => p.paymentMethod === 'bank').reduce((sum, p) => sum + (p.amountPaid || 0), 0);

  const filteredPayments = (payments || []).filter(p => {
    if (!p) return false;
    const cust = customerMap.get(p.customerId);
    const matchesSearch = 
      (p.paymentId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.loanId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.customerId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.referenceNumber && p.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cust && cust.fullName && cust.fullName.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (methodFilter !== 'all') {
      if (methodFilter === 'cash') {
        if (p.paymentMethod && p.paymentMethod !== 'cash') return false;
      } else {
        if (p.paymentMethod !== methodFilter) return false;
      }
    }

    return true;
  }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const [smsModalState, setSmsModalState] = useState<{
    isOpen: boolean;
    customer: Customer;
    payment: Payment;
    loan?: Loan;
    messageText: string;
    statusNotice?: string;
  } | null>(null);

  const handleDownloadReceipt = (payment: Payment) => {
    const cust = customerMap.get(payment.customerId);
    const loan = loanMap.get(payment.loanId);
    if (cust && loan) {
      generatePaymentReceiptPDF(cust, loan, payment);
    }
  };

  const handleOpenSMSReceiptModal = (payment: Payment) => {
    const cust = customerMap.get(payment.customerId);
    const loan = loanMap.get(payment.loanId);
    if (!cust) return;

    const text = loan
      ? SMSService.generatePaymentReceiptSMS({
          customer: cust,
          loan,
          payment,
          businessName: settings?.businessName,
          businessPhone: settings?.businessPhone
        })
      : `B-F-L RECEIPT: Dear ${cust.fullName}, payment of GH₵${payment.amountPaid.toFixed(2)} received on ${formatDate(payment.paymentDate)} (Receipt: ${payment.paymentId}, Loan: ${payment.loanId}). Thank you, ${settings?.businessName || 'B-F-L'}.`;

    setSmsModalState({
      isOpen: true,
      customer: cust,
      payment,
      loan,
      messageText: text
    });
  };

  const handleSendSMSNow = () => {
    if (!smsModalState) return;
    const { customer, messageText } = smsModalState;
    SMSService.dispatchSMS(customer.primaryPhone, messageText, settings);
    setSmsModalState(prev => prev ? {
      ...prev,
      statusNotice: `SMS Receipt dispatched to ${formatGhanaPhone(customer.primaryPhone)}!`
    } : null);
  };

  const handleShareWhatsAppReceipt = (payment: Payment) => {
    const cust = customerMap.get(payment.customerId);
    const loan = loanMap.get(payment.loanId);
    if (!cust || !loan) return;

    const isCompleted = loan.status === 'completed' || (loan.outstandingBalance || 0) <= 0.01;
    const finalDueDate = loan.maturityDate ? formatDate(loan.maturityDate) : '';
    const balanceLine = isCompleted
      ? `*STATUS: 100% FULLY PAID OFF! 🎉*\nRemaining Balance: GH₵0.00`
      : `Remaining Balance: GH₵${loan.outstandingBalance.toFixed(2)}${finalDueDate ? `\nFinal Due Date: ${finalDueDate}` : ''}`;

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
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 active:scale-95 text-white text-xs font-black rounded-2xl shadow-md flex items-center gap-1.5 transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Record Payment</span>
        </button>
      </div>

      {/* 2. Top Summary KPI Cards (4-Column on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Total Collected Card */}
        <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 rounded-3xl p-4 sm:p-5 text-white shadow-xl border border-sky-500/30 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-300 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Collected</span>
            <Receipt className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {formatCurrency(totalCollected)}
          </div>
          <div className="text-[10px] text-sky-300 font-medium mt-1">
            {payments.length} receipts
          </div>
        </div>

        {/* MTN MoMo Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-amber-300 shadow-sm flex flex-col justify-between bg-gradient-to-br from-amber-50/40 to-white">
          <div className="flex items-center justify-between text-amber-900 text-xs font-bold uppercase tracking-wider mb-2">
            <span>MTN MoMo</span>
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-xs">
              MoMo
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight">
            {formatCurrency(momoCollected)}
          </div>
          <div className="text-[10px] text-amber-800 font-medium mt-1">
            Mobile money transfers
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
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(cashCollected)}
          </div>
          <div className="text-[10px] text-emerald-700 font-medium mt-1">
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
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(bankCollected)}
          </div>
          <div className="text-[10px] text-indigo-700 font-medium mt-1">
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
            { id: 'momo', label: `MTN MoMo (${payments.filter(p => p.paymentMethod === 'momo').length})` },
            { id: 'cash', label: `Cash (${payments.filter(p => p.paymentMethod === 'cash' || !p.paymentMethod).length})` },
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
                    payment.paymentMethod === 'momo'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : payment.paymentMethod === 'bank'
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {payment.paymentMethod === 'momo' ? (
                      <span className="font-extrabold text-[9px] bg-amber-400 text-slate-950 px-1 rounded">MoMo</span>
                    ) : payment.paymentMethod === 'bank' ? (
                      <Building2 className="w-3 h-3" />
                    ) : (
                      <DollarSign className="w-3 h-3" />
                    )}
                    <span>{payment.paymentMethod === 'momo' ? 'MTN MoMo' : (payment.paymentMethod || 'cash')}</span>
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

                {/* Bottom Row: Actions (SMS Receipt, PDF Receipt, WhatsApp Share) */}
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleOpenSMSReceiptModal(payment)}
                    className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-blue-700 text-xs font-bold rounded-xl transition flex items-center gap-1 border border-sky-200 shadow-xs cursor-pointer active:scale-95"
                    title="Send Receipt via SMS"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>SMS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadReceipt(payment)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                    title="Download Official PDF Receipt"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-700" />
                    <span>PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareWhatsAppReceipt(payment)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-xs cursor-pointer"
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

      {/* SMS Receipt Modal Dialog */}
      {smsModalState && smsModalState.isOpen && (
        <div 
          onClick={() => setSmsModalState(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-scale-in"
          >
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white">Send SMS Receipt</h3>
                  <p className="text-[10px] text-sky-200">
                    Receipt #{smsModalState.payment.paymentId}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSmsModalState(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-bold">Recipient:</span>
                  <span className="font-black text-slate-900">{smsModalState.customer.fullName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-bold">Phone Number:</span>
                  <span className="font-mono font-bold text-blue-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {formatGhanaPhone(smsModalState.customer.primaryPhone)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-bold">Amount Paid:</span>
                  <span className="font-black text-emerald-700">{formatCurrency(smsModalState.payment.amountPaid)}</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-700 block mb-1">
                  SMS Message Text (Editable):
                </label>
                <textarea
                  value={smsModalState.messageText}
                  onChange={(e) => setSmsModalState(prev => prev ? { ...prev, messageText: e.target.value } : null)}
                  className="w-full text-xs font-medium p-3 bg-white rounded-2xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none text-slate-800 resize-none h-28 leading-relaxed shadow-inner"
                  placeholder="Type or edit SMS receipt message..."
                />
              </div>

              {smsModalState.statusNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-[11px] flex items-center gap-1.5 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{smsModalState.statusNotice}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSmsModalState(null)}
                className="flex-1 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendSMSNow}
                className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send SMS Now</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
