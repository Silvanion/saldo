// @vitest-environment jsdom
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { useBudgetState } from "./useBudgetState";
import * as localDb from "../services/localDb";
import { activeKeys, clearActiveKeys, deriveKeyFromPin } from "../services/crypto";

vi.mock("firebase/firestore", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return { ...actual, doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn(), onSnapshot: vi.fn(() => vi.fn()) };
});
vi.mock("../firebase", () => ({ isFirebaseConfigured: false, db: null, auth: null }));

// Audyt SEC-01: profil chroniony PIN-em nie może trafić na dysk jawnym tekstem,
// także gdy klucz został usunięty (auto-lock), a odszyfrowane dane są jeszcze w stanie Reacta.
const SECRET = "TAJNY-ZAKUP-12345";
const SECRET_2 = "DRUGI-TAJNY-ZAKUP-67890";

const makeState = (description: string): any => ({
  schemaVersion: 1,
  updatedAt: new Date().toISOString(),
  activeProfileId: "p1",
  profiles: [
    {
      id: "p1", name: "Test", kind: "personal", pinHash: "deadbeef", salt: "aabbcc",
      transactions: [{ id: "t1", name: description, amount: 999, type: "expense", category: "Inne", isoDate: "2026-11-01", account: "Gotówka", currency: "PLN" }],
      payments: [], goals: [], investments: [], budgets: {}, recurringRules: [], transactionRules: [],
      settlements: [], accounts: [], smartRules: [], debts: [], debtPayoffScenarios: []
    }
  ]
});

function mount() {
  const result: { current: ReturnType<typeof useBudgetState> | null } = { current: null };
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  function T() { result.current = useBudgetState(null); return null; }
  act(() => { root.render(createElement(T)); });
  return result as { current: ReturnType<typeof useBudgetState> };
}

async function diskDump(): Promise<string> {
  const ls = localStorage.getItem(localDb.LOCAL_STORAGE_KEY_V2) || "";
  const idb = JSON.stringify(await localDb.loadStateFromIDBOnly());
  return ls + "\n" + idb;
}

describe("SEC-01: zapis lokalny profilu z PIN", () => {
  beforeEach(async () => {
    localStorage.clear();
    clearActiveKeys();
    await localDb.clearState();
  });

  it("z kluczem w pamięci dysk nie zawiera jawnego tekstu", async () => {
    activeKeys["p1"] = await deriveKeyFromPin("1234", "aabbcc");
    const h = mount();
    await act(async () => { await h.current.saveState(makeState(SECRET), true); });
    expect(await diskDump()).not.toContain(SECRET);
  });

  it("po utracie klucza (auto-lock) kolejny zapis nie wypisuje jawnych danych na dysk i zachowuje wcześniejszą wersję zaszyfrowaną", async () => {
    activeKeys["p1"] = await deriveKeyFromPin("1234", "aabbcc");
    const h = mount();
    await act(async () => { await h.current.saveState(makeState(SECRET), true); });
    const before = (await localDb.loadStateFromIDBOnly())!.profiles[0].encryptedPayload;
    expect(before).toBeTruthy();

    clearActiveKeys(); // dokładnie to robi AppContent.onLock
    await act(async () => { await h.current.saveState(makeState(SECRET_2), true); });

    const dump = await diskDump();
    expect(dump).not.toContain(SECRET);
    expect(dump).not.toContain(SECRET_2);
    const after = (await localDb.loadStateFromIDBOnly())!.profiles[0];
    expect(after.encryptedPayload).toBe(before);
    expect(after.transactions).toEqual([]);
  });

  it("gdy nie ma zaszyfrowanej wersji do zachowania, zablokowany zapis nie trafia na dysk jawnie", async () => {
    const h = mount();
    await act(async () => { await h.current.saveState(makeState(SECRET), true); });
    expect(await diskDump()).not.toContain(SECRET);
  });
});
