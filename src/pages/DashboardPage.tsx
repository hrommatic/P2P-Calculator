import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardStats, Trade } from '../types';
import {
  TrendingUp,
  Activity,
  Layers,
  PlusCircle,
  ArrowRight,
  Percent,
} from 'lucide-react';
import { PageLoader } from '../components/ui/Loader';
import { PeriodFilterBar } from '../components/filters/PeriodFilterBar';
import { defaultPeriodFilter, periodToQuery, type PeriodPreset } from '../lib/period-filter';
import { aggregateTradePeriodStats } from '../lib/trade-period-stats';

interface DashboardPageProps {
  onNavigateToCalculator: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateToCalculator }) => {
  const { user, language, t } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [period, setPeriod] = useState(defaultPeriodFilter);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [turnoverInUsdt, setTurnoverInUsdt] = useState(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [sData, tData] = await Promise.all([
        api.getDashboardStats(),
        api.getTrades(periodToQuery(period)),
      ]);
      setStats(sData);
      setTrades(tData.trades);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const periodStats = useMemo(() => aggregateTradePeriodStats(trades), [trades]);

  const displayName = user?.nickname
    ? user.nickname.charAt(0).toUpperCase() + user.nickname.slice(1)
    : 'Учень';

  const formatUah = (val: number) => {
    return new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatUsdt = (val: number) => {
    return new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const nbuRate = stats?.usdUahRate ?? null;

  const formatTurnoverValue = (uah: number) => {
    if (turnoverInUsdt && nbuRate && nbuRate > 0) {
      return formatUsdt(uah / nbuRate);
    }
    return formatUah(uah);
  };

  const turnoverUnitLabel = turnoverInUsdt && nbuRate ? 'USDT' : 'UAH';

  const toggleTurnoverUnit = () => {
    if (!nbuRate) return;
    setTurnoverInUsdt(v => !v);
  };

  const statCardClass =
    'bg-white dark:bg-[#111827] p-3 rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs flex flex-col h-full';

  const turnoverCardClass =
    statCardClass +
    ' text-left w-full transition-colors' +
    (nbuRate ? ' cursor-pointer hover:border-blue-400/60 dark:hover:border-sky-500/40' : '');

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
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('greeting', { name: displayName })}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('appTagline')}</p>
        </div>

        <button
          onClick={onNavigateToCalculator}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('calculateFirstTrade')}</span>
        </button>
      </div>

      <PeriodFilterBar
        value={period}
        onChange={setPeriod}
        t={t}
        presetLabels={presetLabels}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 items-stretch auto-rows-fr">
        <div className={statCardClass}>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('periodProfit')}</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatUah(periodStats.profit)} <span className="text-[11px] font-normal">UAH</span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTurnoverUnit}
          disabled={!nbuRate}
          className={turnoverCardClass}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('totalTurnoverPeriod')}</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatTurnoverValue(periodStats.totalTurnover)}{' '}
            <span className="text-[11px] font-normal text-slate-500">{turnoverUnitLabel}</span>
          </div>
          {nbuRate && turnoverInUsdt && (
            <p className="text-[10px] text-slate-400 mt-1.5">
              {t('nbuRateLabel')}: {nbuRate.toFixed(2)} ₴/$
            </p>
          )}
        </button>

        <div className={statCardClass}>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('periodRoiSpread')}</span>
            <Percent className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-blue-600 dark:text-sky-400">
            +{periodStats.roiPercent.toFixed(2)}%
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 ml-1">ROI</span>
          </div>
        </div>

        <div className={statCardClass}>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('periodTradesCount')}</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {periodStats.tradesCount}
          </div>
        </div>

        <div className={statCardClass}>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('banksUsed')}</span>
            <Layers className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {stats?.banksCount || 0}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('recentTrades')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {trades.length} {language === 'en' ? 'trades recorded' : 'угод знайдено'}
          </p>
        </div>

        {isLoading ? (
          <PageLoader label="Завантаження даних..." className="p-8" />
        ) : trades.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {t('noTradesYet')}
            </p>
            <button
              onClick={onNavigateToCalculator}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
            >
              <span>{t('calculateFirstTrade')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
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
                  <th className="py-3 px-4 text-right">Спред %</th>
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
                          year: '2-digit',
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
                        <span className="font-medium text-slate-900 dark:text-slate-200">
                          {trade.buyBankName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {trade.buyRate.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                        {formatUah(trade.buyAmountUah)}{' '}
                        <span className="text-[10px] text-slate-400">₴</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {trade.sellExchange}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-900 dark:text-slate-200">
                          {trade.sellBankName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {trade.sellRate.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                        {formatUah(trade.sellAmountUah)}{' '}
                        <span className="text-[10px] text-slate-400">₴</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                        {trade.totalCommissionsUah.toFixed(2)} ₴
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-bold ${
                          isProfit
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isProfit ? '+' : ''}
                        {formatUah(trade.netProfitUah)} ₴
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-blue-600 dark:text-sky-400">
                        +{trade.spreadPercent.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
