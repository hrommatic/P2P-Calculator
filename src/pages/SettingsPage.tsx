import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Settings as SettingsIcon,
  User,
  Lock,
  Palette,
  Globe,
  Send,
  Check,
  AlertCircle,
  Copy,
  ExternalLink,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { ButtonLoader } from '../components/ui/Loader';
import { Language, ThemeMode } from '../types';

export const SettingsPage: React.FC = () => {
  const { user, siteSettings, theme, setTheme, language, setLanguage, logout, t } = useAuth();

  const [telegram, setTelegram] = useState(user?.telegram || '');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const curatorHandle = siteSettings?.curatorTelegram || '@Chromatik';

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfile) return;
    setProfileError(null);
    setProfileSuccess(false);
    setIsSavingProfile(true);

    try {
      await api.updateProfile({ telegram });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Помилка оновлення профілю');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingPassword) return;
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('Новий пароль має бути щонайменше 6 символів');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Нові паролі не співпадають');
      return;
    }

    setIsSavingPassword(true);
    try {
      await api.changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Не вдалося змінити пароль');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleCopyCurator = () => {
    navigator.clipboard.writeText(curatorHandle);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const languages: { code: Language; title: string; desc: string }[] = [
    { code: 'uk', title: 'Українська', desc: 'Основна мова платформи' },
    { code: 'ru', title: 'Русский', desc: 'Интерфейс на русском языке' },
    { code: 'en', title: 'English', desc: 'English interface & tools' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">


      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-blue-600 dark:text-sky-400" />
          <span>{t('settingsTitle')}</span>
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Керування параметрами особистого кабінету, безпекою та зовнішнім виглядом
        </p>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <User className="w-4 h-4 text-blue-600 dark:text-sky-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('profileSection')}
            </h2>
          </div>

          {profileSuccess && (
            <div className="p-2.5 rounded-lg text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
              <Check className="w-3.5 h-3.5" />
              <span>Профіль успішно оновлено</span>
            </div>
          )}

          {profileError && (
            <div className="p-2.5 rounded-lg text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                {t('nickname')}
              </label>
              <input
                type="text"
                disabled
                value={user?.nickname || ''}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-500 cursor-not-allowed font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                {t('telegram')}
              </label>
              <input
                type="text"
                required
                value={telegram}
                onChange={e => setTelegram(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>{t('registrationDate')}:</span>
              <strong className="font-mono text-slate-700 dark:text-slate-300">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
              </strong>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60"
              >
                {isSavingProfile ? <ButtonLoader label="Збереження..." /> : 'Зберегти Telegram'}
              </button>
            </div>
          </form>
        </div>


        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Lock className="w-4 h-4 text-blue-600 dark:text-sky-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('changePasswordSection')}
            </h2>
          </div>

          {passwordSuccess && (
            <div className="p-2.5 rounded-lg text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
              <Check className="w-3.5 h-3.5" />
              <span>Пароль успішно змінено!</span>
            </div>
          )}

          {passwordError && (
            <div className="p-2.5 rounded-lg text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                {t('currentPassword')}
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                {t('newPassword')}
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                {t('confirmNewPassword')}
              </label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingPassword}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60"
              >
                {isSavingPassword ? <ButtonLoader label="Збереження..." /> : t('updatePasswordBtn')}
              </button>
            </div>
          </form>
        </div>


        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Palette className="w-4 h-4 text-blue-600 dark:text-sky-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('themeSection')}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">

            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                theme === 'light'
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{t('themeLight')}</p>
                <p className="text-[11px] text-slate-500">Світлий фон, контрастні картки</p>
              </div>
            </button>


            <button
              type="button"
              onClick={() => setTheme('navy')}
              className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                theme === 'navy'
                  ? 'border-sky-500 bg-sky-950/40 ring-2 ring-sky-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <Moon className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{t('themeNavy')}</p>
                <p className="text-[11px] text-slate-500">Глибокий темно-синій колір</p>
              </div>
            </button>
          </div>
        </div>


        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Globe className="w-4 h-4 text-blue-600 dark:text-sky-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('languageSection')}
            </h2>
          </div>

          <div className="space-y-2">
            {languages.map(l => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                  language === l.code
                    ? 'border-blue-600 bg-blue-50/60 dark:bg-sky-950/30 dark:border-sky-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {l.title}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {l.desc}
                  </span>
                </div>
                {language === l.code && <Check className="w-4 h-4 text-blue-600 dark:text-sky-400" />}
              </button>
            ))}
          </div>
        </div>


        <div className="md:col-span-2 bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Send className="w-4 h-4 text-blue-600 dark:text-sky-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('supportSection')}
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg leading-relaxed">
              {t('supportText')}
            </p>

            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-blue-600 dark:text-sky-400 flex items-center gap-2">
                <span>{curatorHandle}</span>
                <button
                  onClick={handleCopyCurator}
                  className="p-1 hover:text-slate-900 dark:hover:text-white transition-colors"
                  title={t('copyTelegram')}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <a
                href={`https://t.me/${curatorHandle.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5"
              >
                <span>{t('openInTelegram')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>


        <div className="md:col-span-2 pt-2 flex justify-end">
          <button
            onClick={logout}
            className="px-4 py-2 text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 dark:border-rose-900/60 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('logout')}</span>
          </button>
        </div>

      </div>

    </div>
  );
};
