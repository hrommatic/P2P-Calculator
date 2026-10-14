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

  const filterItemClass = (active: boolean, iconOnly?: boolean) =>
    `inline-flex min-w-0 items-center justify-center rounded-md py-2 text-[13px] font-bold leading-none whitespace-nowrap transition-colors sm:py-1.5 sm:text-[15px] sm:font-semibold ${
      iconOnly
        ? "shrink-0 px-1.5 sm:flex-none sm:px-2"
        : "flex-1 basis-0 px-1 sm:flex-none sm:basis-auto sm:px-3"
    } ${
      active
        ? "bg-white text-slate-900 shadow-xs dark:bg-[#0f1829] dark:text-white dark:shadow-none max-sm:font-extrabold"
        : "text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-700/40"
    } ${
      active && iconOnly
        ? "text-sky-500 dark:text-sky-400"
        : iconOnly
          ? "text-slate-600 hover:text-sky-500 dark:text-slate-300 dark:hover:text-sky-400"
          : ""
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
          type="button"
          onClick={() => (open ? closeCalendar() : openCalendar())}
          title={customRangeLabel}
          className={filterItemClass(rangeGroupActive)}
        >
          {t("filterRange")}
        </button>
        <span
          className="my-1 w-px shrink-0 self-stretch bg-slate-300 dark:bg-slate-600"
          aria-hidden
        />
        <button
          ref={calendarBtnRef}
          type="button"
          onClick={() => (open ? closeCalendar() : openCalendar())}
          title={customRangeLabel}
          aria-label={customRangeLabel}
          aria-expanded={open}
          className={filterItemClass(rangeGroupActive, true)}
        >
          <CalendarDays
            className="h-4 w-4 shrink-0 stroke-[2.5] sm:h-4 sm:w-4"
            aria-hidden
          />
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
