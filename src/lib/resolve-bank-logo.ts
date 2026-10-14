import type { GlobalBank, UserBank } from "../types";

export function resolveBankLogoSvg(
  bank: Pick<UserBank, "logoSvg" | "globalBankId">,
  globalBanks?: GlobalBank[],
): string | undefined {
  if (bank.globalBankId && globalBanks?.length) {
    const fromCatalog = globalBanks.find((g) => g.id === bank.globalBankId)?.logoSvg;
    if (fromCatalog) return fromCatalog;
  }
  return bank.logoSvg;
}
