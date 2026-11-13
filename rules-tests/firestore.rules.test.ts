// @vitest-environment node
import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Reguły Firestore WYKONYWANE w emulatorze (uruchom: npm run test:rules). Dotąd reguły były tylko czytane.
const RULES = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../firestore.rules"), "utf8");
let env: RulesTestEnvironment;

const validDoc = (over: Record<string, unknown> = {}) => ({
  profiles: [{ id: "p1", name: "Test" }], schemaVersion: 3, updatedAt: "2026-11-13T10:00:00.000Z", ...over
});

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-saldo", firestore: { rules: RULES } });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const asUser = (uid: string) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe("users/{uid} — dostęp", () => {
  it("anonim nie może ani czytać, ani zapisywać", async () => {
    await assertFails(anon().collection("users").doc("alice").set(validDoc()));
    await assertFails(anon().collection("users").doc("alice").get());
  });

  it("właściciel może zapisać, odczytać i usunąć swój dokument", async () => {
    const db = asUser("alice");
    await assertSucceeds(db.collection("users").doc("alice").set(validDoc()));
    await assertSucceeds(db.collection("users").doc("alice").get());
    await assertSucceeds(db.collection("users").doc("alice").delete());
  });

  it("inny zalogowany użytkownik nie ma dostępu do cudzego dokumentu", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => { await ctx.firestore().collection("users").doc("alice").set(validDoc()); });
    const bob = asUser("bob");
    await assertFails(bob.collection("users").doc("alice").get());
    await assertFails(bob.collection("users").doc("alice").set(validDoc()));
    await assertFails(bob.collection("users").doc("alice").delete());
  });
});

describe("users/{uid} — walidacja schematu", () => {
  const set = (data: Record<string, unknown>) => asUser("alice").collection("users").doc("alice").set(data);

  it("odrzuca nieznane pola (np. keyring) — dlatego dane v2 muszą być w osobnym dokumencie", async () => {
    await assertFails(set(validDoc({ keyring: { v: 2 } })));
    await assertFails(set(validDoc({ cokolwiek: 1 })));
  });

  it("wymaga profiles, schemaVersion i updatedAt", async () => {
    await assertFails(set({ schemaVersion: 3, updatedAt: "x" }));
    await assertFails(set({ profiles: [], updatedAt: "x" }));
    await assertFails(set({ profiles: [], schemaVersion: 3 }));
  });

  it("pilnuje typów i limitów", async () => {
    await assertFails(set(validDoc({ schemaVersion: "3" })));
    await assertFails(set(validDoc({ updatedAt: "x".repeat(41) })));
    await assertFails(set(validDoc({ profiles: "nie lista" })));
    await assertFails(set(validDoc({ profiles: Array.from({ length: 21 }, (_, i) => ({ id: String(i) })) })));
    await assertSucceeds(set(validDoc({ profiles: Array.from({ length: 20 }, (_, i) => ({ id: String(i) })) })));
    await assertFails(set(validDoc({ autoLockMinutes: 1441 })));
    await assertSucceeds(set(validDoc({ autoLockMinutes: 1440 })));
    await assertFails(set(validDoc({ aiMode: "x".repeat(17) })));
    await assertFails(set(validDoc({ recurringRules: Array.from({ length: 101 }, () => ({})) })));
  });

  it("dopuszcza wszystkie pola wysyłane przez klienta (SYNCABLE_STATE_KEYS)", async () => {
    await assertSucceeds(set(validDoc({
      activeProfileId: "p1", driveFileId: "abc", recurringRules: [], transactionRules: [], smartRules: [], debts: [],
      debtPayoffScenarios: [], aiMode: "local", localAiEndpoint: "http://localhost:11434", localAiModel: "qwen", autoLockMinutes: 5, lastModifiedBy: "a@b.pl"
    })));
  });
});

describe("pozostałe ścieżki", () => {
  it("bug_reports jest zamknięte dla wszystkich (SEC-10)", async () => {
    const report = { title: "t", description: "d", type: "bug", createdAt: "x", userAgent: "ua", status: "new" };
    await assertFails(anon().collection("bug_reports").add(report));
    await assertFails(asUser("alice").collection("bug_reports").add(report));
    await assertFails(asUser("alice").collection("bug_reports").doc("r1").get());
  });

  it("nieopisane kolekcje i podkolekcje użytkownika są domyślnie zamknięte (dokument vault/v2 wymaga nowej reguły)", async () => {
    await assertFails(asUser("alice").collection("inne").doc("x").set({ a: 1 }));
    await assertFails(asUser("alice").collection("users").doc("alice").collection("vault").doc("v2").set({ a: 1 }));
  });
});
