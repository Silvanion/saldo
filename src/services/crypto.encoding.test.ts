import { describe, it, expect } from "vitest";
import { encryptProfile, decryptProfile, deriveKeyFromPin, generateRandomSalt } from "./crypto";
import { Profile, Transaction } from "../types";

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
    ...over
  };
}

describe("crypto payload encoding (base64 vs stara tablica bajtów)", () => {
  it("nowy encryptedPayload zapisuje iv i data jako base64 (string), nie tablicę liczb", async () => {
    const key = await deriveKeyFromPin("1234", generateRandomSalt());
    const encrypted = await encryptProfile(makeProfile(), key);

    const parsed = JSON.parse(encrypted.encryptedPayload!);
    expect(typeof parsed.iv).toBe("string");
    expect(typeof parsed.data).toBe("string");
  });

  it("base64 payload jest wyraźnie mniejszy niż stary format tablicowy dla tych samych danych", async () => {
    const key = await deriveKeyFromPin("1234", generateRandomSalt());
    const encrypted = await encryptProfile(makeProfile(), key);
    const parsed = JSON.parse(encrypted.encryptedPayload!);

    // Symulacja starego formatu z tych samych bajtów, żeby porównać rozmiar uczciwie.
    const ivBytes = Uint8Array.from(atob(parsed.iv), (c) => c.charCodeAt(0));
    const dataBytes = Uint8Array.from(atob(parsed.data), (c) => c.charCodeAt(0));
    const legacyPayload = JSON.stringify({ iv: Array.from(ivBytes), data: Array.from(dataBytes) });

    expect(encrypted.encryptedPayload!.length).toBeLessThan(legacyPayload.length);
  });

  it("odszyfrowuje poprawnie duży profil (setki transakcji) bez przepełnienia stosu przy kodowaniu", async () => {
    const key = await deriveKeyFromPin("1234", generateRandomSalt());
    const bigTransactions: Transaction[] = Array.from({ length: 2000 }, (_, i) => ({
      id: `tx-${i}`,
      name: `Transakcja testowa numer ${i} z dłuższym opisem żeby zwiększyć rozmiar payloadu`,
      amount: 12.34 + i,
      type: i % 2 === 0 ? "expense" : "income",
      isoDate: "2026-01-01",
      category: "Inne",
      account: "Główne",
      currency: "PLN"
    }));

    const profile = makeProfile({ transactions: bigTransactions });
    const encrypted = await encryptProfile(profile, key);
    const decrypted = await decryptProfile(encrypted, key);

    expect(decrypted.transactions).toHaveLength(2000);
    expect(decrypted.transactions[1999].name).toBe(
      "Transakcja testowa numer 1999 z dłuższym opisem żeby zwiększyć rozmiar payloadu"
    );
  });

  it("nadal odszyfrowuje stary payload zapisany jako tablica liczb (wsteczna kompatybilność)", async () => {
    const key = await deriveKeyFromPin("1234", generateRandomSalt());
    const plaintext = { transactions: [{ id: "old-tx", name: "Stary", amount: 10, type: "expense", isoDate: "2026-01-01", category: "Inne", account: "Konto", currency: "PLN" }], payments: [], goals: [], investments: [], budgets: {} };

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(JSON.stringify(plaintext))
    );

    const legacyProfile = makeProfile({
      encryptedPayload: JSON.stringify({ iv: Array.from(iv), data: Array.from(new Uint8Array(ciphertext)) })
    });

    const decrypted = await decryptProfile(legacyProfile, key);
    expect(decrypted.transactions).toHaveLength(1);
    expect(decrypted.transactions[0].id).toBe("old-tx");
  });
});
