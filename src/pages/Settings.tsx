import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../db';
import { seedInitialData } from '../db/seedData';
import { AuditLog, InterestType, RepaymentFrequency } from '../types';
import { 
  Settings as SettingsIcon, 
  ShieldCheck, 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Lock, 
  Building2, 
  Percent, 
  Clock, 
  Check, 
  AlertCircle, 
  FileText,
  KeyRound,
  Trash2
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

interface SettingsProps {
  auditLogs: AuditLog[];
  onDataReset: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  auditLogs,
  onDataReset
}) => {
  const { settings, updateSettings, changePin, lockSession } = useAuth();

  // Business settings state
  const [businessName, setBusinessName] = useState(settings?.businessName || 'B-F-L Micro Credit');
  const [businessPhone, setBusinessPhone] = useState(settings?.businessPhone || '+233 24 412 3456');
  const [businessAddress, setBusinessAddress] = useState(settings?.businessAddress || 'Accra, Ghana');

  // Loan parameter defaults
  const [defaultInterestRate, setDefaultInterestRate] = useState(settings?.defaultInterestRate || 10);
  const [defaultInterestType, setDefaultInterestType] = useState<InterestType>(settings?.defaultInterestType || 'flat');
  const [defaultFrequency, setDefaultFrequency] = useState<RepaymentFrequency>(settings?.defaultFrequency || 'weekly');
  const [enablePenalties, setEnablePenalties] = useState(settings?.enablePenalties ?? true);
  const [defaultPenaltyRate, setDefaultPenaltyRate] = useState(settings?.defaultPenaltyRate || 2);
  const [autoLockMinutes, setAutoLockMinutes] = useState(settings?.autoLockMinutes || 5);

  // PIN change state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // General message
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      businessName,
      businessPhone,
      businessAddress,
      defaultInterestRate,
      defaultInterestType,
      defaultFrequency,
      enablePenalties,
      defaultPenaltyRate,
      autoLockMinutes
    });

    setSaveMessage('System settings saved successfully!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      setPinMessage({ type: 'error', text: 'New PINs do not match.' });
      return;
    }
    if (newPin.length < 4) {
      setPinMessage({ type: 'error', text: 'PIN must be at least 4 digits.' });
      return;
    }

    const res = await changePin(currentPin, newPin);
    if (res.success) {
      setPinMessage({ type: 'success', text: res.message });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setTimeout(() => setPinMessage(null), 3000);
    } else {
      setPinMessage({ type: 'error', text: res.message });
    }
  };

  // Full Database Backup Export
  const handleExportBackup = async () => {
    const json = await db.exportFullDatabase();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BFL_Complete_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Restore Database from JSON
  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('Restoring will replace all current customers and loans. Continue?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const success = await db.restoreFromJSON(text);
        if (success) {
          alert('Database restored successfully!');
          onDataReset();
        } else {
          alert('Failed to restore database. Invalid file structure.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Reset and Seed Initial Ghanaian Sample Data
  const handleReloadDemoData = async () => {
    if (window.confirm('Reset database and reload realistic Ghanaian sample Drivers & Traders?')) {
      await seedInitialData(true);
      onDataReset();
      alert('Sample Ghanaian data reloaded successfully!');
    }
  };

  return (
    <div className="space-y-5 pb-24 animate-fade-in">
      
      {/* Header */}
      <div>
        <h1 className="text-lg font-black text-navy-950">Settings & Security</h1>
        <p className="text-xs text-slate-500 font-medium">Configure loan defaults, security & backups</p>
      </div>

      {saveMessage && (
        <div className="p-3 bg-gradient-to-r from-sky-50 to-blue-50 border-2 border-sky-300 rounded-2xl text-sky-900 text-xs font-black flex items-center gap-2 animate-fade-in shadow-xs">
          <Check className="w-4 h-4 text-sky-600" />
          {saveMessage}
        </div>
      )}

      {/* 1. Loan Parameters & Business Settings Form */}
      <form onSubmit={handleSaveSettings} className="p-5 rounded-3xl bg-white border-2 border-sky-100 shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-sky-600" />
          Business & Loan Defaults
        </h3>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Business Name</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Operator Phone</label>
            <input
              type="text"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Default Rate (%)</label>
            <input
              type="number"
              value={defaultInterestRate}
              onChange={(e) => setDefaultInterestRate(Number(e.target.value))}
              className="w-full text-xs font-black px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Default Calculation</label>
            <select
              value={defaultInterestType}
              onChange={(e) => setDefaultInterestType(e.target.value as any)}
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white"
            >
              <option value="flat">Flat Rate</option>
              <option value="reducing_balance">Reducing Balance</option>
              <option value="fixed_sum">Fixed Markup</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Auto-Lock Session</label>
            <select
              value={autoLockMinutes}
              onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white"
            >
              <option value={1}>1 Minute</option>
              <option value={3}>3 Minutes</option>
              <option value={5}>5 Minutes</option>
              <option value={15}>15 Minutes</option>
              <option value={0}>Disabled</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition"
        >
          Save Configuration
        </button>
      </form>

      {/* 2. Security PIN Manager */}
      <form onSubmit={handleChangePinSubmit} className="p-5 rounded-3xl bg-white border-2 border-sky-100 shadow-sm space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
          <KeyRound className="w-4 h-4 text-sky-600" />
          Operator Security PIN
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Current PIN</label>
            <input
              type="password"
              maxLength={6}
              placeholder="1234"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              className="w-full text-xs font-mono font-black px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none text-center"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">New PIN</label>
            <input
              type="password"
              maxLength={6}
              placeholder="••••"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full text-xs font-mono font-black px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none text-center"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Confirm PIN</label>
            <input
              type="password"
              maxLength={6}
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className="w-full text-xs font-mono font-black px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none text-center"
            />
          </div>
        </div>

        {pinMessage && (
          <div className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 font-bold ${
            pinMessage.type === 'success' ? 'bg-sky-50 text-sky-900 border border-sky-300' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            <AlertCircle className="w-3.5 h-3.5" />
            {pinMessage.text}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 hover:from-sky-700 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition"
        >
          Update Security PIN
        </button>
      </form>

      {/* 3. Database Backup & Restore */}
      <div className="p-5 rounded-3xl bg-white border-2 border-sky-100 shadow-sm space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
          <Database className="w-4 h-4 text-sky-600" />
          Offline Data Backup & Restore
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExportBackup}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 hover:from-sky-100 hover:to-blue-100 border-2 border-sky-200 text-sky-900 text-xs font-black flex flex-col items-center justify-center gap-1 transition shadow-xs"
          >
            <Download className="w-5 h-5 text-sky-600 mb-0.5" />
            Export Full Backup (JSON)
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-50 to-sky-50 hover:from-cyan-100 hover:to-sky-100 border-2 border-cyan-200 text-cyan-900 text-xs font-black flex flex-col items-center justify-center gap-1 transition shadow-xs"
          >
            <Upload className="w-5 h-5 text-cyan-600 mb-0.5" />
            Restore from File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleRestoreFile}
            className="hidden"
          />
        </div>

        {/* Reload Demo Data */}
        <button
          onClick={handleReloadDemoData}
          className="w-full py-3 bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 border-2 border-amber-300 text-amber-950 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
          Reload Realistic Ghanaian Sample Data
        </button>
      </div>

      {/* 4. Audit Trail Logs */}
      <div className="p-5 rounded-3xl bg-white border-2 border-sky-100 shadow-sm space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-sky-700" />
          Security Audit Trail ({auditLogs.length})
        </h3>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {auditLogs.slice(0, 8).map(log => (
            <div key={log.id} className="p-2.5 rounded-xl bg-sky-50/50 border border-sky-100 text-xs">
              <div className="flex justify-between font-bold text-navy-950">
                <span>{log.action}</span>
                <span className="text-[10px] text-slate-400 font-normal">{formatDate(log.timestamp, 'dd MMM, HH:mm')}</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">{log.details}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
