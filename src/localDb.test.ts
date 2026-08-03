import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { loadState, saveState, clearState, LOCAL_STORAGE_KEY_V1, LOCAL_STORAGE_KEY_V2 } from "./services/localDb";
import { AppState } from "./types";

// Polyfill localStorage for Node vitest environment if missing
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

if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    writable: true
  });
}

describe("PROMPT C1 — localDb & IndexedDB storage with migration & fallback", () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearState();
  });

  it("1. loadState returns null when both IndexedDB and localStorage are empty", async () => {
    const loaded = await loadState();
    expect(loaded).toBeNull();
  });

  it("2. saveState saves to IndexedDB and dual-writes to localStorage V2", async () => {
    const state: AppState = {
      profiles: [{
        id: "p1",
        name: "Test Profile",
        kind: "personal",
        transactions: [],
        payments: [],
        goals: [],
        investments: [],
        currency: "PLN", budgets: {}
      }],
      activeProfileId: "p1",
      schemaVersion: 1,
      updatedAt: "2026-07-23T12:00:00.000Z",
      lastModifiedBy: "test",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    await saveState(state);

    const loaded = await loadState();
    expect(loaded).not.toBeNull();
    expect(loaded?.profiles[0].name).toBe("Test Profile");

    const lsV2 = localStorage.getItem(LOCAL_STORAGE_KEY_V2);
    expect(lsV2).not.toBeNull();
    expect(JSON.parse(lsV2!).activeProfileId).toBe("p1");
  });

  it("3. loadState migrates data from localStorage V2 to IndexedDB if IDB is empty", async () => {
    const v2State: AppState = {
      profiles: [{
        id: "p-v2",
        name: "Profil V2",
        kind: "personal",
        transactions: [{ id: "tx1", name: "Kawa", amount: 15, type: "expense", category: "Jedzenie", account: "Gotówka", isoDate: "2026-07-01",
            currency: "PLN"
        }],
        payments: [],
        goals: [],
        investments: [],
        currency: "PLN", budgets: {}
      }],
      activeProfileId: "p-v2",
      schemaVersion: 1,
      updatedAt: "2026-07-23T10:00:00.000Z",
      lastModifiedBy: "v2user",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(v2State));

    const loaded = await loadState();
    expect(loaded).not.toBeNull();
    expect(loaded?.profiles[0].name).toBe("Profil V2");

    // Clear localStorage to prove IDB now holds the state
    localStorage.clear();

    const loadedFromIDB = await loadState();
    expect(loadedFromIDB).not.toBeNull();
    expect(loadedFromIDB?.profiles[0].name).toBe("Profil V2");
  });

  it("4. loadState migrates data from localStorage V1 to IDB & V2, removing V1", async () => {
    const v1State = {
      profiles: [{
        id: "p-v1",
        name: "Stary Profil V1",
        kind: "personal",
        transactions: [],
        payments: [],
        goals: [],
        investments: [],
        currency: "PLN", budgets: {}
      }],
      activeProfileId: "p-v1"
    };

    localStorage.setItem(LOCAL_STORAGE_KEY_V1, JSON.stringify(v1State));

    const loaded = await loadState();
    expect(loaded).not.toBeNull();
    expect(loaded?.profiles[0].name).toBe("Stary Profil V1");

    expect(localStorage.getItem(LOCAL_STORAGE_KEY_V1)).toBeNull();
    expect(localStorage.getItem(LOCAL_STORAGE_KEY_V2)).not.toBeNull();
  });

  it("5. clearState removes data from IndexedDB and localStorage keys", async () => {
    const state: AppState = {
      profiles: [{ id: "p1", name: "Do usunięcia", kind: "personal", transactions: [], payments: [], goals: [], investments: [], currency: "PLN", budgets: {} }],
      activeProfileId: "p1",
      schemaVersion: 1,
      updatedAt: "2026-07-23T12:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    await saveState(state);
    expect(await loadState()).not.toBeNull();

    await clearState();

    expect(await loadState()).toBeNull();
    expect(localStorage.getItem(LOCAL_STORAGE_KEY_V2)).toBeNull();
  });

  it("6. saveState throws QUOTA_EXCEEDED when quota exception occurs", async () => {
    const state: AppState = {
      profiles: [],
      activeProfileId: null,
      schemaVersion: 1,
      updatedAt: "2026-07-23T12:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    // Mock localStorage.setItem to simulate QuotaExceededError
    const originalSetItem = localStorage.setItem;
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      const err = new Error("QuotaExceededError");
      err.name = "QuotaExceededError";
      throw err;
    });

    // Mock indexedDB.open to fail with QuotaExceededError
    const originalOpen = indexedDB.open;
    vi.spyOn(indexedDB, "open").mockImplementation(() => {
      const req = {} as any;
      setTimeout(() => {
        const err = new Error("QuotaExceededError");
        err.name = "QuotaExceededError";
        req.error = err;
        if (req.onerror) req.onerror({ target: req } as any);
      }, 0);
      return req;
    });

    await expect(saveState(state)).rejects.toThrow("QUOTA_EXCEEDED");

    vi.restoreAllMocks();
    indexedDB.open = originalOpen;
    localStorage.setItem = originalSetItem;
  });
});
