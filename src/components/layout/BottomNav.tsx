import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Banknote, 
  Receipt, 
  Menu
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  overdueCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onNavigate,
  overdueCount = 0
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Clients', icon: Users },
    { id: 'loans', label: 'Loans', icon: Banknote, badge: overdueCount > 0 ? overdueCount : undefined },
    { id: 'payments', label: 'Payments', icon: Receipt },
    { id: 'more', label: 'More', icon: Menu },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-sky-100 safe-bottom shadow-2xl">
      <div className="max-w-md mx-auto grid grid-cols-5 h-16">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (item.id === 'more' && (activeTab === 'reports' || activeTab === 'settings'));
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              type="button"
              className={`relative flex flex-col items-center justify-center py-1 transition-all duration-200 select-none ${
                isActive ? 'text-sky-600 font-extrabold' : 'text-slate-400 hover:text-sky-800'
              }`}
            >
              <div className={`relative p-1 rounded-xl transition-all ${
                isActive 
                  ? 'bg-gradient-to-br from-sky-50 to-blue-100 text-sky-600 scale-110 shadow-xs border border-sky-200' 
                  : ''
              }`}>
                <Icon className="w-5 h-5" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1 min-w-[15px] h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-sm animate-pulse">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-black text-sky-700' : 'font-semibold'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-1 w-8 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-cyan-400 rounded-full shadow-xs" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
