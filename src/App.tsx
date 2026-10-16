import React, { Suspense, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CatalogProvider, useCatalog } from './context/CatalogContext';
import { TabProvider, type AppTab } from './context/TabContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { prefetchDashboardAndHistory } from './lib/prefetch-app-queries';
import { Navbar } from './components/layout/Navbar';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { CalculatorPage } from './pages/CalculatorPage';
import { BanksPage } from './pages/BanksPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { SupportPage } from './pages/SupportPage';
import { PageLoader } from './components/ui/Loader';
import { layoutShellClass, pageContentClass } from './lib/layout-shell';
import { resolveCuratorTelegram } from './lib/site-defaults';

const AdminPage = React.lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })),
);

function AppContentInner() {
  const { user, isLoading, siteSettings, t } = useAuth();
  const { catalogReady } = useCatalog();
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState<AppTab>('dashboard');
  const [mountedTabs, setMountedTabs] = useState<Record<AppTab, boolean>>({
    dashboard: true,
    calculator: false,
    banks: false,
    history: false,
    settings: false,
    support: false,
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

  useEffect(() => {
    if (!user || !catalogReady) return;
    prefetchDashboardAndHistory(queryClient);
  }, [user?.id, catalogReady, queryClient]);

  const selectTab = (tab: AppTab) => {
    if (tab === 'history' || tab === 'dashboard') {
      prefetchDashboardAndHistory(queryClient);
    }
    setCurrentTab(tab);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0f1d]">
        <PageLoader label={t('loadingApp')} />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const panelClass = (tab: AppTab) =>
    currentTab === tab ? 'block' : 'hidden';

  return (
    <TabProvider tab={currentTab}>
    <div className="flex h-dvh max-h-dvh max-w-[100vw] flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0f1d] text-slate-900 dark:text-slate-100 transition-colors">


      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => selectTab(tab as AppTab)}
      />


      <main
        id="app-main"
        className={`flex-1 min-h-0 min-w-0 w-full overflow-x-hidden overflow-y-auto overscroll-y-contain ${
          currentTab === 'calculator'
            ? 'pt-6 pb-4 sm:pt-8 sm:pb-6 lg:pb-4'
            : currentTab === 'admin'
              ? 'pt-3 pb-6 sm:pt-4 sm:pb-8'
              : 'py-6 sm:py-8'
        } ${layoutShellClass}`}
      >
        {mountedTabs.dashboard && (
          <div className={`${panelClass('dashboard')} ${pageContentClass}`}>
            <DashboardPage onNavigateToCalculator={() => selectTab('calculator')} />
          </div>
        )}
        {mountedTabs.calculator && (
          <div className={`${panelClass('calculator')} ${pageContentClass}`}>
            <CalculatorPage />
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
        {mountedTabs.support && (
          <div className={`${panelClass('support')} ${pageContentClass}`}>
            <SupportPage />
          </div>
        )}
        {user.role === 'admin' && mountedTabs.admin && (
          <div className={`${panelClass('admin')} ${pageContentClass}`}>
            <Suspense fallback={<PageLoader label={t('loadingAdminPanel')} />}>
              <AdminPage />
            </Suspense>
          </div>
        )}
      </main>


      <footer className="shrink-0 min-w-0 border-t border-slate-200/80 dark:border-slate-800/80 py-4 text-center text-sm text-slate-400 dark:text-slate-600">
        <div className={`${layoutShellClass} flex flex-col sm:flex-row items-center justify-between gap-2 min-w-0`}>
          <span>© 2026 {siteSettings?.siteName || 'P2P Calculator'}. {t('footerRightsReserved')}</span>
          <div className="flex items-center gap-3 text-xs">
            <span>{t('footerCurator')} <strong className="text-blue-600 dark:text-sky-400">{resolveCuratorTelegram(siteSettings?.curatorTelegram)}</strong></span>
          </div>
        </div>
      </footer>

    </div>
    </TabProvider>
  );
}

function AppContent() {
  return (
    <CatalogProvider>
      <AppContentInner />
    </CatalogProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}
