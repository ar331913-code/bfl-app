import React from 'react';

interface BflLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export const BflLogo: React.FC<BflLogoProps> = ({ 
  size = 'md', 
  className = '',
  showText = false 
}) => {
  const sizeMap = {
    sm: { box: 'w-8 h-8', icon: 32 },
    md: { box: 'w-10 h-10', icon: 40 },
    lg: { box: 'w-14 h-14', icon: 56 },
    xl: { box: 'w-24 h-24', icon: 96 }
  };

  const current = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Sleek Modern SVG Shield/Monogram Emblem */}
      <div className={`relative ${current.box} shrink-0`}>
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_6px_14px_rgba(14,165,233,0.35)]"
        >
          <defs>
            {/* Outer Hex/Shield Gradient */}
            <linearGradient id="bflGradientMain" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>

            {/* Accent Gold/Cyan Spark Gradient */}
            <linearGradient id="bflAccentSpark" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>

            {/* Inner Plate Gradient */}
            <linearGradient id="bflInnerPlate" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
          </defs>

          {/* Rounded Shield Background */}
          <rect 
            x="4" 
            y="4" 
            width="92" 
            height="92" 
            rx="26" 
            fill="url(#bflGradientMain)" 
          />

          {/* Inner Dark Shield Plate */}
          <rect 
            x="8" 
            y="8" 
            width="84" 
            height="84" 
            rx="22" 
            fill="url(#bflInnerPlate)" 
          />

          {/* Modern Geometric Ribbon Overlay */}
          <path 
            d="M20 28 L50 16 L80 28 L80 62 C80 75 50 86 50 86 C50 86 20 75 20 62 Z" 
            fill="none" 
            stroke="url(#bflGradientMain)" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            opacity="0.5"
          />

          {/* Bold Modern BFL Monogram Graphic */}
          <text 
            x="50" 
            y="58" 
            textAnchor="middle" 
            fill="#ffffff" 
            fontFamily="'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif" 
            fontWeight="900" 
            fontSize="28" 
            letterSpacing="2"
          >
            BFL
          </text>

          {/* Glowing Top Tech Indicator */}
          <circle cx="50" cy="24" r="3.5" fill="#38bdf8" />
          <line x1="38" y1="70" x2="62" y2="70" stroke="url(#bflAccentSpark)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-white tracking-tight text-base font-outfit">B-F-L</span>
            <span className="text-[10px] uppercase font-mono font-bold bg-sky-400/20 text-sky-300 border border-sky-400/30 px-1.5 py-0.2 rounded-md">
              GH₵
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Loan Manager</span>
        </div>
      )}
    </div>
  );
};
