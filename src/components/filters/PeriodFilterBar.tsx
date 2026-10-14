import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const PRESETS: PeriodPreset[] = ["today", "yesterday", "week", "month"];

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
  const rangeActive = value.kind !== "preset";

  const customRangeLabel =
    value.kind !== "preset" ? periodLabelUk(value) : t("filterRange");

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

  const rangeGroupActive = rangeActive || open;

  const filterItemClass = (active: boolean) =>
    `inline-flex min-w-0 flex-1 basis-0 items-center justify-center rounded-md px-1 py-2 text-[12px] font-bold leading-none whitespace-nowrap transition-colors sm:basis-auto sm:px-3 sm:py-1.5 sm:text-[14px] sm:font-semibold ${
      active
        ? "bg-white text-slate-900 shadow-xs dark:bg-[#0f1829] dark:text-white dark:shadow-none max-sm:font-extrabold"
        : "text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-700/40"
    }`;

  return (
    <div className="min-w-0 max-w-full w-full" ref={wrapRef}>
      <div className="hide-scrollbar flex w-full min-w-0 flex-nowrap items-stretch gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-800 sm:inline-flex sm:w-auto">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              onChange({ kind: "preset", preset: p });
              closeCalendar();
            }}
            className={filterItemClass(activePreset === p)}
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
          className={filterItemClass(rangeGroupActive)}
        >
          {value.kind !== "preset" ? customRangeLabel : t("filterRange")}
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
              aria-label={t("filterRange")}
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
