import React, { useState } from 'react';
import { Customer, Loan, Payment } from '../../types';
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
  Send
} from 'lucide-react';
import { formatCurrency, formatDate, formatGhanaPhone, maskGhanaCard } from '../../utils/formatters';
import { SMSService } from '../../services/smsService';
import { useAuth } from '../../context/AuthContext';

interface CustomerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  loans: Loan[];
  payments: Payment[];
  schedules?: any[];
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
  schedules,
  onOpenCreateLoan,
  onOpenNewLoan,
  onOpenRecordPayment,
  onSelectLoan,
  onEditCustomer
}) => {
  const { settings } = useAuth();
  const [showFullCard, setShowFullCard] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [customSMSText, setCustomSMSText] = useState('');

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

  // Direct SMS Triggers
  const handleSendWelcomeSMS = () => {
    const text = SMSService.generateWelcomeSMS({
      customer,
      businessName: settings?.businessName,
      businessPhone: settings?.businessPhone
    });
    SMSService.sendSMS(customer.primaryPhone, text);
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
    SMSService.sendSMS(customer.primaryPhone, text);
  };

  const handleSendCustomSMS = () => {
    if (!customSMSText.trim()) return;
    SMSService.sendSMS(customer.primaryPhone, customSMSText.trim());
    setShowSMSModal(false);
    setCustomSMSText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/85 backdrop-blur-sm p-3.5 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] border border-slate-200">
        
        {/* Profile Header Banner */}
        <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white p-5 relative border-b border-sky-400/30">
          
          {/* Top Bar with Back Arrow & Close */}
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold transition border border-white/20"
            >
              <ArrowLeft className="w-4 h-4 text-sky-200" />
              <span>Back</span>
            </button>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-full text-sky-200 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Captured Profile Picture / Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/40 overflow-hidden flex items-center justify-center font-black text-xl text-white shrink-0 shadow-lg">
              {customer.photoUrl ? (
                <img src={customer.photoUrl} alt={customer.fullName} className="w-full h-full object-cover" />
              ) : customer.customerType === 'driver' ? (
                <Car className="w-8 h-8 text-sky-100" />
              ) : (
                <Store className="w-8 h-8 text-sky-100" />
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
              
              <div className="flex items-center gap-2 text-xs text-sky-100 mt-0.5">
                <span className="font-mono font-bold text-amber-200">{customer.customerId}</span>
                <span>•</span>
                <span className="capitalize font-black text-cyan-200">{customer.customerType}</span>
              </div>

              {/* Fast Communication Buttons (Call, WhatsApp, Direct SMS) */}
              <div className="flex items-center gap-1.5 mt-2.5">
                <a
                  href={`tel:${customer.primaryPhone}`}
                  className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white text-[11px] font-black rounded-xl flex items-center gap-1 shadow-xs active:scale-95 transition border border-white/20"
                >
                  <Phone className="w-3.5 h-3.5 text-sky-200" /> Call
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-xl flex items-center gap-1 shadow-xs active:scale-95 transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setShowSMSModal(true)}
                  className="px-2.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-black rounded-xl flex items-center gap-1 shadow-xs active:scale-95 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Send SMS
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-2xl text-center">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Lent</div>
              <div className="text-xs font-black text-navy-950 mt-0.5">{formatCurrency(totalBorrowed)}</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl text-center">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Repaid</div>
              <div className="text-xs font-black text-emerald-800 mt-0.5">{formatCurrency(totalRepaid)}</div>
            </div>
            <div className={`p-3 rounded-2xl text-center border ${
              totalOutstanding > 0 ? 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Owing</div>
              <div className={`text-xs font-black mt-0.5 ${totalOutstanding > 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                {formatCurrency(totalOutstanding)}
              </div>
            </div>
          </div>

          {/* Quick Action: New Loan or Active Warning */}
          <div>
            {activeLoans.length > 0 ? (
              <div className="p-3 bg-rose-50 border-2 border-rose-200 rounded-2xl text-rose-900 text-xs flex items-center justify-between">
                <div>
                  <div className="font-black text-rose-700">Active Loan in Progress</div>
                  <div className="text-[11px] text-rose-600">Balance: {formatCurrency(totalOutstanding)}</div>
                </div>
                <button
                  type="button"
                  onClick={handleSendOverdueSMS}
                  className="px-3 py-1.5 bg-rose-600 text-white text-[10px] font-black rounded-xl hover:bg-rose-700 transition flex items-center gap-1 shadow-xs"
                >
                  <Send className="w-3 h-3" /> SMS Notice
                </button>
              </div>
            ) : (
              <button
                onClick={() => (onOpenCreateLoan || onOpenNewLoan)?.(customer.customerId)}
                className="w-full py-3 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-2xl shadow-md transition flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" /> Issue New Microloan to {customer.fullName.split(' ')[0]}
              </button>
            )}
          </div>

          {/* Contact & Ghana Card Identity Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200/80 space-y-2.5 text-xs">
            <div className="font-black text-navy-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-sky-900">
              <CreditCard className="w-4 h-4 text-sky-600" />
              Ghana Card & Identity
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block font-medium">Primary Phone</span>
                <span className="font-bold text-navy-950">{formatGhanaPhone(customer.primaryPhone)}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Ghana Card PIN</span>
                <span className="font-mono font-bold text-sky-800">{customer.ghanaCardNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">MoMo Wallet</span>
                <span className="font-mono font-bold text-amber-700">
                  {customer.momoNumber || customer.primaryPhone} ({customer.momoNetwork || 'MTN'})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">MoMo Registered Name</span>
                <span className="font-semibold text-slate-800">{customer.momoName || customer.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Residence</span>
                <span className="font-semibold text-navy-950">{customer.residentialAddress}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Work / Station</span>
                <span className="font-semibold text-navy-950">{customer.workAddress}</span>
              </div>
            </div>

            {/* Ghana Card Photos Preview */}
            {(customer.ghanaCardFrontUrl || customer.ghanaCardBackUrl) && (
              <div className="pt-2 border-t border-slate-200 flex gap-2">
                {customer.ghanaCardFrontUrl && (
                  <div className="w-20 h-14 rounded-xl border border-slate-300 overflow-hidden bg-slate-200 shrink-0">
                    <img src={customer.ghanaCardFrontUrl} alt="Ghana Card Front" className="w-full h-full object-cover" />
                  </div>
                )}
                {customer.ghanaCardBackUrl && (
                  <div className="w-20 h-14 rounded-xl border border-slate-300 overflow-hidden bg-slate-200 shrink-0">
                    <img src={customer.ghanaCardBackUrl} alt="Ghana Card Back" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Archetype Details (Driver / Trader) */}
          {customer.customerType === 'driver' && customer.driverDetails && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-sky-50 border-2 border-blue-200 space-y-2 text-xs">
              <div className="font-black text-blue-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Car className="w-4 h-4 text-blue-600" /> Driver Particulars
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Vehicle:</span>
                  <span className="font-bold text-navy-950">{customer.driverDetails.vehicleType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Number Plate:</span>
                  <span className="font-mono font-black text-blue-900">{customer.driverDetails.registrationNumber}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Station / Route:</span>
                  <span className="font-semibold text-navy-950">{customer.driverDetails.stationLocation}</span>
                </div>
              </div>
            </div>
          )}

          {customer.customerType === 'trader' && customer.traderDetails && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 space-y-2 text-xs">
              <div className="font-black text-emerald-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Store className="w-4 h-4 text-emerald-600" /> Trader Particulars
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Business:</span>
                  <span className="font-bold text-navy-950">{customer.traderDetails.businessName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Market Stall:</span>
                  <span className="font-bold text-emerald-900">{customer.traderDetails.stallNumber || 'Open Market'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Market Location:</span>
                  <span className="font-semibold text-navy-950">{customer.traderDetails.marketLocation}</span>
                </div>
              </div>
            </div>
          )}

          {/* Loan History */}
          <div className="space-y-2">
            <div className="text-xs font-black text-navy-950 uppercase tracking-wider flex items-center justify-between">
              <span>Loan History ({customerLoans.length})</span>
            </div>

            {customerLoans.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                No loans issued yet.
              </div>
            ) : (
              <div className="space-y-2">
                {customerLoans.map(loan => (
                  <div
                    key={loan.loanId}
                    onClick={() => onSelectLoan(loan)}
                    className="p-3 rounded-2xl bg-white border-2 border-slate-200 hover:border-sky-400 flex items-center justify-between cursor-pointer transition shadow-xs group"
                  >
                    <div>
                      <div className="text-xs font-black text-navy-950 flex items-center gap-1.5">
                        {loan.loanId}
                        <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                          {formatCurrency(loan.principalAmount)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Balance: <strong className="text-navy-900">{formatCurrency(loan.outstandingBalance)}</strong> • {loan.status.toUpperCase()}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition" />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* SEND DIRECT SMS POPUP MODAL */}
        {showSMSModal && (
          <div className="fixed inset-0 z-60 bg-navy-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border-2 border-sky-200 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
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
                  className="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-900 text-[11px] font-bold text-left"
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
                  className="w-full text-xs font-medium p-3 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
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
