// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useBudgetState, validateAndMigrateState } from "./useBudgetState";
import { AppState } from "../types";
import { autoCategorizeTransaction } from "../utils";
import { act, createElement } from "react";
import { createRoot, Root } from "react-dom/client";
import * as localDb from "../services/localDb";
import { LOCAL_STORAGE_KEY_V2 } from "../services/localDb";
import { setDoc } from "firebase/firestore";
import * as cryptoModule from "../services/crypto";

vi.mock("firebase/firestore", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    doc: vi.fn(() => "mocked-doc-ref"),
    setDoc: vi.fn(),
    onSnapshot: vi.fn(() => vi.fn()) // return mock unsubscribe
  };
});

// Polyfill localStorage for node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage.clear !== "function") {
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    writable: true
  });
}
if (typeof window !== "undefined" && (typeof window.localStorage === "undefined" || typeof window.localStorage.clear !== "function")) {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true
  });
}

describe("validateAndMigrateState", () => {
  it("multi-profile, reguły BEZ profileId, raw.activeProfileId=null → WSZYSTKIE w state.recurringRules, profiles[*].recurringRules puste (anty-wyciek)", () => {
    const rawState = {
      activeProfileId: null,
      profiles: [
        { id: "p1", name: "P1", kind: "personal" },
        { id: "p2", name: "P2", kind: "personal" }
      ],
      recurringRules: [
        { id: "r1", name: "Rule 1", amount: 100, type: "expense", category: "Food", account: "Cash", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true },
        { id: "r2", name: "Rule 2", amount: 200, type: "income", category: "Salary", account: "Bank", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true }
      ]
    };

    const migrated = validateAndMigrateState(rawState);

    expect(migrated.recurringRules?.length).toBe(2);
    expect(migrated.recurringRules?.[0].id).toBe("r1");
    expect(migrated.recurringRules?.[1].id).toBe("r2");

    const p1 = migrated.profiles.find((p) => p.id === "p1");
    const p2 = migrated.profiles.find((p) => p.id === "p2");

    expect(p1?.recurringRules?.length).toBe(0);
    expect(p2?.recurringRules?.length).toBe(0);
  });

  it("reguła.profileId=\"p2\" przy profilach p1,p2 → tylko p2 dostaje regułę; global empty", () => {
    const rawState = {
      activeProfileId: "p1",
      profiles: [
        { id: "p1", name: "P1", kind: "personal" },
        { id: "p2", name: "P2", kind: "personal" }
      ],
      recurringRules: [
        { id: "r1", name: "Rule for P2", profileId: "p2", amount: 50, type: "expense", category: "Fun", account: "Card", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true }
      ]
    };

    const migrated = validateAndMigrateState(rawState);

    const p1 = migrated.profiles.find((p) => p.id === "p1");
    const p2 = migrated.profiles.find((p) => p.id === "p2");

    expect(p1?.recurringRules?.length).toBe(0);
    expect(p2?.recurringRules?.length).toBe(1);
    expect(p2?.recurringRules?.[0].id).toBe("r1");
    expect("profileId" in (p2?.recurringRules?.[0] || {})).toBe(false);

    expect(migrated.recurringRules?.length).toBe(0);
  });

  it("reguła.profileId=\"missing\" → unmigrated global", () => {
    const rawState = {
      activeProfileId: "p1",
      profiles: [
        { id: "p1", name: "P1", kind: "personal" },
        { id: "p2", name: "P2", kind: "personal" }
      ],
      recurringRules: [
        { id: "r1", name: "Missing Profile Rule", profileId: "missing", amount: 50, type: "expense", category: "Fun", account: "Card", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true }
      ]
    };

    const migrated = validateAndMigrateState(rawState);

    expect(migrated.recurringRules?.length).toBe(1);
    expect(migrated.recurringRules?.[0].id).toBe("r1");

    const p1 = migrated.profiles.find((p) => p.id === "p1");
    const p2 = migrated.profiles.find((p) => p.id === "p2");

    expect(p1?.recurringRules?.length).toBe(0);
    expect(p2?.recurringRules?.length).toBe(0);
  });

  it("raw.activeProfileId=\"p1\", reguła bez profileId → p1; nie p2", () => {
    const rawState = {
      activeProfileId: "p1",
      profiles: [
        { id: "p1", name: "P1", kind: "personal" },
        { id: "p2", name: "P2", kind: "personal" }
      ],
      recurringRules: [
        { id: "r1", name: "Rule for Active Profile", amount: 120, type: "expense", category: "Bills", account: "Bank", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true }
      ]
    };

    const migrated = validateAndMigrateState(rawState);

    const p1 = migrated.profiles.find((p) => p.id === "p1");
    const p2 = migrated.profiles.find((p) => p.id === "p2");

    expect(p1?.recurringRules?.length).toBe(1);
    expect(p1?.recurringRules?.[0].id).toBe("r1");
    expect(p2?.recurringRules?.length).toBe(0);
    expect(migrated.recurringRules?.length).toBe(0);
  });

  it("pojedynczy profil, reguła bez profileId → do tego profilu; global empty", () => {
    const rawState = {
      activeProfileId: null,
      profiles: [
        { id: "p1", name: "Only Profile", kind: "personal" }
      ],
      recurringRules: [
        { id: "r1", name: "Single Profile Rule", amount: 100, type: "expense", category: "General", account: "Cash", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true }
      ]
    };

    const migrated = validateAndMigrateState(rawState);

    const p1 = migrated.profiles.find((p) => p.id === "p1");

    expect(p1?.recurringRules?.length).toBe(1);
    expect(p1?.recurringRules?.[0].id).toBe("r1");
    expect(migrated.recurringRules?.length).toBe(0);
  });

  it("drugie wywołanie migrate na wyniku → brak duplikatów id", () => {
    const rawState = {
      activeProfileId: "p1",
      profiles: [
        { id: "p1", name: "Main", kind: "personal", recurringRules: [{ id: "r1", name: "Existing", amount: 10, type: "expense", category: "Food", account: "Cash", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true }] }
      ],
      recurringRules: [
        { id: "r1", name: "Existing" },
        { id: "r2", name: "New", amount: 20, type: "expense", category: "Food", account: "Cash", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true }
      ]
    };

    const migrated1 = validateAndMigrateState(rawState);

    const prof1 = migrated1.profiles.find((p) => p.id === "p1");
    expect(prof1?.recurringRules?.length).toBe(2);
    expect(prof1?.recurringRules?.[0].id).toBe("r1");
    expect(prof1?.recurringRules?.[1].id).toBe("r2");
    expect(migrated1.recurringRules?.length).toBe(0);

    const migrated2 = validateAndMigrateState(migrated1);
    const prof2 = migrated2.profiles.find((p) => p.id === "p1");
    expect(prof2?.recurringRules?.length).toBe(2);
    expect(migrated2.recurringRules?.length).toBe(0);
  });

  it("junk w tablicy ([null, {id:\"x\", ...valid}]) → tylko valid migruje / junk drop", () => {
    const rawState = {
      activeProfileId: "p1",
      profiles: [
        { id: "p1", name: "P1", kind: "personal" }
      ],
      recurringRules: [
        null,
        undefined,
        123,
        "string",
        {},
        { id: "" },
        { id: "   " },
        { id: "valid-x", name: "Valid Rule", amount: 200, type: "income", category: "Bonus", account: "Bank", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true }
      ]
    };

    const migrated = validateAndMigrateState(rawState);

    const p1 = migrated.profiles.find((p) => p.id === "p1");

    expect(p1?.recurringRules?.length).toBe(1);
    expect(p1?.recurringRules?.[0].id).toBe("valid-x");
    expect(migrated.recurringRules?.length).toBe(0);
  });

  it("recurring rule bez nextDueDate (lub niepoprawny) → fallback do formatu YYYY-MM-DD", () => {
    const rawState = {
      activeProfileId: "p1",
      profiles: [{ id: "p1", name: "P1", kind: "personal" }],
      recurringRules: [
        { id: "r-no-date", name: "No Date Rule", amount: 100, type: "expense", category: "Food", account: "Cash", frequency: "monthly" },
        { id: "r-invalid-date", name: "Invalid Date Rule", amount: 50, type: "expense", category: "Food", account: "Cash", frequency: "monthly", nextDueDate: "invalid-date" }
      ]
    };

    const migrated = validateAndMigrateState(rawState);
    const p1 = migrated.profiles.find((p) => p.id === "p1");

    expect(p1?.recurringRules?.length).toBe(2);

    const r1 = p1?.recurringRules?.[0];
    const r2 = p1?.recurringRules?.[1];

    expect(r1?.nextDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r1?.nextDueDate).not.toBe("");
    expect(r2?.nextDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r2?.nextDueDate).not.toBe("");
  });

  describe("transactionRules per profile migration & isolation", () => {
    it("migrates global transactionRules to active profile", () => {
      const rawState = {
        activeProfileId: "prof-a",
        profiles: [
          { id: "prof-a", name: "A", kind: "personal" },
          { id: "prof-b", name: "B", kind: "personal" }
        ],
        transactionRules: [
          { id: "tr-1", pattern: "Biedronka", category: "Żywność" }
        ]
      };

      const migrated = validateAndMigrateState(rawState);

      const profA = migrated.profiles.find(p => p.id === "prof-a");
      expect(profA?.transactionRules?.length).toBe(1);
      expect(profA?.transactionRules?.[0].pattern).toBe("Biedronka");

      const profB = migrated.profiles.find(p => p.id === "prof-b");
      expect(profB?.transactionRules?.length).toBe(0);

      expect(migrated.transactionRules?.length).toBe(0);
    });

    it("migrates global transactionRules with explicit profileId to target profile", () => {
      const rawState = {
        activeProfileId: "prof-a",
        profiles: [
          { id: "prof-a", name: "A", kind: "personal" },
          { id: "prof-b", name: "B", kind: "personal" }
        ],
        transactionRules: [
          { id: "tr-2", pattern: "Lidl", category: "Zakupy", profileId: "prof-b" }
        ]
      };

      const migrated = validateAndMigrateState(rawState);

      const profA = migrated.profiles.find(p => p.id === "prof-a");
      expect(profA?.transactionRules?.length).toBe(0);

      const profB = migrated.profiles.find(p => p.id === "prof-b");
      expect(profB?.transactionRules?.length).toBe(1);
      expect(profB?.transactionRules?.[0].id).toBe("tr-2");
      expect(profB?.transactionRules?.[0].profileId).toBeUndefined();

      expect(migrated.transactionRules?.length).toBe(0);
    });

    it("ensures rule isolation between profile A and profile B", () => {
      const rawState = {
        activeProfileId: "prof-a",
        profiles: [
          {
            id: "prof-a",
            name: "A",
            kind: "personal",
            transactionRules: [{ id: "r-a", pattern: "Sklep A", category: "Kategoria A", categoryIcon: "🅰️" }]
          },
          {
            id: "prof-b",
            name: "B",
            kind: "personal",
            transactionRules: [{ id: "r-b", pattern: "Sklep B", category: "Kategoria B", categoryIcon: "🅱️" }]
          }
        ]
      };

      const migrated = validateAndMigrateState(rawState);
      const profA = migrated.profiles.find(p => p.id === "prof-a")!;
      const profB = migrated.profiles.find(p => p.id === "prof-b")!;

      // Profile A rules categorize "Sklep A" -> "Kategoria A"
      const resA = autoCategorizeTransaction("Sklep A", profA.transactionRules || [], "");
      expect(resA.category).toBe("Kategoria A");

      // Profile B rules do NOT categorize "Sklep A" using Profile A rules
      const resBForSklepA = autoCategorizeTransaction("Sklep A", profB.transactionRules || [], "Inne");
      expect(resBForSklepA.category).not.toBe("Kategoria A");

      // Profile B rules categorize "Sklep B" -> "Kategoria B"
      const resB = autoCategorizeTransaction("Sklep B", profB.transactionRules || [], "");
      expect(resB.category).toBe("Kategoria B");
    });
  });
});

