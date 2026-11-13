import { Profile, AppState } from "../types";
import { detectPayloadVersion } from "./cryptoV2";

export const activeKeys: Record<string, CryptoKey> = {};

const getCrypto = (): Crypto => {
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  }
  return globalThis.crypto;
};

// Kodowanie w kawałkach po 32KB — String.fromCharCode(...bytes) na całym dużym
// Uint8Array naraz wywala "Maximum call stack size exceeded" (spread na argumenty).
const BASE64_CHUNK_SIZE = 0x8000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK_SIZE));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// encryptedPayload sprzed tej zmiany zapisywał iv/data jako Array.from(Uint8Array) —
// zwykłą tablicę liczb w JSON, ~3.5x większą niż base64. Nowe payloady używają base64;
// stare wciąż muszą się dekodować, więc rozpoznajemy format po typie wartości.
function decodeIvOrData(value: unknown): Uint8Array {
  if (typeof value === "string") {
    return base64ToBytes(value);
  }
  if (Array.isArray(value)) {
    return new Uint8Array(value);
  }
  throw new Error("Nieprawidłowy format zaszyfrowanych danych.");
}

/**
 * Profil zaszyfrowany formatem v2 (hasło główne, nowsza wersja aplikacji). Ta wersja nie umie go odczytać,
 * więc musi go traktować jako zablokowany i nigdy nie zapisać na nim danych (SEC-02 faza 2a).
 */
export function isNewerFormatProfile(profile: Pick<Profile, "encryptedPayload"> | null | undefined): boolean {
  return detectPayloadVersion(profile?.encryptedPayload) === 2;
}

/** Postać profilu „w kopercie”: metadane + zaszyfrowany payload, bez żadnych danych jawnych. */
export function toEncryptedEnvelope(profile: Profile): Profile {
  return {
    ...profile,
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    budgets: {},
    recurringRules: [],
    transactionRules: [],
    settlements: [],
    accounts: [],
    smartRules: [],
    debts: [],
    debtPayoffScenarios: []
  };
}

export function generateRandomSalt(): string {
  const arr = new Uint8Array(16);
  getCrypto().getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function clearActiveKeys(): void {
  for (const k of Object.keys(activeKeys)) {
    delete activeKeys[k];
  }
}

export async function deriveKeyFromPin(pin: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const cryptoObj = getCrypto();
  const keyMaterial = await cryptoObj.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  // NIE ZMIENIAĆ iterations: 100000 bez migracji istniejących encryptedPayload
  return cryptoObj.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptProfile(profile: Profile, key: CryptoKey): Promise<Profile> {
  const dataToEncrypt = {
    transactions: profile.transactions || [],
    payments: profile.payments || [],
    goals: profile.goals || [],
    investments: profile.investments || [],
    budgets: profile.budgets || {},
    recurringRules: profile.recurringRules || [],
    transactionRules: profile.transactionRules || [],
    settlements: profile.settlements || [],
    accounts: profile.accounts || [],
    smartRules: profile.smartRules || [],
    debts: profile.debts || [],
    debtPayoffScenarios: profile.debtPayoffScenarios || []
  };

  const cryptoObj = getCrypto();
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(dataToEncrypt));
  const ciphertext = await cryptoObj.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  
  const encryptedPayload = JSON.stringify({
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(ciphertext))
  });

  return {
    ...profile,
    encryptedPayload,
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    budgets: {},
    recurringRules: [],
    transactionRules: [],
    settlements: [],
    accounts: [],
    smartRules: [],
    debts: [],
    debtPayoffScenarios: []
  };
}

