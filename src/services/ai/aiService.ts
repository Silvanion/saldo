import {
  AIProviderType,
  TestConnectionResult,
  StructuredFinancialContext,
  AIActionProposal,
  StoredAiKeyMetadata,
  AIResponse
} from "./types";
import { providerRegistry } from "./providerRegistry";
import { SecurityVault } from "../SecurityVault";
import { Profile } from "../../types";
import { calculateMonthlyTotals, calculateRunway } from "../budgetCalculations";
import { getLocalDateIso } from "../../utils";

const METADATA_STORAGE_KEY_PREFIX = "saldo_ai_meta_";

export class AIService {
  /**
   * Bezpieczne maskowanie klucza do wyświetlenia w UI (np. ••••••••••••1234)
   */
  static maskApiKey(key?: string | null): string {
    if (!key || typeof key !== "string") return "";
    const trimmed = key.trim();
    if (trimmed.length < 8) return "••••••••";
    return `••••••••••••${trimmed.slice(-4)}`;
  }

  /**
   * Zwraca referencję do klucza w SecurityVault
   */
  static getKeyVaultId(provider: AIProviderType): string {
    return `ai_cloud_key_${provider}`;
  }

  /**
   * Zapisuje klucz API w bezpiecznym magazynie (Keychain/DPAPI lub WebCrypto AES-GCM)
   * Zapisuje metadane maski bez samego sekretu.
   */
  static async storeApiKey(provider: AIProviderType, apiKey: string, model?: string): Promise<boolean> {
    if (!apiKey || apiKey.trim().length === 0) return false;

    const trimmedKey = apiKey.trim();
    const vaultId = this.getKeyVaultId(provider);
    const success = await SecurityVault.storeSecret(vaultId, trimmedKey);
    if (!success) return false;

    const chosenModel = model || providerRegistry.getDefaultModel(provider);
    const meta: StoredAiKeyMetadata = {
      hasKey: true,
      maskedKey: this.maskApiKey(trimmedKey),
      provider,
      model: chosenModel,
      lastTestedAt: undefined,
      lastConnectionStatus: undefined
    };

    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`${METADATA_STORAGE_KEY_PREFIX}${provider}`, JSON.stringify(meta));
      }
    } catch {
      // Ignoruj błąd zapisu metadanych
    }

    return true;
  }

  /**
   * Usuwa klucz API z bezpiecznego magazynu i czyści metadane
   */
  static async removeApiKey(provider: AIProviderType): Promise<boolean> {
    const vaultId = this.getKeyVaultId(provider);
    await SecurityVault.removeSecret(vaultId);

    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(`${METADATA_STORAGE_KEY_PREFIX}${provider}`);
      }
    } catch {
      // Ignoruj błąd
    }

    return true;
  }

  /**
   * Odczytuje metadane klucza (BEZ ujawniania sekretu)
   */
  static getStoredKeyMetadata(provider: AIProviderType): StoredAiKeyMetadata {
    const defaultModel = providerRegistry.getDefaultModel(provider);
    try {
      if (typeof localStorage !== "undefined") {
        const raw = localStorage.getItem(`${METADATA_STORAGE_KEY_PREFIX}${provider}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            hasKey: Boolean(parsed.hasKey),
            maskedKey: parsed.maskedKey || "",
            provider,
            model: parsed.model || defaultModel,
            lastTestedAt: parsed.lastTestedAt,
            lastConnectionStatus: parsed.lastConnectionStatus
          };
        }
      }
    } catch {
      // ignore
    }

    return {
      hasKey: false,
      maskedKey: "",
      provider,
      model: defaultModel
    };
  }

  /**
   * Zwraca uproszczone metadane klucza dla UI
   */
  static getKeyMetadata(provider: AIProviderType): { maskedKey: string; keyPresent: boolean; model: string } {
    const meta = this.getStoredKeyMetadata(provider);
    return {
      maskedKey: meta.maskedKey,
      keyPresent: meta.hasKey,
      model: meta.model
    };
  }

  /**
   * Zwraca aktywny skonfigurowany klucz BYOK (Gemini lub Anthropic) jeśli istnieje
   */
  static getActiveKeyMetadata(): { provider: AIProviderType; model: string; keyPresent: boolean } | null {
    for (const p of ["gemini", "anthropic"] as AIProviderType[]) {
      const meta = this.getKeyMetadata(p);
      if (meta.keyPresent) {
        return {
          provider: p,
          model: meta.model,
          keyPresent: true
        };
      }
    }
    return null;
  }

  /**
   * Aktualizuje status ostatniego testu połączenia
   */
  private static updateTestStatus(provider: AIProviderType, status: TestConnectionResult["status"]): void {
    const meta = this.getStoredKeyMetadata(provider);
    meta.lastTestedAt = new Date().toISOString();
    meta.lastConnectionStatus = status;

    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(`${METADATA_STORAGE_KEY_PREFIX}${provider}`, JSON.stringify(meta));
      }
    } catch {
      // ignore
    }
  }

  /**
   * Testuje połączenie z wybranym dostawcą AI.
   * Jeśli podano explicitKey (np. w trakcie wpisywania w formularzu przed zapisem), testuje bezpośrednio.
   * W przeciwnym razie odczytuje klucz z SecurityVault z natychmiastową zeroizacją pamięci.
   */
  static async testConnection(
    provider: AIProviderType,
    model?: string,
    explicitKey?: string
  ): Promise<TestConnectionResult> {
    const adapter = providerRegistry.getAdapter(provider);
    if (!adapter) {
      return {
        status: "PROVIDER_ERROR",
        message: `Nieobsługiwany dostawca AI: ${provider}`
      };
    }

    const targetModel = model || adapter.defaultModel;

    // A. Test z jawnym kluczem z formularza
    if (explicitKey && explicitKey.trim().length > 0) {
      const result = await adapter.testConnection(explicitKey.trim(), targetModel);
      this.updateTestStatus(provider, result.status);
      return result;
    }

    // B. Test z zapisanego klucza w SecurityVault
    const vaultId = this.getKeyVaultId(provider);
    try {
      const result = await SecurityVault.executeWithSecret(
        vaultId,
        async (secretKey) => {
          return await adapter.testConnection(secretKey, targetModel);
        },
        `Test połączenia z ${adapter.displayName}`
      );
      this.updateTestStatus(provider, result.status);
      return result;
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Nie odnaleziono sekretu")) {
        return {
          status: "INVALID_API_KEY",
          message: `Klucz API dla ${adapter.displayName} nie został skonfigurowany.`
        };
      }
      return {
        status: "PROVIDER_ERROR",
        message: `Błąd bezpiecznego odczytu klucza: ${msg}`
      };
    }
  }

  /**
   * Buduje zagregowany, bezpieczny kontekst finansowy (StructuredFinancialContext).
   * Zamiast wysyłać tysiące surowych transakcji, agreguje dane lokalnie,
   * oszczędzając tokeny i chroniąc prywatność użytkownika.
   */
  static buildStructuredFinancialContext(profile: Profile, selectedDate?: Date): StructuredFinancialContext {
    const date = selectedDate || new Date();
    const currency = profile.currency || "PLN";
    const transactions = profile.transactions || [];
    const monthly = calculateMonthlyTotals(transactions, date);
    const runway = calculateRunway(profile, 3);

    // Kategoryzacja wydatków (top 5 kategorii)
    const sortedCategories = Object.entries(monthly.categorySpentMap || {})
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: monthly.totalExpense > 0 ? Math.round((amt / monthly.totalExpense) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const savingsRate = monthly.totalIncome > 0
      ? Math.round(((monthly.totalIncome - monthly.totalExpense) / monthly.totalIncome) * 100)
      : null;

    const activeGoals = (profile.goals || []).filter(g => (Number(g.saved) || 0) < (Number(g.target) || 0));
    const unpaidPayments = (profile.payments || []).filter(p => p.status !== "Opłacono");

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const period = `${year}-${month}`;

    const formattedSummary = [
      `Okres: ${period}`,
      `Waluta: ${currency}`,
      `Przychody bieżącego miesiąca: ${monthly.totalIncome.toFixed(2)} ${currency}`,
      `Wydatki bieżącego miesiąca: ${monthly.totalExpense.toFixed(2)} ${currency}`,
      `Bilans miesiąca: ${monthly.balance.toFixed(2)} ${currency}`,
      savingsRate !== null ? `Stopa oszczędności: ${savingsRate}%` : null,
      runway.runwayMonths > 0 ? `Poduszka finansowa (runway): ${runway.runwayMonths} mies. (status: ${runway.status})` : null,
      sortedCategories.length > 0
        ? `Główne kategorie wydatków: ${sortedCategories.map(c => `${c.category} (${c.amount.toFixed(2)} ${currency}, ${c.percentage}%)`).join(", ")}`
        : "Brak zarejestrowanych wydatków w tym miesiącu.",
      `Aktywne cele oszczędnościowe: ${activeGoals.length}`,
      `Nieopłacone rachunki: ${unpaidPayments.length}`
    ].filter(Boolean).join("\n");

    return {
      period,
      currency,
      totalIncome: monthly.totalIncome,
      totalExpense: monthly.totalExpense,
      balance: monthly.balance,
      savingsRatePercent: savingsRate,
      runwayMonths: runway.runwayMonths,
      topExpenseCategories: sortedCategories,
      activeGoalsCount: activeGoals.length,
      budgetWarningsCount: 0,
      unpaidPaymentsCount: unpaidPayments.length,
      formattedSummary
    };
  }

  /**
   * Wysyła zapytanie doradcy finansowego w oparciu o zagregowany kontekst finansowy.
   * Model NIE ma uprawnień do samodzielnej modyfikacji bazy danych.
   * Wszelkie propozycje akcji są zwracane jako propozycja (requiresConfirmation: true).
   */
  static async chatWithAdvisor(
    message: string,
    profile: Profile,
    provider: AIProviderType,
    model?: string
  ): Promise<{ reply: string; actionProposal?: AIActionProposal; usage?: any }> {
    const adapter = providerRegistry.getAdapter(provider);
    if (!adapter) {
      throw new Error(`Dostawca AI ${provider} nie jest obsługiwany.`);
    }

    const context = this.buildStructuredFinancialContext(profile);
    const systemPrompt = `Jesteś profesjonalnym doradcą finansowym w aplikacji Saldo.
Twoim celem jest wspieranie użytkownika w racjonalnym zarządzaniu budżetem domowym, oszczędzaniu i redukcji długów.
Odpowiadaj po polsku, zwięźle, konkretnie i z szacunkiem do danych finansowych.

Oto aktualne zagregowane dane finansowe użytkownika (bezpieczny ekstrakt bez danych osobowych):
${context.formattedSummary}

ZASADY BEZPIECZEŃSTWA:
1. Nie masz uprawnień do bezpośredniej zmiany bazy danych.
2. Jeśli sugerujesz dodanie transakcji, płatności lub celu, zwróć na końcu odpowiedzi opcjonalny blok JSON w formacie:
\`\`\`json
{
  "action": {
    "type": "addTransaction" | "addPayment" | "addGoal",
    "payload": { ... }
  }
}
\`\`\`
Wszelkie akcje zostaną przedstawione użytkownikowi do ręcznego zatwierdzenia.`;

    const vaultId = this.getKeyVaultId(provider);
    const response: AIResponse = await SecurityVault.executeWithSecret(
      vaultId,
      async (secretKey) => {
        return await adapter.generate(
          {
            prompt: message,
            systemPrompt,
            model: model || adapter.defaultModel,
            temperature: 0.2,
            maxTokens: 2048
          },
          secretKey
        );
      },
      `Zapytanie do doradcy AI (${adapter.displayName})`
    );

    // Parsowanie ewentualnej propozycji akcji
    let actionProposal: AIActionProposal | undefined;
    let cleanReply = response.text;

    const jsonMatch = response.text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.action && parsed.action.type) {
          actionProposal = {
            type: parsed.action.type,
            payload: parsed.action.payload || {},
            category: "MUTATING",
            isMutating: true,
            requiresConfirmation: true,
            description: `Zaproponowano dodanie: ${parsed.action.type}`
          };
          // Usuwamy blok JSON z tekstu odpowiedzi dla czytelności
          cleanReply = response.text.replace(/```json\s*[\s\S]*?\s*```/, "").trim();
        }
      } catch {
        // Ignoruj błąd parsowania propozycji
      }
    }

    return {
      reply: cleanReply || response.text,
      actionProposal,
      usage: response.usage
    };
  }

  /**
   * Wysyła zapytanie na czacie z doradcą, przyjmując opcjonalny zagregowany kontekst finansowy
   */
  static async sendChatMessage(
    provider: AIProviderType,
    message: string,
    context?: StructuredFinancialContext | Profile,
    model?: string
  ): Promise<{ reply: string; actionProposal?: AIActionProposal; usage?: any }> {
    if (context && "transactions" in context) {
      return this.chatWithAdvisor(message, context as Profile, provider, model);
    }

    const adapter = providerRegistry.getAdapter(provider);
    if (!adapter) throw new Error(`Dostawca AI ${provider} nie jest obsługiwany.`);

    const formattedSummary = context ? (context as StructuredFinancialContext).formattedSummary : "Brak danych finansowych.";
    const systemPrompt = `Jesteś profesjonalnym doradcą finansowym w aplikacji Saldo.
Twoim celem jest wspieranie użytkownika w racjonalnym zarządzaniu budżetem domowym, oszczędzaniu i redukcji długów.
Odpowiadaj po polsku, zwięźle, konkretnie i z szacunkiem do danych finansowych.

Oto aktualne zagregowane dane finansowe użytkownika (bezpieczny ekstrakt bez danych osobowych):
${formattedSummary}

ZASADY BEZPIECZEŃSTWA:
1. Nie masz uprawnień do bezpośredniej zmiany bazy danych.
2. Jeśli sugerujesz operację finansową (dodanie transakcji, płatności, celu), podaj na końcu odpowiedzi opcjonalny blok JSON w formacie:
\`\`\`json
{
  "action": {
    "type": "addTransaction" | "addPayment" | "addGoal",
    "payload": { ... }
  }
}
\`\`\`
Wszelkie akcje zostaną przedstawione użytkownikowi do ręcznego zatwierdzenia.`;

    const vaultId = this.getKeyVaultId(provider);
    const response: AIResponse = await SecurityVault.executeWithSecret(
      vaultId,
      async (key: string) => {
        return adapter.generate(
          {
            prompt: message,
            systemPrompt,
            model: model || adapter.defaultModel,
            temperature: 0.3,
            maxTokens: 1024
          },
          key
        );
      },
      `Zapytanie do doradcy AI (${provider})`
    );

    let actionProposal: AIActionProposal | undefined;
    let cleanReply = response.text;

    const jsonMatch = response.text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.action && parsed.action.type) {
          actionProposal = {
            type: parsed.action.type,
            payload: parsed.action.payload || {},
            category: "MUTATING",
            isMutating: true,
            requiresConfirmation: true,
            description: `Zaproponowano dodanie: ${parsed.action.type}`
          };
          cleanReply = response.text.replace(/```json\s*[\s\S]*?\s*```/, "").trim();
        }
      } catch {
        // Ignoruj błąd
      }
    }

    return {
      reply: cleanReply || response.text,
      actionProposal,
      usage: response.usage
    };
  }
}
