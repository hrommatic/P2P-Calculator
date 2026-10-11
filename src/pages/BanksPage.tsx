import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { UserBank, GlobalBank } from '../types';
import {
  Building2,
  Plus,
  Edit2,
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  CreditCard,
} from 'lucide-react';
import { ButtonLoader, PageLoader } from '../components/ui/Loader';
import { BankLogo } from '../components/BankLogo';

export const BanksPage: React.FC = () => {
  const { t } = useAuth();

  const [banks, setBanks] = useState<UserBank[]>([]);
  const [globalBanks, setGlobalBanks] = useState<GlobalBank[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<UserBank | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [globalBankId, setGlobalBankId] = useState('');
  const [turnoverLimit, setTurnoverLimit] = useState('100000');
  const [initialTurnover, setInitialTurnover] = useState('0');
  const [color, setColor] = useState('#2563EB');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Archive Confirm Modal
  const [archiveTarget, setArchiveTarget] = useState<UserBank | null>(null);

  const fetchBanks = async () => {
    setIsLoading(true);
    try {
      const res = await api.getBanks();
      setBanks(res.banks);
      setGlobalBanks(res.globalBanks);
    } catch (err) {
      console.error('Error fetching banks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const handleOpenAddModal = () => {
    setEditingBank(null);
    setName('');
    setGlobalBankId('');
    setTurnoverLimit('100000');
    setInitialTurnover('0');
    setColor('#2563EB');
    setNotes('');
    setFormError(null);
    setIsSaving(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (bank: UserBank) => {
    setEditingBank(bank);
    setName(bank.name);
    setGlobalBankId(bank.globalBankId || '');
    setTurnoverLimit(bank.turnoverLimitUah.toString());
    setInitialTurnover(bank.initialTurnoverUah.toString());
    setColor(bank.color || '#2563EB');
    setNotes(bank.notes || '');
    setFormError(null);
    setIsSaving(false);
    setIsModalOpen(true);
  };

  const handleSelectGlobalTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setGlobalBankId(selectedId);
    const tmpl = globalBanks.find(g => g.id === selectedId);
    if (tmpl) {
      setName(tmpl.name);
      setTurnoverLimit(tmpl.defaultLimitUah.toString());
      setColor(tmpl.color);
    }
  };

  const normalizeBankName = (value: string) => value.trim().toLowerCase();

  const hasDuplicateName = (candidate: string, excludeBankId?: string) =>
    banks.some(
      (b) =>
        b.id !== excludeBankId &&
        normalizeBankName(b.name) === normalizeBankName(candidate),
    );

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Вкажіть назву банку');
      return;
    }

    const limitNum = parseFloat(turnoverLimit);
    if (isNaN(limitNum) || limitNum <= 0) {
      setFormError('Вкажіть коректний ліміт обороту');
      return;
    }

    if (hasDuplicateName(trimmedName, editingBank?.id)) {
      setFormError('Банк з такою назвою вже існує');
      return;
    }

    setIsSaving(true);
    try {
      if (editingBank) {
        await api.updateBank(editingBank.id, {
          name: trimmedName,
          turnoverLimitUah: limitNum,
          initialTurnoverUah: parseFloat(initialTurnover) || 0,
          color,
          notes: notes.trim(),
        });
      } else {
        await api.createBank({
          name: trimmedName,
          globalBankId: globalBankId || undefined,
          turnoverLimitUah: limitNum,
          initialTurnoverUah: parseFloat(initialTurnover) || 0,
          color,
          notes: notes.trim(),
        });
      }

      setIsModalOpen(false);
      fetchBanks();
    } catch (err: any) {
      setFormError(err.message || 'Помилка збереження банку');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await api.deleteBank(archiveTarget.id);
      setArchiveTarget(null);
      fetchBanks();
    } catch (err) {
      console.error('Failed to archive bank:', err);
    }
  };

  const formatUah = (val: number) => {
    return new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-blue-600 dark:text-sky-400" />
            <span>{t('myBanksTitle')}</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('myBanksSubtitle')}
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addBankBtn')}</span>
        </button>
      </div>

      {/* Banks Cards Grid */}
      {isLoading ? (
        <PageLoader label="Завантаження банківських рахунків..." />
      ) : banks.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <CreditCard className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            У вас ще немає доданих банків. Додайте свій перший рахунок, щоб відстежувати ліміти та оборот.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            {t('addBankBtn')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {banks.map(bank => {
            // Limits math: separate flows as explicitly requested in Section 5
            const effectiveUsedBuy = bank.buyTurnoverUah + bank.initialTurnoverUah;
            const availableLimit = Math.max(0, bank.turnoverLimitUah - effectiveUsedBuy);
            const usagePercent = bank.turnoverLimitUah > 0
              ? Math.min(100, Math.round((effectiveUsedBuy / bank.turnoverLimitUah) * 100))
              : 0;

            const isExceeded = effectiveUsedBuy >= bank.turnoverLimitUah;
            const isWarning = usagePercent >= 80 && !isExceeded;

            return (
              <div
                key={bank.id}
                className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-5 shadow-2xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div>
                  {/* Card Top: Bank Icon / Color Pill & Actions */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <BankLogo
                        name={bank.name}
                        color={bank.color}
                        globalBankId={bank.globalBankId}
                        logoSvg={bank.logoSvg}
                        globalBanks={globalBanks}
                      />
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                          {bank.name}
                        </h3>
                        {bank.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {bank.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(bank)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={t('editBank')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setArchiveTarget(bank)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title={t('archiveBank')}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Turnover Limit Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500 dark:text-slate-400">{t('turnoverLimit')}</span>
                      <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                        {formatUah(bank.turnoverLimitUah)} ₴
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isExceeded
                            ? 'bg-rose-500'
                            : isWarning
                            ? 'bg-amber-500'
                            : 'bg-blue-600 dark:bg-sky-500'
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-semibold ${
                        isExceeded ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-500'
                      }`}>
                        {usagePercent}% ({formatUah(effectiveUsedBuy)} ₴)
                      </span>
                      <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        Залишок: <strong className="text-slate-900 dark:text-white">{formatUah(availableLimit)} ₴</strong>
                      </span>
                    </div>
                  </div>

                  {/* Detailed Flows Breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-0.5">
                        <ArrowDownLeft className="w-3 h-3 text-sky-500" />
                        <span>{t('buyTurnover')}</span>
                      </div>
                      <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                        {formatUah(bank.buyTurnoverUah)} ₴
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-0.5">
                        <ArrowUpRight className="w-3 h-3 text-amber-500" />
                        <span>{t('sellTurnover')}</span>
                      </div>
                      <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                        {formatUah(bank.sellTurnoverUah)} ₴
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Net Profit & Trade Count */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span>{t('bankTrades')}:</span>
                    <strong className="font-mono text-slate-900 dark:text-white">{bank.tradesCount}</strong>
                  </div>

                  <div className="flex items-center gap-1 font-mono tabular-nums">
                    <span className="text-slate-500">{t('bankProfit')}:</span>
                    <strong className={`font-bold ${bank.netProfitUah >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {bank.netProfitUah >= 0 ? '+' : ''}{formatUah(bank.netProfitUah)} ₴
                    </strong>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Bank Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingBank ? t('editBank') : t('addBankBtn')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveBank} className="space-y-4 text-xs">
              {!editingBank && globalBanks.length > 0 && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Швидкий шаблон банку
                  </label>
                  <select
                    value={globalBankId}
                    onChange={handleSelectGlobalTemplate}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Оберіть шаблон або введіть свій --</option>
                    {globalBanks.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} (Стандартний ліміт: {formatUah(g.defaultLimitUah)} ₴)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('bankName')} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Наприклад: Monobank (Чорна)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('turnoverLimit')} *
                  </label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={turnoverLimit}
                    onChange={e => setTurnoverLimit(e.target.value)}
                    className="w-full px-3 py-2 font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('initialTurnover')}
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={initialTurnover}
                    onChange={e => setInitialTurnover(e.target.value)}
                    className="w-full px-3 py-2 font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Колір картки
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-9 h-9 p-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-slate-500">{color}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Коментар / Нотатки
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Додаткова інформація"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 disabled:opacity-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? <ButtonLoader label="Збереження..." /> : t('saveBankBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Bank Confirmation Modal */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4 text-center">
            <Archive className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('archiveBank')} «{archiveTarget.name}»?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('archiveBankConfirm')}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setArchiveTarget(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleArchiveConfirm}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
              >
                {t('archiveBank')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
