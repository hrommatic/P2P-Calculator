import React from 'react';
import type { Trade } from '../../types';

type Props = {
  trade: Trade;
  formatUah: (val: number) => string;
};

export const DashboardTradeRow = React.memo(function DashboardTradeRow({
  trade,
  formatUah,
}: Props) {
  const isProfit = trade.netProfitUah >= 0;
  const created = new Date(trade.createdAt);

  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
        {created.toLocaleDateString('uk-UA', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
        })}{' '}
        {created.toLocaleTimeString('uk-UA', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </td>
      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
        {trade.buyExchange}
      </td>
      <td className="py-3 px-4">
        <span className="font-medium text-slate-900 dark:text-slate-200">
          {trade.buyBankName}
        </span>
      </td>
      <td className="py-3 px-4 text-right font-mono tabular-nums">
        {trade.buyRate.toFixed(2)}
      </td>
      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
        {formatUah(trade.buyAmountUah)}{' '}
        <span className="text-sm text-slate-400">₴</span>
      </td>
      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
        {trade.sellExchange}
      </td>
      <td className="py-3 px-4">
        <span className="font-medium text-slate-900 dark:text-slate-200">
          {trade.sellBankName}
        </span>
      </td>
      <td className="py-3 px-4 text-right font-mono tabular-nums">
        {trade.sellRate.toFixed(2)}
      </td>
      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
        {formatUah(trade.sellAmountUah)}{' '}
        <span className="text-sm text-slate-400">₴</span>
      </td>
      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
        {trade.totalCommissionsUah.toFixed(2)} ₴
      </td>
      <td
        className={`py-3 px-4 text-right font-mono tabular-nums font-bold ${
          isProfit
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400'
        }`}
      >
        {isProfit ? '+' : ''}
        {formatUah(trade.netProfitUah)} ₴
      </td>
      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-blue-600 dark:text-sky-400">
        +{trade.spreadPercent.toFixed(2)}%
      </td>
    </tr>
  );
});
