import { Transaction } from "../types";

export type ZusTier = "full" | "preferential" | "relief_start";
export type RyczaltRate = 3 | 5.5 | 8.5 | 12 | 14 | 15 | 17;
export type TaxForm = "ryczalt" | "linear" | "scale";

export interface TaxCalculationInput {
  monthlyRevenue: number;
  monthlyCosts: number;
  zusTier: ZusTier;
  includeSickPay?: boolean;
  ryczaltRate?: RyczaltRate;
  vatRate?: number; // np. 23, 8 lub 0 (zwolniony)
  isVatPayer?: boolean;
}

export interface TaxCalculationResult {
  form: TaxForm;
  formLabel: string;
  monthlyRevenue: number;
  monthlyCosts: number;
  zusSocial: number;
  healthInsurance: number;
  taxBase: number;
  incomeTax: number;
  netIncome: number;
  effectiveTaxRatePercent: number;
  vatDue: number;
  taxBufferToSetAside: number; // ZUS + Zdrowotna + PIT (+ VAT jeśli dotyczy)
  annualNetIncome: number;
  annualTotalTaxes: number;
}

export interface TaxComparisonSummary {
  input: TaxCalculationInput;
  ryczalt: TaxCalculationResult;
  linear: TaxCalculationResult;
  scale: TaxCalculationResult;
  bestForm: TaxForm;
  bestFormLabel: string;
  annualDifferenceBestVsWorst: number;
  annualDifferenceBestVsLinear: number;
  recommendationReason: string;
}

// Stałe wskaźniki podatkowe Polska 2025/2026
export const TAX_CONSTANTS_PL = {
  MIN_WAGE: 4666,
  AVG_ENTERPRISE_WAGE: 8200,
  // ZUS Pełny (podstawa 60% prognozowanego = 5200)
  FULL_ZUS_WITH_SICK: 1774,
  FULL_ZUS_WITHOUT_SICK: 1647,
  // ZUS Preferencyjny (podstawa 30% min = 1400)
  PREF_ZUS_WITH_SICK: 450,
  PREF_ZUS_WITHOUT_SICK: 415,
  // Zdrowotna Ryczałt 2025/2026 (60%, 100%, 180% przeciętnego * 9%)
  RYCZALT_HEALTH_TIER_1: 460, // do 60k rocznie
  RYCZALT_HEALTH_TIER_2: 770, // 60k - 300k rocznie
  RYCZALT_HEALTH_TIER_3: 1380, // pow. 300k rocznie
  // Minimalna zdrowotna (9% z min. wynagrodzenia)
  MIN_HEALTH_INSURANCE: 420,
  // Limit odliczenia zdrowotnej na podatku liniowym (roczny)
  LINEAR_HEALTH_DEDUCTION_ANNUAL_LIMIT: 11600,
  // Skala podatkowa
  SCALE_TAX_FREE_ALLOWANCE: 30000,
  SCALE_TAX_REDUCING_ANNUAL: 3600,
  SCALE_FIRST_THRESHOLD: 120000,
  SCALE_LOWER_RATE: 0.12,
  SCALE_HIGHER_RATE: 0.32,
  LINEAR_RATE: 0.19,
};

/**
 * Wylicza składki ZUS społeczne (bez składki zdrowotnej)
 */
export function calculateSocialZus(tier: ZusTier, includeSickPay = true): number {
  if (tier === "relief_start") {
    return 0;
  }
  if (tier === "preferential") {
    return includeSickPay
      ? TAX_CONSTANTS_PL.PREF_ZUS_WITH_SICK
      : TAX_CONSTANTS_PL.PREF_ZUS_WITHOUT_SICK;
  }
  return includeSickPay
    ? TAX_CONSTANTS_PL.FULL_ZUS_WITH_SICK
    : TAX_CONSTANTS_PL.FULL_ZUS_WITHOUT_SICK;
}

/**
 * Wyznacza miesięczną składkę zdrowotną w zależności od formy i poziomu przychodu/dochodu
 */
export function calculateHealthInsurance(
  form: TaxForm,
  monthlyRevenue: number,
  monthlyIncome: number
): number {
  if (form === "ryczalt") {
    const annualProjectedRevenue = monthlyRevenue * 12;
    if (annualProjectedRevenue <= 60000) {
      return TAX_CONSTANTS_PL.RYCZALT_HEALTH_TIER_1;
    } else if (annualProjectedRevenue <= 300000) {
      return TAX_CONSTANTS_PL.RYCZALT_HEALTH_TIER_2;
    } else {
      return TAX_CONSTANTS_PL.RYCZALT_HEALTH_TIER_3;
    }
  }

  if (form === "linear") {
    // 4.9% dochodu, nie mniej niż 9% minimalnego wynagrodzenia
    const calculated = Math.max(0, monthlyIncome) * 0.049;
    return Math.max(TAX_CONSTANTS_PL.MIN_HEALTH_INSURANCE, Math.round(calculated));
  }

  // Skala podatkowa: 9% dochodu, nie mniej niż 9% minimalnego wynagrodzenia
  const calculated = Math.max(0, monthlyIncome) * 0.09;
  return Math.max(TAX_CONSTANTS_PL.MIN_HEALTH_INSURANCE, Math.round(calculated));
}

