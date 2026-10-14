import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { Trade } from '../../schemas/trades.schema.js';
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

async function fetchAllTrades(
  userId: string,
  filters: TradeListFilters,
): Promise<Trade[]> {
  const { where, orderBy } = buildTradeListQuery(userId, filters);
  const rows = await prisma.trade.findMany({ where, orderBy });
  return rows.map(mapTrade);
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

  const { where, orderBy } = buildTradeListQuery(userId, filters);
  const parsedCursor = normalized.cursor
    ? parseTradeCursor(normalized.cursor)
    : null;
  const wherePage = parsedCursor
    ? mergeWhereWithCursor(where, parsedCursor)
    : where;

  const rows = await prisma.trade.findMany({
    where: wherePage,
    orderBy,
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const trades = rows.slice(0, limit).map(mapTrade);
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
