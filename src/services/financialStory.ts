import { Profile, Transaction } from "../types";
import { getFinancialHealthSummary } from "./financialHealth";
import { calculateNetWorthSummary } from "./netWorthCalculations";

export interface StorySlideBase {
  id: string;
  type: "intro" | "expenses" | "habits" | "wealth" | "health" | "executive";
  title: string;
  subtitle: string;
  badge?: string;
  bgGradient: string;
}

export interface StorySlideIntro extends StorySlideBase {
  type: "intro";
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number | null;
  currency: string;
  highlightText: string;
}

export interface StorySlideExpenses extends StorySlideBase {
  type: "expenses";
  categories: Array<{
    name: string;
    amount: number;
    percent: number;
  }>;
  totalExpenses: number;
  currency: string;
  comparedToPrevMonthText: string;
}

export interface StorySlideHabits extends StorySlideBase {
  type: "habits";
  busiestDayName: string;
  busiestDayAmount: number;
  biggestTransaction: {
    title: string;
    amount: number;
    date: string;
    category: string;
  } | null;
  dailyAverageExpense: number;
  currency: string;
  insightsText: string;
}

export interface StorySlideWealth extends StorySlideBase {
  type: "wealth";
  currentNetWorth: number;
  liquidSavings: number;
  goalsProgress: Array<{
    title: string;
    current: number;
    target: number;
    percent: number;
  }>;
  currency: string;
  wealthInsightText: string;
}

export interface StorySlideHealth extends StorySlideBase {
  type: "health";
  healthScore: number;
  gradeLabel: string;
  grade: "excellent" | "good" | "fair" | "warning" | "danger";
  mainPositive: string;
  mainRecommendation: string;
}

export interface StorySlideExecutive extends StorySlideBase {
  type: "executive";
  monthName: string;
  year: number;
  balance: number;
  savingsRate: number | null;
  topCategory: string | null;
  healthScore: number;
  currency: string;
  summaryQuote: string;
}

export type FinancialStorySlide =
  | StorySlideIntro
  | StorySlideExpenses
  | StorySlideHabits
  | StorySlideWealth
  | StorySlideHealth
  | StorySlideExecutive;

export interface FinancialStory {
  monthIdx: number;
  monthName: string;
  year: number;
  periodLabel: string;
  currency: string;
  hasData: boolean;
  slides: FinancialStorySlide[];
  shareableSummaryText: string;
}

export const MONTH_NAMES_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];

export const DAY_NAMES_PL = [
  "Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"
];

