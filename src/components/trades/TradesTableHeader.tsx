import React from "react";

type TranslateFn = (key: string) => string;

type Props = {
  t: TranslateFn;
  variant: "dashboard" | "history";
};

export const TradesTableHeader: React.FC<Props> = ({ t, variant }) => (
  <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
    <tr>
      <th className="py-3 px-4">{t("tradeColDateTime")}</th>
      <th className="py-3 px-4">{t("tradeColBuy")}</th>
      <th className="py-3 px-4">{t("tradeColBuyBank")}</th>
      <th className="py-3 px-4 text-right">{t("tradeColBuyRate")}</th>
      <th className="py-3 px-4 text-right">{t("tradeColBuyAmount")}</th>
      <th className="py-3 px-4">{t("tradeColSell")}</th>
      <th className="py-3 px-4">{t("tradeColSellBank")}</th>
      <th className="py-3 px-4 text-right">{t("tradeColSellRate")}</th>
      <th className="py-3 px-4 text-right">{t("tradeColSellAmount")}</th>
      <th className="py-3 px-4 text-right">{t("tradeColCommissions")}</th>
      <th className="py-3 px-4 text-right">{t("netProfit")}</th>
      {variant === "dashboard" ? (
        <th className="py-3 px-4 text-right">{t("tradeColSpreadPct")}</th>
      ) : (
        <>
          <th className="py-3 px-4 text-right">{t("tradeColRoiSpread")}</th>
          <th className="py-3 px-4 text-center">{t("tradeColActions")}</th>
        </>
      )}
    </tr>
  </thead>
);
