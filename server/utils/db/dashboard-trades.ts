import { prisma } from '../../lib/prisma.js';
import type { Trade } from '../../schemas/trades.schema.js';
import { DASHBOARD_RECENT_TRADES_LIMIT } from '../../../shared/trades-pagination.js';
import { aggregateTradePeriodStats } from '../../../shared/trade-period-stats.js';
import type { TradePeriodStats } from '../../../shared/trade-period-stats.js';
import { mapTrade } from './mappers.js';
import { buildTradeListQuery, type TradeListFilters } from './trade-filters.js';

export type DashboardTradePayload = {
  periodStats: TradePeriodStats;
  recentTrades: Trade[];
};

export async function getDashboardTradePayload(
  userId: string,
  filters: TradeListFilters = {},
): Promise<DashboardTradePayload> {
  const { where, orderBy } = buildTradeListQuery(userId, filters);

  const [statRows, recentRows] = await Promise.all([
    prisma.trade.findMany({
      where,
      select: {
        netProfitUah: true,
        buyAmountUah: true,
        sellAmountUah: true,
        spreadPercent: true,
        roiPercent: true,
        totalCostUah: true,
      },
    }),
    prisma.trade.findMany({
      where,
      orderBy,
      take: DASHBOARD_RECENT_TRADES_LIMIT,
    }),
  ]);

  return {
    periodStats: aggregateTradePeriodStats(statRows),
    recentTrades: recentRows.map(mapTrade),
  };
}
