/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FinancialHealthBridgeCard } from "../components/dashboard/FinancialHealthBridgeCard";
import { StatsWidget } from "../components/dashboard/StatsWidget";
import { getFinancialHealthSummary } from "./financialHealth";
import { calculateMonthlyTotals, calculateEndOfMonthForecast } from "./budgetCalculations";
import type { Profile, Transaction } from "../types";
import { getLocalDateIso } from "../utils";

describe("WERYFIKACJA KOŃCOWA UI - KONDYCJA FINANSOWA (FAZA 13)", () => {
  const todayIsoStr = getLocalDateIso();

  // Fabryka świeżego profilu (tak jak w useAppActions.ts:535-555)
  const createFreshProfile = (id = "fresh_profile_1"): Profile => ({
    id,
    name: "Świeży Profil",
    kind: "personal",
    partnerName: undefined,
    avatar: undefined,
    color: "#6366f1",
    pinHash: "",
    salt: "test_salt",
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    currency: "PLN",
    budgets: {
      "Żywność": 0,
      "Dom i rachunki": 0,
      "Transport": 0,
      "Rozrywka": 0
    }
  });

  const renderDashboardUI = (profile: Profile) => {
    cleanup();
    const monthly = calculateMonthlyTotals(profile.transactions, new Date(todayIsoStr));
    const balance = monthly.totalIncome - monthly.totalExpense;
    const forecast = calculateEndOfMonthForecast(profile, []);

    return render(
      <div>
        <StatsWidget
          currency={profile.currency}
          totalIncome={monthly.totalIncome}
          totalExpense={monthly.totalExpense}
          balance={balance}
          emergencyLimit={0}
          investmentCushion={0}
          endOfMonthForecast={forecast}
          safeBreakdown={{ safeToSpend: 0, balance: 0, unpaidBills: 0, plannedBudgetsLeft: 0, monthlyGoalTargets: 0, emergencyLimit: 0, investmentCushion: 0 }}
          onChangeView={() => {}}
        />
        <FinancialHealthBridgeCard
          profile={profile}
          onChangeView={() => {}}
        />
      </div>
    );
  };

  it("TEST 1 — ABSOLUTNIE ŚWIEŻY PROFIL", () => {
    const profile = createFreshProfile();
    const { container } = renderDashboardUI(profile);

    // 1. Sprawdź metryki finansowe na dashboardzie
    const incomeEl = container.querySelector("#dash-income-total");
    const expenseEl = container.querySelector("#dash-expense-total");
    const balanceEl = container.querySelector("#dash-balance-total");

    const norm = (str?: string | null) => str?.replace(/[\u00a0\s]/g, " ").trim();

    expect(norm(incomeEl?.textContent)).toBe("0,00 zł");
    expect(norm(expenseEl?.textContent)).toBe("0,00 zł");
    expect(norm(balanceEl?.textContent)).toBe("0,00 zł");

    // 2. Sprawdź kondycję finansową w getFinancialHealthSummary
    const summary = getFinancialHealthSummary(profile, [], { todayIsoStr });
    expect(summary.status).toBe("INSUFFICIENT_DATA");
    expect(summary.score).toBeNull();
    expect(summary.grade).toBe("insufficient_data");
    expect(summary.gradeLabel).toBe("Brak wystarczających danych");
    expect(summary.alerts).toHaveLength(0);

    // 3. Sprawdź UI karty Kondycji Finansowej
    expect(screen.getByText("Brak wystarczających danych")).toBeTruthy();
    expect(screen.getByText("Dodaj pierwsze transakcje, aby obliczyć kondycję finansową.")).toBeTruthy();

    const healthScoreText = container.querySelector("#dashboard-health-score");
    expect(healthScoreText?.textContent).toContain("Brak danych");

    // 4. Upewnij się, że zakazane wartości NIE występują w dokumencie
    expect(screen.queryByText(/83\/100/)).toBeNull();
    expect(screen.queryByText(/0\/100/)).toBeNull();
    expect(screen.queryByText("Dobra kondycja")).toBeNull();
    expect(screen.queryByText(/Niski bufor gotówkowy/i)).toBeNull();
    expect(screen.queryByText("+1")).toBeNull();

    // Sprawdź okrąg postępu - musi zawierać '—'
    const circleText = container.querySelector("svg + div span");
    expect(circleText?.textContent).toBe("—");
  });

  it("TEST 2 — RESTART APLIKACJI (pusty profil po restarcie)", () => {
    const originalProfile = createFreshProfile("restarted_profile");
    
    // Symulacja restartu aplikacji: serializacja do formatu magazynu (LevelDB/IDB) i odtworzenie
    const storedState = JSON.stringify(originalProfile);
    const loadedProfile: Profile = JSON.parse(storedState);

    const { container } = renderDashboardUI(loadedProfile);

    const summary = getFinancialHealthSummary(loadedProfile, [], { todayIsoStr });
    expect(summary.status).toBe("INSUFFICIENT_DATA");
    expect(summary.score).toBeNull();
    expect(summary.gradeLabel).toBe("Brak wystarczających danych");

    // Nie może wrócić 83/100
    expect(screen.queryByText(/83/)).toBeNull();
    expect(screen.queryByText(/Niski bufor gotówkowy/i)).toBeNull();
    expect(screen.getByText("Brak wystarczających danych")).toBeTruthy();

    const circleText = container.querySelector("svg + div span");
    expect(circleText?.textContent).toBe("—");
  });

  it("TEST 3 — PIERWSZY WPŁYW", () => {
    const profile = createFreshProfile();
    const incomeTx: Transaction = {
      id: "tx_income_1",
      name: "Wynagrodzenie za pracę",
      amount: 6500,
      type: "income",
      category: "Wynagrodzenie",
      account: "Główne",
      isoDate: todayIsoStr,
      currency: "PLN"
    };
    profile.transactions.push(incomeTx);

    const { container } = renderDashboardUI(profile);

    const summary = getFinancialHealthSummary(profile, [], { todayIsoStr });

    // Status zmienia się z INSUFFICIENT_DATA na ACTIVE
    expect(summary.status).toBe("ACTIVE");
    expect(typeof summary.score).toBe("number");
    expect(summary.score).toBeGreaterThan(0);
    expect(summary.gradeLabel).not.toBe("Brak wystarczających danych");

    // UI pokazuje obliczony wynik w formacie X/100
    const healthScoreText = container.querySelector("#dashboard-health-score");
    expect(healthScoreText?.textContent).toContain(`${summary.score}/100`);

    // Wynik nie jest pusty ani neutralny
    const circleText = container.querySelector("svg + div span");
    expect(circleText?.textContent).toBe(String(summary.score));

    // Brak fałszywego ostrzeżenia o buforze (6500 zł to bezpieczny bufor)
    expect(summary.alerts.some(a => a.title.includes("Niski bufor gotówkowy"))).toBe(false);
  });

  it("TEST 4 — PIERWSZY WYDATEK", () => {
    const profile = createFreshProfile();
    // Dodajemy wpływ i wydatek
    profile.transactions.push({
      id: "tx_inc",
      name: "Wpływ",
      amount: 5000,
      type: "income",
      category: "Wynagrodzenie",
      account: "Główne",
      isoDate: todayIsoStr,
      currency: "PLN"
    });
    profile.transactions.push({
      id: "tx_exp",
      name: "Opłata za mieszkanie",
      amount: 1800,
      type: "expense",
      category: "Dom i rachunki",
      account: "Główne",
      isoDate: todayIsoStr,
      currency: "PLN"
    });

    const { container } = renderDashboardUI(profile);

    const summary = getFinancialHealthSummary(profile, [], { todayIsoStr });

    expect(summary.status).toBe("ACTIVE");
    expect(typeof summary.score).toBe("number");
    expect(summary.score).toBeGreaterThan(0);

    // Sprawdź filary płynności i budżetu
    expect(summary.pillars.liquidity.score).toBe(25); // Saldo 3200 zł > bufor 500 zł
    expect(summary.pillars.budget.score).not.toBeNull();

    // Sprawdź UI
    const incomeEl = container.querySelector("#dash-income-total");
    const expenseEl = container.querySelector("#dash-expense-total");
    const balanceEl = container.querySelector("#dash-balance-total");

    // Formatowanie kwot
    const stripSpace = (s?: string | null) => s?.replace(/[\s\u00a0]/g, "");
    expect(stripSpace(incomeEl?.textContent)).toBe("5000,00zł");
    expect(stripSpace(expenseEl?.textContent)).toBe("1800,00zł");
    expect(stripSpace(balanceEl?.textContent)).toBe("3200,00zł");
  });

  it("TEST 5 — RESET (powrót do transactions = 0)", () => {
    const profile = createFreshProfile();
    // 1. Najpierw profil ma dane
    profile.transactions.push({
      id: "tx_temp",
      name: "Transakcja testowa",
      amount: 3000,
      type: "income",
      category: "Wynagrodzenie",
      account: "Główne",
      isoDate: todayIsoStr,
      currency: "PLN"
    });

    let summary = getFinancialHealthSummary(profile, [], { todayIsoStr });
    expect(summary.status).toBe("ACTIVE");
    expect(summary.score).not.toBeNull();

    // 2. Czyścimy transakcje (reset profilu)
    profile.transactions = [];

    // 3. Po resecie natychmiast wraca do INSUFFICIENT_DATA
    summary = getFinancialHealthSummary(profile, [], { todayIsoStr });
    expect(summary.status).toBe("INSUFFICIENT_DATA");
    expect(summary.score).toBeNull();
    expect(summary.gradeLabel).toBe("Brak wystarczających danych");
    expect(summary.alerts).toHaveLength(0);

    const { container } = renderDashboardUI(profile);
    const healthScoreText = container.querySelector("#dashboard-health-score");
    expect(healthScoreText?.textContent).toContain("Brak danych");
    expect(screen.queryByText(/83/)).toBeNull();
  });

  it("TEST 6 — PERSISTENCE (izolacja stanów i brak przecieku score)", () => {
    // Krok A: EMPTY -> restart -> EMPTY
    const emptyProfile = createFreshProfile("empty_profile");
    const serializedEmpty = JSON.stringify(emptyProfile);
    const reloadedEmpty: Profile = JSON.parse(serializedEmpty);

    const emptySummary = getFinancialHealthSummary(reloadedEmpty, [], { todayIsoStr });
    expect(emptySummary.status).toBe("INSUFFICIENT_DATA");
    expect(emptySummary.score).toBeNull();

    // Krok B: ACTIVE -> restart -> ACTIVE
    const activeProfile = createFreshProfile("active_profile");
    activeProfile.transactions.push({
      id: "tx_active",
      name: "Przychód",
      amount: 4000,
      type: "income",
      category: "Wynagrodzenie",
      account: "Konto",
      isoDate: todayIsoStr,
      currency: "PLN"
    });

    const serializedActive = JSON.stringify(activeProfile);
    const reloadedActive: Profile = JSON.parse(serializedActive);

    const activeSummary = getFinancialHealthSummary(reloadedActive, [], { todayIsoStr });
    expect(activeSummary.status).toBe("ACTIVE");
    expect(typeof activeSummary.score).toBe("number");
    expect(activeSummary.score).toBeGreaterThan(0);

    // Krok C: Otwarcie profilu pustego zaraz po aktywnym (brak przecieku zmiennych globalnych/cache)
    const freshReopenedSummary = getFinancialHealthSummary(reloadedEmpty, [], { todayIsoStr });
    expect(freshReopenedSummary.status).toBe("INSUFFICIENT_DATA");
    expect(freshReopenedSummary.score).toBeNull();
    expect(freshReopenedSummary.gradeLabel).toBe("Brak wystarczających danych");
  });
});
