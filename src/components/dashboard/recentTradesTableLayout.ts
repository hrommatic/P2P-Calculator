import { useLayoutEffect, useRef, useState } from "react";

/**
 * The recent-trades table is often only a little wider than the screen, so at
 * the end of a horizontal scroll the right side of "Дата / Час" (the time)
 * still peeks in from the left. Widen the other columns just enough that
 * scrolling to the end moves the whole date column off-screen.
 */
export function widthsThatHideDateColumn(
  natural: number[],
  containerWidth: number,
): number[] | null {
  if (natural.length < 2 || containerWidth <= 0) return null;
  const dateWidth = natural[0];
  if (dateWidth < 1) return null;
  const others = natural.slice(1).reduce((sum, width) => sum + width, 0);
  const deficit = containerWidth - others;
  if (dateWidth + others <= containerWidth + 0.5 || deficit <= 0.5) {
    return null;
  }

  const extra = deficit + 2;
  const recipients = natural.length - 1;
  const share = extra / recipients;
  return natural.map((width, index) =>
    index === 0 ? width : width + share,
  );
}

function widthsEqual(current: number[] | null, next: number[] | null): boolean {
  if (current === next) return true;
  if (!current || !next || current.length !== next.length) return false;
  return current.every((width, index) => Math.abs(width - next[index]) < 0.5);
}

function measureNaturalColumns(table: HTMLTableElement): number[] {
  const cols = [...table.querySelectorAll("colgroup col")] as HTMLElement[];
  const savedColWidths = cols.map((col) => col.style.width);
  const savedLayout = table.style.tableLayout;
  const savedWidth = table.style.width;
  const savedMinWidth = table.style.minWidth;

  for (const col of cols) col.style.width = "";
  table.style.tableLayout = "auto";
  table.style.width = "max-content";
  table.style.minWidth = "0px";

  const cells = [
    ...table.querySelectorAll("thead tr:first-child > th"),
  ] as HTMLElement[];
  const tableRect = table.getBoundingClientRect();
  const widths = cells.map((cell, index) => {
    const left = cell.getBoundingClientRect().left;
    const right =
      index < cells.length - 1
        ? cells[index + 1].getBoundingClientRect().left
        : tableRect.right;
    return Math.max(0, right - left);
  });

  cols.forEach((col, index) => {
    col.style.width = savedColWidths[index] ?? "";
  });
  table.style.tableLayout = savedLayout;
  table.style.width = savedWidth;
  table.style.minWidth = savedMinWidth;
  return widths;
}

export function useRecentTradesTableLayout(enabled: boolean, layoutKey: string) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const naturalRef = useRef<number[] | null>(null);
  const [columnWidths, setColumnWidths] = useState<number[] | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      naturalRef.current = null;
      setColumnWidths((current) => (current == null ? current : null));
      return;
    }

    const scroller = scrollRef.current;
    if (!scroller) return;

    const measure = () => {
      const table = scroller.querySelector("table");
      if (!table || scroller.clientWidth < 1) return;
      const scrollLeft = scroller.scrollLeft;
      const widths = measureNaturalColumns(table);
      if (scroller.scrollLeft !== scrollLeft) scroller.scrollLeft = scrollLeft;
      if (!widths.some((width) => width > 1)) return;
      naturalRef.current = widths;
    };

    const apply = () => {
      const natural = naturalRef.current;
      if (!natural?.length || scroller.clientWidth < 1) return;
      const next = widthsThatHideDateColumn(natural, scroller.clientWidth);
      setColumnWidths((current) => (widthsEqual(current, next) ? current : next));
    };

    measure();
    apply();

    const observer = new ResizeObserver(() => {
      measure();
      apply();
    });
    observer.observe(scroller);

    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (cancelled) return;
      measure();
      apply();
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [enabled, layoutKey]);

  return { scrollRef, columnWidths };
}
