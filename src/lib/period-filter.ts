import { getKyivYmd, parseYmd, ymdFromParts } from './kyiv-dates';

export type PeriodPreset = 'all' | 'today' | 'yesterday' | 'week' | 'month';

export type PeriodFilterState =
  | { kind: 'preset'; preset: PeriodPreset }
  | { kind: 'range'; dateFrom: string; dateTo: string }
  | { kind: 'monthDays'; monthKey: string; dayFrom: number; dayTo: number };

export function defaultPeriodFilter(): PeriodFilterState {
  return { kind: 'preset', preset: 'today' };
}

export function periodToQuery(p: PeriodFilterState): Record<string, string> {
  if (p.kind === 'preset') {
    if (p.preset === 'all') return {};
    return { dateRange: p.preset };
  }
  if (p.kind === 'range') {
    return { dateFrom: p.dateFrom, dateTo: p.dateTo };
  }
  return {
    monthKey: p.monthKey,
    monthDayFrom: String(p.dayFrom),
    monthDayTo: String(p.dayTo),
  };
}

export function periodLabelUk(p: PeriodFilterState): string {
  if (p.kind === 'preset') {
    const map: Record<PeriodPreset, string> = {
      all: 'Увесь час',
      today: 'Сьогодні',
      yesterday: 'Вчора',
      week: 'Тиждень',
      month: 'Місяць',
    };
    return map[p.preset];
  }
  if (p.kind === 'range') {
    if (p.dateFrom === p.dateTo) return p.dateFrom.split('-').reverse().join('.');
    return `${p.dateFrom.split('-').slice(1).reverse().join('.')} – ${p.dateTo.split('-').slice(1).reverse().join('.')}`;
  }
  const [, m] = p.monthKey.split('-');
  return `${p.dayFrom}–${p.dayTo}.${m}`;
}

export function viewMonthFromPeriod(p: PeriodFilterState): { year: number; month: number } {
  const today = getKyivYmd();
  if (p.kind === 'range' && p.dateFrom) {
    return parseYmd(p.dateFrom);
  }
  if (p.kind === 'monthDays') {
    const [y, mo] = p.monthKey.split('-').map(Number);
    return { year: y, month: mo };
  }
  return parseYmd(today);
}

export function monthKeyFromYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function clampRangeYmd(a: string, b: string): { from: string; to: string } {
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}

export function ymdInRange(ymd: string, from: string | null, to: string | null): boolean {
  if (from && ymd < from) return false;
  if (to && ymd > to) return false;
  return true;
}

export function buildYmd(year: number, month: number, day: number): string {
  return ymdFromParts(year, month, day);
}
