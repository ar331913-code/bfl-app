import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db';
import { SystemSettings } from '../types';
import { CloudSyncService } from '../services/cloudSyncService';

interface AuthContextType {
  isAuthenticated: boolean;
  isLocked: boolean;
  operatorName: string;
  settings: SystemSettings | null;
  showLanding: boolean;
  setShowLanding: (show: boolean) => void;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  verifyAdminAccess: (pinOrPass: string) => Promise<boolean>;
  changeCredentials: (currentPassword: string, newUsername: string, newPassword?: string) => Promise<{ success: boolean; message: string }>;
  lockSession: () => void;
  unlockSession: () => void;
  logout: () => void;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Pure-JS deterministic SHA-256 algorithm (works identically across HTTP, HTTPS, Capacitor, Electron, etc.)
function jsSha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const words: number[] = [];
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const utf8: number[] = [];
  for (let i = 0; i < ascii.length; i++) {
    let charcode = ascii.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (ascii.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }

  const bitLength = utf8.length * 8;
  utf8.push(0x80);
  while ((utf8.length % 64) !== 56) {
    utf8.push(0);
  }
  for (let i = 0; i < 8; i++) {
    utf8.push((bitLength >>> ((7 - i) * 8)) & 0xff);
  }

  for (let i = 0; i < utf8.length; i += 4) {
    words.push((utf8[i] << 24) | (utf8[i + 1] << 16) | (utf8[i + 2] << 8) | utf8[i + 3]);
  }

  for (let j = 0; j < words.length; j += 16) {
    const w = new Array(64);
    for (let i = 0; i < 16; i++) {
      w[i] = words[j + i];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];

    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h) | 0;
  }

  let hex = '';
  for (let i = 0; i < 8; i++) {
    hex += ('00000000' + (H[i] >>> 0).toString(16)).slice(-8);
  }
  return hex.toLowerCase();
}

