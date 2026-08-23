import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { seedInitialData } from './db/seedData';
import { checkAndUpdateLoanStatusesAndAlerts } from './services/notificationService';
import { Customer, Loan } from './types';
import { AuthProvider } from './context/AuthContext';

// Layout
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { WelcomeLanding } from './components/auth/WelcomeLanding';
import { LoginModal } from './components/auth/LoginModal';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { useAuth } from './context/AuthContext';

// Modals
import { AddCustomerModal } from './components/customers/AddCustomerModal';
import { CustomerProfileModal } from './components/customers/CustomerProfileModal';
import { CreateLoanModal } from './components/loans/CreateLoanModal';
import { LoanDetailModal } from './components/loans/LoanDetailModal';
import { RecordPaymentModal } from './components/payments/RecordPaymentModal';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { Loans } from './pages/Loans';
import { Payments } from './pages/Payments';
import { Notifications } from './pages/Notifications';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [navHistory, setNavHistory] = useState<string[]>(['dashboard']);
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Modal States
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  
  const [selectedProfileCustomer, setSelectedProfileCustomer] = useState<Customer | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  const [isCreateLoanOpen, setIsCreateLoanOpen] = useState<boolean>(false);
  const [loanTargetCustomerId, setLoanTargetCustomerId] = useState<string | undefined>(undefined);

  const [selectedDetailLoan, setSelectedDetailLoan] = useState<Loan | null>(null);
  const [isLoanDetailOpen, setIsLoanDetailOpen] = useState<boolean>(false);

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState<boolean>(false);
  const [paymentLoanId, setPaymentLoanId] = useState<string | undefined>(undefined);
  const [paymentInstallmentId, setPaymentInstallmentId] = useState<number | undefined>(undefined);

  const [loanInitialFilter, setLoanInitialFilter] = useState<string>('all');

  // Reactive Data from IndexedDB
  const customers = useLiveQuery(() => db.customers.toArray(), []) || [];
  const loans = useLiveQuery(() => db.loans.toArray(), []) || [];
  const schedules = useLiveQuery(() => db.repaymentSchedules.toArray(), []) || [];
  const payments = useLiveQuery(() => db.payments.toArray(), []) || [];
  const notifications = useLiveQuery(() => db.notifications.toArray(), []) || [];
  const auditLogs = useLiveQuery(() => db.auditLogs.orderBy('id').reverse().toArray(), []) || [];

  // Seed on startup & run status checks
  useEffect(() => {
    async function init() {
      await seedInitialData();
      await checkAndUpdateLoanStatusesAndAlerts();
    }
    init();
  }, []);

  // Back Navigation Handler
  const handleGoBack = () => {
    // 1. Close any open modals first
    if (isSearchOpen) { setIsSearchOpen(false); return; }
    if (isProfileOpen) { setIsProfileOpen(false); return; }
    if (isLoanDetailOpen) { setIsLoanDetailOpen(false); return; }
    if (isAddCustomerOpen) { setIsAddCustomerOpen(false); return; }
    if (isCreateLoanOpen) { setIsCreateLoanOpen(false); return; }
    if (isRecordPaymentOpen) { setIsRecordPaymentOpen(false); return; }

    // 2. Pop from nav history
    if (navHistory.length > 1) {
      const updated = [...navHistory];
      updated.pop(); // remove current
      const prev = updated[updated.length - 1];
      setNavHistory(updated);
      setActiveTab(prev);
    } else {
      setActiveTab('dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Forward Navigation Handler
  const handleNavigate = (tab: string, extra?: any) => {
    if (tab === 'loans' && extra?.filter) {
      setLoanInitialFilter(extra.filter);
    }
    setNavHistory(prev => (prev[prev.length - 1] !== tab ? [...prev, tab] : prev));
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenNewLoan = (customerId?: string) => {
    setLoanTargetCustomerId(customerId);
    setIsCreateLoanOpen(true);
  };

  const handleOpenRecordPayment = (loanId?: string, installmentId?: number) => {
    setPaymentLoanId(loanId);
    setPaymentInstallmentId(installmentId);
    setIsRecordPaymentOpen(true);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedProfileCustomer(customer);
    setIsProfileOpen(true);
  };

  const handleSelectLoan = (loan: Loan) => {
    setSelectedDetailLoan(loan);
    setIsLoanDetailOpen(true);
  };

  const canGoBack = activeTab !== 'dashboard' || isSearchOpen || isProfileOpen || isLoanDetailOpen || isAddCustomerOpen || isCreateLoanOpen || isRecordPaymentOpen;
  const overdueCount = loans.filter(l => l.status === 'overdue').length;

  const { isAuthenticated, isLocked, showLanding, setShowLanding } = useAuth();

  // 1. Show Welcome Page on startup
  if (showLanding && (!isAuthenticated || isLocked)) {
    return <WelcomeLanding onGetStarted={() => setShowLanding(false)} />;
  }

  // 2. Show Username & Password Login Screen if not authenticated
  if (isLocked || !isAuthenticated) {
    return <LoginModal />;
  }

  return (
    <div className={`min-h-screen bg-slate-100 flex justify-center selection:bg-brand-500 selection:text-white ${
      isMobileFrame ? 'p-4 sm:p-8 items-center bg-slate-900' : ''
    }`}>
      
      {/* Mobile Frame Container */}
      <div className={`w-full bg-slate-50 flex flex-col relative transition-all duration-300 ${
        isMobileFrame 
          ? 'max-w-[420px] h-[860px] rounded-[48px] shadow-2xl border-[10px] border-slate-800 overflow-hidden ring-1 ring-slate-700' 
          : 'max-w-md min-h-screen shadow-mobile'
      }`}>
        
        {/* Top Header with Back Arrow */}
        <Header
          activeTab={activeTab}
          onNavigate={handleNavigate}
          canGoBack={canGoBack}
          onGoBack={handleGoBack}
          unreadNotifications={notifications}
          isMobileFrame={isMobileFrame}
          onToggleFrame={() => setIsMobileFrame(!isMobileFrame)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        {/* Dynamic Tab Body Content */}
        <main className="flex-1 px-4 pt-4 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              customers={customers}
              loans={loans}
              schedules={schedules}
              payments={payments}
              notifications={notifications}
              onNavigate={handleNavigate}
              onOpenNewCustomer={() => {
                setEditingCustomer(undefined);
                setIsAddCustomerOpen(true);
              }}
              onOpenNewLoan={handleOpenNewLoan}
              onOpenRecordPayment={handleOpenRecordPayment}
              onSelectCustomer={handleSelectCustomer}
              onSelectLoan={handleSelectLoan}
            />
          )}

          {activeTab === 'customers' && (
            <Customers
              customers={customers}
              loans={loans}
              onSelectCustomer={handleSelectCustomer}
              onOpenAddCustomer={() => {
                setEditingCustomer(undefined);
                setIsAddCustomerOpen(true);
              }}
            />
          )}

          {activeTab === 'loans' && (
            <Loans
              loans={loans}
              customers={customers}
              schedules={schedules}
              initialFilter={loanInitialFilter}
              onSelectLoan={handleSelectLoan}
              onOpenNewLoan={() => handleOpenNewLoan()}
              onOpenRecordPayment={handleOpenRecordPayment}
            />
          )}

          {activeTab === 'payments' && (
            <Payments
              payments={payments}
              loans={loans}
              customers={customers}
              onOpenRecordPayment={() => handleOpenRecordPayment()}
            />
          )}

          {activeTab === 'notifications' && (
            <Notifications
              notifications={notifications}
              loans={loans}
              customers={customers}
              onNavigate={handleNavigate}
              onOpenRecordPayment={handleOpenRecordPayment}
            />
          )}

          {activeTab === 'more' && (
            <div className="space-y-4 pb-24 animate-fade-in">
              <div className="flex gap-2 p-1 bg-slate-200/80 rounded-2xl">
                <button
                  onClick={() => setActiveTab('reports')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-white text-navy-950 shadow-sm border border-slate-200"
                >
                  Reports & Analytics
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black text-slate-700 hover:text-navy-950"
                >
                  Settings & Security
                </button>
              </div>
              <Reports
                customers={customers}
                loans={loans}
                payments={payments}
                schedules={schedules}
              />
            </div>
          )}

          {activeTab === 'reports' && (
            <Reports
              customers={customers}
              loans={loans}
              payments={payments}
              schedules={schedules}
            />
          )}

          {activeTab === 'settings' && (
            <Settings
              auditLogs={auditLogs}
              onDataReset={() => {
                setActiveTab('dashboard');
              }}
            />
          )}
        </main>

        {/* Bottom Navigation */}
        <BottomNav
          activeTab={activeTab === 'reports' || activeTab === 'settings' ? 'more' : activeTab}
          onNavigate={handleNavigate}
          overdueCount={overdueCount}
        />

        {/* Global Fast Search Modal */}
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          customers={customers}
          loans={loans}
          onSelectCustomer={handleSelectCustomer}
          onSelectLoan={handleSelectLoan}
        />

        {/* Add / Edit Customer Modal */}
        <AddCustomerModal
          isOpen={isAddCustomerOpen}
          onClose={() => {
            setIsAddCustomerOpen(false);
            setEditingCustomer(undefined);
          }}
          existingCustomer={editingCustomer}
          onCustomerCreated={(c) => {
            handleSelectCustomer(c);
          }}
        />

        {/* Customer Profile Dossier Modal */}
        <CustomerProfileModal
          customer={selectedProfileCustomer}
          loans={loans}
          schedules={schedules}
          payments={payments}
          isOpen={isProfileOpen}
          onClose={() => {
            setIsProfileOpen(false);
            setSelectedProfileCustomer(null);
          }}
          onOpenNewLoan={(cId) => {
            setIsProfileOpen(false);
            handleOpenNewLoan(cId);
          }}
          onOpenRecordPayment={(lId) => {
            setIsProfileOpen(false);
            handleOpenRecordPayment(lId);
          }}
          onEditCustomer={(c) => {
            setIsProfileOpen(false);
            setEditingCustomer(c);
            setIsAddCustomerOpen(true);
          }}
          onSelectLoan={(l) => {
            setIsProfileOpen(false);
            handleSelectLoan(l);
          }}
        />

        {/* Create Loan Modal */}
        <CreateLoanModal
          isOpen={isCreateLoanOpen}
          onClose={() => {
            setIsCreateLoanOpen(false);
            setLoanTargetCustomerId(undefined);
          }}
          customers={customers}
          preselectedCustomerId={loanTargetCustomerId}
          onLoanCreated={(newLoan) => {
            handleSelectLoan(newLoan);
          }}
        />

        {/* Loan Details & Schedule Modal */}
        <LoanDetailModal
          loan={selectedDetailLoan}
          customer={customers.find(c => c.customerId === selectedDetailLoan?.customerId)}
          schedules={schedules}
          payments={payments}
          isOpen={isLoanDetailOpen}
          onClose={() => {
            setIsLoanDetailOpen(false);
            setSelectedDetailLoan(null);
          }}
          onOpenRecordPayment={(lId, sId) => {
            setIsLoanDetailOpen(false);
            handleOpenRecordPayment(lId, sId);
          }}
        />

        {/* Record Payment Modal */}
        <RecordPaymentModal
          isOpen={isRecordPaymentOpen}
          onClose={() => {
            setIsRecordPaymentOpen(false);
            setPaymentLoanId(undefined);
            setPaymentInstallmentId(undefined);
          }}
          loans={loans}
          customers={customers}
          schedules={schedules}
          preselectedLoanId={paymentLoanId}
          preselectedInstallmentId={paymentInstallmentId}
          onPaymentSuccess={() => {
            // Live queries automatically refresh state
          }}
        />

      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
