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
