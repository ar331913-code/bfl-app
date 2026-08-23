import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db';
import { SystemSettings } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  isLocked: boolean;
  operatorName: string;
  settings: SystemSettings | null;
  showLanding: boolean;
  setShowLanding: (show: boolean) => void;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  changeCredentials: (currentPassword: string, newUsername: string, newPassword?: string) => Promise<{ success: boolean; message: string }>;
  lockSession: () => void;
  unlockSession: () => void;
  logout: () => void;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Safe hash function
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

async function sha256(message: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    // Fallback
  }
  return simpleHash(message);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Load Settings from Dexie
  const loadSettings = async () => {
    try {
      const list = await db.settings.toArray();
      if (list.length > 0) {
        const current = list[0];
        if (current.businessName === 'B-F-L Micro Credit' || current.businessName === 'B-F-L Microfinance') {
          current.businessName = 'B-F-L';
          await db.settings.update(current.id!, { businessName: 'B-F-L' });
        }
        setSettings(current);
      } else {
        const defaultPasswordHash = await sha256('admin123');
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
          smsReminderTemplate: 'Hello {name}, your B-F-L loan installment of GH₵{amount} is due on {date}. Kindly remit via MoMo or cash.'
        };
        const id = await db.settings.add(defaultSettings);
        setSettings({ ...defaultSettings, id });
      }
    } catch (e) {
      console.warn('Failed to load settings', e);
    }
  };

  useEffect(() => {
    loadSettings();
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
    if (!trimmedUser || !enteredPass) {
      return { success: false, message: 'Please enter both username and password.' };
    }

    const currentUsername = settings?.username || 'admin';
    const currentPassHash = settings?.passwordHash || (await sha256('admin123'));

    const enteredPassHash = await sha256(enteredPass);

    // Case-insensitive username check + secure password hash check
    const isUserValid = trimmedUser.toLowerCase() === currentUsername.toLowerCase();
    const isPassValid = enteredPassHash === currentPassHash;

    if (isUserValid && isPassValid) {
      setIsAuthenticated(true);
      setIsLocked(false);
      setShowLanding(false);
      setLastActivity(Date.now());
      return { success: true };
    }

    return { success: false, message: 'Invalid username or password. Access Denied.' };
  };

  const changeCredentials = async (
    currentPassword: string,
    newUsername: string,
    newPassword?: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!settings) return { success: false, message: 'Settings not loaded.' };

    const currentPassHash = settings.passwordHash || (await sha256('admin123'));
    const enteredCurrentHash = await sha256(currentPassword);

    if (enteredCurrentHash !== currentPassHash) {
      return { success: false, message: 'Current password is incorrect.' };
    }

    const trimmedNewUser = newUsername.trim();
    if (!trimmedNewUser) {
      return { success: false, message: 'Username cannot be empty.' };
    }

    let nextPassHash = currentPassHash;
    if (newPassword && newPassword.trim()) {
      if (newPassword.length < 4) {
        return { success: false, message: 'New password must be at least 4 characters.' };
      }
      nextPassHash = await sha256(newPassword);
    }

    const updated = {
      ...settings,
      username: trimmedNewUser,
      passwordHash: nextPassHash
    };

    if (settings.id) {
      await db.settings.update(settings.id, {
        username: trimmedNewUser,
        passwordHash: nextPassHash
      });
    } else {
      const id = await db.settings.add(updated);
      updated.id = id;
    }

    setSettings(updated);

    await db.auditLogs.add({
      action: 'CREDENTIALS_CHANGED',
      entityType: 'system',
      details: `Operator credentials updated for username: ${trimmedNewUser}`,
      timestamp: new Date().toISOString()
    });

    return { success: true, message: 'Credentials updated successfully!' };
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
    if (!settings) return;
    const updated = { ...settings, ...newSettings };
    if (settings.id) {
      await db.settings.update(settings.id, updated);
    }
    setSettings(updated);

    await db.auditLogs.add({
      action: 'SETTINGS_UPDATED',
      entityType: 'system',
      details: 'System loan defaults and business parameters updated',
      timestamp: new Date().toISOString()
    });
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
