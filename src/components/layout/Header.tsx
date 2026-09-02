import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Bell, 
  Lock, 
  Search,
  ArrowLeft,
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  MoreVertical,
  Settings as SettingsIcon,
  PlusCircle,
  Banknote,
  Receipt
} from 'lucide-react';
import { AppNotification } from '../../types';
import { CloudSyncService } from '../../services/cloudSyncService';

interface HeaderProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  canGoBack: boolean;
  onGoBack: () => void;
  unreadNotifications: AppNotification[];
  onOpenSearch: () => void;
  onOpenNewCustomer?: () => void;
  onOpenNewLoan?: () => void;
  onOpenRecordPayment?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onNavigate,
  canGoBack,
  onGoBack,
  unreadNotifications,
  onOpenSearch,
  onOpenNewCustomer,
  onOpenNewLoan,
  onOpenRecordPayment
}) => {
  const { lockSession } = useAuth();
  const unreadCount = unreadNotifications.filter(n => !n.isRead).length;

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'offline'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = CloudSyncService.subscribe((status, lastSync) => {
      setSyncStatus(status);
      if (lastSync) setLastSyncTime(lastSync);
    });
    return unsubscribe;
  }, []);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleManualSync = async () => {
    setToastMessage('Syncing with Cloud...');
    const result = await CloudSyncService.syncWithCloud(true);
    setToastMessage(result.success ? 'Cloud Synced! ☁️' : 'Saved Locally (Offline)');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'customers': return 'Clients Directory';
      case 'loans': return 'Loan Portfolio';
      case 'payments': return 'Collections & Payments';
      case 'notifications': return 'Alerts & Due Dates';
      case 'reports': return 'Reports & Analytics';
      case 'settings': return 'Settings & Security';
      default: return 'Overview Dashboard';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white shadow-xl border-b border-sky-500/20 backdrop-blur-md">
      <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between relative">
        
        {/* Left Side: Mobile Back Arrow OR Desktop Title & Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          {canGoBack && activeTab !== 'dashboard' ? (
            <button
              onClick={onGoBack}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition shadow-sm border border-white/15 shrink-0"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4 text-sky-300" />
              <span>Back</span>
            </button>
          ) : (
            /* Mobile Brand Logo (hidden on lg because sidebar has it) */
            <div 
              onClick={() => onNavigate('dashboard')}
              className="flex lg:hidden items-center gap-2 cursor-pointer select-none group shrink-0"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-xs shadow-md ring-2 ring-sky-400/40 group-hover:scale-105 transition">
                BFL
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-black tracking-tight text-white text-base drop-shadow-xs">B-F-L</span>
                <span className="text-[9px] uppercase tracking-wider font-extrabold bg-sky-400/20 text-sky-300 border border-sky-400/30 px-1.5 py-0.2 rounded-md font-mono shadow-xs">
                  GH₵
                </span>
              </div>
            </div>
          )}

          {/* Desktop Page Title & Breadcrumb Header */}
          <div className="hidden lg:flex items-center gap-2.5">
            <h1 className="text-lg font-black text-white tracking-tight">{getPageTitle()}</h1>
            <span className="text-xs font-medium text-sky-300/60 bg-sky-400/10 px-2.5 py-0.5 rounded-lg border border-sky-400/20">
              B-F-L Ghana Edition
            </span>
          </div>

          {/* Mobile Page Subtitle */}
          {canGoBack && activeTab !== 'dashboard' && (
            <div className="ml-1 text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1 truncate lg:hidden">
              <span className="text-sky-400">/</span>
              <span className="truncate">{getPageTitle()}</span>
            </div>
          )}
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          
          {/* Desktop Quick Action Buttons */}
          <div className="hidden md:flex items-center gap-2">
            {onOpenNewCustomer && (
              <button
                onClick={onOpenNewCustomer}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/15 active:scale-95 shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 text-sky-300" />
                <span>+ Client</span>
              </button>
            )}
            {onOpenNewLoan && (
              <button
                onClick={() => onOpenNewLoan()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs font-bold transition border border-emerald-500/30 active:scale-95 shadow-xs"
              >
                <Banknote className="w-3.5 h-3.5 text-emerald-300" />
                <span>+ Issue Loan</span>
              </button>
            )}
            {onOpenRecordPayment && (
              <button
                onClick={() => onOpenRecordPayment()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 text-xs font-bold transition border border-indigo-500/30 active:scale-95 shadow-xs"
              >
                <Receipt className="w-3.5 h-3.5 text-indigo-300" />
                <span>+ Repayment</span>
              </button>
            )}
          </div>

          {/* 1. Cloud Sync Status Button */}
          <button
            onClick={handleManualSync}
            type="button"
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl text-sky-300 hover:text-white hover:bg-white/10 active:scale-95 transition relative group border border-transparent hover:border-white/10"
            title={lastSyncTime ? `Cloud Synced at ${lastSyncTime}. Click to refresh.` : 'Sync with Cloud across all devices'}
          >
            {syncStatus === 'syncing' ? (
              <RefreshCw className="w-4 h-4 animate-spin text-sky-300" />
            ) : syncStatus === 'offline' ? (
              <CloudOff className="w-4 h-4 text-slate-400" />
            ) : (
              <div className="relative">
                <Cloud className="w-4 h-4 text-sky-400 group-hover:text-sky-300" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900"></span>
              </div>
            )}
            <span className="hidden sm:inline text-xs font-bold">
              {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'offline' ? 'Offline' : 'Cloud Sync'}
            </span>
          </button>

          {/* 2. Global Quick Search */}
          <button
            onClick={onOpenSearch}
            type="button"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition flex items-center gap-1.5 border border-transparent hover:border-white/10"
            title="Search Customers & Loans (Ctrl+K)"
          >
            <Search className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline text-xs font-semibold text-slate-300">Search</span>
          </button>

          {/* 3. Alerts Bell */}
          <button
            onClick={() => onNavigate('notifications')}
            type="button"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition relative"
            title="View Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 min-w-[16px] h-4 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-slate-950 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* 4. Mobile Overflow 3-Dot Menu (Mobile only) */}
          <div className="relative lg:hidden" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              type="button"
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition relative"
              title="More Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Mobile Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-slate-900/95 border border-sky-500/30 rounded-2xl shadow-2xl backdrop-blur-md py-1.5 text-xs font-bold text-slate-200 z-50 animate-fade-in divide-y divide-white/10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onNavigate('reports');
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-white/10 text-left transition"
                  >
                    <span>Reports & Analytics</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onNavigate('settings');
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-white/10 text-left transition"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-sky-400" />
                    <span>Settings & Cloud</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      lockSession();
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-rose-500/20 text-left text-rose-300 transition"
                  >
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    <span>Lock Session</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Sync Toast Overlay */}
        {toastMessage && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-3.5 py-1.5 bg-slate-900 text-sky-300 border border-sky-500/40 rounded-full text-xs font-bold shadow-2xl animate-fade-in flex items-center gap-1.5 z-40 whitespace-nowrap">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

      </div>
    </header>
  );
};
