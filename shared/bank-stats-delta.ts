/** Fields of a trade that affect per-bank turnover counters. */
export type TradeForBankStats = {
  buyBankId: string;
  sellBankId: string;
  buyAmountUah: number;
  sellAmountUah: number;
  netProfitUah: number;
};

export type BankStatsDelta = {
  buyTurnoverUah: number;
  sellTurnoverUah: number;
  netProfitUah: number;
  tradesCount: number;
};

export function roundMoney(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

function bankIdsForTrade(trade: TradeForBankStats): string[] {
  if (trade.buyBankId === trade.sellBankId) {
    return [trade.buyBankId];
  }
  return [trade.buyBankId, trade.sellBankId];
}

/** Per-bank deltas when adding (+1) or removing (−1) one trade from aggregates. */
export function bankStatsDeltaForTrade(
  trade: TradeForBankStats,
  sign: 1 | -1,
): Map<string, BankStatsDelta> {
  const out = new Map<string, BankStatsDelta>();

  for (const bankId of bankIdsForTrade(trade)) {
    const buyTurnoverUah =
      trade.buyBankId === bankId ? roundMoney(trade.buyAmountUah * sign) : 0;
    const sellTurnoverUah =
      trade.sellBankId === bankId ? roundMoney(trade.sellAmountUah * sign) : 0;

    out.set(bankId, {
      buyTurnoverUah,
      sellTurnoverUah,
      netProfitUah: roundMoney(trade.netProfitUah * sign),
      tradesCount: sign,
    });
  }

  return out;
}

export function mergeBankStatsDeltaMaps(
  ...maps: Map<string, BankStatsDelta>[]
): Map<string, BankStatsDelta> {
  const merged = new Map<string, BankStatsDelta>();

  for (const map of maps) {
    for (const [bankId, delta] of map) {
      const prev = merged.get(bankId) ?? {
        buyTurnoverUah: 0,
        sellTurnoverUah: 0,
        netProfitUah: 0,
        tradesCount: 0,
      };
      merged.set(bankId, {
        buyTurnoverUah: roundMoney(prev.buyTurnoverUah + delta.buyTurnoverUah),
        sellTurnoverUah: roundMoney(prev.sellTurnoverUah + delta.sellTurnoverUah),
        netProfitUah: roundMoney(prev.netProfitUah + delta.netProfitUah),
        tradesCount: prev.tradesCount + delta.tradesCount,
      });
    }
  }

  return merged;
}
