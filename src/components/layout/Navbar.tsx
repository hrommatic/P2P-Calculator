import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  LifeBuoy,
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

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    closeMobileMenu();
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobileMenu();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileMenuOpen]);

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
    <header className="sticky top-0 z-40 w-full min-w-0 border-b backdrop-blur-md transition-colors border-slate-200/80 bg-white/90 dark:border-slate-800/90 dark:bg-[#0a0f1d]/90">
      <div className={layoutShellClass}>
        <div className="flex items-center justify-between h-16 gap-2 min-w-0">


          <div className="flex items-center gap-2 min-w-0 shrink">
            <button
              onClick={() => handleNavClick('dashboard')}
              className="flex items-center gap-2 text-left text-lg font-bold tracking-tight text-slate-900 dark:text-white min-w-0 hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 shrink-0 rounded-lg bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm shadow-sm shadow-blue-500/20">
                P2P
              </div>
              <span className="font-extrabold truncate hidden min-[380px]:inline max-w-[7.5rem] sm:max-w-none sm:whitespace-nowrap">
                {brandName}
              </span>
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
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-800/80 dark:hover:bg-slate-700 transition-colors shrink-0"
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
                        className={`w-full text-left px-3 py-1.5 text-sm font-medium transition-colors ${
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
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {user.nickname}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight">
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


      {mobileMenuOpen &&
        createPortal(
          <div className="md:hidden">
            <button
              type="button"
              className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-[2px] animate-[fadeIn_200ms_ease-out]"
              aria-label="Закрити меню"
              onClick={closeMobileMenu}
            />
            <aside
              className="fixed top-0 right-0 z-[101] flex h-dvh w-[min(88vw,20rem)] flex-col border-l border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0f1419] animate-[slideInRight_250ms_ease-out]"
              role="dialog"
              aria-modal="true"
              aria-label="Меню"
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-extrabold text-white">
                    P2P
                  </div>
                  <span className="truncate text-base font-bold text-slate-900 dark:text-white">
                    {brandName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Закрити меню"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {user && (
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800/80">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {user.nickname}
                    </p>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                      {user.telegram}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {user.role}
                  </span>
                </div>
              )}

              <nav className="flex-1 overflow-y-auto overscroll-y-contain py-2">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-xl px-3 py-3.5 text-[15px] font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 font-semibold text-blue-600 dark:bg-sky-950/50 dark:text-sky-400'
                          : 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0 opacity-90" />
                      <span className="text-left">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="space-y-1 border-t border-slate-200 p-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleNavClick('support')}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors ${
                    currentTab === 'support'
                      ? 'bg-blue-50 font-semibold text-blue-600 dark:bg-sky-950/50 dark:text-sky-400'
                      : 'text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <LifeBuoy className="h-5 w-5 shrink-0 opacity-90" />
                  <span>{t('navSupport')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    logout();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  <span>{t('logout')}</span>
                </button>
              </div>
            </aside>
          </div>,
          document.body,
        )}
    </header>
  );
};
