import { MortgageBenchmarkSnapshot } from "../content/mortgageKnowledge";

export type BenchmarkFreshnessStatus = "fresh" | "needs_refresh" | "no_data";

export function getBenchmarkFreshnessStatus(
  snapshot: MortgageBenchmarkSnapshot | null | undefined,
  now: Date
): BenchmarkFreshnessStatus {
  if (!snapshot) return "no_data";

  const asOfDate = new Date(snapshot.asOf);
  if (isNaN(asOfDate.getTime())) return "no_data";

  // Oblicz różnicę w dniach
  const diffTime = now.getTime() - asOfDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > snapshot.freshnessDays) {
    return "needs_refresh";
  }

  return "fresh";
}

export function calculateLTV(
  balance: number | undefined | null,
  propertyValue: number | undefined | null
): number | null {
  if (!balance || !propertyValue || propertyValue <= 0) {
    return null;
  }
  return (balance / propertyValue) * 100;
}

import { MortgageBenchmarkPoint } from "../content/mortgageBenchmarkHistory";

export function sortBenchmarkPoints(points: MortgageBenchmarkPoint[]): MortgageBenchmarkPoint[] {
  // Usuwanie duplikatów po dacie i sortowanie rosnąco
  const uniquePoints = new Map<string, MortgageBenchmarkPoint>();
  points.forEach(p => uniquePoints.set(p.date, p));
  return Array.from(uniquePoints.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getBenchmarkHistoryRange(
  points: MortgageBenchmarkPoint[],
  months: number | null
): MortgageBenchmarkPoint[] {
  const sorted = sortBenchmarkPoints(points);
  if (months === null || sorted.length === 0) return sorted;

  const latestDate = new Date(sorted[sorted.length - 1].date);
  latestDate.setUTCMonth(latestDate.getUTCMonth() - months);
  
  return sorted.filter(p => new Date(p.date).getTime() >= latestDate.getTime());
}

export function getLatestBenchmarkPoint(points: MortgageBenchmarkPoint[]): MortgageBenchmarkPoint | null {
  const sorted = sortBenchmarkPoints(points);
  return sorted.length > 0 ? sorted[sorted.length - 1] : null;
}

export function getPreviousBenchmarkPoint(points: MortgageBenchmarkPoint[]): MortgageBenchmarkPoint | null {
  const sorted = sortBenchmarkPoints(points);
  return sorted.length > 1 ? sorted[sorted.length - 2] : null;
}

export function getBenchmarkDelta(
  current: MortgageBenchmarkPoint | null,
  previous: MortgageBenchmarkPoint | null
): number | null {
  if (!current || !previous || current.value === undefined || previous.value === undefined) {
    return null;
  }
  return current.value - previous.value;
}

export type BenchmarkTrend = "up" | "down" | "flat" | "unknown";

export function getBenchmarkTrend(delta: number | null): BenchmarkTrend {
  if (delta === null) return "unknown";
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}
