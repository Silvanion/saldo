// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  createKeyring, unlockWithPassword, unlockWithRecoveryKey, changePassword, encryptPayload, decryptPayload,
  detectPayloadVersion, validateMasterPassword, CryptoV2Error, DEFAULT_KDF_ITERATIONS, MIN_KDF_ITERATIONS, type Keyring
} from "./cryptoV2";
import { encryptProfile, deriveKeyFromPin } from "./crypto";

// Minimalne dozwolone iteracje — wystarczająco szybkie w testach, ale nadal realne.
const FAST = { iterations: MIN_KDF_ITERATIONS };
const PASSWORD = "correct horse battery";
const DATA = { transactions: [{ id: "t1", name: "TAJNE" }] };

const code = async (p: Promise<unknown>) => { try { await p; return null; } catch (e) { return (e as CryptoV2Error).code; } };

describe("cryptoV2 — klucze i hasło główne", () => {
  it("hasło odblokowuje ten sam klucz danych, który zaszyfrował dane", async () => {
    const { keyring, dek } = await createKeyring(PASSWORD, FAST);
    const payload = await encryptPayload(dek, "p1", DATA);
    const unlocked = await unlockWithPassword(keyring, PASSWORD);
    expect(await decryptPayload(unlocked, "p1", payload)).toEqual(DATA);
  });

  it("złe hasło jest odrzucane jednoznacznym kodem", async () => {
    const { keyring } = await createKeyring(PASSWORD, FAST);
    expect(await code(unlockWithPassword(keyring, "zupełnie inne hasło"))).toBe("INVALID_PASSWORD");
  });

  it("klucz odzyskiwania odblokowuje dane; tolerancja wielkości liter, spacji i mylonych znaków", async () => {
    const { keyring, dek, recoveryKey } = await createKeyring(PASSWORD, FAST);
    const payload = await encryptPayload(dek, "p1", DATA);
    expect(recoveryKey).toMatch(/^([0-9A-Z]{4}-){6}[0-9A-Z]{2}$/);

    for (const variant of [recoveryKey, recoveryKey.toLowerCase(), recoveryKey.replace(/-/g, " ")]) {
      const k = await unlockWithRecoveryKey(keyring, variant);
      expect(await decryptPayload(k, "p1", payload)).toEqual(DATA);
    }
  });

  it("zły lub zniekształcony klucz odzyskiwania jest odrzucany", async () => {
    const { keyring, recoveryKey } = await createKeyring(PASSWORD, FAST);
    const other = (await createKeyring(PASSWORD, FAST)).recoveryKey;
    expect(await code(unlockWithRecoveryKey(keyring, other))).toBe("INVALID_RECOVERY_KEY");
    expect(await code(unlockWithRecoveryKey(keyring, recoveryKey.slice(0, 10)))).toBe("INVALID_RECOVERY_KEY");
    expect(await code(unlockWithRecoveryKey(keyring, "!!!!-????"))).toBe("INVALID_RECOVERY_KEY");
  });

  it("zmiana hasła: stare przestaje działać, nowe działa, dane i klucz odzyskiwania bez zmian", async () => {
    const { keyring, dek, recoveryKey } = await createKeyring(PASSWORD, FAST);
    const payload = await encryptPayload(dek, "p1", DATA);

    const changed = await changePassword(keyring, { password: PASSWORD }, "nowe hasło główne 2026", FAST);
    expect(await code(unlockWithPassword(changed.keyring, PASSWORD))).toBe("INVALID_PASSWORD");
    const viaNew = await unlockWithPassword(changed.keyring, "nowe hasło główne 2026");
    expect(await decryptPayload(viaNew, "p1", payload)).toEqual(DATA); // dane nie były ponownie szyfrowane
    const viaRecovery = await unlockWithRecoveryKey(changed.keyring, recoveryKey);
    expect(await decryptPayload(viaRecovery, "p1", payload)).toEqual(DATA);
  });

  it("zapomniane hasło: ustawienie nowego przez klucz odzyskiwania", async () => {
    const { keyring, dek, recoveryKey } = await createKeyring(PASSWORD, FAST);
    const payload = await encryptPayload(dek, "p1", DATA);
    const changed = await changePassword(keyring, { recoveryKey }, "hasło po awarii pamięci", FAST);
    const k = await unlockWithPassword(changed.keyring, "hasło po awarii pamięci");
    expect(await decryptPayload(k, "p1", payload)).toEqual(DATA);
  });

  it("zmiana hasła ze złym hasłem startowym nie przechodzi", async () => {
    const { keyring } = await createKeyring(PASSWORD, FAST);
    expect(await code(changePassword(keyring, { password: "nie to hasło" }, "nowe hasło główne 2026", FAST))).toBe("INVALID_PASSWORD");
  });

  it("polityka hasła: za krótkie i zbyt powtarzalne są odrzucane", async () => {
    expect(validateMasterPassword("krótkie").ok).toBe(false);
    expect(validateMasterPassword("aaaaaaaaaaaaaaaa").ok).toBe(false);
    expect(validateMasterPassword(PASSWORD).ok).toBe(true);
    expect(await code(createKeyring("krótkie", FAST))).toBe("WEAK_PASSWORD");
  });

  it("domyślnie 600 000 iteracji, zapisane w nagłówku", async () => {
    const { keyring } = await createKeyring(PASSWORD);
    expect(keyring.kdf.iter).toBe(DEFAULT_KDF_ITERATIONS);
    expect(DEFAULT_KDF_ITERATIONS).toBe(600_000);
  });
});

