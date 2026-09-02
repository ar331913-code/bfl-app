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
  CreditCard,
  Upload,
  DollarSign,
  PlusCircle,
  TrendingDown,
  Sparkles,
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
  const [primaryTab, setPrimaryTab] = useState<'all' | 'owing' | 'debt_free'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'driver' | 'trader'>('all');

  // Map outstanding debt per customer
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

  // Apply search & profession filters
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
    <div className="space-y-4 pb-24 lg:pb-8 animate-fade-in text-slate-800">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border-2 border-slate-200 shadow-sm">
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-black text-slate-950 truncate">Clients & Borrowers Directory</h1>
          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
            {customers.length} total borrowers • {owingCustomers.length} currently owing • {debtFreeCustomers.length} debt-free
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={async () => {
              const res = await GoogleDriveBackupService.exportToGoogleDrive();
              if (res.message) alert(res.message);
            }}
            type="button"
            className="p-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 active:scale-95 text-xs font-bold rounded-2xl shadow-xs flex items-center gap-1.5 transition"
            title="Backup to Google Drive"
          >
            <Upload className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">Backup</span>
          </button>

          <button
            onClick={onOpenAddCustomer}
            type="button"
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-md transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Client</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Cards (3-Column on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Total Clients Card */}
        <div 
          onClick={() => setPrimaryTab('all')}
          className={`p-4 rounded-3xl border-2 cursor-pointer transition flex items-center justify-between ${
            primaryTab === 'all' 
              ? 'bg-slate-950 text-white border-slate-950 shadow-md' 
              : 'bg-white border-slate-200 hover:border-slate-400'
          }`}
        >
          <div>
            <div className={`text-[11px] font-bold uppercase ${primaryTab === 'all' ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Clients
            </div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">
              {customers.length}
            </div>
          </div>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
            primaryTab === 'all' ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Actively Owing Card */}
        <div 
          onClick={() => setPrimaryTab('owing')}
          className={`p-4 rounded-3xl border-2 cursor-pointer transition flex items-center justify-between ${
            primaryTab === 'owing' 
              ? 'bg-rose-600 text-white border-rose-600 shadow-md' 
              : 'bg-white border-rose-200 hover:border-rose-400'
          }`}
        >
          <div>
            <div className={`text-[11px] font-bold uppercase ${primaryTab === 'owing' ? 'text-rose-100' : 'text-rose-700'}`}>
              Actively Owing
            </div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">
              {formatCurrency(totalMoneyOwing)}
            </div>
            <div className={`text-[10px] font-bold ${primaryTab === 'owing' ? 'text-rose-200' : 'text-slate-500'}`}>
              {owingCustomers.length} clients ({overdueCount} overdue)
            </div>
          </div>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
            primaryTab === 'owing' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Debt-Free Card */}
        <div 
          onClick={() => setPrimaryTab('debt_free')}
          className={`p-4 rounded-3xl border-2 cursor-pointer transition flex items-center justify-between ${
            primaryTab === 'debt_free' 
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-md' 
              : 'bg-white border-emerald-200 hover:border-emerald-400'
          }`}
        >
          <div>
            <div className={`text-[11px] font-bold uppercase ${primaryTab === 'debt_free' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              Debt-Free / Cleared
            </div>
            <div className="text-xl sm:text-2xl font-black mt-0.5">
              {debtFreeCustomers.length} Clients
            </div>
            <div className={`text-[10px] font-bold ${primaryTab === 'debt_free' ? 'text-emerald-200' : 'text-slate-500'}`}>
              Ready for new disbursements
            </div>
          </div>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
            primaryTab === 'debt_free' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
          }`}>
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 3. Search Bar & Filter Row */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone number, Ghana Card, vehicle number, or market stall..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-semibold pl-10 pr-4 py-3 bg-white rounded-2xl border-2 border-slate-200 shadow-xs focus:border-emerald-500 focus:outline-none placeholder:text-slate-400"
          />
        </div>

        {/* Profession Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs font-black shrink-0">
          {[
            { id: 'all', label: `All (${sourceList.length})` },
            { id: 'driver', label: `Drivers (${sourceList.filter(c => c.customerType === 'driver').length})` },
            { id: 'trader', label: `Traders (${sourceList.filter(c => c.customerType === 'trader').length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id as any)}
              className={`px-3.5 py-2.5 rounded-2xl whitespace-nowrap transition border-2 ${
                typeFilter === tab.id
                  ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* 4. Robust Client List with Responsive Multi-Column Grid on Desktop */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border-2 border-dashed border-slate-200 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Users className="w-7 h-7" />
          </div>
          <div className="text-base font-black text-slate-950">
            {primaryTab === 'owing' 
              ? 'No owing clients found! 🎉' 
              : primaryTab === 'debt_free' 
              ? 'No debt-free clients found' 
              : 'No clients found'}
          </div>
          <div className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm ? `No results match "${searchTerm}"` : 'No clients match this filter.'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
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
                className={`bg-white rounded-3xl p-4 border-2 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between gap-3 group overflow-hidden ${
                  isOverdue 
                    ? 'border-rose-300 hover:border-rose-500 bg-rose-50/20' 
                    : isOwing 
                    ? 'border-rose-200 hover:border-rose-400' 
                    : 'border-slate-200 hover:border-emerald-500 bg-white'
                }`}
              >
                {/* Top Row: Avatar, Name, ID & Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-black text-sm shrink-0 border-2 border-slate-200 shadow-xs bg-slate-100">
                      {customer.photoUrl ? (
                        <img src={customer.photoUrl} alt={customer.fullName} className="w-full h-full object-cover rounded-full" />
                      ) : customer.customerType === 'driver' ? (
                        <Car className="w-5 h-5 text-emerald-700" />
                      ) : (
                        <Store className="w-5 h-5 text-teal-700" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs sm:text-sm font-black text-slate-950 truncate group-hover:text-emerald-700 transition leading-tight">
                          {customer.fullName}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono font-bold text-slate-400 truncate">
                        {customer.customerId} • {customer.customerType === 'driver' ? 'Commercial Driver' : 'Market Trader'}
                      </div>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="shrink-0">
                    {isOwing ? (
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shadow-xs ${
                        isOverdue ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {isOverdue ? 'OVERDUE' : 'OWING'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                        CLEAR
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Row: National ID & Contact Info */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Ghana Card:</span>
                    <span className="font-mono font-bold text-[11px] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      {maskGhanaCard(customer.ghanaCardNumber, true)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Phone:</span>
                    <span className="font-semibold text-slate-900">{formatGhanaPhone(customer.primaryPhone)}</span>
                  </div>

                  {customer.customerType === 'driver' && customer.driverDetails && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Vehicle / Station:</span>
                      <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                        {customer.driverDetails.registrationNumber} ({customer.driverDetails.stationLocation})
                      </span>
                    </div>
                  )}

                  {customer.customerType === 'trader' && customer.traderDetails && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Business / Market:</span>
                      <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                        {customer.traderDetails.businessName} ({customer.traderDetails.marketLocation})
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Row: Debt Summary & Fast Action Buttons */}
                <div 
                  className="flex items-center justify-between pt-2 border-t border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    {isOwing ? (
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Balance Due</div>
                        <div className="text-sm font-black text-rose-700">
                          {formatCurrency(debtInfo.totalOwing)}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Account Status</div>
                        <div className="text-xs font-black text-emerald-700">Eligible for Loan</div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Call Button */}
                    <a
                      href={`tel:${customer.primaryPhone}`}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      title="Call Client"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>

                    {/* WhatsApp Button */}
                    <a
                      href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                        isOwing 
                          ? `Hello ${customer.fullName}, this is a gentle reminder from B-F-L Microfinance regarding your active balance of ${formatCurrency(debtInfo?.totalOwing || 0)}.`
                          : `Hello ${customer.fullName}, greetings from B-F-L Microfinance. Thank you for your good repayment record with us.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition shadow-xs"
                      title="WhatsApp Message"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>

                    {/* Action Button: Collect or Issue */}
                    {isOwing && debtInfo?.activeLoanId && onOpenRecordPayment ? (
                      <button
                        type="button"
                        onClick={() => onOpenRecordPayment(debtInfo.activeLoanId)}
                        className="px-3 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Collect</span>
                      </button>
                    ) : onOpenNewLoan ? (
                      <button
                        type="button"
                        onClick={() => onOpenNewLoan(customer.customerId)}
                        className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Loan</span>
                      </button>
                    ) : null}
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