/**
 * Oblicza podatek i wynik dla pojedynczej formy opodatkowania
 */
export function calculateSingleTaxForm(
  form: TaxForm,
  input: TaxCalculationInput
): TaxCalculationResult {
  const {
    monthlyRevenue,
    monthlyCosts,
    zusTier,
    includeSickPay = true,
    ryczaltRate = 12,
    vatRate = 23,
    isVatPayer = true,
  } = input;

  const zusSocial = calculateSocialZus(zusTier, includeSickPay);
  const vatDue = isVatPayer
    ? Math.max(0, Math.round((monthlyRevenue * (vatRate / 100)) - (monthlyCosts * (vatRate / 100))))
    : 0;

  let formLabel = "";
  let healthInsurance = 0;
  let taxBase = 0;
  let incomeTax = 0;
  let netIncome = 0;

  if (form === "ryczalt") {
    formLabel = `Ryczałt (${ryczaltRate}%)`;
    healthInsurance = calculateHealthInsurance("ryczalt", monthlyRevenue, 0);

    // Ryczałt: odliczenie ZUS społecznego oraz 50% zapłaconej składki zdrowotnej
    const healthDeduction = healthInsurance * 0.5;
    taxBase = Math.max(0, Math.round(monthlyRevenue - zusSocial - healthDeduction));
    incomeTax = Math.round(taxBase * (ryczaltRate / 100));

    // Na rękę: Przychód - Koszty - ZUS - Zdrowotna - PIT
    netIncome = Math.round(monthlyRevenue - monthlyCosts - zusSocial - healthInsurance - incomeTax);
  } else if (form === "linear") {
    formLabel = "Podatek Liniowy (19%)";
    const grossIncomeBeforeZus = Math.max(0, monthlyRevenue - monthlyCosts);
    const incomeAfterZus = Math.max(0, grossIncomeBeforeZus - zusSocial);

    healthInsurance = calculateHealthInsurance("linear", monthlyRevenue, incomeAfterZus);

    // Liniowy: odliczenie zdrowotnej od dochodu do limitu miesięcznego (~966 zł)
    const monthlyHealthDeductionLimit = Math.round(
      TAX_CONSTANTS_PL.LINEAR_HEALTH_DEDUCTION_ANNUAL_LIMIT / 12
    );
    const healthDeduction = Math.min(healthInsurance, monthlyHealthDeductionLimit);

    taxBase = Math.max(0, Math.round(incomeAfterZus - healthDeduction));
    incomeTax = Math.round(taxBase * TAX_CONSTANTS_PL.LINEAR_RATE);

    netIncome = Math.round(monthlyRevenue - monthlyCosts - zusSocial - healthInsurance - incomeTax);
  } else {
    // Skala podatkowa (12% / 32%)
    formLabel = "Skala Podatkowa (12% / 32%)";
    const grossIncomeBeforeZus = Math.max(0, monthlyRevenue - monthlyCosts);
    const monthlyTaxableIncome = Math.max(0, grossIncomeBeforeZus - zusSocial);

    healthInsurance = calculateHealthInsurance("scale", monthlyRevenue, monthlyTaxableIncome);
    taxBase = Math.round(monthlyTaxableIncome);

    // Roczna projekcja dla progów 120 000 zł i kwoty zmniejszającej
    const annualIncome = monthlyTaxableIncome * 12;
    let annualPit = 0;
    if (annualIncome <= TAX_CONSTANTS_PL.SCALE_TAX_FREE_ALLOWANCE) {
      annualPit = 0;
    } else if (annualIncome <= TAX_CONSTANTS_PL.SCALE_FIRST_THRESHOLD) {
      annualPit = Math.max(
        0,
        annualIncome * TAX_CONSTANTS_PL.SCALE_LOWER_RATE - TAX_CONSTANTS_PL.SCALE_TAX_REDUCING_ANNUAL
      );
    } else {
      const basePart =
        TAX_CONSTANTS_PL.SCALE_FIRST_THRESHOLD * TAX_CONSTANTS_PL.SCALE_LOWER_RATE -
        TAX_CONSTANTS_PL.SCALE_TAX_REDUCING_ANNUAL;
      const overPart =
        (annualIncome - TAX_CONSTANTS_PL.SCALE_FIRST_THRESHOLD) * TAX_CONSTANTS_PL.SCALE_HIGHER_RATE;
      annualPit = basePart + overPart;
    }

    incomeTax = Math.round(annualPit / 12);
    netIncome = Math.round(monthlyRevenue - monthlyCosts - zusSocial - healthInsurance - incomeTax);
  }

  const totalDeductions = zusSocial + healthInsurance + incomeTax;
  const effectiveTaxRatePercent =
    monthlyRevenue > 0 ? Number(((totalDeductions / monthlyRevenue) * 100).toFixed(1)) : 0;

  const taxBufferToSetAside = Math.round(totalDeductions + vatDue);
  const annualNetIncome = netIncome * 12;
  const annualTotalTaxes = totalDeductions * 12;

  return {
    form,
    formLabel,
    monthlyRevenue,
    monthlyCosts,
    zusSocial,
    healthInsurance,
    taxBase,
    incomeTax,
    netIncome,
    effectiveTaxRatePercent,
    vatDue,
    taxBufferToSetAside,
    annualNetIncome,
    annualTotalTaxes,
  };
}

