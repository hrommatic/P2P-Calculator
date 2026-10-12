import React, { Suspense, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CatalogProvider } from './context/CatalogContext';
import { Navbar } from './components/layout/Navbar';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { CalculatorPage } from './pages/CalculatorPage';
import { BanksPage } from './pages/BanksPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { PageLoader } from './components/ui/Loader';
import { layoutShellClass } from './lib/layout-shell';

const AdminPage = React.lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })),
);

type AppTab =
  | 'dashboard'
  | 'calculator'
  | 'banks'
  | 'history'
  | 'settings'
  | 'admin';

function AppContent() {
  const { user, isLoading, siteSettings } = useAuth();
  const [currentTab, setCurrentTab] = useState<AppTab>('dashboard');
  const [mountedTabs, setMountedTabs] = useState<Record<AppTab, boolean>>({
    dashboard: true,
    calculator: false,
    banks: false,
    history: false,
    settings: false,
    admin: false,
  });

  useEffect(() => {
    setMountedTabs((prev) =>
      prev[currentTab] ? prev : { ...prev, [currentTab]: true },
    );
  }, [currentTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0f1d]">
        <PageLoader label="Завантаження P2P Calculator..." />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const panelClass = (tab: AppTab) =>
    currentTab === tab ? 'block' : 'hidden';

  return (
    <CatalogProvider>
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0a0f1d] text-slate-900 dark:text-slate-100 transition-colors">


      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab as AppTab)}
      />


      <main className={`flex-1 py-6 sm:py-8 ${layoutShellClass}`}>
        {mountedTabs.dashboard && (
          <div className={panelClass('dashboard')}>
            <DashboardPage onNavigateToCalculator={() => setCurrentTab('calculator')} />
          </div>
        )}
        {mountedTabs.calculator && (
          <div className={panelClass('calculator')}>
            <CalculatorPage onTradeSaved={() => {}} />
          </div>
        )}
        {mountedTabs.banks && (
          <div className={panelClass('banks')}>
            <BanksPage />
          </div>
        )}
        {mountedTabs.history && (
          <div className={panelClass('history')}>
            <HistoryPage />
          </div>
        )}
        {mountedTabs.settings && (
          <div className={panelClass('settings')}>
            <SettingsPage />
          </div>
        )}
        {user.role === 'admin' && mountedTabs.admin && (
          <div className={panelClass('admin')}>
            <Suspense fallback={<PageLoader label="Завантаження адмін-панелі..." />}>
              <AdminPage />
            </Suspense>
          </div>
        )}
      </main>


      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-4 text-center text-sm text-slate-400 dark:text-slate-600">
        <div className={`${layoutShellClass} flex flex-col sm:flex-row items-center justify-between gap-2`}>
          <span>© 2026 {siteSettings?.siteName || 'P2P Calculator'}. Всі права захищено.</span>
          <div className="flex items-center gap-3 text-xs">
            <span>Куратор: <strong className="text-blue-600 dark:text-sky-400">{siteSettings?.curatorTelegram || '@Chromatik'}</strong></span>
          </div>
        </div>
      </footer>

    </div>
    </CatalogProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
