export const TRADES_PAGE_SIZE = 30;
export const TRADES_PAGE_SIZE_MAX = 100;
export const DASHBOARD_RECENT_TRADES_LIMIT = 20;

export function clampTradesPageSize(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(Math.max(1, Math.floor(n)), TRADES_PAGE_SIZE_MAX);
}

export function encodeTradeCursor(trade: {
  createdAt: string;
  id: string;
}): string {
  return `${trade.createdAt}_${trade.id}`;
}

export function parseTradeCursor(
  cursor: string,
): { createdAt: Date; id: string } | null {
  const trimmed = cursor.trim();
  if (!trimmed) return null;
  const sep = trimmed.lastIndexOf('_');
  if (sep <= 0) return null;
  const createdAt = new Date(trimmed.slice(0, sep));
  const id = trimmed.slice(sep + 1);
  if (Number.isNaN(createdAt.getTime()) || !id) return null;
  return { createdAt, id };
}
