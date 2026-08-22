import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Fingerprint, Delete, Lock, Sparkles } from 'lucide-react';

export const PinLockModal: React.FC = () => {
  const { isLocked, isAuthenticated, verifyPin, loginWithBiometrics, settings } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);

  if (!isLocked && isAuthenticated) return null;

  const handleDigit = (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    // Auto submit if 4 digits entered
    if (newPin.length === 4) {
      handleVerify(newPin);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleVerify = async (enteredPin: string) => {
    const success = await verifyPin(enteredPin);
    if (!success) {
      setIsShaking(true);
      setError('Incorrect PIN. Please try again.');
      setPin('');
      setTimeout(() => setIsShaking(false), 500);
    } else {
      setPin('');
      setError('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-sky-950/90 via-navy-950/95 to-blue-950/95 backdrop-blur-md p-4 animate-fade-in">
      <div className={`w-full max-w-sm bg-white/95 rounded-[36px] shadow-2xl p-7 flex flex-col items-center text-center border-2 border-sky-100 backdrop-blur-md ${isShaking ? 'animate-bounce' : ''}`}>
        
        {/* Brand Logo & Security Icon */}
        <div className="w-18 h-18 rounded-3xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 p-0.5 mb-3 shadow-lg shadow-sky-500/20">
          <div className="w-full h-full rounded-[22px] bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-white shadow-inner">
            <Lock className="w-7 h-7 text-white" />
          </div>
        </div>

        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          {settings?.businessName || 'B-F-L Loan Manager'}
        </h2>
        <p className="text-xs text-sky-700 font-bold mt-1 mb-6 flex items-center gap-1.5 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
          <ShieldCheck className="w-4 h-4 text-sky-600" />
          Single Operator Security Lock
        </p>

        {/* PIN Indicators (Dots) */}
        <div className="flex gap-4 mb-6">
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

        {/* Error message */}
        {error ? (
          <p className="text-xs text-rose-600 font-bold mb-4 h-4">{error}</p>
        ) : (
          <p className="text-xs text-slate-400 mb-4 h-4 font-medium">Enter your 4-digit PIN (Default: <strong className="text-sky-600 font-black">1234</strong>)</p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-3">
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

          {/* Biometric Button */}
          <button
            onClick={loginWithBiometrics}
            type="button"
            className="h-14 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-100 hover:from-sky-100 hover:to-blue-200 active:bg-sky-200 text-sky-700 border border-sky-200 flex items-center justify-center transition active:scale-95 shadow-sm"
            title="Unlock with Biometrics"
          >
            <Fingerprint className="w-7 h-7 text-sky-600" />
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
            className="h-14 rounded-2xl bg-gradient-to-b from-white to-rose-50/70 hover:from-rose-50 hover:to-rose-100 active:bg-rose-200 text-slate-600 active:text-rose-700 border border-rose-100 flex items-center justify-center transition active:scale-95 shadow-sm"
          >
            <Delete className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <div className="text-[11px] text-slate-400 mt-2 font-medium">
          Protected with SHA-256 local encrypted session
        </div>
      </div>
    </div>
  );
};