export async function computeSha256(message: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
    }
  } catch (e) {
    // Fallback to pure JS
  }
  return jsSha256(message);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [showLanding, setShowLanding] = useState<boolean>(true);
  
  // Fast bootstrap from local cache
  const [settings, setSettings] = useState<SystemSettings | null>(() => {
    try {
      const cached = localStorage.getItem('bfl_cached_auth_settings');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });

  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Load Settings from Dexie and guarantee exactly one record
  const loadSettings = async () => {
    try {
      const list = await db.settings.toArray();
      if (list.length > 0) {
        // Deduplicate settings rows if more than 1 exist
        list.sort((a, b) => {
          const timeA = new Date(a.updatedAt || '1970-01-01').getTime();
          const timeB = new Date(b.updatedAt || '1970-01-01').getTime();
          return timeB - timeA;
        });

        const active = list[0];
        if (list.length > 1) {
          const duplicateIds = list.slice(1).map(x => x.id!).filter(Boolean);
          if (duplicateIds.length > 0) {
            await db.settings.bulkDelete(duplicateIds);
          }
        }

        if (active.businessName && /micro/i.test(active.businessName)) {
          active.businessName = 'B-F-L';
          await db.settings.update(active.id!, { businessName: 'B-F-L' });
        }

        setSettings(active);
        localStorage.setItem('bfl_cached_auth_settings', JSON.stringify(active));
      } else {
        const defaultPasswordHash = await computeSha256('admin123');
        const defaultSettings: SystemSettings = {
          operatorName: 'Loan Administrator',
          businessName: 'B-F-L',
          businessPhone: '+233 24 412 3456',
          businessAddress: 'Accra, Ghana',
          username: 'admin',
          passwordHash: defaultPasswordHash,
          defaultInterestRate: 10,
          defaultInterestType: 'flat',
          defaultFrequency: 'weekly',
          defaultDurationValue: 8,
          defaultDurationUnit: 'weeks',
          enablePenalties: true,
          defaultPenaltyRate: 2.5,
          gracePeriodDays: 2,
          autoLockMinutes: 10,
          biometricEnabled: false,
          salt: 'bfl_salt_2026',
          smsReminderTemplate: 'Hello {name}, your B-F-L loan installment of GH₵{amount} is due on {date}. Kindly remit via MoMo or cash.',
          updatedAt: new Date().toISOString()
        };
        const id = await db.settings.add(defaultSettings);
        const fullSettings = { ...defaultSettings, id };
        setSettings(fullSettings);
        localStorage.setItem('bfl_cached_auth_settings', JSON.stringify(fullSettings));
      }
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
  };

  useEffect(() => {
    loadSettings();

    // Listen for real-time multi-device settings sync events
    const handleRemoteSettingsUpdate = (event: any) => {
      if (event.detail && typeof event.detail === 'object') {
        setSettings(event.detail);
        localStorage.setItem('bfl_cached_auth_settings', JSON.stringify(event.detail));
      }
    };

    window.addEventListener('bfl_settings_updated', handleRemoteSettingsUpdate);
    return () => {
      window.removeEventListener('bfl_settings_updated', handleRemoteSettingsUpdate);
    };
  }, []);

  // Auto-lock on Inactivity
  useEffect(() => {
    if (!settings || !settings.autoLockMinutes || settings.autoLockMinutes <= 0) return;

    const interval = setInterval(() => {
      const timeoutMs = settings.autoLockMinutes * 60 * 1000;
      if (Date.now() - lastActivity > timeoutMs && !isLocked && isAuthenticated) {
        setIsLocked(true);
        setShowLanding(false);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [lastActivity, settings, isLocked, isAuthenticated]);

  // Track User Interaction
  useEffect(() => {
    const resetTimer = () => setLastActivity(Date.now());
    window.addEventListener('touchstart', resetTimer, { passive: true });
    window.addEventListener('click', resetTimer, { passive: true });
    window.addEventListener('keydown', resetTimer, { passive: true });

    return () => {
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, []);

  const login = async (enteredUser: string, enteredPass: string): Promise<{ success: boolean; message?: string }> => {
    const trimmedUser = enteredUser.trim();
    const trimmedPass = enteredPass.trim();
    if (!trimmedUser || !trimmedPass) {
      return { success: false, message: 'Please enter both username and password.' };
    }

    // Refresh settings from DB or memory
    let currentSettings = settings;
    try {
      const list = await db.settings.toArray();
      if (list.length > 0) currentSettings = list[0];
    } catch {}

    const currentUsername = currentSettings?.username || 'admin';
    const currentPassHash = currentSettings?.passwordHash || (await computeSha256('admin123'));
    const defaultHash = await computeSha256('admin123');

    const enteredPassHash = await computeSha256(trimmedPass);

    // Case-insensitive username check + secure password hash check
    const isUserValid = trimmedUser.toLowerCase() === currentUsername.toLowerCase();
    const isPassValid = (enteredPassHash === currentPassHash) || (trimmedPass === 'admin123' && currentPassHash === defaultHash);

    if (isUserValid && isPassValid) {
      setIsAuthenticated(true);
      setIsLocked(false);
      setShowLanding(false);
      setLastActivity(Date.now());
      return { success: true };
    }

    return { success: false, message: 'Invalid username or password. Access Denied.' };
  };

  const verifyAdminAccess = async (pinOrPass: string): Promise<boolean> => {
    if (!pinOrPass || !pinOrPass.trim()) return false;
    const cleanInput = pinOrPass.trim();

    let currentSettings = settings;
    try {
      const list = await db.settings.toArray();
      if (list.length > 0) currentSettings = list[0];
    } catch {}

    const currentPassHash = currentSettings?.passwordHash || (await computeSha256('admin123'));
    const defaultHash = await computeSha256('admin123');
    const enteredPassHash = await computeSha256(cleanInput);

    return (enteredPassHash === currentPassHash) || (cleanInput === 'admin123' && currentPassHash === defaultHash);
  };

  const changeCredentials = async (
    currentPassword: string,
    newUsername: string,
    newPassword?: string
  ): Promise<{ success: boolean; message: string }> => {
    let currentSettings = settings;
    try {
      const list = await db.settings.toArray();
      if (list.length > 0) currentSettings = list[0];
    } catch {}

    if (!currentSettings) return { success: false, message: 'Settings could not be loaded.' };

    const currentPassHash = currentSettings.passwordHash || (await computeSha256('admin123'));
    const defaultHash = await computeSha256('admin123');
    const cleanCurrent = currentPassword.trim();
    const enteredCurrentHash = await computeSha256(cleanCurrent);

    const isCurrentValid = (enteredCurrentHash === currentPassHash) || (cleanCurrent === 'admin123' && currentPassHash === defaultHash);

    if (!isCurrentValid) {
      return { success: false, message: 'Current password is incorrect. Please enter the current password.' };
    }

    const trimmedNewUser = newUsername.trim();
    if (!trimmedNewUser) {
      return { success: false, message: 'Username cannot be empty.' };
    }

    let nextPassHash = currentPassHash;
    if (newPassword && newPassword.trim()) {
      const cleanNew = newPassword.trim();
      if (cleanNew.length < 4) {
        return { success: false, message: 'New password must be at least 4 characters.' };
      }
      nextPassHash = await computeSha256(cleanNew);
    }

    const now = new Date().toISOString();
    const updated: SystemSettings = {
      ...currentSettings,
      username: trimmedNewUser,
      passwordHash: nextPassHash,
      updatedAt: now
    };

    if (currentSettings.id) {
      await db.settings.update(currentSettings.id, {
        username: trimmedNewUser,
        passwordHash: nextPassHash,
        updatedAt: now
      });
    } else {
      const id = await db.settings.add(updated);
      updated.id = id;
    }

    setSettings(updated);
    localStorage.setItem('bfl_cached_auth_settings', JSON.stringify(updated));

    // Audit log
    await db.auditLogs.add({
      action: 'CREDENTIALS_CHANGED',
      entityType: 'system',
      details: `Operator credentials updated for username: ${trimmedNewUser}`,
      timestamp: now
    });

    // Notify other components and sync immediately to cloud
    window.dispatchEvent(new CustomEvent('bfl_settings_updated', { detail: updated }));
    CloudSyncService.syncWithCloud(true).catch(e => console.warn('Cloud sync on credential change:', e));

    return { 
      success: true, 
      message: 'Credentials updated successfully and synced across all devices!' 
    };
  };

  const lockSession = () => {
    setIsLocked(true);
    setShowLanding(false);
  };

  const unlockSession = () => {
    setIsLocked(false);
    setShowLanding(false);
    setLastActivity(Date.now());
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsLocked(true);
    setShowLanding(true);
  };

  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    let current = settings;
    try {
      const list = await db.settings.toArray();
      if (list.length > 0) current = list[0];
    } catch {}
    if (!current) return;

    const now = new Date().toISOString();
    const updated: SystemSettings = { 
      ...current, 
      ...newSettings,
      updatedAt: now
    };

    if (current.id) {
      await db.settings.update(current.id, updated);
    } else {
      const id = await db.settings.add(updated);
      updated.id = id;
    }

    setSettings(updated);
    localStorage.setItem('bfl_cached_auth_settings', JSON.stringify(updated));

    await db.auditLogs.add({
      action: 'SETTINGS_UPDATED',
      entityType: 'system',
      details: 'System loan defaults and business parameters updated',
      timestamp: now
    });

    window.dispatchEvent(new CustomEvent('bfl_settings_updated', { detail: updated }));
    CloudSyncService.triggerBackgroundSync();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLocked,
        operatorName: settings?.businessName || 'Loan Administrator',
        settings,
        showLanding,
        setShowLanding,
        login,
        verifyAdminAccess,
        changeCredentials,
        lockSession,
        unlockSession,
        logout,
        updateSettings
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

