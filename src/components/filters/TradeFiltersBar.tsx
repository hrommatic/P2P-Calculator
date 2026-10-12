import React, { useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Plus, X } from 'lucide-react';
import type { Exchange, UserBank } from '../../types';
import type { TradeFilterId } from './useFilterLayout';

type FilterValues = {
  search: string;
  bankId: string;
  exchange: string;
  sort: string;
};

type Props = {
  order: TradeFilterId[];
  missing: TradeFilterId[];
  onMove: (id: TradeFilterId, dir: -1 | 1) => void;
  onAdd: (id: TradeFilterId) => void;
  onRemove: (id: TradeFilterId) => void;
  values: FilterValues;
  onChange: (patch: Partial<FilterValues>) => void;
  banks: UserBank[];
  exchanges: Exchange[];
  labels: Record<TradeFilterId, string>;
  sortLabels: Record<string, string>;
  searchPlaceholder: string;
  allBanksLabel: string;
  allExchangesLabel: string;
  addFilterLabel: string;
};

export const TradeFiltersBar: React.FC<Props> = ({
  order,
  missing,
  onMove,
  onAdd,
  onRemove,
  values,
  onChange,
  banks,
  exchanges,
  labels,
  sortLabels,
  searchPlaceholder,
  allBanksLabel,
  allExchangesLabel,
  addFilterLabel,
}) => {
  const [addOpen, setAddOpen] = useState(false);

  const renderField = (id: TradeFilterId) => {
    if (id === 'search') {
      return (
        <input
          type="text"
          value={values.search}
          onChange={e => onChange({ search: e.target.value })}
          placeholder={searchPlaceholder}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        />
      );
    }
    if (id === 'bank') {
      return (
        <select
          value={values.bankId}
          onChange={e => onChange({ bankId: e.target.value })}
          className="select-field w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
        >
          <option value="all">{allBanksLabel}</option>
          {banks.map(b => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      );
    }
    if (id === 'exchange') {
      return (
        <select
          value={values.exchange}
          onChange={e => onChange({ exchange: e.target.value })}
          className="select-field w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
        >
          <option value="all">{allExchangesLabel}</option>
          {exchanges.map(ex => (
            <option key={ex.id} value={ex.name}>
              {ex.name}
            </option>
          ))}
        </select>
      );
    }
    if (id === 'sort') {
      return (
        <select
          value={values.sort}
          onChange={e => onChange({ sort: e.target.value })}
          className="select-field w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
        >
          {Object.entries(sortLabels).map(([val, lab]) => (
            <option key={val} value={val}>
              {lab}
            </option>
          ))}
        </select>
      );
    }
    return null;
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2">
        {order.map((id, index) => (
          <div
            key={id}
            className="flex items-stretch gap-1.5 bg-slate-50/80 dark:bg-slate-900/40 rounded-lg p-1.5 border border-slate-200/80 dark:border-slate-800"
          >
            <div className="flex flex-col justify-center gap-0.5 shrink-0">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMove(id, -1)}
                className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-25"
                aria-label="Вище"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <GripVertical className="w-3.5 h-3.5 text-slate-500 mx-auto" />
              <button
                type="button"
                disabled={index === order.length - 1}
                onClick={() => onMove(id, 1)}
                className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-25"
                aria-label="Нижче"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 px-0.5">
                {labels[id]}
              </div>
              {renderField(id)}
            </div>
            {order.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(id)}
                className="shrink-0 p-2 text-slate-400 hover:text-rose-500 self-center"
                aria-label="Прибрати фільтр"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {missing.length > 0 && (
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setAddOpen(v => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg border border-dashed border-slate-400 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400"
          >
            <Plus className="w-3.5 h-3.5" />
            {addFilterLabel}
          </button>
          {addOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-30"
                aria-label="Закрити"
                onClick={() => setAddOpen(false)}
              />
              <div className="absolute left-0 top-full mt-1 z-40 min-w-[160px] py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                {missing.map(id => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      onAdd(id);
                      setAddOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {labels[id]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
