/**
 * Precise P2P calculation logic avoiding floating-point precision pitfalls
 */

export interface CalculationInput {
  buyRate: number;
  buyAmountUah?: number;
  buyUsdtAmount?: number;
  buyCommission?: number;
  buyCommissionType?: 'percent' | 'fixed_uah' | 'fixed_usdt';

  sellRate: number;
  sellUsdtAmount?: number;
  sellAmountUah?: number;
  sellCommission?: number;
  sellCommissionType?: 'percent' | 'fixed_uah' | 'fixed_usdt';

  extraExpensesUah?: number;
}

export interface CalculationResult {
  buyRate: number;
  buyAmountUah: number;
  buyUsdtAmount: number;
  buyCommissionUah: number;

  sellRate: number;
  sellUsdtAmount: number;
  sellAmountUah: number;
  sellCommissionUah: number;

  extraExpensesUah: number;

  totalCostUah: number;
  grossRevenueUah: number;
  totalCommissionsUah: number;
  grossProfitUah: number;
  netProfitUah: number;
  roiPercent: number;
  spreadPerUnit: number;
  spreadPercent: number;
}

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

function round4(val: number): number {
  return Math.round((val + Number.EPSILON) * 10000) / 10000;
}

export function calculateTrade(input: CalculationInput): CalculationResult {
  const buyRate = Math.max(0.0001, Number(input.buyRate) || 0);
  const sellRate = Math.max(0.0001, Number(input.sellRate) || 0);

  // Determine Buy amounts
  let buyAmountUah = Number(input.buyAmountUah) || 0;
  let buyUsdtAmount = Number(input.buyUsdtAmount) || 0;

  if (buyAmountUah > 0 && (!buyUsdtAmount || buyUsdtAmount === 0)) {
    buyUsdtAmount = buyAmountUah / buyRate;
  } else if (buyUsdtAmount > 0 && (!buyAmountUah || buyAmountUah === 0)) {
    buyAmountUah = buyUsdtAmount * buyRate;
  } else if (buyAmountUah === 0 && buyUsdtAmount === 0) {
    buyAmountUah = 10000;
    buyUsdtAmount = buyAmountUah / buyRate;
  }

  // Calculate Buy Commission
  const buyCommVal = Number(input.buyCommission) || 0;
  const buyCommType = input.buyCommissionType || 'percent';
  let buyCommissionUah = 0;
  if (buyCommType === 'percent') {
    buyCommissionUah = (buyAmountUah * buyCommVal) / 100;
  } else if (buyCommType === 'fixed_uah') {
    buyCommissionUah = buyCommVal;
  } else if (buyCommType === 'fixed_usdt') {
    buyCommissionUah = buyCommVal * buyRate;
  }

  // Determine Sell amounts (by default, sells the USDT bought)
  let sellUsdtAmount = Number(input.sellUsdtAmount) || 0;
  let sellAmountUah = Number(input.sellAmountUah) || 0;

  if (sellUsdtAmount === 0 && sellAmountUah === 0) {
    sellUsdtAmount = buyUsdtAmount;
    sellAmountUah = sellUsdtAmount * sellRate;
  } else if (sellUsdtAmount > 0 && sellAmountUah === 0) {
    sellAmountUah = sellUsdtAmount * sellRate;
  } else if (sellAmountUah > 0 && sellUsdtAmount === 0) {
    sellUsdtAmount = sellAmountUah / sellRate;
  }

  // Calculate Sell Commission
  const sellCommVal = Number(input.sellCommission) || 0;
  const sellCommType = input.sellCommissionType || 'percent';
  let sellCommissionUah = 0;
  if (sellCommType === 'percent') {
    sellCommissionUah = (sellAmountUah * sellCommVal) / 100;
  } else if (sellCommType === 'fixed_uah') {
    sellCommissionUah = sellCommVal;
  } else if (sellCommType === 'fixed_usdt') {
    sellCommissionUah = sellCommVal * sellRate;
  }

  const extraExpensesUah = Number(input.extraExpensesUah) || 0;

  const totalCostUah = buyAmountUah + buyCommissionUah;
  const grossRevenueUah = sellAmountUah;
  const totalCommissionsUah = buyCommissionUah + sellCommissionUah + extraExpensesUah;
  const grossProfitUah = grossRevenueUah - buyAmountUah;
  const netProfitUah = grossRevenueUah - totalCostUah - sellCommissionUah - extraExpensesUah;

  const roiPercent = totalCostUah > 0 ? (netProfitUah / totalCostUah) * 100 : 0;
  const spreadPerUnit = sellRate - buyRate;
  const spreadPercent = buyRate > 0 ? (spreadPerUnit / buyRate) * 100 : 0;

  return {
    buyRate: round4(buyRate),
    buyAmountUah: round2(buyAmountUah),
    buyUsdtAmount: round4(buyUsdtAmount),
    buyCommissionUah: round2(buyCommissionUah),

    sellRate: round4(sellRate),
    sellUsdtAmount: round4(sellUsdtAmount),
    sellAmountUah: round2(sellAmountUah),
    sellCommissionUah: round2(sellCommissionUah),

    extraExpensesUah: round2(extraExpensesUah),

    totalCostUah: round2(totalCostUah),
    grossRevenueUah: round2(grossRevenueUah),
    totalCommissionsUah: round2(totalCommissionsUah),
    grossProfitUah: round2(grossProfitUah),
    netProfitUah: round2(netProfitUah),
    roiPercent: round2(roiPercent),
    spreadPerUnit: round2(spreadPerUnit),
    spreadPercent: round2(spreadPercent),
  };
}