/**
 * Porównuje wszystkie trzy formy opodatkowania i wyznacza optymalną rekomendację
 */
export function compareAllTaxForms(input: TaxCalculationInput): TaxComparisonSummary {
  const ryczalt = calculateSingleTaxForm("ryczalt", input);
  const linear = calculateSingleTaxForm("linear", input);
  const scale = calculateSingleTaxForm("scale", input);

  const results = [ryczalt, linear, scale];
  results.sort((a, b) => b.netIncome - a.netIncome);

  const best = results[0];
  const worst = results[results.length - 1];

  const annualDifferenceBestVsWorst = Math.max(0, best.annualNetIncome - worst.annualNetIncome);
  const annualDifferenceBestVsLinear =
    best.form === "linear" ? 0 : Math.max(0, best.annualNetIncome - linear.annualNetIncome);

  let recommendationReason = "";
  if (best.form === "ryczalt") {
    recommendationReason = `Ryczałt (${input.ryczaltRate || 12}%) daje najwyższy zysk netto (${best.netIncome} zł/mc) z uwagi na niskie koszty działalności i zryczałtowaną stawkę podatku.`;
  } else if (best.form === "linear") {
    recommendationReason = `Podatek liniowy (19%) jest najbardziej opłacalny (${best.netIncome} zł/mc) dzięki wysokim kosztom uzyskania przychodu i stabilnej stawce bez wpadania w II próg podatkowy 32%.`;
  } else {
    recommendationReason = `Skala podatkowa (12%) jest bezkonkurencyjna (${best.netIncome} zł/mc) dzięki kwocie wolnej od podatku 30 000 zł i niskiej stawce 12% w I progu.`;
  }

  return {
    input,
    ryczalt,
    linear,
    scale,
    bestForm: best.form,
    bestFormLabel: best.formLabel,
    annualDifferenceBestVsWorst,
    annualDifferenceBestVsLinear,
    recommendationReason,
  };
}

/**
 * Pobiera przychody i koszty z bieżącego miesiąca z transakcji Saldo i wylicza bufor podatkowy
 */
export function calculateCurrentMonthTaxBuffer(
  transactions: Transaction[],
  year: number,
  monthIdx: number,
  config: Omit<TaxCalculationInput, "monthlyRevenue" | "monthlyCosts"> & {
    selectedForm?: TaxForm;
    accountId?: string; // Opcjonalny filtr konta firmowego
  }
) {
  const targetYearMonth = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;

  let revenue = 0;
  let costs = 0;

  for (const t of transactions) {
    if (!t.isoDate || !t.isoDate.startsWith(targetYearMonth)) continue;
    if (config.accountId && t.account !== config.accountId) continue;

    if (t.type === "income") {
      revenue += t.amount;
    } else if (t.type === "expense") {
      // Wykluczamy podatki/ZUS, aby nie dublować kosztów
      const catLower = (t.category || "").toLowerCase();
      const nameLower = (t.name || "").toLowerCase();
      const isTaxPayment =
        catLower.includes("podatek") ||
        catLower.includes("zus") ||
        catLower.includes("urząd skarbowy") ||
        nameLower.includes("pit") ||
        nameLower.includes("vat") ||
        nameLower.includes("zus");

      if (!isTaxPayment) {
        costs += t.amount;
      }
    }
  }

  const selectedForm = config.selectedForm || "ryczalt";
  const calculationInput: TaxCalculationInput = {
    monthlyRevenue: Math.round(revenue),
    monthlyCosts: Math.round(costs),
    zusTier: config.zusTier,
    includeSickPay: config.includeSickPay,
    ryczaltRate: config.ryczaltRate,
    vatRate: config.vatRate,
    isVatPayer: config.isVatPayer,
  };

  const comparison = compareAllTaxForms(calculationInput);
  const activeResult =
    selectedForm === "ryczalt"
      ? comparison.ryczalt
      : selectedForm === "linear"
      ? comparison.linear
      : comparison.scale;

  // Obliczenie dni do najbliższych terminów (20. - ZUS/PIT, 25. - VAT)
  const now = new Date();
  const currentDay = now.getDate();
  const daysTo20th = currentDay <= 20 ? 20 - currentDay : 20 + (30 - currentDay);
  const daysTo25th = currentDay <= 25 ? 25 - currentDay : 25 + (30 - currentDay);

  return {
    revenue: Math.round(revenue),
    costs: Math.round(costs),
    calculationInput,
    comparison,
    activeResult,
    daysTo20th,
    daysTo25th,
  };
}