export async function decryptProfile(profile: Profile, key: CryptoKey): Promise<Profile> {
  if (!profile.encryptedPayload) return profile;
  if (isNewerFormatProfile(profile)) {
    throw new Error("UNSUPPORTED_PAYLOAD_VERSION: Ten profil został zaszyfrowany nowszą wersją Saldo. Zaktualizuj aplikację.");
  }
  try {
    const cryptoObj = getCrypto();
    const parsed = JSON.parse(profile.encryptedPayload);
    const iv = decodeIvOrData(parsed.iv);
    const data = decodeIvOrData(parsed.data);
    const decrypted = await cryptoObj.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    const decoded = new TextDecoder().decode(decrypted);
    const plaintext = JSON.parse(decoded);

    return {
      ...profile,
      transactions: plaintext.transactions || [],
      payments: plaintext.payments || [],
      goals: plaintext.goals || [],
      investments: plaintext.investments || [],
      budgets: plaintext.budgets || {},
      recurringRules: plaintext.recurringRules || [],
      transactionRules: plaintext.transactionRules || [],
      settlements: plaintext.settlements || [],
      accounts: plaintext.accounts || [],
      // Payloady sprzed dodania tych pól ich nie zawierają — zachowaj to, co jest w profilu.
      smartRules: plaintext.smartRules || profile.smartRules || [],
      debts: plaintext.debts || profile.debts || [],
      debtPayoffScenarios: plaintext.debtPayoffScenarios || profile.debtPayoffScenarios || []
    };
  } catch (err) {
    console.error("Failed to decrypt profile:", profile.id, err);
    throw new Error("DECRYPTION_FAILED: Nieprawidłowy kod PIN lub uszkodzone dane zaszyfrowane.");
  }
}

function hasSensitiveProfileData(profile: Profile): boolean {
  return Boolean(
    (profile.transactions && profile.transactions.length > 0) ||
    (profile.payments && profile.payments.length > 0) ||
    (profile.goals && profile.goals.length > 0) ||
    (profile.investments && profile.investments.length > 0) ||
    (profile.budgets && Object.keys(profile.budgets).length > 0) ||
    (profile.recurringRules && profile.recurringRules.length > 0) ||
    (profile.transactionRules && profile.transactionRules.length > 0) ||
    (profile.settlements && profile.settlements.length > 0) ||
    (profile.accounts && profile.accounts.length > 0) ||
    (profile.smartRules && profile.smartRules.length > 0) ||
    (profile.debts && profile.debts.length > 0) ||
    (profile.debtPayoffScenarios && profile.debtPayoffScenarios.length > 0)
  );
}

/**
 * Stan do zapisu na dysk, gdy prepareStateForRemoteSave odmówił (jakiś profil z PIN
 * jest zablokowany). Nigdy nie zwraca jawnych danych profilu z PIN:
 * - odblokowany profil → szyfrowany bieżącym kluczem,
 * - zablokowany profil → ostatnia zaszyfrowana wersja z dysku (`persisted`),
 * - zablokowany profil bez takiej wersji → trafia do `unresolved`; wołający
 *   musi wtedy pominąć zapis lokalny (zmiana zostaje w pamięci do odblokowania).
 */
export async function prepareStateForLocalSaveWhileLocked(
  state: AppState,
  persisted: AppState | null
): Promise<{ state: AppState; unresolved: string[] }> {
  const unresolved: string[] = [];
  const profiles = await Promise.all(
    state.profiles.map(async (profile) => {
      if (!profile.pinHash) return profile;
      const key = activeKeys[profile.id];
      if (key) return encryptProfile(profile, key);
      if (!hasSensitiveProfileData(profile)) return profile;
      const previous = persisted?.profiles.find((p) => p.id === profile.id);
      if (previous?.encryptedPayload) return previous;
      unresolved.push(profile.id);
      return profile;
    })
  );
  return { state: { ...state, profiles }, unresolved };
}

export async function prepareStateForRemoteSave(state: AppState): Promise<AppState> {
  const updatedProfiles = await Promise.all(
    state.profiles.map(async (profile) => {
      if (!profile.pinHash) {
        return profile;
      }
      const key = activeKeys[profile.id];
      if (key) {
        return await encryptProfile(profile, key);
      }
      const hasSensitiveData = hasSensitiveProfileData(profile);

      if (profile.encryptedPayload && !hasSensitiveData) {
        return profile;
      }

      if (hasSensitiveData) {
        throw new Error("Odblokuj profil zabezpieczony PIN, aby wykonać bezpieczną kopię.");
      }

      return profile;
    })
  );

  return {
    ...state,
    profiles: updatedProfiles,
  };
}

export const FIRESTORE_DOC_HARD_LIMIT_BYTES = 1048576;
export const FIRESTORE_DOC_WARNING_BYTES = 900000;

export function estimateJsonSizeBytes(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return 0;
  }
}

export function estimateProfileSizes(state: AppState): Array<{ profileId: string; bytes: number }> {
  return (state.profiles || []).map((profile) => ({
    profileId: profile.id,
    bytes: estimateJsonSizeBytes(profile)
  }));
}

