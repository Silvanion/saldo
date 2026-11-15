/**
 * Kryptografia v2 — hasło główne i klucz odzyskiwania (audyt SEC-02, faza 1).
 *
 * Hierarchia kluczy:
 *   DEK (losowy AES-GCM-256) — szyfruje dane profili. Nigdy nie jest wyprowadzany z hasła.
 *   KEK_hasło   = PBKDF2-SHA256(hasło, sól, iteracje z nagłówka) — opakowuje DEK.
 *   KEK_odzysk. = HKDF-SHA256(klucz odzyskiwania 128 bit, sól)   — opakowuje ten sam DEK.
 *
 * Zmiana hasła = ponowne opakowanie DEK (bez ponownego szyfrowania danych). Zapomniane hasło da się
 * obejść wyłącznie kluczem odzyskiwania; bez obu danych nie da się odzyskać (zero-knowledge).
 *
 * Moduł jest czysty (nie dotyka stanu aplikacji ani magazynu). Podpięcie do UI i migracja danych v1→v2
 * to osobne kroki (patrz audit-2026-11/DESIGN-HASLO-GLOWNE.md). Format v1 (`crypto.ts`) pozostaje bez zmian.
 */

export const KDF_ALG = "PBKDF2-SHA256" as const;
/** OWASP (2023) dla PBKDF2-HMAC-SHA256. Wartość trafia do nagłówka, więc można ją później podnosić. */
export const DEFAULT_KDF_ITERATIONS = 600_000;
/** Granice akceptowane przy odczycie nagłówka — chronią przed złośliwym keyringiem (DoS wysokim `iter`). */
export const MIN_KDF_ITERATIONS = 100_000;
export const MAX_KDF_ITERATIONS = 10_000_000;
export const MIN_PASSWORD_LENGTH = 12;

const KEYRING_AAD = "saldo-keyring-v2";
const RECOVERY_INFO = "saldo-recovery-v1";

interface Wrapped { iv: string; data: string }
interface WrappedRecovery extends Wrapped { salt: string }

export interface Keyring {
  v: 2;
  kdf: { alg: typeof KDF_ALG; iter: number; salt: string };
  /** DEK opakowany kluczem z hasła. */
  wrapPw: Wrapped;
  /** DEK opakowany kluczem z klucza odzyskiwania. */
  wrapRec: WrappedRecovery;
}

export interface CreatedKeyring {
  keyring: Keyring;
  /** Nieeksportowalny klucz danych, gotowy do użycia w tej sesji. */
  dek: CryptoKey;
  /** Pokazać użytkownikowi JEDEN raz (np. do wydrukowania). Nie jest nigdzie zapisywany. */
  recoveryKey: string;
}

export class CryptoV2Error extends Error {
  constructor(public code: "INVALID_PASSWORD" | "INVALID_RECOVERY_KEY" | "INVALID_KEYRING" | "DECRYPTION_FAILED" | "WEAK_PASSWORD", message: string) {
    super(message);
    this.name = "CryptoV2Error";
  }
}

const subtle = (): SubtleCrypto => (globalThis.crypto as Crypto).subtle;
const rand = (n: number): Uint8Array => globalThis.crypto.getRandomValues(new Uint8Array(n));

// --- kodowanie ---
function toB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

// Crockford base32 (bez I, L, O, U) — czytelny przy przepisywaniu z kartki.
const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function base32Encode(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = "";
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
function base32Decode(text: string): Uint8Array {
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of text) {
    const idx = B32.indexOf(ch);
    if (idx === -1) throw new CryptoV2Error("INVALID_RECOVERY_KEY", "Nieprawidłowy klucz odzyskiwania.");
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}

/** 128 bitów jako 26 znaków Crockford base32 w grupach po 4 (np. ABCD-EFGH-…). */
function formatRecoveryKey(bytes: Uint8Array): string {
  return base32Encode(bytes).match(/.{1,4}/g)!.join("-");
}

function parseRecoveryKey(input: string): Uint8Array {
  const normalized = input.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  if (normalized.length !== 26) throw new CryptoV2Error("INVALID_RECOVERY_KEY", "Nieprawidłowy klucz odzyskiwania.");
  const bytes = base32Decode(normalized);
  if (bytes.length !== 16) throw new CryptoV2Error("INVALID_RECOVERY_KEY", "Nieprawidłowy klucz odzyskiwania.");
  return bytes;
}

// --- polityka hasła ---
export function validateMasterPassword(password: string): { ok: boolean; reason?: string } {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: `Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.` };
  }
  if (new Set(password).size < 5) {
    return { ok: false, reason: "Hasło jest zbyt powtarzalne — użyj bardziej zróżnicowanych znaków." };
  }
  return { ok: true };
}

