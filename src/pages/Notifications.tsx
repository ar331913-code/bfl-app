import React, { useState } from 'react';
import { db } from '../db';
import { AppNotification, NotificationType } from '../types';
import { 
  Bell, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  CheckCheck, 
  Trash2, 
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

interface NotificationsProps {
  notifications: AppNotification[];
  onNavigate: (tab: string, extra?: any) => void;
  onOpenRecordPayment: (loanId?: string) => void;
}

export const Notifications: React.FC<NotificationsProps> = ({
  notifications,
  onNavigate,
  onOpenRecordPayment
}) => {
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
          <h1 className="text-lg font-bold text-navy-950">Notification Center</h1>
          <p className="text-xs text-slate-500">
            {unreadCount > 0 ? `${unreadCount} unread alert(s)` : 'All caught up'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-xl flex items-center gap-1 transition"
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              filterType === tab.id
                ? 'bg-navy-900 text-white shadow-sm'
                : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Bell className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-navy-950">No notifications</div>
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
              className={`p-4 rounded-2xl border transition cursor-pointer flex items-start gap-3.5 shadow-sm ${
                !n.isRead 
                  ? 'bg-white border-brand-500/40 ring-1 ring-brand-500/20' 
                  : 'bg-slate-50/80 border-slate-200/80'
              }`}
            >
              {/* Type Icon */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                n.type === 'overdue' ? 'bg-rose-100 text-rose-700' :
                n.type === 'due_today' ? 'bg-amber-100 text-amber-800' :
                n.type === 'loan_completed' ? 'bg-emerald-100 text-emerald-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {n.type === 'overdue' ? <AlertTriangle className="w-4 h-4" /> :
                 n.type === 'due_today' ? <Clock className="w-4 h-4" /> :
                 n.type === 'loan_completed' ? <CheckCircle2 className="w-4 h-4" /> :
                 <Info className="w-4 h-4" />}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-navy-950 truncate">{n.title}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{formatDate(n.createdAt)}</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>

                {n.loanId && (
                  <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-brand-700">
                    <span>Record Payment for {n.loanId}</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
