import { describe, it, expect } from "vitest";
import { getBenchmarkFreshnessStatus, calculateLTV } from "./benchmark";
import { MortgageBenchmarkSnapshot } from "../content/mortgageKnowledge";

describe("benchmark helpers", () => {
  describe("getBenchmarkFreshnessStatus", () => {
    const mockSnapshot: MortgageBenchmarkSnapshot = {
      id: "test",
      market: "PL",
      asOf: "2026-03-05",
      publishedAt: "2026-03-05",
      sourceName: "NBP",
      sourceUrl: "url",
      metric: "margin",
      label: "Test",
      unit: "percent",
      methodologyNote: "Test",
      freshnessDays: 30
    };

    it("zwraca fresh jeśli data jest w granicach freshnessDays", () => {
      const now = new Date("2026-03-20T00:00:00Z");
      expect(getBenchmarkFreshnessStatus(mockSnapshot, now)).toBe("fresh");
    });

    it("zwraca needs_refresh jeśli data przekracza freshnessDays", () => {
      const now = new Date("2026-05-15T00:00:00Z");
      expect(getBenchmarkFreshnessStatus(mockSnapshot, now)).toBe("needs_refresh");
    });

    it("zwraca no_data dla null", () => {
      expect(getBenchmarkFreshnessStatus(null, new Date())).toBe("no_data");
    });
  });

  describe("calculateLTV", () => {
    it("oblicza poprawne LTV", () => {
      expect(calculateLTV(500000, 1000000)).toBe(50);
      expect(calculateLTV(100000, 500000)).toBe(20);
    });

    it("zwraca null przy braku salda", () => {
      expect(calculateLTV(undefined, 100000)).toBeNull();
      expect(calculateLTV(0, 100000)).toBeNull();
    });

    it("zwraca null przy braku wartości nieruchomości lub <= 0", () => {
      expect(calculateLTV(100000, undefined)).toBeNull();
      expect(calculateLTV(100000, 0)).toBeNull();
      expect(calculateLTV(100000, -50000)).toBeNull();
    });
  });
});
