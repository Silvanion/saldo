// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { isVaultKey, canStoreProfilePin, isBiometricsAvailable, purgeUnsupportedProfilePins } = require("../electron/biometricsPolicy.cjs");

// SEC-07: na Windows nie ma realnego monitu Windows Hello, więc PIN profilu nie może być
// przechowywany ani zwracany bez pytania. Klucze API AI (prefiks saldo_vault_sec_) muszą dalej działać.
describe("polityka biometrii (SEC-07)", () => {
  it("PIN profilu tylko na macOS (Touch ID)", () => {
    expect(canStoreProfilePin("darwin")).toBe(true);
    expect(canStoreProfilePin("win32")).toBe(false);
    expect(canStoreProfilePin("linux")).toBe(false);
  });

  it("biometria dostępna tylko na macOS z Touch ID i szyfrowaniem systemowym", () => {
    expect(isBiometricsAvailable({ platform: "darwin", canPromptTouchID: true, encryptionAvailable: true })).toBe(true);
    expect(isBiometricsAvailable({ platform: "darwin", canPromptTouchID: false, encryptionAvailable: true })).toBe(false);
    expect(isBiometricsAvailable({ platform: "win32", canPromptTouchID: false, encryptionAvailable: true })).toBe(false);
  });

  it("klucze API (vault) są rozpoznawane i nie podlegają blokadzie", () => {
    expect(isVaultKey("saldo_vault_sec_ai_cloud_key_anthropic")).toBe(true);
    expect(isVaultKey("profile-123")).toBe(false);
  });

  it("czyszczenie na Windows usuwa zapisane PIN-y profili, ale zostawia klucze API", () => {
    const data = { "profile-1": "enc1", "profile-2": "enc2", saldo_vault_sec_ai_cloud_key_gemini: "key" };
    expect(purgeUnsupportedProfilePins("win32", data)).toEqual({ saldo_vault_sec_ai_cloud_key_gemini: "key" });
    expect(purgeUnsupportedProfilePins("darwin", data)).toEqual(data);
  });
});
