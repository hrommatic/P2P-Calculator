/** Catalog bank for cardless P2P (unlimited turnover tracking). */
export const WITHOUT_CARDS_BANK_CODE = "without_cards";
export const WITHOUT_CARDS_BANK_ID = "gb_without_cards";

export function isWithoutCardsBankCode(
  code: string | null | undefined,
): boolean {
  return (code ?? "").trim().toLowerCase() === WITHOUT_CARDS_BANK_CODE;
}