describe("useBudgetState hydration race condition protection", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  function renderBudgetHook() {
    const result: { current: ReturnType<typeof useBudgetState> | null } = { current: null };
    function TestComponent() {
      result.current = useBudgetState(null);
      return null;
    }
    act(() => {
      root.render(createElement(TestComponent));
    });
    return result as { current: ReturnType<typeof useBudgetState> };
  }

  it("IDB starszy niż LS/init -> po hydrate stan = init (nowszy), nie IDB", async () => {
    const lsState = validateAndMigrateState({
      updatedAt: "2026-07-23T10:00:00.000Z",
      profiles: [{ id: "p1", name: "LS Profile", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(lsState));

    const idbOldState = validateAndMigrateState({
      updatedAt: "2026-07-23T08:00:00.000Z",
      profiles: [{ id: "p1", name: "IDB Old Profile", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });

    vi.spyOn(localDb, "loadState").mockResolvedValue(idbOldState);

    const hookRef = renderBudgetHook();

    expect(hookRef.current.state.profiles[0].name).toBe("LS Profile");

    // Wait for loadState to complete
    await act(async () => {
      await Promise.resolve();
    });

    // Final state must remain LS Profile, not old IDB Profile
    expect(hookRef.current.state.profiles[0].name).toBe("LS Profile");
    expect(hookRef.current.state.updatedAt).toBe("2026-07-23T10:00:00.000Z");
  });

  it("IDB nowszy niż init -> po hydrate stan = IDB", async () => {
    const lsState = validateAndMigrateState({
      updatedAt: "2026-07-23T10:00:00.000Z",
      profiles: [{ id: "p1", name: "LS Profile", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(lsState));

    const idbNewerState = validateAndMigrateState({
      updatedAt: "2026-07-23T12:00:00.000Z",
      profiles: [{ id: "p1", name: "IDB Newer Profile", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });

    vi.spyOn(localDb, "loadState").mockResolvedValue(idbNewerState);

    const hookRef = renderBudgetHook();

    expect(hookRef.current.state.profiles[0].name).toBe("LS Profile");

    await act(async () => {
      await Promise.resolve();
    });

    // Final state must be updated to IDB Newer Profile
    expect(hookRef.current.state.profiles[0].name).toBe("IDB Newer Profile");
    expect(hookRef.current.state.updatedAt).toBe("2026-07-23T12:00:00.000Z");
  });

  it("saveState w trakcie pending loadState -> finalny stan = zapisany, nie stary IDB", async () => {
    let resolveLoadState!: (value: AppState | null) => void;
    const loadStatePromise = new Promise<AppState | null>((res) => {
      resolveLoadState = res;
    });

    vi.spyOn(localDb, "loadState").mockReturnValue(loadStatePromise);
    vi.spyOn(localDb, "saveState").mockResolvedValue();

    const lsState = validateAndMigrateState({
      updatedAt: "2026-07-23T08:00:00.000Z",
      profiles: [{ id: "p1", name: "Initial Profile", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(lsState));

    const hookRef = renderBudgetHook();

    // Perform saveState while loadState is pending
    const savedState = validateAndMigrateState({
      updatedAt: "2026-07-23T11:00:00.000Z",
      profiles: [{ id: "p1", name: "User Saved Profile", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });

    await act(async () => {
      await hookRef.current.saveState(savedState, true);
    });

    expect(hookRef.current.state.profiles[0].name).toBe("User Saved Profile");

    // Resolve loadState with an older snapshot
    const oldIdbState = validateAndMigrateState({
      updatedAt: "2026-07-23T09:00:00.000Z",
      profiles: [{ id: "p1", name: "Old IDB Snapshot", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });

    await act(async () => {
      resolveLoadState(oldIdbState);
      await loadStatePromise;
    });

    // Final state must retain the user saved state, not the old IDB snapshot
    expect(hookRef.current.state.profiles[0].name).toBe("User Saved Profile");
  });

  it("equal updatedAt -> nie nadpisuj (stabilność)", async () => {
    const time = "2026-07-23T10:00:00.000Z";
    const lsState = validateAndMigrateState({
      updatedAt: time,
      lastModifiedBy: "LS Origin",
      profiles: [{ id: "p1", name: "LS Profile", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(lsState));

    const idbStateSameTime = validateAndMigrateState({
      updatedAt: time,
      lastModifiedBy: "IDB Origin",
      profiles: [{ id: "p1", name: "IDB Equal Profile", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });

    vi.spyOn(localDb, "loadState").mockResolvedValue(idbStateSameTime);

    const hookRef = renderBudgetHook();

    await act(async () => {
      await Promise.resolve();
    });

    // Equal updatedAt should ignore IDB and keep initial LS state
    expect(hookRef.current.state.lastModifiedBy).toBe("LS Origin");
    expect(hookRef.current.state.profiles[0].name).toBe("LS Profile");
  });
});

describe("saveState — Firestore size limit handling", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  function renderBudgetHookWithUser() {
    const result: { current: ReturnType<typeof useBudgetState> | null } = { current: null };
    function TestComponent() {
      result.current = useBudgetState({ uid: "user123", email: "test@example.com" } as any);
      return null;
    }
    act(() => {
      root.render(createElement(TestComponent));
    });
    return result as { current: ReturnType<typeof useBudgetState> };
  }

  it("payload >= FIRESTORE_DOC_HARD_LIMIT_BYTES -> blocks setDoc", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    const mockedSetDoc = vi.mocked(setDoc);
    mockedSetDoc.mockClear();

    const hookRef = renderBudgetHookWithUser();

    const hugeState = {
      profiles: [{
        id: "p1", name: "Huge Profile", kind: "personal",
        transactions: [{ id: "t1", name: "x".repeat(cryptoModule.FIRESTORE_DOC_HARD_LIMIT_BYTES + 100), amount: 10, type: "expense", category: "Test", account: "Test", isoDate: "2026-01-01" }],
        payments: [], goals: [], investments: [], budgets: {}
      }]
    };

    await act(async () => {
      await hookRef.current!.saveState(hugeState as any);
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(mockedSetDoc).not.toHaveBeenCalled();
    expect(hookRef.current!.apiError).toContain("zbyt duże");
  });

  it("payload >= FIRESTORE_DOC_WARNING_BYTES ale < HARD_LIMIT -> allows setDoc but warns", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    const mockedSetDoc = vi.mocked(setDoc);
    mockedSetDoc.mockClear();

    const hookRef = renderBudgetHookWithUser();

    const warningState = {
      profiles: [{
        id: "p1", name: "Warning Profile", kind: "personal",
        transactions: [{ id: "t1", name: "x".repeat(cryptoModule.FIRESTORE_DOC_WARNING_BYTES + 100), amount: 10, type: "expense", category: "Test", account: "Test", isoDate: "2026-01-01" }],
        payments: [], goals: [], investments: [], budgets: {}
      }]
    };

    await act(async () => {
      await hookRef.current!.saveState(warningState as any);
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(mockedSetDoc).toHaveBeenCalled();
    expect(hookRef.current!.apiError).toContain("zbliżają się do limitu");
  });

  it("setDoc rzuca błąd zawierający 'too large'", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    const mockedSetDoc = vi.mocked(setDoc);
    mockedSetDoc.mockClear();
    mockedSetDoc.mockRejectedValueOnce(new Error("document is too large 1 mib"));

    const hookRef = renderBudgetHookWithUser();

    const normalState = {
      profiles: [{ id: "p1", name: "Normal", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    };

    await act(async () => {
      await hookRef.current!.saveState(normalState as any);
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(mockedSetDoc).toHaveBeenCalled();
    expect(hookRef.current!.apiError).toContain("przekroczył limit rozmiaru");
  });

  it("setDoc rzuca generyczny błąd sieciowy", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    const mockedSetDoc = vi.mocked(setDoc);
    mockedSetDoc.mockClear();
    mockedSetDoc.mockRejectedValueOnce(new Error("permission-denied"));

    const hookRef = renderBudgetHookWithUser();

    const normalState = {
      profiles: [{ id: "p1", name: "Normal", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    };

    await act(async () => {
      await hookRef.current!.saveState(normalState as any);
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(mockedSetDoc).toHaveBeenCalled();
    expect(hookRef.current!.apiError).toContain("Błąd synchronizacji z chmurą");
  });
});

