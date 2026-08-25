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
  Upload
} from 'lucide-react';
import { formatGhanaPhone, maskGhanaCard } from '../utils/formatters';
import { GoogleDriveBackupService } from '../services/googleDriveService';

interface CustomersProps {
  customers: Customer[];
  loans: Loan[];
  onSelectCustomer: (customer: Customer) => void;
  onOpenAddCustomer: () => void;
}

export const Customers: React.FC<CustomersProps> = ({
  customers,
  loans,
  onSelectCustomer,
  onOpenAddCustomer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'driver' | 'trader' | 'active' | 'overdue'>('all');

  const activeCustomerIds = new Set(
    loans.filter(l => (l.outstandingBalance || 0) > 0.01 && l.status !== 'completed' && l.status !== 'defaulted').map(l => l.customerId)
  );
  const overdueCustomerIds = new Set(
    loans.filter(l => (l.outstandingBalance || 0) > 0.01 && l.status === 'overdue').map(l => l.customerId)
  );

  const cleanQuery = searchTerm.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const filteredCustomers = customers.filter(c => {
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

    if (filterType === 'driver') return c.customerType === 'driver';
    if (filterType === 'trader') return c.customerType === 'trader';
    if (filterType === 'active') return activeCustomerIds.has(c.customerId);
    if (filterType === 'overdue') return overdueCustomerIds.has(c.customerId);

    return true;
  });

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-black text-navy-950">Clients Directory</h1>
          <p className="text-xs text-slate-500 font-medium">{customers.length} registered borrowers</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={async () => {
              const res = await GoogleDriveBackupService.exportToGoogleDrive();
              if (res.message) alert(res.message);
            }}
            type="button"
            className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-blue-800 border border-sky-300 active:scale-95 text-xs font-black rounded-xl shadow-xs flex items-center gap-1 transition"
            title="Transport all registered clients & photos to Google Drive"
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

      {/* Search Input by Telephone, Ghana Card, Name */}
      <div className="relative">
        <Search className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by phone number, Ghana Card, name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs font-semibold pl-9 pr-4 py-2.5 bg-white rounded-2xl border-2 border-sky-100 shadow-sm focus:border-sky-500 focus:outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Filter Tabs with High Contrast */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: `All (${customers.length})`, activeBg: 'bg-blue-900 text-white' },
          { id: 'driver', label: `Drivers (${customers.filter(c => c.customerType === 'driver').length})`, activeBg: 'bg-blue-700 text-white' },
          { id: 'trader', label: `Traders (${customers.filter(c => c.customerType === 'trader').length})`, activeBg: 'bg-sky-700 text-white' },
          { id: 'active', label: `Borrowing (${activeCustomerIds.size})`, activeBg: 'bg-indigo-700 text-white' },
          { id: 'overdue', label: `Overdue (${overdueCustomerIds.size})`, activeBg: 'bg-rose-700 text-white' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition border ${
              filterType === tab.id
                ? `${tab.activeBg} shadow-md border-transparent`
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Customers List */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div className="text-sm font-black text-navy-950">No clients found</div>
          <div className="text-xs text-slate-400 max-w-xs mx-auto">
            {searchTerm ? `No results match "${searchTerm}"` : 'No customers in this category yet.'}
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredCustomers.map(customer => {
            const hasActiveLoan = activeCustomerIds.has(customer.customerId);
            const isOverdue = overdueCustomerIds.has(customer.customerId);

            const cleanPhone = customer.primaryPhone.replace(/\D/g, '');
            const waPhone = cleanPhone.startsWith('0') ? '233' + cleanPhone.slice(1) : cleanPhone;

            return (
              <div
                key={customer.customerId}
                onClick={() => onSelectCustomer(customer)}
                className={`bg-white rounded-2xl p-3.5 border-2 shadow-sm transition cursor-pointer flex items-center justify-between group ${
                  isOverdue 
                    ? 'border-rose-200 hover:border-rose-400 bg-rose-50/20' 
                    : hasActiveLoan 
                    ? 'border-blue-200 hover:border-blue-400' 
                    : 'border-slate-200/80 hover:border-sky-400'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Photo / Avatar */}
                  <div className={`w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center font-black text-sm shrink-0 border-2 shadow-sm ${
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

                  {/* Customer Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-navy-950 truncate group-hover:text-blue-700 transition">
                        {customer.fullName}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">({customer.customerId})</span>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5 truncate font-medium">
                      <span>{formatGhanaPhone(customer.primaryPhone)}</span>
                      <span>•</span>
                      <span className={`font-bold capitalize ${customer.customerType === 'driver' ? 'text-blue-700' : 'text-sky-700'}`}>
                        {customer.customerType}
                      </span>
                    </div>

                    {/* Ghana Card Pin */}
                    <div className="text-[10px] text-blue-800 font-mono font-bold mt-0.5 flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-sky-600 shrink-0" />
                      <span>{maskGhanaCard(customer.ghanaCardNumber, true)}</span>
                    </div>
                  </div>
                </div>

                {/* Right side status badge and actions */}
                <div className="flex items-center gap-2 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                  {isOverdue ? (
                    <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <AlertTriangle className="w-3 h-3" /> Overdue
                    </span>
                  ) : hasActiveLoan ? (
                    <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-sm">
                      Active Loan
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-sky-50 text-blue-700 px-2 py-0.5 rounded-full border border-sky-200">
                      Clear
                    </span>
                  )}

                  {/* WhatsApp Quick Action */}
                  <a
                    href={`https://wa.me/${waPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-sky-50 text-blue-700 hover:bg-sky-100 transition shadow-xs border border-sky-200"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4 text-blue-600" />
                  </a>

                  {/* Phone Call Quick Action */}
                  <a
                    href={`tel:${customer.primaryPhone}`}
                    className="p-2 rounded-xl bg-blue-50 text-blue-800 hover:bg-blue-100 transition shadow-xs border border-blue-200"
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
