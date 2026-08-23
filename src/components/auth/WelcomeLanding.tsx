import React from 'react';
import { 
  ShieldCheck, 
  Car, 
  Store, 
  Zap, 
  MessageSquare, 
  Lock, 
  ArrowRight, 
  Building2, 
  CheckCircle2, 
  Smartphone,
  CreditCard,
  Sparkles,
  TrendingUp,
  Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface WelcomeLandingProps {
  onGetStarted: () => void;
}

export const WelcomeLanding: React.FC<WelcomeLandingProps> = ({ onGetStarted }) => {
  const { settings } = useAuth();
  const businessTitle = settings?.businessName || 'B-F-L Microfinance';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-navy-950 to-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 overflow-y-auto selection:bg-sky-500 selection:text-white">
      
      {/* Top Brand Bar */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between pt-2 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700 p-0.5 shadow-lg shadow-sky-500/20">
            <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-sky-600 to-blue-900 flex items-center justify-center text-white font-black text-lg tracking-wider">
              B
            </div>
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-tight leading-tight">
              {businessTitle}
            </h1>
            <p className="text-[10px] text-sky-300 font-bold uppercase tracking-wider">
              Loan Management Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-400/30 px-2.5 py-1 rounded-full text-[10px] text-emerald-300 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Ghana Ready
        </div>
      </header>

      {/* Hero Body Content */}
      <main className="max-w-md mx-auto w-full space-y-5 flex-1 flex flex-col justify-center py-4 animate-fade-in">
        
        {/* Welcome Tag */}
        <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-sky-500/20 to-blue-500/20 border border-sky-400/40 px-3.5 py-1.5 rounded-full text-xs font-black text-sky-200 w-fit backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          Microcredit System for Drivers & Traders
        </div>

        {/* Hero Title & Subtitle */}
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            Fast, Reliable & Offline Microloan Collections.
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            Manage registrations, calculate daily/weekly repayments, dispatch automated Ghana SMS receipts, and safeguard data with 100% offline privacy.
          </p>
        </div>

        {/* Value Propositions Cards */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          
          {/* Card 1: Drivers & Traders */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-sky-400 flex items-center justify-center font-bold">
              <Car className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black text-white">Drivers & Traders</h3>
            <p className="text-[10px] text-slate-400 font-medium leading-tight">
              Tailored workflows for Trotro, Taxi, and Makola market vendors.
            </p>
          </div>

          {/* Card 2: Instant SMS Receipts */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black text-white">Instant SMS Alerts</h3>
            <p className="text-[10px] text-slate-400 font-medium leading-tight">
              Automated welcome texts, payment receipts & overdue reminders.
            </p>
          </div>

          {/* Card 3: 100% Offline Database */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black text-white">100% Offline Ready</h3>
            <p className="text-[10px] text-slate-400 font-medium leading-tight">
              Full offline storage. Works at lorry stations with zero internet.
            </p>
          </div>

          {/* Card 4: Google Drive Sync */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-black text-white">Cloud Backup</h3>
            <p className="text-[10px] text-slate-400 font-medium leading-tight">
              1-tap transport of customer records & photos to Google Drive.
            </p>
          </div>

        </div>

        {/* Primary Call to Action Button */}
        <div className="pt-2">
          <button
            onClick={onGetStarted}
            type="button"
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-blue-500 active:scale-98 text-white text-sm font-black shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2 transition duration-200 border border-sky-300/40"
          >
            <span>Operator Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </main>

      {/* Bottom Footer */}
      <footer className="max-w-md mx-auto w-full pt-4 pb-2 text-center text-[10px] text-slate-500 space-y-1">
        <p className="font-semibold text-slate-400">
          Encrypted Authentication • Offline-First Microfinance
        </p>
        <p>© {new Date().getFullYear()} {businessTitle}. All rights reserved.</p>
      </footer>

    </div>
  );
};
