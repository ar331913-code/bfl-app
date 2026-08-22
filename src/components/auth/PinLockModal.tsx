import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Fingerprint, Delete, Lock, Sparkles, Smartphone, Scan } from 'lucide-react';

export const PinLockModal: React.FC = () => {
  const { isLocked, isAuthenticated, verifyPin, loginWithBiometrics, settings, hasBiometrics } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isAuthenticatingBio, setIsAuthenticatingBio] = useState<boolean>(false);

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

  const handleBiometricClick = async () => {
    setIsAuthenticatingBio(true);
    setError('');
    const res = await loginWithBiometrics();
    setIsAuthenticatingBio(false);
    if (!res.success && res.error) {
      setError(res.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-sky-950/90 via-navy-950/95 to-blue-950/95 backdrop-blur-md p-4 animate-fade-in">
      <div className={`w-full max-w-sm bg-white/95 rounded-[36px] shadow-2xl p-7 flex flex-col items-center text-center border-2 border-sky-100 backdrop-blur-md ${isShaking ? 'animate-bounce' : ''}`}>
        
        {/* Brand Logo & Security Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 p-0.5 mb-2.5 shadow-lg shadow-sky-500/20">
          <div className="w-full h-full rounded-[22px] bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center text-white shadow-inner">
            <Lock className="w-6 h-6 text-white" />
          </div>
        </div>

        <h2 className="text-lg font-black text-slate-900 tracking-tight">
          {settings?.businessName || 'B-F-L Loan Manager'}
        </h2>
        <p className="text-[11px] text-sky-700 font-bold mt-0.5 mb-4 flex items-center gap-1.5 bg-sky-50 px-3 py-0.5 rounded-full border border-sky-200">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
          Single Operator Security Lock
        </p>

        {/* Biometric Quick Trigger Bar */}
        <button
          onClick={handleBiometricClick}
          type="button"
          className="w-full mb-4 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 hover:from-sky-100 hover:to-blue-100 active:scale-95 border-2 border-sky-200 text-sky-900 text-xs font-black flex items-center justify-center gap-2 transition shadow-xs"
        >
          <Fingerprint className="w-5 h-5 text-sky-600 animate-pulse" />
          <span>{isAuthenticatingBio ? 'Verifying Biometrics...' : 'Touch Fingerprint / Face ID'}</span>
        </button>

        {/* PIN Indicators (Dots) */}
        <div className="flex gap-4 mb-4">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                pin.length > i 
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 scale-125 shadow-md shadow-sky-500/30 ring-2 ring-sky-300' 
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {error ? (
          <p className="text-xs text-rose-600 font-bold mb-3 h-4">{error}</p>
        ) : (
          <p className="text-[11px] text-slate-400 mb-3 h-4 font-medium">Or enter your 4-digit PIN (Default: <strong className="text-sky-600 font-black">1234</strong>)</p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs mb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              type="button"
              className="h-13 rounded-2xl bg-gradient-to-b from-white to-sky-50/70 hover:from-sky-50 hover:to-sky-100 active:bg-sky-200 text-lg font-black text-slate-800 shadow-sm border border-sky-100 flex items-center justify-center transition active:scale-95 active:border-sky-300"
            >
              {num}
            </button>
          ))}

          {/* Biometric Icon Key */}
          <button
            onClick={handleBiometricClick}
            type="button"
            className="h-13 rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100 hover:from-sky-200 hover:to-blue-200 active:bg-sky-300 text-sky-800 border border-sky-300 flex items-center justify-center transition active:scale-95 shadow-sm"
            title="Unlock with Biometrics"
          >
            <Fingerprint className="w-6 h-6 text-sky-700" />
          </button>

          {/* Zero */}
          <button
            onClick={() => handleDigit('0')}
            type="button"
            className="h-13 rounded-2xl bg-gradient-to-b from-white to-sky-50/70 hover:from-sky-50 hover:to-sky-100 active:bg-sky-200 text-lg font-black text-slate-800 shadow-sm border border-sky-100 flex items-center justify-center transition active:scale-95"
          >
            0
          </button>

          {/* Backspace */}
          <button
            onClick={handleDelete}
            type="button"
            className="h-13 rounded-2xl bg-gradient-to-b from-white to-rose-50/70 hover:from-rose-50 hover:to-rose-100 active:bg-rose-200 text-slate-600 active:text-rose-700 border border-rose-100 flex items-center justify-center transition active:scale-95 shadow-sm"
          >
            <Delete className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="text-[10px] text-slate-400 mt-1 font-medium">
          Protected with SHA-256 encrypted biometric storage
        </div>
      </div>
    </div>
  );
};
