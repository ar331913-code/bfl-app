import React, { useState } from 'react';
import { Customer, Loan, RepaymentSchedule, Payment } from '../../types';
import { 
  X, 
  ArrowLeft,
  Phone, 
  MessageCircle, 
  CreditCard, 
  Eye, 
  EyeOff, 
  Car, 
  Store, 
  Banknote, 
  Receipt, 
  PlusCircle, 
  FileText, 
  Edit3, 
  ShieldCheck, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { formatCurrency, formatDate, formatGhanaPhone, maskGhanaCard } from '../../utils/formatters';

interface CustomerProfileModalProps {
  customer: Customer | null;
  loans: Loan[];
  schedules: RepaymentSchedule[];
  payments: Payment[];
  isOpen: boolean;
  onClose: () => void;
  onOpenNewLoan: (customerId: string) => void;
  onOpenRecordPayment: (loanId?: string) => void;
  onEditCustomer: (customer: Customer) => void;
  onSelectLoan: (loan: Loan) => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  customer,
  loans,
  schedules,
  payments,
  isOpen,
  onClose,
  onOpenNewLoan,
  onOpenRecordPayment,
  onEditCustomer,
  onSelectLoan
}) => {
  const [showFullCard, setShowFullCard] = useState(false);

  if (!isOpen || !customer) return null;

  // Filter records for this customer
  const customerLoans = loans.filter(l => l.customerId === customer.customerId);
  const activeLoans = customerLoans.filter(l => l.status !== 'completed' && l.status !== 'defaulted');
  const overdueLoans = customerLoans.filter(l => l.status === 'overdue');

  const totalBorrowed = customerLoans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
  const totalRepaid = customerLoans.reduce((sum, l) => sum + (l.totalPaid || 0), 0);
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.outstandingBalance || 0), 0);

  // Repayment Score calculation
  let punctualityScore: 'A+' | 'A' | 'B' | 'C' | 'High Risk' = 'A+';
  if (overdueLoans.length > 0) punctualityScore = 'High Risk';
  else if (customerLoans.length === 0) punctualityScore = 'A';
  else if (totalOutstanding === 0 && customerLoans.length > 0) punctualityScore = 'A+';

  // WhatsApp link generator
  const cleanPhone = customer.primaryPhone.replace(/\D/g, '');
  const waPhone = cleanPhone.startsWith('0') ? '233' + cleanPhone.slice(1) : cleanPhone;
  const whatsappUrl = `https://wa.me/${waPhone}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/85 backdrop-blur-sm p-3.5 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] border border-slate-200">
        
        {/* Profile Header Banner */}
        <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-emerald-950 text-white p-5 relative border-b border-navy-800">
          
          {/* Top Bar with Back Arrow & Close */}
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>Back</span>
            </button>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-full text-navy-300 hover:text-white hover:bg-navy-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-emerald-400/50 overflow-hidden flex items-center justify-center font-black text-xl text-emerald-400 shrink-0 shadow-lg">
              {customer.photoUrl ? (
                <img src={customer.photoUrl} alt={customer.fullName} className="w-full h-full object-cover" />
              ) : (
                customer.fullName.slice(0, 2).toUpperCase()
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-tight">{customer.fullName}</h2>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm ${
                  punctualityScore === 'High Risk' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                }`}>
                  {punctualityScore} Rating
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-navy-200 mt-0.5">
                <span className="font-mono font-bold text-amber-300">{customer.customerId}</span>
                <span>•</span>
                <span className="capitalize font-black text-emerald-300">{customer.customerType}</span>
              </div>

              {/* Fast Communication Buttons */}
              <div className="flex items-center gap-2 mt-2.5">
                <a
                  href={`tel:${customer.primaryPhone}`}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-xl flex items-center gap-1 shadow-md active:scale-95 transition"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-xl flex items-center gap-1 shadow-md active:scale-95 transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
                <button
                  onClick={() => onEditCustomer(customer)}
                  className="px-2.5 py-1.5 bg-navy-800 hover:bg-navy-700 text-navy-200 text-[11px] font-bold rounded-xl flex items-center gap-1 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* 1. Lifetime Financial Summary Cards (Vibrant) */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-blue-50 border-2 border-blue-200 text-center">
              <div className="text-[10px] uppercase font-black text-blue-800">Total Lent</div>
              <div className="text-xs font-black text-blue-950 mt-0.5">{formatCurrency(totalBorrowed)}</div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-center">
              <div className="text-[10px] uppercase font-black text-emerald-800">Repaid</div>
              <div className="text-xs font-black text-emerald-950 mt-0.5">{formatCurrency(totalRepaid)}</div>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-200 text-center">
              <div className="text-[10px] uppercase font-black text-amber-800">Balance</div>
              <div className="text-xs font-black text-amber-950 mt-0.5">{formatCurrency(totalOutstanding)}</div>
            </div>
          </div>

          {/* 2. Customer Identification & Ghana Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Ghana Card Number
              </span>
              <button
                onClick={() => setShowFullCard(!showFullCard)}
                className="text-[11px] font-black text-emerald-700 flex items-center gap-1 hover:underline"
              >
                {showFullCard ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showFullCard ? 'Hide' : 'Reveal'}
              </button>
            </div>
            <div className="text-xs font-mono font-black text-navy-950 tracking-wider bg-white p-2.5 rounded-xl border border-slate-300">
              {maskGhanaCard(customer.ghanaCardNumber, showFullCard)}
            </div>
            <div className="text-[11px] text-slate-600 pt-1">
              Residential: <span className="text-navy-950 font-bold">{customer.residentialAddress}</span>
            </div>
          </div>

          {/* 3. Driver or Trader Profile Specifics */}
          {customer.customerType === 'driver' && customer.driverDetails && (
            <div className="p-3.5 rounded-2xl bg-blue-50/80 border-2 border-blue-200 space-y-1.5">
              <div className="text-[11px] font-black text-blue-900 uppercase tracking-wider flex items-center gap-1">
                <Car className="w-4 h-4 text-blue-700" /> Driver Particulars
              </div>
              <div className="text-xs text-slate-700">
                Vehicle: <span className="font-black text-navy-950">{customer.driverDetails.vehicleType}</span>
              </div>
              <div className="text-xs text-slate-700 flex justify-between">
                <span>Reg: <span className="font-mono font-black text-blue-900">{customer.driverDetails.registrationNumber}</span></span>
                <span>License: <span className="font-mono font-bold text-navy-950">{customer.driverDetails.licenseNumber}</span></span>
              </div>
              <div className="text-xs text-slate-700">
                Station: <span className="font-bold text-navy-950">{customer.driverDetails.stationLocation}</span>
              </div>
            </div>
          )}

          {customer.customerType === 'trader' && customer.traderDetails && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border-2 border-emerald-200 space-y-1.5">
              <div className="text-[11px] font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                <Store className="w-4 h-4 text-emerald-700" /> Trader Particulars
              </div>
              <div className="text-xs text-slate-700">
                Store: <span className="font-black text-navy-950">{customer.traderDetails.businessName}</span>
              </div>
              <div className="text-xs text-slate-700 flex justify-between">
                <span>Trade: <span className="font-bold text-navy-950">{customer.traderDetails.businessType}</span></span>
                <span>Stall: <span className="font-mono font-black text-emerald-900">{customer.traderDetails.stallNumber || 'N/A'}</span></span>
              </div>
              <div className="text-xs text-slate-700">
                Market: <span className="font-bold text-navy-950">{customer.traderDetails.marketLocation}</span>
              </div>
            </div>
          )}

          {/* 4. Emergency Contact */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Emergency Next of Kin</div>
              <div className="font-black text-navy-950">{customer.emergencyContact.name} ({customer.emergencyContact.relationship})</div>
            </div>
            <a 
              href={`tel:${customer.emergencyContact.phone}`}
              className="text-emerald-700 font-bold hover:underline"
            >
              {formatGhanaPhone(customer.emergencyContact.phone)}
            </a>
          </div>

          {/* 5. Complete Loan History */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black uppercase tracking-wider text-slate-600">
                Loan Portfolio History ({customerLoans.length})
              </div>
              <button
                onClick={() => onOpenNewLoan(customer.customerId)}
                className="text-xs font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <PlusCircle className="w-4 h-4" /> New Loan
              </button>
            </div>

            {customerLoans.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                No loans created for this customer yet.
              </div>
            ) : (
              <div className="space-y-2">
                {customerLoans.map(loan => (
                  <div
                    key={loan.loanId}
                    onClick={() => {
                      onSelectLoan(loan);
                      onClose();
                    }}
                    className="p-3 rounded-2xl bg-white border-2 border-slate-200/80 shadow-sm hover:border-emerald-500 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-navy-950">{loan.loanId}</span>
                        <span className={`text-[10px] font-black px-2 py-0.2 rounded-full uppercase ${
                          loan.status === 'completed' ? 'bg-emerald-600 text-white' :
                          loan.status === 'overdue' ? 'bg-rose-600 text-white' :
                          loan.status === 'due_today' ? 'bg-amber-500 text-white' :
                          'bg-blue-600 text-white'
                        }`}>
                          {loan.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Lent: <strong className="text-navy-900">{formatCurrency(loan.principalAmount)}</strong> • Total: {formatCurrency(loan.totalRepayment)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-navy-950">
                        Bal: {formatCurrency(loan.outstandingBalance)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {formatDate(loan.startDate)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
          <button
            onClick={() => onOpenNewLoan(customer.customerId)}
            className="flex-1 py-3 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white text-xs font-black rounded-xl shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
          >
            <Banknote className="w-4 h-4" /> Issue Loan
          </button>
          
          <button
            onClick={() => onOpenRecordPayment()}
            className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black rounded-xl shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
          >
            <Receipt className="w-4 h-4" /> Record Payment
          </button>
        </div>

      </div>
    </div>
  );
};
