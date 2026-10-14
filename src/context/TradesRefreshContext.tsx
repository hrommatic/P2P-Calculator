import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type TradesRefreshContextValue = {
  /** Increments when trades are created, updated, or deleted. */
  tradesRevision: number;
  bumpTradesRefresh: () => void;
};

const TradesRefreshContext = createContext<TradesRefreshContextValue | undefined>(
  undefined,
);

export const TradesRefreshProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tradesRevision, setTradesRevision] = useState(0);

  const bumpTradesRefresh = useCallback(() => {
    setTradesRevision((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ tradesRevision, bumpTradesRefresh }),
    [tradesRevision, bumpTradesRefresh],
  );

  return (
    <TradesRefreshContext.Provider value={value}>
      {children}
    </TradesRefreshContext.Provider>
  );
};

export function useTradesRefresh(): TradesRefreshContextValue {
  const ctx = useContext(TradesRefreshContext);
  if (!ctx) {
    throw new Error("useTradesRefresh must be used within TradesRefreshProvider");
  }
  return ctx;
}
