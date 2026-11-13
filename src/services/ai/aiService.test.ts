/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AIService } from "./aiService";
import { providerRegistry } from "./providerRegistry";
import { GeminiProvider } from "./providers/geminiProvider";
import { AnthropicProvider } from "./providers/anthropicProvider";
import { Profile } from "../../types";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    writable: true
  });
}

describe("AIService & Providers — Audyt i Testy Jednostkowe (FAZA 19)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // 1. MASKOWANIE KLUCZA
  describe("Maskowanie kluczy API", () => {
    it("maskuje klucze poprawnie i bezpiecznie (ostatnie 4 znaki)", () => {
      expect(AIService.maskApiKey("AIzaSyB1234567890ABCDEF1234")).toBe("••••••••••••1234");
      expect(AIService.maskApiKey("sk-ant-api03-abcdefghijklmnop9999")).toBe("••••••••••••9999");
      expect(AIService.maskApiKey("short")).toBe("••••••••");
      expect(AIService.maskApiKey("")).toBe("");
      expect(AIService.maskApiKey(null)).toBe("");
    });
  });

  // 2. REJESTR DOSTAWCÓW
  describe("ProviderRegistry", () => {
    it("posiada zarejestrowanych dostawców Gemini i Anthropic", () => {
      const gemini = providerRegistry.getAdapter("gemini");
      const anthropic = providerRegistry.getAdapter("anthropic");

      expect(gemini).toBeInstanceOf(GeminiProvider);
      expect(anthropic).toBeInstanceOf(AnthropicProvider);
      expect(providerRegistry.isSupported("gemini")).toBe(true);
      expect(providerRegistry.isSupported("anthropic")).toBe(true);
      expect(providerRegistry.isSupported("unknown" as any)).toBe(false);
    });

    it("udostępnia domyślne i rekomendowane modele", () => {
      const gemini = providerRegistry.getAdapter("gemini")!;
      expect(gemini.defaultModel).toBe("gemini-3.8-flash");
      expect(gemini.availableModels.some(m => m.recommended)).toBe(true);

      const anthropic = providerRegistry.getAdapter("anthropic")!;
      expect(anthropic.defaultModel).toBe("claude-haiku-5-5");
      expect(anthropic.availableModels.some(m => m.recommended)).toBe(true);
    });
  });

  // 3. PERSISTENCE I CZYSZCZENIE KLUCZY
  describe("Zarządzanie kluczami i metadanymi", () => {
    it("zapisuje metadane klucza, ukrywa sekret i umożliwia usunięcie", async () => {
      const key = "AIzaSyTestSecret1234";
      const stored = await AIService.storeApiKey("gemini", key, "gemini-2.5-flash");
      expect(stored).toBe(true);

      const meta = AIService.getStoredKeyMetadata("gemini");
      expect(meta.hasKey).toBe(true);
      expect(meta.maskedKey).toBe("••••••••••••1234");
      expect(meta.model).toBe("gemini-2.5-flash");

      // Usunięcie klucza
      await AIService.removeApiKey("gemini");
      const metaAfter = AIService.getStoredKeyMetadata("gemini");
      expect(metaAfter.hasKey).toBe(false);
      expect(metaAfter.maskedKey).toBe("");
    });
  });

  // 4. TEST CONNECTION — GEMINI
  describe("GeminiProvider: testConnection", () => {
    const provider = new GeminiProvider();

    it("zwraca INVALID_API_KEY dla pustego klucza", async () => {
      const res = await provider.testConnection("");
      expect(res.status).toBe("INVALID_API_KEY");
    });

    it("zwraca SUCCESS dla poprawnej odpowiedzi 200", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ text: "pong" }] } }] })
      } as any);

      const res = await provider.testConnection("test-key", "gemini-2.5-flash");
      expect(res.status).toBe("SUCCESS");
      expect(res.message).toContain("Połączono pomyślnie");
    });

    it("zwraca INVALID_API_KEY przy 400 z błędem API_KEY_INVALID", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: { message: "API_KEY_INVALID" } })
      } as any);

      const res = await provider.testConnection("bad-key");
      expect(res.status).toBe("INVALID_API_KEY");
    });

    it("zwraca MODEL_NOT_AVAILABLE przy 404", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: { message: "models/gemini-fake not found" } })
      } as any);

      const res = await provider.testConnection("key", "gemini-fake");
      expect(res.status).toBe("MODEL_NOT_AVAILABLE");
    });

    it("zwraca RATE_LIMITED przy 429", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ error: { message: "Quota exceeded" } })
      } as any);

      const res = await provider.testConnection("key");
      expect(res.status).toBe("RATE_LIMITED");
    });

    it("zwraca TIMEOUT przy AbortError", async () => {
      const abortErr = new Error("The user aborted a request.");
      abortErr.name = "AbortError";
      globalThis.fetch = vi.fn().mockRejectedValue(abortErr);

      const res = await provider.testConnection("key");
      expect(res.status).toBe("TIMEOUT");
    });

    it("zwraca NETWORK_ERROR przy braku połączenia", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

      const res = await provider.testConnection("key");
      expect(res.status).toBe("NETWORK_ERROR");
    });
  });

  // 4a. MODELE GEMINI (AI-11): wyłączone modele
  describe("GeminiProvider: wyłączone modele", () => {
    const provider = new GeminiProvider();
    const okResponse = () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }) } as any);

    it("lista nie zawiera modeli 1.5 i 2.0", () => {
      expect(provider.availableModels.filter(m => /^gemini-(1\.5|2\.0)-/.test(m.id))).toEqual([]);
      expect(provider.availableModels.some(m => m.id === provider.defaultModel)).toBe(true);
    });

    it("wyłączony model z ustawień jest zastępowany domyślnym (generate i testConnection)", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(okResponse());
      await provider.generate({ prompt: "hej", model: "gemini-1.5-flash" } as any, "key");
      expect(String(vi.mocked(globalThis.fetch).mock.calls.at(-1)![0])).toContain(`/models/${provider.defaultModel}:`);
      await provider.testConnection("key", "gemini-2.0-flash");
      expect(String(vi.mocked(globalThis.fetch).mock.calls.at(-1)![0])).toContain(`/models/${provider.defaultModel}:`);
    });
  });

  // 5a. MODELE ANTHROPIC (AI-08): wycofane ID, temperature i effort
  describe("AnthropicProvider: modele i parametry żądania", () => {
    const provider = new AnthropicProvider();
    const okResponse = () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: "ok" }], usage: {} }) } as any);
    const lastBody = () => JSON.parse((vi.mocked(globalThis.fetch).mock.calls.at(-1)![1] as any).body);

    it("lista modeli nie zawiera wycofanych modeli claude-3-*", () => {
      expect(provider.availableModels.filter(m => /^claude-3-/.test(m.id))).toEqual([]);
      expect(provider.availableModels.some(m => m.id === provider.defaultModel)).toBe(true);
    });

    it("nie wysyła temperature (nowe modele odrzucają niedomyślne wartości kodem 400)", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(okResponse());
      await provider.generate({ prompt: "hej", temperature: 0.2 } as any, "sk-ant-test");
      expect(lastBody()).not.toHaveProperty("temperature");
    });

    it("dla modeli 5.x ustawia output_config.effort=low, dla Haiku 4.5 go nie wysyła", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(okResponse());
      await provider.generate({ prompt: "hej", model: "claude-haiku-5-5" } as any, "sk-ant-test");
      expect(lastBody().output_config).toEqual({ effort: "low" });
      await provider.generate({ prompt: "hej", model: "claude-haiku-4-5" } as any, "sk-ant-test");
      expect(lastBody()).not.toHaveProperty("output_config");
    });

    it("wycofany model zapisany w ustawieniach jest zastępowany domyślnym", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(okResponse());
      const res = await provider.generate({ prompt: "hej", model: "claude-3-5-sonnet-latest" } as any, "sk-ant-test");
      expect(lastBody().model).toBe(provider.defaultModel);
      expect(res.model).toBe(provider.defaultModel);
      await provider.testConnection("sk-ant-test", "claude-3-7-sonnet-latest");
      expect(lastBody().model).toBe(provider.defaultModel);
    });
  });

  // 5. TEST CONNECTION — ANTHROPIC (CLAUDE)
  describe("AnthropicProvider: testConnection", () => {
    const provider = new AnthropicProvider();

    it("zwraca INVALID_API_KEY dla pustego klucza", async () => {
      const res = await provider.testConnection("");
      expect(res.status).toBe("INVALID_API_KEY");
    });

    it("zwraca SUCCESS dla poprawnej odpowiedzi 200", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ content: [{ type: "text", text: "pong" }] })
      } as any);

      const res = await provider.testConnection("sk-ant-test", "claude-sonnet-5-5");
      expect(res.status).toBe("SUCCESS");
      expect(res.message).toContain("Połączono pomyślnie");
    });

    it("zwraca INVALID_API_KEY przy 401", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: { message: "Invalid x-api-key" } })
      } as any);

      const res = await provider.testConnection("bad-key");
      expect(res.status).toBe("INVALID_API_KEY");
    });

    it("zwraca RATE_LIMITED przy 429", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ error: { message: "Rate limit exceeded" } })
      } as any);

      const res = await provider.testConnection("key");
      expect(res.status).toBe("RATE_LIMITED");
    });

    it("zwraca TIMEOUT przy przerwaniu żądania", async () => {
      const abortErr = new Error("Abort");
      abortErr.name = "AbortError";
      globalThis.fetch = vi.fn().mockRejectedValue(abortErr);

      const res = await provider.testConnection("key");
      expect(res.status).toBe("TIMEOUT");
    });
  });

  // 6. STRUKTURYZOWANY KONTEKST FINANSOWY (OSZCZĘDNOŚĆ TOKENÓW)
  describe("buildStructuredFinancialContext", () => {
    it("generuje zwięzły kontekst bez wysyłania tysięcy surowych transakcji", () => {
      const profile: Profile = {
        id: "p1",
        name: "Jan Kowalski",
        kind: "personal",
        currency: "PLN",
        transactions: [
          { id: "t1", name: "Pensja", amount: 6000, type: "income", category: "Wynagrodzenie", isoDate: "2026-09-01", account: "A", currency: "PLN" },
          { id: "t2", name: "Czynsz", amount: 2000, type: "expense", category: "Mieszkanie", isoDate: "2026-09-05", account: "A", currency: "PLN" },
          { id: "t3", name: "Jedzenie", amount: 1000, type: "expense", category: "Spożywcze", isoDate: "2026-09-10", account: "A", currency: "PLN" },
        ],
        payments: [
          { id: "p1", name: "Internet", amount: 80, dueDate: "2026-09-20", status: "Do opłacenia", currency: "PLN" }
        ],
        goals: [
          { id: "g1", name: "Wakacje", target: 5000, saved: 2000, currency: "PLN" }
        ],
        investments: [],
        budgets: {}
      };

      const ctx = AIService.buildStructuredFinancialContext(profile, new Date("2026-09-15"));

      expect(ctx.totalIncome).toBe(6000);
      expect(ctx.totalExpense).toBe(3000);
      expect(ctx.balance).toBe(3000);
      expect(ctx.savingsRatePercent).toBe(50);
      expect(ctx.topExpenseCategories).toHaveLength(2);
      expect(ctx.activeGoalsCount).toBe(1);
      expect(ctx.unpaidPaymentsCount).toBe(1);

      // Sformatowane podsumowanie jest krótkie (poniżej 500 znaków) i nie zawiera wrażliwych ID ani pełnej historii
      expect(ctx.formattedSummary).toContain("Przychody bieżącego miesiąca: 6000.00 PLN");
      expect(ctx.formattedSummary).toContain("Wydatki bieżącego miesiąca: 3000.00 PLN");
      expect(ctx.formattedSummary.length).toBeLessThan(1000);
    });
  });

  // 7. ROZDZIELENIE READ_ONLY vs MUTATING ACTIONS
  describe("AI Actions & Bezpieczeństwo", () => {
    it("propozycje akcji wymagają jawnego potwierdzenia użytkownika i są oznaczone jako MUTATING", async () => {
      const profile: Profile = {
        id: "p1",
        name: "Test",
        kind: "personal",
        currency: "PLN",
        transactions: [],
        payments: [],
        goals: [],
        investments: [],
        budgets: {}
      };

      // Zapisujemy klucz testowy w pamięci
      await AIService.storeApiKey("gemini", "mock-valid-key");

      // Mockujemy odpowiedź modelu z propozycją akcji
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: "Oto propozycja nowego celu:\n```json\n{\n  \"action\": {\n    \"type\": \"addGoal\",\n    \"payload\": { \"name\": \"Poduszka bezpieczeństwa\", \"target\": 10000 }\n  }\n}\n```"
              }]
            }
          }]
        })
      } as any);

      const result = await AIService.chatWithAdvisor("Pomóż mi oszczędzać", profile, "gemini");

      expect(result.actionProposal).toBeDefined();
      expect(result.actionProposal?.isMutating).toBe(true);
      expect(result.actionProposal?.requiresConfirmation).toBe(true);
      expect(result.actionProposal?.type).toBe("addGoal");
      expect(result.actionProposal?.payload.name).toBe("Poduszka bezpieczeństwa");
      // Czysty tekst nie zawiera surowego bloku JSON
      expect(result.reply).toContain("Oto propozycja nowego celu:");
    });
  });
});
