import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { SYNCABLE_STATE_KEYS, pickSyncableState, createEmptyState, validateAndMigrateState } from "./stateMigration";
import { AppState } from "../types";

/**
 * Regresja: zmiana autoLockMinutes w Ustawieniach unieważniała hasOnly([...])
 * w firestore.rules i każdy kolejny zapis do chmury leciał permission-denied.
 */
describe("whitelist kluczy synchronizacji", () => {
  const rulesText = readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8");

  function extractHasOnlyKeys(): string[] {
    const block = rulesText.match(/hasOnly\(\[([\s\S]*?)\]\)/);
    if (!block) throw new Error("Nie znaleziono hasOnly([...]) w firestore.rules");
    return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  }

  it("SYNCABLE_STATE_KEYS jest identyczna z hasOnly([...]) w firestore.rules", () => {
    expect([...SYNCABLE_STATE_KEYS].sort()).toEqual(extractHasOnlyKeys().sort());
  });

  it("każdy klucz AppState zapisywany na najwyższym poziomie jest dozwolony przez reguły", () => {
    // Klucze faktycznie ustawiane przez UI na poziomie AppState.
    const writtenByUi = ["aiMode", "localAiEndpoint", "localAiModel", "autoLockMinutes"];
    for (const key of writtenByUi) {
      expect(extractHasOnlyKeys()).toContain(key);
    }
  });

  it("pickSyncableState usuwa nieznane pola (np. z zaimportowanej kopii JSON)", () => {
    const dirty = {
      ...createEmptyState(),
      autoLockMinutes: 15,
      zlosliwePole: "powinno zniknac",
      innySmiec: { a: 1 }
    } as unknown as AppState;

    const picked = pickSyncableState(dirty) as Record<string, unknown>;

    expect(picked.autoLockMinutes).toBe(15);
    expect(picked.profiles).toBeDefined();
    expect(picked).not.toHaveProperty("zlosliwePole");
    expect(picked).not.toHaveProperty("innySmiec");
    expect(Object.keys(picked).every((k) => (SYNCABLE_STATE_KEYS as readonly string[]).includes(k))).toBe(true);
  });

  it("pickSyncableState pomija klucze o wartosci undefined", () => {
    const picked = pickSyncableState(createEmptyState()) as Record<string, unknown>;
    expect(picked).not.toHaveProperty("autoLockMinutes");
    expect(picked).not.toHaveProperty("aiMode");
  });
});

describe("ustawienia AppState przezywaja migracje", () => {
  it("autoLockMinutes nie znika przy przeladowaniu", () => {
    const migrated = validateAndMigrateState({ profiles: [], autoLockMinutes: 15 });
    expect(migrated.autoLockMinutes).toBe(15);
  });

  it("aiMode / localAiEndpoint / localAiModel sa zachowane", () => {
    const migrated = validateAndMigrateState({
      profiles: [],
      aiMode: "local",
      localAiEndpoint: "http://localhost:11434/api/generate",
      localAiModel: "llama3"
    });
    expect(migrated.aiMode).toBe("local");
    expect(migrated.localAiEndpoint).toBe("http://localhost:11434/api/generate");
    expect(migrated.localAiModel).toBe("llama3");
  });

  it("odrzuca smieciowe wartosci ustawien", () => {
    const migrated = validateAndMigrateState({
      profiles: [],
      aiMode: "cokolwiek",
      autoLockMinutes: "duzo"
    });
    expect(migrated.aiMode).toBeUndefined();
    expect(migrated.autoLockMinutes).toBeUndefined();
  });

  it("odrzuca autoLockMinutes o wartosci nieskonczonej", () => {
    const migrated = validateAndMigrateState({ profiles: [], autoLockMinutes: Infinity });
    expect(migrated.autoLockMinutes).toBeUndefined();
  });
});

describe("createEmptyState", () => {
  it("tworzy jeden pusty profil ustawiony jako aktywny", () => {
    const state = createEmptyState("kto@example.com");
    expect(state.profiles).toHaveLength(1);
    expect(state.activeProfileId).toBe(state.profiles[0].id);
    expect(state.profiles[0].transactions).toEqual([]);
    expect(state.profiles[0].payments).toEqual([]);
    expect(state.profiles[0].goals).toEqual([]);
    expect(state.profiles[0].investments).toEqual([]);
    expect(state.profiles[0].budgets).toEqual({});
    expect(state.lastModifiedBy).toBe("kto@example.com");
  });

  it("kolejne wywolania daja rozne identyfikatory profilu", () => {
    expect(createEmptyState().profiles[0].id).not.toBe(createEmptyState().profiles[0].id);
  });
});
