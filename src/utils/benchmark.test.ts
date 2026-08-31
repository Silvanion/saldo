import { describe, it, expect } from "vitest";
import { 
  getBenchmarkFreshnessStatus, 
  calculateLTV,
  sortBenchmarkPoints,
  getBenchmarkHistoryRange,
  getLatestBenchmarkPoint,
  getPreviousBenchmarkPoint,
  getBenchmarkDelta,
  getBenchmarkTrend
} from "./benchmark";
import { MortgageBenchmarkSnapshot } from "../content/mortgageKnowledge";
import { MortgageBenchmarkPoint, MORTGAGE_BENCHMARK_HISTORY } from "../content/mortgageBenchmarkHistory";

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

  describe("history helpers", () => {
    const mockPoints: MortgageBenchmarkPoint[] = [
      { date: "2023-10-01", value: 1, sourceName: "A", sourceUrl: "", publishedAt: "" },
      { date: "2024-05-01", value: 3, sourceName: "A", sourceUrl: "", publishedAt: "" },
      { date: "2024-01-01", value: 2, sourceName: "A", sourceUrl: "", publishedAt: "" },
      { date: "2023-10-01", value: 99, sourceName: "A", sourceUrl: "", publishedAt: "" }, // duplicate
    ];

    it("sortBenchmarkPoints sorts and removes duplicates", () => {
      const sorted = sortBenchmarkPoints(mockPoints);
      expect(sorted.length).toBe(3);
      expect(sorted[0].date).toBe("2023-10-01");
      expect(sorted[0].value).toBe(99); // last one overwrites
      expect(sorted[1].date).toBe("2024-01-01");
      expect(sorted[2].date).toBe("2024-05-01");
    });

    it("getBenchmarkHistoryRange filters by months", () => {
      const range = getBenchmarkHistoryRange(mockPoints, 4);
      expect(range.length).toBe(2);
      expect(range[0].date).toBe("2024-01-01");
      expect(range[1].date).toBe("2024-05-01");
      
      const all = getBenchmarkHistoryRange(mockPoints, null);
      expect(all.length).toBe(3);
    });

    it("getLatestBenchmarkPoint returns the latest point", () => {
      expect(getLatestBenchmarkPoint(mockPoints)?.date).toBe("2024-05-01");
      expect(getLatestBenchmarkPoint([])).toBeNull();
    });

    it("getPreviousBenchmarkPoint returns the previous point", () => {
      expect(getPreviousBenchmarkPoint(mockPoints)?.date).toBe("2024-01-01");
      expect(getPreviousBenchmarkPoint([])).toBeNull();
    });

    it("getBenchmarkDelta computes delta", () => {
      const latest = getLatestBenchmarkPoint(mockPoints);
      const prev = getPreviousBenchmarkPoint(mockPoints);
      expect(getBenchmarkDelta(latest, prev)).toBe(1); // 3 - 2
      expect(getBenchmarkDelta(latest, null)).toBeNull();
    });

    it("getBenchmarkTrend evaluates trend correctly", () => {
      expect(getBenchmarkTrend(1)).toBe("up");
      expect(getBenchmarkTrend(-1)).toBe("down");
      expect(getBenchmarkTrend(0)).toBe("flat");
      expect(getBenchmarkTrend(null)).toBe("unknown");
    });
  });

  describe("provenance integrity", () => {
    it("ensures no placeholder URLs exist in history", () => {
      MORTGAGE_BENCHMARK_HISTORY.forEach((series: any) => {
        series.points.forEach((point: any) => {
          expect(point.sourceUrl).not.toContain("example.com");
          expect(point.sourceUrl).toMatch(/^https:\/\//);
        });
      });
    });

    it("ensures no known estimated points exist in history", () => {
      MORTGAGE_BENCHMARK_HISTORY.forEach((series: any) => {
        series.points.forEach((point: any) => {
          // BIK June 2026 estimation check
          if (point.date === "2026-06-30") {
             expect(point.value).not.toBe(470000);
          }
        });
      });
    });
  });
});
