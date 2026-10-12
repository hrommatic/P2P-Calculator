
export const KYIV_TIME_ZONE = 'Europe/Kyiv';

export function getKyivYmd(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-CA', { timeZone: KYIV_TIME_ZONE });
}

export function getKyivTodayYmd(): string {
  return getKyivYmd(new Date());
}

export function isKyivToday(createdAt: Date | string): boolean {
  return getKyivYmd(createdAt) === getKyivTodayYmd();
}

export function getKyivMonthStartYmd(from = new Date()): string {
  const ymd = getKyivYmd(from);
  return `${ymd.slice(0, 8)}01`;
}

export function addKyivDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const startMs = getKyivDayStartMs(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  return getKyivYmd(new Date(startMs + days * 86_400_000));
}

export function getKyivDayStartMs(ymd: string): number {
  const [year, month, day] = ymd.split('-').map(Number);
  let lo = Date.UTC(year, month - 1, day - 1);
  let hi = Date.UTC(year, month - 1, day + 2);
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (getKyivYmd(new Date(mid)) < ymd) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export type TradeDateRange = 'today' | 'yesterday' | 'week' | 'month';

export function tradeMatchesKyivDateRange(
  createdAt: Date | string,
  dateRange: TradeDateRange,
): boolean {
  const ymd = getKyivYmd(createdAt);
  const todayYmd = getKyivTodayYmd();

  if (dateRange === 'today') return ymd === todayYmd;
  if (dateRange === 'yesterday') return ymd === addKyivDays(todayYmd, -1);
  if (dateRange === 'week') return ymd >= addKyivDays(todayYmd, -6);
  if (dateRange === 'month') return ymd >= getKyivMonthStartYmd();
  return true;
}

export function accumulateKyivProfitBuckets(
  createdAt: Date | string,
  netProfitUah: number,
  buckets: {
    profitToday: number;
    profitYesterday: number;
    profitMonth: number;
  },
): void {
  const ymd = getKyivYmd(createdAt);
  const todayYmd = getKyivTodayYmd();
  const yesterdayYmd = addKyivDays(todayYmd, -1);
  const monthStartYmd = getKyivMonthStartYmd();

  if (ymd === todayYmd) buckets.profitToday += netProfitUah;
  if (ymd === yesterdayYmd) buckets.profitYesterday += netProfitUah;
  if (ymd >= monthStartYmd) buckets.profitMonth += netProfitUah;
}
