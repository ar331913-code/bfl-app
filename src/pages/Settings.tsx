import React, { useState, useRef, useEffect } from 'react';
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
  MessageSquare,
  Cloud,
  CloudOff,
  Globe,
  Share2,
  Archive,
  History,
  Sparkles,
  Plus
} from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/formatters';
import { GoogleDriveBackupService } from '../services/googleDriveService';
import { CloudSyncService, CloudSnapshot } from '../services/cloudSyncService';

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
  const [autoLockMinutes, setAutoLockMinutes] = useState(settings?.autoLockMinutes || 10);

  // Cloud Synchronization state
  const [cloudSyncOrgId, setCloudSyncOrgId] = useState(settings?.cloudSyncOrgId || 'BFL-GHANA-MAIN');
  const [cloudSyncEndpoint, setCloudSyncEndpoint] = useState(
    (settings?.cloudSyncEndpoint && !settings.cloudSyncEndpoint.includes('bfl-app-cloud-sync-default-rtdb'))
      ? settings.cloudSyncEndpoint 
      : 'https://bfl-microfinance-default-rtdb.firebaseio.com'
  );
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);

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

  // Double-confirmation reset & clear modal states
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearConfirmInput, setClearConfirmInput] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  // Cloud Snapshot Archives state
  const [snapshots, setSnapshots] = useState<CloudSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [snapshotLabelInput, setSnapshotLabelInput] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [snapshotMessage, setSnapshotMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Snapshot Restore Modal state
  const [snapshotToRestore, setSnapshotToRestore] = useState<CloudSnapshot | null>(null);
  const [restoreConfirmInput, setRestoreConfirmInput] = useState('');
  const [isRestoringSnapshot, setIsRestoringSnapshot] = useState(false);
  const [deletingSnapshotId, setDeletingSnapshotId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Cloud Snapshots
  const loadCloudSnapshots = async () => {
    setIsLoadingSnapshots(true);
    try {
      const data = await CloudSyncService.fetchCloudSnapshots();
      setSnapshots(data);
    } catch (err) {
      console.warn('Failed to load snapshots:', err);
    } finally {
      setIsLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    loadCloudSnapshots();
  }, []);

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingSnapshot(true);
    setSnapshotMessage(null);
    try {
      const res = await CloudSyncService.createCloudSnapshot(snapshotLabelInput);
      if (res.success) {
        setSnapshotMessage({ type: 'success', text: res.message });
        setSnapshotLabelInput('');
        await loadCloudSnapshots();
      } else {
        setSnapshotMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setSnapshotMessage({ type: 'error', text: err.message || 'Failed to create cloud snapshot' });
    } finally {
      setIsCreatingSnapshot(false);
      setTimeout(() => setSnapshotMessage(null), 6000);
    }
  };

  const handleConfirmRestoreSnapshot = async () => {
    if (!snapshotToRestore) return;
    setIsRestoringSnapshot(true);
    try {
      const res = await CloudSyncService.restoreCloudSnapshot(snapshotToRestore);
      if (res.success) {
        onDataReset();
        setSnapshotToRestore(null);
        setRestoreConfirmInput('');
        setSnapshotMessage({ type: 'success', text: res.message });
      } else {
        setSnapshotMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setSnapshotMessage({ type: 'error', text: err.message || 'Restore failed' });
    } finally {
      setIsRestoringSnapshot(false);
      setTimeout(() => setSnapshotMessage(null), 6000);
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    setDeletingSnapshotId(id);
    try {
      const ok = await CloudSyncService.deleteCloudSnapshot(id);
      if (ok) {
        setSnapshots(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete snapshot:', err);
    } finally {
      setDeletingSnapshotId(null);
    }
  };

  const handleDownloadSnapshotJSON = (snapshot: CloudSnapshot) => {
    const jsonStr = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BFL_Cloud_Backup_${snapshot.id}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
      autoLockMinutes,
      cloudSyncOrgId,
      cloudSyncEndpoint
    });

    setSaveMessage('System settings saved successfully!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleTriggerCloudSync = async () => {
    setIsCloudSyncing(true);
    setCloudSyncMessage(null);
    try {
      await updateSettings({ cloudSyncOrgId, cloudSyncEndpoint });
      const res = await CloudSyncService.syncWithCloud(true);
      setCloudSyncMessage(res.message);
    } catch (err: any) {
      setCloudSyncMessage('Sync failed. Please verify internet connection.');
    } finally {
      setIsCloudSyncing(false);
      setTimeout(() => setCloudSyncMessage(null), 4000);
    }
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
  };

  // Full Database Backup Import
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        const success = await db.restoreFromJSON(json);
        if (success) {
          alert('Database restored successfully! Refreshing...');
          window.location.reload();
        } else {
          alert('Failed to restore database. Invalid backup file format.');
        }
      } catch (err) {
        alert('Error parsing backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5 pb-24 animate-fade-in text-slate-800">
      
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Settings & Security
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Multi-device sync, loan defaults & SMS gateway
          </p>
        </div>

        <button
          onClick={lockSession}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Lock App</span>
        </button>
      </div>

      {saveMessage && (
        <div className="p-3.5 rounded-2xl bg-sky-50 text-blue-900 border border-sky-300 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
          <Check className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Settings Grid (Responsive 2-column on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Multi-Device Google Firebase Cloud Synchronization */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-gradient-to-br from-blue-950 via-indigo-950 to-slate-950 text-white shadow-xl border border-sky-500/30 space-y-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
            <Cloud className="w-4 h-4 text-sky-400" />
            Google Firebase Cloud Database
          </h3>
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/40 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
            Firebase Cloud Active
          </span>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed">
          All client registrations, loans, schedules, and payments are automatically saved to <strong>Google Firebase Cloud</strong>. When you or your agents open the app on another phone or computer with the same <strong>Organization Sync Key</strong>, everything updates in real time!
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="text-[11px] font-bold text-sky-200 block mb-1">
              Firebase Organization Sync Key
            </label>
            <input
              type="text"
              placeholder="e.g. BFL-GHANA-MAIN"
              value={cloudSyncOrgId}
              onChange={(e) => setCloudSyncOrgId(e.target.value)}
              className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-sky-500/40 bg-white/10 text-white focus:border-sky-400 focus:outline-none placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-sky-200 block mb-1">
              Firebase Database Endpoint URL
            </label>
            <input
              type="text"
              placeholder="https://your-project.firebaseio.com"
              value={cloudSyncEndpoint}
              onChange={(e) => setCloudSyncEndpoint(e.target.value)}
              className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-sky-500/40 bg-white/10 text-white focus:border-sky-400 focus:outline-none placeholder:text-slate-500 text-[11px]"
            />
          </div>
        </div>

        {cloudSyncMessage && (
          <div className="p-2.5 rounded-xl bg-sky-500/20 border border-sky-400/50 text-sky-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-sky-400" />
            <span>{cloudSyncMessage}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleTriggerCloudSync}
          disabled={isCloudSyncing}
          className="w-full py-3 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-98 text-white text-xs font-black rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {isCloudSyncing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Synchronizing with Cloud...</span>
            </>
          ) : (
            <>
              <Cloud className="w-4 h-4" />
              <span>Sync All Data Across Devices Now</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Business Information & Loan Defaults */}
      <form onSubmit={handleSaveSettings} className="p-5 rounded-3xl bg-white border-2 border-sky-100 shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-blue-600" />
          Business Profile & Default Parameters
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Business Phone</label>
            <input
              type="text"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="col-span-2">
            <label className="text-xs font-bold text-slate-700 block mb-1">Business Address</label>
            <input
              type="text"
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Default Interest (%)</label>
            <input
              type="number"
              value={defaultInterestRate}
              onChange={(e) => setDefaultInterestRate(Number(e.target.value))}
              className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Interest Type</label>
            <select
              value={defaultInterestType}
              onChange={(e) => setDefaultInterestType(e.target.value as InterestType)}
              className="w-full text-xs font-semibold px-2 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white"
            >
              <option value="flat">Flat Rate</option>
              <option value="reducing_balance">Reducing Balance</option>
              <option value="fixed_sum">Fixed Sum</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Frequency</label>
            <select
              value={defaultFrequency}
              onChange={(e) => setDefaultFrequency(e.target.value as RepaymentFrequency)}
              className="w-full text-xs font-semibold px-2 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Auto-Lock Security Timer</label>
            <select
              value={autoLockMinutes}
              onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none bg-white"
            >
              <option value={1}>1 Minute Inactive</option>
              <option value={3}>3 Minutes Inactive</option>
              <option value={5}>5 Minutes Inactive</option>
              <option value={10}>10 Minutes Inactive</option>
              <option value={15}>15 Minutes Inactive</option>
              <option value={0}>Always Keep Unlocked</option>
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

      {/* 3. Automated SMS Gateway Configuration */}
      <div className="p-5 rounded-3xl bg-white border-2 border-sky-100 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            Automated SMS Gateway (Ghana)
          </h3>
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-sky-100 text-blue-800 border border-sky-300">
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
              <option value="arkesel">Arkesel Ghana (Automated)</option>
              <option value="hubtel">Hubtel Ghana (Automated)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Sender ID (Max 11 chars)</label>
            <input
              type="text"
              maxLength={11}
              placeholder="BFL-LOANS"
              value={smsSenderId}
              onChange={(e) => setSmsSenderId(e.target.value.toUpperCase())}
              className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none uppercase"
            />
          </div>
        </div>

        {smsProvider !== 'native' && (
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">API Key / Secret Token</label>
            <input
              type="password"
              placeholder={`Enter your ${smsProvider.toUpperCase()} API Key`}
              value={smsApiKey}
              onChange={(e) => setSmsApiKey(e.target.value)}
              className="w-full text-xs font-mono px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </div>
        )}

        <div className="space-y-1.5 pt-1">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSmsOnRegister}
              onChange={(e) => setAutoSmsOnRegister(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-sky-500"
            />
            <span>Auto-send welcome SMS on registering new client</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSmsOnPayment}
              onChange={(e) => setAutoSmsOnPayment(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-sky-500"
            />
            <span>Auto-send instant payment receipt SMS on recording payment</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSmsOnDisburse}
              onChange={(e) => setAutoSmsOnDisburse(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-sky-500"
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

      {/* 4. Operator Security Credentials (Username & Password) */}
      <form onSubmit={handleChangeCredentialsSubmit} className="p-5 rounded-3xl bg-white border-2 border-sky-100 shadow-sm space-y-3.5">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <KeyRound className="w-4 h-4 text-blue-600" />
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
              placeholder="Leave blank to keep current"
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
            credMessage.type === 'success' ? 'bg-sky-50 text-blue-900 border border-sky-300' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            <AlertCircle className="w-3.5 h-3.5" />
            {credMessage.text}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition"
        >
          Update Operator Credentials
        </button>
      </form>

      {/* 5. Cloud Snapshot & Backup Vault (Firebase Cloud) */}
      <div className="lg:col-span-2 p-5 rounded-3xl bg-white border-2 border-sky-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-blue-600 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Cloud Snapshot & Backup Vault
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Save full point-in-time backups to Firebase Cloud. Restore anytime.
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-blue-700 text-[10px] font-black">
            {snapshots.length} {snapshots.length === 1 ? 'Snapshot' : 'Snapshots'}
          </span>
        </div>

        {/* Snapshot Notification Feedback */}
        {snapshotMessage && (
          <div className={`p-2.5 rounded-xl text-xs flex items-center gap-1.5 font-bold animate-fade-in ${
            snapshotMessage.type === 'success' ? 'bg-sky-50 text-blue-900 border border-sky-300' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {snapshotMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
            <span>{snapshotMessage.text}</span>
          </div>
        )}

        {/* Create Snapshot Form */}
        <form onSubmit={handleCreateSnapshot} className="space-y-2 pt-1 border-t border-slate-100">
          <label className="text-[11px] font-bold text-slate-700 block">
            Save Current Portfolio Snapshot to Cloud
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. End of Month August, Before Auditing..."
              value={snapshotLabelInput}
              onChange={(e) => setSnapshotLabelInput(e.target.value)}
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none placeholder:text-slate-400 bg-slate-50/50"
            />
            <button
              type="submit"
              disabled={isCreatingSnapshot}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md shadow-blue-600/20 transition disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
            >
              {isCreatingSnapshot ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Save to Cloud</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Saved Snapshots List */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Archive className="w-3 h-3 text-blue-600" />
              Saved Cloud Backups ({snapshots.length})
            </span>
            <button
              type="button"
              onClick={loadCloudSnapshots}
              disabled={isLoadingSnapshots}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isLoadingSnapshots ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingSnapshots ? (
            <div className="py-6 text-center text-xs text-slate-400 font-bold flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>Loading cloud archives...</span>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
              <Archive className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-700">No cloud snapshots saved yet</p>
              <p className="text-[10px] text-slate-400">
                Click "Save to Cloud" above to capture your current borrowers and loan ledger.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-sky-300 transition space-y-2 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 leading-tight">
                        {snap.label}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {new Date(snap.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-black text-[9px]">
                        {snap.customersCount} Clients
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-black text-[9px]">
                        {snap.loansCount} Loans
                      </span>
                    </div>
                  </div>

                  {/* Summary Badges */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] bg-white p-2 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Outstanding</span>
                      <span className="font-black text-slate-800">{formatCurrency(snap.totalOutstanding || 0)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Collected</span>
                      <span className="font-black text-teal-700">{formatCurrency(snap.totalCollected || 0)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSnapshotToRestore(snap);
                        setRestoreConfirmInput('');
                      }}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] flex items-center justify-center gap-1 shadow-xs transition active:scale-95"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Restore to System</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadSnapshotJSON(snap)}
                      title="Download JSON File"
                      className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] transition active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSnapshot(snap.id)}
                      disabled={deletingSnapshotId === snap.id}
                      title="Delete from Cloud"
                      className="p-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 font-bold text-[10px] transition active:scale-95 disabled:opacity-40"
                    >
                      {deletingSnapshotId === snap.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 6. Offline Data Backup & Clear Ledger Center */}
      <div className="p-5 rounded-3xl bg-white border-2 border-slate-100 shadow-sm space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <Database className="w-4 h-4 text-slate-700" />
          Offline File Backup & Ledger Wipe Controls
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="p-3 rounded-2xl border-2 border-sky-200 bg-sky-50 hover:bg-sky-100 text-blue-900 flex flex-col items-center justify-center gap-1.5 font-black text-xs transition active:scale-95"
          >
            <Download className="w-4 h-4 text-blue-700" />
            <span>Download Offline JSON</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-2xl border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 flex flex-col items-center justify-center gap-1.5 font-black text-xs transition active:scale-95"
          >
            <Upload className="w-4 h-4 text-indigo-700" />
            <span>Restore from File</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportBackup}
          className="hidden"
        />

        <div className="pt-2 border-t border-slate-100 space-y-2">
          {/* Button 1: Clear All Data (0 Records / Fresh Slate) */}
          <button
            type="button"
            onClick={() => {
              setClearConfirmInput('');
              setIsClearModalOpen(true);
            }}
            className="w-full py-2.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Active Ledger (0 Clients / Fresh Slate)</span>
          </button>

          {/* Button 2: Reset with Demo Samples */}
          <button
            type="button"
            onClick={() => {
              setResetConfirmInput('');
              setIsResetModalOpen(true);
            }}
            className="w-full py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>Reset with Demo Ghanaian Sample Clients</span>
          </button>
        </div>
      </div>

      </div>

      {/* MODAL 1: DOUBLE-CONFIRMATION RESTORE SNAPSHOT */}
      {snapshotToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-5 border border-sky-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-blue-600 flex items-center justify-center mx-auto">
              <Cloud className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-sm font-black text-slate-950">Restore Cloud Snapshot</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                You are about to restore <strong>"{snapshotToRestore.label}"</strong> saved on {new Date(snapshotToRestore.createdAt).toLocaleDateString()}.
              </p>
            </div>

            {/* Summary preview of snapshot */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Borrowers:</span>
                <span className="font-black text-slate-900">{snapshotToRestore.customersCount} Clients</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Active Loans:</span>
                <span className="font-black text-slate-900">{snapshotToRestore.loansCount} Loans</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Outstanding:</span>
                <span className="font-black text-blue-900">{formatCurrency(snapshotToRestore.totalOutstanding || 0)}</span>
              </div>
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-medium leading-tight">
              ⚠️ This will replace your active ledger with this backup and sync across all your phones.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                Type <span className="font-mono text-blue-700 font-black">RESTORE</span> to confirm:
              </label>
              <input
                type="text"
                placeholder="Type RESTORE here"
                value={restoreConfirmInput}
                onChange={(e) => setRestoreConfirmInput(e.target.value)}
                className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-xl border-2 border-sky-200 focus:border-blue-600 focus:outline-none text-center uppercase tracking-widest"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSnapshotToRestore(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={restoreConfirmInput.trim().toUpperCase() !== 'RESTORE' || isRestoringSnapshot}
                onClick={handleConfirmRestoreSnapshot}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black transition disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRestoringSnapshot ? 'animate-spin' : ''}`} />
                <span>{isRestoringSnapshot ? 'Restoring...' : 'Restore Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DOUBLE-CONFIRMATION CLEAR ALL DATA (0 RECORDS) */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-5 border border-rose-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-sm font-black text-slate-950">Clear Active Ledger (0 Clients)</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This will wipe active clients, loans, schedules, and receipts from your active ledger. <strong>Your Cloud Snapshots are preserved</strong> and can be restored at any time.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                Type <span className="font-mono text-rose-700 font-black">CLEAR</span> to confirm:
              </label>
              <input
                type="text"
                placeholder="Type CLEAR here"
                value={clearConfirmInput}
                onChange={(e) => setClearConfirmInput(e.target.value)}
                className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-xl border-2 border-rose-200 focus:border-rose-600 focus:outline-none text-center uppercase tracking-widest"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={clearConfirmInput.trim().toUpperCase() !== 'CLEAR' || isClearing}
                onClick={async () => {
                  setIsClearing(true);
                  try {
                    await CloudSyncService.clearAllPortfolioData();
                    onDataReset();
                    setIsClearModalOpen(false);
                  } catch (e) {
                    console.error('Clear error:', e);
                  } finally {
                    setIsClearing(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black transition disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearing ? 'Clearing...' : 'Clear All (0)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DOUBLE-CONFIRMATION RESET DEMO DATA */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-5 border border-sky-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-blue-600 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-sm font-black text-slate-950">Reset with Sample Demo Clients</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This will overwrite the database on this phone and Firebase Cloud with fresh Ghanaian demo borrowers (Kofi Boateng, Akosua Darko, etc.).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                Type <span className="font-mono text-blue-700 font-black">RESET</span> to confirm:
              </label>
              <input
                type="text"
                placeholder="Type RESET here"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                className="w-full text-xs font-mono font-bold px-3 py-2.5 rounded-xl border-2 border-sky-200 focus:border-blue-600 focus:outline-none text-center uppercase tracking-widest"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={resetConfirmInput.trim().toUpperCase() !== 'RESET' || isResetting}
                onClick={async () => {
                  setIsResetting(true);
                  try {
                    await CloudSyncService.reseedPortfolioData();
                    onDataReset();
                    setIsResetModalOpen(false);
                  } catch (e) {
                    console.error('Reset error:', e);
                  } finally {
                    setIsResetting(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black transition disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isResetting ? 'Resetting...' : 'Reseed Demo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
