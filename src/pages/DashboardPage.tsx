import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardStats, Trade } from '../types';
import {
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Activity,
  Layers,
  Calendar,
  PlusCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { PageLoader } from '../components/ui/Loader';

interface DashboardPageProps {
  onNavigateToCalculator: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateToCalculator }) => {
  const { user, language, t } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDashboardData = async (filter: string) => {
    setIsLoading(true);
    try {
      const [sData, tData] = await Promise.all([
        api.getDashboardStats(),
        api.getTrades({ dateRange: filter === 'all' ? undefined : filter }),
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
    fetchDashboardData(dateFilter);
  }, [dateFilter]);

  const displayName = user?.nickname ? user.nickname.charAt(0).toUpperCase() + user.nickname.slice(1) : 'Учень';

  const formatUah = (val: number) => {
    return new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatUsdt = (val: number) => {
    return new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(val || 0);
  };

  const filterOptions = [
    { id: 'all', label: t('filterAll') },
    { id: 'today', label: t('filterToday') },
    { id: 'yesterday', label: t('filterYesterday') },
    { id: 'week', label: t('filterWeek') },
    { id: 'month', label: t('filterMonth') },
  ];

  return (
    <div className="space-y-6">
      
      {/* Personal Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('greeting', { name: displayName })}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('appTagline')}
          </p>
        </div>

        <button
          onClick={onNavigateToCalculator}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('calculateFirstTrade')}</span>
        </button>
      </div>

      {/* KPI Cards Grid (8 Core Metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
        {/* 1. Today Profit */}
        <div className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('todayProfit')}</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatUah(stats?.profitToday || 0)} <span className="text-xs font-normal">UAH</span>
          </div>
        </div>

        {/* 2. Yesterday Profit */}
        <div className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('yesterdayProfit')}</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200">
            +{formatUah(stats?.profitYesterday || 0)} <span className="text-xs font-normal">UAH</span>
          </div>
        </div>

        {/* 3. Month Profit */}
        <div className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('monthProfit')}</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatUah(stats?.profitMonth || 0)} <span className="text-xs font-normal">UAH</span>
          </div>
        </div>

        {/* 4. All Time Profit */}
        <div className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('allTimeProfit')}</span>
            <Wallet className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatUah(stats?.profitAllTime || 0)} <span className="text-xs font-normal">UAH</span>
          </div>
        </div>

        {/* 5. Buy Turnover */}
        <div className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('buyTurnover')}</span>
            <ArrowDownLeft className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatUah(stats?.buyTurnover || 0)} <span className="text-xs font-normal text-slate-500">UAH</span>
          </div>
        </div>

        {/* 6. Sell Turnover */}
        <div className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('sellTurnover')}</span>
            <ArrowUpRight className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatUah(stats?.sellTurnover || 0)} <span className="text-xs font-normal text-slate-500">UAH</span>
          </div>
        </div>

        {/* 7. Total Trades Count */}
        <div className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('tradesCount')}</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {stats?.tradesCount || 0}
          </div>
        </div>

        {/* 8. Banks Used Count */}
        <div className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{t('banksUsed')}</span>
            <Layers className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {stats?.banksCount || 0}
          </div>
        </div>

      </div>

      {/* Recent Trades Table Section */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs overflow-hidden">
        
        {/* Table Header & Segmented Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('recentTrades')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {trades.length} {language === 'en' ? 'trades recorded' : 'угод знайдено'}
            </p>
          </div>

          {/* Interactive Date Filter Bar */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
            {filterOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setDateFilter(opt.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  dateFilter === opt.id
                    ? 'bg-white dark:bg-[#1c2541] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
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
                      {/* Date & Time */}
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

                      {/* Buy Exchange */}
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {trade.buyExchange}
                      </td>

                      {/* Buy Bank */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-900 dark:text-slate-200">
                          {trade.buyBankName}
                        </span>
                      </td>

                      {/* Buy Rate */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {trade.buyRate.toFixed(2)}
                      </td>

                      {/* Buy Amount UAH */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                        {formatUah(trade.buyAmountUah)} <span className="text-[10px] text-slate-400">₴</span>
                      </td>

                      {/* Sell Exchange */}
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {trade.sellExchange}
                      </td>

                      {/* Sell Bank */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-900 dark:text-slate-200">
                          {trade.sellBankName}
                        </span>
                      </td>

                      {/* Sell Rate */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {trade.sellRate.toFixed(2)}
                      </td>

                      {/* Sell Amount UAH */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                        {formatUah(trade.sellAmountUah)} <span className="text-[10px] text-slate-400">₴</span>
                      </td>

                      {/* Commissions */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                        {trade.totalCommissionsUah.toFixed(2)} ₴
                      </td>

                      {/* Net Profit */}
                      <td className={`py-3 px-4 text-right font-mono tabular-nums font-bold ${
                        isProfit
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {isProfit ? '+' : ''}{formatUah(trade.netProfitUah)} ₴
                      </td>

                      {/* Spread % */}
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
