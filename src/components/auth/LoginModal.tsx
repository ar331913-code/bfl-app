import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  ShieldCheck, 
  AlertCircle, 
  LogIn 
} from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { isLocked, isAuthenticated, showLanding, setShowLanding, login, settings } = useAuth();
  
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  if (!isLocked && isAuthenticated) return null;
  if (showLanding) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const res = await login(username, password);
    setIsSubmitting(false);

    if (!res.success) {
      setIsShaking(true);
      setError(res.message || 'Incorrect username or password.');
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950/90 via-slate-900/95 to-slate-950/95 backdrop-blur-md p-4 animate-fade-in">
      <div className={`w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-6 sm:p-7 flex flex-col border border-slate-200 ${isShaking ? 'animate-bounce' : ''}`}>
        
        {/* Top Header with Back button */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setShowLanding(true)}
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Welcome</span>
          </button>

          <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
            Secure Login
          </span>
        </div>

        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-sky-500/20 mb-2 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center text-white">
              <Lock className="w-6 h-6 text-sky-400" />
            </div>
          </div>

          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            {settings?.businessName || 'B-F-L'}
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Enter your credentials to access system
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          {/* Username */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase tracking-wider">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoComplete="username"
                placeholder="e.g. admin"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                className="w-full text-xs font-semibold pl-10 pr-3.5 py-3 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-slate-50 focus:bg-white text-slate-900 transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="e.g. admin123"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                className="w-full text-xs font-semibold pl-10 pr-10 py-3 rounded-2xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-slate-50 focus:bg-white text-slate-900 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-98 text-white text-xs font-black rounded-2xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{isSubmitting ? 'Signing in...' : 'Sign In to Dashboard'}</span>
          </button>
        </form>

        {/* Security Note */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Local Device SHA-256 Authentication</span>
        </div>

      </div>
    </div>
  );
};
