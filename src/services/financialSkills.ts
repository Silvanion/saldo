import { Profile, FinancialActionPlan, FinancialActionPlanItem } from "../types";
import { calculate503020, calculateRunway } from "./budgetCalculations";
import { formatMoney, roundCurrency } from "../utils";

export interface FinancialSkillMetadata {
  id: string;
  name: string;
  category: "debt" | "cushion" | "subscription" | "budget";
  iconName: string;
  description: string;
  badge: string;
  generatePlan: (profile: Profile) => FinancialActionPlan;
}

/**
 * 1. Umiejętność: Akcelerator Spłaty Długów (Lawina / Avalanche)
 */
export function generateDebtPayoffPlan(
  profile: Profile,
  extraMonthlyPayment: number = 150
): FinancialActionPlan {
  const cur = profile.currency || "PLN";
  const nowIso = new Date().toISOString();
  const activeDebts = (profile.debts || [])
    .filter((d) => d.status !== "closed" && Number(d.balance) > 0)
    .sort((a, b) => (Number(b.interestRate) || 0) - (Number(a.interestRate) || 0));

  if (activeDebts.length === 0) {
    const items: FinancialActionPlanItem[] = [
      {
        id: `debt-step-${Date.now()}-1`,
        title: "Utrzymuj 0% wskaźnik zadłużenia konsumenckiego",
        description: "Brak aktywnego zadłużenia to potężny atut. Unikaj zakupów ratalnych BNPL i drogich limitów odnawialnych.",
        category: "debt",
        completed: true,
        completedAt: nowIso,
      },
      {
        id: `debt-step-${Date.now()}-2`,
        title: "Przekieruj wolne przepływy na inwestycje kapitałowe",
        description: "Środki, które szłyby na odsetki kredytowe, ulokuj w zdywersyfikowanych aktywach.",
        category: "investment",
        completed: false,
      },
    ];

    return {
      id: `plan-debt-${Date.now()}`,
      skillId: "debt-avalanche-accelerator",
      title: "Utrzymanie wolności od zadłużenia",
      description: "Twój profil wykazuje brak aktywnego zadłużenia konsumenckiego. Skup się na pomnażaniu majątku.",
      status: "completed",
      createdAt: nowIso,
      items,
    };
  }

  const highestDebt = activeDebts[0];
  const items: FinancialActionPlanItem[] = [
    {
      id: `debt-step-${Date.now()}-1`,
      title: `Ustaw zlecenie stałe nadpłaty (+${extraMonthlyPayment} ${cur}) dla: ${highestDebt.name}`,
      description: `Dług oprocentowany na ${highestDebt.interestRate}%. Każda nadpłata bezpośrednio redukuje kapitał i drastycznie obniża koszt odsetek.`,
      category: "debt",
      targetAmount: extraMonthlyPayment,
      completed: false,
    },
    {
      id: `debt-step-${Date.now()}-2`,
      title: "Płać minimalne raty na pozostałych kredytach",
      description: "Utrzymuj punktualne płatności minimalne na reszcie zobowiązań, koncentrując całą nadwyżkę na celu #1.",
      category: "debt",
      completed: false,
    },
    {
      id: `debt-step-${Date.now()}-3`,
      title: `Spłać całkowicie saldo ${highestDebt.name} (${formatMoney(highestDebt.balance, cur)})`,
      description: "Po zamknięciu tego długu uwolnisz jego ratę miesięczną, tworząc efekt kuli śnieżnej.",
      category: "debt",
      targetAmount: highestDebt.balance,
      completed: false,
    },
  ];

  if (activeDebts.length > 1) {
    const nextDebt = activeDebts[1];
    const freedPayment = (Number(highestDebt.monthlyPayment) || 0) + extraMonthlyPayment;
    items.push({
      id: `debt-step-${Date.now()}-4`,
      title: `Efekt kuli śnieżnej: Przekieruj uwolnione +${freedPayment} ${cur} na: ${nextDebt.name}`,
      description: `Po wyzerowaniu pierwszego długu atakujesz kolejny z oprocentowaniem ${nextDebt.interestRate}%.`,
      category: "debt",
      completed: false,
    });
  }

  return {
    id: `plan-debt-${Date.now()}`,
    skillId: "debt-avalanche-accelerator",
    title: `Plan Lawinowej Spłaty Długów (Priorytet: ${highestDebt.name})`,
    description: `Metoda lawinowa minimalizuje łączne koszty odsetkowe poprzez eliminację najdroższego długu (${highestDebt.interestRate}%).`,
    status: "in_progress",
    createdAt: nowIso,
    estimatedSavings: roundCurrency(highestDebt.balance * (highestDebt.interestRate / 100) * 0.4),
    items,
  };
}