describe("cryptoV2 — odporność na zmanipulowane dane", () => {
  it("DEK z odblokowania jest nieeksportowalny", async () => {
    const { keyring, dek } = await createKeyring(PASSWORD, FAST);
    await expect(globalThis.crypto.subtle.exportKey("raw", dek)).rejects.toBeTruthy();
    await expect(globalThis.crypto.subtle.exportKey("raw", await unlockWithPassword(keyring, PASSWORD))).rejects.toBeTruthy();
  });

  it("szyfrogram jest związany z profilem (AAD) — podmiana między profilami się nie udaje", async () => {
    const { dek } = await createKeyring(PASSWORD, FAST);
    const payload = await encryptPayload(dek, "profil-A", DATA);
    expect(await code(decryptPayload(dek, "profil-B", payload))).toBe("DECRYPTION_FAILED");
  });

  it("zmodyfikowany szyfrogram jest odrzucany", async () => {
    const { dek } = await createKeyring(PASSWORD, FAST);
    const parsed = JSON.parse(await encryptPayload(dek, "p1", DATA));
    const bytes = Buffer.from(parsed.data, "base64"); bytes[0] ^= 1; parsed.data = bytes.toString("base64");
    expect(await code(decryptPayload(dek, "p1", JSON.stringify(parsed)))).toBe("DECRYPTION_FAILED");
  });

  it("każde szyfrowanie ma inny IV", async () => {
    const { dek } = await createKeyring(PASSWORD, FAST);
    const a = JSON.parse(await encryptPayload(dek, "p1", DATA));
    const b = JSON.parse(await encryptPayload(dek, "p1", DATA));
    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
  });

  it("keyring z nieprawidłową liczbą iteracji jest odrzucany bez wykonywania pracy (ochrona przed DoS)", async () => {
    const { keyring } = await createKeyring(PASSWORD, FAST);
    for (const iter of [1, MIN_KDF_ITERATIONS - 1, 2_000_000_000, 1.5, NaN]) {
      const tampered: Keyring = { ...keyring, kdf: { ...keyring.kdf, iter } };
      expect(await code(unlockWithPassword(tampered, PASSWORD))).toBe("INVALID_KEYRING");
    }
  });

  it("keyring z brakującymi polami lub złą wersją jest odrzucany", async () => {
    const { keyring } = await createKeyring(PASSWORD, FAST);
    expect(await code(unlockWithPassword({ ...keyring, v: 1 } as any, PASSWORD))).toBe("INVALID_KEYRING");
    expect(await code(unlockWithPassword({ ...keyring, wrapRec: undefined } as any, PASSWORD))).toBe("INVALID_KEYRING");
    expect(await code(unlockWithPassword(null as any, PASSWORD))).toBe("INVALID_KEYRING");
  });

  it("podmieniony wrapPw z innego keyringu nie odblokowuje (AAD i klucz)", async () => {
    const a = await createKeyring(PASSWORD, FAST);
    const b = await createKeyring(PASSWORD, FAST);
    expect(await code(unlockWithPassword({ ...a.keyring, wrapPw: b.keyring.wrapPw }, PASSWORD))).toBe("INVALID_PASSWORD");
  });
});

describe("cryptoV2 — współistnienie z formatem v1", () => {
  it("detectPayloadVersion rozpoznaje v1, v2 i śmieci", async () => {
    const { dek } = await createKeyring(PASSWORD, FAST);
    const v2 = await encryptPayload(dek, "p1", DATA);
    const v1key = await deriveKeyFromPin("1234", "sol");
    const v1 = (await encryptProfile({ id: "p1", name: "x", kind: "personal", transactions: [] } as any, v1key)).encryptedPayload;
    expect(detectPayloadVersion(v2)).toBe(2);
    expect(detectPayloadVersion(v1)).toBe(1);
    expect(detectPayloadVersion("nie json")).toBeNull();
    expect(detectPayloadVersion(undefined)).toBeNull();
  });

  it("decryptPayload nie próbuje czytać payloadu v1", async () => {
    const { dek } = await createKeyring(PASSWORD, FAST);
    const v1key = await deriveKeyFromPin("1234", "sol");
    const v1 = (await encryptProfile({ id: "p1", name: "x", kind: "personal", transactions: [] } as any, v1key)).encryptedPayload!;
    expect(await code(decryptPayload(dek, "p1", v1))).toBe("DECRYPTION_FAILED");
  });
});
