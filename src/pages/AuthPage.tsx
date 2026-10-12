import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  User,
  Send,
  AlertCircle,
  ArrowRight,
  Sun,
  Moon,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ButtonLoader } from '../components/ui/Loader';
import { Language } from '../types';
import { layoutShellClass } from '../lib/layout-shell';

export const AuthPage: React.FC = () => {
  const { login, register, siteSettings, theme, setTheme, language, setLanguage, t } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [nickname, setNickname] = useState('');
  const [telegram, setTelegram] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const curator = siteSettings?.curatorTelegram || '@Chromatik';

  useEffect(() => {
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [mode]);

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, text: '' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score: 1, label: language === 'en' ? 'Weak' : language === 'ru' ? 'Слабый' : 'Слабкий', color: 'bg-rose-500' };
    if (score <= 3) return { score: 2, label: language === 'en' ? 'Moderate' : language === 'ru' ? 'Средний' : 'Середній', color: 'bg-amber-500' };
    return { score: 3, label: language === 'en' ? 'Strong' : language === 'ru' ? 'Надёжный' : 'Надійний', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!nickname.trim() || !password) {
          throw new Error(language === 'en' ? 'Please fill in all fields' : language === 'ru' ? 'Заполните все поля' : 'Будь ласка, заповніть усі поля');
        }
        await login(nickname.trim(), password);
      } else {
        if (!nickname.trim() || !telegram.trim() || !password || !confirmPassword) {
          throw new Error(language === 'en' ? 'Please fill in all fields' : language === 'ru' ? 'Заполните все поля' : 'Заповніть усі обов’язкові поля');
        }
        if (password !== confirmPassword) {
          throw new Error(language === 'en' ? 'Passwords do not match' : language === 'ru' ? 'Пароли не совпадают' : 'Паролі не співпадають');
        }
        if (password.length < 6) {
          throw new Error(language === 'en' ? 'Password must be at least 6 characters' : language === 'ru' ? 'Пароль должен быть не менее 6 символов' : 'Пароль має містити щонайменше 6 символів');
        }
        await register(nickname.trim(), telegram.trim(), password, confirmPassword);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  const languages: { code: Language; label: string }[] = [
    { code: 'uk', label: 'УКР' },
    { code: 'ru', label: 'РУС' },
    { code: 'en', label: 'ENG' },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between transition-colors bg-slate-50 dark:bg-[#0a0f1d] text-slate-900 dark:text-slate-100">


      <div className={`${layoutShellClass} py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm shadow-sm shadow-blue-500/20">
            P2P
          </div>
          <span className="font-extrabold text-lg tracking-tight">P2P Calculator</span>
        </div>

        <div className="flex items-center gap-2">

          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700/60 shadow-xs">
            {languages.map(l => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`px-2 py-1 text-sm font-semibold rounded ${
                  language === l.code
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>


          <button
            onClick={() => setTheme(theme === 'navy' ? 'light' : 'navy')}
            className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 shadow-xs"
            title="Toggle theme"
          >
            {theme === 'navy' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>


      <div className="w-full max-w-md mx-auto px-4 py-8">
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm p-5 sm:p-6">


          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {mode === 'login' ? t('loginTitle') : t('registerTitle')}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {mode === 'login' ? t('loginSubtitle') : t('registerSubtitle')}
            </p>
          </div>


          <div className="flex p-1 mb-6 rounded-xl bg-slate-100 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200 dark:bg-slate-600 dark:text-white dark:ring-slate-500/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('signInBtn')}
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200 dark:bg-slate-600 dark:text-white dark:ring-slate-500/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t('signUpBtn')}
            </button>
          </div>


          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm flex items-start gap-2.5 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}


          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('nickname')}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  required
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder={t('nicknamePlaceholder')}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-0 transition-colors"
                />
              </div>
            </div>


            {mode === 'register' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('telegram')}
                </label>
                <div className="relative">
                  <Send className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={telegram}
                    onChange={e => setTelegram(e.target.value)}
                    placeholder={t('telegramPlaceholder')}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white focus:outline-hidden focus:ring-0 transition-colors"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {language === 'en' ? 'Format: @username for curator support' : language === 'ru' ? 'Формат: @username для связи с куратором' : 'Формат: @username для зв’язку з куратором'}
                </p>
              </div>
            )}


            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  name="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                  className={`auth-password-field w-full pl-9 pr-10 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-0 transition-colors${showPassword ? '' : ' auth-password-mask'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>


              {mode === 'register' && password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      {language === 'en' ? 'Password strength:' : language === 'ru' ? 'Надёжность пароля:' : 'Надійність пароля:'}
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300`}
                      style={{ width: `${(strength.score / 3) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>


            {mode === 'register' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('confirmPassword')}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    name="confirm-password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder={t('confirmPasswordPlaceholder')}
                    className={`auth-password-field w-full pl-9 pr-10 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-0 transition-colors${showConfirmPassword ? '' : ' auth-password-mask'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showConfirmPassword ? t('hidePassword') : t('showPassword')}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}


            {mode === 'login' && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-sm text-blue-600 dark:text-sky-400 hover:underline font-medium"
                >
                  {t('forgotPassword')}
                </button>
              </div>
            )}


            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <ButtonLoader label={language === 'en' ? 'Processing...' : language === 'ru' ? 'Обработка...' : 'Обробка...'} />
              ) : (
                <>
                  <span>{mode === 'login' ? t('signInBtn') : t('signUpBtn')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>
      </div>


      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-sky-950/40 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('forgotPasswordModalTitle')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('appName')}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {t('forgotPasswordModalText', { curator })}
            </p>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-sm">
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Telegram куратора:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-sky-400 text-sm select-all">
                {curator}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                {t('close')}
              </button>
              <a
                href={`https://t.me/${curator.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('contactCuratorBtn')}</span>
              </a>
            </div>
          </div>
        </div>
      )}


      <footer className="w-full text-center py-4 text-sm text-slate-400 dark:text-slate-600">
        © 2026 P2P Calculator. All rights reserved.
      </footer>

    </div>
  );
};
