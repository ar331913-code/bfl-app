import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Bell, 
  Lock, 
  Smartphone, 
  Monitor, 
  Search,
  ArrowLeft
} from 'lucide-react';
import { AppNotification } from '../../types';

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
    <header className="sticky top-0 z-30 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white shadow-lg border-b border-sky-400/30">
      <div className="max-w-md mx-auto px-3.5 py-3 flex items-center justify-between">
        
        {/* Left Side: Back Arrow Button OR Brand Logo */}
        <div className="flex items-center gap-2">
          {canGoBack && activeTab !== 'dashboard' ? (
            <button
              onClick={onGoBack}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold transition shadow-sm border border-white/20 group backdrop-blur-xs"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4 text-sky-200 group-hover:text-white transition" />
              <span>Back</span>
            </button>
          ) : (
            <div 
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white via-sky-100 to-cyan-200 flex items-center justify-center font-black text-sky-900 text-sm shadow-md ring-2 ring-white/40 group-hover:scale-105 transition">
                BFL
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black tracking-tight text-white text-base drop-shadow-xs">B-F-L</span>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold bg-sky-400/30 text-white border border-sky-300/40 px-1.5 py-0.2 rounded-md font-mono shadow-xs">
                    GH₵
                  </span>
                </div>
                <p className="text-[11px] text-sky-100 font-medium leading-none">
                  {settings?.businessName || 'Loan Manager'}
                </p>
              </div>
            </div>
          )}

          {canGoBack && activeTab !== 'dashboard' && (
            <div className="ml-1 text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span className="text-sky-300">/</span>
              <span>{getPageTitle()}</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          
          {/* Quick Search */}
          <button
            onClick={onOpenSearch}
            type="button"
            className="p-2 rounded-xl text-sky-100 hover:text-white hover:bg-white/15 active:scale-95 transition"
            title="Search Customers & Loans"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications with Badge */}
          <button
            onClick={() => onNavigate('notifications')}
            type="button"
            className="relative p-2 rounded-xl text-sky-100 hover:text-white hover:bg-white/15 active:scale-95 transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-sky-700 animate-pulse shadow-md">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Desktop/Mobile Shell Toggle */}
          <button
            onClick={onToggleFrame}
            type="button"
            className="hidden sm:flex p-2 rounded-xl text-sky-200 hover:text-white hover:bg-white/15 active:scale-95 transition"
            title={isMobileFrame ? 'Switch to Full Screen' : 'Switch to Mobile Phone Shell'}
          >
            {isMobileFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4 text-sky-200" />}
          </button>

          {/* Operator Lock */}
          <button
            onClick={lockSession}
            type="button"
            className="p-2 rounded-xl text-sky-200 hover:text-white hover:bg-white/15 active:scale-95 transition"
            title="Lock Application Session"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