// --- klucze pochodne ---
async function passwordKek(password: string, saltB64: string, iterations: number): Promise<CryptoKey> {
  const base = await subtle().importKey("raw", utf8(password.normalize("NFKC")), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey(
    { name: "PBKDF2", salt: fromB64(saltB64), iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );
}

async function recoveryKek(recoveryBytes: Uint8Array, saltB64: string): Promise<CryptoKey> {
  const base = await subtle().importKey("raw", recoveryBytes, "HKDF", false, ["deriveKey"]);
  return subtle().deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: fromB64(saltB64), info: utf8(RECOVERY_INFO) },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );
}

async function wrapDek(dek: CryptoKey, kek: CryptoKey): Promise<Wrapped> {
  const iv = rand(12);
  const data = await subtle().wrapKey("raw", dek, kek, { name: "AES-GCM", iv, additionalData: utf8(KEYRING_AAD) });
  return { iv: toB64(iv), data: toB64(new Uint8Array(data)) };
}

async function unwrapDek(wrapped: Wrapped, kek: CryptoKey): Promise<CryptoKey> {
  return subtle().unwrapKey(
    "raw",
    fromB64(wrapped.data),
    kek,
    { name: "AES-GCM", iv: fromB64(wrapped.iv), additionalData: utf8(KEYRING_AAD) },
    { name: "AES-GCM", length: 256 },
    false, // odzyskany DEK jest nieeksportowalny
    ["encrypt", "decrypt"]
  );
}

function assertKeyring(keyring: Keyring): void {
  const ok =
    keyring && keyring.v === 2 && keyring.kdf?.alg === KDF_ALG &&
    Number.isInteger(keyring.kdf.iter) && keyring.kdf.iter >= MIN_KDF_ITERATIONS && keyring.kdf.iter <= MAX_KDF_ITERATIONS &&
    typeof keyring.kdf.salt === "string" && keyring.wrapPw?.iv && keyring.wrapPw?.data &&
    keyring.wrapRec?.iv && keyring.wrapRec?.data && keyring.wrapRec?.salt;
  if (!ok) throw new CryptoV2Error("INVALID_KEYRING", "Uszkodzony lub nieobsługiwany nagłówek kluczy.");
}

/** Tworzy nowy zestaw kluczy (DEK, opakowanie hasłem, opakowanie kluczem odzyskiwania). */
export async function createKeyring(
  password: string,
  options: { iterations?: number } = {}
): Promise<CreatedKeyring> {
  const policy = validateMasterPassword(password);
  if (!policy.ok) throw new CryptoV2Error("WEAK_PASSWORD", policy.reason!);
  const iterations = options.iterations ?? DEFAULT_KDF_ITERATIONS;
  if (iterations < MIN_KDF_ITERATIONS || iterations > MAX_KDF_ITERATIONS) {
    throw new CryptoV2Error("INVALID_KEYRING", "Liczba iteracji KDF poza dozwolonym zakresem.");
  }

  const extractableDek = await subtle().generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const kdfSalt = toB64(rand(16));
  const recoveryBytes = rand(16);
  const recoveryKey = formatRecoveryKey(recoveryBytes);
  const recSalt = toB64(rand(16));

  const wrapPw = await wrapDek(extractableDek, await passwordKek(password, kdfSalt, iterations));
  const wrapRecData = await wrapDek(extractableDek, await recoveryKek(recoveryBytes, recSalt));

  const keyring: Keyring = {
    v: 2,
    kdf: { alg: KDF_ALG, iter: iterations, salt: kdfSalt },
    wrapPw,
    wrapRec: { ...wrapRecData, salt: recSalt }
  };
  // Zwracamy nieeksportowalną wersję DEK (przez odpakowanie), a eksportowalną porzucamy.
  const dek = await unwrapDek(wrapPw, await passwordKek(password, kdfSalt, iterations));
  recoveryBytes.fill(0);
  return { keyring, dek, recoveryKey };
}

export async function unlockWithPassword(keyring: Keyring, password: string): Promise<CryptoKey> {
  assertKeyring(keyring);
  try {
    return await unwrapDek(keyring.wrapPw, await passwordKek(password, keyring.kdf.salt, keyring.kdf.iter));
  } catch {
    throw new CryptoV2Error("INVALID_PASSWORD", "Nieprawidłowe hasło.");
  }
}

export async function unlockWithRecoveryKey(keyring: Keyring, recoveryKey: string): Promise<CryptoKey> {
  assertKeyring(keyring);
  const bytes = parseRecoveryKey(recoveryKey);
  try {
    return await unwrapDek(keyring.wrapRec, await recoveryKek(bytes, keyring.wrapRec.salt));
  } catch {
    throw new CryptoV2Error("INVALID_RECOVERY_KEY", "Nieprawidłowy klucz odzyskiwania.");
  } finally {
    bytes.fill(0);
  }
}

