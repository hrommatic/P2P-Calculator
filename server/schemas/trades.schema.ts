export type CommissionType = 'percent' | 'fixed_uah' | 'fixed_usdt';

export interface Trade {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  buyExchange: string;
  buyBankId: string;
  buyBankName: string;
  buyRate: number;
  buyAmountUah: number;
  buyCommission: number;
  buyCommissionType: CommissionType;
  buyUsdtAmount: number;
  sellExchange: string;
  sellBankId: string;
  sellBankName: string;
  sellRate: number;
  sellUsdtAmount: number;
  sellAmountUah: number;
  sellCommission: number;
  sellCommissionType: CommissionType;
  extraExpensesUah: number;
  totalCostUah: number;
  grossRevenueUah: number;
  totalCommissionsUah: number;
  grossProfitUah: number;
  netProfitUah: number;
  roiPercent: number;
  spreadPerUnit: number;
  spreadPercent: number;
  notes?: string;
}
