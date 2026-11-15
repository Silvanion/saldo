// @vitest-environment node
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  vaultExists, createVault, unlockVault, unlockVaultWithRecovery, changeVaultPassword, lockVault, isVaultUnlocked,
  encryptProfileV2, decryptProfileV2, decryptAllV2Profiles
} from "./vaultV2";
import { getMasterKey } from "./masterKey";
import { clearState, loadKeyringLocal } from "./localDb";
import { MIN_KDF_ITERATIONS } from "./cryptoV2";
import { validateAndMigrateState } from "../utils/stateMigration";

const PW = "correct horse battery";
const FAST = { iterations: MIN_KDF_ITERATIONS };
const profile = (id = "p1"): any => ({
  id, name: "Rodzina", kind: "personal", cryptoVersion: 2,
  transactions: [{ id: "t1", name: "TAJNE", amount: 5, type: "expense", category: "Inne", isoDate: "2026-11-01" }],
  payments: [{ id: "pay1", name: "Czynsz" }], goals: [], investments: [], budgets: { Jedzenie: 100 },
  recurringRules: [], transactionRules: [], settlements: [], accounts: [], smartRules: [], debts: [], debtPayoffScenarios: []
});

describe("skarbiec v2 (SEC-02 faza 2b)", () => {
  beforeEach(async () => { lockVault(); await clearState(); });

  it("createVault: zapisuje keyring lokalnie, odblokowuje sesję i zwraca klucz odzyskiwania", async () => {
    expect(await vaultExists()).toBe(false);
    const { recoveryKey } = await createVault(PW, FAST);
    expect(recoveryKey).toMatch(/^([0-9A-Z]{4}-){6}[0-9A-Z]{2}$/);
    expect(await vaultExists()).toBe(true);
    expect(isVaultUnlocked()).toBe(true);
    const stored = JSON.stringify(await loadKeyringLocal());
    expect(stored).not.toContain(PW);
    expect(stored).not.toContain(recoveryKey);
  });

  it("lockVault usuwa klucz z pamięci; unlockVault przywraca go właściwym hasłem, złym nie", async () => {
    await createVault(PW, FAST);
    lockVault();
    expect(isVaultUnlocked()).toBe(false);
    expect(getMasterKey()).toBeNull();
    await expect(unlockVault("złe hasło do skarbca")).rejects.toThrow(/Nieprawidłowe hasło/);
    expect(isVaultUnlocked()).toBe(false);
    await unlockVault(PW);
    expect(isVaultUnlocked()).toBe(true);
  });

  it("unlockVault bez skarbca zgłasza czytelny błąd", async () => {
    await expect(unlockVault(PW)).rejects.toThrow(/skarbca/i);
  });

  it("profil: szyfrowanie i odszyfrowanie kluczem sesji; w kopercie nie ma danych jawnych", async () => {
    await createVault(PW, FAST);
    const sealed = await encryptProfileV2(profile());
    expect(JSON.stringify(sealed)).not.toContain("TAJNE");
    expect(sealed.transactions).toEqual([]);
    expect(sealed.cryptoVersion).toBe(2);
    expect(JSON.parse(sealed.encryptedPayload!).v).toBe(2);
    lockVault();
    await unlockVault(PW);
    const opened = await decryptProfileV2(sealed);
    expect(opened.transactions[0].name).toBe("TAJNE");
    expect(opened.budgets).toEqual({ Jedzenie: 100 });
    expect(opened.name).toBe("Rodzina");
  });

  it("zaszyfrowanie wymaga odblokowanego skarbca", async () => {
    await createVault(PW, FAST);
    lockVault();
    await expect(encryptProfileV2(profile())).rejects.toThrow(/zablokowany/i);
  });

  it("payload jednego profilu nie otwiera się jako inny profil (AAD)", async () => {
    await createVault(PW, FAST);
    const sealed = await encryptProfileV2(profile("A"));
    await expect(decryptProfileV2({ ...sealed, id: "B" })).rejects.toThrow(/odszyfrować/i);
  });

  it("decryptAllV2Profiles odszyfrowuje tylko profile v2 i zostawia pozostałe nietknięte", async () => {
    await createVault(PW, FAST);
    const v2 = await encryptProfileV2(profile("p2"));
    const plain: any = { ...profile("p3"), cryptoVersion: undefined };
    const out = await decryptAllV2Profiles([v2, plain]);
    expect(out[0].transactions[0].name).toBe("TAJNE");
    expect(out[1]).toBe(plain);
  });

  it("zmiana hasła: stare przestaje działać, nowe działa, dane nadal czytelne", async () => {
    await createVault(PW, FAST);
    const sealed = await encryptProfileV2(profile());
    await changeVaultPassword(PW, "zupełnie nowe hasło 2026", FAST);
    lockVault();
    await expect(unlockVault(PW)).rejects.toThrow();
    await unlockVault("zupełnie nowe hasło 2026");
    expect((await decryptProfileV2(sealed)).transactions[0].name).toBe("TAJNE");
  });

  it("zapomniane hasło: klucz odzyskiwania ustawia nowe hasło i odblokowuje", async () => {
    const { recoveryKey } = await createVault(PW, FAST);
    const sealed = await encryptProfileV2(profile());
    lockVault();
    await unlockVaultWithRecovery(recoveryKey, "hasło po utracie pamięci", FAST);
    expect(isVaultUnlocked()).toBe(true);
    expect((await decryptProfileV2(sealed)).transactions[0].name).toBe("TAJNE");
    lockVault();
    await expect(unlockVault(PW)).rejects.toThrow();
    await unlockVault("hasło po utracie pamięci");
  });

  it("clearState (reset urządzenia) usuwa też keyring", async () => {
    await createVault(PW, FAST);
    await clearState();
    expect(await vaultExists()).toBe(false);
  });

  it("migracja stanu zachowuje flagę cryptoVersion: 2 profilu", () => {
    const migrated = validateAndMigrateState({ profiles: [{ id: "p1", name: "x", kind: "personal", cryptoVersion: 2, encryptedPayload: "{}" }] });
    expect(migrated.profiles[0].cryptoVersion).toBe(2);
    const legacy = validateAndMigrateState({ profiles: [{ id: "p1", name: "x", kind: "personal", cryptoVersion: 7 }] });
    expect(legacy.profiles[0].cryptoVersion).toBeUndefined();
  });
});
