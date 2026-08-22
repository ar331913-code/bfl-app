import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Delete, Lock, KeyRound, AlertOctagon } from 'lucide-react';

export const PinLockModal: React.FC = () => {
  const { isLocked, isAuthenticated, verifyPin, settings } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  if (!isLocked && isAuthenticated) return null;

  const handleDigit = (digit: string) => {
    if (pin.length >= 6 || isVerifying) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    // Auto submit when 4 digits are entered
    if (newPin.length === 4) {
      handleVerify(newPin);
    }
  };

  const handleDelete = () => {
    if (isVerifying) return;
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    if (isVerifying) return;
    setPin('');
    setError('');
  };

  const handleVerify = async (enteredPin: string) => {
    setIsVerifying(true);
    const success = await verifyPin(enteredPin);
    setIsVerifying(false);

    if (!success) {
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      setIsShaking(true);
      setError('❌ Incorrect PIN. Access Denied.');
      setPin('');
      setTimeout(() => setIsShaking(false), 500);
    } else {
      setPin('');
      setError('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-sky-950/90 via-navy-950/95 to-blue-950/95 backdrop-blur-md p-4 animate-fade-in">
      <div className={`w-full max-w-sm bg-white rounded-[36px] shadow-2xl p-7 flex flex-col items-center text-center border-2 border-sky-100 backdrop-blur-md ${isShaking ? 'animate-bounce' : ''}`}>
        
        {/* Lock Shield Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-0.5 mb-2.5 shadow-lg shadow-sky-500/20 flex items-center justify-center">
          <div className="w-full h-full rounded-[22px] bg-gradient-to-br from-sky-600 to-blue-800 flex items-center justify-center text-white shadow-inner">
            <Lock className="w-7 h-7 text-white" />
          </div>
        </div>

        <h2 className="text-lg font-black text-navy-950 tracking-tight">
          {settings?.businessName || 'B-F-L Loan Manager'}
        </h2>
        <p className="text-[11px] text-sky-800 font-bold mt-0.5 mb-5 flex items-center gap-1.5 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
          Operator PIN Security Lock
        </p>

        {/* PIN Indicators (Dots) */}
        <div className="flex gap-4 mb-4">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                pin.length > i 
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 scale-125 shadow-md shadow-sky-500/30 ring-2 ring-sky-300' 
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Status / Error message */}
        {error ? (
          <div className="text-xs text-rose-600 font-black mb-3 h-5 flex items-center justify-center gap-1">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        ) : (
          <p className="text-xs text-slate-600 mb-3 h-5 font-semibold">
            Enter 4-digit security PIN to unlock
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs mb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              type="button"
              className="h-14 rounded-2xl bg-gradient-to-b from-white to-sky-50/70 hover:from-sky-50 hover:to-sky-100 active:bg-sky-200 text-xl font-black text-slate-800 shadow-sm border border-sky-100 flex items-center justify-center transition active:scale-95 active:border-sky-300"
            >
              {num}
            </button>
          ))}

          {/* Clear Key */}
          <button
            onClick={handleClear}
            type="button"
            className="h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 text-xs font-black border border-slate-200 flex items-center justify-center transition active:scale-95 shadow-xs"
          >
            C
          </button>

          {/* Zero */}
          <button
            onClick={() => handleDigit('0')}
            type="button"
            className="h-14 rounded-2xl bg-gradient-to-b from-white to-sky-50/70 hover:from-sky-50 hover:to-sky-100 active:bg-sky-200 text-xl font-black text-slate-800 shadow-sm border border-sky-100 flex items-center justify-center transition active:scale-95"
          >
            0
          </button>

          {/* Backspace */}
          <button
            onClick={handleDelete}
            type="button"
            className="h-14 rounded-2xl bg-gradient-to-b from-white to-rose-50/70 hover:from-rose-50 hover:to-rose-100 active:bg-rose-200 text-slate-600 active:text-rose-700 border border-rose-100 flex items-center justify-center transition active:scale-95 shadow-xs"
          >
            <Delete className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="text-[10px] text-slate-400 mt-2 font-medium">
          Protected with SHA-256 encrypted authentication
        </div>
      </div>
    </div>
  );
};
