import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db';
import { SystemSettings } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  isLocked: boolean;
  operatorName: string;
  settings: SystemSettings | null;
  verifyPin: (pin: string) => Promise<boolean>;
  changePin: (currentPin: string, newPin: string) => Promise<{ success: boolean; message: string }>;
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
  // Always lock initially so operator must authenticate with PIN before access
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Load Settings from Dexie
  const loadSettings = async () => {
    try {
      const list = await db.settings.toArray();
      if (list.length > 0) {
        setSettings(list[0]);
      } else {
        // Initialize default settings with hash of '1234'
        const initialHash = await sha256('1234');
        const defaultSettings: SystemSettings = {
          operatorName: 'Loan Operator',
          businessName: 'B-F-L Micro Credit',
          businessPhone: '+233 24 412 3456',
          businessAddress: 'Accra, Ghana',
          defaultInterestRate: 10,
          defaultInterestType: 'flat',
          defaultFrequency: 'weekly',
          defaultDurationValue: 8,
          defaultDurationUnit: 'weeks',
          enablePenalties: true,
          defaultPenaltyRate: 2.5,
          gracePeriodDays: 2,
          autoLockMinutes: 5,
          biometricEnabled: false,
          pinHash: initialHash,
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

  const verifyPin = async (pin: string): Promise<boolean> => {
    // 1. If custom pinHash is configured, ONLY verify against that hash!
    if (settings && settings.pinHash) {
      const enteredHash = await sha256(pin);
      if (enteredHash === settings.pinHash) {
        setIsAuthenticated(true);
        setIsLocked(false);
        setLastActivity(Date.now());
        return true;
      }
      return false;
    }

    // 2. Default PIN '1234' only if no hash exists yet
    if (pin === '1234') {
      setIsAuthenticated(true);
      setIsLocked(false);
      setLastActivity(Date.now());
      return true;
    }

    // 3. Strict Denial on wrong PIN
    return false;
  };

  const changePin = async (currentPin: string, newPin: string): Promise<{ success: boolean; message: string }> => {
    if (!settings) return { success: false, message: 'Settings not loaded' };
    
    // Check if entered currentPin matches stored pinHash
    let isCurrentValid = false;
    if (settings.pinHash) {
      const enteredCurrentHash = await sha256(currentPin);
      isCurrentValid = enteredCurrentHash === settings.pinHash;
    } else {
      isCurrentValid = currentPin === '1234';
    }

    if (!isCurrentValid) {
      return { success: false, message: 'Current PIN is incorrect.' };
    }

    if (newPin.length < 4) {
      return { success: false, message: 'New PIN must be at least 4 digits.' };
    }

    const newHash = await sha256(newPin);
    const updated = { ...settings, pinHash: newHash };
    
    if (settings.id) {
      await db.settings.update(settings.id, { pinHash: newHash });
    } else {
      const id = await db.settings.add(updated);
      updated.id = id;
    }

    setSettings(updated);

    await db.auditLogs.add({
      action: 'PIN_CHANGED',
      entityType: 'system',
      details: 'Operator security PIN was successfully updated',
      timestamp: new Date().toISOString()
    });

    return { success: true, message: 'PIN updated successfully. Default PIN is now disabled.' };
  };

  const lockSession = () => {
    setIsLocked(true);
  };

  const unlockSession = () => {
    setIsLocked(false);
    setLastActivity(Date.now());
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsLocked(true);
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
        operatorName: settings?.businessName || 'Loan Operator',
        settings,
        verifyPin,
        changePin,
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
