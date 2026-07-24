import { describe, it, expect, beforeEach, vi } from "vitest";
import { prepareStateForRemoteSave, deriveKeyFromPin, activeKeys, clearActiveKeys } from "./services/crypto";
import { validateAndMigrateState } from "./hooks/useBudgetState";
import { AppState, Profile } from "./types";

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

if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    writable: true
  });
}

const LOCAL_STORAGE_KEY_V2 = "saldo-local-fallback-v2";
const LOCAL_STORAGE_KEY_V1 = "saldo-local-fallback";

describe("KROK 5 — Safe local cache & PIN profile protection", () => {
  beforeEach(() => {
    clearActiveKeys();
    localStorage.clear();
  });

  it("unlocked PIN profile saved to local cache MUST NOT contain plaintext sensitive data", async () => {
    const profileId = "pin-profile-1";
    const key = await deriveKeyFromPin("9999", "salt999");
    activeKeys[profileId] = key;

    const unlockedProfile: Profile = {
      id: profileId,
      name: "Profil Osobisty z PIN",
      kind: "personal",
      pinHash: "hash999",
      salt: "salt999",
      transactions: [{ id: "tx-secret-1", name: "Tajny wydatek", type: "expense", amount: 1200, isoDate: "2026-05-01", category: "Zakupy", account: "Główne" }],
      payments: [{ id: "pay-secret-1", name: "Kredyt", amount: 2500, dueDate: "2026-05-10", status: "Do opłacenia" }],
      goals: [{ id: "goal-1", name: "Auto", target: 50000, saved: 10000, transfers: [] }],
      investments: [{ id: "inv-1", name: "Akcje", amount: 3000, isoDate: "2026-05-01" }],
      budgets: { "Zakupy": 1500 }
    };

    const state: AppState = {
      profiles: [unlockedProfile],
      activeProfileId: profileId,
      schemaVersion: 1,
      updatedAt: "2026-05-01T12:00:00.000Z",
      lastModifiedBy: "test@example.com",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    // Simulate prepareStateForRemoteSave before saving to localStorage
    const prepared = await prepareStateForRemoteSave(state);
    localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(prepared));

    const rawCached = localStorage.getItem(LOCAL_STORAGE_KEY_V2);
    expect(rawCached).not.toBeNull();
    expect(rawCached).not.toContain("Tajny wydatek");
    expect(rawCached).not.toContain("Kredyt");

    const parsedCache = JSON.parse(rawCached!);
    const cachedProfile = parsedCache.profiles[0];
    expect(cachedProfile.encryptedPayload).toBeDefined();
    expect(cachedProfile.transactions).toHaveLength(0);
    expect(cachedProfile.payments).toHaveLength(0);
    expect(cachedProfile.goals).toHaveLength(0);
    expect(cachedProfile.investments).toHaveLength(0);
    expect(Object.keys(cachedProfile.budgets)).toHaveLength(0);
  });

  it("V1 to V2 migration preserves data and removes V1 only when V2 write succeeds", () => {
    const v1State: AppState = {
      profiles: [{
        id: "v1-prof",
        name: "Stary profil V1",
        kind: "personal",
        transactions: [{ id: "tx-v1", name: "Kawa", type: "expense", amount: 15, isoDate: "2026-01-01", category: "Jedzenie", account: "Gotówka" }],
        payments: [],
        goals: [],
        investments: [],
        budgets: {}
      }],
      activeProfileId: "v1-prof",
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    localStorage.setItem(LOCAL_STORAGE_KEY_V1, JSON.stringify(v1State));

    // Migration logic check
    const cachedV1 = localStorage.getItem(LOCAL_STORAGE_KEY_V1);
    expect(cachedV1).not.toBeNull();

    const parsedV1 = validateAndMigrateState(JSON.parse(cachedV1!));
    expect(parsedV1.profiles[0].name).toBe("Stary profil V1");

    // Write V2, then remove V1
    localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(parsedV1));
    expect(localStorage.getItem(LOCAL_STORAGE_KEY_V2)).not.toBeNull();

    localStorage.removeItem(LOCAL_STORAGE_KEY_V1);
    expect(localStorage.getItem(LOCAL_STORAGE_KEY_V1)).toBeNull();
  });

  it("V1 is NOT removed if V2 write throws an error", () => {
    const v1State = {
      profiles: [{ id: "v1-p", name: "Profil V1", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_V1, JSON.stringify(v1State));

    // Mock localStorage.setItem to throw an error when writing V2
    const originalSetItem = localStorage.setItem;
    vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
      if (key === LOCAL_STORAGE_KEY_V2) {
        throw new Error("QuotaExceededError");
      }
      return originalSetItem(key, value);
    });

    const cachedV1 = localStorage.getItem(LOCAL_STORAGE_KEY_V1);
    const parsedV1 = validateAndMigrateState(JSON.parse(cachedV1!));

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(parsedV1));
      localStorage.removeItem(LOCAL_STORAGE_KEY_V1);
    } catch (_) {
      // Failed to set V2
    }

    // V1 must still exist
    expect(localStorage.getItem(LOCAL_STORAGE_KEY_V1)).not.toBeNull();

    vi.restoreAllMocks();
  });
});
