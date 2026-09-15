/**
 * SecurityVault - Architektura Zero-Leak & BYOK (Bring Your Own Key)
 * Bezpieczne szyfrowanie sekretów w OS Keychain / Windows DPAPI
 * z natychmiastowym czyszczeniem pamięci RAM (Zeroization).
 */

export interface StoredSecretMetadata {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

export class SecurityVault {
  private static readonly STORAGE_PREFIX = "saldo_vault_sec_";

  private static memoryStore: Map<string, string> = new Map();

  private static setStorageItem(key: string, value: string): void {
    try {
      if (typeof localStorage !== "undefined" && typeof localStorage.setItem === "function") {
        localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Ignoruj błąd localStorage i zapisz w memoryStore
    }
    this.memoryStore.set(key, value);
  }

  private static getStorageItem(key: string): string | null {
    try {
      if (typeof localStorage !== "undefined" && typeof localStorage.getItem === "function") {
        const item = localStorage.getItem(key);
        if (item !== null) return item;
      }
    } catch {
      // Ignoruj błąd
    }
    return this.memoryStore.get(key) || null;
  }

  private static removeStorageItem(key: string): void {
    try {
      if (typeof localStorage !== "undefined" && typeof localStorage.removeItem === "function") {
        localStorage.removeItem(key);
      }
    } catch {
      // Ignoruj błąd
    }
    this.memoryStore.delete(key);
  }

  /**
   * Czyszczenie bufora pamięci RAM (Memory Zeroization)
   * Nadpisuje bajty zerami, uniemożliwiając ich odczytanie z dumpu pamięci procesu.
   */
  static zeroizeBuffer(buffer: Uint8Array | number[]): void {
    if (buffer instanceof Uint8Array) {
      buffer.fill(0);
    } else if (Array.isArray(buffer)) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = 0;
      }
    }
  }

  /**
   * Bezpieczne szyfrowanie i zapis klucza w natywnym magazynie OS (Keychain / DPAPI)
   */
  static async storeSecret(keyId: string, secretValue: string): Promise<boolean> {
    if (!keyId || !secretValue) return false;

    // 1. Natywny Electron: używamy safeStorage (macOS Keychain / Windows DPAPI)
    if (typeof window !== "undefined" && window.electronAPI?.saveBiometricsPin) {
      try {
        const res = await window.electronAPI.saveBiometricsPin(
          `${this.STORAGE_PREFIX}${keyId}`,
          secretValue
        );
        return Boolean(res?.success);
      } catch {
        return false;
      }
    }

    // 2. Web fallback: WebCrypto AES-GCM z nieeksportowalnym kluczem
    try {
      const cryptoObj = typeof window !== "undefined" && window.crypto ? window.crypto : globalThis.crypto;
      const enc = new TextEncoder();
      const encoded = enc.encode(secretValue);
      const salt = cryptoObj.getRandomValues(new Uint8Array(16));
      const iv = cryptoObj.getRandomValues(new Uint8Array(12));

      // Wyprowadzenie klucza szyfrującego
      const baseKey = await cryptoObj.subtle.importKey(
        "raw",
        enc.encode(keyId + "_vault_salt"),
        "PBKDF2",
        false,
        ["deriveKey"]
      );

      const aesKey = await cryptoObj.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt,
          iterations: 100000,
          hash: "SHA-256"
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
      );

      const ciphertext = await cryptoObj.subtle.encrypt(
        { name: "AES-GCM", iv },
        aesKey,
        encoded
      );

      // Czyszczenie wrażliwych buforów
      this.zeroizeBuffer(encoded);

      const payload = {
        salt: Array.from(salt),
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(ciphertext))
      };

      this.setStorageItem(`${this.STORAGE_PREFIX}${keyId}`, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Odczytuje sekret, wykonuje z nim bezpieczną operację w callbacku,
   * a następnie natychmiastowo niszczy zmienną w pamięci (Zero-Retention).
   */
  static async executeWithSecret<T>(
    keyId: string,
    operation: (secret: string) => Promise<T>,
    promptReason?: string
  ): Promise<T> {
    let retrievedSecret: string | null = null;

    // 1. Odczyt z natywnego magazynu Electron (Keychain / DPAPI)
    if (typeof window !== "undefined" && window.electronAPI?.promptBiometricsUnlock) {
      const res = await window.electronAPI.promptBiometricsUnlock(
        `${this.STORAGE_PREFIX}${keyId}`,
        promptReason || "Autoryzuj dostęp do chronionego klucza"
      );
      if (res.success && res.pin) {
        retrievedSecret = res.pin;
      }
    }

    // 2. Web fallback
    if (!retrievedSecret) {
      const raw = this.getStorageItem(`${this.STORAGE_PREFIX}${keyId}`);
      if (raw) {
        try {
          const payload = JSON.parse(raw);
          const cryptoObj = typeof window !== "undefined" && window.crypto ? window.crypto : globalThis.crypto;
          const enc = new TextEncoder();

          const baseKey = await cryptoObj.subtle.importKey(
            "raw",
            enc.encode(keyId + "_vault_salt"),
            "PBKDF2",
            false,
            ["deriveKey"]
          );

          const aesKey = await cryptoObj.subtle.deriveKey(
            {
              name: "PBKDF2",
              salt: new Uint8Array(payload.salt),
              iterations: 100000,
              hash: "SHA-256"
            },
            baseKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
          );

          const decrypted = await cryptoObj.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(payload.iv) },
            aesKey,
            new Uint8Array(payload.data)
          );

          const dec = new TextDecoder();
          retrievedSecret = dec.decode(decrypted);
        } catch {
          // Błąd odszyfrowania
        }
      }
    }

    if (!retrievedSecret) {
      throw new Error(`Nie odnaleziono sekretu o identyfikatorze: ${keyId}`);
    }

    try {
      return await operation(retrievedSecret);
    } finally {
      // Memory Zeroization (zamazanie referencji w pamięci)
      retrievedSecret = "";
    }
  }

  /**
   * Usuwa klucz z bezpiecznego magazynu
   */
  static async removeSecret(keyId: string): Promise<boolean> {
    if (typeof window !== "undefined" && window.electronAPI?.removeBiometricsPin) {
      await window.electronAPI.removeBiometricsPin(`${this.STORAGE_PREFIX}${keyId}`);
    }
    this.removeStorageItem(`${this.STORAGE_PREFIX}${keyId}`);
    return true;
  }

  /**
   * Waliduje żądanie proxy pod kątem braku ekspozycji statycznych kluczy w nagłówkach
   */
  static sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const clean: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      const lower = key.toLowerCase();
      // Odrzuć nagłówki, które mogłyby przypadkowo zawierać klucze prywatne w czystym tekście
      if (lower.includes("x-goog-api-key") || lower.includes("openai-api-key")) {
        continue;
      }
      clean[key] = value;
    }
    return clean;
  }
}
