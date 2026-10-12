export const KYIV_TIME_ZONE = 'Europe/Kyiv';

export function getKyivYmd(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-CA', { timeZone: KYIV_TIME_ZONE });
}

export function ymdFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseYmd(ymd: string): { year: number; month: number; day: number } {
  const [year, month, day] = ymd.split('-').map(Number);
  return { year, month, day };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function mondayFirstWeekday(year: number, month: number, day: number): number {
  const w = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return w === 0 ? 6 : w - 1;
}

export function formatMonthYearUk(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month - 1, 15));
  return d.toLocaleDateString('uk-UA', {
    timeZone: KYIV_TIME_ZONE,
    month: 'long',
    year: 'numeric',
  });
}

export function formatYmdShortUk(ymd: string): string {
  const { year, month, day } = parseYmd(ymd);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString('uk-UA', {
    timeZone: KYIV_TIME_ZONE,
    day: 'numeric',
    month: 'short',
  });
}
