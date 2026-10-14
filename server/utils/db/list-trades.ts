import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { Trade } from '../../schemas/trades.schema.js';
import { tradeMatchesKyivMonthDays } from '../../lib/kyiv-dates.js';
import {
  clampTradesPageSize,
  encodeTradeCursor,
  parseTradeCursor,
} from '../../../shared/trades-pagination.js';
import { mapTrade } from './mappers.js';
import {
  buildTradeListQuery,
  normalizeTradeListFilters,
  type TradeListFilters,
} from './trade-filters.js';

export type TradesListResult = {
  trades: Trade[];
  nextCursor: string | null;
  hasMore: boolean;
};

function mergeWhereWithCursor(
  base: Prisma.TradeWhereInput,
  cursor: { createdAt: Date; id: string },
): Prisma.TradeWhereInput {
  const cursorClause: Prisma.TradeWhereInput = {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      {
        AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }],
      },
    ],
  };

  if (
    base &&
    typeof base === 'object' &&
    'AND' in base &&
    Array.isArray(base.AND)
  ) {
    return { AND: [...base.AND, cursorClause] };
  }
  if (base && Object.keys(base).length > 0) {
    return { AND: [base, cursorClause] };
  }
  return cursorClause;
}

function applyMonthDayFilter(
  trades: Trade[],
  monthDayFilter: { monthKey: string; dayFrom: number; dayTo: number } | null,
): Trade[] {
  if (!monthDayFilter) return trades;
  const { monthKey, dayFrom, dayTo } = monthDayFilter;
  return trades.filter((t) =>
    tradeMatchesKyivMonthDays(t.createdAt, monthKey, dayFrom, dayTo),
  );
}

async function fetchAllTrades(
  userId: string,
  filters: TradeListFilters,
): Promise<Trade[]> {
  const { where, orderBy, monthDayFilter } = buildTradeListQuery(
    userId,
    filters,
  );
  const rows = await prisma.trade.findMany({ where, orderBy });
  return applyMonthDayFilter(rows.map(mapTrade), monthDayFilter);
}

async function fetchTradesPage(
  userId: string,
  filters: TradeListFilters,
  limit: number,
): Promise<TradesListResult> {
  const normalized = normalizeTradeListFilters(filters);
  if (normalized.sort) {
    const all = await fetchAllTrades(userId, filters);
    const skip = normalized.cursor ? Number(normalized.cursor) : 0;
    const offset = Number.isFinite(skip) && skip > 0 ? Math.floor(skip) : 0;
    const page = all.slice(offset, offset + limit);
    const nextOffset = offset + page.length;
    const hasMore = nextOffset < all.length;
    return {
      trades: page,
      nextCursor: hasMore ? String(nextOffset) : null,
      hasMore,
    };
  }

  const { where, orderBy, monthDayFilter } = buildTradeListQuery(
    userId,
    filters,
  );
  const parsedCursor = normalized.cursor
    ? parseTradeCursor(normalized.cursor)
    : null;

  const collected: Trade[] = [];
  let dbCursor = parsedCursor;
  let hasMoreDb = true;
  const dbBatch = Math.max(limit * 3, 60);
  const maxRounds = 25;

  for (let round = 0; round < maxRounds && collected.length < limit + 1; round++) {
    const wherePage = dbCursor
      ? mergeWhereWithCursor(where, dbCursor)
      : where;
    const rows = await prisma.trade.findMany({
      where: wherePage,
      orderBy,
      take: dbBatch,
    });
    if (rows.length === 0) {
      hasMoreDb = false;
      break;
    }

    let batch = applyMonthDayFilter(rows.map(mapTrade), monthDayFilter);
    for (const trade of batch) {
      collected.push(trade);
      if (collected.length >= limit + 1) break;
    }

    const lastRow = rows[rows.length - 1]!;
    dbCursor = { createdAt: lastRow.createdAt, id: lastRow.id };
    if (rows.length < dbBatch) {
      hasMoreDb = false;
    }
  }

  const hasMore =
    collected.length > limit ||
    (hasMoreDb && collected.length >= limit);
  const trades = collected.slice(0, limit);
  const nextCursor =
    hasMore && trades.length > 0
      ? encodeTradeCursor(trades[trades.length - 1]!)
      : null;

  return { trades, nextCursor, hasMore };
}

export async function listTradesForUser(
  userId: string,
  filters: TradeListFilters = {},
): Promise<TradesListResult> {
  const limit = clampTradesPageSize(
    normalizeTradeListFilters(filters).limit,
  );
  if (!limit) {
    const trades = await fetchAllTrades(userId, filters);
    return { trades, nextCursor: null, hasMore: false };
  }
  return fetchTradesPage(userId, filters, limit);
}
