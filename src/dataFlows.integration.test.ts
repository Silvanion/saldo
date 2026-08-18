// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppActions } from "./hooks/useAppActions";
import { AppState, Profile, RecurringRule, Transaction } from "./types";
import { applyRecurringRules } from "./services/recurringEngine";
import { calculateDashboardMetrics } from "./hooks/useDashboardMetrics";
import { calculatePartnerSettlement } from "./services/settlementEngine";
import { calculateBudgetWarnings } from "./services/budgetCalculations";

describe("Integration: Core Transaction, Recurring & Derived Data Pipelines", () => {
  const isRoundedToTwoDecimals = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100 === val;

  it("1. Transaction pipeline: creates, persists, and edits transactions with strict profile isolation and technical field preservation", async () => {
    let savedState: AppState | null = null;
    const saveState = vi.fn().mockImplementation(async (newState: AppState) => {
      savedState = newState;
    });

    const initialProfile1: Profile = {
      id: "p-active",
      name: "Profil Aktywny",
      kind: "personal",
      currency: "PLN",
      transactions: [],
      payments: [],
      goals: [],
      investments: [],
      budgets: { "Żywność": 500 }
    };

    const initialProfile2: Profile = {
      id: "p-passive",
      name: "Profil Pasywny",
      kind: "shared",
      currency: "PLN",
      transactions: [],
      payments: [],
      goals: [],
      investments: [],
      budgets: {}
    };

    let currentState: AppState = {
      activeProfileId: "p-active",
      profiles: [initialProfile1, initialProfile2]
    };

    const { result, rerender } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles.find((p) => p.id === currentState.activeProfileId) || null,
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn(),
        showToast: vi.fn(),
        openModal: vi.fn()
      })
    );

    // 1. Create transaction via public action layer
    act(() => {
      result.current.handleAddTransaction({
        name: "Zakupy spożywcze",
        amount: 145.50,
        category: "Żywność",
        account: "Konto Główne",
        type: "expense",
        isoDate: "2026-05-10",
        currency: "PLN"
      });
    });

    expect(saveState).toHaveBeenCalledTimes(1);
    expect(savedState).not.toBeNull();

    // Verify active profile was updated with exact data
    const activeProfileSaved = savedState!.profiles.find((p) => p.id === "p-active")!;
    expect(activeProfileSaved.transactions).toHaveLength(1);
    const createdTx = activeProfileSaved.transactions[0];
    expect(createdTx.name).toBe("Zakupy spożywcze");
    expect(createdTx.amount).toBe(145.50);
    expect(createdTx.category).toBe("Żywność");
    expect(createdTx.isoDate).toBe("2026-05-10");
    expect(createdTx.account).toBe("Konto Główne");
    expect(createdTx.currency).toBe("PLN");

    // Verify passive profile remained strictly untouched
    const passiveProfileSaved = savedState!.profiles.find((p) => p.id === "p-passive")!;
    expect(passiveProfileSaved.transactions).toHaveLength(0);

    // Update local state to reflect persistence
    currentState = savedState!;
    rerender();

    // 2. Edit transaction and verify technical fields remain intact
    act(() => {
      result.current.handleUpdateTransaction(createdTx.id, {
        name: "Supermarket",
        amount: 160.00,
        category: "Żywność"
      });
    });

    expect(saveState).toHaveBeenCalledTimes(2);
    const reloadedActive = savedState!.profiles.find((p) => p.id === "p-active")!;
    expect(reloadedActive.transactions).toHaveLength(1);
    const updatedTx = reloadedActive.transactions[0];
    expect(updatedTx.id).toBe(createdTx.id);
    expect(updatedTx.name).toBe("Supermarket");
    expect(updatedTx.amount).toBe(160.00);
    expect(updatedTx.isRecurring).toBe(createdTx.isRecurring);
    expect(updatedTx.recurringRuleId).toBe(createdTx.recurringRuleId);
    expect(updatedTx.sourcePaymentId).toBe(createdTx.sourcePaymentId);

    // Passive profile is still untouched
    const reloadedPassive = savedState!.profiles.find((p) => p.id === "p-passive")!;
    expect(reloadedPassive.transactions).toHaveLength(0);
  });

  it("2. Payment / recurring isolation pipeline: generates transactions for intended profile only, preserves rule references, and prevents duplicate creations", () => {
    let savedState: AppState | null = null;
    const saveState = vi.fn().mockImplementation(async (newState: AppState) => {
      savedState = newState;
    });

    const recurringRule: RecurringRule = {
      id: "rule-sub-netflix",
      name: "Netflix",
      amount: 49.99,
      type: "expense",
      category: "Rozrywka",
      account: "Konto Główne",
      frequency: "monthly",
      nextDueDate: "2026-05-01",
      isActive: true,
      currency: "PLN"
    };

    const profileA: Profile = {
      id: "profile-a",
      name: "Profil A",
      kind: "personal",
      currency: "PLN",
      transactions: [],
      payments: [
        {
          id: "pay-internet-1",
          name: "Światłowód",
          amount: 79.90,
          dueDate: "2026-05-15",
          status: "Do opłacenia",
          currency: "PLN"
        }
      ],
      goals: [],
      investments: [],
      budgets: {},
      recurringRules: [recurringRule]
    };

    const profileB: Profile = {
      id: "profile-b",
      name: "Profil B",
      kind: "personal",
      currency: "PLN",
      transactions: [],
      payments: [],
      goals: [],
      investments: [],
      budgets: {},
      recurringRules: []
    };

    // 1. Process recurring rule as of 2026-05-05
    const evaluationDate = "2026-05-05";
    const resultA = applyRecurringRules(profileA.recurringRules!, profileA.transactions, evaluationDate);
    expect(resultA.hasChanges).toBe(true);
    expect(resultA.generatedTransactions).toHaveLength(1);

    const generatedTx = resultA.generatedTransactions[0];
    expect(generatedTx.recurringRuleId).toBe("rule-sub-netflix");
    expect(generatedTx.isRecurring).toBe(true);
    expect(generatedTx.isoDate).toBe("2026-05-01");
    expect(generatedTx.amount).toBe(49.99);

    // Profile B has no recurring rules and generates nothing
    const resultB = applyRecurringRules(profileB.recurringRules!, profileB.transactions, evaluationDate);
    expect(resultB.hasChanges).toBe(false);
    expect(resultB.generatedTransactions).toHaveLength(0);

    // Deduplication check: re-running with generated transaction in existing list yields 0 new transactions
    const updatedTxListA = [...profileA.transactions, generatedTx];
    const deduplicationResult = applyRecurringRules(resultA.updatedRules, updatedTxListA, evaluationDate);
    expect(deduplicationResult.generatedTransactions).toHaveLength(0);

    // 2. Toggle payment status in Profile A through useAppActions
    let currentState: AppState = {
      activeProfileId: "profile-a",
      profiles: [
        {
          ...profileA,
          transactions: updatedTxListA,
          recurringRules: resultA.updatedRules
        },
        profileB
      ]
    };

    const { result } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles.find((p) => p.id === "profile-a") || null,
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn(),
        showToast: vi.fn(),
        openModal: vi.fn()
      })
    );

    act(() => {
      result.current.handleTogglePaymentStatus("pay-internet-1");
    });

    expect(saveState).toHaveBeenCalled();
    const savedA = savedState!.profiles.find((p) => p.id === "profile-a")!;
    expect(savedA.payments.find((p) => p.id === "pay-internet-1")?.status).toBe("Opłacono");

    const linkedTx = savedA.transactions.find((t) => t.sourcePaymentId === "pay-internet-1");
    expect(linkedTx).toBeDefined();
    expect(linkedTx!.amount).toBe(79.90);
    expect(linkedTx!.type).toBe("expense");

    // Profile B remains completely untouched
    const savedB = savedState!.profiles.find((p) => p.id === "profile-b")!;
    expect(savedB.transactions).toHaveLength(0);
    expect(savedB.payments).toHaveLength(0);
  });

  it("3. Derived-data pipeline: computes dashboard metrics, budget warnings and settlement with 2-decimal precision and zero profile cross-contamination", () => {
    const activeProfile: Profile = {
      id: "p-shared-active",
      name: "Aktywny Wspólny",
      kind: "shared",
      currency: "PLN",
      budgets: {
        "Żywność": 200.00
      },
      accounts: [
        { id: "acc-1", name: "Konto Główne", bankName: "mBank", hasCreditLimit: false, creditLimit: 0 }
      ],
      transactions: [
        { id: "tx-inc-1", name: "Pensja", amount: 5000.00, type: "income", category: "Wynagrodzenie", account: "Konto Główne", isoDate: "2026-05-02", currency: "PLN" },
        { id: "tx-f1", name: "Pieczywo", amount: 10.10, type: "expense", category: "Żywność", account: "Konto Główne", isoDate: "2026-05-03", currency: "PLN" },
        { id: "tx-f2", name: "Warzywa", amount: 20.20, type: "expense", category: "Żywność", account: "Konto Główne", isoDate: "2026-05-04", currency: "PLN" },
        { id: "tx-f3", name: "Napoje", amount: 5.05, type: "expense", category: "Żywność", account: "Konto Główne", isoDate: "2026-05-05", currency: "PLN" },
        { id: "tx-joint-1", name: "Wspólne AGD", amount: 150.00, type: "expense", category: "Dom i rachunki", account: "Konto Główne", isoDate: "2026-05-06", paidBy: "me", splitMode: "equal", currency: "PLN" }
      ],
      payments: [
        { id: "pay-1", name: "Czynsz", amount: 600.00, dueDate: "2026-05-20", status: "Do opłacenia", currency: "PLN" }
      ],
      goals: [],
      investments: []
    };

    const unrelatedContaminatingProfile: Profile = {
      id: "p-unrelated",
      name: "Inny profil",
      kind: "personal",
      currency: "PLN",
      budgets: { "Żywność": 10000.00 },
      transactions: [
        { id: "tx-huge-1", name: "Zakup Samochodu", amount: 75000.00, type: "expense", category: "Transport", account: "Konto", isoDate: "2026-05-04", currency: "PLN" },
        { id: "tx-huge-inc", name: "Sprzedaż Nieruchomości", amount: 120000.00, type: "income", category: "Inne", account: "Konto", isoDate: "2026-05-01", currency: "PLN" }
      ],
      payments: [],
      goals: [],
      investments: []
    };

    const selectedDate = new Date(2026, 4, 15); // May 2026

    // 1. Dashboard metrics pipeline
    const dashboardMetrics = calculateDashboardMetrics(activeProfile, selectedDate, []);

    expect(dashboardMetrics.totalIncome).toBe(5000.00);
    // 10.10 + 20.20 + 5.05 + 150.00 = 185.35
    expect(dashboardMetrics.totalExpense).toBe(185.35);
    expect(dashboardMetrics.balance).toBe(4814.65);
    expect(isRoundedToTwoDecimals(dashboardMetrics.totalIncome)).toBe(true);
    expect(isRoundedToTwoDecimals(dashboardMetrics.totalExpense)).toBe(true);
    expect(isRoundedToTwoDecimals(dashboardMetrics.balance)).toBe(true);

    // 2. Budget warnings pipeline
    const warnings = calculateBudgetWarnings(activeProfile, "2026-05-15");
    const foodWarning = warnings.find((w) => w.category === "Żywność");
    expect(foodWarning).toBeDefined();
    // 10.10 + 20.20 + 5.05 = 35.35
    expect(foodWarning!.spent).toBe(35.35);
    expect(isRoundedToTwoDecimals(foodWarning!.spent)).toBe(true);

    // 3. Partner settlement pipeline
    const settlement = calculatePartnerSettlement(activeProfile);
    // Paid 150.00 by "me" with "equal" split -> partner owes 75.00
    expect(settlement.historyNet).toBe(75.00);
    expect(isRoundedToTwoDecimals(settlement.historyNet)).toBe(true);

    // 4. Verification that contaminating profile calculations are completely isolated
    const unrelatedMetrics = calculateDashboardMetrics(unrelatedContaminatingProfile, selectedDate, []);
    expect(unrelatedMetrics.totalIncome).toBe(120000.00);
    expect(unrelatedMetrics.totalExpense).toBe(75000.00);
    expect(dashboardMetrics.totalExpense).not.toBe(unrelatedMetrics.totalExpense);
  });
});
