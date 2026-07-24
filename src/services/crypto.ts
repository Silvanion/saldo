import { Profile, AppState } from "../types";

export const activeKeys: Record<string, CryptoKey> = {};

const getCrypto = (): Crypto => {
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  }
  return globalThis.crypto;
};

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
    accounts: profile.accounts || []
  };
  
  const cryptoObj = getCrypto();
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(dataToEncrypt));
  const ciphertext = await cryptoObj.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  
  const encryptedPayload = JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(ciphertext))
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
    accounts: []
  };
}

export async function decryptProfile(profile: Profile, key: CryptoKey): Promise<Profile> {
  if (!profile.encryptedPayload) return profile;
  try {
    const cryptoObj = getCrypto();
    const parsed = JSON.parse(profile.encryptedPayload);
    const iv = new Uint8Array(parsed.iv);
    const data = new Uint8Array(parsed.data);
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
      accounts: plaintext.accounts || []
    };
  } catch (err) {
    console.error("Failed to decrypt profile:", profile.id, err);
    throw new Error("DECRYPTION_FAILED: Nieprawidłowy kod PIN lub uszkodzone dane zaszyfrowane.");
  }
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
      const hasSensitiveData =
        (profile.transactions && profile.transactions.length > 0) ||
        (profile.payments && profile.payments.length > 0) ||
        (profile.goals && profile.goals.length > 0) ||
        (profile.investments && profile.investments.length > 0) ||
        (profile.budgets && Object.keys(profile.budgets).length > 0) ||
        (profile.recurringRules && profile.recurringRules.length > 0) ||
        (profile.transactionRules && profile.transactionRules.length > 0) ||
        (profile.settlements && profile.settlements.length > 0) ||
        (profile.accounts && profile.accounts.length > 0);

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

