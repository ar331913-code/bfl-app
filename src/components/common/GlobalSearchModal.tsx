import React, { useState, useEffect, useRef } from 'react';
import { Customer, Loan } from '../../types';
import { Search, X, User, Banknote, Car, Store, ArrowRight, Phone, CreditCard } from 'lucide-react';
import { formatCurrency, formatGhanaPhone, maskGhanaCard } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  loans: Loan[];
  onSelectCustomer: (customer: Customer) => void;
  onSelectLoan: (loan: Loan) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  customers,
  loans,
  onSelectCustomer,
  onSelectLoan
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const rawQuery = query.trim().toLowerCase();
  const cleanDigits = query.replace(/[^a-z0-9]/gi, '').toLowerCase();

  // Search Customers
  const filteredCustomers = rawQuery
    ? customers.filter(c => {
        const nameMatch = c.fullName.toLowerCase().includes(rawQuery);
        const idMatch = c.customerId.toLowerCase().includes(rawQuery);
        const phoneMatch = c.primaryPhone.includes(rawQuery) || c.primaryPhone.replace(/\D/g, '').includes(cleanDigits);
        const cardMatch = c.ghanaCardNumber.toLowerCase().includes(rawQuery) || c.ghanaCardNumber.replace(/[^A-Za-z0-9]/g, '').toLowerCase().includes(cleanDigits);
        const driverMatch = c.driverDetails?.registrationNumber.toLowerCase().includes(rawQuery) || c.driverDetails?.stationLocation.toLowerCase().includes(rawQuery);
        const traderMatch = c.traderDetails?.businessName.toLowerCase().includes(rawQuery) || c.traderDetails?.marketLocation.toLowerCase().includes(rawQuery);
        return nameMatch || idMatch || phoneMatch || cardMatch || driverMatch || traderMatch;
      }).slice(0, 6)
    : [];

  // Search Loans
  const filteredLoans = rawQuery
    ? loans.filter(l => {
        const idMatch = l.loanId.toLowerCase().includes(rawQuery);
        const custIdMatch = l.customerId.toLowerCase().includes(rawQuery);
        const custNameMatch = l.customerName && l.customerName.toLowerCase().includes(rawQuery);
        return idMatch || custIdMatch || custNameMatch;
      }).slice(0, 6)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-navy-950/80 backdrop-blur-sm animate-fade-in p-4 sm:p-6 justify-start pt-14">
      <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200">
        
        {/* Search Input Header */}
        <div className="p-4 border-b border-sky-100 flex items-center gap-3 bg-gradient-to-r from-sky-50 to-blue-50">
          <Search className="w-5 h-5 text-sky-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search telephone, Ghana Card, name, loan..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-xs font-bold text-navy-950 focus:outline-none placeholder:text-slate-400 bg-transparent"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-slate-400 hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={onClose}
            className="text-xs font-bold text-slate-600 hover:text-navy-950 px-2.5 py-1 bg-white rounded-xl border border-slate-200 shadow-xs"
          >
            Cancel
          </button>
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto p-4 space-y-4">
          {!rawQuery && (
            <div className="text-center py-8 text-slate-400 text-xs">
              Type a telephone number, Ghana Card PIN, client name, or Loan ID to search.
            </div>
          )}

          {rawQuery && filteredCustomers.length === 0 && filteredLoans.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs">
              No matching clients or loans found for "{query}".
            </div>
          )}

          {/* Customer Results */}
          {filteredCustomers.length > 0 && (
            <div>
              <div className="text-[11px] font-black text-sky-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Matching Clients ({filteredCustomers.length})</span>
                <span className="text-[10px] text-slate-400 font-normal">Tap to view dossier</span>
              </div>
              <div className="space-y-2">
                {filteredCustomers.map(cust => (
                  <div
                    key={cust.customerId}
                    onClick={() => {
                      onSelectCustomer(cust);
                      onClose();
                    }}
                    className="p-3 rounded-2xl bg-white hover:bg-sky-50/80 border-2 border-slate-200/80 hover:border-sky-400 flex items-center justify-between cursor-pointer transition shadow-xs group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-50 to-blue-100 flex items-center justify-center font-bold text-sky-700 text-xs shrink-0 border border-sky-200">
                        {cust.customerType === 'driver' ? <Car className="w-5 h-5 text-blue-600" /> : <Store className="w-5 h-5 text-emerald-600" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-navy-950 flex items-center gap-1.5 truncate group-hover:text-sky-700 transition">
                          {cust.fullName}
                          <span className="text-[10px] font-mono text-slate-400">({cust.customerId})</span>
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center gap-2 mt-0.5 font-medium">
                          <span>{formatGhanaPhone(cust.primaryPhone)}</span>
                          <span>•</span>
                          <span className="font-mono text-sky-800 font-bold">{maskGhanaCard(cust.ghanaCardNumber, true)}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loan Results */}
          {filteredLoans.length > 0 && (
            <div>
              <div className="text-[11px] font-black text-sky-900 uppercase tracking-wider mb-2">
                Loans ({filteredLoans.length})
              </div>
              <div className="space-y-2">
                {filteredLoans.map(loan => (
                  <div
                    key={loan.loanId}
                    onClick={() => {
                      onSelectLoan(loan);
                      onClose();
                    }}
                    className="p-3 rounded-2xl bg-white hover:bg-sky-50/80 border-2 border-slate-200/80 hover:border-sky-400 flex items-center justify-between cursor-pointer transition shadow-xs group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        <Banknote className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-navy-950 flex items-center gap-1.5">
                          {loan.loanId}
                          <span className="text-[10px] font-black text-sky-700 bg-sky-100 px-1.5 py-0.2 rounded">
                            {formatCurrency(loan.principalAmount)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {loan.customerName || loan.customerId} • Balance: <strong className="text-navy-900">{formatCurrency(loan.outstandingBalance)}</strong>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition" />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
