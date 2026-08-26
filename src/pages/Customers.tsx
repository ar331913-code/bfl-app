import React, { useState } from 'react';
import { Customer, Loan } from '../types';
import { 
  Users, 
  Search, 
  Plus, 
  Car, 
  Store, 
  Phone, 
  MessageCircle, 
  ChevronRight, 
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Upload,
  DollarSign,
  PlusCircle,
  Banknote,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Check
} from 'lucide-react';
import { formatCurrency, formatGhanaPhone, maskGhanaCard, isLoanOwing, getTrueOutstanding } from '../utils/formatters';
import { GoogleDriveBackupService } from '../services/googleDriveService';

interface CustomersProps {
  customers: Customer[];
  loans: Loan[];
  onSelectCustomer: (customer: Customer) => void;
  onOpenAddCustomer: () => void;
  onOpenNewLoan?: (customerId: string) => void;
  onOpenRecordPayment?: (loanId: string) => void;
}

export const Customers: React.FC<CustomersProps> = ({
  customers,
  loans,
  onSelectCustomer,
  onOpenAddCustomer,
  onOpenNewLoan,
  onOpenRecordPayment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [primaryTab, setPrimaryTab] = useState<'owing' | 'debt_free' | 'all'>('owing');
  const [typeFilter, setTypeFilter] = useState<'all' | 'driver' | 'trader'>('all');

  // Customer debt maps
  const owingCustomerMap = new Map<string, { totalOwing: number; activeLoanId: string; isOverdue: boolean }>();
  for (const loan of loans) {
    if (isLoanOwing(loan)) {
      const balance = getTrueOutstanding(loan);
      const prev = owingCustomerMap.get(loan.customerId);
      const isOverdue = loan.status === 'overdue' || (prev?.isOverdue ?? false);
      owingCustomerMap.set(loan.customerId, {
        totalOwing: (prev?.totalOwing || 0) + balance,
        activeLoanId: loan.loanId,
        isOverdue
      });
    }
  }

  const owingCustomers = customers.filter(c => owingCustomerMap.has(c.customerId));
  const debtFreeCustomers = customers.filter(c => !owingCustomerMap.has(c.customerId));

  const totalMoneyOwing = Array.from(owingCustomerMap.values()).reduce((sum, item) => sum + item.totalOwing, 0);
  const overdueCount = Array.from(owingCustomerMap.values()).filter(item => item.isOverdue).length;

  const cleanQuery = searchTerm.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  // Select list based on primary tab
  let sourceList: Customer[] = [];
  if (primaryTab === 'owing') sourceList = owingCustomers;
  else if (primaryTab === 'debt_free') sourceList = debtFreeCustomers;
  else sourceList = customers;

  // Apply search & type filters
  const filteredCustomers = sourceList.filter(c => {
    const matchesSearch = 
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.primaryPhone.includes(searchTerm) ||
      c.primaryPhone.replace(/\D/g, '').includes(cleanQuery) ||
      c.ghanaCardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.ghanaCardNumber.replace(/[^A-Za-z0-9]/g, '').toLowerCase().includes(cleanQuery) ||
      c.driverDetails?.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.driverDetails?.stationLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.traderDetails?.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.traderDetails?.marketLocation.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (typeFilter === 'driver') return c.customerType === 'driver';
    if (typeFilter === 'trader') return c.customerType === 'trader';

    return true;
  });

  return (
    <div className="space-y-4 pb-24 animate-fade-in text-slate-800">
      
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-black text-slate-950">Clients Directory</h1>
          <p className="text-xs text-slate-500 font-medium">
            {owingCustomers.length} owing • {debtFreeCustomers.length} debt-free • {customers.length} total
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={async () => {
              const res = await GoogleDriveBackupService.exportToGoogleDrive();
              if (res.message) alert(res.message);
            }}
            type="button"
            className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-blue-900 border border-sky-300 active:scale-95 text-xs font-black rounded-xl shadow-xs flex items-center gap-1 transition"
            title="Export all clients to Google Drive"
          >
            <Upload className="w-3.5 h-3.5 text-blue-700" />
            <span>Drive</span>
          </button>

          <button
            onClick={onOpenAddCustomer}
            type="button"
            className="px-3.5 py-2 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" /> Add Client
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MASTER VIEW SWITCHER: OWING CLIENTS vs DEBT-FREE CLIENTS vs ALL */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/80 rounded-2xl border border-slate-300/60 shadow-xs">
        <button
          onClick={() => setPrimaryTab('owing')}
          className={`py-2.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            primaryTab === 'owing'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Owing ({owingCustomers.length})</span>
        </button>

        <button
          onClick={() => setPrimaryTab('debt_free')}
          className={`py-2.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            primaryTab === 'debt_free'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Debt-Free ({debtFreeCustomers.length})</span>
        </button>

        <button
          onClick={() => setPrimaryTab('all')}
          className={`py-2.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            primaryTab === 'all'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>All ({customers.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. DEDICATED PORTFOLIO SUMMARY CARD */}
      {/* ========================================================================= */}
      {primaryTab === 'owing' && (
        <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-50 via-rose-100/60 to-red-50 border-2 border-rose-300 shadow-sm flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-black text-rose-950 uppercase tracking-wider">
                Owing Borrowers Portfolio
              </div>
              <div className="text-[11px] text-rose-700 font-medium">
                {owingCustomers.length} active borrower{owingCustomers.length === 1 ? '' : 's'} • {overdueCount} overdue
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-rose-600 block">Total Unpaid Debt</span>
            <span className="text-base sm:text-lg font-black text-rose-800">
              {formatCurrency(totalMoneyOwing)}
            </span>
          </div>
        </div>
      )}

      {primaryTab === 'debt_free' && (
        <div className="p-4 rounded-3xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 border-2 border-sky-300 shadow-sm flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-black text-blue-950 uppercase tracking-wider">
                100% Debt-Free Clients
              </div>
              <div className="text-[11px] text-blue-700 font-medium">
                {debtFreeCustomers.length} client{debtFreeCustomers.length === 1 ? '' : 's'} with GH₵0.00 balance
              </div>
            </div>
          </div>

          <span className="bg-sky-100 text-blue-900 border border-sky-300 text-[10px] font-black px-3 py-1.5 rounded-full uppercase shrink-0">
            Clean & Eligible
          </span>
        </div>
      )}

      {/* Search Input by Telephone, Ghana Card, Name */}
      <div className="relative">
        <Search className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder={`Search ${primaryTab === 'owing' ? 'owing' : primaryTab === 'debt_free' ? 'debt-free' : 'all'} clients by phone, card, name...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs font-semibold pl-9 pr-4 py-2.5 bg-white rounded-2xl border-2 border-sky-100 shadow-xs focus:border-sky-500 focus:outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Profession Sub-Filter (Drivers vs Traders vs All) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: `All Professions (${sourceList.length})` },
          { id: 'driver', label: `Drivers (${sourceList.filter(c => c.customerType === 'driver').length})` },
          { id: 'trader', label: `Traders (${sourceList.filter(c => c.customerType === 'trader').length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setTypeFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition border ${
              typeFilter === tab.id
                ? 'bg-blue-900 text-white shadow-xs border-transparent'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 3. CUSTOMER LIST */}
      {/* ========================================================================= */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div className="text-sm font-black text-slate-950">
            {primaryTab === 'owing' 
              ? 'No owing clients found! 🎉' 
              : primaryTab === 'debt_free' 
              ? 'No debt-free clients found' 
              : 'No clients found'}
          </div>
          <div className="text-xs text-slate-400 max-w-xs mx-auto">
            {searchTerm ? `No results match "${searchTerm}"` : 'No clients match this filter.'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map(customer => {
            const debtInfo = owingCustomerMap.get(customer.customerId);
            const isOwing = !!debtInfo && debtInfo.totalOwing > 0.01;
            const isOverdue = debtInfo?.isOverdue ?? false;

            const cleanPhone = customer.primaryPhone.replace(/\D/g, '');
            const waPhone = cleanPhone.startsWith('0') ? '233' + cleanPhone.slice(1) : cleanPhone;

            return (
              <div
                key={customer.customerId}
                onClick={() => onSelectCustomer(customer)}
                className={`bg-white rounded-3xl p-4 border-2 shadow-xs transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                  isOverdue 
                    ? 'border-rose-300 hover:border-rose-500 bg-rose-50/30' 
                    : isOwing 
                    ? 'border-rose-200 hover:border-rose-400' 
                    : 'border-sky-200 hover:border-blue-500 bg-sky-50/20'
                }`}
              >
                {/* Left Client Profile */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-13 h-13 rounded-2xl overflow-hidden flex items-center justify-center font-black text-base shrink-0 border-2 shadow-xs ${
                    customer.customerType === 'driver' 
                      ? 'bg-blue-100 text-blue-800 border-blue-200' 
                      : 'bg-sky-100 text-sky-800 border-sky-200'
                  }`}>
                    {customer.photoUrl ? (
                      <img src={customer.photoUrl} alt={customer.fullName} className="w-full h-full object-cover" />
                    ) : customer.customerType === 'driver' ? (
                      <Car className="w-6 h-6 text-blue-700" />
                    ) : (
                      <Store className="w-6 h-6 text-sky-700" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-950 truncate group-hover:text-blue-700 transition">
                        {customer.fullName}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                        {customer.customerId}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5 font-medium">
                      <span>{formatGhanaPhone(customer.primaryPhone)}</span>
                      <span>•</span>
                      <span className="font-bold capitalize text-slate-700">
                        {customer.customerType}
                      </span>
                    </div>

                    {/* Ghana Card Pin */}
                    <div className="text-[10px] text-sky-900 font-mono font-bold mt-0.5 flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-sky-600 shrink-0" />
                      <span>{maskGhanaCard(customer.ghanaCardNumber, true)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side Debt Status & 1-Tap Action Buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100" onClick={(e) => e.stopPropagation()}>
                  
                  {/* Status Indicator / Balance */}
                  <div className="text-left sm:text-right">
                    {isOwing ? (
                      <div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          isOverdue ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {isOverdue && <AlertTriangle className="w-3 h-3" />}
                          Owes {formatCurrency(debtInfo.totalOwing)}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                          Loan {debtInfo.activeLoanId}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black bg-sky-100 text-blue-900 px-2.5 py-1 rounded-full border border-sky-300 inline-flex items-center gap-1">
                        <Check className="w-3 h-3 text-blue-600" />
                        100% Debt-Free
                      </span>
                    )}
                  </div>

                  {/* Primary 1-Tap Action */}
                  {isOwing && onOpenRecordPayment ? (
                    <button
                      onClick={() => onOpenRecordPayment(debtInfo.activeLoanId)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[11px] font-black rounded-xl shadow-xs transition flex items-center gap-1"
                      title="Record repayment for this client"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Pay</span>
                    </button>
                  ) : onOpenNewLoan ? (
                    <button
                      onClick={() => onOpenNewLoan(customer.customerId)}
                      className="px-3 py-1.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-[11px] font-black rounded-xl shadow-xs transition flex items-center gap-1"
                      title="Issue new loan to this debt-free client"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>New Loan</span>
                    </button>
                  ) : null}

                  {/* WhatsApp Quick Action */}
                  <a
                    href={`https://wa.me/${waPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition shadow-xs border border-blue-200"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4 text-blue-600" />
                  </a>

                  {/* Phone Call Quick Action */}
                  <a
                    href={`tel:${customer.primaryPhone}`}
                    className="p-2 rounded-xl bg-sky-50 text-blue-800 hover:bg-sky-100 transition shadow-xs border border-sky-200"
                    title="Call Client"
                  >
                    <Phone className="w-4 h-4 text-blue-700" />
                  </a>

                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-700 transition" />
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
