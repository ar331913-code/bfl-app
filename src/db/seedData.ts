import { db } from './index';
import { Customer, Loan, RepaymentSchedule, Payment, SystemSettings } from '../types';
import { format, subDays, addDays } from 'date-fns';

export async function initDefaultSettings(): Promise<void> {
  const existingSettings = await db.settings.count();
  if (existingSettings === 0) {
    const defaultSettings: SystemSettings = {
      operatorName: 'Loan Administrator',
      businessName: 'B-F-L Micro Credit',
      businessPhone: '+233 24 412 3456',
      businessAddress: 'Accra, Ghana',
      username: 'admin',
      passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // SHA-256 for 'admin123'
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
    await db.settings.add(defaultSettings);
  }
}

export async function seedInitialData(force = false): Promise<void> {
  await initDefaultSettings();

  const customerCount = await db.customers.count();
  if (customerCount > 0 && !force) {
    return; // Already populated
  }

  if (force) {
    await db.resetAllData();
    await initDefaultSettings();
  }

  const today = new Date();

  // 1. Realistic Ghanaian Customers (Drivers and Traders with Photos)
  const customers: Customer[] = [
    {
      customerId: 'BFL-00001',
      fullName: 'Kofi Emmanuel Boateng',
      dateOfBirth: '1984-05-14',
      gender: 'male',
      customerType: 'driver',
      primaryPhone: '0244112233',
      secondaryPhone: '0555998877',
      momoNumber: '0244112233',
      momoName: 'Kofi Emmanuel Boateng',
      momoNetwork: 'MTN',
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
      notes: 'Reliable trotro driver for 10+ years. Steady daily cash turnover.',
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
      momoNumber: '0541234567',
      momoName: 'Akosua Mansa Darko',
      momoNetwork: 'MTN',
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
    },
    {
      customerId: 'BFL-00003',
      fullName: 'Kwame Yaw Mensah',
      dateOfBirth: '1979-02-18',
      gender: 'male',
      customerType: 'driver',
      primaryPhone: '0209876543',
      momoNumber: '0243110099',
      momoName: 'Kwame Yaw Mensah',
      momoNetwork: 'MTN',
      residentialAddress: 'Plot 12, Ashaiman Middle East',
      workAddress: 'Tema Station / Accra Central Taxi Rank',
      ghanaCardNumber: 'GHA-629183740-1',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
      driverDetails: {
        vehicleType: 'Taxi (Hyundai i10)',
        registrationNumber: 'GS 3102-19',
        licenseNumber: 'DL-2012-TEM-5510',
        stationLocation: 'Tema Community 1 - Accra Station'
      },
      emergencyContact: {
        name: 'Yaa Mensah',
        relationship: 'Sister',
        phone: '0243110099'
      },
      status: 'active',
      notes: 'Completed previous loan with 100% on-time repayment record.',
      createdAt: format(subDays(today, 90), 'yyyy-MM-dd HH:mm:ss'),
      updatedAt: format(subDays(today, 10), 'yyyy-MM-dd HH:mm:ss')
    },
    {
      customerId: 'BFL-00004',
      fullName: 'Grace Serwaa Osei',
      dateOfBirth: '1987-08-09',
      gender: 'female',
      customerType: 'trader',
      primaryPhone: '0277889900',
      momoNumber: '0555223344',
      momoName: 'Grace Serwaa Osei',
      momoNetwork: 'MTN',
      residentialAddress: 'House 88, Kasoa New Market',
      workAddress: 'Kaneshie Market Complex Floor 1, Accra',
      ghanaCardNumber: 'GHA-901827364-5',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
      traderDetails: {
        businessName: 'Grace Organic Cereals & Rice Bags',
        businessType: 'Grain & Cereals Wholesale',
        marketLocation: 'Kaneshie Market Complex',
        stallNumber: 'Stand K-09'
      },
      emergencyContact: {
        name: 'Samuel Osei',
        relationship: 'Uncle',
        phone: '0555223344'
      },
      status: 'active',
      notes: 'High volume wholesale distributor.',
      createdAt: format(subDays(today, 30), 'yyyy-MM-dd HH:mm:ss'),
      updatedAt: format(subDays(today, 30), 'yyyy-MM-dd HH:mm:ss')
    },
    {
      customerId: 'BFL-00005',
      fullName: 'Ibrahim Salifu',
      dateOfBirth: '1993-04-12',
      gender: 'male',
      customerType: 'driver',
      primaryPhone: '0501122334',
      momoNumber: '0501122334',
      momoName: 'Ibrahim Salifu',
      momoNetwork: 'Telecel',
      residentialAddress: 'Nima Roundabout, House 42, Accra',
      workAddress: 'Airport & Ridge Business District Route',
      ghanaCardNumber: 'GHA-510293847-3',
      photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
      driverDetails: {
        vehicleType: 'Ride-Hail / Taxi (Toyota Yaris)',
        registrationNumber: 'GW 8820-22',
        licenseNumber: 'DL-2018-ACC-4491',
        stationLocation: 'Ridge - Airport City Route'
      },
      emergencyContact: {
        name: 'Fatima Salifu',
        relationship: 'Mother',
        phone: '0244667788'
      },
      status: 'active',
      notes: 'Clean driving record and steady corporate ride clientele.',
      createdAt: format(subDays(today, 15), 'yyyy-MM-dd HH:mm:ss'),
      updatedAt: format(subDays(today, 15), 'yyyy-MM-dd HH:mm:ss')
    }
  ];

  await db.customers.bulkAdd(customers);

  // 2. Active, Completed & Overdue Loans
  const loans: Loan[] = [
    {
      loanId: 'LN-2026-0001',
      customerId: 'BFL-00001',
      customerName: 'Kofi Emmanuel Boateng',
      principalAmount: 3000,
      interestRate: 10,
      interestType: 'flat',
      totalInterest: 300,
      processingFee: 60,
      totalRepayment: 3300,
      repaymentFrequency: 'weekly',
      durationValue: 6,
      durationUnit: 'weeks',
      startDate: format(subDays(today, 21), 'yyyy-MM-dd'),
      firstRepaymentDate: format(subDays(today, 14), 'yyyy-MM-dd'),
      maturityDate: format(addDays(today, 21), 'yyyy-MM-dd'),
      installmentAmount: 550,
      totalInstallments: 6,
      totalPaid: 1100,
      outstandingBalance: 2200,
      penaltyRate: 2.5,
      totalPenalties: 0,
      status: 'active',
      disbursementMethod: 'momo',
      momoRecipientPhone: '0244112233',
      momoRecipientName: 'Kofi Emmanuel Boateng',
      momoNetwork: 'MTN',
      momoTransactionId: 'MTN-GH-829104-3321',
      momoTransferStatus: 'success',
      momoDisbursedAt: format(subDays(today, 21), 'yyyy-MM-dd HH:mm:ss'),
      notes: 'Vehicle engine maintenance loan. 2 weekly installments paid on time.',
      createdAt: format(subDays(today, 21), 'yyyy-MM-dd HH:mm:ss'),
      updatedAt: format(subDays(today, 7), 'yyyy-MM-dd HH:mm:ss')
    },
    {
      loanId: 'LN-2026-0002',
      customerId: 'BFL-00002',
      customerName: 'Akosua Mansa Darko',
      principalAmount: 5000,
      interestRate: 8,
      interestType: 'flat',
      totalInterest: 400,
      processingFee: 100,
      totalRepayment: 5400,
      repaymentFrequency: 'weekly',
      durationValue: 8,
      durationUnit: 'weeks',
      startDate: format(subDays(today, 28), 'yyyy-MM-dd'),
      firstRepaymentDate: format(subDays(today, 21), 'yyyy-MM-dd'),
      maturityDate: format(addDays(today, 28), 'yyyy-MM-dd'),
      installmentAmount: 675,
      totalInstallments: 8,
      totalPaid: 2025,
      outstandingBalance: 3375,
      penaltyRate: 2.5,
      totalPenalties: 0,
      status: 'active',
      disbursementMethod: 'momo',
      momoRecipientPhone: '0541234567',
      momoRecipientName: 'Akosua Mansa Darko',
      momoNetwork: 'MTN',
      momoTransactionId: 'MTN-GH-718293-1940',
      momoTransferStatus: 'success',
      momoDisbursedAt: format(subDays(today, 28), 'yyyy-MM-dd HH:mm:ss'),
      notes: 'Makola fabric stock expansion. 3 installments paid consistently.',
      createdAt: format(subDays(today, 28), 'yyyy-MM-dd HH:mm:ss'),
      updatedAt: format(subDays(today, 7), 'yyyy-MM-dd HH:mm:ss')
    },
    {
      loanId: 'LN-2026-0003',
      customerId: 'BFL-00003',
      customerName: 'Kwame Yaw Mensah',
      principalAmount: 2000,
      interestRate: 10,
      interestType: 'flat',
      totalInterest: 200,
      processingFee: 40,
      totalRepayment: 2200,
      repaymentFrequency: 'weekly',
      durationValue: 4,
      durationUnit: 'weeks',
      startDate: format(subDays(today, 40), 'yyyy-MM-dd'),
      firstRepaymentDate: format(subDays(today, 33), 'yyyy-MM-dd'),
      maturityDate: format(subDays(today, 12), 'yyyy-MM-dd'),
      installmentAmount: 550,
      totalInstallments: 4,
      totalPaid: 2200,
      outstandingBalance: 0,
      penaltyRate: 2.5,
      totalPenalties: 0,
      status: 'completed',
      disbursementMethod: 'cash',
      notes: 'Full repayment completed ahead of schedule.',
      createdAt: format(subDays(today, 40), 'yyyy-MM-dd HH:mm:ss'),
      updatedAt: format(subDays(today, 12), 'yyyy-MM-dd HH:mm:ss')
    },
    {
      loanId: 'LN-2026-0004',
      customerId: 'BFL-00004',
      customerName: 'Grace Serwaa Osei',
      principalAmount: 4000,
      interestRate: 10,
      interestType: 'flat',
      totalInterest: 400,
      processingFee: 80,
      totalRepayment: 4400,
      repaymentFrequency: 'weekly',
      durationValue: 4,
      durationUnit: 'weeks',
      startDate: format(subDays(today, 25), 'yyyy-MM-dd'),
      firstRepaymentDate: format(subDays(today, 18), 'yyyy-MM-dd'),
      maturityDate: format(addDays(today, 3), 'yyyy-MM-dd'),
      installmentAmount: 1100,
      totalInstallments: 4,
      totalPaid: 0,
      outstandingBalance: 4455,
      penaltyRate: 2.5,
      totalPenalties: 55,
      status: 'overdue',
      disbursementMethod: 'momo',
      momoRecipientPhone: '0555223344',
      momoRecipientName: 'Grace Serwaa Osei',
      momoNetwork: 'MTN',
      momoTransactionId: 'MTN-GH-991823-7741',
      momoTransferStatus: 'success',
      momoDisbursedAt: format(subDays(today, 25), 'yyyy-MM-dd HH:mm:ss'),
      notes: 'Missed installments due to goods delayed at port. Late penalty fee applied.',
      createdAt: format(subDays(today, 25), 'yyyy-MM-dd HH:mm:ss'),
      updatedAt: format(today, 'yyyy-MM-dd HH:mm:ss')
    }
  ];

  await db.loans.bulkAdd(loans);

  // 3. Repayment Schedules for LN-2026-0001
  const schedules: RepaymentSchedule[] = [
    {
      loanId: 'LN-2026-0001',
      customerId: 'BFL-00001',
      installmentNumber: 1,
      dueDate: format(subDays(today, 14), 'yyyy-MM-dd'),
      expectedAmount: 550,
      principalComponent: 500,
      interestComponent: 50,
      amountPaid: 550,
      remainingBalance: 0,
      status: 'paid',
      lastPaymentDate: format(subDays(today, 14), 'yyyy-MM-dd'),
      penaltyAmount: 0
    },
    {
      loanId: 'LN-2026-0001',
      customerId: 'BFL-00001',
      installmentNumber: 2,
      dueDate: format(subDays(today, 7), 'yyyy-MM-dd'),
      expectedAmount: 550,
      principalComponent: 500,
      interestComponent: 50,
      amountPaid: 550,
      remainingBalance: 0,
      status: 'paid',
      lastPaymentDate: format(subDays(today, 7), 'yyyy-MM-dd'),
      penaltyAmount: 0
    },
    {
      loanId: 'LN-2026-0001',
      customerId: 'BFL-00001',
      installmentNumber: 3,
      dueDate: format(today, 'yyyy-MM-dd'),
      expectedAmount: 550,
      principalComponent: 500,
      interestComponent: 50,
      amountPaid: 0,
      remainingBalance: 550,
      status: 'due_today',
      penaltyAmount: 0
    },
    {
      loanId: 'LN-2026-0001',
      customerId: 'BFL-00001',
      installmentNumber: 4,
      dueDate: format(addDays(today, 7), 'yyyy-MM-dd'),
      expectedAmount: 550,
      principalComponent: 500,
      interestComponent: 50,
      amountPaid: 0,
      remainingBalance: 550,
      status: 'upcoming',
      penaltyAmount: 0
    },
    {
      loanId: 'LN-2026-0001',
      customerId: 'BFL-00001',
      installmentNumber: 5,
      dueDate: format(addDays(today, 14), 'yyyy-MM-dd'),
      expectedAmount: 550,
      principalComponent: 500,
      interestComponent: 50,
      amountPaid: 0,
      remainingBalance: 550,
      status: 'upcoming',
      penaltyAmount: 0
    },
    {
      loanId: 'LN-2026-0001',
      customerId: 'BFL-00001',
      installmentNumber: 6,
      dueDate: format(addDays(today, 21), 'yyyy-MM-dd'),
      expectedAmount: 550,
      principalComponent: 500,
      interestComponent: 50,
      amountPaid: 0,
      remainingBalance: 550,
      status: 'upcoming',
      penaltyAmount: 0
    }
  ];

  await db.repaymentSchedules.bulkAdd(schedules);

  // 4. Sample Payments
  const payments: Payment[] = [
    {
      paymentId: 'RCP-00001',
      loanId: 'LN-2026-0001',
      customerId: 'BFL-00001',
      amountPaid: 550,
      paymentDate: format(subDays(today, 14), 'yyyy-MM-dd HH:mm:ss'),
      paymentMethod: 'momo',
      referenceNumber: 'MM-984123-GH',
      notes: 'MTN Mobile Money collection',
      recordedBy: 'Administrator',
      createdAt: format(subDays(today, 14), 'yyyy-MM-dd HH:mm:ss')
    },
    {
      paymentId: 'RCP-00002',
      loanId: 'LN-2026-0001',
      customerId: 'BFL-00001',
      amountPaid: 550,
      paymentDate: format(subDays(today, 7), 'yyyy-MM-dd HH:mm:ss'),
      paymentMethod: 'cash',
      referenceNumber: 'CSH-00214',
      notes: 'Cash collected at Circle Station',
      recordedBy: 'Administrator',
      createdAt: format(subDays(today, 7), 'yyyy-MM-dd HH:mm:ss')
    }
  ];

  await db.payments.bulkAdd(payments);

  // 5. Initial Audit Log
  await db.auditLogs.add({
    action: 'SYSTEM_INITIALIZED',
    entityType: 'system',
    details: 'System database initialized with Ghanaian microloan portfolio demo records.',
    timestamp: new Date().toISOString()
  });
}
