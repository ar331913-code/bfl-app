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
  MessageSquare,
  Cloud,
  CloudOff,
  Globe,
  Share2
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { GoogleDriveBackupService } from '../services/googleDriveService';
import { CloudSyncService } from '../services/cloudSyncService';
import { MOMOService } from '../services/momoService';

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

  // MTN Mobile Money (MoMo) Gateway state
  const [momoProvider, setMomoProvider] = useState<'manual_ussd' | 'mtn_open_api' | 'hubtel' | 'paystack' | 'custom_webhook'>(
    settings?.momoProvider || 'manual_ussd'
  );
  const [momoApiUserId, setMomoApiUserId] = useState(settings?.momoApiUserId || '');
  const [momoApiKey, setMomoApiKey] = useState(settings?.momoApiKey || '');
  const [momoSubscriptionKey, setMomoSubscriptionKey] = useState(settings?.momoSubscriptionKey || '');
  const [momoTargetEnvironment, setMomoTargetEnvironment] = useState<'sandbox' | 'production'>(
    settings?.momoTargetEnvironment || 'sandbox'
  );
  const [momoMerchantPhone, setMomoMerchantPhone] = useState(settings?.momoMerchantPhone || '+233 24 412 3456');
  const [isTestingMoMo, setIsTestingMoMo] = useState(false);
  const [momoTestMessage, setMomoTestMessage] = useState<{ success: boolean; text: string } | null>(null);

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

      {/* 1. Multi-Device Google Firebase Cloud Synchronization */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-950 via-indigo-950 to-slate-950 text-white shadow-xl border border-sky-500/30 space-y-3.5 relative overflow-hidden">
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

      {/* 3. MTN Mobile Money (MoMo) Disbursement Gateway */}
      <div className="p-5 rounded-3xl bg-white border-2 border-amber-300 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            MTN Mobile Money (MoMo) Loan Disbursement Gateway
          </h3>
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
            {momoProvider === 'manual_ussd' ? '1-Tap SIM USSD (*170#)' : `${momoProvider.toUpperCase()} Direct`}
          </span>
        </div>

        <p className="text-[11px] text-slate-600 leading-relaxed">
          Configure how microloans are sent to borrowers. Use <strong>1-Tap SIM USSD (*170#)</strong> for instant operator transfer with pre-filled dialer, or connect <strong>MTN MoMo Open API</strong> / <strong>Hubtel</strong> for automated instant cloud payouts.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Disbursement Mode</label>
            <select
              value={momoProvider}
              onChange={(e) => setMomoProvider(e.target.value as any)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:outline-none bg-white"
            >
              <option value="manual_ussd">1-Tap SIM & USSD (*170#) [Standard]</option>
              <option value="mtn_open_api">MTN MoMo Open API (Direct)</option>
              <option value="hubtel">Hubtel MoMo Gateway</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Disbursing Merchant Phone</label>
            <input
              type="text"
              placeholder="+233 24 412 3456"
              value={momoMerchantPhone}
              onChange={(e) => setMomoMerchantPhone(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:outline-none font-mono"
            />
          </div>
        </div>

        {momoProvider === 'mtn_open_api' && (
          <div className="space-y-2.5 pt-1 border-t border-amber-200/80 animate-fade-in">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Target Environment</label>
                <select
                  value={momoTargetEnvironment}
                  onChange={(e) => setMomoTargetEnvironment(e.target.value as any)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:outline-none bg-white"
                >
                  <option value="sandbox">MTN MoMo Sandbox (Testing)</option>
                  <option value="production">MTN MoMo Live Production</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">API User ID (UUID)</label>
                <input
                  type="text"
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={momoApiUserId}
                  onChange={(e) => setMomoApiUserId(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:outline-none text-[11px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">API Key / Secret</label>
                <input
                  type="password"
                  placeholder="Enter MTN MoMo API Key"
                  value={momoApiKey}
                  onChange={(e) => setMomoApiKey(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Primary Subscription Key</label>
                <input
                  type="password"
                  placeholder="Ocp-Apim-Subscription-Key"
                  value={momoSubscriptionKey}
                  onChange={(e) => setMomoSubscriptionKey(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {momoTestMessage && (
          <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-fade-in ${
            momoTestMessage.success ? 'bg-sky-50 text-blue-900 border border-sky-300' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{momoTestMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={async () => {
              setIsTestingMoMo(true);
              setMomoTestMessage(null);
              try {
                const res = await MOMOService.testConnection({
                  momoProvider,
                  momoApiUserId,
                  momoApiKey,
                  momoSubscriptionKey,
                  momoTargetEnvironment,
                  momoMerchantPhone
                } as any);
                setMomoTestMessage({ success: res.success, text: res.message });
              } catch (err: any) {
                setMomoTestMessage({ success: false, text: err.message || 'Failed to connect to MoMo Gateway' });
              } finally {
                setIsTestingMoMo(false);
              }
            }}
            disabled={isTestingMoMo}
            className="py-2.5 rounded-xl border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1"
          >
            {isTestingMoMo ? 'Testing...' : 'Test MoMo Connection'}
          </button>

          <button
            type="button"
            onClick={async () => {
              await updateSettings({
                momoProvider,
                momoApiUserId,
                momoApiKey,
                momoSubscriptionKey,
                momoTargetEnvironment,
                momoMerchantPhone
              });
              setSaveMessage('MTN MoMo Gateway settings saved successfully!');
              setTimeout(() => setSaveMessage(null), 3000);
            }}
            className="py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-amber-950 text-xs font-black rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" /> Save MoMo Settings
          </button>
        </div>
      </div>

      {/* 4. Automated SMS Gateway Configuration */}
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

      {/* 5. Database Backup & Reset Center */}
      <div className="p-5 rounded-3xl bg-white border-2 border-sky-100 shadow-sm space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <Database className="w-4 h-4 text-blue-600" />
          Offline Data Backup & Google Drive Center
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="p-3 rounded-2xl border-2 border-sky-200 bg-sky-50 hover:bg-sky-100 text-blue-900 flex flex-col items-center justify-center gap-1.5 font-black text-xs transition active:scale-95"
          >
            <Download className="w-4 h-4 text-blue-700" />
            <span>Download Backup</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-2xl border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 flex flex-col items-center justify-center gap-1.5 font-black text-xs transition active:scale-95"
          >
            <Upload className="w-4 h-4 text-teal-700" />
            <span>Restore Backup</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportBackup}
          className="hidden"
        />

        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={async () => {
              if (confirm('Are you sure you want to reset all data and reseed clean sample clients? This cannot be undone.')) {
                await seedInitialData(true);
                await CloudSyncService.syncWithCloud(true);
                onDataReset();
                alert('Database reset and re-seeded successfully!');
              }
            }}
            className="w-full py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold flex items-center justify-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset & Reseed Portfolio</span>
          </button>
        </div>
      </div>

    </div>
  );
};
