import { useCallback, useEffect, useState } from 'react';

export type TradeFilterId = 'search' | 'bank' | 'exchange' | 'sort';

const ALL_FILTERS: TradeFilterId[] = ['search', 'bank', 'exchange', 'sort'];

export function useFilterLayout(storageKey: string, defaultOrder: TradeFilterId[]) {
  const [order, setOrder] = useState<TradeFilterId[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return defaultOrder;
      const parsed = JSON.parse(raw) as TradeFilterId[];
      if (!Array.isArray(parsed)) return defaultOrder;
      const valid = parsed.filter(id => ALL_FILTERS.includes(id));
      return valid.length > 0 ? valid : defaultOrder;
    } catch {
      return defaultOrder;
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(order));
  }, [storageKey, order]);

  const move = useCallback((id: TradeFilterId, dir: -1 | 1) => {
    setOrder(prev => {
      const i = prev.indexOf(id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const add = useCallback((id: TradeFilterId) => {
    setOrder(prev => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const remove = useCallback((id: TradeFilterId) => {
    setOrder(prev => (prev.length <= 1 ? prev : prev.filter(x => x !== id)));
  }, []);

  const missing = ALL_FILTERS.filter(id => !order.includes(id));

  return { order, move, add, remove, missing, setOrder };
}
