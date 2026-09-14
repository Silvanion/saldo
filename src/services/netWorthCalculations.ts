import { Profile } from "../types";
import { calculateRunway } from "./budgetCalculations";
import { roundCurrency } from "../utils";

export interface AssetBreakdown {
  liquidCash: number;
  savings: number;
  investments: number;
  property: number;
  totalAssets: number;
}

export interface LiabilityBreakdown {
  debts: number;
  unpaidBills: number;
  totalLiabilities: number;
}

export interface NetWorthTimelinePoint {
  date: string; // "YYYY-MM"
  label: string; // "Sty 2026"
  assets: number;
  liabilities: number;
  netWorth: number;
}

export interface NetWorthSummary {
  netWorth: number;
  assets: AssetBreakdown;
  liabilities: LiabilityBreakdown;
  debtToAssetsRatio: number;
  liquidRunwayMonths: number;
  momChange: {
    absolute: number;
    percentage: number;
  };
  timeline: NetWorthTimelinePoint[];
}

const MONTH_NAMES_PL = [
  "Sty", "Lut", "Mar", "Kwi", "Maj", "Cze",
  "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"
];

/**
 * Oblicza szczegółowe rozbicie aktywów dla danego profilu.
 */
export function calculateAssetBreakdown(profile: Profile | null): AssetBreakdown {
  if (!profile) {
    return {
      liquidCash: 0,
      savings: 0,
      investments: 0,
      property: 0,
      totalAssets: 0,
    };
  }

  const transactions = Array.isArray(profile.transactions) ? profile.transactions : [];
  const liquidCash = roundCurrency(
    transactions.reduce((sum, tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === "income") return sum + amt;
      if (tx.type === "expense") return sum - amt;
      return sum;
    }, 0)
  );

  const goals = Array.isArray(profile.goals) ? profile.goals : [];
  const savings = roundCurrency(
    goals.reduce((sum, g) => sum + (Number(g.saved) || 0), 0)
  );

  const investments = Array.isArray(profile.investments) ? profile.investments : [];
  const investmentsTotal = roundCurrency(
    investments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  );

  const debts = Array.isArray(profile.debts) ? profile.debts : [];
  const property = roundCurrency(
    debts
      .filter((d) => d.status !== "closed")
      .reduce((sum, d) => sum + (Number(d.propertyValue) || 0), 0)
  );

  const totalAssets = roundCurrency(liquidCash + savings + investmentsTotal + property);

  return {
    liquidCash,
    savings,
    investments: investmentsTotal,
    property,
    totalAssets,
  };
}

/**
 * Oblicza szczegółowe rozbicie zobowiązań dla danego profilu.
 */
export function calculateLiabilityBreakdown(profile: Profile | null): LiabilityBreakdown {
  if (!profile) {
    return {
      debts: 0,
      unpaidBills: 0,
      totalLiabilities: 0,
    };
  }

  const debts = Array.isArray(profile.debts) ? profile.debts : [];
  const debtsTotal = roundCurrency(
    debts
      .filter((d) => d.status !== "closed")
      .reduce((sum, d) => sum + (Number(d.balance) || 0), 0)
  );

  const payments = Array.isArray(profile.payments) ? profile.payments : [];
  const unpaidBills = roundCurrency(
    payments
      .filter((p) => p.status !== "Opłacono")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  );

  const totalLiabilities = roundCurrency(debtsTotal + unpaidBills);

  return {
    debts: debtsTotal,
    unpaidBills,
    totalLiabilities,
  };
}

/**
 * Generuje punkty osi czasu majątku netto dla ostatnich N miesięcy.
 */
