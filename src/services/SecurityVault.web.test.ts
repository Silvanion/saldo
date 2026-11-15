// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { SecurityVault } from "./SecurityVault";
import { AIService } from "./ai/aiService";

// SEC-06: w przeglądarce klucz API (BYOK) żyje tylko na czas sesji (sessionStorage) i nie jest zapisywany
// trwale w localStorage; stare wpisy z localStorage są usuwane.
describe("SecurityVault (web) — klucz tylko na czas sesji", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("zapisany sekret trafia do sessionStorage, nie do localStorage, i da się go odczytać", async () => {
    expect(await SecurityVault.storeSecret("ai_cloud_key_gemini", "sekret-123")).toBe(true);
    expect(Object.keys(localStorage).filter((k) => k.startsWith("saldo_vault_sec_"))).toEqual([]);
    expect(Object.keys(sessionStorage).some((k) => k.startsWith("saldo_vault_sec_"))).toBe(true);
    expect(await SecurityVault.executeWithSecret("ai_cloud_key_gemini", async (s) => s)).toBe("sekret-123");
  });

  it("po zamknięciu karty (wyczyszczenie sessionStorage) sekret znika", async () => {
    await SecurityVault.storeSecret("ai_cloud_key_gemini", "sekret-123");
    sessionStorage.clear();
    await expect(SecurityVault.executeWithSecret("ai_cloud_key_gemini", async (s) => s)).rejects.toThrow(/Nie odnaleziono sekretu/);
  });

  it("stary, trwały wpis z localStorage jest usuwany i nie jest odczytywany", async () => {
    localStorage.setItem("saldo_vault_sec_ai_cloud_key_gemini", JSON.stringify({ salt: [1], iv: [1], data: [1] }));
    localStorage.setItem("saldo_ai_meta_gemini", JSON.stringify({ hasKey: true, maskedKey: "••••1234", model: "x" }));
    await expect(SecurityVault.executeWithSecret("ai_cloud_key_gemini", async (s) => s)).rejects.toThrow();
    expect(localStorage.getItem("saldo_vault_sec_ai_cloud_key_gemini")).toBeNull();
    expect(localStorage.getItem("saldo_ai_meta_gemini")).toBeNull();
  });

  it("metadane klucza (hasKey) znikają razem z kluczem — UI nie twierdzi, że klucz jest", async () => {
    await AIService.storeApiKey("gemini", "klucz-gemini-abcdef");
    expect(AIService.getKeyMetadata("gemini").keyPresent).toBe(true);
    expect(localStorage.getItem("saldo_ai_meta_gemini")).toBeNull();
    sessionStorage.clear(); // nowa sesja
    expect(AIService.getKeyMetadata("gemini").keyPresent).toBe(false);
  });
});
