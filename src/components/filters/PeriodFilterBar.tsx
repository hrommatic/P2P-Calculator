import React, { useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { KyivRangeCalendar } from './KyivRangeCalendar';
import { periodLabelUk, type PeriodFilterState, type PeriodPreset } from '../../lib/period-filter';

type Props = {
  value: PeriodFilterState;
  onChange: (next: PeriodFilterState) => void;
  t: (key: string) => string;
  presetLabels: Record<PeriodPreset, string>;
  compact?: boolean;
};

const PRESETS: PeriodPreset[] = ['all', 'today', 'yesterday', 'week', 'month'];

export const PeriodFilterBar: React.FC<Props> = ({
  value,
  onChange,
  t,
  presetLabels,
  compact,
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const activePreset = value.kind === 'preset' ? value.preset : null;

  return (
    <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full" ref={wrapRef}>
      <div className="max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <div className="inline-flex items-center gap-0.5 sm:gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
        {PRESETS.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => {
              onChange({ kind: 'preset', preset: p });
              setOpen(false);
            }}
            className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activePreset === p
                ? 'bg-white dark:bg-[#1c2541] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {presetLabels[p]}
          </button>
        ))}
        </div>
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg border transition-colors ${
            value.kind !== 'preset'
              ? 'border-sky-500/60 bg-sky-950/30 text-sky-300'
              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-sky-500/40'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-sky-500" />
          {!compact && <span>{t('calendarPick')}</span>}
          {value.kind !== 'preset' && (
            <span className="font-mono tabular-nums text-xs opacity-90">
              {periodLabelUk(value)}
            </span>
          )}
        </button>
        {open && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              aria-label="Закрити"
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 top-full mt-2 z-50">
              <KyivRangeCalendar
                value={value}
                onConfirm={onChange}
                onClose={() => setOpen(false)}
                resetLabel={t('reset')}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
