/**
 * Skarbiec v2 — operacje wysokiego poziomu na haśle głównym (SEC-02 faza 2b).
 * Łączy czysty moduł kryptograficzny (cryptoV2), lokalny magazyn keyringu (IndexedDB) i sesję klucza (pamięć).
 *
 * UWAGA: warstwa danych, jeszcze NIEPODPIĘTA do ścieżek zapisu/synchronizacji aplikacji.
 * Integracja (i decyzja, co z chmurą dla profili v2) — patrz audit-2026-11/DESIGN-HASLO-GLOWNE.md.
 */
import { Profile } from "../types";
import {
  createKeyring, unlockWithPassword, unlockWithRecoveryKey, changePassword, encryptPayload, decryptPayload,
  type Keyring
} from "./cryptoV2";
import { clearMasterKey, getMasterKey, hasMasterKey, setMasterKey } from "./masterKey";
import { loadKeyringLocal, saveKeyringLocal } from "./localDb";

type Options = { iterations?: number };

/** Pola profilu, które trafiają do zaszyfrowanego payloadu — te same co w formacie v1 (crypto.ts). */
const DATA_FIELDS = [
  "transactions", "payments", "goals", "investments", "budgets", "recurringRules", "transactionRules",
  "settlements", "accounts", "smartRules", "debts", "debtPayoffScenarios"
] as const;

const EMPTY_DATA: Record<(typeof DATA_FIELDS)[number], unknown> = {
  transactions: [], payments: [], goals: [], investments: [], budgets: {}, recurringRules: [], transactionRules: [],
  settlements: [], accounts: [], smartRules: [], debts: [], debtPayoffScenarios: []
};

async function requireKeyring(): Promise<Keyring> {
  const keyring = await loadKeyringLocal();
  if (!keyring) throw new Error("Nie utworzono jeszcze skarbca z hasłem głównym.");
  return keyring;
}

const requireKey = (): CryptoKey => {
  const key = getMasterKey();
  if (!key) throw new Error("Skarbiec jest zablokowany — odblokuj go hasłem głównym.");
  return key;
};

export async function vaultExists(): Promise<boolean> {
  return (await loadKeyringLocal()) !== null;
}

export const isVaultUnlocked = (): boolean => hasMasterKey();

export function lockVault(): void {
  clearMasterKey();
}

/** Tworzy skarbiec, odblokowuje sesję i zwraca klucz odzyskiwania (pokazać użytkownikowi JEDEN raz). */
export async function createVault(password: string, options: Options = {}): Promise<{ recoveryKey: string }> {
  const { keyring, dek, recoveryKey } = await createKeyring(password, options);
  await saveKeyringLocal(keyring);
  setMasterKey(dek);
  return { recoveryKey };
}

export async function unlockVault(password: string): Promise<void> {
  setMasterKey(await unlockWithPassword(await requireKeyring(), password));
}

/** Zapomniane hasło: klucz odzyskiwania ustawia nowe hasło i odblokowuje sesję. */
export async function unlockVaultWithRecovery(recoveryKey: string, newPassword: string, options: Options = {}): Promise<void> {
  const { keyring, dek } = await changePassword(await requireKeyring(), { recoveryKey }, newPassword, options);
  await saveKeyringLocal(keyring);
  setMasterKey(dek);
}

export async function changeVaultPassword(oldPassword: string, newPassword: string, options: Options = {}): Promise<void> {
  const { keyring, dek } = await changePassword(await requireKeyring(), { password: oldPassword }, newPassword, options);
  await saveKeyringLocal(keyring);
  setMasterKey(dek);
}

/** Profil „w kopercie”: metadane + payload v2, zero danych jawnych. */
export async function encryptProfileV2(profile: Profile): Promise<Profile> {
  const key = requireKey();
  const data: Record<string, unknown> = {};
  for (const field of DATA_FIELDS) data[field] = (profile as unknown as Record<string, unknown>)[field] ?? EMPTY_DATA[field];
  const encryptedPayload = await encryptPayload(key, profile.id, data);
  return { ...profile, ...EMPTY_DATA, encryptedPayload, cryptoVersion: 2 } as Profile;
}

export async function decryptProfileV2(profile: Profile): Promise<Profile> {
  if (!profile.encryptedPayload) return profile;
  const data = await decryptPayload<Partial<Profile>>(requireKey(), profile.id, profile.encryptedPayload);
  const opened: Record<string, unknown> = { ...profile };
  for (const field of DATA_FIELDS) opened[field] = (data as Record<string, unknown>)[field] ?? EMPTY_DATA[field];
  return opened as unknown as Profile;
}

/** Odszyfrowuje wyłącznie profile v2; pozostałe (PIN v1 / bez ochrony) zwraca bez zmian (to samo odwołanie). */
export async function decryptAllV2Profiles(profiles: Profile[]): Promise<Profile[]> {
  return Promise.all(profiles.map((p) => (p.cryptoVersion === 2 ? decryptProfileV2(p) : p)));
}
