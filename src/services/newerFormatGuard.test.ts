// @vitest-environment node
import { describe, it, expect } from "vitest";
import { decryptProfile, deriveKeyFromPin, isNewerFormatProfile, toEncryptedEnvelope } from "./crypto";
import { createKeyring, encryptPayload, MIN_KDF_ITERATIONS } from "./cryptoV2";

// SEC-02 faza 2a: ta wersja aplikacji musi rozpoznawać profil zaszyfrowany formatem v2 (hasło główne),
// traktować go jako zablokowany i NIGDY nie nadpisać jego danych (patrz DESIGN-HASLO-GLOWNE.md).
const profileWithV2 = async (): Promise<any> => {
  const { dek } = await createKeyring("correct horse battery", { iterations: MIN_KDF_ITERATIONS });
  return {
    id: "p1", name: "Z nowej wersji", kind: "personal",
    encryptedPayload: await encryptPayload(dek, "p1", { transactions: [{ id: "t", name: "TAJNE" }] }),
    transactions: [], payments: [], goals: [], investments: [], budgets: {}
  };
};

describe("rozpoznawanie formatu v2", () => {
  it("isNewerFormatProfile: v2 tak, v1/brak/null nie", async () => {
    expect(isNewerFormatProfile(await profileWithV2())).toBe(true);
    expect(isNewerFormatProfile({ encryptedPayload: JSON.stringify({ iv: "a", data: "b" }) } as any)).toBe(false);
    expect(isNewerFormatProfile({} as any)).toBe(false);
    expect(isNewerFormatProfile(null)).toBe(false);
  });

  it("decryptProfile v1 zgłasza czytelny błąd formatu, a nie 'zły PIN'", async () => {
    const key = await deriveKeyFromPin("1234", "sol");
    await expect(decryptProfile(await profileWithV2(), key)).rejects.toThrow(/UNSUPPORTED_PAYLOAD_VERSION/);
  });

  it("toEncryptedEnvelope zeruje dane jawne, zachowuje payload i metadane", async () => {
    const p = { ...(await profileWithV2()), transactions: [{ id: "x", name: "wstrzyknięte" }], payments: [{ id: "y" }], budgets: { Jedzenie: 1 } };
    const env = toEncryptedEnvelope(p);
    expect(env.transactions).toEqual([]);
    expect(env.payments).toEqual([]);
    expect(env.budgets).toEqual({});
    expect(env.encryptedPayload).toBe(p.encryptedPayload);
    expect(env.name).toBe("Z nowej wersji");
  });
});
