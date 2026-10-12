import type { Trade } from '../types';

export type TradePeriodStats = {
  profit: number;
  spreadPercent: number;
  roiPercent: number;
  totalTurnover: number;
  tradesCount: number;
};

export function aggregateTradePeriodStats(trades: Trade[]): TradePeriodStats {
  let profit = 0;
  let buyTurnover = 0;
  let sellTurnover = 0;
  let spreadWeightSum = 0;
  let spreadWeighted = 0;
  let roiWeightSum = 0;
  let roiWeighted = 0;

  for (const t of trades) {
    profit += t.netProfitUah;
    buyTurnover += t.buyAmountUah;
    sellTurnover += t.sellAmountUah;
    spreadWeightSum += t.buyAmountUah;
    spreadWeighted += t.spreadPercent * t.buyAmountUah;
    roiWeightSum += t.totalCostUah;
    roiWeighted += t.roiPercent * t.totalCostUah;
  }

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  return {
    profit: round2(profit),
    spreadPercent:
      spreadWeightSum > 0 ? round2(spreadWeighted / spreadWeightSum) : 0,
    roiPercent: roiWeightSum > 0 ? round2(roiWeighted / roiWeightSum) : 0,
    totalTurnover: round2(buyTurnover + sellTurnover),
    tradesCount: trades.length,
  };
}
