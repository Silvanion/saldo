import { describe, it, expect, beforeEach } from "vitest";
import {
  prepareStateForRemoteSave,
  deriveKeyFromPin,
  activeKeys,
  clearActiveKeys,
  encryptProfile,
  decryptProfile
} from "./services/crypto";
import { AppState, Profile } from "./types";

describe("prepareStateForRemoteSave tests", () => {
  beforeEach(() => {
    clearActiveKeys();
  });

  it("profil bez PIN: returns profile intact", async () => {
    const noPinProfile: Profile = {
      id: "profile-no-pin",
      name: "Profil bez PIN",
      kind: "personal",
      currency: "PLN",
      transactions: [{ id: "tx1", name: "Zakupy", type: "expense", amount: 50, isoDate: "2026-01-01", category: "Jedzenie", account: "Główne", currency: "PLN" }],
      payments: [],
      goals: [],
      investments: [],
      budgets: {}
    };

    const inputState: AppState = {
      profiles: [noPinProfile],
      activeProfileId: "profile-no-pin",
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    const safeState = await prepareStateForRemoteSave(inputState);
    expect(safeState.profiles[0].transactions).toHaveLength(1);
    expect(safeState.profiles[0].transactions[0].id).toBe("tx1");
    expect(safeState.profiles[0].encryptedPayload).toBeUndefined();
  });

  it("odblokowany profil z PIN: encrypts sensitive data into encryptedPayload and clears plaintext", async () => {
    const profileId = "profile-unlocked-pin";
    const key = await deriveKeyFromPin("1234", "salt123");
    activeKeys[profileId] = key;

    const unlockedProfile: Profile = {
      id: profileId,
      name: "Profil Złoty",
      kind: "personal",
      currency: "PLN",
      pinHash: "hash123",
      salt: "salt123",
      transactions: [{ id: "tx-secret", name: "Pensja", type: "income", amount: 5000, isoDate: "2026-01-01", category: "Wypłata", account: "Główne", currency: "PLN" }],
      payments: [{ id: "p1", name: "Czynsz", amount: 2000, dueDate: "2026-01-10", status: "Do opłacenia", currency: "PLN" }],
      goals: [],
      investments: [],
      budgets: {}
    };

    const inputState: AppState = {
      profiles: [unlockedProfile],
      activeProfileId: profileId,
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    const safeState = await prepareStateForRemoteSave(inputState);
    const savedProfile = safeState.profiles[0];

    expect(savedProfile.encryptedPayload).toBeDefined();
    expect(savedProfile.transactions).toHaveLength(0);
    expect(savedProfile.payments).toHaveLength(0);
  });

  it("bezpieczny zablokowany profil: locked profile with encryptedPayload and no plaintext passes safely", async () => {
    const profileId = "profile-safe-locked";
    const key = await deriveKeyFromPin("1234", "salt123");
    
    // First generate a safe encrypted profile
    const rawProfile: Profile = {
      id: profileId,
      name: "Profil Tajny",
      kind: "personal",
      currency: "PLN",
      pinHash: "hash123",
      salt: "salt123",
      transactions: [{ id: "tx-secret", name: "Inne", type: "expense", amount: 100, isoDate: "2026-01-01", category: "Inne", account: "Główne", currency: "PLN" }],
      payments: [],
      goals: [],
      investments: [],
      budgets: {}
    };
    const encrypted = await encryptProfile(rawProfile, key);

    // Lock profile by clearing activeKeys
    clearActiveKeys();

    const inputState: AppState = {
      profiles: [encrypted],
      activeProfileId: profileId,
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    const safeState = await prepareStateForRemoteSave(inputState);
    expect(safeState.profiles[0].encryptedPayload).toBeDefined();
    expect(safeState.profiles[0].transactions).toHaveLength(0);
  });

  it("niebezpieczny plaintext bez klucza => throws error", async () => {
    const profileId = "profile-locked-with-plaintext";
    
    // Profile has pinHash and sensitive plaintext, but no key in activeKeys
    const dangerousProfile: Profile = {
      id: profileId,
      name: "Zablokowany ale ma plaintext",
      kind: "personal",
      currency: "PLN",
      pinHash: "hash123",
      salt: "salt123",
      transactions: [{ id: "leak", name: "Tajne", type: "expense", amount: 999, isoDate: "2026-01-01", category: "Tajne", account: "Główne", currency: "PLN" }],
      payments: [],
      goals: [],
      investments: [],
      budgets: {}
    };

    const inputState: AppState = {
      profiles: [dangerousProfile],
      activeProfileId: profileId,
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    await expect(prepareStateForRemoteSave(inputState)).rejects.toThrow("Odblokuj profil zabezpieczony PIN");
  });

  it("profil z pinHash i wypełnionymi transactions, recurringRules, settlements → po prepareStateForRemoteSave z aktywnym kluczem szyfruje i czyści dane", async () => {
    const profileId = "profile-full-pin";
    const key = await deriveKeyFromPin("9999", "salt999");
    activeKeys[profileId] = key;

    const fullProfile: Profile = {
      id: profileId,
      name: "Pełny Profil",
      kind: "personal",
      currency: "PLN",
      pinHash: "hash999",
      salt: "salt999",
      transactions: [{ id: "tx1", name: "Zakup", type: "expense", amount: 50, isoDate: "2026-01-01", category: "Inne", account: "Konto", currency: "PLN" }],
      payments: [],
      goals: [],
      investments: [],
      budgets: {},
      recurringRules: [{ id: "rr1", name: "Subskrypcja", amount: 29, type: "expense", category: "Rozrywka", account: "Konto", frequency: "monthly", nextDueDate: "2026-02-01", isActive: true, currency: "PLN" }],
      settlements: [{ id: "s1", amount: 100, isoDate: "2026-01-02", createdAt: "2026-01-02T10:00:00Z" }],
      accounts: [{ id: "a1", name: "Konto Główne", bankName: "Bank", hasCreditLimit: false, creditLimit: 0 }]
    };

    const inputState: AppState = {
      profiles: [fullProfile],
      activeProfileId: profileId,
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null
    };

    const savedState = await prepareStateForRemoteSave(inputState);
    const savedProfile = savedState.profiles[0];

    expect(savedProfile.encryptedPayload).toBeDefined();
    expect(savedProfile.encryptedPayload!.length).toBeGreaterThan(0);
    expect(savedProfile.transactions).toHaveLength(0);
    expect(savedProfile.recurringRules).toHaveLength(0);
    expect(savedProfile.settlements).toHaveLength(0);
    expect(savedProfile.accounts).toHaveLength(0);

    // Decrypt verification
    const decrypted = await decryptProfile(savedProfile, key);
    expect(decrypted.transactions).toHaveLength(1);
    expect(decrypted.recurringRules).toHaveLength(1);
    expect(decrypted.settlements).toHaveLength(1);
    expect(decrypted.accounts).toHaveLength(1);
  });

  it("profil z pinHash i wypełnionym recurringRules bez aktywnego klucza → prepareStateForRemoteSave rzuca błąd", async () => {
    const profileId = "profile-locked-recurring";

    const lockedProfile: Profile = {
      id: profileId,
      name: "Profil Zablokowany Reguły",
      kind: "personal",
      currency: "PLN",
      pinHash: "hash888",
      salt: "salt888",
      transactions: [],
      payments: [],
      goals: [],
      investments: [],
      budgets: {},
      recurringRules: [{ id: "rr1", name: "Czynsz", amount: 1500, type: "expense", category: "Dom", account: "Konto", frequency: "monthly", nextDueDate: "2026-02-01", isActive: true, currency: "PLN" }]
    };

    const inputState: AppState = {
      profiles: [lockedProfile],
      activeProfileId: profileId,
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null
    };

    await expect(prepareStateForRemoteSave(inputState)).rejects.toThrow("Odblokuj profil zabezpieczony PIN");
  });
});
