import type { PeriodFilterState } from './period-filter';

/** Stable query-key segment for period filters (dashboard + trade lists). */
export function tradesPeriodKey(p: PeriodFilterState): readonly unknown[] {
  if (p.kind === 'preset') return ['preset', p.preset] as const;
  if (p.kind === 'range') return ['range', p.dateFrom, p.dateTo] as const;
  return ['monthDays', p.monthKey, p.dayFrom, p.dayTo] as const;
}

export const dashboardStatsKey = (period: PeriodFilterState) =>
  ['dashboard', 'stats', ...tradesPeriodKey(period)] as const;

export const tradesListKey = (period: PeriodFilterState) =>
  ['trades', 'list', ...tradesPeriodKey(period)] as const;
