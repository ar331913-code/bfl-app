import React from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';

interface WelcomeLandingProps {
  onGetStarted: () => void;
}

export const WelcomeLanding: React.FC<WelcomeLandingProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col justify-between p-6 overflow-hidden selection:bg-emerald-500 selection:text-white">
      
      {/* Top Header */}
      <header className="max-w-xs mx-auto w-full flex items-center justify-center pt-4">
        <div className="flex items-center gap-1.5 bg-sky-500/15 border border-sky-400/40 px-3.5 py-1 rounded-full text-[11px] text-sky-300 font-bold shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
          <span>Online & Offline Ready</span>
        </div>
      </header>

      {/* Hero Center Body */}
      <main className="max-w-xs mx-auto w-full flex flex-col items-center text-center space-y-6 animate-fade-in my-auto py-8">
        
        {/* Large B-F-L Emblem */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-600 p-1 shadow-2xl shadow-sky-500/30 flex items-center justify-center animate-pulse">
            <div className="w-full h-full rounded-[22px] bg-slate-950 flex items-center justify-center text-sky-400 font-black text-3xl tracking-widest">
              BFL
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 bg-sky-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md font-mono">
            GH₵
          </div>
        </div>

        {/* Title and Short Description */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white tracking-tight">
            B-F-L
          </h1>
          <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-[260px] mx-auto">
            Easy loan records, daily collections, and instant customer management.
          </p>
        </div>

        {/* Big Clean Login Button */}
        <button
          onClick={onGetStarted}
          type="button"
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-98 text-white text-sm font-black shadow-xl shadow-sky-600/30 flex items-center justify-center gap-2 transition duration-200 border border-sky-300/30 cursor-pointer"
        >
          <span>Operator Login</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </main>

      {/* Bottom Footer */}
      <footer className="max-w-xs mx-auto w-full pb-4 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
        <span>Secure Local & Cloud Sync</span>
      </footer>

    </div>
  );
};
