import React, { useState, useEffect, useMemo, useCallback } from "react";
import { DashboardTradeRow } from "../components/dashboard/DashboardTradeRow";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { DashboardStats, Trade } from "../types";
import { PlusCircle, ArrowRight, ArrowLeftRight } from "lucide-react";
import { PageLoader } from "../components/ui/Loader";
import { PeriodFilterBar } from "../components/filters/PeriodFilterBar";
import {
  defaultPeriodFilter,
  periodToQuery,
  type PeriodPreset,
} from "../lib/period-filter";
import { aggregateTradePeriodStats } from "../lib/trade-period-stats";

interface DashboardPageProps {
  onNavigateToCalculator: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToCalculator,
}) => {
  const { user, language, t } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [period, setPeriod] = useState(defaultPeriodFilter);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [turnoverInUsdt, setTurnoverInUsdt] = useState(false);
  const [activityView, setActivityView] = useState<"trades" | "banks">(
    "trades",
  );

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const data = await api.getDashboardStats(
          periodToQuery(period),
          ac.signal,
        );
        if (cancelled) return;
        setStats(data);
        setTrades(data.trades ?? []);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Error loading dashboard data:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [period]);

  const periodStats = useMemo(
    () => aggregateTradePeriodStats(trades),
    [trades],
  );

  const displayName = user?.nickname
    ? user.nickname.charAt(0).toUpperCase() + user.nickname.slice(1)
    : "Учень";

  const formatUah = useCallback((val: number) => {
    return new Intl.NumberFormat("uk-UA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  }, []);

  const formatUsdt = (val: number) => {
    return new Intl.NumberFormat("uk-UA", {
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

  const turnoverUnitLabel = turnoverInUsdt && nbuRate ? "USDT" : "UAH";

  const toggleTurnoverUnit = () => {
    if (!nbuRate) return;
    setTurnoverInUsdt((v) => !v);
  };

  type StatTheme = "profit" | "turnover" | "roi" | "trades" | "banks";

  const statThemeClass: Record<
    StatTheme,
    { card: string; label: string; value: string; unit: string }
  > = {
    profit: {
      card: "border-l-[4px] border-l-emerald-500 dark:border-l-emerald-400 bg-emerald-500/12 dark:bg-emerald-400/15 border-emerald-500/25 dark:border-emerald-400/30 shadow-[0_0_24px_-8px_rgba(16,185,129,0.35)] dark:shadow-[0_0_28px_-6px_rgba(52,211,153,0.25)]",
      label: "text-emerald-800/90 dark:text-emerald-300/95",
      value: "text-emerald-950 dark:text-emerald-50",
      unit: "text-emerald-800/70 dark:text-emerald-300/80",
    },
    turnover: {
      card: "border-l-[4px] border-l-violet-500 dark:border-l-violet-400 bg-violet-500/12 dark:bg-violet-400/15 border-violet-500/25 dark:border-violet-400/30 shadow-[0_0_24px_-8px_rgba(139,92,246,0.35)] dark:shadow-[0_0_28px_-6px_rgba(167,139,250,0.22)]",
      label: "text-violet-800/90 dark:text-violet-300/95",
      value: "text-slate-900 dark:text-slate-50",
      unit: "text-violet-800/70 dark:text-violet-300/75",
    },
    roi: {
      card: "border-l-[4px] border-l-sky-500 dark:border-l-sky-400 bg-sky-500/12 dark:bg-sky-400/15 border-sky-500/25 dark:border-sky-400/30 shadow-[0_0_24px_-8px_rgba(14,165,233,0.35)] dark:shadow-[0_0_28px_-6px_rgba(56,189,248,0.22)]",
      label: "text-sky-800/90 dark:text-sky-300/95",
      value: "text-slate-900 dark:text-slate-50",
      unit: "text-sky-800/70 dark:text-sky-300/75",
    },
    trades: {
      card: "border-l-[4px] border-l-indigo-500 dark:border-l-indigo-400 bg-indigo-500/12 dark:bg-indigo-400/15 border-indigo-500/25 dark:border-indigo-400/30 shadow-[0_0_24px_-8px_rgba(99,102,241,0.3)] dark:shadow-[0_0_28px_-6px_rgba(129,140,248,0.2)]",
      label: "text-indigo-800/90 dark:text-indigo-300/95",
      value: "text-slate-900 dark:text-slate-50",
      unit: "text-indigo-800/70 dark:text-indigo-300/75",
    },
    banks: {
      card: "border-l-[4px] border-l-teal-500 dark:border-l-teal-400 bg-teal-500/12 dark:bg-teal-400/15 border-teal-500/25 dark:border-teal-400/30 shadow-[0_0_24px_-8px_rgba(20,184,166,0.3)] dark:shadow-[0_0_28px_-6px_rgba(45,212,191,0.2)]",
      label: "text-teal-800/90 dark:text-teal-300/95",
      value: "text-slate-900 dark:text-slate-50",
      unit: "text-teal-800/70 dark:text-teal-300/75",
    },
  };

  const statCardShell = (theme: StatTheme) =>
    `p-3 sm:p-3.5 rounded-2xl border backdrop-blur-[2px] flex flex-col h-full min-h-[4.75rem] items-stretch ${statThemeClass[theme].card}`;

  const statHeaderClass =
    "flex items-start justify-between gap-2 mb-2";

  const statLabelClass = (theme: StatTheme) =>
    `text-sm sm:text-sm font-bold uppercase tracking-wide sm:tracking-[0.14em] leading-snug break-words flex-1 min-w-0 ${statThemeClass[theme].label}`;

  const statHeaderIconSlotClass = "w-4 h-4 shrink-0 mt-0.5 sm:w-3.5 sm:h-3.5";

  const statValueClass = (theme: StatTheme) =>
    `text-xl sm:text-2xl font-extrabold font-mono tabular-nums leading-tight break-all sm:break-normal ${statThemeClass[theme].value}`;

  const statUnitClass = (theme: StatTheme) =>
    `text-base sm:text-base font-bold ${statThemeClass[theme].unit}`;

  const turnoverCardClass =
    statCardShell("turnover") +
    " text-left w-full transition-colors" +
    (nbuRate
      ? " cursor-pointer hover:brightness-105 dark:hover:brightness-110"
      : "");

  const toggleActivityView = () => {
    setActivityView((v) => (v === "trades" ? "banks" : "trades"));
  };

  const activityTheme = activityView;
  const activityCardClass =
    statCardShell(activityTheme) +
    " text-left w-full cursor-pointer transition-all duration-200 hover:brightness-105 dark:hover:brightness-110";

  const presetLabels: Record<PeriodPreset, string> = {
    all: t("filterAll"),
    today: t("filterToday"),
    yesterday: t("filterYesterday"),
    week: t("filterWeek"),
    month: t("filterMonth"),
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 sm:gap-6 min-w-0 max-w-full">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white break-words">
            {t("greeting", { name: displayName })}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("appTagline")}
          </p>
        </div>

        <button
          onClick={onNavigateToCalculator}
          className="inline-flex w-full sm:w-auto justify-center items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t("calculateFirstTrade")}</span>
        </button>
      </div>

      <div className="shrink-0">
        <PeriodFilterBar
          value={period}
          onChange={setPeriod}
          t={t}
          presetLabels={presetLabels}
        />
      </div>

      <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 items-stretch auto-rows-fr min-w-0">
        <div
          className={`${statCardShell("profit")} col-span-2 md:col-span-1 order-1 md:order-1`}
        >
          <div className={statHeaderClass}>
            <p className={statLabelClass("profit")}>{t("periodProfit")}</p>
            <span className={statHeaderIconSlotClass} aria-hidden />
          </div>
          <p className={statValueClass("profit")}>
            {periodStats.profit < 0 ? "-" : ""}
            {formatUah(Math.abs(periodStats.profit))}{" "}
            <span className={statUnitClass("profit")}>UAH</span>
          </p>
        </div>

        <div className={`${statCardShell("roi")} order-3 md:order-2`}>
          <div className={statHeaderClass}>
            <p className={statLabelClass("roi")}>{t("periodRoiSpread")}</p>
            <span className={statHeaderIconSlotClass} aria-hidden />
          </div>
          <p className={statValueClass("roi")}>
            {periodStats.roiPercent < 0 ? "-" : ""}
            {Math.abs(periodStats.roiPercent).toFixed(2)}%
          </p>
        </div>

        <button
          type="button"
          onClick={toggleTurnoverUnit}
          disabled={!nbuRate}
          className={`${turnoverCardClass} col-span-2 md:col-span-1 order-2 md:order-3`}
          aria-label={t("switchTurnoverUnit")}
        >
          <div className={statHeaderClass}>
            <p className={statLabelClass("turnover")}>
              {t("totalTurnoverPeriod")}
            </p>
            <ArrowLeftRight
              className={`${statHeaderIconSlotClass} ${nbuRate ? "opacity-80" : "opacity-35"} ${statThemeClass.turnover.label}`}
              aria-hidden
            />
          </div>
          <p className={statValueClass("turnover")}>
            {formatTurnoverValue(periodStats.totalTurnover)}{" "}
            <span className={statUnitClass("turnover")}>{turnoverUnitLabel}</span>
          </p>
        </button>

        <button
          type="button"
          onClick={toggleActivityView}
          className={`${activityCardClass} order-4 md:order-4`}
          aria-label={t("switchTradesBanks")}
        >
          <div className={statHeaderClass}>
            <p className={statLabelClass(activityTheme)}>
              {activityView === "trades"
                ? t("periodTradesCount")
                : t("banksUsedShort")}
            </p>
            <ArrowLeftRight
              className={`${statHeaderIconSlotClass} opacity-80 ${statThemeClass[activityTheme].label}`}
              aria-hidden
            />
          </div>
          <p className={statValueClass(activityTheme)}>
            {activityView === "trades"
              ? periodStats.tradesCount
              : stats?.banksCount || 0}
          </p>
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xs overflow-hidden min-w-0 max-w-full">
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t("recentTrades")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {trades.length}{" "}
            {language === "en" ? "trades recorded" : "угод знайдено"}
          </p>
        </div>

        {isLoading ? (
          <PageLoader label="Завантаження даних..." className="p-8" />
        ) : trades.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {t("noTradesYet")}
            </p>
            <button
              onClick={onNavigateToCalculator}
              className="px-4 py-2.5 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
            >
              <span>{t("calculateFirstTrade")}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="min-h-0 flex-1 resize-none overflow-auto overscroll-contain bg-white dark:bg-[#111827] [scrollbar-gutter:stable]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/95 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold backdrop-blur-sm">
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
                {trades.map((trade) => (
                  <DashboardTradeRow
                    key={trade.id}
                    trade={trade}
                    formatUah={formatUah}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
