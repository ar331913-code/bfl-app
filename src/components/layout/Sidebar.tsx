import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Home, 
  Users, 
  Banknote, 
  Receipt, 
  Bell, 
  FileText, 
  Settings as SettingsIcon,
  PlusCircle,
  Cloud,
  CloudOff,
  RefreshCw,
  Lock,
  LogOut,
  Search
} from 'lucide-react';
import { AppNotification } from '../../types';
import { CloudSyncService } from '../../services/cloudSyncService';

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  unreadNotifications: AppNotification[];
  overdueCount: number;
  onOpenSearch: () => void;
  onOpenNewCustomer: () => void;
  onOpenNewLoan: () => void;
  onOpenRecordPayment: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  unreadNotifications,
  overdueCount,
  onOpenSearch,
  onOpenNewCustomer,
  onOpenNewLoan,
  onOpenRecordPayment
}) => {
  const { settings, lockSession, logout } = useAuth();
  const unreadCount = unreadNotifications.filter(n => !n.isRead).length;

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'offline'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | undefined>(undefined);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'customers', label: 'Clients Directory', icon: Users },
    { id: 'loans', label: 'Loan Portfolio', icon: Banknote, badge: overdueCount > 0 ? overdueCount : undefined, badgeColor: 'bg-rose-500' },
    { id: 'payments', label: 'Collections & Payments', icon: Receipt },
    { id: 'notifications', label: 'Alerts & Due Dates', icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined, badgeColor: 'bg-amber-500' },
    { id: 'reports', label: 'Reports & Analytics', icon: FileText },
    { id: 'settings', label: 'Settings & Security', icon: SettingsIcon },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white border-r border-slate-800 shrink-0 h-screen sticky top-0 select-none z-20 shadow-2xl">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-lg ring-2 ring-sky-400/40 group-hover:scale-105 transition">
            BFL
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base tracking-tight text-white">B-F-L</span>
              <span className="text-[10px] uppercase font-mono font-bold bg-sky-400/20 text-sky-300 border border-sky-400/30 px-1.5 py-0.5 rounded-md">
                GH₵
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">Microfinance Manager</p>
          </div>
        </div>
      </div>

      {/* Quick Search Shortcut Bar */}
      <div className="px-4 pt-4">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition text-xs font-semibold group shadow-xs"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-sky-400 group-hover:scale-110 transition" />
            <span>Search client or loan...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-800 text-slate-400 rounded-md border border-slate-700">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        <div className="px-3 pb-1 text-[11px] font-black uppercase tracking-wider text-slate-400">
          Main Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 border border-blue-400/30 translate-x-1'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-300'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && item.badge > 0 && (
                <span className={`px-2 py-0.5 text-[10px] font-black text-white rounded-full ${item.badgeColor || 'bg-blue-500'} shadow-sm animate-pulse`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Quick Action Drawer Section */}
        <div className="pt-4 px-3 pb-1 text-[11px] font-black uppercase tracking-wider text-slate-400">
          Quick Actions
        </div>
        <div className="space-y-1.5">
          <button
            onClick={onOpenNewCustomer}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-sky-200 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition group"
          >
            <PlusCircle className="w-4 h-4 text-sky-400 group-hover:scale-110 transition" />
            <span>+ Add New Client</span>
          </button>
          <button
            onClick={onOpenNewLoan}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition group"
          >
            <Banknote className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
            <span>+ Issue New Loan</span>
          </button>
          <button
            onClick={onOpenRecordPayment}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition group"
          >
            <Receipt className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
            <span>+ Record Payment</span>
          </button>
        </div>
      </nav>

      {/* Cloud Sync & User Footer */}
      <div className="p-3.5 border-t border-white/10 space-y-2 bg-slate-950/60">
        {/* Live Cloud Status Card */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {syncStatus === 'offline' ? (
              <CloudOff className="w-4 h-4 text-slate-400 shrink-0" />
            ) : (
              <div className="relative shrink-0">
                <Cloud className="w-4 h-4 text-sky-400" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900 animate-pulse"></span>
              </div>
            )}
            <div className="min-w-0">
              <div className="font-bold text-white text-[11px] truncate">
                {syncStatus === 'offline' ? 'Offline Mode' : 'Cloud Connected'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {lastSyncTime ? `Synced ${lastSyncTime}` : 'Realtime Sync'}
              </div>
            </div>
          </div>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sky-300 hover:text-white transition disabled:opacity-50 shrink-0"
            title="Force Sync Now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* User Profile & Lock Action */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-400/30 flex items-center justify-center font-black text-sky-300 text-xs shrink-0">
              {settings?.username ? settings.username[0].toUpperCase() : 'A'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{settings?.username || 'Admin Officer'}</div>
              <div className="text-[10px] text-slate-400 capitalize">Manager</div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={lockSession}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              title="Lock Screen"
            >
              <Lock className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
