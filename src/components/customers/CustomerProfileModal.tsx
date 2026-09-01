import React, { useState } from 'react';
import { Customer, Loan, Payment, RepaymentSchedule } from '../../types';
import { 
  X, 
  User, 
  Phone, 
  MapPin, 
  Car, 
  Store, 
  CreditCard, 
  Calendar, 
  ShieldCheck, 
  PlusCircle, 
  Banknote, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  MessageCircle,
  MessageSquare,
  Edit,
  FileText,
  Clock,
  ArrowLeft,
  Send,
  Sparkles,
  Smartphone,
  Check,
  Building2,
  Receipt,
  Eye,
  DollarSign
} from 'lucide-react';
import { formatCurrency, formatDate, formatGhanaPhone, maskGhanaCard, isLoanOwing, getTrueOutstanding } from '../../utils/formatters';
import { SMSService } from '../../services/smsService';
import { useAuth } from '../../context/AuthContext';

interface CustomerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  loans: Loan[];
  payments: Payment[];
  schedules?: RepaymentSchedule[];
  onOpenCreateLoan?: (customerId: string) => void;
  onOpenNewLoan?: (customerId: string) => void;
  onOpenRecordPayment?: (loanId: string) => void;
  onSelectLoan: (loan: Loan) => void;
  onEditCustomer?: (customer: Customer) => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  isOpen,
  onClose,
  customer,
  loans,
  payments,
  schedules = [],
  onOpenCreateLoan,
  onOpenNewLoan,
  onOpenRecordPayment,
  onSelectLoan,
  onEditCustomer
}) => {
  const { settings } = useAuth();
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [customSMSText, setCustomSMSText] = useState('');
  const [selectedImagePreview, setSelectedImagePreview] = useState<{ title: string; url: string } | null>(null);

  if (!isOpen || !customer) return null;

  // Filter records for this customer
  const customerLoans = loans.filter(l => l.customerId === customer.customerId);
  const activeLoans = customerLoans.filter(l => isLoanOwing(l));
  const overdueLoans = customerLoans.filter(l => isLoanOwing(l) && l.status === 'overdue');
  const customerPayments = payments.filter(p => p.customerId === customer.customerId);

  const totalBorrowed = customerLoans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
  const totalRepaid = customerLoans.reduce((sum, l) => sum + (l.totalPaid || 0), 0);
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + getTrueOutstanding(l), 0);
  const isOwing = totalOutstanding > 0.01;

  // Calculate age if DOB exists
  let clientAge: number | null = null;
  if (customer.dateOfBirth) {
    const birthYear = new Date(customer.dateOfBirth).getFullYear();
    const currentYear = new Date().getFullYear();
    if (!isNaN(birthYear) && birthYear > 1900) {
      clientAge = currentYear - birthYear;
    }
  }

  // Repayment Score calculation
  let punctualityScore: 'A+' | 'A' | 'B' | 'High Risk' = 'A+';
  if (overdueLoans.length > 0) punctualityScore = 'High Risk';
  else if (!isOwing) punctualityScore = 'A+';
  else punctualityScore = 'A';

  // WhatsApp link generator
  const cleanPhone = customer.primaryPhone.replace(/\D/g, '');
  const waPhone = cleanPhone.startsWith('0') ? '233' + cleanPhone.slice(1) : cleanPhone;
  const whatsappUrl = `https://wa.me/${waPhone}`;

  // Direct SMS Handlers
  const handleSendWelcomeSMS = () => {
    const text = SMSService.generateWelcomeSMS({
      customer,
      businessName: settings?.businessName,
      businessPhone: settings?.businessPhone
    });
    SMSService.dispatchSMS(customer.primaryPhone, text, settings);
  };

  const handleSendOverdueSMS = () => {
    const activeLoan = activeLoans[0];
    if (!activeLoan) return;
    const text = SMSService.generateOverdueSMS({
      customer,
      loan: activeLoan,
      businessName: settings?.businessName,
      businessPhone: settings?.businessPhone
    });
    SMSService.dispatchSMS(customer.primaryPhone, text, settings);
  };

  const handleSendCustomSMS = () => {
    if (!customSMSText.trim()) return;
    SMSService.dispatchSMS(customer.primaryPhone, customSMSText.trim(), settings);
    setShowSMSModal(false);
    setCustomSMSText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fade-in text-slate-800">
      <div className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh] border border-slate-200/80">
        
        {/* Profile Header Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white p-4 sm:p-5 relative border-b border-sky-500/20">
          
          {/* Top Actions Row */}
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-black transition border border-white/15"
            >
              <ArrowLeft className="w-4 h-4 text-sky-300" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-1.5">
              {onEditCustomer && (
                <button
                  onClick={() => onEditCustomer(customer)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-sky-200 hover:text-white transition active:scale-95 border border-white/15"
                  title="Edit Client Particulars"
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}

              <button 
                onClick={onClose}
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Client Identity & Avatar */}
          <div className="flex items-center gap-3.5">
            <div 
              onClick={() => customer.photoUrl && setSelectedImagePreview({ title: `${customer.fullName} - Photo`, url: customer.photoUrl })}
              className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-600 border-2 border-white/30 overflow-hidden flex items-center justify-center font-black text-xl text-white shrink-0 shadow-lg relative ${customer.photoUrl ? 'cursor-pointer' : ''}`}
            >
              {customer.photoUrl ? (
                <img src={customer.photoUrl} alt={customer.fullName} className="w-full h-full object-cover" />
              ) : customer.customerType === 'driver' ? (
                <Car className="w-8 h-8 text-sky-100" />
              ) : (
                <Store className="w-8 h-8 text-sky-100" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                  {customer.fullName}
                </h2>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs ${
                  punctualityScore === 'High Risk' ? 'bg-rose-500 text-white' : 'bg-sky-500 text-white'
                }`}>
                  {punctualityScore} Rating
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-sky-200 mt-0.5 font-medium">
                <span className="font-mono font-bold text-sky-300">{customer.customerId}</span>
                <span>•</span>
                <span className="capitalize font-bold text-white">{customer.customerType}</span>
                {clientAge && (
                  <>
                    <span>•</span>
                    <span>{clientAge} yrs</span>
                  </>
                )}
              </div>

              {/* Fast Communication Buttons (Call, WhatsApp, Direct SMS) */}
              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                <a
                  href={`tel:${customer.primaryPhone}`}
                  className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white text-[11px] font-black rounded-xl flex items-center gap-1 shadow-xs active:scale-95 transition border border-white/15"
                >
                  <Phone className="w-3.5 h-3.5 text-sky-300" /> Call
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-xl flex items-center gap-1 shadow-xs active:scale-95 transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setShowSMSModal(true)}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black rounded-xl flex items-center gap-1 shadow-xs active:scale-95 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Send SMS
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* ========================================================================= */}
          {/* 1. HERO DEBT STATUS BANNER (PROMINENT OWING / DEBT-FREE INDICATOR) */}
          {/* ========================================================================= */}
          {isOwing ? (
            <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-50 via-rose-100/60 to-red-50 border-2 border-rose-300 shadow-sm space-y-3 animate-fade-in">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-600 text-white shadow-xs">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-rose-900">
                      Current Debt Status: OWING
                    </div>
                    <div className="text-[11px] text-rose-700 font-medium">
                      {activeLoans.length} active microloan{activeLoans.length === 1 ? '' : 's'} in repayment
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-rose-600 uppercase block">Total Outstanding</span>
                  <span className="text-base sm:text-lg font-black text-rose-700">
                    {formatCurrency(totalOutstanding)}
                  </span>
                </div>
              </div>

              {/* Active Loan Quick Summary */}
              {activeLoans[0] && (
                <div className="p-3 bg-white/90 rounded-2xl border border-rose-200 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-semibold">Active Loan:</span>
                    <strong className="font-mono text-slate-950">{activeLoans[0].loanId}</strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-600">
                    <span>Total Repayment Due: <strong>{formatCurrency(activeLoans[0].totalRepayment)}</strong></span>
                    <span>Paid: <strong className="text-blue-700">{formatCurrency(activeLoans[0].totalPaid)}</strong></span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    <span>Next Installment Due:</span>
                    <strong className="text-slate-900">{formatDate(activeLoans[0].firstRepaymentDate)}</strong>
                  </div>
                </div>
              )}

              {/* Direct Record Payment Trigger */}
              <button
                onClick={() => {
                  if (activeLoans[0] && onOpenRecordPayment) {
                    onOpenRecordPayment(activeLoans[0].loanId);
                  }
                }}
                className="w-full py-3 bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 hover:from-rose-700 hover:to-red-800 active:scale-95 text-white text-xs font-black rounded-2xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <DollarSign className="w-4 h-4" />
                Collect / Record Repayment Now
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-3xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 border-2 border-sky-300 shadow-sm space-y-3 animate-fade-in">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-blue-950">
                      Debt Status: 100% DEBT-FREE
                    </div>
                    <div className="text-[11px] text-blue-700 font-medium">
                      GH₵0.00 Outstanding • No active unpaid loans
                    </div>
                  </div>
                </div>

                <span className="bg-sky-100 text-blue-900 border border-sky-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase shrink-0">
                  Clean Profile
                </span>
              </div>

              <p className="text-[11px] text-slate-600 font-medium">
                This borrower is completely settled and eligible for new microloan disbursements.
              </p>

              {/* Issue New Loan Button */}
              <button
                onClick={() => (onOpenCreateLoan || onOpenNewLoan)?.(customer.customerId)}
                className="w-full py-3 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" /> Issue New Microloan to {customer.fullName.split(' ')[0]}
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. FINANCIAL RECOVERY METRICS */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-2xl text-center">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Lent</div>
              <div className="text-xs font-black text-slate-950 mt-0.5">{formatCurrency(totalBorrowed)}</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl text-center">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Repaid</div>
              <div className="text-xs font-black text-blue-800 mt-0.5">{formatCurrency(totalRepaid)}</div>
            </div>
            <div className={`p-3 rounded-2xl text-center border ${
              isOwing ? 'bg-rose-50 border-rose-200' : 'bg-sky-50 border-sky-200'
            }`}>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Still Owing</div>
              <div className={`text-xs font-black mt-0.5 ${isOwing ? 'text-rose-700' : 'text-blue-700'}`}>
                {isOwing ? formatCurrency(totalOutstanding) : 'GH₵0.00'}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. COMPLETE CLIENT PARTICULARS & CONTACT DETAILS */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-3xl bg-slate-50 border-2 border-slate-200/80 space-y-3 text-xs">
            <div className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <User className="w-4 h-4 text-sky-600" />
              Client Particulars & Address
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-slate-400 block font-medium">Primary Phone</span>
                <span className="font-bold text-slate-950">{formatGhanaPhone(customer.primaryPhone)}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Secondary Phone</span>
                <span className="font-bold text-slate-950">
                  {customer.secondaryPhone ? formatGhanaPhone(customer.secondaryPhone) : 'None Provided'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Date of Birth</span>
                <span className="font-bold text-slate-950">
                  {customer.dateOfBirth ? formatDate(customer.dateOfBirth) : 'N/A'} {clientAge ? `(${clientAge} yrs)` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Gender</span>
                <span className="font-bold text-slate-950 capitalize">{customer.gender || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block font-medium">Residential Address & Directions</span>
                <span className="font-semibold text-slate-950">{customer.residentialAddress || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block font-medium">Work / Station / Market Address</span>
                <span className="font-semibold text-slate-950">{customer.workAddress || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. GHANA CARD IDENTITY & OFFICIAL VERIFICATION */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-3xl bg-slate-50 border-2 border-slate-200/80 space-y-3 text-xs">
            <div className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-sky-600" />
                Ghana Card Identity
              </span>
              <span className="text-[10px] font-mono text-blue-700 bg-sky-100 px-2.5 py-0.5 rounded-full font-bold">
                {customer.ghanaCardNumber}
              </span>
            </div>

            {/* Ghana Card Photos Preview */}
            {(customer.ghanaCardFrontUrl || customer.ghanaCardBackUrl) && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-bold block mb-1.5 text-[10px] uppercase">
                  Captured Ghana Card Documentation
                </span>
                <div className="flex gap-2.5">
                  {customer.ghanaCardFrontUrl && (
                    <div 
                      onClick={() => setSelectedImagePreview({ title: `${customer.fullName} - Ghana Card Front`, url: customer.ghanaCardFrontUrl! })}
                      className="group relative w-24 h-16 rounded-2xl border-2 border-slate-300 overflow-hidden bg-slate-200 shrink-0 cursor-pointer shadow-xs hover:border-sky-500 transition"
                    >
                      <img src={customer.ghanaCardFrontUrl} alt="Ghana Card Front" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                        <Eye className="w-4 h-4" />
                      </div>
                      <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] font-bold text-white text-center py-0.5">
                        FRONT
                      </span>
                    </div>
                  )}
                  {customer.ghanaCardBackUrl && (
                    <div 
                      onClick={() => setSelectedImagePreview({ title: `${customer.fullName} - Ghana Card Back`, url: customer.ghanaCardBackUrl! })}
                      className="group relative w-24 h-16 rounded-2xl border-2 border-slate-300 overflow-hidden bg-slate-200 shrink-0 cursor-pointer shadow-xs hover:border-sky-500 transition"
                    >
                      <img src={customer.ghanaCardBackUrl} alt="Ghana Card Back" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                        <Eye className="w-4 h-4" />
                      </div>
                      <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[8px] font-bold text-white text-center py-0.5">
                        BACK
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 5. PROFESSIONAL ARCHETYPE DETAILS (DRIVER / TRADER) */}
          {/* ========================================================================= */}
          {customer.customerType === 'driver' && customer.driverDetails && (
            <div className="p-4 rounded-3xl bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 border-2 border-blue-200 space-y-2.5 text-xs">
              <div className="font-black text-blue-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Car className="w-4 h-4 text-blue-600" /> Commercial Driver Particulars
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block font-medium">Vehicle / Fleet:</span>
                  <span className="font-bold text-slate-950">{customer.driverDetails.vehicleType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Registration Plate:</span>
                  <span className="font-mono font-black text-blue-900">{customer.driverDetails.registrationNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Driver License No:</span>
                  <span className="font-mono font-bold text-slate-800">{customer.driverDetails.licenseNumber || 'Verified'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Station / Lorry Park:</span>
                  <span className="font-semibold text-slate-950">{customer.driverDetails.stationLocation}</span>
                </div>
              </div>
            </div>
          )}

          {customer.customerType === 'trader' && customer.traderDetails && (
            <div className="p-4 rounded-3xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 border-2 border-sky-200 space-y-2.5 text-xs">
              <div className="font-black text-blue-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Store className="w-4 h-4 text-sky-600" /> Market Trader Particulars
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block font-medium">Business / Shop Name:</span>
                  <span className="font-bold text-slate-950">{customer.traderDetails.businessName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Trade Line:</span>
                  <span className="font-bold text-blue-900">{customer.traderDetails.businessType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Stall / Shed No:</span>
                  <span className="font-bold text-slate-950">{customer.traderDetails.stallNumber || 'Open Market'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-medium">Market Location:</span>
                  <span className="font-semibold text-slate-950">{customer.traderDetails.marketLocation}</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 6. EMERGENCY CONTACT / GUARANTOR */}
          {/* ========================================================================= */}
          {customer.emergencyContact && (
            <div className="p-4 rounded-3xl bg-slate-50 border-2 border-slate-200/80 space-y-2 text-xs">
              <div className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                  Guarantor / Next of Kin
                </span>
                <span className="text-[10px] text-blue-700 bg-sky-50 px-2 py-0.5 rounded-full font-bold border border-sky-200">
                  {customer.emergencyContact.relationship}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="font-black text-slate-950 text-xs">{customer.emergencyContact.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {formatGhanaPhone(customer.emergencyContact.phone)}
                  </div>
                </div>
                <a
                  href={`tel:${customer.emergencyContact.phone}`}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-blue-700 border border-slate-200 rounded-xl text-[11px] font-bold flex items-center gap-1 transition shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Guarantor
                </a>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 7. COMPLETE LIFETIME LOAN HISTORY */}
          {/* ========================================================================= */}
          <div className="space-y-2.5">
            <div className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center justify-between">
              <span>Loan History ({customerLoans.length})</span>
              <span className="text-[10px] text-slate-500 font-bold">
                {activeLoans.length} Active • {customerLoans.length - activeLoans.length} Settled
              </span>
            </div>

            {customerLoans.length === 0 ? (
              <div className="p-6 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 text-center text-xs text-slate-400">
                No loans issued yet. Tap &ldquo;Issue New Microloan&rdquo; to disburse.
              </div>
            ) : (
              <div className="space-y-2.5">
                {customerLoans.map(loan => {
                  const isSettled = loan.status === 'completed' || (loan.outstandingBalance || 0) <= 0.01;
                  return (
                    <div
                      key={loan.loanId}
                      onClick={() => onSelectLoan(loan)}
                      className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition shadow-xs group ${
                        isSettled 
                          ? 'bg-slate-50/60 border-slate-200 hover:border-sky-400' 
                          : 'bg-white border-blue-200 hover:border-blue-400'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-slate-950 flex items-center gap-1.5">
                          <span>{loan.loanId}</span>
                          <span className="text-[10px] font-bold text-blue-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                            {formatCurrency(loan.principalAmount)}
                          </span>
                          {isSettled ? (
                            <span className="text-[9px] font-black text-blue-800 bg-sky-100 px-2 py-0.5 rounded-full">
                              PAID OFF
                            </span>
                          ) : (
                            <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full uppercase">
                              {loan.status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                          {isSettled ? (
                            <span className="text-blue-700 font-bold">100% Settled • GH₵0.00 Remaining</span>
                          ) : (
                            <>
                              <span>Balance: <strong className="text-rose-700 font-black">{formatCurrency(loan.outstandingBalance)}</strong></span>
                              <span>•</span>
                              <span>Total Due: {formatCurrency(loan.totalRepayment)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition shrink-0 ml-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 8. RECENT PAYMENT RECEIPTS */}
          {/* ========================================================================= */}
          {customerPayments.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="text-xs font-black text-slate-950 uppercase tracking-wider">
                Recent Repayments ({customerPayments.length})
              </div>
              <div className="space-y-1.5">
                {customerPayments.slice(0, 5).map(p => (
                  <div 
                    key={p.paymentId}
                    className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center"
                  >
                    <div>
                      <span className="font-black text-blue-700">+{formatCurrency(p.amountPaid)}</span>
                      <span className="text-[10px] text-slate-500 uppercase ml-1.5">({p.paymentMethod})</span>
                      <div className="text-[10px] text-slate-400">{formatDate(p.paymentDate)} • Loan {p.loanId}</div>
                    </div>
                    {p.referenceNumber && (
                      <div className="text-[10px] font-mono text-slate-500">
                        Ref: {p.referenceNumber}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* FULL IMAGE PREVIEW MODAL */}
        {selectedImagePreview && (
          <div 
            onClick={() => setSelectedImagePreview(null)}
            className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="max-w-md w-full bg-white rounded-3xl overflow-hidden p-3 shadow-2xl space-y-2 animate-fade-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-xs font-black text-slate-900">{selectedImagePreview.title}</span>
                <button onClick={() => setSelectedImagePreview(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden max-h-[70vh] bg-slate-100 flex items-center justify-center">
                <img src={selectedImagePreview.url} alt={selectedImagePreview.title} className="w-full h-auto object-contain max-h-[68vh]" />
              </div>
            </div>
          </div>
        )}

        {/* SEND DIRECT SMS POPUP MODAL */}
        {showSMSModal && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border-2 border-sky-200 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-sky-600" />
                  Send Direct SMS to {customer.fullName.split(' ')[0]}
                </h3>
                <button onClick={() => setShowSMSModal(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Template Buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleSendWelcomeSMS}
                  className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-blue-900 text-[11px] font-bold text-left"
                >
                  👋 Welcome SMS
                </button>
                {activeLoans.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSendOverdueSMS}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 text-[11px] font-bold text-left"
                  >
                    ⚠️ Overdue Notice
                  </button>
                )}
              </div>

              {/* Custom SMS Area */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Custom Message</label>
                <textarea
                  rows={3}
                  placeholder={`Type SMS to ${customer.primaryPhone}...`}
                  value={customSMSText}
                  onChange={(e) => setCustomSMSText(e.target.value)}
                  className="w-full text-xs font-medium p-3 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSMSModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendCustomSMS}
                  disabled={!customSMSText.trim()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white text-xs font-black rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> Send SMS
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
