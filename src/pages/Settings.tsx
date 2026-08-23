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
  Trash2,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { GoogleDriveBackupService } from '../services/googleDriveService';

interface SettingsProps {
  auditLogs: AuditLog[];
  onDataReset: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  auditLogs,
  onDataReset
}) => {
  const { settings, updateSettings, changeCredentials, lockSession } = useAuth();

  // Business settings state
  const [businessName, setBusinessName] = useState(settings?.businessName || 'B-F-L Micro Credit');
  const [businessPhone, setBusinessPhone] = useState(settings?.businessPhone || '+233 24 412 3456');
  const [businessAddress, setBusinessAddress] = useState(settings?.businessAddress || 'Accra, Ghana');

  // Loan parameter defaults
  const [defaultInterestRate, setDefaultInterestRate] = useState(settings?.defaultInterestRate || 10);
  const [defaultInterestType, setDefaultInterestType] = useState<InterestType>(settings?.defaultInterestType || 'flat');
  const [defaultFrequency, setDefaultFrequency] = useState<RepaymentFrequency>(settings?.defaultFrequency || 'weekly');
  const [enablePenalties, setEnablePenalties] = useState(settings?.enablePenalties ?? true);
  const [defaultPenaltyRate, setDefaultPenaltyRate] = useState(settings?.defaultPenaltyRate || 2.5);
  const [autoLockMinutes, setAutoLockMinutes] = useState(settings?.autoLockMinutes || 5);

  // Automated SMS Gateway state
  const [smsProvider, setSmsProvider] = useState<'native' | 'mnotify' | 'arkesel' | 'hubtel' | 'custom_webhook'>(settings?.smsProvider || 'native');
  const [smsApiKey, setSmsApiKey] = useState(settings?.smsApiKey || '');
  const [smsSenderId, setSmsSenderId] = useState(settings?.smsSenderId || 'BFL-LOANS');
  const [autoSmsOnRegister, setAutoSmsOnRegister] = useState(settings?.autoSmsOnRegister ?? true);
  const [autoSmsOnPayment, setAutoSmsOnPayment] = useState(settings?.autoSmsOnPayment ?? true);
  const [autoSmsOnDisburse, setAutoSmsOnDisburse] = useState(settings?.autoSmsOnDisburse ?? true);

  // Credentials change state (Username & Password)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState(settings?.username || 'admin');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [credMessage, setCredMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleChangeCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setCredMessage({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setCredMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword && newPassword.length < 4) {
      setCredMessage({ type: 'error', text: 'New password must be at least 4 characters.' });
      return;
    }

    const res = await changeCredentials(currentPassword, newUsername, newPassword || undefined);
    if (res.success) {
      setCredMessage({ type: 'success', text: res.message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setCredMessage(null), 3000);
    } else {
      setCredMessage({ type: 'error', text: res.message });
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

  // Reset all data completely (Fresh start with zero clients and zero loans)
  const handleWipeAllData = async () => {
    if (window.confirm('Are you sure you want to WIPE ALL DATA? This will delete all registered borrowers, loans, schedules, and payments so you can start fresh.')) {
      await db.resetAllData();
      onDataReset();
      alert('All customer and loan data has been erased. The system is 100% fresh and clean!');
    }
  };

  // Reset and Seed Initial Ghanaian Sample Data
  const handleReloadDemoData = async () => {
    if (window.confirm('Reload realistic Ghanaian sample Drivers & Traders?')) {
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

      {/* 2. Automated SMS Gateway Configuration */}
      <div className="p-5 rounded-3xl bg-white border-2 border-sky-100 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-sky-600" />
            Automated SMS Gateway (Ghana)
          </h3>
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            {smsProvider === 'native' ? 'Free 1-Tap SIM SMS' : `${smsProvider.toUpperCase()} Cloud API`}
          </span>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Choose between <strong>Free 1-Tap SIM SMS</strong> (opens your phone's SMS app) or <strong>Automated Cloud SMS</strong> (sends background SMS directly via mNotify, Arkesel, or Hubtel with custom Sender ID).
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">SMS Delivery Mode</label>
            <select
              value={smsProvider}
              onChange={(e) => setSmsProvider(e.target.value as any)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white"
            >
              <option value="native">Free 1-Tap SIM (Device)</option>
              <option value="mnotify">mNotify Ghana (Automated)</option>
              <option value="arkesel">Arkesel SMS (Automated)</option>
              <option value="hubtel">Hubtel SMS (Automated)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Sender ID (e.g. BFL-LOANS)</label>
            <input
              type="text"
              maxLength={11}
              placeholder="BFL-LOANS"
              value={smsSenderId}
              onChange={(e) => setSmsSenderId(e.target.value)}
              className="w-full text-xs font-black px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {smsProvider !== 'native' && (
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Gateway API Key</label>
            <input
              type="password"
              placeholder="Enter your mNotify / Arkesel / Hubtel API key"
              value={smsApiKey}
              onChange={(e) => setSmsApiKey(e.target.value)}
              className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </div>
        )}

        {/* Automation Triggers */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
            Instant Automation Triggers
          </label>
          
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSmsOnRegister}
              onChange={(e) => setAutoSmsOnRegister(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
            />
            <span>Auto-send Welcome SMS with Client ID on registration</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSmsOnPayment}
              onChange={(e) => setAutoSmsOnPayment(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
            />
            <span>Auto-send instant payment receipt SMS on recording payment</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSmsOnDisburse}
              onChange={(e) => setAutoSmsOnDisburse(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
            />
            <span>Auto-send disbursement schedule SMS on creating new loan</span>
          </label>
        </div>

        <button
          type="button"
          onClick={async () => {
            await updateSettings({
              smsProvider,
              smsApiKey,
              smsSenderId,
              autoSmsOnRegister,
              autoSmsOnPayment,
              autoSmsOnDisburse
            });
            setSaveMessage('Automated SMS Gateway settings saved!');
            setTimeout(() => setSaveMessage(null), 3000);
          }}
          className="w-full py-2.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-black rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" /> Save SMS Settings
        </button>
      </div>

      {/* 3. Operator Security Credentials (Username & Password) */}
      <form onSubmit={handleChangeCredentialsSubmit} className="p-5 rounded-3xl bg-white border-2 border-sky-100 shadow-sm space-y-3.5">
        <h3 className="text-xs font-black uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
          <KeyRound className="w-4 h-4 text-sky-600" />
          Operator Login Credentials (Username & Password)
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Current Password *</label>
            <input
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Username</label>
            <input
              type="text"
              placeholder="e.g. admin"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full text-xs font-black px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">New Password</label>
            <input
              type="password"
              placeholder="Leave blank to keep same"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Confirm New Password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {credMessage && (
          <div className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 font-bold ${
            credMessage.type === 'success' ? 'bg-sky-50 text-sky-900 border border-sky-300' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            <AlertCircle className="w-3.5 h-3.5" />
            {credMessage.text}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 hover:from-sky-700 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition"
        >
          Update Operator Credentials
        </button>
      </form>

      {/* 3. Database Backup & Reset Center */}
      <div className="p-5 rounded-3xl bg-white border-2 border-sky-100 shadow-sm space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
          <Database className="w-4 h-4 text-sky-600" />
          Offline Data Backup & Clean Start
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExportBackup}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 hover:from-sky-100 hover:to-blue-100 border-2 border-sky-200 text-sky-900 text-xs font-black flex flex-col items-center justify-center gap-1 transition shadow-xs"
          >
            <Download className="w-5 h-5 text-sky-600 mb-0.5" />
            Export Local Backup (JSON)
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

        {/* GOOGLE DRIVE & CLOUD TRANSPORT BUTTON (WITH PICTURES) */}
        <button
          onClick={async () => {
            const res = await GoogleDriveBackupService.exportToGoogleDrive();
            if (res.message) {
              setSaveMessage(res.message);
              setTimeout(() => setSaveMessage(null), 5000);
            }
          }}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black rounded-2xl flex items-center justify-center gap-2 transition shadow-md active:scale-95 border border-emerald-300/40"
        >
          <Upload className="w-4 h-4 text-emerald-100" />
          Transport All Clients & Photos to Google Drive
        </button>

        {/* WIPE ALL DATA BUTTON (CLEAN FRESH START) */}
        <button
          onClick={handleWipeAllData}
          className="w-full py-3 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition shadow-md active:scale-95"
        >
          <Trash2 className="w-4 h-4 text-white" />
          Wipe All Data (Fresh Clean Start)
        </button>

        {/* Optional Reload Sample Data */}
        <button
          onClick={handleReloadDemoData}
          className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 transition"
        >
          <RefreshCw className="w-3 h-3 text-slate-500" />
          Load Sample Ghanaian Demo Data
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
