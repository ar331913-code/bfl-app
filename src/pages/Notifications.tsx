import React, { useState } from 'react';
import { db } from '../db';
import { AppNotification, NotificationType, Loan, Customer } from '../types';
import { 
  Bell, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  CheckCheck, 
  Trash2, 
  ArrowRight,
  ChevronRight,
  MessageSquare,
  DollarSign
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { SMSService } from '../services/smsService';
import { useAuth } from '../context/AuthContext';

interface NotificationsProps {
  notifications: AppNotification[];
  loans?: Loan[];
  customers?: Customer[];
  onNavigate: (tab: string, extra?: any) => void;
  onOpenRecordPayment: (loanId?: string) => void;
}

export const Notifications: React.FC<NotificationsProps> = ({
  notifications,
  loans = [],
  customers = [],
  onNavigate,
  onOpenRecordPayment
}) => {
  const { settings } = useAuth();
  const [filterType, setFilterType] = useState<string>('all');

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    for (const n of unread) {
      if (n.id) await db.notifications.update(n.id, { isRead: true });
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      await db.notifications.clear();
    }
  };

  const handleSendSMSNotice = (loanId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const loan = loans.find(l => l.loanId === loanId);
    if (!loan) return;
    const customer = customers.find(c => c.customerId === loan.customerId);
    if (!customer) return;

    const text = SMSService.generateOverdueSMS({
      customer,
      loan,
      businessName: settings?.businessName,
      businessPhone: settings?.businessPhone
    });
    SMSService.sendSMS(customer.primaryPhone, text);
  };

  const filteredNotifications = notifications.filter(n => {
    if (filterType === 'due_today') return n.type === 'due_today';
    if (filterType === 'overdue') return n.type === 'overdue';
    if (filterType === 'completed') return n.type === 'loan_completed';
    return true;
  }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-navy-950">Notification Center</h1>
          <p className="text-xs text-slate-500 font-medium">
            {unreadCount > 0 ? `${unreadCount} unread alert(s)` : 'All caught up'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold rounded-xl flex items-center gap-1 transition border border-sky-200"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Read All
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-2 text-slate-400 hover:text-rose-600 rounded-xl transition"
              title="Clear Notifications"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: `All (${notifications.length})` },
          { id: 'due_today', label: `Due Today (${notifications.filter(n => n.type === 'due_today').length})` },
          { id: 'overdue', label: `Overdue (${notifications.filter(n => n.type === 'overdue').length})` },
          { id: 'completed', label: `Completed (${notifications.filter(n => n.type === 'loan_completed').length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition border ${
              filterType === tab.id
                ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-md border-transparent'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-400 mx-auto flex items-center justify-center border border-sky-100">
            <Bell className="w-6 h-6" />
          </div>
          <div className="text-sm font-black text-navy-950">No notifications</div>
          <div className="text-xs text-slate-400">
            You have no pending alerts under this filter.
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map(n => (
            <div
              key={n.id}
              onClick={async () => {
                if (n.id && !n.isRead) {
                  await db.notifications.update(n.id, { isRead: true });
                }
                if (n.loanId) {
                  onOpenRecordPayment(n.loanId);
                }
              }}
              className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3.5 shadow-xs ${
                !n.isRead 
                  ? 'bg-white border-sky-300 ring-2 ring-sky-200/50' 
                  : 'bg-slate-50 border-slate-200/80'
              }`}
            >
              {/* Type Icon */}
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                n.type === 'overdue' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                n.type === 'due_today' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                n.type === 'loan_completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                'bg-sky-100 text-sky-800 border-sky-200'
              }`}>
                {n.type === 'overdue' ? <AlertTriangle className="w-5 h-5" /> :
                 n.type === 'due_today' ? <Clock className="w-5 h-5" /> :
                 n.type === 'loan_completed' ? <CheckCircle2 className="w-5 h-5" /> :
                 <Info className="w-5 h-5" />}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-black text-navy-950 truncate">{n.title}</span>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">{formatDate(n.createdAt)}</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed font-medium">{n.message}</p>

                {/* Actions row */}
                <div className="mt-2.5 flex items-center gap-2">
                  {n.loanId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenRecordPayment(n.loanId);
                      }}
                      className="px-2.5 py-1 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[10px] font-black rounded-lg shadow-xs flex items-center gap-1 hover:from-sky-600 hover:to-blue-700"
                    >
                      <DollarSign className="w-3 h-3" /> Record Payment
                    </button>
                  )}

                  {n.loanId && n.type === 'overdue' && (
                    <button
                      type="button"
                      onClick={(e) => handleSendSMSNotice(n.loanId!, e)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-black rounded-lg flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" /> Text Overdue Notice
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
