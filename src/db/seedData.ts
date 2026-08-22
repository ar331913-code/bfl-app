import { db } from './index';
import { Customer, Loan, RepaymentSchedule, Payment, SystemSettings } from '../types';
import { format, subDays, addDays } from 'date-fns';

export async function initDefaultSettings(): Promise<void> {
  const existingSettings = await db.settings.count();
  if (existingSettings === 0) {
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
      pinHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // SHA-256 for '1234'
      salt: 'bfl_salt_2026',
      smsReminderTemplate: 'Hello {name}, your B-F-L loan installment of GH₵{amount} is due on {date}. Kindly remit via MoMo or cash.'
    };
    await db.settings.add(defaultSettings);
  }
}

export async function seedInitialData(force = false): Promise<void> {
  await initDefaultSettings();

  // If force is not explicitly requested, keep the database fresh with zero records
  if (!force) {
    return;
  }

  // Clear if force seeding
  await db.resetAllData();

  const today = new Date();

  // 2. Realistic Ghanaian Customers (Drivers and Traders)
  const customers: Customer[] = [
    {
      customerId: 'BFL-00001',
      fullName: 'Kofi Emmanuel Boateng',
      dateOfBirth: '1984-05-14',
      gender: 'male',
      customerType: 'driver',
      primaryPhone: '0244112233',
      secondaryPhone: '0555998877',
      residentialAddress: 'House No. 24, Kaneshie West, Accra',
      workAddress: 'Circle Station, VIP Terminal, Accra',
      ghanaCardNumber: 'GHA-718293041-9',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      driverDetails: {
        vehicleType: 'Trotro (Toyota HiAce 15-seater)',
        registrationNumber: 'GT 4920-21',
        licenseNumber: 'DL-2015-ACC-9842',
        stationLocation: 'Kaneshie - Kwame Nkrumah Circle Route'
      },
      emergencyContact: {
        name: 'Abena Serwaa Boateng',
        relationship: 'Spouse',
        phone: '0244998877'
      },
      status: 'active',
      notes: 'Reliable trotro driver for 10+ years. High daily turnover.',
      createdAt: format(subDays(today, 60), 'yyyy-MM-dd HH:mm:ss'),
      updatedAt: format(subDays(today, 60), 'yyyy-MM-dd HH:mm:ss')
    },
    {
      customerId: 'BFL-00002',
      fullName: 'Akosua Mansa Darko',
      dateOfBirth: '1990-11-23',
      gender: 'female',
      customerType: 'trader',
      primaryPhone: '0541234567',
      secondaryPhone: '0207654321',
      residentialAddress: 'Block C, Madina Firestone, Accra',
      workAddress: 'Makola Market No. 2, Wholesale Fabric Alley, Accra',
      ghanaCardNumber: 'GHA-829103847-2',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      traderDetails: {
        businessName: 'Mansa Dutch Wax & GTP Wholesale',
        businessType: 'Textiles & Wax Prints',
        marketLocation: 'Makola Market, Central Accra',
        stallNumber: 'Shop D-14',
        description: 'Imports and retails original Holland wax and GTP prints.'
      },
      emergencyContact: {
        name: 'Kwabena Darko',
        relationship: 'Brother',
        phone: '0208112233'
      },
      status: 'active',
      notes: 'Strong weekly cashflow. Never missed a weekly schedule.',
      createdAt: format(subDays(today, 45), 'yyyy-MM-dd HH:mm:ss'),
      updatedAt: format(subDays(today, 45), 'yyyy-MM-dd HH:mm:ss')
    }
  ];

  await db.customers.bulkAdd(customers);
}
