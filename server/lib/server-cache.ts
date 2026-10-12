type CacheEntry<T> = { at: number; value: T };

export function createTTLCache<T>(ttlMs: number) {
  let entry: CacheEntry<T> | null = null;

  return {
    get(): T | null {
      if (!entry || Date.now() - entry.at >= ttlMs) return null;
      return entry.value;
    },
    set(value: T) {
      entry = { at: Date.now(), value };
    },
    clear() {
      entry = null;
    },
  };
}