/**
 * 2. Umiejętność: Architekt Poduszki Finansowej (Emergency Fund)
 */
export function generateEmergencyFundPlan(profile: Profile): FinancialActionPlan {
  const cur = profile.currency || "PLN";
  const nowIso = new Date().toISOString();
  const runway = calculateRunway(profile, 3);
  const monthlyExpense = runway.avgMonthlyExpenses > 0 ? runway.avgMonthlyExpenses : 3500;

  const stage1Target = Math.max(2000, roundCurrency(monthlyExpense));
  const stage2Target = roundCurrency(monthlyExpense * 3);
  const stage3Target = roundCurrency(monthlyExpense * 6);

  const currentLiquid = runway.liquidAssets;

  const items: FinancialActionPlanItem[] = [
    {
      id: `cushion-step-${Date.now()}-1`,
      title: `Etap 1: Starter buforu płynności (${formatMoney(stage1Target, cur)})`,
      description: "Kwota na nieprzewidziane nagłe wydatki (awaria sprzętu, naprawa samochodu, leki), która chroni przed sięganiem po pożyczki.",
      category: "cushion",
      targetAmount: stage1Target,
      completed: currentLiquid >= stage1Target,
      completedAt: currentLiquid >= stage1Target ? nowIso : undefined,
    },
    {
      id: `cushion-step-${Date.now()}-2`,
      title: `Etap 2: 3-miesięczna poduszka stabilności (${formatMoney(stage2Target, cur)})`,
      description: "Podstawowe bezpieczeństwo na wypadek utraty pracy lub zmiany sytuacji zawodowej. Trzymaj na koncie oszczędnościowym.",
      category: "cushion",
      targetAmount: stage2Target,
      completed: currentLiquid >= stage2Target,
      completedAt: currentLiquid >= stage2Target ? nowIso : undefined,
    },
    {
      id: `cushion-step-${Date.now()}-3`,
      title: `Etap 3: Pełna 6-miesięczna tarcza finansowa (${formatMoney(stage3Target, cur)})`,
      description: "Długoterminowa odporność. Część środków możesz ulokować w bezpiecznych obligacjach skarbowych.",
      category: "cushion",
      targetAmount: stage3Target,
      completed: currentLiquid >= stage3Target,
      completedAt: currentLiquid >= stage3Target ? nowIso : undefined,
    },
    {
      id: `cushion-step-${Date.now()}-4`,
      title: "Automatyzacja wpłat w dniu wypłaty (Płać najpierw sobie)",
      description: "Ustaw zlecenie stałe zaraz po wpływie wynagrodzenia, aby nie wydawać nadwyżek.",
      category: "budget",
      completed: false,
    },
  ];

  return {
    id: `plan-cushion-${Date.now()}`,
    skillId: "emergency-fund-builder",
    title: `3-Etapowa Poduszka Bezpieczeństwa (${formatMoney(stage3Target, cur)})`,
    description: `Plan budowy funduszu awaryjnego w oparciu o Twój średni miesięczny wydatek (${formatMoney(monthlyExpense, cur)}/mc).`,
    status: currentLiquid >= stage3Target ? "completed" : "in_progress",
    createdAt: nowIso,
    items,
  };
}

/**
 * 3. Umiejętność: Audytor i Reduktor Subskrypcji
 */
