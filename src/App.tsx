import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { CalculatorPage } from './pages/CalculatorPage';
import { BanksPage } from './pages/BanksPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';
import { PageLoader } from './components/ui/Loader';
import { layoutShellClass } from './lib/layout-shell';

function AppContent() {
  const { user, isLoading, siteSettings } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0a0f1d] text-slate-900 dark:text-slate-100 transition-colors">


      <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />


      <main className={`flex-1 py-6 sm:py-8 ${layoutShellClass}`}>
        {currentTab === 'dashboard' && (
          <DashboardPage onNavigateToCalculator={() => setCurrentTab('calculator')} />
        )}
        {currentTab === 'calculator' && (
          <CalculatorPage onTradeSaved={() => {}} />
        )}
        {currentTab === 'banks' && (
          <BanksPage />
        )}
        {currentTab === 'history' && (
          <HistoryPage />
        )}
        {currentTab === 'settings' && (
          <SettingsPage />
        )}
        {currentTab === 'admin' && user.role === 'admin' && (
          <AdminPage />
        )}
      </main>


      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-4 text-center text-xs text-slate-400 dark:text-slate-600">
        <div className={`${layoutShellClass} flex flex-col sm:flex-row items-center justify-between gap-2`}>
          <span>© 2026 {siteSettings?.siteName || 'P2P Calculator'}. Всі права захищено.</span>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Куратор: <strong className="text-blue-600 dark:text-sky-400">{siteSettings?.curatorTelegram || '@Chromatik'}</strong></span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
