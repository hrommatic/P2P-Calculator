import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Calculator,
  LayoutDashboard,
  Building2,
  History,
  Settings,
  ShieldCheck,
  LogOut,
  Moon,
  Sun,
  Globe,
  Menu,
  X,
  User as UserIcon,
} from 'lucide-react';
import { Language } from '../../types';
import { layoutShellClass } from '../../lib/layout-shell';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab }) => {
  const { user, siteSettings, theme, setTheme, language, setLanguage, logout, t } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: t('navDashboard'), icon: LayoutDashboard },
    { id: 'calculator', label: t('navCalculator'), icon: Calculator },
    { id: 'banks', label: t('navBanks'), icon: Building2 },
    { id: 'history', label: t('navHistory'), icon: History },
    { id: 'settings', label: t('navSettings'), icon: Settings },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'admin', label: t('navAdmin'), icon: ShieldCheck });
  }

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    setMobileMenuOpen(false);
  };

  const toggleTheme = () => {
    setTheme(theme === 'navy' ? 'light' : 'navy');
  };

  const languages: { code: Language; label: string }[] = [
    { code: 'uk', label: 'УКР' },
    { code: 'ru', label: 'РУС' },
    { code: 'en', label: 'ENG' },
  ];

  const brandName = siteSettings?.siteName || 'P2P Calculator';

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors border-slate-200/80 bg-white/90 dark:border-slate-800/90 dark:bg-[#0a0f1d]/90">
      <div className={layoutShellClass}>
        <div className="flex items-center justify-between h-16 gap-4">


          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center gap-2.5 text-left text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm shadow-sm shadow-blue-500/20">
                P2P
              </div>
              <span className="font-extrabold">{brandName}</span>
            </button>
          </div>


          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-blue-600 bg-blue-50/80 dark:text-sky-400 dark:bg-sky-950/40 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>


          <div className="flex items-center gap-2 shrink-0">

            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700 transition-colors shrink-0"
                title="Change language"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="uppercase">{language}</span>
              </button>

              {langMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
                  <div className="absolute right-0 mt-1.5 w-28 py-1 rounded-lg shadow-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] z-50">
                    {languages.map(l => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setLanguage(l.code);
                          setLangMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors ${
                          language === l.code
                            ? 'text-blue-600 dark:text-sky-400 bg-blue-50 dark:bg-sky-950/30'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>


            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700 transition-colors shrink-0"
              title={theme === 'navy' ? t('themeLight') : t('themeNavy')}
            >
              {theme === 'navy' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>


            {user && (
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {user.nickname}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {user.telegram}
                  </span>
                </div>
                <button
                  onClick={() => handleNavClick('settings')}
                  className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:ring-2 hover:ring-blue-500 transition-all"
                  title={t('navSettings')}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}


            <button
              onClick={logout}
              className="p-2 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors shrink-0"
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>


            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>


      {mobileMenuOpen && (
        <div
          className={`md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0a0f1d]/95 backdrop-blur-md pt-3 pb-5 space-y-1 ${layoutShellClass}`}
        >
          {user && (
            <div className="px-3 py-2 mb-2 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{user.nickname}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user.telegram}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {user.role}
              </span>
            </div>
          )}

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600 bg-blue-50 dark:text-sky-400 dark:bg-sky-950/40 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
