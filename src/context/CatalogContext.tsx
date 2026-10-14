import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api } from "../services/api";
import type { Exchange, GlobalBank, UserBank } from "../types";
import { useAuth } from "./AuthContext";

type CatalogContextValue = {
  banks: UserBank[];
  globalBanks: GlobalBank[];
  exchanges: Exchange[];
  catalogReady: boolean;
  refreshCatalog: (sync?: boolean) => Promise<void>;
  setBanksLocal: React.Dispatch<React.SetStateAction<UserBank[]>>;
};

const CatalogContext = createContext<CatalogContextValue | undefined>(
  undefined,
);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [banks, setBanks] = useState<UserBank[]>([]);
  const [globalBanks, setGlobalBanks] = useState<GlobalBank[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const refreshGenRef = useRef(0);
  const catalogAbortRef = useRef<AbortController | null>(null);

  const refreshCatalog = useCallback(async (sync?: boolean) => {
    catalogAbortRef.current?.abort();
    const controller = new AbortController();
    catalogAbortRef.current = controller;
    const generation = ++refreshGenRef.current;

    try {
      const catalog = await api.getCatalog(sync, controller.signal);
      if (generation !== refreshGenRef.current) return;
      setBanks(catalog.banks);
      setGlobalBanks(catalog.globalBanks);
      setExchanges(catalog.exchanges);
      setCatalogReady(true);
    } catch (err) {
      if (controller.signal.aborted) return;
      throw err;
    }
  }, []);

  useEffect(() => {
    if (!user) {
      catalogAbortRef.current?.abort();
      refreshGenRef.current += 1;
      setBanks([]);
      setGlobalBanks([]);
      setExchanges([]);
      setCatalogReady(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await refreshCatalog();
      } catch (err) {
        if (!cancelled) console.error("Failed to load catalog:", err);
      }
    })();
    return () => {
      cancelled = true;
      catalogAbortRef.current?.abort();
    };
  }, [user?.id, refreshCatalog]);

  return (
    <CatalogContext.Provider
      value={{
        banks,
        globalBanks,
        exchanges,
        catalogReady,
        refreshCatalog,
        setBanksLocal: setBanks,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
};

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error("useCatalog must be used within CatalogProvider");
  }
  return ctx;
}
