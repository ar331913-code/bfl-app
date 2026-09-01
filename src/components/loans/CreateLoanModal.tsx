import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../db';
import { Customer, Loan, InterestType, RepaymentFrequency } from '../../types';
import { 
  X, 
  Banknote, 
  Calculator, 
  Calendar, 
  Percent, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Clock,
  ArrowRight,
  ShieldCheck,
  Search,
  AlertTriangle,
  CreditCard,
  Phone,
  User,
  Ban,
  Copy,
  Check,
  ExternalLink,
  PhoneCall
} from 'lucide-react';
import { calculateLoan, generateRepaymentSchedulesForLoan } from '../../services/loanCalculator';
import { formatCurrency, formatDate, formatGhanaPhone, maskGhanaCard, isLoanOwing } from '../../utils/formatters';
import { format, addWeeks } from 'date-fns';
import { CloudSyncService } from '../../services/cloudSyncService';
import { SMSService } from '../../services/smsService';
import { useAuth } from '../../context/AuthContext';
import confetti from 'canvas-confetti';

interface CreateLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  preselectedCustomerId?: string;
  onLoanCreated: (loan: Loan) => void;
}

export const CreateLoanModal: React.FC<CreateLoanModalProps> = ({
  isOpen,
  onClose,
  customers,
  preselectedCustomerId,
  onLoanCreated
}) => {
  const { settings } = useAuth();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // All existing loans for active-loan validation
  const [existingLoans, setExistingLoans] = useState<Loan[]>([]);

  // Search filter for customer selection (name, phone, Ghana Card)
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    preselectedCustomerId || (customers.length > 0 ? customers[0].customerId : '')
  );
  const [principalAmount, setPrincipalAmount] = useState<number>(3000);
  const [interestRate, setInterestRate] = useState<number>(10);
  const [interestType, setInterestType] = useState<InterestType>('flat');
  const [durationValue, setDurationValue] = useState<number>(6);
  const [durationUnit, setDurationUnit] = useState<'days' | 'weeks' | 'months'>('weeks');
  const [repaymentFrequency, setRepaymentFrequency] = useState<RepaymentFrequency>('weekly');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [firstRepaymentDate, setFirstRepaymentDate] = useState<string>(
    format(addWeeks(new Date(), 1), 'yyyy-MM-dd')
  );
  const [processingFee, setProcessingFee] = useState<number>(50);
  const [penaltyRate, setPenaltyRate] = useState<number>(2.5);
  const [notes, setNotes] = useState<string>('');

  // Disbursement State
  const [disbursementMethod, setDisbursementMethod] = useState<'cash' | 'bank'>('cash');
  const [createdLoanRecord, setCreatedLoanRecord] = useState<Loan | null>(null);

  // Confirmation Step State
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [ownerApprovalOverride, setOwnerApprovalOverride] = useState<boolean>(false);

  // Selected customer object
  const selectedCustomer = customers.find(c => c.customerId === selectedCustomerId);

  // Load existing loans to verify no multiple active loans
  useEffect(() => {
    async function loadLoans() {
      const allLoans = await db.loans.toArray();
      setExistingLoans(allLoans);
    }
    if (isOpen) {
      loadLoans();
      setCreatedLoanRecord(null);
      if (preselectedCustomerId) {
        setSelectedCustomerId(preselectedCustomerId);
      }
    }
  }, [isOpen, preselectedCustomerId]);

  // Check if selected customer has an existing active or overdue loan
  const customerActiveLoan = useMemo(() => {
    if (!selectedCustomerId) return null;
    return existingLoans.find(
      l => l.customerId === selectedCustomerId && isLoanOwing(l)
    );
  }, [selectedCustomerId, existingLoans]);

  // Filtered customer list for search (searches by Name, Phone, Ghana Card, ID)
  const filteredCustomers = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!q) return customers;
    return customers.filter(c => {
      const nameMatch = c.fullName.toLowerCase().includes(customerSearchQuery.toLowerCase());
      const idMatch = c.customerId.toLowerCase().includes(customerSearchQuery.toLowerCase());
      const cleanPhone = c.primaryPhone.replace(/\D/g, '');
      const phoneMatch = cleanPhone.includes(q);
      const cleanCard = c.ghanaCardNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cardMatch = cleanCard.includes(q.toUpperCase());
      return nameMatch || idMatch || phoneMatch || cardMatch;
    });
  }, [customers, customerSearchQuery]);

  // Calculate Loan in Real-Time
  const calculation = useMemo(() => {
    try {
      if (principalAmount <= 0 || durationValue <= 0 || interestRate < 0) {
        return null;
      }
      return calculateLoan({
        principalAmount,
        interestRate,
        interestType,
        durationValue,
        durationUnit,
        repaymentFrequency,
        startDate,
        firstRepaymentDate,
        processingFee
      });
    } catch (err: any) {
      return null;
    }
  }, [
    principalAmount,
    interestRate,
    interestType,
    durationValue,
    durationUnit,
    repaymentFrequency,
    startDate,
    firstRepaymentDate,
    processingFee
  ]);

  if (!isOpen) return null;

  const handleProceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setError('Please select a customer.');
      return;
    }
    if (customerActiveLoan && !ownerApprovalOverride) {
      setError(`Cannot issue loan: ${selectedCustomer?.fullName} already has active loan ${customerActiveLoan.loanId} (Balance: GH₵${customerActiveLoan.outstandingBalance.toFixed(2)}). Owner / Manager approval is required.`);
      return;
    }
    if (!calculation) {
      setError('Please provide valid loan parameters.');
      return;
    }
    setError('');
    setIsConfirming(true);
  };

  const handleFinalApprove = async () => {
    if (!calculation || !selectedCustomer) return;
    if (customerActiveLoan && !ownerApprovalOverride) return;

    setIsSubmitting(true);

    try {
      const loanId = await db.getNextLoanId();
      const now = new Date().toISOString();

      const newLoan: Loan = {
        loanId,
        customerId: selectedCustomer.customerId,
        customerName: selectedCustomer.fullName,
        customerType: selectedCustomer.customerType,
        principalAmount: calculation.principalAmount,
        interestRate: calculation.interestRate,
        interestType,
        durationValue,
        durationUnit,
        repaymentFrequency,
        startDate,
        firstRepaymentDate: calculation.firstRepaymentDate,
        maturityDate: calculation.maturityDate,
        totalInterest: calculation.totalInterest,
        processingFee: calculation.processingFee,
        totalRepayment: calculation.totalRepayment,
        installmentAmount: calculation.installmentAmount,
        totalInstallments: calculation.totalInstallments,
        totalPaid: 0,
        outstandingBalance: calculation.totalRepayment,
        penaltyRate,
        totalPenalties: 0,
        status: 'active',
        notes: notes.trim() || undefined,
        disbursementMethod,
        createdAt: now,
        updatedAt: now
      };

      // Generate schedules
      const schedules = generateRepaymentSchedulesForLoan(loanId, selectedCustomer.customerId, calculation);

      await db.loans.add(newLoan);
      await db.repaymentSchedules.bulkAdd(schedules);

      // Audit Log
      await db.auditLogs.add({
        action: 'LOAN_ISSUED',
        entityType: 'loan',
        entityId: loanId,
        details: `Disbursed loan ${loanId} of GH₵${calculation.principalAmount.toFixed(2)} in ${disbursementMethod.toUpperCase()} to ${selectedCustomer.fullName} (${selectedCustomer.customerId})`,
        timestamp: now
      });

      // Notification
      await db.notifications.add({
        type: 'system',
        title: `Loan ${loanId} Disbursed (${disbursementMethod.toUpperCase()})`,
        message: `Disbursed GH₵${calculation.principalAmount.toFixed(2)} to ${selectedCustomer.fullName}.`,
        customerId: selectedCustomer.customerId,
        loanId,
        isRead: false,
        createdAt: now
      });

      // Auto-SMS notification on disbursement
      if ((settings?.autoSmsOnDisburse ?? true) && selectedCustomer.primaryPhone) {
        const smsMsg = SMSService.generateLoanDisbursedSMS({
          customer: selectedCustomer,
          loan: newLoan,
          businessName: settings?.businessName,
          businessPhone: settings?.businessPhone
        });
        SMSService.dispatchSMS(selectedCustomer.primaryPhone, smsMsg, settings);
      }

      onLoanCreated(newLoan);
      CloudSyncService.forcePushLocalToCloud().catch(e => console.warn('Cloud sync error:', e));

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });

      setCreatedLoanRecord(newLoan);
    } catch (err) {
      console.error('Failed to create loan', err);
      setError('Failed to issue loan. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/85 backdrop-blur-sm p-3.5 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh] border border-slate-200">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white flex items-center justify-between border-b border-sky-400/30">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (createdLoanRecord) onClose();
                else if (isConfirming) setIsConfirming(false);
                else onClose();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold transition border border-white/20"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180 text-sky-200" />
              <span>Back</span>
            </button>
            <div>
              <h2 className="text-sm font-black text-white">
                {createdLoanRecord 
                  ? 'Loan Disbursed! 🎉' 
                  : isConfirming 
                  ? 'Confirm Loan Terms' 
                  : 'Issue New Microloan'}
              </h2>
              <p className="text-[10px] text-sky-100 font-semibold">
                {createdLoanRecord 
                  ? 'Loan activated in active ledger' 
                  : isConfirming 
                  ? 'Verify loan calculation & terms' 
                  : 'Search client & set repayment terms'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-sky-200 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. COMPLETED LOAN DISBURSEMENT RECEIPT */}
        {createdLoanRecord && selectedCustomer ? (
          <div className="p-6 text-center space-y-4 animate-fade-in flex-1 overflow-y-auto">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 border-2 border-emerald-300">
              <CheckCircle2 className="w-9 h-9 text-white" />
            </div>

            <div>
              <div className="text-xs uppercase font-black tracking-wider text-slate-400">Loan Disbursed Successfully</div>
              <div className="text-2xl font-black text-slate-950 mt-0.5">
                {formatCurrency(createdLoanRecord.principalAmount)}
              </div>
              <div className="text-xs text-emerald-700 font-mono font-bold mt-1">
                Loan ID: #{createdLoanRecord.loanId}
              </div>
            </div>

            {/* Receipt Summary Box */}
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-left text-xs space-y-2 text-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Borrower:</span>
                <span className="font-black text-slate-950">{selectedCustomer.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Disbursement Method:</span>
                <span className="font-bold text-emerald-800 uppercase">{createdLoanRecord.disbursementMethod || 'CASH'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Total Repayment:</span>
                <span className="font-bold text-slate-950">{formatCurrency(createdLoanRecord.totalRepayment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Installments:</span>
                <span className="font-bold text-slate-950">{createdLoanRecord.totalInstallments} x {formatCurrency(createdLoanRecord.installmentAmount)} ({createdLoanRecord.repaymentFrequency})</span>
              </div>
              <div className="flex justify-between border-t border-emerald-200 pt-1.5">
                <span className="text-slate-500 font-medium">First Repayment Due:</span>
                <span className="font-bold text-slate-950">{formatDate(createdLoanRecord.firstRepaymentDate)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              {/* WhatsApp Share */}
              <button
                type="button"
                onClick={() => {
                  const cleanPhone = selectedCustomer.primaryPhone.replace(/\D/g, '');
                  const waPhone = cleanPhone.startsWith('0') ? '233' + cleanPhone.slice(1) : cleanPhone;
                  const text = `*${settings?.businessName || 'B-F-L'} - LOAN DISBURSEMENT NOTICE*\n` +
                    `Dear ${selectedCustomer.fullName},\n` +
                    `Your loan ${createdLoanRecord.loanId} of GH₵${createdLoanRecord.principalAmount.toFixed(2)} has been approved and disbursed.\n` +
                    `Total Repayment: GH₵${createdLoanRecord.totalRepayment.toFixed(2)} in ${createdLoanRecord.totalInstallments} installments of GH₵${createdLoanRecord.installmentAmount.toFixed(2)} (${createdLoanRecord.repaymentFrequency}).\n` +
                    `First Due Date: ${createdLoanRecord.firstRepaymentDate}.\n\n` +
                    `Thank you for choosing ${settings?.businessName || 'B-F-L'}!`;
                  window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-2"
              >
                <span>Share Receipt via WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : !isConfirming ? (
          <form onSubmit={handleProceedToConfirmation} className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* Form body remains as defined above */}
            {/* 1. Client Search & Selector with Phone and Ghana Card */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Select Borrower *
                </label>
                <span className="text-[11px] text-sky-700 font-bold">Search by Phone / Ghana Card</span>
              </div>

              {/* Live Search Input */}
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-sky-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search telephone, Ghana Card, or name..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full text-xs font-semibold pl-9 pr-4 py-2 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none placeholder:text-slate-400 bg-slate-50"
                />
              </div>

              {/* Customer Selector Dropdown */}
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  setOwnerApprovalOverride(false);
                  setError('');
                }}
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white text-navy-950"
              >
                {filteredCustomers.map(c => {
                  const hasActive = existingLoans.some(
                    l => l.customerId === c.customerId && (l.outstandingBalance || 0) > 0.01 && l.status !== 'completed' && l.status !== 'defaulted'
                  );
                  return (
                    <option key={c.customerId} value={c.customerId}>
                      {c.fullName} ({c.primaryPhone}) — {c.ghanaCardNumber} {hasActive ? '⛔ [HAS ACTIVE LOAN]' : '✓ [ELIGIBLE]'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* ALERT & OWNER OVERRIDE BANNER: Customer Already Has An Active Loan */}
            {customerActiveLoan && (
              <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 text-xs space-y-2 animate-fade-in shadow-xs">
                <div className="flex items-center gap-1.5 font-black text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Alert: Borrower Has An Outstanding Active Loan</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-snug font-medium">
                  <strong>{selectedCustomer?.fullName}</strong> has an ongoing loan (<strong>{customerActiveLoan.loanId}</strong>) with an unpaid balance of <strong className="text-rose-700 font-black">{formatCurrency(customerActiveLoan.outstandingBalance)}</strong>.
                </p>
                <div className="pt-2 border-t border-amber-200">
                  <label className="flex items-start gap-2.5 text-xs font-bold text-slate-900 cursor-pointer bg-white p-2.5 rounded-xl border-2 border-amber-300 hover:border-amber-400 transition shadow-xs">
                    <input
                      type="checkbox"
                      checked={ownerApprovalOverride}
                      onChange={(e) => setOwnerApprovalOverride(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-sky-500"
                    />
                    <div>
                      <div className="text-slate-950 font-black">Owner / Manager Approval</div>
                      <div className="text-[10px] text-slate-500 font-medium leading-tight">
                        I authorize issuing a concurrent new loan to this borrower despite the unpaid previous balance.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Selected Customer Dossier Card */}
            {selectedCustomer && (
              <div className="p-3 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 text-xs space-y-1">
                <div className="flex items-center justify-between font-black text-navy-950">
                  <span>{selectedCustomer.fullName} ({selectedCustomer.customerId})</span>
                  <span className="text-[10px] uppercase font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
                    {selectedCustomer.customerType}
                  </span>
                </div>
                <div className="text-slate-600 flex items-center justify-between text-[11px] font-medium">
                  <span>Phone: <strong className="text-navy-900">{formatGhanaPhone(selectedCustomer.primaryPhone)}</strong></span>
                  <span>Ghana Card: <strong className="font-mono text-sky-900">{maskGhanaCard(selectedCustomer.ghanaCardNumber, true)}</strong></span>
                </div>
              </div>
            )}

            {/* 2. Principal Amount & Interest Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Principal Amount (GH₵) *</label>
                <div className="relative">
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(Number(e.target.value))}
                    className="w-full text-sm font-black px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Interest Rate (%) *</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full text-sm font-black px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Disbursement Method Selector */}
            <div className="p-3 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-2">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                Disbursement Method *
              </label>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cash', label: 'Cash Hand', desc: 'Direct Cash Payout' },
                  { id: 'bank', label: 'Bank Transfer', desc: 'Direct Bank Payout' }
                ].map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setDisbursementMethod(method.id as any)}
                    className={`py-2 px-3 text-center rounded-xl border-2 transition active:scale-95 ${
                      disbursementMethod === method.id
                        ? 'border-blue-600 bg-sky-50 text-blue-950 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-black">{method.label}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{method.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Loan Duration & Tenure */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Loan Duration *</label>
                <input
                  type="number"
                  min="1"
                  value={durationValue}
                  onChange={(e) => setDurationValue(Number(e.target.value))}
                  className="w-full text-xs font-black px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Duration Unit</label>
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value as any)}
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white"
                >
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>

            {/* Dates & Fees */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Disbursement Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Processing Fee (GH₵)</label>
                <input
                  type="number"
                  min="0"
                  value={processingFee}
                  onChange={(e) => setProcessingFee(Number(e.target.value))}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Live Financial Breakdown Summary Preview */}
            {calculation && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white space-y-2 shadow-lg shadow-sky-500/15">
                <div className="flex items-center justify-between text-xs font-bold text-sky-100">
                  <span className="flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5 text-cyan-200" />
                    Loan Calculation Summary
                  </span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-black">
                    Due {formatDate(calculation.maturityDate)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/20 text-xs">
                  <div>
                    <div className="text-[10px] text-sky-200">Total Interest ({interestRate}%)</div>
                    <div className="font-black text-sm text-cyan-200">{formatCurrency(calculation.totalInterest)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-sky-200">Total Amount To Repay</div>
                    <div className="font-black text-sm text-white">{formatCurrency(calculation.totalRepayment)}</div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit / Proceed Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={Boolean(customerActiveLoan)}
                className={`w-full py-3 text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5 ${
                  customerActiveLoan 
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 text-white active:scale-95'
                }`}
              >
                {customerActiveLoan ? 'Loan Blocked (Active Loan Exists)' : 'Review & Approve Terms'}
                {!customerActiveLoan && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>

          </form>
        ) : (
          /* 2. CONFIRMATION SCREEN */
          <div className="p-5 overflow-y-auto space-y-4 flex-1 animate-fade-in">
            <div className="text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
              Confirm Loan Terms & Disbursement
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-medium">Borrower:</span>
                <span className="font-black text-navy-950">{selectedCustomer?.fullName} ({selectedCustomer?.customerId})</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-medium">Disbursement Method:</span>
                <span className="font-black uppercase text-navy-950">
                  {disbursementMethod.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-medium">Principal Lent:</span>
                <span className="font-black text-navy-950">{formatCurrency(calculation?.principalAmount)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-medium">Interest Rate:</span>
                <span className="font-bold text-navy-950">{calculation?.interestRate}% ({interestType.replace('_', ' ')})</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-medium">Total Interest:</span>
                <span className="font-bold text-blue-700">+{formatCurrency(calculation?.totalInterest)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-medium">Processing Fee:</span>
                <span className="font-bold text-navy-950">{formatCurrency(calculation?.processingFee)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-medium">Total Amount To Repay:</span>
                <span className="font-black text-navy-950 text-sm">{formatCurrency(calculation?.totalRepayment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Maturity Due Date:</span>
                <span className="font-bold text-navy-950">{formatDate(calculation?.maturityDate)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
              >
                Modify Terms
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalApprove}
                className="flex-1 py-3 active:scale-95 text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white"
              >
                <CheckCircle2 className="w-4 h-4" />
                Disburse & Activate Loan
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
