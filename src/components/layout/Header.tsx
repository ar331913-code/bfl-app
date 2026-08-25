import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Bell, 
  Lock, 
  Smartphone, 
  Monitor, 
  Search,
  ArrowLeft,
  Cloud,
  CloudOff,
  RefreshCw,
  Check
} from 'lucide-react';
import { AppNotification } from '../../types';
import { CloudSyncService } from '../../services/cloudSyncService';

interface HeaderProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  canGoBack: boolean;
  onGoBack: () => void;
  unreadNotifications: AppNotification[];
  isMobileFrame: boolean;
  onToggleFrame: () => void;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onNavigate,
  canGoBack,
  onGoBack,
  unreadNotifications,
  isMobileFrame,
  onToggleFrame,
  onOpenSearch
}) => {
  const { lockSession, settings } = useAuth();
  const unreadCount = unreadNotifications.filter(n => !n.isRead).length;

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'offline'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = CloudSyncService.subscribe((status, lastSync) => {
      setSyncStatus(status);
      if (lastSync) setLastSyncTime(lastSync);
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setToastMessage('Syncing with Cloud...');
    const result = await CloudSyncService.syncWithCloud(true);
    setToastMessage(result.success ? 'Cloud Synced! ☁️' : 'Saved Locally (Offline)');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'customers': return 'Clients';
      case 'loans': return 'Loan Portfolio';
      case 'payments': return 'Collections';
      case 'notifications': return 'Alerts';
      case 'reports': return 'Reports';
      case 'settings': return 'Settings';
      case 'more': return 'More';
      default: return 'B-F-L';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 text-white shadow-xl border-b border-sky-500/20 backdrop-blur-md">
      <div className="max-w-md mx-auto px-3.5 py-3 flex items-center justify-between relative">
        
        {/* Left Side: Back Arrow Button OR Brand Logo */}
        <div className="flex items-center gap-2">
          {canGoBack && activeTab !== 'dashboard' ? (
            <button
              onClick={onGoBack}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition shadow-sm border border-white/15 group backdrop-blur-xs"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4 text-sky-300 group-hover:text-white transition" />
              <span>Back</span>
            </button>
          ) : (
            <div 
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-md ring-2 ring-sky-400/40 group-hover:scale-105 transition">
                BFL
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black tracking-tight text-white text-base drop-shadow-xs">B-F-L</span>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold bg-sky-400/20 text-sky-300 border border-sky-400/30 px-1.5 py-0.2 rounded-md font-mono shadow-xs">
                    GH₵
                  </span>
                </div>
              </div>
            </div>
          )}

          {canGoBack && activeTab !== 'dashboard' && (
            <div className="ml-1 text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span className="text-sky-400">/</span>
              <span>{getPageTitle()}</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          
          {/* Cloud Sync Status Button */}
          <button
            onClick={handleManualSync}
            type="button"
            className="p-2 rounded-xl text-sky-300 hover:text-white hover:bg-white/10 active:scale-95 transition relative group"
            title={lastSyncTime ? `Cloud Synced at ${lastSyncTime}. Tap to refresh.` : 'Sync with Cloud across all devices'}
          >
            {syncStatus === 'syncing' ? (
              <RefreshCw className="w-4 h-4 animate-spin text-sky-300" />
            ) : syncStatus === 'offline' ? (
              <CloudOff className="w-4 h-4 text-slate-400" />
            ) : (
              <div className="relative">
                <Cloud className="w-4 h-4 text-sky-400 group-hover:text-sky-300" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-sky-400 border border-slate-900"></span>
              </div>
            )}
          </button>

          {/* Quick Search */}
          <button
            onClick={onOpenSearch}
            type="button"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition"
            title="Search Customers & Loans"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications with Badge */}
          <button
            onClick={() => onNavigate('notifications')}
            type="button"
            className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-slate-900 animate-pulse shadow-md">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Desktop/Mobile Shell Toggle */}
          <button
            onClick={onToggleFrame}
            type="button"
            className="hidden sm:flex p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition"
            title={isMobileFrame ? 'Switch to Full Screen' : 'Switch to Mobile Phone Shell'}
          >
            {isMobileFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Operator Lock */}
          <button
            onClick={lockSession}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition"
            title="Lock Application Session"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>

        {/* Sync Toast Overlay */}
        {toastMessage && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-3 py-1 bg-slate-900 text-sky-300 border border-sky-500/40 rounded-full text-[11px] font-bold shadow-xl animate-fade-in flex items-center gap-1.5 z-40 whitespace-nowrap">
            <Check className="w-3 h-3 text-sky-400" />
            <span>{toastMessage}</span>
          </div>
        )}

      </div>
    </header>
  );
};
