/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  encryptProfile,
  decryptProfile,
  deriveKeyFromPin,
  generateRandomSalt,
  prepareStateForRemoteSave,
  activeKeys,
  clearActiveKeys
} from "./crypto";
import { AppState, DebtItem, Profile } from "../types";

const mockDebt: DebtItem = {
  id: "debt-1",
  name: "Kredyt hipoteczny na dom",
  institution: "PKO BP",
  type: "mortgage",
  currency: "PLN",
  balance: 487350.55,
  originalAmount: 600000,
  monthlyPayment: 3210.44,
  interestRate: 7.35,
  propertyValue: 950000,
  status: "active",
  createdAt: "2024-01-01T00:00:00.000Z",
  notes: "Nr umowy 12345/2019"
};

function makeProfile(over: Partial<Profile> = {}): Profile {
  return {
    id: "p1",
    name: "Domowy",
    kind: "personal",
    currency: "PLN",
    pinHash: "hash",
    salt: "abc",
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    budgets: {},
    accounts: [],
    recurringRules: [],
    transactionRules: [],
    settlements: [],
    debts: [mockDebt],
    debtPayoffScenarios: [
      { id: "s1", name: "Avalanche", strategy: "avalanche", extraMonthlyPayment: 500, createdAt: "2024-01-01" }
    ],
    smartRules: [{ id: "r1", name: "Regula", isActive: true, conditions: [], actions: [] }] as any,
    ...over
  };
}

describe("szyfrowanie danych o zadluzeniu", () => {
  beforeEach(() => clearActiveKeys());

  it("encryptProfile usuwa dlugi z jawnej czesci profilu", async () => {
    const key = await deriveKeyFromPin("1234", generateRandomSalt());
    const encrypted = await encryptProfile(makeProfile(), key);

    expect(encrypted.debts).toEqual([]);
    expect(encrypted.debtPayoffScenarios).toEqual([]);
    expect(encrypted.smartRules).toEqual([]);
    expect(encrypted.encryptedPayload).toBeTruthy();
  });

  it("nazwa banku i saldo nie wystepuja nigdzie w jawnym profilu", async () => {
    const key = await deriveKeyFromPin("1234", generateRandomSalt());
    const encrypted = await encryptProfile(makeProfile(), key);

    const serialized = JSON.stringify({ ...encrypted, encryptedPayload: undefined });
    expect(serialized).not.toContain("PKO BP");
    expect(serialized).not.toContain("487350.55");
    expect(serialized).not.toContain("Nr umowy 12345/2019");
  });

  it("decryptProfile odtwarza dlugi bez strat", async () => {
    const key = await deriveKeyFromPin("1234", generateRandomSalt());
    const original = makeProfile();
    const decrypted = await decryptProfile(await encryptProfile(original, key), key);

    expect(decrypted.debts).toEqual(original.debts);
    expect(decrypted.debtPayoffScenarios).toEqual(original.debtPayoffScenarios);
    expect(decrypted.smartRules).toEqual(original.smartRules);
  });

  it("payload sprzed zmiany (bez pola debts) nie kasuje dlugow z profilu", async () => {
    const key = await deriveKeyFromPin("1234", generateRandomSalt());

    // Symulacja starego szyfrogramu: payload bez kluczy debts/smartRules.
    const legacyPlaintext = { transactions: [], payments: [], goals: [], investments: [], budgets: {} };
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(JSON.stringify(legacyPlaintext))
    );
    const legacyProfile = makeProfile({
      encryptedPayload: JSON.stringify({ iv: Array.from(iv), data: Array.from(new Uint8Array(ciphertext)) })
    });

    const decrypted = await decryptProfile(legacyProfile, key);
    expect(decrypted.debts).toEqual([mockDebt]);
  });

  it("profil z samymi dlugami nie moze wyjsc do chmury bez odblokowania PIN", async () => {
    const profileOnlyDebts = makeProfile({
      encryptedPayload: "{}",
      transactions: [],
      payments: [],
      goals: [],
      investments: [],
      budgets: {},
      accounts: [],
      recurringRules: [],
      transactionRules: [],
      settlements: []
    });
    const state = { profiles: [profileOnlyDebts], activeProfileId: "p1" } as AppState;

    // Brak klucza w activeKeys => profil zablokowany => zapis musi zostac odrzucony.
    await expect(prepareStateForRemoteSave(state)).rejects.toThrow(/Odblokuj profil/);
  });

  it("po odblokowaniu profilu dlugi wychodza zaszyfrowane", async () => {
    const profile = makeProfile();
    activeKeys[profile.id] = await deriveKeyFromPin("1234", generateRandomSalt());
    const state = { profiles: [profile], activeProfileId: "p1" } as AppState;

    const prepared = await prepareStateForRemoteSave(state);
    expect(prepared.profiles[0].debts).toEqual([]);
    expect(JSON.stringify(prepared)).not.toContain("PKO BP");
  });
});