export function generateSubscriptionAuditPlan(profile: Profile): FinancialActionPlan {
  const cur = profile.currency || "PLN";
  const nowIso = new Date().toISOString();
  const rules = (profile.recurringRules || []).filter((r) => r.type === "expense" && r.isActive);

  let totalAnnualCost = 0;
  const items: FinancialActionPlanItem[] = [];

  for (const rule of rules) {
    const amt = Number(rule.amount) || 0;
    let multiplier = 12;
    if (rule.frequency === "weekly") multiplier = 52;
    else if (rule.frequency === "biweekly") multiplier = 26;
    else if (rule.frequency === "quarterly") multiplier = 4;
    else if (rule.frequency === "yearly") multiplier = 1;

    const annualCost = roundCurrency(amt * multiplier);
    totalAnnualCost += annualCost;

    items.push({
      id: `sub-step-${Date.now()}-${rule.id}`,
      title: `Zweryfikuj subskrypcję: ${rule.name} (${formatMoney(amt, cur)} / ${rule.frequency})`,
      description: `Roczny koszt to aż ${formatMoney(annualCost, cur)}. Zastanów się, czy usługa jest regularnie używana i czy możliwy jest tańszy plan roczny lub współdzielony.`,
      category: "subscription",
      targetAmount: annualCost,
      completed: false,
    });
  }

  // Ogólne kroki audytowe
  items.push({
    id: `sub-step-${Date.now()}-stores`,
    title: "Sprawdź aktywne subskrypcje w Apple App Store / Google Play",
    description: "Często uśpione aplikacje mobilne pobierają opłaty automatycznie w tle bez bieżącego monitorowania.",
    category: "subscription",
    completed: false,
  });

  items.push({
    id: `sub-step-${Date.now()}-negotiate`,
    title: "Renegocjuj umowy telekomunikacyjne i internetowe",
    description: "Przedłużenie lub zmiana planu u operatora często pozwala obniżyć rachunek o 15–30 zł miesięcznie.",
    category: "subscription",
    completed: false,
  });

  const estimatedSavings = roundCurrency(totalAnnualCost * 0.25);

  return {
    id: `plan-sub-${Date.now()}`,
    skillId: "subscription-audit",
    title: `Audyt Kosztów Cyklicznych (Roczny wydatek: ${formatMoney(totalAnnualCost, cur)})`,
    description: `Wykryto ${rules.length} aktywnych usług cyklicznych. Optymalizacja może uwolnić szacunkowo ${formatMoney(estimatedSavings, cur)} rocznie.`,
    status: "in_progress",
    createdAt: nowIso,
    estimatedSavings,
    items,
  };
}

/**
 * 4. Umiejętność: Rebalanser Budżetu 50/30/20
 */
