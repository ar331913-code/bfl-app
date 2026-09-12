import React, { useState, useEffect } from 'react';
import { Customer, Loan, RepaymentSchedule, Payment, AppNotification } from '../types';
import { 
  Users, 
  Banknote, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  UserPlus, 
  ArrowUpRight, 
  DollarSign, 
  ChevronRight, 
  Wallet, 
  Calendar, 
  TrendingUp, 
  ShieldCheck, 
  RefreshCw, 
  MessageCircle, 
  Phone, 
  Send, 
  Sparkles, 
  Smartphone,
  Check,
  Receipt,
  FileText
} from 'lucide-react';
import { formatCurrency, formatDate, isLoanOwing, getTrueOutstanding, formatGhanaPhone } from '../utils/formatters';
import { CloudSyncService } from '../services/cloudSyncService';
import { SMSService } from '../services/smsService';
import { useAuth } from '../context/AuthContext';

interface DashboardProps {
  customers: Customer[];
  loans: Loan[];
  schedules: RepaymentSchedule[];
  payments: Payment[];
  notifications: AppNotification[];
  onNavigate: (tab: string, extra?: any) => void;
  onOpenNewCustomer: () => void;
  onOpenNewLoan: (customerId?: string) => void;
  onOpenRecordPayment: (loanId?: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  onSelectLoan: (loan: Loan) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  customers,
  loans,
  schedules,
  payments,
  onNavigate,
  onOpenNewCustomer,
  onOpenNewLoan,
  onOpenRecordPayment,
  onSelectCustomer,
  onSelectLoan
}) => {
  const { settings } = useAuth();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'offline'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | undefined>(undefined);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeCollectionTab, setActiveCollectionTab] = useState<'due_today' | 'overdue' | 'upcoming'>('due_today');
  const [smsFeedback, setSmsFeedback] = useState<{ id: string; msg: string } | null>(null);

  useEffect(() => {
    const unsubscribe = CloudSyncService.subscribe((status, lastSync) => {
      setSyncStatus(status);
      if (lastSync) setLastSyncTime(lastSync);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await CloudSyncService.syncWithCloud(true);
    setIsSyncing(false);
  };

  // Safe calculated aggregates
  const totalCustomers = (customers || []).length;
  const activeLoans = (loans || []).filter(l => isLoanOwing(l));
  const overdueLoans = (loans || []).filter(l => isLoanOwing(l) && l.status === 'overdue');
  const dueTodayLoans = (loans || []).filter(l => isLoanOwing(l) && l.status === 'due_today');
  const fullyPaidLoans = (loans || []).filter(l => l.status === 'completed' || (l.outstandingBalance || 0) <= 0.01);

  const totalCollected = (payments || []).reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + getTrueOutstanding(l), 0);
  const totalDisbursed = (loans || []).reduce((sum, l) => sum + (l.principalAmount || 0), 0);

  // Schedules due today
  const activeLoanIds = new Set(activeLoans.map(l => l.loanId));
  const dueTodaySchedules = (schedules || []).filter(
    s => s && activeLoanIds.has(s.loanId) && s.status === 'due_today' && (s.remainingBalance || 0) > 0.01
  );
  const dueTodayAmount = dueTodaySchedules.reduce((sum, s) => sum + (s.remainingBalance || 0), 0);

  // Overdue schedules
  const overdueSchedules = (schedules || []).filter(
    s => s && activeLoanIds.has(s.loanId) && s.status === 'overdue' && (s.remainingBalance || 0) > 0.01
  );
  const overdueAmount = overdueSchedules.reduce((sum, s) => sum + (s.remainingBalance || 0), 0);

  // Upcoming in next 7 days
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);
  const upcomingSchedules = (schedules || []).filter(s => {
    if (!s || !activeLoanIds.has(s.loanId) || s.status === 'paid' || (s.remainingBalance || 0) <= 0.01) return false;
    if (!s.dueDate) return false;
    try {
      const match = s.dueDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
      const due = match ? new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10), 12, 0, 0) : new Date(s.dueDate);
      return due > now && due <= nextWeek;
    } catch {
      return false;
    }
  });

  // Recent payments stream
  const recentPayments = [...(payments || [])]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 8);

  const getCustomerName = (customerId: string) => {
    const c = (customers || []).find(x => x.customerId === customerId);
    return c ? c.fullName : customerId;
  };

  // Send 1-Click WhatsApp reminder
  const sendWhatsAppReminder = (customer: Customer, loan: Loan, schedule?: RepaymentSchedule) => {
    const rawPhone = customer.primaryPhone.replace(/\D/g, '');
    const intlPhone = rawPhone.startsWith('233') ? rawPhone : (rawPhone.startsWith('0') ? '233' + rawPhone.slice(1) : rawPhone);
    const amount = schedule ? formatCurrency(schedule.remainingBalance) : formatCurrency(loan.outstandingBalance);
    const dueDate = schedule ? formatDate(schedule.dueDate) : formatDate(loan.maturityDate || loan.firstRepaymentDate);
    const biz = settings?.businessName || 'B-F-L';
    const bizPhone = settings?.businessPhone || '';

    const text = `Hello ${customer.fullName},\n\nThis is a friendly reminder from *${biz}* regarding your Loan *${loan.loanId}*.\n\n• Amount Due: *${amount}*\n• Due Date: *${dueDate}*\n\nPlease make your payment via MTN Mobile Money or cash.\n${bizPhone ? `Contact: ${bizPhone}\n` : ''}Thank you!`;

    const url = `https://wa.me/${intlPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Send 1-Click SMS reminder
  const sendSMSReminder = async (customer: Customer, loan: Loan, schedule?: RepaymentSchedule) => {
    const data = {
      customer,
      loan,
      schedule,
      businessName: settings?.businessName,
      businessPhone: settings?.businessPhone
    };
    const message = schedule 
      ? SMSService.generateDueReminderSMS(data)
      : SMSService.generateOverdueSMS(data);

    await SMSService.dispatchSMS(customer.primaryPhone, message, settings);
    setSmsFeedback({ id: loan.loanId, msg: `Reminder sent to ${customer.fullName}!` });
    setTimeout(() => setSmsFeedback(null), 3000);
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-8 animate-fade-in text-slate-800">
      
      {/* 1. Header Banner with Clear Welcome & Live Cloud Sync */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-950 tracking-tight">
            Welcome to {settings?.businessName || 'B-F-L'} Dashboard
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Overview of loan disbursements, collections, and daily borrower repayments
          </p>
        </div>

        {/* Live Multi-Device Cloud Sync Status Pill */}
        <button
          onClick={handleManualSync}
          type="button"
          disabled={isSyncing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition active:scale-95 text-slate-700 text-xs font-bold shadow-xs shrink-0 self-start sm:self-auto"
          title="Click to sync across laptop & phone"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>
            {isSyncing ? 'Syncing...' : syncStatus === 'offline' ? 'Offline Mode' : 'Cloud Synchronized'}
          </span>
          {lastSyncTime && <span className="text-[10px] text-slate-400 font-normal">({lastSyncTime})</span>}
        </button>
      </div>

      {/* 2. Top 4 Clear, Large, High-Contrast KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Total Money Lent */}
        <div 
          onClick={() => onNavigate('loans', { filter: 'all' })}
          className="bg-gradient-to-br from-blue-900 to-indigo-950 rounded-3xl p-5 text-white shadow-md border border-blue-800/40 cursor-pointer hover:shadow-lg transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Total Money Lent</span>
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-blue-200 group-hover:scale-110 transition">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
              {formatCurrency(totalDisbursed)}
            </div>
            <div className="text-[11px] text-blue-200 font-semibold mt-1 flex items-center justify-between">
              <span>{loans.length} Total Loans Given</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            </div>
          </div>
        </div>

        {/* Card 2: Total Money Collected */}
        <div 
          onClick={() => onNavigate('payments')}
          className="bg-gradient-to-br from-emerald-800 to-teal-950 rounded-3xl p-5 text-white shadow-md border border-emerald-700/40 cursor-pointer hover:shadow-lg transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Total Money Collected</span>
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-200 group-hover:scale-110 transition">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
              {formatCurrency(totalCollected)}
            </div>
            <div className="text-[11px] text-emerald-200 font-semibold mt-1 flex items-center justify-between">
              <span>{payments.length} Payments Received</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            </div>
          </div>
        </div>

        {/* Card 3: Money Remaining to Collect */}
        <div 
          onClick={() => onNavigate('loans', { filter: 'active' })}
          className="bg-gradient-to-br from-amber-800 to-orange-950 rounded-3xl p-5 text-white shadow-md border border-amber-700/40 cursor-pointer hover:shadow-lg transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-200">Remaining to Collect</span>
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-amber-200 group-hover:scale-110 transition">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
              {formatCurrency(totalOutstanding)}
            </div>
            <div className="text-[11px] text-amber-200 font-semibold mt-1 flex items-center justify-between">
              <span>{activeLoans.length} Active Borrowers</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            </div>
          </div>
        </div>

        {/* Card 4: Payments Due Today */}
        <div 
          onClick={() => onNavigate('loans', { filter: 'due_today' })}
          className="bg-gradient-to-br from-sky-800 to-blue-950 rounded-3xl p-5 text-white shadow-md border border-sky-700/40 cursor-pointer hover:shadow-lg transition flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-200">Due Today</span>
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-sky-200 group-hover:scale-110 transition">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
              {formatCurrency(dueTodayAmount)}
            </div>
            <div className="text-[11px] text-sky-200 font-semibold mt-1 flex items-center justify-between">
              <span>{dueTodayLoans.length} Borrowers Due Today</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            </div>
          </div>
        </div>

      </div>

      {/* 3. Fast Quick Action Buttons */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5 px-1">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Button 1: Disburse Loan */}
          <button
            onClick={() => onOpenNewLoan()}
            type="button"
            className="p-4 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-md active:scale-95 transition flex items-center gap-3 text-left group"
          >
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center font-bold shrink-0">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-black text-white leading-tight truncate">+ Issue Loan</div>
              <div className="text-[10px] sm:text-xs text-emerald-100 font-semibold truncate">Disburse Cash/MoMo</div>
            </div>
          </button>

          {/* Button 2: Record Payment */}
          <button
            onClick={() => onOpenRecordPayment()}
            type="button"
            className="p-4 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-md active:scale-95 transition flex items-center gap-3 text-left group"
          >
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center font-bold shrink-0">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-black text-white leading-tight truncate">Record Payment</div>
              <div className="text-[10px] sm:text-xs text-blue-100 font-semibold truncate">Accept Repayment</div>
            </div>
          </button>

          {/* Button 3: Add Client */}
          <button
            onClick={onOpenNewCustomer}
            type="button"
            className="p-4 rounded-3xl bg-white border-2 border-slate-200 hover:border-slate-400 shadow-sm active:scale-95 transition flex items-center gap-3 text-left group"
          >
            <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0">
              <UserPlus className="w-5 h-5 text-slate-700" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">+ Add Client</div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-semibold truncate">New Driver / Trader</div>
            </div>
          </button>

          {/* Button 4: View Loans Portfolio */}
          <button
            onClick={() => onNavigate('loans')}
            type="button"
            className="p-4 rounded-3xl bg-white border-2 border-slate-200 hover:border-slate-400 shadow-sm active:scale-95 transition flex items-center gap-3 text-left group"
          >
            <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0">
              <Wallet className="w-5 h-5 text-slate-700" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">Loan Portfolio</div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-semibold truncate">View all {loans.length} loans</div>
            </div>
          </button>

        </div>
      </div>

      {/* 4. Two Clean Lower Panels: Today's Collections & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Who Needs to Pay Today / Overdue */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                  Collections & Reminders
                </h3>
              </div>

              {/* Sub-tabs: Due Today / Overdue / Upcoming */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-[11px] font-bold">
                <button
                  onClick={() => setActiveCollectionTab('due_today')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeCollectionTab === 'due_today' 
                      ? 'bg-blue-600 text-white shadow-xs font-black' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Due Today ({dueTodayLoans.length})
                </button>
                <button
                  onClick={() => setActiveCollectionTab('overdue')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeCollectionTab === 'overdue' 
                      ? 'bg-rose-600 text-white shadow-xs font-black' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Overdue ({overdueLoans.length})
                </button>
                <button
                  onClick={() => setActiveCollectionTab('upcoming')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeCollectionTab === 'upcoming' 
                      ? 'bg-blue-600 text-white shadow-xs font-black' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Next 7 Days ({upcomingSchedules.length})
                </button>
              </div>
            </div>

            {smsFeedback && (
              <div className="p-2.5 mt-2 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold animate-fade-in flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{smsFeedback.msg}</span>
              </div>
            )}

            {/* List for Selected Tab */}
            <div className="space-y-2.5 pt-3">
              {activeCollectionTab === 'due_today' && (
                dueTodayLoans.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 font-medium">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                    No customer installments due for payment today.
                  </div>
                ) : (
                  dueTodayLoans.map(loan => {
                    const cust = customers.find(c => c.customerId === loan.customerId);
                    return (
                      <div 
                        key={loan.loanId}
                        className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-black text-slate-950 truncate flex items-center gap-1.5">
                            <span>{loan.customerName}</span>
                            <span className="text-[10px] font-bold text-sky-800 bg-sky-200 px-1.5 py-0.2 rounded font-mono">
                              {loan.loanId}
                            </span>
                          </div>
                          <div className="text-xs text-sky-950 font-bold mt-0.5">
                            Amount Due: <strong className="font-mono text-slate-950 font-black">{formatCurrency(loan.installmentAmount)}</strong>
                          </div>
                          {cust?.primaryPhone && (
                            <div className="text-[11px] text-slate-500 font-mono">
                              {formatGhanaPhone(cust.primaryPhone)}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {cust && (
                            <>
                              <button
                                type="button"
                                onClick={() => sendWhatsAppReminder(cust, loan)}
                                className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition active:scale-95"
                                title="WhatsApp Reminder"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => sendSMSReminder(cust, loan)}
                                className="p-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 transition active:scale-95"
                                title="SMS Reminder"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenRecordPayment(loan.loanId)}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-1"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Pay</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              )}

              {activeCollectionTab === 'overdue' && (
                overdueLoans.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 font-medium">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                    No overdue loans. All borrowers are up to date! 🎉
                  </div>
                ) : (
                  overdueLoans.map(loan => {
                    const cust = customers.find(c => c.customerId === loan.customerId);
                    return (
                      <div 
                        key={loan.loanId}
                        className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-black text-rose-950 truncate flex items-center gap-1.5">
                            <span>{loan.customerName}</span>
                            <span className="text-[10px] font-bold text-rose-800 bg-rose-200 px-1.5 py-0.2 rounded font-mono">
                              {loan.loanId}
                            </span>
                          </div>
                          <div className="text-xs text-rose-900 font-bold mt-0.5">
                            Unpaid Balance: <strong className="font-mono text-rose-950 font-black">{formatCurrency(loan.outstandingBalance)}</strong>
                          </div>
                          {cust?.primaryPhone && (
                            <div className="text-[11px] text-slate-500 font-mono">
                              {formatGhanaPhone(cust.primaryPhone)}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {cust && (
                            <>
                              <button
                                type="button"
                                onClick={() => sendWhatsAppReminder(cust, loan)}
                                className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition active:scale-95"
                                title="WhatsApp Reminder"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => sendSMSReminder(cust, loan)}
                                className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 transition active:scale-95"
                                title="SMS Reminder"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenRecordPayment(loan.loanId)}
                            className="px-3 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-1"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Pay</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              )}

              {activeCollectionTab === 'upcoming' && (
                upcomingSchedules.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 font-medium">
                    No upcoming repayments due in the next 7 days.
                  </div>
                ) : (
                  upcomingSchedules.slice(0, 5).map(sched => {
                    const l = loans.find(item => item.loanId === sched.loanId);
                    return (
                      <div 
                        key={`${sched.loanId}-${sched.installmentNumber}`}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{l?.customerName || sched.customerId}</div>
                          <div className="text-[11px] text-slate-500">
                            Installment #{sched.installmentNumber} • Due <strong className="text-slate-800">{formatDate(sched.dueDate)}</strong>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-slate-900 font-mono">{formatCurrency(sched.expectedAmount)}</div>
                          <span className="text-[10px] text-blue-700 font-bold uppercase">{l?.repaymentFrequency}</span>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Payments Received Stream */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                  Recent Repayments Received
                </h3>
              </div>
              <button
                onClick={() => onNavigate('payments')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
              >
                <span>All Receipts</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 pt-3">
              {recentPayments.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 font-medium">
                  No payments recorded yet. Tap "Record Payment" to accept repayments.
                </div>
              ) : (
                recentPayments.map(payment => (
                  <div
                    key={payment.paymentId}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 flex items-center justify-between gap-3 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-black text-slate-950 truncate">{getCustomerName(payment.customerId)}</span>
                        <span className="text-[10px] font-mono text-slate-400">({payment.loanId})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {formatDate(payment.paymentDate)} • <span className="uppercase font-bold text-slate-700">{payment.paymentMethod}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-emerald-700 font-mono">
                        +{formatCurrency(payment.amountPaid)}
                      </div>
                      <div className="text-[10px] font-mono font-bold text-slate-400">
                        {payment.paymentId}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
