import React, { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { TRADES_PAGE_SIZE } from '@/shared/trades-pagination';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useCatalog } from '../context/CatalogContext';
import { useCurrentTab } from '../context/TabContext';
import { useInvalidateTrades } from '../hooks/useInvalidateTrades';
import { tradesListKey } from '../lib/trades-query-keys';
import { Trade } from '../types';
import {
  History as HistoryIcon,
  Download,
  Trash2,
  Edit,
  Eye,
  X,
} from 'lucide-react';
import { ButtonLoader, PageLoader } from '../components/ui/Loader';
import { disabledControlClass } from '../lib/disabled-control-class';
import { PeriodFilterBar } from '../components/filters/PeriodFilterBar';
import {
  defaultPeriodFilter,
  periodToQuery,
  type PeriodPreset,
} from '../lib/period-filter';

export const HistoryPage: React.FC = () => {
  const { t, language } = useAuth();
  const currentTab = useCurrentTab();

  const { banks, exchanges, refreshCatalog } = useCatalog();
  const invalidateTrades = useInvalidateTrades();

  const [period, setPeriod] = useState(defaultPeriodFilter);

  const {
    data,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: tradesListKey(period),
    enabled: currentTab === 'history',
    staleTime: 60_000,
    queryFn: ({ pageParam, signal }) =>
      api.getTrades(
        {
          ...periodToQuery(period),
          limit: TRADES_PAGE_SIZE,
          ...(pageParam ? { cursor: pageParam as string } : {}),
        },
        signal,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor
        ? lastPage.nextCursor
        : undefined,
  });

  const trades = data?.pages.flatMap((p) => p.trades) ?? [];
  const isLoading = isPending && trades.length === 0;

  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Trade | null>(null);

  const [editBuyExchange, setEditBuyExchange] = useState('');
  const [editBuyBankId, setEditBuyBankId] = useState('');
  const [editBuyRate, setEditBuyRate] = useState('');
  const [editBuyAmountUah, setEditBuyAmountUah] = useState('');
  const [editBuyCommission, setEditBuyCommission] = useState('0');
  const [editSellExchange, setEditSellExchange] = useState('');
  const [editSellBankId, setEditSellBankId] = useState('');
  const [editSellRate, setEditSellRate] = useState('');
  const [editSellAmountUah, setEditSellAmountUah] = useState('');
  const [editSellCommission, setEditSellCommission] = useState('0');
  const [editExtraExpenses, setEditExtraExpenses] = useState('0');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const tradeActionsBusy = isSavingEdit || isDeleting;

  const loadMoreTrades = () => {
    if (!hasNextPage || isFetchingNextPage || isLoading) return;
    void fetchNextPage();
  };

  const handleOpenEdit = (trade: Trade) => {
    setEditingTrade(trade);
    setEditBuyExchange(trade.buyExchange);
    setEditBuyBankId(trade.buyBankId);
    setEditBuyRate(trade.buyRate.toString());
    setEditBuyAmountUah(trade.buyAmountUah.toString());
    setEditBuyCommission(trade.buyCommission.toString());
    setEditSellExchange(trade.sellExchange);
    setEditSellBankId(trade.sellBankId);
    setEditSellRate(trade.sellRate.toString());
    setEditSellAmountUah(trade.sellAmountUah.toString());
    setEditSellCommission(trade.sellCommission.toString());
    setEditExtraExpenses(trade.extraExpensesUah.toString());
    setEditNotes(trade.notes || '');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrade || isSavingEdit) return;

    setIsSavingEdit(true);
    try {
      await api.updateTrade(editingTrade.id, {
        buyExchange: editBuyExchange,
        buyBankId: editBuyBankId,
        buyRate: parseFloat(editBuyRate),
        buyAmountUah: parseFloat(editBuyAmountUah),
        buyCommission: parseFloat(editBuyCommission) || 0,
        sellExchange: editSellExchange,
        sellBankId: editSellBankId,
        sellRate: parseFloat(editSellRate),
        sellAmountUah: parseFloat(editSellAmountUah) || undefined,
        sellCommission: parseFloat(editSellCommission) || 0,
        extraExpensesUah: parseFloat(editExtraExpenses) || 0,
        notes: editNotes.trim(),
      });
      setEditingTrade(null);
      void refreshCatalog(false);
      invalidateTrades();
    } catch (err: any) {
      setEditError(err.message || 'Помилка оновлення угоди');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || isDeleting || isSavingEdit) return;
    setIsDeleting(true);
    try {
      await api.deleteTrade(deleteTarget.id);
      setDeleteTarget(null);
      void refreshCatalog(false);
      invalidateTrades();
    } catch (err) {
      console.error('Failed to delete trade:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatUah = (val: number) => {
    return new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const presetLabels: Record<PeriodPreset, string> = {
    all: t('filterAll'),
    today: t('filterToday'),
    yesterday: t('filterYesterday'),
    week: t('filterWeek'),
    month: t('filterMonth'),
  };

  return (
    <div className="space-y-6">


      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <HistoryIcon className="w-6 h-6 text-blue-600 dark:text-sky-400" />
            <span>{t('historyTitle')}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('historySubtitle')}
          </p>
        </div>

        <a
          href={api.exportCsvUrl()}
          download
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-slate-700 bg-white dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs transition-colors shrink-0"
        >
          <Download className="w-4 h-4 text-blue-600 dark:text-sky-400" />
          <span>{t('exportCsv')}</span>
        </a>
      </div>


      <PeriodFilterBar value={period} onChange={setPeriod} t={t} presetLabels={presetLabels} />

      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs overflow-hidden">
        {isLoading ? (
          <PageLoader label="Завантаження журналу угод..." />
        ) : trades.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Угод за вказаними фільтрами не знайдено.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4">Дата / Час</th>
                  <th className="py-3 px-4">Покупка</th>
                  <th className="py-3 px-4">Банк покупки</th>
                  <th className="py-3 px-4 text-right">Курс покупки</th>
                  <th className="py-3 px-4 text-right">Сума покупки</th>
                  <th className="py-3 px-4">Продаж</th>
                  <th className="py-3 px-4">Банк продажу</th>
                  <th className="py-3 px-4 text-right">Курс продажу</th>
                  <th className="py-3 px-4 text-right">Сума продажу</th>
                  <th className="py-3 px-4 text-right">Комісії</th>
                  <th className="py-3 px-4 text-right">Чистий прибуток</th>
                  <th className="py-3 px-4 text-right">ROI / Спред</th>
                  <th className="py-3 px-4 text-center">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {trades.map(trade => {
                  const isProfit = trade.netProfitUah >= 0;
                  return (
                    <tr
                      key={trade.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                        {new Date(trade.createdAt).toLocaleDateString('uk-UA', {
                          day: '2-digit',
                          month: '2-digit',
                        })}{' '}
                        {new Date(trade.createdAt).toLocaleTimeString('uk-UA', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {trade.buyExchange}
                      </td>

                      <td className="py-3 px-4">
                        {trade.buyBankName}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {trade.buyRate.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                        {formatUah(trade.buyAmountUah)} ₴
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {trade.sellExchange}
                      </td>

                      <td className="py-3 px-4">
                        {trade.sellBankName}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {trade.sellRate.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                        {formatUah(trade.sellAmountUah)} ₴
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                        {trade.totalCommissionsUah.toFixed(2)} ₴
                      </td>

                      <td className={`py-3 px-4 text-right font-mono tabular-nums font-bold ${
                        isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {isProfit ? '+' : ''}{formatUah(trade.netProfitUah)} ₴
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <span className="font-semibold text-blue-600 dark:text-sky-400">
                          +{trade.roiPercent.toFixed(2)}%
                        </span>
                        <span className="text-xs text-slate-400 block">
                          ({trade.spreadPercent.toFixed(2)}% спред)
                        </span>
                      </td>


                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={tradeActionsBusy}
                            onClick={() => setSelectedTrade(trade)}
                            className={`p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${disabledControlClass}`}
                            title={t('tradeDetails')}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={tradeActionsBusy}
                            onClick={() => handleOpenEdit(trade)}
                            className={`p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${disabledControlClass}`}
                            title={t('editTrade')}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={tradeActionsBusy}
                            onClick={() => setDeleteTarget(trade)}
                            className={`p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${disabledControlClass}`}
                            title={t('deleteTrade')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
            {hasNextPage && (
              <div className="flex justify-center border-t border-slate-200 dark:border-slate-800 p-4">
                <button
                  type="button"
                  disabled={isFetchingNextPage || tradeActionsBusy}
                  onClick={loadMoreTrades}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-blue-700 dark:text-sky-300 bg-blue-50 dark:bg-sky-950/40 border border-blue-200 dark:border-sky-800 hover:bg-blue-100 dark:hover:bg-sky-900/50 transition-colors ${disabledControlClass}`}
                >
                  {isFetchingNextPage ? (
                    <ButtonLoader label="..." />
                  ) : null}
                  <span>{t('loadMoreTrades')}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>


      {selectedTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('tradeDetails')} ({selectedTrade.id})
              </h3>
              <button
                onClick={() => setSelectedTrade(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                <span className="font-bold text-blue-600 dark:text-sky-400 uppercase text-xs">Покупка</span>
                <p><strong>Біржа:</strong> {selectedTrade.buyExchange}</p>
                <p><strong>Банк:</strong> {selectedTrade.buyBankName}</p>
                <p><strong>Курс:</strong> {selectedTrade.buyRate.toFixed(2)} ₴</p>
                <p><strong>Сума:</strong> {formatUah(selectedTrade.buyAmountUah)} ₴</p>
                <p><strong>USDT:</strong> {selectedTrade.buyUsdtAmount.toFixed(4)}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-xs">Продаж</span>
                <p><strong>Біржа:</strong> {selectedTrade.sellExchange}</p>
                <p><strong>Банк:</strong> {selectedTrade.sellBankName}</p>
                <p><strong>Курс:</strong> {selectedTrade.sellRate.toFixed(2)} ₴</p>
                <p><strong>Сума:</strong> {formatUah(selectedTrade.sellAmountUah)} ₴</p>
                <p><strong>USDT:</strong> {selectedTrade.sellUsdtAmount.toFixed(4)}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-sm space-y-1">
              <p><strong>Комісії:</strong> {formatUah(selectedTrade.totalCommissionsUah)} ₴</p>
              <p><strong>Дод. витрати:</strong> {formatUah(selectedTrade.extraExpensesUah)} ₴</p>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                Чистий прибуток: {formatUah(selectedTrade.netProfitUah)} ₴
              </p>
              {selectedTrade.notes && (
                <p className="text-slate-500 italic mt-2">&quot;{selectedTrade.notes}&quot;</p>
              )}
            </div>
          </div>
        </div>
      )}

      {editingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t('editTrade')}
              </h3>
              <button
                onClick={() => setEditingTrade(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {editError && (
                <div className="p-3 text-sm text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-900">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                  <h4 className="font-bold text-blue-600 dark:text-sky-400 text-sm">Покупка</h4>
                  <select
                    value={editBuyExchange}
                    onChange={(e) => setEditBuyExchange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  >
                    {exchanges.map((ex) => (
                      <option key={ex.id} value={ex.name}>{ex.name}</option>
                    ))}
                  </select>
                  <select
                    value={editBuyBankId}
                    onChange={(e) => setEditBuyBankId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  >
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={editBuyRate}
                    onChange={(e) => setEditBuyRate(e.target.value)}
                    placeholder="Курс"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={editBuyAmountUah}
                    onChange={(e) => setEditBuyAmountUah(e.target.value)}
                    placeholder="Сума UAH"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={editBuyCommission}
                    onChange={(e) => setEditBuyCommission(e.target.value)}
                    placeholder="Комісія"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>

                <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                  <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">Продаж</h4>
                  <select
                    value={editSellExchange}
                    onChange={(e) => setEditSellExchange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  >
                    {exchanges.map((ex) => (
                      <option key={ex.id} value={ex.name}>{ex.name}</option>
                    ))}
                  </select>
                  <select
                    value={editSellBankId}
                    onChange={(e) => setEditSellBankId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  >
                    {banks.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={editSellRate}
                    onChange={(e) => setEditSellRate(e.target.value)}
                    placeholder="Курс"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={editSellAmountUah}
                    onChange={(e) => setEditSellAmountUah(e.target.value)}
                    placeholder="Сума UAH"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={editSellCommission}
                    onChange={(e) => setEditSellCommission(e.target.value)}
                    placeholder="Комісія"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>
              </div>

              <input
                type="number"
                step="0.01"
                value={editExtraExpenses}
                onChange={(e) => setEditExtraExpenses(e.target.value)}
                placeholder="Додаткові витрати"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Коментар"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTrade(null)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 ${disabledControlClass}`}
                >
                  {isSavingEdit ? <ButtonLoader label="Збереження..." /> : 'Зберегти зміни'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {t('deleteTrade')}?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {t('deleteTradeConfirm')}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className={`px-4 py-2 text-sm font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 ${disabledControlClass}`}
              >
                {isDeleting ? <ButtonLoader label="Видалення..." /> : t('deleteTrade')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
