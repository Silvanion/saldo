import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  convertCurrency,
  fetchNbpRates,
  getCachedRates,
  saveCachedRates,
  getRatesWithFallback,
  FALLBACK_RATES,
  RATES_CACHE_KEY,
  NBP_API_URL,
  RatesCache
} from "./currencyService";

// Polyfill localStorage for test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true
});

describe("currencyService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe("convertCurrency", () => {
    const mockRates = {
      PLN: 1.0,
      EUR: 4.30,
      USD: 4.00,
      GBP: 5.00
    };

    it("returns original amount when from and to currencies are identical", () => {
      expect(convertCurrency(150, "PLN", "PLN", mockRates)).toBe(150);
      expect(convertCurrency(99.99, "EUR", "EUR", mockRates)).toBe(99.99);
      expect(convertCurrency(0, "USD", "EUR", mockRates)).toBe(0);
    });

    it("converts from foreign currency to PLN correctly", () => {
      // 100 EUR * 4.30 = 430 PLN
      expect(convertCurrency(100, "EUR", "PLN", mockRates)).toBe(430);
      // 50 USD * 4.00 = 200 PLN
      expect(convertCurrency(50, "USD", "PLN", mockRates)).toBe(200);
      // 20 GBP * 5.00 = 100 PLN
      expect(convertCurrency(20, "GBP", "PLN", mockRates)).toBe(100);
    });

    it("converts from PLN to foreign currency correctly", () => {
      // 430 PLN / 4.30 = 100 EUR
      expect(convertCurrency(430, "PLN", "EUR", mockRates)).toBe(100);
      // 200 PLN / 4.00 = 50 USD
      expect(convertCurrency(200, "PLN", "USD", mockRates)).toBe(50);
      // 100 PLN / 5.00 = 20 GBP
      expect(convertCurrency(100, "PLN", "GBP", mockRates)).toBe(20);
    });

    it("converts cross-currencies correctly (e.g. USD to EUR)", () => {
      // 100 USD * 4.00 = 400 PLN -> 400 / 4.30 = 93.02325... -> 93.02 EUR
      expect(convertCurrency(100, "USD", "EUR", mockRates)).toBe(93.02);
      // 100 EUR * 4.30 = 430 PLN -> 430 / 4.00 = 107.5 USD
      expect(convertCurrency(100, "EUR", "USD", mockRates)).toBe(107.5);
      // 50 GBP * 5.00 = 250 PLN -> 250 / 4.00 = 62.5 USD
      expect(convertCurrency(50, "GBP", "USD", mockRates)).toBe(62.5);
    });

    it("uses FALLBACK_RATES when rates map is not provided", () => {
      // 100 EUR * 4.25 = 425 PLN
      expect(convertCurrency(100, "EUR", "PLN")).toBe(100 * FALLBACK_RATES.EUR);
    });
  });

  describe("getCachedRates & saveCachedRates", () => {
    it("returns null when cache is empty", () => {
      expect(getCachedRates()).toBeNull();
    });

    it("saves and retrieves rates from localStorage", () => {
      const mockCache: RatesCache = {
        effectiveDate: "2026-08-15",
        fetchedAt: new Date().toISOString(),
        tableNo: "150/A/NBP/2026",
        rates: { PLN: 1, EUR: 4.28, USD: 3.95, GBP: 5.05 }
      };

      saveCachedRates(mockCache);
      const retrieved = getCachedRates();
      expect(retrieved).toEqual(mockCache);
    });

    it("handles corrupted JSON gracefully and returns null", () => {
      localStorage.setItem(RATES_CACHE_KEY, "invalid-json-{}");
      expect(getCachedRates()).toBeNull();
    });
  });

  describe("fetchNbpRates", () => {
    it("fetches rates from NBP API, builds cache object, and stores it in localStorage", async () => {
      const mockApiResponse = [
        {
          table: "A",
          no: "158/A/NBP/2026",
          effectiveDate: "2026-08-14",
          rates: [
            { currency: "euro", code: "EUR", mid: 4.2750 },
            { currency: "dolar amerykański", code: "USD", mid: 3.9210 },
            { currency: "funt szterling", code: "GBP", mid: 5.0120 }
          ]
        }
      ];

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      } as Response);

      const result = await fetchNbpRates();

      expect(fetch).toHaveBeenCalledWith(NBP_API_URL, {
        headers: { Accept: "application/json" }
      });
      expect(result.tableNo).toBe("158/A/NBP/2026");
      expect(result.effectiveDate).toBe("2026-08-14");
      expect(result.rates.PLN).toBe(1.0);
      expect(result.rates.EUR).toBe(4.2750);
      expect(result.rates.USD).toBe(3.9210);
      expect(result.rates.GBP).toBe(5.0120);

      // Verify cached in localStorage
      const cached = getCachedRates();
      expect(cached?.tableNo).toBe("158/A/NBP/2026");
    });

    it("throws an error when HTTP status is not ok", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 503
      } as Response);

      await expect(fetchNbpRates()).rejects.toThrow("NBP API error: HTTP 503");
    });

    it("throws an error when response structure is invalid", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response);

      await expect(fetchNbpRates()).rejects.toThrow("Invalid NBP API response structure");
    });
  });

  describe("getRatesWithFallback", () => {
    it("returns fresh cached rates without calling fetch when cache is within maxAgeHours", async () => {
      const freshCache: RatesCache = {
        effectiveDate: "2026-08-15",
        fetchedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        tableNo: "150/A/NBP/2026",
        rates: { PLN: 1, EUR: 4.29, USD: 3.96, GBP: 5.04 }
      };
      saveCachedRates(freshCache);

      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const result = await getRatesWithFallback(24);
      expect(result).toEqual(freshCache);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("re-fetches rates when cache is older than maxAgeHours", async () => {
      const staleCache: RatesCache = {
        effectiveDate: "2026-08-10",
        fetchedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(), // 30 hours ago
        tableNo: "140/A/NBP/2026",
        rates: { PLN: 1, EUR: 4.20, USD: 3.80, GBP: 4.90 }
      };
      saveCachedRates(staleCache);

      const mockApiResponse = [
        {
          table: "A",
          no: "159/A/NBP/2026",
          effectiveDate: "2026-08-15",
          rates: [{ currency: "euro", code: "EUR", mid: 4.31 }]
        }
      ];

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse
      } as Response);

      const result = await getRatesWithFallback(24);
      expect(result.tableNo).toBe("159/A/NBP/2026");
      expect(result.rates.EUR).toBe(4.31);
    });

    it("falls back to existing cache if fresh fetch fails", async () => {
      const staleCache: RatesCache = {
        effectiveDate: "2026-08-10",
        fetchedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
        tableNo: "140/A/NBP/2026",
        rates: { PLN: 1, EUR: 4.20, USD: 3.80, GBP: 4.90 }
      };
      saveCachedRates(staleCache);

      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network offline"));

      const result = await getRatesWithFallback(24);
      expect(result).toEqual(staleCache);
    });

    it("falls back to FALLBACK_RATES if no cache exists and fetch fails", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network offline"));

      const result = await getRatesWithFallback(24);
      expect(result.tableNo).toBe("FALLBACK");
      expect(result.rates).toEqual(FALLBACK_RATES);
    });
  });
});