export function generateNetWorthTimeline(
  profile: Profile | null,
  monthsCount: number = 6,
  referenceDate: Date = new Date()
): NetWorthTimelinePoint[] {
  const result: NetWorthTimelinePoint[] = [];
  const count = Math.max(1, monthsCount);

  // Ustalamy listę miesięcy YYYY-MM
  const months: { year: number; month: number; key: string; label: string; endIso: string }[] = [];
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth(); // 0-indexed

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(refYear, refMonth - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const mm = String(m + 1).padStart(2, "0");
    const key = `${y}-${mm}`;
    const label = `${MONTH_NAMES_PL[m]} ${y}`;
    // Ostatni dzień danego miesiąca
    const lastDay = new Date(y, m + 1, 0).getDate();
    const endIso = `${y}-${mm}-${String(lastDay).padStart(2, "0")}`;
    months.push({ year: y, month: m, key, label, endIso });
  }

  if (!profile) {
    return months.map((m) => ({
      date: m.key,
      label: m.label,
      assets: 0,
      liabilities: 0,
      netWorth: 0,
    }));
  }

  const transactions = Array.isArray(profile.transactions) ? profile.transactions : [];
  const goals = Array.isArray(profile.goals) ? profile.goals : [];
  const investments = Array.isArray(profile.investments) ? profile.investments : [];
  const debts = Array.isArray(profile.debts) ? profile.debts : [];
  const payments = Array.isArray(profile.payments) ? profile.payments : [];

  const staticSavings = roundCurrency(
    goals.reduce((sum, g) => sum + (Number(g.saved) || 0), 0)
  );
  const staticInvestments = roundCurrency(
    investments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
  );
  const staticProperty = roundCurrency(
    debts
      .filter((d) => d.status !== "closed")
      .reduce((sum, d) => sum + (Number(d.propertyValue) || 0), 0)
  );
  const activeDebtsTotal = roundCurrency(
    debts
      .filter((d) => d.status !== "closed")
      .reduce((sum, d) => sum + (Number(d.balance) || 0), 0)
  );
  const unpaidBillsTotal = roundCurrency(
    payments
      .filter((p) => p.status !== "Opłacono")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  );

  for (const m of months) {
    // Suma transakcji do końca danego miesiąca
    let liquidAtMonth = 0;
    for (const tx of transactions) {
      if (tx.isoDate && tx.isoDate <= m.endIso) {
        const amt = Number(tx.amount) || 0;
        if (tx.type === "income") liquidAtMonth += amt;
        else if (tx.type === "expense") liquidAtMonth -= amt;
      }
    }
    liquidAtMonth = roundCurrency(liquidAtMonth);

    const monthAssets = roundCurrency(
      liquidAtMonth + staticSavings + staticInvestments + staticProperty
    );
    const monthLiabilities = roundCurrency(activeDebtsTotal + unpaidBillsTotal);
    const monthNetWorth = roundCurrency(monthAssets - monthLiabilities);

    result.push({
      date: m.key,
      label: m.label,
      assets: monthAssets,
      liabilities: monthLiabilities,
      netWorth: monthNetWorth,
    });
  }

  return result;
}

/**
 * Główna funkcja wyliczająca pełne podsumowanie majątku netto.
 */
export function calculateNetWorthSummary(
  profile: Profile | null,
  referenceDate: Date = new Date()
): NetWorthSummary {
  const assets = calculateAssetBreakdown(profile);
  const liabilities = calculateLiabilityBreakdown(profile);
  const netWorth = roundCurrency(assets.totalAssets - liabilities.totalLiabilities);

  // Wskaźnik zadłużenia do aktywów (%)
  let debtToAssetsRatio = 0;
  if (assets.totalAssets > 0) {
    debtToAssetsRatio = roundCurrency((liabilities.totalLiabilities / assets.totalAssets) * 100);
  } else if (liabilities.totalLiabilities > 0) {
    debtToAssetsRatio = 100;
  }

  // Runway w miesiącach
  const runway = calculateRunway(profile);
  const liquidRunwayMonths = isFinite(runway.runwayMonths) ? runway.runwayMonths : 99;

  // Oś czasu 6 miesięcy
  const timeline = generateNetWorthTimeline(profile, 6, referenceDate);

  // Zmiana miesiąc do miesiąca (MoM)
  let momAbsolute = 0;
  let momPercentage = 0;
  if (timeline.length >= 2) {
    const current = timeline[timeline.length - 1].netWorth;
    const prev = timeline[timeline.length - 2].netWorth;
    momAbsolute = roundCurrency(current - prev);
    if (prev > 0) {
      momPercentage = roundCurrency((momAbsolute / prev) * 100);
    } else if (prev < 0 && current > prev) {
      momPercentage = roundCurrency(Math.abs((momAbsolute / prev) * 100));
    }
  }

  return {
    netWorth,
    assets,
    liabilities,
    debtToAssetsRatio,
    liquidRunwayMonths,
    momChange: {
      absolute: momAbsolute,
      percentage: momPercentage,
    },
    timeline,
  };
}
