import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Settings as SettingsIcon,
  User,
  Lock,
  Send,
  Check,
  AlertCircle,
  Copy,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { ButtonLoader } from '../components/ui/Loader';
import { resolveCuratorTelegram } from '../lib/site-defaults';

export const SettingsPage: React.FC = () => {
  const { user, siteSettings, logout, t } = useAuth();

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

  const curatorHandle = resolveCuratorTelegram(siteSettings?.curatorTelegram);

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

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-6">


      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-blue-600 dark:text-sky-400" />
          <span>{t('settingsTitle')}</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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
            <div className="p-2.5 rounded-lg text-sm bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
              <Check className="w-3.5 h-3.5" />
              <span>Профіль успішно оновлено</span>
            </div>
          )}

          {profileError && (
            <div className="p-2.5 rounded-lg text-sm bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-3 text-sm">
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

            <div className="pt-1 flex items-center justify-between text-xs text-slate-500">
              <span>{t('registrationDate')}:</span>
              <strong className="font-mono text-slate-700 dark:text-slate-300">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
              </strong>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60"
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
            <div className="p-2.5 rounded-lg text-sm bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
              <Check className="w-3.5 h-3.5" />
              <span>Пароль успішно змінено!</span>
            </div>
          )}

          {passwordError && (
            <div className="p-2.5 rounded-lg text-sm bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 text-sm">
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
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60"
              >
                {isSavingPassword ? <ButtonLoader label="Збереження..." /> : t('updatePasswordBtn')}
              </button>
            </div>
          </form>
        </div>

        <div className="md:col-span-2 bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Send className="w-4 h-4 text-blue-600 dark:text-sky-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('supportSection')}
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg leading-relaxed">
              {t('supportText')}
            </p>

            <div className="grid w-full grid-cols-2 gap-2 sm:w-[min(100%,22rem)] sm:shrink-0">
              <div className="flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2 font-mono text-sm font-bold text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-400">
                <span className="truncate">{curatorHandle}</span>
                <button
                  type="button"
                  onClick={handleCopyCurator}
                  className="shrink-0 p-1 transition-colors hover:text-slate-900 dark:hover:text-white"
                  title={t('copyTelegram')}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              <a
                href={`https://t.me/${curatorHandle.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <span>Telegram</span>
                <ExternalLink className="h-4 w-4 shrink-0" />
              </a>
            </div>
          </div>
        </div>


        <div className="md:col-span-2 pt-2 flex justify-end">
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-semibold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 dark:border-rose-900/60 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('logout')}</span>
          </button>
        </div>

      </div>

    </div>
  );
};
