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
  const [primaryTab, setPrimaryTab] = useState<'owing' | 'debt_free' | 'all'>('owing');
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
    <div className="space-y-3.5 pb-24 animate-fade-in text-slate-800">
      
      {/* 1. Slim Header & Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-black text-slate-950 truncate">Borrowers & Clients</h1>
          <p className="text-xs text-slate-500 font-medium truncate">
            {owingCustomers.length} owing • {debtFreeCustomers.length} debt-free
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={async () => {
              const res = await GoogleDriveBackupService.exportToGoogleDrive();
              if (res.message) alert(res.message);
            }}
            type="button"
            className="p-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 active:scale-95 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 transition"
            title="Backup to Google Drive"
          >
            <Upload className="w-4 h-4 text-emerald-700" />
          </button>

          <button
            onClick={onOpenAddCustomer}
            type="button"
            className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* 2. Compact View Switcher */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/75 rounded-2xl border border-slate-300/60 shadow-xs">
        <button
          onClick={() => setPrimaryTab('owing')}
          className={`py-2 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 truncate ${
            primaryTab === 'owing'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Owing ({owingCustomers.length})</span>
        </button>

        <button
          onClick={() => setPrimaryTab('debt_free')}
          className={`py-2 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 truncate ${
            primaryTab === 'debt_free'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Debt-Free ({debtFreeCustomers.length})</span>
        </button>

        <button
          onClick={() => setPrimaryTab('all')}
          className={`py-2 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 truncate ${
            primaryTab === 'all'
              ? 'bg-slate-950 text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">All ({customers.length})</span>
        </button>
      </div>

      {/* 3. Consolidated Slim 1-Line Sticky Summary Bar */}
      {primaryTab === 'owing' && (
        <div className="px-3.5 py-2 rounded-2xl bg-rose-50 border border-rose-200 shadow-xs flex items-center justify-between text-xs animate-fade-in gap-2 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 animate-pulse"></span>
            <span className="text-rose-950 font-bold truncate">
              {owingCustomers.length} active borrower{owingCustomers.length === 1 ? '' : 's'} ({overdueCount} late)
            </span>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-500 uppercase font-bold mr-1">Total:</span>
            <span className="font-black text-rose-700 text-sm whitespace-nowrap">{formatCurrency(totalMoneyOwing)}</span>
          </div>
        </div>
      )}

      {primaryTab === 'debt_free' && (
        <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs flex items-center justify-between text-xs animate-fade-in gap-2 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-emerald-950 font-bold truncate">
              {debtFreeCustomers.length} client{debtFreeCustomers.length === 1 ? '' : 's'} with 100% clean record
            </span>
          </div>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 uppercase">
            Eligible for New Loan
          </span>
        </div>
      )}

      {/* 4. Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by name, phone, Ghana Card..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-white rounded-2xl border-2 border-slate-200 shadow-xs focus:border-emerald-500 focus:outline-none placeholder:text-slate-400"
        />
      </div>

      {/* 5. Profession Quick Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs font-black">
        {[
          { id: 'all', label: `All (${sourceList.length})` },
          { id: 'driver', label: `Drivers (${sourceList.filter(c => c.customerType === 'driver').length})` },
          { id: 'trader', label: `Traders (${sourceList.filter(c => c.customerType === 'trader').length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setTypeFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition border ${
              typeFilter === tab.id
                ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 6. Robust Client List with 3-Column Flexbox Card Layout */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-slate-200 text-center space-y-2">
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
        <div className="space-y-2.5">
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
                className={`bg-white rounded-2xl sm:rounded-3xl p-3.5 border-2 shadow-xs transition cursor-pointer flex items-center justify-between gap-3 group overflow-hidden ${
                  isOverdue 
                    ? 'border-rose-300 hover:border-rose-500 bg-rose-50/20' 
                    : isOwing 
                    ? 'border-rose-200 hover:border-rose-400' 
                    : 'border-slate-200 hover:border-emerald-500 bg-white'
                }`}
              >
                {/* Column 1: Fixed 48x48px Avatar (50% border radius) */}
                <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-black text-sm shrink-0 border-2 border-slate-200 shadow-xs bg-slate-100">
                  {customer.photoUrl ? (
                    <img src={customer.photoUrl} alt={customer.fullName} className="w-full h-full object-cover rounded-full" />
                  ) : customer.customerType === 'driver' ? (
                    <Car className="w-5 h-5 text-emerald-700" />
                  ) : (
                    <Store className="w-5 h-5 text-teal-700" />
                  )}
                </div>

                {/* Column 2: Middle Metadata Column (Name, Ghana Card Badge, Phone + Loan Ref) */}
                <div className="flex flex-col gap-1 min-w-0 flex-1 overflow-hidden">
                  
                  {/* Row 1: Client Name & Customer ID */}
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs sm:text-sm font-black text-slate-950 truncate group-hover:text-emerald-700 transition leading-tight">
                      {customer.fullName}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                      ({customer.customerId})
                    </span>
                  </div>

                  {/* Row 2: National ID Badge (Ghana Card) */}
                  <div className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 max-w-fit truncate">
                    <CreditCard className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{maskGhanaCard(customer.ghanaCardNumber, true)}</span>
                  </div>

                  {/* Row 3: Phone Number and Active Loan Reference */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium truncate">
                    <span className="whitespace-nowrap">{formatGhanaPhone(customer.primaryPhone)}</span>
                    {isOwing && debtInfo?.activeLoanId && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-md shrink-0 whitespace-nowrap">
                          {debtInfo.activeLoanId}
                        </span>
                      </>
                    )}
                  </div>

                </div>

                {/* Column 3: Right Side Debt Status & Quick Actions */}
                <div 
                  className="flex flex-col items-end justify-between gap-1.5 shrink-0 self-stretch" 
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Top: Debt Pill */}
                  <div>
                    {isOwing ? (
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 whitespace-nowrap shadow-xs ${
                        isOverdue 
                          ? 'bg-rose-600 text-white animate-pulse' 
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {isOverdue && <AlertTriangle className="w-2.5 h-2.5 shrink-0" />}
                        <span>OWES {formatCurrency(debtInfo.totalOwing)}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300 inline-flex items-center gap-1 whitespace-nowrap shadow-xs">
                        <Check className="w-3 h-3 text-emerald-700" />
                        <span>100% Debt-Free</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom: Quick Actions (Pay / New Loan, WhatsApp, Call) */}
                  <div className="flex items-center gap-1">
                    {isOwing && onOpenRecordPayment ? (
                      <button
                        onClick={() => onOpenRecordPayment(debtInfo.activeLoanId)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] font-black rounded-lg shadow-xs transition flex items-center gap-1 whitespace-nowrap"
                        title="Record repayment"
                      >
                        <DollarSign className="w-3 h-3" />
                        <span>Pay</span>
                      </button>
                    ) : onOpenNewLoan ? (
                      <button
                        onClick={() => onOpenNewLoan(customer.customerId)}
                        className="px-2 py-1 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white text-[10px] font-black rounded-lg shadow-xs transition flex items-center gap-1 whitespace-nowrap"
                        title="Issue new loan"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>Loan</span>
                      </button>
                    ) : null}

                    {/* WhatsApp Quick Action */}
                    <a
                      href={`https://wa.me/${waPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition shadow-xs border border-emerald-200 shrink-0"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    </a>

                    {/* Phone Call Quick Action */}
                    <a
                      href={`tel:${customer.primaryPhone}`}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 transition shadow-xs border border-slate-200 shrink-0"
                      title="Call Client"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-700" />
                    </a>

                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-700 transition shrink-0 ml-0.5" />
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
