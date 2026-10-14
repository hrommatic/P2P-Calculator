export type StatTheme = "profit" | "turnover" | "roi" | "trades" | "banks";

export const statThemeClass: Record<
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

export const statCardShell = (theme: StatTheme) =>
  `p-3 sm:p-3.5 rounded-2xl border backdrop-blur-[2px] flex flex-col h-full min-h-[4.75rem] items-stretch ${statThemeClass[theme].card}`;

export const statHeaderClass =
  "flex items-start justify-between gap-2 mb-2";

export const statLabelClass = (theme: StatTheme) =>
  `text-sm sm:text-sm font-bold uppercase tracking-wide sm:tracking-[0.14em] leading-snug break-words flex-1 min-w-0 ${statThemeClass[theme].label}`;

export const statHeaderIconSlotClass = "w-4 h-4 shrink-0 mt-0.5 sm:w-3.5 sm:h-3.5";

export const statValueClass = (theme: StatTheme) =>
  `text-xl sm:text-2xl font-extrabold font-mono tabular-nums leading-tight break-all sm:break-normal ${statThemeClass[theme].value}`;

export const statUnitClass = (theme: StatTheme) =>
  `text-base sm:text-base font-bold ${statThemeClass[theme].unit}`;

/** Довгі підписи в 2 рядки без збільшення картки понад ROI / угоди. */
export const statLabelCompactClass = (theme: StatTheme) =>
  `${statLabelClass(theme)} text-[10px] sm:text-xs leading-tight line-clamp-2`;