export function generateBudget503020Plan(profile: Profile): FinancialActionPlan {
  const cur = profile.currency || "PLN";
  const nowIso = new Date().toISOString();
  const txs = Array.isArray(profile.transactions) ? profile.transactions : [];
  const analysis = calculate503020(txs);

  const items: FinancialActionPlanItem[] = [];

  // Analiza potrzeb (Needs 50%)
  if (analysis.needs.percentage > 55) {
    items.push({
      id: `b503020-step-${Date.now()}-needs`,
      title: `Potrzeby pochłaniają ${analysis.needs.percentage}% budżetu (cel: do 50%)`,
      description: `Wydatki na mieszkanie, rachunki i transport przekraczają standard bezpieczeństwa. Sprawdź możliwości redukcji rachunków i kosztów dojazdów.`,
      category: "budget",
      completed: false,
    });
  } else {
    items.push({
      id: `b503020-step-${Date.now()}-needs-ok`,
      title: `Koszty stałe pod kontrolą: ${analysis.needs.percentage}% (standard 50%)`,
      description: "Twoje bazowe koszty życia mieszczą się w zdrowych ramach.",
      category: "budget",
      completed: true,
      completedAt: nowIso,
    });
  }

  // Analiza zachcianek (Wants 30%)
  if (analysis.wants.percentage > 35) {
    const excess = roundCurrency(analysis.wants.amount - analysis.totalExpense * 0.3);
    items.push({
      id: `b503020-step-${Date.now()}-wants`,
      title: `Ogranicz wydatki na styl życia o ok. ${formatMoney(excess, cur)}`,
      description: `Zachcianki (restauracje, rozrywka, zakupy impulsywne) wynoszą ${analysis.wants.percentage}%. Zastosuj zasadę 48 godzin przed zakupami nieplanowanymi.`,
      category: "budget",
      targetAmount: excess,
      completed: false,
    });
  } else {
    items.push({
      id: `b503020-step-${Date.now()}-wants-ok`,
      title: `Wydatki na przyjemności w normie: ${analysis.wants.percentage}% (standard 30%)`,
      description: "Zachowujesz właściwą dyscyplinę w wydatkach elastycznych.",
      category: "budget",
      completed: true,
      completedAt: nowIso,
    });
  }

  // Analiza oszczędności (Savings 20%)
  if (analysis.savings.percentage < 20) {
    const targetSavingsMonthly = roundCurrency(analysis.totalExpense * 0.25);
    items.push({
      id: `b503020-step-${Date.now()}-savings`,
      title: `Zwiększ stopę oszczędności do 20% (obecnie ${analysis.savings.percentage}%)`,
      description: `Aby budować majątek, odkładaj min. ${formatMoney(targetSavingsMonthly, cur)} miesięcznie na fundusz awaryjny lub inwestycje.`,
      category: "cushion",
      targetAmount: targetSavingsMonthly,
      completed: false,
    });
  } else {
    items.push({
      id: `b503020-step-${Date.now()}-savings-ok`,
      title: `Wzorowa stopa oszczędności: ${analysis.savings.percentage}% (cel: min. 20%)`,
      description: "Odkładasz odpowiednią część dochodów. Skieruj nadwyżki na inwestycje długoterminowe.",
      category: "investment",
      completed: true,
      completedAt: nowIso,
    });
  }

  return {
    id: `plan-b503020-${Date.now()}`,
    skillId: "budget-50-30-20-rebalancer",
    title: "Optymalizacja Budżetu Metodą 50/30/20",
    description: `Podział Twoich wydatków: ${analysis.needs.percentage}% Potrzeby | ${analysis.wants.percentage}% Styl życia | ${analysis.savings.percentage}% Oszczędności.`,
    status: "in_progress",
    createdAt: nowIso,
    items,
  };
}

/**
 * Zwraca katalog dostępnych umiejętności Claude Skills.
 */
export function getAvailableFinancialSkills(): FinancialSkillMetadata[] {
  return [
    {
      id: "debt-avalanche-accelerator",
      name: "Akcelerator Spłaty Długów",
      category: "debt",
      iconName: "TrendingDown",
      description: "Eliminuje najdroższe zadłużenie metodą lawinową (Avalanche) i oblicza wpływ nadpłat na oszczędność odsetek.",
      badge: "Redukcja długu",
      generatePlan: (profile) => generateDebtPayoffPlan(profile),
    },
    {
      id: "emergency-fund-builder",
      name: "Architekt Poduszki Finansowej",
      category: "cushion",
      iconName: "ShieldCheck",
      description: "Plan budowy tarczy finansowej w 3 etapach: starter awaryjny -> 3 miesiące -> 6 miesięcy pełnego bezpieczeństwa.",
      badge: "Płynność i spokój",
      generatePlan: (profile) => generateEmergencyFundPlan(profile),
    },
    {
      id: "subscription-audit",
      name: "Audytor i Reduktor Subskrypcji",
      category: "subscription",
      iconName: "Receipt",
      description: "Skanuje wszystkie koszty cykliczne, przelicza ich roczną skalę i generuje zadania optymalizacji umów.",
      badge: "Cięcie kosztów",
      generatePlan: (profile) => generateSubscriptionAuditPlan(profile),
    },
    {
      id: "budget-50-30-20-rebalancer",
      name: "Rebalanser Budżetu 50/30/20",
      category: "budget",
      iconName: "PieChart",
      description: "Sprawdza równowagę między potrzebami, zachciankami i oszczędnościami, proponując konkretne limity.",
      badge: "Równowaga",
      generatePlan: (profile) => generateBudget503020Plan(profile),
    },
  ];
}