/**
 * Ustawia nowe hasło po odblokowaniu (hasłem lub kluczem odzyskiwania). Wymaga wyciągnięcia DEK,
 * dlatego przyjmuje keyring + hasło/klucz, a nie sam nieeksportowalny DEK.
 */
export async function changePassword(
  keyring: Keyring,
  unlock: { password: string } | { recoveryKey: string },
  newPassword: string,
  options: { iterations?: number } = {}
): Promise<{ keyring: Keyring; dek: CryptoKey }> {
  const policy = validateMasterPassword(newPassword);
  if (!policy.ok) throw new CryptoV2Error("WEAK_PASSWORD", policy.reason!);
  assertKeyring(keyring);

  // Do ponownego opakowania potrzebny jest eksportowalny DEK — odpakowujemy go lokalnie, tylko tu.
  let kek: CryptoKey, wrapped: Wrapped;
  if ("password" in unlock) {
    kek = await passwordKek(unlock.password, keyring.kdf.salt, keyring.kdf.iter); wrapped = keyring.wrapPw;
  } else {
    const bytes = parseRecoveryKey(unlock.recoveryKey);
    kek = await recoveryKek(bytes, keyring.wrapRec.salt); wrapped = keyring.wrapRec; bytes.fill(0);
  }
  let extractableDek: CryptoKey;
  try {
    extractableDek = await subtle().unwrapKey(
      "raw", fromB64(wrapped.data), kek,
      { name: "AES-GCM", iv: fromB64(wrapped.iv), additionalData: utf8(KEYRING_AAD) },
      { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
    );
  } catch {
    throw new CryptoV2Error("password" in unlock ? "INVALID_PASSWORD" : "INVALID_RECOVERY_KEY", "password" in unlock ? "Nieprawidłowe hasło." : "Nieprawidłowy klucz odzyskiwania.");
  }

  const iterations = options.iterations ?? DEFAULT_KDF_ITERATIONS;
  if (iterations < MIN_KDF_ITERATIONS || iterations > MAX_KDF_ITERATIONS) {
    throw new CryptoV2Error("INVALID_KEYRING", "Liczba iteracji KDF poza dozwolonym zakresem.");
  }
  const kdfSalt = toB64(rand(16));
  const wrapPw = await wrapDek(extractableDek, await passwordKek(newPassword, kdfSalt, iterations));
  const next: Keyring = { v: 2, kdf: { alg: KDF_ALG, iter: iterations, salt: kdfSalt }, wrapPw, wrapRec: keyring.wrapRec };
  const dek = await unwrapDek(wrapPw, await passwordKek(newPassword, kdfSalt, iterations));
  return { keyring: next, dek };
}

// --- szyfrowanie danych (format v2: JSON {"v":2,"iv","data"}) ---

/** AAD wiąże szyfrogram z profilem — podmiana payloadu między profilami kończy się błędem uwierzytelnienia. */
const profileAad = (profileId: string): Uint8Array => utf8(`saldo-profile-v2:${profileId}`);

export async function encryptPayload(dek: CryptoKey, profileId: string, value: unknown): Promise<string> {
  const iv = rand(12);
  const ct = await subtle().encrypt({ name: "AES-GCM", iv, additionalData: profileAad(profileId) }, dek, utf8(JSON.stringify(value)));
  return JSON.stringify({ v: 2, iv: toB64(iv), data: toB64(new Uint8Array(ct)) });
}

export async function decryptPayload<T = unknown>(dek: CryptoKey, profileId: string, payload: string): Promise<T> {
  try {
    const parsed = JSON.parse(payload);
    if (parsed?.v !== 2) throw new Error("zła wersja");
    const plain = await subtle().decrypt(
      { name: "AES-GCM", iv: fromB64(parsed.iv), additionalData: profileAad(profileId) },
      dek,
      fromB64(parsed.data)
    );
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    throw new CryptoV2Error("DECRYPTION_FAILED", "Nie udało się odszyfrować danych (zły klucz lub uszkodzone dane).");
  }
}

/** Rozpoznaje format zaszyfrowanego payloadu: v1 (PIN, bez pola `v`) lub v2 (hasło główne). */
export function detectPayloadVersion(payload: string | undefined): 1 | 2 | null {
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload);
    if (parsed?.v === 2) return 2;
    if (parsed && "iv" in parsed && "data" in parsed) return 1;
  } catch { /* nieprawidłowy JSON */ }
  return null;
}
