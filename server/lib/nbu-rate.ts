
let cache: { rate: number; fetchedAt: number } | null = null;
const CACHE_MS = 60 * 60 * 1000;
const NBU_USD_URL =
  'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json';

export async function getNbuUsdUahRate(): Promise<number> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    return cache.rate;
  }

  const timeoutMs = process.env.NODE_ENV === 'development' ? 3000 : 8000;
  const res = await fetch(NBU_USD_URL, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`NBU HTTP ${res.status}`);
  }

  const data = (await res.json()) as { rate?: number }[];
  const rate = Number(data[0]?.rate);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('NBU rate missing');
  }

  cache = { rate, fetchedAt: Date.now() };
  return rate;
}
