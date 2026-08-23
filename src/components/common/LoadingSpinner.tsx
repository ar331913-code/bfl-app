import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading B-F-L System...' }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 animate-fade-in text-white">
      <div className="relative flex items-center justify-center mb-6">
        {/* Outer Glow Ring */}
        <div className="w-20 h-20 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin shadow-lg shadow-emerald-500/20" />
        
        {/* Inner Pulsing Emblem */}
        <div className="absolute w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-navy-900 flex items-center justify-center text-white font-black text-base shadow-inner animate-pulse">
          B
        </div>
      </div>

      <div className="text-center space-y-1.5">
        <h3 className="text-sm font-black tracking-wider uppercase text-white">
          B-F-L Microfinance
        </h3>
        <p className="text-xs text-emerald-300/80 font-medium">
          {message}
        </p>
      </div>

      <div className="mt-8 flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span>Ghana Offline Database</span>
      </div>
    </div>
  );
};
