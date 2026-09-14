import { describe, it, expect } from "vitest";
import { generateFinancialStory } from "./financialStory";
import { Profile } from "../types";

describe("financialStory service", () => {
  const mockProfile: Profile = {
    id: "p1",
    name: "Jan Kowalski",
    currency: "PLN",
    kind: "personal",
    payments: [],
    budgets: {},
    investments: [],
    transactions: [
      {
        id: "tx-1",
        name: "Wynagrodzenie",
        amount: 8000,
        type: "income",
        category: "Wynagrodzenie",
        isoDate: "2026-09-05",
        account: "Konto Główne",
        currency: "PLN"
      },
      {
        id: "tx-2",
        name: "Czynsz i opłaty",
        amount: 2500,
        type: "expense",
        category: "Mieszkanie",
        isoDate: "2026-09-06",
        account: "Konto Główne",
        currency: "PLN"
      },
      {
        id: "tx-3",
        name: "Biedronka zakupy",
        amount: 500,
        type: "expense",
        category: "Spożywcze",
        isoDate: "2026-09-11", // Piątek
        account: "Konto Główne",
        currency: "PLN"
      },
      {
        id: "tx-4",
        name: "Elektronika laptop",
        amount: 3000,
        type: "expense",
        category: "Elektronika",
        isoDate: "2026-09-18", // Piątek
        account: "Konto Główne",
        currency: "PLN"
      },
      // Poprzedni miesiąc (sierpień 2026)
      {
        id: "tx-prev-1",
        name: "Wydatki sierpień",
        amount: 7000,
        type: "expense",
        category: "Różne",
        isoDate: "2026-08-15",
        account: "Konto Główne",
        currency: "PLN"
      }
    ],
    goals: [
      {
        id: "g1",
        name: "Poduszka bezpieczeństwa",
        target: 50000,
        saved: 35000,
        targetDate: "2026-12-31"
      }
    ],
    recurringRules: []
  };

  it("generates 6 story slides for a valid month with transactions", () => {
    const story = generateFinancialStory(mockProfile, 2026, 8); // monthIdx 8 = Wrzesień

    expect(story.periodLabel).toBe("Wrzesień 2026");
    expect(story.currency).toBe("PLN");
    expect(story.hasData).toBe(true);
    expect(story.slides).toHaveLength(6);

    // Slide 1: Intro
    const introSlide = story.slides.find((s) => s.type === "intro");
    expect(introSlide).toBeDefined();
    if (introSlide?.type === "intro") {
      expect(introSlide.totalIncome).toBe(8000);
      expect(introSlide.totalExpenses).toBe(6000);
      expect(introSlide.balance).toBe(2000);
      expect(introSlide.savingsRate).toBe(25);
    }

    // Slide 2: Expenses
    const expSlide = story.slides.find((s) => s.type === "expenses");
    expect(expSlide).toBeDefined();
    if (expSlide?.type === "expenses") {
      expect(expSlide.categories[0].name).toBe("Elektronika");
      expect(expSlide.categories[0].amount).toBe(3000);
      expect(expSlide.comparedToPrevMonthText).toContain("Wydałeś o 14% mniej");
    }

    // Slide 3: Habits
    const habitsSlide = story.slides.find((s) => s.type === "habits");
    expect(habitsSlide).toBeDefined();
    if (habitsSlide?.type === "habits") {
      expect(habitsSlide.busiestDayName).toBe("Piątek");
      expect(habitsSlide.biggestTransaction?.title).toBe("Elektronika laptop");
      expect(habitsSlide.biggestTransaction?.amount).toBe(3000);
    }

    // Slide 4: Wealth
    const wealthSlide = story.slides.find((s) => s.type === "wealth");
    expect(wealthSlide).toBeDefined();
    if (wealthSlide?.type === "wealth") {
      expect(wealthSlide.goalsProgress).toHaveLength(1);
      expect(wealthSlide.goalsProgress[0].percent).toBe(70);
    }

    // Slide 5: Health
    const healthSlide = story.slides.find((s) => s.type === "health");
    expect(healthSlide).toBeDefined();
    if (healthSlide?.type === "health") {
      expect(healthSlide.healthScore).toBeGreaterThanOrEqual(0);
      expect(healthSlide.healthScore).toBeLessThanOrEqual(100);
    }

    // Slide 6: Executive
    const execSlide = story.slides.find((s) => s.type === "executive");
    expect(execSlide).toBeDefined();
    if (execSlide?.type === "executive") {
      expect(execSlide.monthName).toBe("Wrzesień");
      expect(execSlide.balance).toBe(2000);
      expect(execSlide.topCategory).toBe("Elektronika");
    }

    // Shareable text
    expect(story.shareableSummaryText).toContain("Wrzesień 2026");
    expect(story.shareableSummaryText).toContain("+2000 PLN");
    expect(story.shareableSummaryText).toContain("#SaldoWrapped");
  });

  it("handles empty month gracefully without errors", () => {
    const emptyProfile: Profile = {
      id: "p2",
      name: "Nowy",
      currency: "PLN",
      kind: "personal",
      payments: [],
      goals: [],
      investments: [],
      budgets: {},
      transactions: []
    };

    const story = generateFinancialStory(emptyProfile, 2026, 0); // Styczeń 2026
    expect(story.periodLabel).toBe("Styczeń 2026");
    expect(story.slides).toHaveLength(6);

    const introSlide = story.slides[0];
    if (introSlide.type === "intro") {
      expect(introSlide.totalIncome).toBe(0);
      expect(introSlide.totalExpenses).toBe(0);
      expect(introSlide.balance).toBe(0);
      expect(introSlide.savingsRate).toBeNull();
    }
  });

  it("handles deficit month and expense increase relative to previous month", () => {
    const deficitProfile: Profile = {
      id: "p3",
      name: "Anna",
      currency: "PLN",
      kind: "personal",
      payments: [],
      goals: [],
      investments: [],
      budgets: {},
      transactions: [
        {
          id: "tx-d1",
          name: "Wpłata",
          amount: 2000,
          type: "income",
          category: "Wynagrodzenie",
          isoDate: "2026-05-01",
          account: "Konto Główne",
          currency: "PLN"
        },
        {
          id: "tx-d2",
          name: "Awaria auta",
          amount: 5000,
          type: "expense",
          category: "Transport",
          isoDate: "2026-05-15",
          account: "Konto Główne",
          currency: "PLN"
        },
        // Kwiecień (poprzedni miesiąc) - wydatki 3000
        {
          id: "tx-dprev",
          name: "Wydatki kwiecień",
          amount: 3000,
          type: "expense",
          category: "Różne",
          isoDate: "2026-04-10",
          account: "Konto Główne",
          currency: "PLN"
        }
      ]
    };

    const story = generateFinancialStory(deficitProfile, 2026, 4); // Maj 2026 (index 4)
    expect(story.periodLabel).toBe("Maj 2026");

    const intro = story.slides.find((s) => s.type === "intro");
    if (intro?.type === "intro") {
      expect(intro.balance).toBe(-3000);
      expect(intro.highlightText).toContain("Wydatki przekroczyły przychody");
    }

    const expenses = story.slides.find((s) => s.type === "expenses");
    if (expenses?.type === "expenses") {
      expect(expenses.comparedToPrevMonthText).toContain("Wydałeś o 67% więcej");
    }
  });
});
