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
  Smartphone
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

  // Aggregate Metrics
  const totalCustomers = customers.length;
  const activeLoans = loans.filter(l => isLoanOwing(l));
  const overdueLoans = loans.filter(l => isLoanOwing(l) && l.status === 'overdue');
  const dueTodayLoans = loans.filter(l => isLoanOwing(l) && l.status === 'due_today');
  const fullyPaidLoans = loans.filter(l => l.status === 'completed' || (l.outstandingBalance || 0) <= 0.01);

  const totalCollected = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + getTrueOutstanding(l), 0);
  const totalDisbursed = loans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
  const totalInterestExpected = loans.reduce((sum, l) => sum + (l.totalInterest || 0), 0);

  // Schedules due today
  const activeLoanIds = new Set(activeLoans.map(l => l.loanId));
  const dueTodaySchedules = schedules.filter(s => activeLoanIds.has(s.loanId) && s.status === 'due_today' && s.remainingBalance > 0.01);
  const dueTodayAmount = dueTodaySchedules.reduce((sum, s) => sum + s.remainingBalance, 0);

  // Overdue schedules
  const overdueSchedules = schedules.filter(s => activeLoanIds.has(s.loanId) && s.status === 'overdue' && s.remainingBalance > 0.01);
  const overdueAmount = overdueSchedules.reduce((sum, s) => sum + s.remainingBalance, 0);

  // Upcoming in next 7 days
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);
  const upcomingSchedules = schedules.filter(s => {
    if (!activeLoanIds.has(s.loanId) || s.status === 'paid' || s.remainingBalance <= 0.01) return false;
    const due = new Date(s.dueDate);
    return due > now && due <= nextWeek;
  });

  // Recent payments stream
  const recentPayments = [...payments].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 7);

  // Send 1-Click WhatsApp reminder
  const sendWhatsAppReminder = (customer: Customer, loan: Loan, schedule?: RepaymentSchedule) => {
    const rawPhone = customer.primaryPhone.replace(/\D/g, '');
    const intlPhone = rawPhone.startsWith('233') ? rawPhone : (rawPhone.startsWith('0') ? '233' + rawPhone.slice(1) : rawPhone);
    const amount = schedule ? formatCurrency(schedule.remainingBalance) : formatCurrency(loan.outstandingBalance);
    const dueDate = schedule ? formatDate(schedule.dueDate) : formatDate(loan.maturityDate || loan.firstRepaymentDate);
    const biz = settings?.businessName || 'B-F-L';
    const bizPhone = settings?.businessPhone || '';

    const text = `Hello ${customer.fullName},\n\nThis is a friendly reminder from *${biz}* regarding your Loan *${loan.loanId}*.\n\n• Outstanding Installment: *${amount}*\n• Due Date: *${dueDate}*\n\nPlease make your repayment via MTN Mobile Money or cash.\n${bizPhone ? `Contact: ${bizPhone}\n` : ''}Thank you!`;

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
    setSmsFeedback({ id: loan.loanId, msg: 'SMS sent / opened' });
    setTimeout(() => setSmsFeedback(null), 3000);
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-8 animate-fade-in text-slate-800">
      
      {/* 1. Executive Hero Card + Top KPI Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Main Outstanding Money Card (Spans 2 columns on desktop) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 rounded-3xl p-5 sm:p-6 text-white shadow-2xl border border-sky-500/30 relative overflow-hidden flex flex-col justify-between">
          {/* Subtle Ambient Glows */}
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between text-sky-300 text-xs font-bold uppercase tracking-wider mb-2 gap-2">
              <span className="flex items-center gap-1.5 truncate">
                <Wallet className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Active Loan Portfolio (Principal at Risk)</span>
              </span>
              
              {/* Multi-Device Cloud Sync Live Pill */}
              <button
                onClick={handleManualSync}
                type="button"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-white/10 hover:bg-white/20 border border-white/20 transition active:scale-95 text-sky-200 shrink-0"
                title="Cross-Device Cloud Sync Status"
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-sky-300" />
                    <span>Syncing...</span>
                  </>
                ) : syncStatus === 'offline' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>Offline</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Cloud Live {lastSyncTime ? `• ${lastSyncTime}` : ''}</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-baseline gap-3 my-2">
              <span className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-sm font-mono">
                {formatCurrency(totalOutstanding)}
              </span>
              <span className="text-xs sm:text-sm font-bold text-sky-300/80 bg-sky-400/15 px-2.5 py-0.5 rounded-lg border border-sky-400/30">
                {activeLoans.length} Active {activeLoans.length === 1 ? 'Loan' : 'Loans'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-3.5 mt-3 border-t border-white/15 text-xs">
            <div className="bg-white/5 p-2.5 sm:p-3 rounded-2xl border border-white/10 min-w-0">
              <div className="text-slate-400 text-[10px] sm:text-[11px] font-bold uppercase truncate">Total Collected</div>
              <div className="font-black text-emerald-300 text-xs sm:text-base mt-0.5 font-mono truncate">{formatCurrency(totalCollected)}</div>
            </div>
            <div className="bg-white/5 p-2.5 sm:p-3 rounded-2xl border border-white/10 min-w-0">
              <div className="text-slate-400 text-[10px] sm:text-[11px] font-bold uppercase truncate">Total Lent</div>
              <div className="font-black text-sky-300 text-xs sm:text-base mt-0.5 font-mono truncate">{formatCurrency(totalDisbursed)}</div>
            </div>
            <div className="bg-white/5 p-2.5 sm:p-3 rounded-2xl border border-white/10 min-w-0">
              <div className="text-slate-400 text-[10px] sm:text-[11px] font-bold uppercase truncate">Borrowers Base</div>
              <div className="font-black text-white text-xs sm:text-base mt-0.5 truncate">{totalCustomers} Clients</div>
            </div>
          </div>
        </div>

        {/* Right Side Urgent Status Cards (Stacked on desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
          
          {/* Due Today Card */}
          <div 
            onClick={() => onNavigate('loans', { filter: 'due_today' })}
            className="bg-sky-50/90 border-2 border-sky-200 hover:border-sky-400 rounded-3xl p-4 cursor-pointer hover:shadow-md transition active:scale-98 min-w-0 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1 gap-1">
              <span className="text-xs font-black uppercase text-sky-900 flex items-center gap-1.5 truncate">
                <Clock className="w-4 h-4 text-sky-700 shrink-0" />
                <span className="truncate">Due Today</span>
              </span>
              <span className="text-xs font-bold bg-sky-200 text-sky-900 px-2 py-0.5 rounded-full shrink-0">
                {dueTodayLoans.length}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-sky-950 font-mono truncate my-1">
              {formatCurrency(dueTodayAmount)}
            </div>
            <p className="text-[11px] text-sky-800 font-semibold truncate flex items-center gap-1">
              <span>View due list</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </p>
          </div>

          {/* Overdue Card */}
          <div 
            onClick={() => onNavigate('loans', { filter: 'overdue' })}
            className="bg-rose-50 border-2 border-rose-200 hover:border-rose-400 rounded-3xl p-4 cursor-pointer hover:shadow-md transition active:scale-98 min-w-0 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-1 gap-1">
              <span className="text-xs font-black uppercase text-rose-900 flex items-center gap-1.5 truncate">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="truncate">Overdue Debt</span>
              </span>
              <span className="text-xs font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full shrink-0">
                {overdueLoans.length}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-950 font-mono truncate my-1">
              {formatCurrency(overdueAmount)}
            </div>
            <p className="text-[11px] text-rose-800 font-semibold truncate flex items-center gap-1">
              <span>Follow up defaulters</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </p>
          </div>

        </div>

      </div>

      {/* 2. Four Big Quick Action Buttons Grid */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 px-1">
          Quick Actions & Operations
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Button 1: Register Client */}
          <button
            onClick={onOpenNewCustomer}
            type="button"
            className="p-4 rounded-3xl bg-white border-2 border-sky-100 hover:border-sky-400 hover:bg-sky-50/50 shadow-sm active:scale-95 transition flex items-center gap-3 text-left group overflow-hidden"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md group-hover:scale-110 transition">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">Add Client</div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">New borrower</div>
            </div>
          </button>

          {/* Button 2: Give Loan */}
          <button
            onClick={() => onOpenNewLoan()}
            type="button"
            className="p-4 rounded-3xl bg-white border-2 border-emerald-100 hover:border-emerald-400 hover:bg-emerald-50/50 shadow-sm active:scale-95 transition flex items-center gap-3 text-left group overflow-hidden"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md group-hover:scale-110 transition">
              <Banknote className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">Issue Loan</div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">Cash & MTN MoMo</div>
            </div>
          </button>

          {/* Button 3: Collect Money */}
          <button
            onClick={() => onOpenRecordPayment()}
            type="button"
            className="p-4 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg active:scale-95 transition flex items-center gap-3 text-left group overflow-hidden"
          >
            <div className="w-11 h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold shrink-0 shadow-sm group-hover:scale-110 transition">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-black text-white leading-tight truncate">Collect Pay</div>
              <div className="text-[10px] sm:text-xs text-sky-100 font-semibold truncate">Record receipt</div>
            </div>
          </button>

          {/* Button 4: Sync Devices Now */}
          <button
            onClick={handleManualSync}
            type="button"
            className="p-4 rounded-3xl bg-white border-2 border-indigo-100 hover:border-indigo-400 hover:bg-indigo-50/50 shadow-sm active:scale-95 transition flex items-center gap-3 text-left group overflow-hidden"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md group-hover:scale-110 transition">
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">Sync Devices</div>
              <div className="text-[10px] sm:text-xs text-indigo-600 font-bold truncate">Laptop & Phone</div>
            </div>
          </button>

        </div>
      </div>

      {/* 3. 2-Column Section: Collections & Reminders + Recent Repayments Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Collections & 1-Click Reminders */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                  Collections & Reminders
                </h3>
              </div>

              {/* Sub-tabs: Due Today / Overdue / Upcoming */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-[11px] font-bold">
                <button
                  onClick={() => setActiveCollectionTab('due_today')}
                  className={`px-2.5 py-1 rounded-lg transition ${activeCollectionTab === 'due_today' ? 'bg-white text-blue-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Due Today ({dueTodayLoans.length})
                </button>
                <button
                  onClick={() => setActiveCollectionTab('overdue')}
                  className={`px-2.5 py-1 rounded-lg transition ${activeCollectionTab === 'overdue' ? 'bg-rose-600 text-white shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Overdue ({overdueLoans.length})
                </button>
                <button
                  onClick={() => setActiveCollectionTab('upcoming')}
                  className={`px-2.5 py-1 rounded-lg transition ${activeCollectionTab === 'upcoming' ? 'bg-white text-blue-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Next 7 Days ({upcomingSchedules.length})
                </button>
              </div>
            </div>

            {smsFeedback && (
              <div className="p-2.5 mt-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold animate-fade-in flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{smsFeedback.msg}</span>
              </div>
            )}

            <div className="space-y-2.5 pt-3">
              {activeCollectionTab === 'due_today' && (
                dueTodayLoans.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-medium">
                    🎉 No loan installments due today!
                  </div>
                ) : (
                  dueTodayLoans.map(loan => {
                    const cust = customers.find(c => c.customerId === loan.customerId);
                    return (
                      <div 
                        key={loan.loanId}
                        className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 flex items-center justify-between gap-3 overflow-hidden"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-black text-slate-900 truncate flex items-center gap-1.5">
                            <span>{loan.customerName}</span>
                            <span className="text-[10px] font-bold text-sky-800 bg-sky-200/70 px-1.5 py-0.2 rounded font-mono">
                              {loan.loanId}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 truncate mt-0.5">
                            Due Today: <strong className="text-sky-950 font-black font-mono">{formatCurrency(loan.installmentAmount)}</strong>
                          </div>
                          {cust?.primaryPhone && (
                            <div className="text-[11px] text-slate-500 truncate font-mono">
                              {cust.primaryPhone} {cust.momoNumber ? `• MoMo: ${cust.momoNumber}` : ''}
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
                                title="1-Click WhatsApp Reminder"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => sendSMSReminder(cust, loan)}
                                className="p-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-blue-800 transition active:scale-95"
                                title="1-Click SMS Reminder"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenRecordPayment(loan.loanId)}
                            className="px-3 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-1"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Collect</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              )}

              {activeCollectionTab === 'overdue' && (
                overdueLoans.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-medium">
                    ✨ Great news! No overdue loans right now.
                  </div>
                ) : (
                  overdueLoans.map(loan => {
                    const cust = customers.find(c => c.customerId === loan.customerId);
                    return (
                      <div 
                        key={loan.loanId}
                        className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-center justify-between gap-3 overflow-hidden"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-black text-slate-900 truncate flex items-center gap-1.5">
                            <span>{loan.customerName}</span>
                            <span className="text-[10px] font-bold text-rose-800 bg-rose-200 px-1.5 py-0.2 rounded font-mono">
                              {loan.loanId}
                            </span>
                          </div>
                          <div className="text-xs text-rose-700 font-bold truncate mt-0.5">
                            Overdue Balance: <strong className="font-mono text-rose-950 font-black">{formatCurrency(loan.outstandingBalance)}</strong>
                          </div>
                          {cust?.primaryPhone && (
                            <div className="text-[11px] text-slate-500 truncate font-mono">
                              {cust.primaryPhone} {cust.momoNumber ? `• MoMo: ${cust.momoNumber}` : ''}
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
                                title="1-Click WhatsApp Overdue Demand Notice"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => sendSMSReminder(cust, loan)}
                                className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 transition active:scale-95"
                                title="1-Click SMS Overdue Notice"
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
                            <span>Collect</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              )}

              {activeCollectionTab === 'upcoming' && (
                upcomingSchedules.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-medium">
                    No upcoming repayments in the next 7 days.
                  </div>
                ) : (
                  upcomingSchedules.slice(0, 6).map(sched => {
                    const loan = loans.find(l => l.loanId === sched.loanId);
                    const cust = customers.find(c => c.customerId === sched.customerId);
                    return (
                      <div 
                        key={`${sched.loanId}-${sched.installmentNumber}`}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 overflow-hidden"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {loan?.customerName || sched.customerId}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            Due {formatDate(sched.dueDate)}: <strong className="font-mono text-slate-900 font-bold">{formatCurrency(sched.remainingBalance)}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {cust && loan && (
                            <button
                              type="button"
                              onClick={() => sendWhatsAppReminder(cust, loan, sched)}
                              className="p-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition"
                              title="1-Click WhatsApp Reminder"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenRecordPayment(sched.loanId)}
                            className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition"
                          >
                            Collect
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('loans', { filter: 'active' })}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition text-center"
          >
            View Complete Loan Portfolio →
          </button>
        </div>

        {/* Right Column: Recent Repayments Stream */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Recent Repayments Received</span>
              </h3>
              <button
                onClick={() => onNavigate('payments')}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-0.5 shrink-0"
              >
                <span>All Payments</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentPayments.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 font-medium">
                No payments recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5 pt-3">
                {recentPayments.map(p => (
                  <div 
                    key={p.paymentId}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-sky-50/50 transition gap-3 overflow-hidden"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                        <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                          <span>Loan {p.loanId}</span>
                          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md uppercase ${
                            p.paymentMethod === 'momo' 
                              ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                              : p.paymentMethod === 'bank'
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}>
                            {p.paymentMethod === 'momo' ? 'MTN MoMo' : p.paymentMethod}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {formatDate(p.paymentDate)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-black text-emerald-700 font-mono truncate">
                        +{formatCurrency(p.amountPaid)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {p.paymentId}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('payments')}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition text-center"
          >
            View All Collection Records →
          </button>
        </div>

      </div>

    </div>
  );
};

