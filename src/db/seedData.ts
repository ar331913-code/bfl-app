import { db } from './index';
import { Customer, Loan, RepaymentSchedule, Payment, SystemSettings } from '../types';
import { format, subDays, addDays } from 'date-fns';

export async function seedInitialData(force = false): Promise<void> {
  const customerCount = await db.customers.count();
  if (customerCount > 0 && !force) {
    return;
  }

  // Clear if force seeding
  if (force) {
    await db.resetAllData();
  }

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // 1. Initial System Settings
  const defaultSettings: SystemSettings = {
    operatorName: 'Kwame Mensah',
    businessName: 'B-F-L Micro Credit',
    businessPhone: '+233 24 412 3456',
    businessAddress: 'Plot 14, Commercial Lane, Circle, Accra',
    defaultInterestRate: 10,
    defaultInterestType: 'flat',
    defaultFrequency: 'weekly',
    defaultDurationValue: 8,
    defaultDurationUnit: 'weeks',
    enablePenalties: true,
    defaultPenaltyRate: 2, // 2% per overdue installment
    gracePeriodDays: 2,
    autoLockMinutes: 5,
    biometricEnabled: false,
    pinHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // SHA-256 for '1234'
    salt: 'bfl_salt_2026',
    smsReminderTemplate: 'Hello {name}, your B-F-L loan installment of GH₵{amount} is due on {date}. Kindly remit via MoMo or cash.'
  };

  const existingSettings = await db.settings.count();
  if (existingSettings === 0) {
    await db.settings.add(defaultSettings);
  }

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
    },
    {
      customerId: 'BFL-00003',
      fullName: 'Yaw Osei Prempeh',
      dateOfBirth: '1992-03-08',
      gender: 'male',
      customerType: 'driver',
      primaryPhone: '0277334455',
      residentialAddress: 'Teshie Bush Road, Accra',
      workAddress: 'Osu Oxford Street Taxi Rank',
      ghanaCardNumber: 'GHA-930182746-5',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
      driverDetails: {
        vehicleType: 'Taxi (Hyundai i10)',
        registrationNumber: 'GS 1284-22',
        licenseNumber: 'DL-2018-TMA-4421',
        stationLocation: 'Osu Taxi Station'
      },
      emergencyContact: {
        name: 'Grace Osei',
        relationship: 'Mother',
        phone: '0277889900'
      },
      status: 'active',
      notes: 'Operates night shift taxi around Osu / Labone.',
      createdAt: format(subDays(today, 30), 'yyyy-MM-dd HH:mm:ss'),
      updatedAt: format(subDays(today, 30), 'yyyy-MM-dd HH:mm:ss')
    },
    {
      customerId: 'BFL-00004',
      fullName: 'Fatima Yakubu',
      dateOfBirth: '1987-08-19',
      gender: 'female',
      customerType: 'trader',
      primaryPhone: '0265443322',
      residentialAddress: 'Nima High Street, Accra',
      workAddress: 'Agbogbloshie Market, Vegetable Shed 4',
      ghanaCardNumber: 'GHA-647382910-1',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
      traderDetails: {
        businessName: 'Fatima Fresh Onions & Tomatoes',
        businessType: 'Perishable Produce Wholesale',
        marketLocation: 'Agbogbloshie Market',
        stallNumber: 'Shed 4, Bay 12',
        description: 'Bulk purchase of onions and tomatoes from Techiman and Navrongo.'
      },
      emergencyContact: {
        name: 'Alhassan Yakubu',
        relationship: 'Uncle',
        phone: '0244001122'
      },
      status: 'active',
      notes: 'Quick 2-week turnover cycles.',
      createdAt: format(subDays(today, 20), 'yyyy-MM-dd HH:mm:ss'),
      updatedAt: format(subDays(today, 20), 'yyyy-MM-dd HH:mm:ss')
    },
    {
      customerId: 'BFL-00005',
      fullName: 'Kwame Asante',
      dateOfBirth: '1979-01-15',
      gender: 'male',
      customerType: 'driver',
      primaryPhone: '0243990011',
      residentialAddress: 'Achimota Mile 7, Accra',
      workAddress: 'Achimota New Transport Terminal',
      ghanaCardNumber: 'GHA-554433221-8',
      photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
      driverDetails: {
        vehicleType: 'Sprinter Bus (Mercedes Benz 207D)',
        registrationNumber: 'GE 7719-19',
        licenseNumber: 'DL-2009-KSI-1149',
        stationLocation: 'Achimota - Kumasi Highway Service'
      },
      emergencyContact: {
        name: 'Mercy Asante',
        relationship: 'Wife',
        phone: '0243556677'
      },
      status: 'active',
      notes: 'Intercity bus driver. Excellent repayment record.',
      createdAt: format(subDays(today, 90), 'yyyy-MM-dd HH:mm:ss'),
      updatedAt: format(subDays(today, 90), 'yyyy-MM-dd HH:mm:ss')
    }
  ];

  await db.customers.bulkAdd(customers);

  // 3. Realistic Loans with Schedules & Payments
  // Loan 1: Active Loan for Kofi Boateng (GH₵4,000, 10% flat, 8 weekly installments)
  const loan1StartDate = format(subDays(today, 28), 'yyyy-MM-dd');
  const loan1: Loan = {
    loanId: 'LN-00001',
    customerId: 'BFL-00001',
    customerName: 'Kofi Emmanuel Boateng',
    customerType: 'driver',
    principalAmount: 4000,
    interestRate: 10,
    interestType: 'flat',
    durationValue: 8,
    durationUnit: 'weeks',
    repaymentFrequency: 'weekly',
    startDate: loan1StartDate,
    firstRepaymentDate: format(subDays(today, 21), 'yyyy-MM-dd'),
    maturityDate: format(addDays(new Date(loan1StartDate), 56), 'yyyy-MM-dd'),
    totalInterest: 400,
    processingFee: 100,
    totalRepayment: 4500,
    installmentAmount: 562.50,
    totalInstallments: 8,
    totalPaid: 1687.50, // 3 installments paid
    outstandingBalance: 2812.50,
    penaltyRate: 2,
    totalPenalties: 0,
    status: 'active',
    notes: 'Engine overhaul loan. Weekly payment on Mondays.',
    createdAt: format(subDays(today, 28), 'yyyy-MM-dd HH:mm:ss'),
    updatedAt: format(subDays(today, 7), 'yyyy-MM-dd HH:mm:ss')
  };

  // Loan 2: Loan for Akosua Mansa (GH₵6,000, 12% flat, 6 biweekly installments) - DUE TODAY!
  const loan2StartDate = format(subDays(today, 28), 'yyyy-MM-dd');
  const loan2: Loan = {
    loanId: 'LN-00002',
    customerId: 'BFL-00002',
    customerName: 'Akosua Mansa Darko',
    customerType: 'trader',
    principalAmount: 6000,
    interestRate: 12,
    interestType: 'flat',
    durationValue: 12,
    durationUnit: 'weeks',
    repaymentFrequency: 'biweekly',
    startDate: loan2StartDate,
    firstRepaymentDate: format(subDays(today, 14), 'yyyy-MM-dd'),
    maturityDate: format(addDays(new Date(loan2StartDate), 84), 'yyyy-MM-dd'),
    totalInterest: 720,
    processingFee: 150,
    totalRepayment: 6870,
    installmentAmount: 1145.00,
    totalInstallments: 6,
    totalPaid: 1145.00, // 1st paid, 2nd DUE TODAY!
    outstandingBalance: 5725.00,
    penaltyRate: 2,
    totalPenalties: 0,
    status: 'due_today',
    notes: 'Stock purchase for holiday season.',
    createdAt: format(subDays(today, 28), 'yyyy-MM-dd HH:mm:ss'),
    updatedAt: todayStr
  };

  // Loan 3: Loan for Yaw Osei (GH₵2,500) - OVERDUE!
  const loan3StartDate = format(subDays(today, 35), 'yyyy-MM-dd');
  const loan3: Loan = {
    loanId: 'LN-00003',
    customerId: 'BFL-00003',
    customerName: 'Yaw Osei Prempeh',
    customerType: 'driver',
    principalAmount: 2500,
    interestRate: 10,
    interestType: 'flat',
    durationValue: 5,
    durationUnit: 'weeks',
    repaymentFrequency: 'weekly',
    startDate: loan3StartDate,
    firstRepaymentDate: format(subDays(today, 28), 'yyyy-MM-dd'),
    maturityDate: format(addDays(new Date(loan3StartDate), 35), 'yyyy-MM-dd'),
    totalInterest: 250,
    processingFee: 50,
    totalRepayment: 2800,
    installmentAmount: 560.00,
    totalInstallments: 5,
    totalPaid: 1120.00, // Paid 2, 3rd was overdue 7 days ago
    outstandingBalance: 1680.00,
    penaltyRate: 2,
    totalPenalties: 22.40,
    status: 'overdue',
    notes: 'Taxi battery and brake disk replacements. Missed week 3 payment.',
    createdAt: format(subDays(today, 35), 'yyyy-MM-dd HH:mm:ss'),
    updatedAt: todayStr
  };

  // Loan 4: Completed Loan for Kwame Asante (GH₵5,000)
  const loan4StartDate = format(subDays(today, 80), 'yyyy-MM-dd');
  const loan4: Loan = {
    loanId: 'LN-00004',
    customerId: 'BFL-00005',
    customerName: 'Kwame Asante',
    customerType: 'driver',
    principalAmount: 5000,
    interestRate: 10,
    interestType: 'flat',
    durationValue: 8,
    durationUnit: 'weeks',
    repaymentFrequency: 'weekly',
    startDate: loan4StartDate,
    firstRepaymentDate: format(subDays(today, 73), 'yyyy-MM-dd'),
    maturityDate: format(subDays(today, 17), 'yyyy-MM-dd'),
    totalInterest: 500,
    processingFee: 100,
    totalRepayment: 5600,
    installmentAmount: 700.00,
    totalInstallments: 8,
    totalPaid: 5600.00,
    outstandingBalance: 0,
    penaltyRate: 0,
    totalPenalties: 0,
    status: 'completed',
    notes: 'Bus insurance & roadworthy renewal. Completed ahead of schedule.',
    createdAt: format(subDays(today, 80), 'yyyy-MM-dd HH:mm:ss'),
    updatedAt: format(subDays(today, 17), 'yyyy-MM-dd HH:mm:ss')
  };

  await db.loans.bulkAdd([loan1, loan2, loan3, loan4]);

  // 4. Generate Repayment Schedules for Loan 1
  const schedules: RepaymentSchedule[] = [];
  for (let i = 1; i <= 8; i++) {
    const dueDate = format(addDays(subDays(today, 21), (i - 1) * 7), 'yyyy-MM-dd');
    let status: RepaymentSchedule['status'] = 'upcoming';
    let amountPaid = 0;
    let remainingBalance = 562.50;

    if (i <= 3) {
      status = 'paid';
      amountPaid = 562.50;
      remainingBalance = 0;
    } else if (i === 4) {
      status = 'upcoming'; // Next week
    }

    schedules.push({
      loanId: 'LN-00001',
      customerId: 'BFL-00001',
      installmentNumber: i,
      dueDate,
      expectedAmount: 562.50,
      principalComponent: 500,
      interestComponent: 50,
      amountPaid,
      remainingBalance,
      status,
      lastPaymentDate: i <= 3 ? dueDate : undefined,
      penaltyAmount: 0
    });
  }

  // Schedules for Loan 2 (Installment 2 is DUE TODAY)
  for (let i = 1; i <= 6; i++) {
    const dueDate = format(addDays(subDays(today, 14), (i - 1) * 14), 'yyyy-MM-dd');
    let status: RepaymentSchedule['status'] = 'upcoming';
    let amountPaid = 0;
    let remainingBalance = 1145.00;

    if (i === 1) {
      status = 'paid';
      amountPaid = 1145.00;
      remainingBalance = 0;
    } else if (i === 2) {
      status = 'due_today';
    }

    schedules.push({
      loanId: 'LN-00002',
      customerId: 'BFL-00002',
      installmentNumber: i,
      dueDate,
      expectedAmount: 1145.00,
      principalComponent: 1000,
      interestComponent: 120,
      amountPaid,
      remainingBalance,
      status,
      lastPaymentDate: i === 1 ? dueDate : undefined,
      penaltyAmount: 0
    });
  }

  // Schedules for Loan 3 (Installment 3 is OVERDUE)
  for (let i = 1; i <= 5; i++) {
    const dueDate = format(addDays(subDays(today, 28), (i - 1) * 7), 'yyyy-MM-dd');
    let status: RepaymentSchedule['status'] = 'upcoming';
    let amountPaid = 0;
    let remainingBalance = 560.00;
    let penalty = 0;

    if (i <= 2) {
      status = 'paid';
      amountPaid = 560.00;
      remainingBalance = 0;
    } else if (i === 3) {
      status = 'overdue';
      penalty = 11.20;
    }

    schedules.push({
      loanId: 'LN-00003',
      customerId: 'BFL-00003',
      installmentNumber: i,
      dueDate,
      expectedAmount: 560.00,
      principalComponent: 500,
      interestComponent: 50,
      amountPaid,
      remainingBalance,
      status,
      lastPaymentDate: i <= 2 ? dueDate : undefined,
      penaltyAmount: penalty
    });
  }

  await db.repaymentSchedules.bulkAdd(schedules);

  // 5. Payment Records
  const payments: Payment[] = [
    {
      paymentId: 'RCP-00001',
      loanId: 'LN-00001',
      customerId: 'BFL-00001',
      amountPaid: 562.50,
      paymentDate: format(subDays(today, 21), 'yyyy-MM-dd 09:30'),
      paymentMethod: 'momo',
      referenceNumber: 'MM-7829104821',
      recordedBy: 'Kwame Mensah',
      notes: 'MTN Mobile Money transfer',
      createdAt: format(subDays(today, 21), 'yyyy-MM-dd 09:30:00')
    },
    {
      paymentId: 'RCP-00002',
      loanId: 'LN-00001',
      customerId: 'BFL-00001',
      amountPaid: 562.50,
      paymentDate: format(subDays(today, 14), 'yyyy-MM-dd 11:15'),
      paymentMethod: 'cash',
      referenceNumber: 'CSH-00214',
      recordedBy: 'Kwame Mensah',
      notes: 'Paid at Circle station kiosk',
      createdAt: format(subDays(today, 14), 'yyyy-MM-dd 11:15:00')
    },
    {
      paymentId: 'RCP-00003',
      loanId: 'LN-00001',
      customerId: 'BFL-00001',
      amountPaid: 562.50,
      paymentDate: format(subDays(today, 7), 'yyyy-MM-dd 14:00'),
      paymentMethod: 'momo',
      referenceNumber: 'MM-9938172645',
      recordedBy: 'Kwame Mensah',
      notes: 'Telecel Cash transfer',
      createdAt: format(subDays(today, 7), 'yyyy-MM-dd 14:00:00')
    },
    {
      paymentId: 'RCP-00004',
      loanId: 'LN-00002',
      customerId: 'BFL-00002',
      amountPaid: 1145.00,
      paymentDate: format(subDays(today, 14), 'yyyy-MM-dd 16:45'),
      paymentMethod: 'momo',
      referenceNumber: 'MM-1122334455',
      recordedBy: 'Kwame Mensah',
      notes: 'First installment paid on time',
      createdAt: format(subDays(today, 14), 'yyyy-MM-dd 16:45:00')
    }
  ];

  await db.payments.bulkAdd(payments);

  // 6. Notifications
  await db.notifications.bulkAdd([
    {
      type: 'due_today',
      title: 'Payment Due Today: Akosua Mansa Darko',
      message: 'GH₵1,145.00 due today for Loan LN-00002 (Makola fabric trader).',
      customerId: 'BFL-00002',
      loanId: 'LN-00002',
      isRead: false,
      createdAt: todayStr
    },
    {
      type: 'overdue',
      title: 'Overdue Alert: Yaw Osei Prempeh',
      message: 'Loan LN-00003 installment 3 (GH₵560.00) is 7 days overdue.',
      customerId: 'BFL-00003',
      loanId: 'LN-00003',
      isRead: false,
      createdAt: format(subDays(today, 7), 'yyyy-MM-dd')
    },
    {
      type: 'loan_completed',
      title: 'Loan Completed: Kwame Asante',
      message: 'Loan LN-00004 of GH₵5,600.00 fully settled with excellent score.',
      customerId: 'BFL-00005',
      loanId: 'LN-00004',
      isRead: true,
      createdAt: format(subDays(today, 17), 'yyyy-MM-dd')
    }
  ]);

  // 7. Audit Log
  await db.auditLogs.add({
    action: 'SYSTEM_INITIALIZATION',
    entityType: 'system',
    details: 'Initial B-F-L database seeded with sample Ghanaian drivers & traders.',
    timestamp: new Date().toISOString()
  });

  console.log('B-F-L Database successfully populated with initial sample records.');
}
