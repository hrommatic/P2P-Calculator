import type { Prisma } from '@prisma/client';
import { tradeFiltersToCreatedAtRange } from '../../lib/kyiv-dates.js';

export type TradeListFilters = {
  dateRange?: string | string[];
  dateFrom?: string | string[];
  dateTo?: string | string[];
  monthKey?: string | string[];
  monthDayFrom?: string | string[];
  monthDayTo?: string | string[];
  bankId?: string | string[];
  exchange?: string | string[];
  search?: string | string[];
  sort?: string | string[];
};

export function normalizeTradeListFilters(filters: TradeListFilters = {}) {
  const dateRange = filters.dateRange ? String(filters.dateRange) : undefined;
  const dateFrom = filters.dateFrom ? String(filters.dateFrom) : undefined;
  const dateTo = filters.dateTo ? String(filters.dateTo) : undefined;
  const monthKey = filters.monthKey ? String(filters.monthKey) : undefined;
  const monthDayFrom = filters.monthDayFrom
    ? Number(filters.monthDayFrom)
    : undefined;
  const monthDayTo = filters.monthDayTo ? Number(filters.monthDayTo) : undefined;
  const bankId = filters.bankId ? String(filters.bankId) : undefined;
  const exchange = filters.exchange ? String(filters.exchange) : undefined;
  const search = filters.search ? String(filters.search) : undefined;
  const sort = filters.sort ? String(filters.sort) : undefined;

  return {
    dateRange,
    dateFrom,
    dateTo,
    monthKey,
    monthDayFrom,
    monthDayTo,
    bankId,
    exchange,
    search,
    sort,
  };
}

export function buildTradeListQuery(
  userId: string | undefined,
  filters: TradeListFilters = {},
): {
  where: Prisma.TradeWhereInput;
  orderBy: Prisma.TradeOrderByWithRelationInput[];
  monthDayFilter:
    | { monthKey: string; dayFrom: number; dayTo: number }
    | null;
} {
  const normalized = normalizeTradeListFilters(filters);
  const createdAtRange = tradeFiltersToCreatedAtRange({
    dateRange: normalized.dateRange,
    dateFrom: normalized.dateFrom,
    dateTo: normalized.dateTo,
    monthKey: normalized.monthKey,
  });

  const and: Prisma.TradeWhereInput[] = [];
  if (userId) {
    and.push({ userId });
  }

  if (createdAtRange) {
    and.push({
      createdAt: { gte: createdAtRange.gte, lt: createdAtRange.lt },
    });
  }

  if (normalized.bankId && normalized.bankId !== 'all') {
    and.push({
      OR: [
        { buyBankId: normalized.bankId },
        { sellBankId: normalized.bankId },
      ],
    });
  }

  if (normalized.exchange && normalized.exchange !== 'all') {
    and.push({
      OR: [
        { buyExchange: normalized.exchange },
        { sellExchange: normalized.exchange },
      ],
    });
  }

  const q = normalized.search?.trim();
  if (q) {
    and.push({
      OR: [
        { notes: { contains: q, mode: 'insensitive' } },
        { buyBankName: { contains: q, mode: 'insensitive' } },
        { sellBankName: { contains: q, mode: 'insensitive' } },
        { buyExchange: { contains: q, mode: 'insensitive' } },
        { sellExchange: { contains: q, mode: 'insensitive' } },
      ],
    });
  }

  let orderBy: Prisma.TradeOrderByWithRelationInput[];
  switch (normalized.sort) {
    case 'profit_desc':
      orderBy = [{ netProfitUah: 'desc' }, { createdAt: 'desc' }];
      break;
    case 'profit_asc':
      orderBy = [{ netProfitUah: 'asc' }, { createdAt: 'desc' }];
      break;
    case 'spread_desc':
      orderBy = [{ spreadPercent: 'desc' }, { createdAt: 'desc' }];
      break;
    default:
      orderBy = [{ createdAt: 'desc' }];
      break;
  }

  let monthDayFilter: {
    monthKey: string;
    dayFrom: number;
    dayTo: number;
  } | null = null;
  if (
    normalized.monthKey &&
    Number.isFinite(normalized.monthDayFrom) &&
    Number.isFinite(normalized.monthDayTo)
  ) {
    monthDayFilter = {
      monthKey: normalized.monthKey,
      dayFrom: normalized.monthDayFrom!,
      dayTo: normalized.monthDayTo!,
    };
  }

  let where: Prisma.TradeWhereInput;
  if (and.length === 0) {
    where = {};
  } else if (and.length === 1) {
    where = and[0]!;
  } else {
    where = { AND: and };
  }

  return {
    where,
    orderBy,
    monthDayFilter,
  };
}
