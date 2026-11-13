/**
 * Klucz danych (DEK) bieżącej sesji — wyłącznie w pamięci procesu (SEC-02 faza 2b).
 * Odpowiednik `activeKeys` z formatu v1, ale jeden na całe konto (hasło główne), nieeksportowalny.
 */
let masterKey: CryptoKey | null = null;

export const getMasterKey = (): CryptoKey | null => masterKey;
export const setMasterKey = (key: CryptoKey): void => { masterKey = key; };
export const clearMasterKey = (): void => { masterKey = null; };
export const hasMasterKey = (): boolean => masterKey !== null;
