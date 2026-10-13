import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays } from "lucide-react";
import { KyivRangeCalendar } from "./KyivRangeCalendar";
import {
  periodLabelUk,
  type PeriodFilterState,
  type PeriodPreset,
} from "../../lib/period-filter";

type Props = {
  value: PeriodFilterState;
  onChange: (next: PeriodFilterState) => void;
  t: (key: string) => string;
  presetLabels: Record<PeriodPreset, string>;
};

const PRESETS: PeriodPreset[] = ["all", "today", "yesterday", "week", "month"];

const POPOVER_MAX_WIDTH = 320;

function popoverCoords(anchor: DOMRect): { top: number; left: number } {
  const width = Math.min(window.innerWidth - 16, POPOVER_MAX_WIDTH);
  let left = anchor.right - width;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  return { top: anchor.bottom + 8, left };
}

export const PeriodFilterBar: React.FC<Props> = ({
  value,
  onChange,
  t,
  presetLabels,
}) => {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const calendarBtnRef = useRef<HTMLButtonElement>(null);

  const activePreset = value.kind === "preset" ? value.preset : null;

  const customRangeLabel =
    value.kind !== "preset" ? periodLabelUk(value) : t("calendarPick");

  const syncPopoverPos = useCallback(() => {
    const el = calendarBtnRef.current;
    if (!el) return;
    setPopoverPos(popoverCoords(el.getBoundingClientRect()));
  }, []);

  const openCalendar = useCallback(() => {
    syncPopoverPos();
    setOpen(true);
  }, [syncPopoverPos]);

  const closeCalendar = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    syncPopoverPos();
    const onReposition = () => syncPopoverPos();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, syncPopoverPos]);

  const presetBtnClass = (active: boolean) =>
    `max-sm:w-full max-sm:justify-center max-sm:px-1 max-sm:py-2 max-sm:text-[11px] max-sm:leading-tight max-sm:whitespace-normal sm:px-3 sm:py-1.5 sm:text-sm sm:whitespace-nowrap px-2 py-1.5 text-xs font-semibold rounded-md transition-colors shrink-0 ${
      active
        ? "bg-white dark:bg-[#1c2541] text-slate-900 dark:text-white shadow-xs"
        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
    }`;

  return (
    <div className="min-w-0 max-w-full w-full" ref={wrapRef}>
      <div className="w-full max-w-full rounded-lg bg-slate-100 p-1 dark:bg-slate-800 max-sm:grid max-sm:grid-cols-3 max-sm:gap-0.5 sm:inline-flex sm:w-auto sm:items-center sm:gap-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              onChange({ kind: "preset", preset: p });
              closeCalendar();
            }}
            className={`inline-flex items-center ${presetBtnClass(activePreset === p)}`}
          >
            {presetLabels[p]}
          </button>
        ))}

        <button
          ref={calendarBtnRef}
          type="button"
          onClick={() => (open ? closeCalendar() : openCalendar())}
          title={customRangeLabel}
          aria-label={customRangeLabel}
          aria-expanded={open}
          className={`inline-flex items-center justify-center rounded-md transition-colors shrink-0 max-sm:w-full max-sm:py-2 p-1.5 sm:px-2 sm:py-1.5 ${
            value.kind !== "preset" || open
              ? "bg-white dark:bg-[#1c2541] text-sky-500 dark:text-sky-400 shadow-xs"
              : "text-slate-500 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400"
          }`}
        >
          <CalendarDays className="w-4 h-4" aria-hidden />
        </button>
      </div>

      {open &&
        popoverPos &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default bg-transparent"
              aria-label="Закрити"
              onClick={closeCalendar}
            />
            <div
              className="fixed z-50"
              style={{ top: popoverPos.top, left: popoverPos.left }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={t("calendarPick")}
            >
              <KyivRangeCalendar
                value={value}
                onConfirm={onChange}
                onClose={closeCalendar}
                resetLabel={t("reset")}
              />
            </div>
          </>,
          document.body,
        )}
    </div>
  );
};
