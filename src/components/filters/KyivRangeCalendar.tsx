import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  daysInMonth,
  formatMonthYearUk,
  getKyivYmd,
  mondayFirstWeekday,
  ymdFromParts,
} from '../../lib/kyiv-dates';
import {
  clampRangeYmd,
  type PeriodFilterState,
  viewMonthFromPeriod,
} from '../../lib/period-filter';

type Props = {
  value: PeriodFilterState;
  onConfirm: (next: PeriodFilterState) => void;
  onClose: () => void;
  resetLabel: string;
};

const WEEKDAYS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'НД'];

export const KyivRangeCalendar: React.FC<Props> = ({
  value,
  onConfirm,
  onClose,
  resetLabel,
}) => {
  const initialView = viewMonthFromPeriod(value);
  const [viewYear, setViewYear] = useState(initialView.year);
  const [viewMonth, setViewMonth] = useState(initialView.month);

  const [draftFrom, setDraftFrom] = useState<string | null>(() =>
    value.kind === 'range' ? value.dateFrom : null,
  );
  const [draftTo, setDraftTo] = useState<string | null>(() =>
    value.kind === 'range' ? value.dateTo : null,
  );

  useEffect(() => {
    const v = viewMonthFromPeriod(value);
    setViewYear(v.year);
    setViewMonth(v.month);
    if (value.kind === 'range') {
      setDraftFrom(value.dateFrom);
      setDraftTo(value.dateTo);
    }
  }, [value]);

  const monthCells = useMemo(() => {
    const total = daysInMonth(viewYear, viewMonth);
    const firstWd = mondayFirstWeekday(viewYear, viewMonth, 1);
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstWd; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const shiftMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    setViewYear(y);
    setViewMonth(m);
  };

  const handleDayClick = (day: number) => {
    const ymd = ymdFromParts(viewYear, viewMonth, day);
    if (!draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(ymd);
      setDraftTo(null);
      return;
    }
    const { from, to } = clampRangeYmd(draftFrom, ymd);
    setDraftFrom(from);
    setDraftTo(to);
  };

  const isInRange = (ymd: string) => {
    if (!draftFrom) return false;
    const to = draftTo ?? draftFrom;
    return ymd >= draftFrom && ymd <= to;
  };

  const handleReset = () => {
    setDraftFrom(null);
    setDraftTo(null);
  };

  const handleConfirm = () => {
    if (!draftFrom) return;
    const to = draftTo ?? draftFrom;
    const { from, to: end } = clampRangeYmd(draftFrom, to);
    onConfirm({ kind: 'range', dateFrom: from, dateTo: end });
    onClose();
  };

  const todayYmd = getKyivYmd();

  return (
    <div
      className="kyiv-calendar w-[min(100vw-2rem,320px)] rounded-2xl border border-slate-700/80 bg-[#0f1419] text-white shadow-2xl p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold capitalize">
          {formatMonthYearUk(viewYear, viewMonth)}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="p-1.5 rounded-lg text-sky-500 hover:bg-slate-800"
            aria-label="Попередній місяць"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="p-1.5 rounded-lg text-sky-500 hover:bg-slate-800"
            aria-label="Наступний місяць"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-slate-500 font-semibold mb-2 text-center">
        {WEEKDAYS.map(w => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {monthCells.map((day, idx) => {
          if (day === null) {
            return <div key={`e-${idx}`} className="h-9" />;
          }
          const ymd = ymdFromParts(viewYear, viewMonth, day);
          const selected = draftFrom === ymd || draftTo === ymd;
          const inRange = isInRange(ymd);
          const isToday = ymd === todayYmd;
          return (
            <button
              key={ymd}
              type="button"
              onClick={() => handleDayClick(day)}
              className={`h-9 rounded-full text-sm font-medium transition-colors ${
                selected
                  ? 'bg-sky-600 text-white'
                  : inRange
                    ? 'bg-sky-950/80 text-sky-300'
                    : isToday
                      ? 'text-sky-400'
                      : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleReset}
          className="flex-1 py-3 rounded-xl bg-slate-800/90 text-sm font-semibold text-slate-200 hover:bg-slate-700"
        >
          {resetLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!draftFrom}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-40 disabled:pointer-events-none shrink-0"
          aria-label="Застосувати"
        >
          <Check className="w-6 h-6" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
