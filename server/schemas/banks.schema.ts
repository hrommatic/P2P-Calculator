export interface GlobalBank {
  id: string;
  name: string;
  code: string;
  defaultLimitUah: number;
  color: string;
  logoSvg?: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserBank {
  id: string;
  userId: string;
  globalBankId?: string;
  name: string;
  turnoverLimitUah: number;
  initialTurnoverUah: number;
  buyTurnoverUah: number;
  sellTurnoverUah: number;
  netProfitUah: number;
  tradesCount: number;
  notes?: string;
  color?: string;
  logoSvg?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Exchange {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
}