export function generateFinancialStory(
  profile: Profile,
  year: number,
  monthIdx: number
): FinancialStory {
  const currency = profile.currency || "PLN";
  const monthName = MONTH_NAMES_PL[monthIdx] || `Miesiąc ${monthIdx + 1}`;
  const periodLabel = `${monthName} ${year}`;

  const transactions: Transaction[] = profile.transactions || [];

  // Filter current month transactions
  let currentMonthTxCount = 0;
  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryExpenses: Record<string, number> = {};
  const dayOfWeekExpenses: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let biggestExpenseTx: { title: string; amount: number; date: string; category: string } | null = null;

  // Previous month data for comparison
  let prevMonthIdx = monthIdx - 1;
  let prevYear = year;
  if (prevMonthIdx < 0) {
    prevMonthIdx = 11;
    prevYear -= 1;
  }
  let prevTotalExpenses = 0;
  let hasPrevData = false;

  for (const tx of transactions) {
    if (!tx.isoDate) continue;
    const d = new Date(`${tx.isoDate}T12:00:00`);
    if (isNaN(d.getTime())) continue;

    const txYear = d.getFullYear();
    const txMonth = d.getMonth();
    const amount = Math.abs(Number(tx.amount)) || 0;

    if (txYear === year && txMonth === monthIdx) {
      currentMonthTxCount++;
      if (tx.type === "income") {
        totalIncome += amount;
      } else if (tx.type === "expense") {
        totalExpenses += amount;
        const cat = tx.category?.trim() || "Inne";
        categoryExpenses[cat] = (categoryExpenses[cat] || 0) + amount;

        const dayOfWeek = d.getDay();
        dayOfWeekExpenses[dayOfWeek] = (dayOfWeekExpenses[dayOfWeek] || 0) + amount;

        if (!biggestExpenseTx || amount > biggestExpenseTx.amount) {
          biggestExpenseTx = {
            title: (tx as any).title || tx.name || "Wydatek",
            amount,
            date: tx.isoDate,
            category: cat
          };
        }
      }
    } else if (txYear === prevYear && txMonth === prevMonthIdx) {
      hasPrevData = true;
      if (tx.type === "expense") {
        prevTotalExpenses += amount;
      }
    }
  }

  const balance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : null;
  const hasData = currentMonthTxCount > 0 || (profile.transactions && profile.transactions.length > 0);

  // Top categories sorted
  const sortedCategories = Object.entries(categoryExpenses)
    .sort(([, a], [, b]) => b - a)
    .map(([name, amount]) => ({
      name,
      amount,
      percent: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
    }));

  const topCategory = sortedCategories[0]?.name || null;

  // Busiest day
  let busiestDayIdx = 0;
  let maxDayExpense = -1;
  for (let d = 0; d < 7; d++) {
    if (dayOfWeekExpenses[d] > maxDayExpense) {
      maxDayExpense = dayOfWeekExpenses[d];
      busiestDayIdx = d;
    }
  }
  const busiestDayName = maxDayExpense > 0 ? DAY_NAMES_PL[busiestDayIdx] : "Brak danych";

  // Days in month
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const dailyAverageExpense = totalExpenses > 0 ? totalExpenses / daysInMonth : 0;

  // Net worth & Goals
  const netWorthSummary = calculateNetWorthSummary(profile);
  const liquidSavings = netWorthSummary.assets.liquidCash;

  const goalsProgress = (profile.goals || []).slice(0, 3).map((g) => {
    const target = Number(g.target) || 1;
    const current = Number(g.saved) || 0;
    const percent = Math.min(100, Math.round((current / target) * 100));
    return {
      title: g.name || "Cel",
      current,
      target,
      percent
    };
  });

  // Health Score
  const health = getFinancialHealthSummary(profile, profile.recurringRules || []);

  // Texts & Insights
  let introHighlight = "";
  if (balance > 0 && (savingsRate ?? 0) >= 20) {
    introHighlight = `Kapitalny wynik! Udało Ci się odłożyć aż ${Math.round(savingsRate!)}% wpływów.`;
  } else if (balance > 0) {
    introHighlight = `Miesiąc zakończony na plusie (+${Math.round(balance)} ${currency}). Twoja dyscyplina rośnie!`;
  } else if (totalIncome === 0 && totalExpenses === 0) {
    introHighlight = "W tym miesiącu nie odnotowano jeszcze żadnych transakcji.";
  } else {
    introHighlight = `Wydatki przekroczyły przychody o ${Math.round(Math.abs(balance))} ${currency}. Czas na małą rewizję budżetu.`;
  }

  let comparedToPrevText = "Pierwszy analizowany miesiąc w zestawieniu.";
  if (hasPrevData && prevTotalExpenses > 0) {
    const diffPercent = Math.round(((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100);
    if (diffPercent < 0) {
      comparedToPrevText = `Wydałeś o ${Math.abs(diffPercent)}% mniej niż w poprzednim miesiącu!`;
    } else if (diffPercent > 0) {
      comparedToPrevText = `Wydałeś o ${diffPercent}% więcej niż w poprzednim miesiącu.`;
    } else {
      comparedToPrevText = "Poziom wydatków dokładnie taki sam jak miesiąc wcześniej.";
    }
  }

  let habitsInsight = "";
  if (maxDayExpense > 0) {
    habitsInsight = `Twoim dniem największych zakupów był ${busiestDayName}. Średnio wydawałeś ${Math.round(dailyAverageExpense)} ${currency} dziennie.`;
  } else {
    habitsInsight = "Zarejestruj transakcje, aby odkryć swoje rytmy zakupowe.";
  }

  let wealthInsight = "";
  if (netWorthSummary.netWorth > 0) {
    wealthInsight = `Twój łączny majątek netto wynosi ${Math.round(netWorthSummary.netWorth)} ${currency}. Płynne oszczędności na kontach to ${Math.round(liquidSavings)} ${currency}.`;
  } else {
    wealthInsight = `Płynne rezerwy na kontach wynoszą ${Math.round(liquidSavings)} ${currency}.`;
  }

  let quoteText = "";
  if (health.score >= 80) {
    quoteText = "„Znakomita kontrola finansów – Twoja płynność i budżet są w świetnej formie.”";
  } else if (health.score >= 60) {
    quoteText = "„Dobra i stabilna baza finansowa. Kilka drobnych korekt wystarczy do poziomu mistrzowskiego.”";
  } else {
    quoteText = "„Czas na skupienie na fundamentach: budowa buforu bezpieczeństwa i kontrola kosztów stałych.”";
  }

  const slides: FinancialStorySlide[] = [
    {
      id: "slide-1-intro",
      type: "intro",
      title: `${monthName} ${year}`,
      subtitle: "Podsumowanie wpływów i oszczędności",
      badge: balance >= 0 ? "🔥 Bilans na plusie" : "⚡ Deficyt miesiąca",
      bgGradient: "from-blue-600 via-indigo-600 to-purple-800",
      totalIncome,
      totalExpenses,
      balance,
      savingsRate,
      currency,
      highlightText: introHighlight
    },
    {
      id: "slide-2-expenses",
      type: "expenses",
      title: "Gdzie płynęły środki?",
      subtitle: "Struktura Twoich najważniejszych wydatków",
      badge: "📊 Koszyk wydatków",
      bgGradient: "from-purple-700 via-pink-600 to-rose-700",
      categories: sortedCategories.slice(0, 4),
      totalExpenses,
      currency,
      comparedToPrevMonthText: comparedToPrevText
    },
    {
      id: "slide-3-habits",
      type: "habits",
      title: "Rytm i nawyki",
      subtitle: "Dni tygodnia i największe zakupy",
      badge: "⏱️ Wzorce zakupowe",
      bgGradient: "from-amber-600 via-orange-600 to-red-700",
      busiestDayName,
      busiestDayAmount: maxDayExpense > 0 ? maxDayExpense : 0,
      biggestTransaction: biggestExpenseTx,
      dailyAverageExpense,
      currency,
      insightsText: habitsInsight
    },
    {
      id: "slide-4-wealth",
      type: "wealth",
      title: "Majątek & Skarbonki",
      subtitle: "Jak rośnie Twój kapitał i cele",
      badge: "💎 Twój majątek",
      bgGradient: "from-emerald-600 via-teal-700 to-cyan-800",
      currentNetWorth: netWorthSummary.netWorth,
      liquidSavings,
      goalsProgress,
      currency,
      wealthInsightText: wealthInsight
    },
    {
      id: "slide-5-health",
      type: "health",
      title: "Health Score",
      subtitle: "Ocena kondycji Twoich finansów",
      badge: `Ocena: ${health.gradeLabel}`,
      bgGradient: "from-indigo-800 via-violet-800 to-purple-950",
      healthScore: health.score,
      gradeLabel: health.gradeLabel,
      grade: health.grade,
      mainPositive: health.positiveDrivers[0] || "Brak krytycznych ostrzeżeń budżetowych.",
      mainRecommendation: health.negativeDrivers[0] || "Utrzymuj nawyk regularnego kategoryzowania wydatków."
    },
    {
      id: "slide-6-executive",
      type: "executive",
      title: "Saldo Wrapped",
      subtitle: `${monthName} ${year} w pigułce`,
      badge: "✨ Twoja Karta Podsumowania",
      bgGradient: "from-slate-900 via-indigo-950 to-black",
      monthName,
      year,
      balance,
      savingsRate,
      topCategory,
      healthScore: health.score,
      currency,
      summaryQuote: quoteText
    }
  ];

  const shareableSummaryText = [
    `📊 Mój ${monthName} ${year} w Saldo:`,
    `💰 Bilans: ${balance >= 0 ? "+" : ""}${Math.round(balance)} ${currency} ${savingsRate !== null ? `(Stopa oszczędności: ${Math.round(savingsRate)}%)` : ""}`,
    topCategory ? `🏆 Główny wydatek: ${topCategory}` : null,
    `⭐️ Financial Health Score: ${health.score}/100 (${health.gradeLabel})`,
    `#SaldoApp #FinanseOsobiste #SaldoWrapped`
  ].filter(Boolean).join("\n");

  return {
    monthIdx,
    monthName,
    year,
    periodLabel,
    currency,
    hasData,
    slides,
    shareableSummaryText
  };
}
