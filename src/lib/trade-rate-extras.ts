import type { Trade } from "../types";

export type TradeRateExtras = {
  avgBuyRate: number;
  avgSellRate: number;
  minBuyRate: number;
  maxSellRate: number;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function aggregateTradeRateExtras(trades: Trade[]): TradeRateExtras {
  if (trades.length === 0) {
    return { avgBuyRate: 0, avgSellRate: 0, minBuyRate: 0, maxSellRate: 0 };
  }

  let sumBuy = 0;
  let sumSell = 0;
  let minBuy = Infinity;
  let maxSell = -Infinity;

  for (const t of trades) {
    sumBuy += t.buyRate;
    sumSell += t.sellRate;
    if (t.buyRate < minBuy) minBuy = t.buyRate;
    if (t.sellRate > maxSell) maxSell = t.sellRate;
  }

  return {
    avgBuyRate: round2(sumBuy / trades.length),
    avgSellRate: round2(sumSell / trades.length),
    minBuyRate: minBuy === Infinity ? 0 : round2(minBuy),
    maxSellRate: maxSell === -Infinity ? 0 : round2(maxSell),
  };
}
