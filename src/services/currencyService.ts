import { SupportedCurrency } from "../types";

export interface NbpRateEntry {
  currency: string;
  code: string;
  mid: number;
}

export interface NbpTableResponse {
  table: string;
  no: string;
  effectiveDate: string;
  rates: NbpRateEntry[];
}

export interface RatesCache {
  effectiveDate: string;
  fetchedAt: string;
  tableNo: string;
  rates: Record<string, number>;
}

export const NBP_API_URL = "https://api.nbp.pl/api/exchangerates/tables/A/?format=json";
export const RATES_CACHE_KEY = "saldo_nbp_rates_v1";

export const FALLBACK_RATES: Record<SupportedCurrency, number> = {
  PLN: 1.0,
  EUR: 4.25,
  USD: 3.90,
  GBP: 5.00
};

export function getCachedRates(): RatesCache | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.rates && typeof parsed.rates === "object") {
      return parsed as RatesCache;
    }
  } catch (err) {
    console.warn("Failed to parse cached NBP rates:", err);
  }
  return null;
}

export function saveCachedRates(data: RatesCache): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to save NBP rates cache:", err);
  }
}

export async function fetchNbpRates(): Promise<RatesCache> {
  const response = await fetch(NBP_API_URL, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`NBP API error: HTTP ${response.status}`);
  }

  const data: NbpTableResponse[] = await response.json();
  if (!Array.isArray(data) || data.length === 0 || !Array.isArray(data[0].rates)) {
    throw new Error("Invalid NBP API response structure");
  }

  const table = data[0];
  const ratesMap: Record<string, number> = {
    PLN: 1.0
  };

  for (const entry of table.rates) {
    if (entry.code && typeof entry.mid === "number") {
      ratesMap[entry.code.toUpperCase()] = entry.mid;
    }
  }

  const cacheEntry: RatesCache = {
    effectiveDate: table.effectiveDate,
    fetchedAt: new Date().toISOString(),
    tableNo: table.no,
    rates: ratesMap
  };

  saveCachedRates(cacheEntry);
  return cacheEntry;
}

export async function getRatesWithFallback(maxAgeHours: number = 24): Promise<RatesCache> {
  const cached = getCachedRates();
  if (cached && cached.fetchedAt) {
    const ageMs = Date.now() - new Date(cached.fetchedAt).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    if (ageHours < maxAgeHours) {
      return cached;
    }
  }

  try {
    return await fetchNbpRates();
  } catch (err) {
    console.warn("Could not fetch fresh NBP rates, falling back to cache or defaults:", err);
    if (cached) {
      return cached;
    }

    return {
      effectiveDate: new Date().toISOString().split("T")[0],
      fetchedAt: new Date().toISOString(),
      tableNo: "FALLBACK",
      rates: { ...FALLBACK_RATES }
    };
  }
}

export function convertCurrency(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
  rates?: Record<string, number>
): number {
  if (from === to || amount === 0) {
    return amount;
  }

  const ratesMap = rates || FALLBACK_RATES;
  const fromRate = from === "PLN" ? 1.0 : (ratesMap[from] ?? FALLBACK_RATES[from] ?? 1.0);
  const toRate = to === "PLN" ? 1.0 : (ratesMap[to] ?? FALLBACK_RATES[to] ?? 1.0);

  // Convert to PLN first, then to target currency
  const amountInPln = amount * fromRate;
  const converted = amountInPln / toRate;

  return Math.round((converted + Number.EPSILON) * 100) / 100;
}
