import { describe, it, expect, vi } from "vitest";
import { SecurityVault } from "./SecurityVault";

describe("SecurityVault - Zero-Leak & BYOK Bezpieczeństwo", () => {
  it("prawidłowo zeruje bufor pamięci RAM (Zeroization)", () => {
    const sensitiveBytes = new Uint8Array([1, 2, 3, 4, 5, 255]);
    SecurityVault.zeroizeBuffer(sensitiveBytes);
    expect(Array.from(sensitiveBytes)).toEqual([0, 0, 0, 0, 0, 0]);

    const sensitiveArray = [42, 99, 123];
    SecurityVault.zeroizeBuffer(sensitiveArray);
    expect(sensitiveArray).toEqual([0, 0, 0]);
  });

  it("usuwa wrażliwe nagłówki kluczy API za pomocą sanitizeHeaders", () => {
    const rawHeaders = {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": "secret_gemini_key_12345",
      "openai-api-key": "secret_openai_key_67890",
      "Authorization": "Bearer session_jwt_abc"
    };

    const sanitized = SecurityVault.sanitizeHeaders(rawHeaders);
    expect(sanitized["Content-Type"]).toBe("application/json");
    expect(sanitized["Authorization"]).toBe("Bearer session_jwt_abc");
    expect(sanitized["X-Goog-Api-Key"]).toBeUndefined();
    expect(sanitized["openai-api-key"]).toBeUndefined();
  });

  it("poprawnie szyfruje, odczytuje i czyści sekret w teście wykonania operacji", async () => {
    const mockSecret = "my_super_secret_token_123";
    const keyId = "gemini_api_key";

    // Wykorzystujemy WebCrypto fallback działający w środowisku testowym
    const stored = await SecurityVault.storeSecret(keyId, mockSecret);
    expect(stored).toBe(true);

    let capturedInCallback = "";
    const result = await SecurityVault.executeWithSecret(keyId, async (secret) => {
      capturedInCallback = secret;
      return `SUCCESS:${secret.length}`;
    });

    expect(capturedInCallback).toBe(mockSecret);
    expect(result).toBe(`SUCCESS:${mockSecret.length}`);

    await SecurityVault.removeSecret(keyId);
  });
});
