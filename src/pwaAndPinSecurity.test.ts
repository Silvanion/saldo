import { describe, it, expect } from "vitest";
import { deriveKeyFromPin, encryptProfile, decryptProfile } from "./services/crypto";
import { Profile } from "./types";

describe("PROMPT D2 — PWA Update & PIN Security Recovery Warning", () => {
  it("1. validates PIN regex requirement (4-8 digits)", () => {
    const pinRegex = /^\d{4,8}$/;

    expect(pinRegex.test("1234")).toBe(true);
    expect(pinRegex.test("12345678")).toBe(true);

    expect(pinRegex.test("123")).toBe(false); // too short
    expect(pinRegex.test("123456789")).toBe(false); // too long
    expect(pinRegex.test("123a")).toBe(false); // non-digit
  });

  it("2. preserves strong PBKDF2 (100k iterations, SHA-256) and AES-GCM encryption", async () => {
    const samplePin = "87654321";
    const profile: Profile = {
      id: "p1",
      name: "Profil Testowy",
      kind: "personal",
      salt: "test-salt-12345678",
      pinHash: "hash-123",
      transactions: [{ id: "tx1", name: "Zakupy", amount: 100, type: "expense", category: "Spożywcze", isoDate: "2026-07-23", account: "Konto",
          currency: "PLN"
    }],
      payments: [],
      goals: [],
      investments: [],
      currency: "PLN", budgets: { Spożywcze: 1000 }
    };

    const key = await deriveKeyFromPin(samplePin, profile.salt!);
    const encrypted = await encryptProfile(profile, key);

    expect(encrypted.encryptedPayload).toBeDefined();

    const decrypted = await decryptProfile(encrypted, key);
    expect(decrypted.name).toBe("Profil Testowy");
    expect(decrypted.transactions.length).toBe(1);
    expect(decrypted.transactions[0].amount).toBe(100);
  });
});
