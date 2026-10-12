import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Trade, UserBank, Exchange } from '../types';
import {
  History as HistoryIcon,
  Search,
  Download,
  Trash2,
  Edit,
  Eye,
  X,
} from 'lucide-react';
import { ButtonLoader, PageLoader } from '../components/ui/Loader';

export const HistoryPage: React.FC = () => {
  const { t, language } = useAuth();

  const [trades, setTrades] = useState<Trade[]>([]);
  const [banks, setBanks] = useState<UserBank[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [bankId, setBankId] = useState('all');
  const [exchange, setExchange] = useState('all');
  const [sort, setSort] = useState('newest');

  // Modals
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Trade | null>(null);

  // Edit form state
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

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const [tRes, bRes, eRes] = await Promise.all([
        api.getTrades({
          search: search || undefined,
          dateRange: dateRange !== 'all' ? dateRange : undefined,
          bankId: bankId !== 'all' ? bankId : undefined,
          exchange: exchange !== 'all' ? exchange : undefined,
          sort: sort !== 'newest' ? sort : undefined,
        }),
        api.getBanks(),
        api.getExchanges(),
      ]);
      setTrades(tRes.trades);
      setBanks(bRes.banks);
      setExchanges(eRes.exchanges);
    } catch (err) {
      console.error('Error fetching trade history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [dateRange, bankId, exchange, sort]);

  // Delayed search handler
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchHistory();
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

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
      fetchHistory();
    } catch (err: any) {
      setEditError(err.message || 'Помилка оновлення угоди');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.deleteTrade(deleteTarget.id);
      setDeleteTarget(null);
      fetchHistory();
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

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <HistoryIcon className="w-6 h-6 text-blue-600 dark:text-sky-400" />
            <span>{t('historyTitle')}</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('historySubtitle')}
          </p>
        </div>

        <a
          href={api.exportCsvUrl()}
          download
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 bg-white dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs transition-colors shrink-0"
        >
          <Download className="w-4 h-4 text-blue-600 dark:text-sky-400" />
          <span>{t('exportCsv')}</span>
        </a>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchTrades')}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Date Filter */}
        <div>
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="select-field w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="all">{t('filterAll')}</option>
            <option value="today">{t('filterToday')}</option>
            <option value="yesterday">{t('filterYesterday')}</option>
            <option value="week">{t('filterWeek')}</option>
            <option value="month">{t('filterMonth')}</option>
          </select>
        </div>

        {/* Bank Filter */}
        <div>
          <select
            value={bankId}
            onChange={e => setBankId(e.target.value)}
            className="select-field w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="all">Всі банки</option>
            {banks.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Sort Filter */}
        <div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="select-field w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="newest">{t('sortNewest')}</option>
            <option value="profit_desc">{t('sortProfitDesc')}</option>
            <option value="profit_asc">{t('sortProfitAsc')}</option>
            <option value="spread_desc">{t('sortSpreadDesc')}</option>
          </select>
        </div>

      </div>

      {/* Trades Table */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs overflow-hidden">
        {isLoading ? (
          <PageLoader label="Завантаження журналу угод..." />
        ) : trades.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Угод за вказаними фільтрами не знайдено.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
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
                        <span className="text-[10px] text-slate-400 block">
                          ({trade.spreadPercent.toFixed(2)}% спред)
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedTrade(trade)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            title={t('tradeDetails')}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(trade)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            title={t('editTrade')}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(trade)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
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
          </div>
        )}
      </div>

      {/* Trade Details Modal */}
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

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                <span className="font-bold text-blue-600 dark:text-sky-400 uppercase text-[10px]">Покупка</span>
                <p><strong>Біржа:</strong> {selectedTrade.buyExchange}</p>
                <p><strong>Банк:</strong> {selectedTrade.buyBankName}</p>
                <p><strong>Курс:</strong> {selectedTrade.buyRate.toFixed(2)} ₴</p>
                <p><strong>Сума:</strong> {formatUah(selectedTrade.buyAmountUah)} ₴</p>
                <p><strong>USDT:</strong> {selectedTrade.buyUsdtAmount.toFixed(4)}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[10px]">Продаж</span>
                <p><strong>Біржа:</strong> {selectedTrade.sellExchange}</p>
                <p><strong>Банк:</strong> {selectedTrade.sellBankName}</p>
                <p><strong>Курс:</strong> {selectedTrade.sellRate.toFixed(2)} ₴</p>
                <p><strong>Сума:</strong> {formatUah(selectedTrade.sellAmountUah)} ₴</p>
                <p><strong>USDT:</strong> {selectedTrade.sellUsdtAmount.toFixed(4)}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1.5">
              <p><strong>Всі комісії:</strong> {selectedTrade.totalCommissionsUah.toFixed(2)} ₴</p>
              <p><strong>Чистий прибуток:</strong> <span className="font-bold text-emerald-600">+{formatUah(selectedTrade.netProfitUah)} ₴</span></p>
              <p><strong>Рентабельність (ROI):</strong> +{selectedTrade.roiPercent.toFixed(2)}%</p>
              <p><strong>Спред:</strong> +{selectedTrade.spreadPercent.toFixed(2)}% (+{selectedTrade.spreadPerUnit.toFixed(2)} ₴/$)</p>
              {selectedTrade.notes && (
                <p className="pt-1 text-slate-500"><strong>Коментар:</strong> {selectedTrade.notes}</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTrade(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trade Modal */}
      {editingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('editTrade')}
              </h3>
              <button
                onClick={() => setEditingTrade(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-2.5 rounded-lg text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Банк покупки</label>
                  <select
                    value={editBuyBankId}
                    onChange={e => setEditBuyBankId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Банк продажу</label>
                  <select
                    value={editSellBankId}
                    onChange={e => setEditSellBankId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Курс покупки (UAH)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editBuyRate}
                    onChange={e => setEditBuyRate(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Курс продажу (UAH)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editSellRate}
                    onChange={e => setEditSellRate(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Сума покупки (UAH)</label>
                  <input
                    type="number"
                    step="10"
                    required
                    value={editBuyAmountUah}
                    onChange={e => setEditBuyAmountUah(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Сума продажу (UAH)</label>
                  <input
                    type="number"
                    step="10"
                    value={editSellAmountUah}
                    onChange={e => setEditSellAmountUah(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Коментар</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTrade(null)}
                  className="px-4 py-2 font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                >
                  {isSavingEdit ? <ButtonLoader label="Збереження..." /> : 'Зберегти зміни'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Trade Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4 text-center">
            <Trash2 className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('deleteTrade')}?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('deleteTradeConfirm')}
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60"
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
