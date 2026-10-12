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
import { layoutShellClass, pageContentClass } from './lib/layout-shell';

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

  useEffect(() => {
    document.getElementById('app-main')?.scrollTo(0, 0);
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
    <div className="flex h-dvh max-h-dvh max-w-[100vw] flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0f1d] text-slate-900 dark:text-slate-100 transition-colors">


      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab as AppTab)}
      />


      <main
        id="app-main"
        className={`flex-1 min-h-0 min-w-0 w-full overflow-x-hidden overflow-y-auto overscroll-y-contain ${
          currentTab === 'calculator' ? 'pt-3 pb-6 sm:pt-4 sm:pb-8' : 'py-6 sm:py-8'
        } ${layoutShellClass}`}
      >
        {mountedTabs.dashboard && (
          <div className={`${panelClass('dashboard')} ${pageContentClass}`}>
            <DashboardPage onNavigateToCalculator={() => setCurrentTab('calculator')} />
          </div>
        )}
        {mountedTabs.calculator && (
          <div className={`${panelClass('calculator')} ${pageContentClass}`}>
            <CalculatorPage onTradeSaved={() => {}} />
          </div>
        )}
        {mountedTabs.banks && (
          <div className={`${panelClass('banks')} ${pageContentClass}`}>
            <BanksPage />
          </div>
        )}
        {mountedTabs.history && (
          <div className={`${panelClass('history')} ${pageContentClass}`}>
            <HistoryPage />
          </div>
        )}
        {mountedTabs.settings && (
          <div className={`${panelClass('settings')} ${pageContentClass}`}>
            <SettingsPage />
          </div>
        )}
        {user.role === 'admin' && mountedTabs.admin && (
          <div className={`${panelClass('admin')} ${pageContentClass}`}>
            <Suspense fallback={<PageLoader label="Завантаження адмін-панелі..." />}>
              <AdminPage />
            </Suspense>
          </div>
        )}
      </main>


      <footer className="shrink-0 min-w-0 border-t border-slate-200/80 dark:border-slate-800/80 py-4 text-center text-sm text-slate-400 dark:text-slate-600">
        <div className={`${layoutShellClass} flex flex-col sm:flex-row items-center justify-between gap-2 min-w-0`}>
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
