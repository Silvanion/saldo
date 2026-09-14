import { getLocalDateIso } from "../../../utils";
import { parseStatementText } from "../../../services/localParsers";
import { AiProvider } from "../types";

export class LocalProvider implements AiProvider {
  private endpoint: string;
  private modelName?: string;
  private detectedModel?: string;

  constructor(endpoint?: string, modelName?: string) {
    // Default Ollama endpoint assumption if none provided
    this.endpoint = endpoint || "http://localhost:11434/api/generate";
    this.modelName = modelName?.trim() || undefined;
  }

  /**
   * Defensive JSON parser that handles pure JSON, Markdown code fences,
   * and text with embedded JSON objects or arrays.
   */
  private extractJson(text: string): any {
    const raw = text.trim();
    if (!raw) {
      throw new Error("Lokalny silnik AI nie odpowiedział poprawnie.");
    }

    // 1. Try direct JSON parse
    try {
      return JSON.parse(raw);
    } catch (e) {
      // Continue to defensive parsing
    }

    // 2. Try parsing inside Markdown ```json ... ``` code fence
    const jsonFenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonFenceMatch && jsonFenceMatch[1]) {
      try {
        return JSON.parse(jsonFenceMatch[1].trim());
      } catch (e) {
        // Continue to fallback
      }
    }

    // 3. Search for outermost JSON object { ... } or array [ ... ]
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    const firstBracket = raw.indexOf("[");
    const lastBracket = raw.lastIndexOf("]");

    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      try {
        return JSON.parse(raw.substring(firstBrace, lastBrace + 1));
      } catch (e) {
        // Continue to fallback
      }
    }

    if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
      try {
        return JSON.parse(raw.substring(firstBracket, lastBracket + 1));
      } catch (e) {
        // Continue to fallback
      }
    }

    throw new Error("Nie udało się zinterpretować odpowiedzi lokalnego modelu jako JSON.");
  }

  /**
   * Generic request execution wrapper with timeout, signal handling,
   * network validation, and safe response parsing.
   */
  private async getModelName(): Promise<string> {
    if (this.modelName) return this.modelName;
    if (this.detectedModel) return this.detectedModel;

    const tagsEndpoint = new URL(this.endpoint);
    tagsEndpoint.pathname = "/api/tags";
    tagsEndpoint.search = "";
    const response = await fetch(tagsEndpoint, { method: "GET" });
    if (!response.ok) {
      throw new Error("Nie udało się pobrać listy modeli z Ollamy.");
    }

    const data = await response.json() as { models?: Array<{ name?: string; model?: string }> };
    const firstModel = data.models?.find((model) => model.name || model.model);
    const modelName = firstModel?.name || firstModel?.model;
    if (!modelName) {
      throw new Error("Nie znaleziono żadnego modelu w Ollamie. Pobierz model, np. qwen3:4b.");
    }

    this.detectedModel = modelName;
    return modelName;
  }

  private async callLocalApi(prompt: string, expectJson: boolean = true): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 30s timeout

    try {
      // Default Ollama payload structure
      const payload: Record<string, any> = {
        model: await this.getModelName(),
        prompt: prompt,
        stream: false,
      };

      if (expectJson) {
        payload.format = "json"; // Hint for Ollama JSON mode
      }

      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 404 && this.modelName) {
          throw new Error(`Model ${this.modelName} nie jest zainstalowany w Ollamie. Wykryj modele lub wybierz inny.`);
        }
        throw new Error(`Błąd HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      
      // Ollama returns text in data.response. Fallback to whole data if stringified.
      const responseText = typeof data.response === "string" ? data.response : (data.response ? JSON.stringify(data.response) : JSON.stringify(data));

      if (expectJson) {
        return this.extractJson(responseText);
      } else {
        return { reply: responseText };
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      console.error("[LocalProvider] Error executing request:", e);

      if (e.name === "AbortError") {
        throw new Error("Lokalny serwer AI nie odpowiedział w oczekiwanym czasie (timeout).");
      }

      // Return clean domain error message to user
      if (
        e.message &&
        (e.message.includes("zinterpretować") ||
          e.message.includes("modeli") ||
          e.message.includes("nie jest zainstalowany") ||
        e.message.includes("Nie znaleziono żadnego modelu") ||
        e.message.includes("pobrać listy modeli"))
      ) {
        throw e;
      }
      throw new Error("Lokalny silnik AI nie odpowiedział poprawnie.");
    }
  }

  private isRealIsoDate(value: unknown): value is string {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
  }

  async suggestEvent(payment: any, currentDate: string): Promise<any> {
    const prompt = `Zaplanuj przypomnienie kalendarza w formacie JSON dla płatności:
Nazwa: ${payment.name}
Kwota: ${payment.amount}
Termin: ${payment.dueDate}
Dzisiejsza data: ${currentDate || getLocalDateIso()}

Wymagane pola JSON: summary (np. "💸 Płatność: [Nazwa] ([Kwota])"), description (stworzony profesjonalny szablon z przypomnieniem o kwocie, dacie i dodaną krótką, przyjazną poradą finansową), suggestedTime (HH:MM:SS), reminders (tablica liczb, minuty np [1440, 120]). Zwróć tylko prawidłowy obiekt JSON.`;
    return this.callLocalApi(prompt, true);
  }

  async parseNatural(text: string, currentDate: string): Promise<any> {
    const prompt = `Wyodrębnij informacje do formy JSON.
Tekst: "${text}"
Data odniesienia: ${currentDate || getLocalDateIso()}

Wymagany format JSON z dwoma kluczami:
'payment' (obiekt z name, amount, dueDate) lub null.
'event' (obiekt z summary, description, suggestedDate, suggestedTime, reminders) lub null.
Zwróć tylko prawidłowy obiekt JSON.`;
    return this.callLocalApi(prompt, true);
  }

  async parseStatement(text: string, currentDate: string): Promise<any> {
    const prompt = `Analizuj wyciąg bankowy. Data odniesienia: ${currentDate}.
Tekst: """${text}"""

Zwróć JSON jako obiekt z jednym kluczem "transactions", zawierającym tablicę
obiektów: name, amount (liczba dodatnia), type ("income" lub "expense"),
isoDate (YYYY-MM-DD), category, account (zawsze "Konto główne").
Jeśli nie ma transakcji, zwróć {"transactions":[]}. Zwróć tylko prawidłowy JSON.`;
    
    const res = await this.callLocalApi(prompt, true);
    const transactions = Array.isArray(res)
      ? res
      : (Array.isArray(res?.transactions) ? res.transactions : []);
    const validTransactions = transactions.filter((transaction: any) =>
      transaction &&
      typeof transaction.name === "string" &&
      transaction.name.trim().length > 0 &&
      typeof transaction.amount === "number" &&
      Number.isFinite(transaction.amount) &&
      transaction.amount > 0 &&
      (transaction.type === "income" || transaction.type === "expense") &&
      this.isRealIsoDate(transaction.isoDate) &&
      typeof transaction.category === "string" &&
      transaction.category.trim().length > 0
    );
    if (validTransactions.length > 0) return { transactions: validTransactions };

    // Some Ollama models (notably reasoning models with JSON mode) return {}
    // instead of the requested shape. Preserve the import instead of silently
    // reporting success with an empty result.
    return {
      transactions: parseStatementText(text, currentDate)
    };
  }

  async parseStatementImage(imageBase64: string, mimeType: string, currentDate: string): Promise<any> {
    const model = await this.getModelName();
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: `Odczytaj tabelę operacji bankowych z obrazu. Zwróć wyłącznie JSON: tablicę obiektów name, amount (dodatnia liczba), type ("income" lub "expense"), isoDate (YYYY-MM-DD), category. Data odniesienia: ${currentDate}.`,
        images: [imageBase64],
        stream: false,
        format: "json"
      })
    });
    if (!response.ok) throw new Error(`Błąd HTTP ${response.status} podczas analizy obrazu.`);
    const data = await response.json() as { response?: string };
    return this.extractJson(data.response || "");
  }

  async chat(message: string, profileData: any): Promise<any> {
    const prompt = `Jesteś doradcą "Saldo". Odpowiadaj zwięźle i profesjonalnie.
Profil użytkownika (do kontekstu, zanonimizowany): ${JSON.stringify(profileData)}.
Pytanie użytkownika: ${message}`;
    
    return this.callLocalApi(prompt, false);
  }

  async scanInvoice(imageBase64: string, mimeType: string): Promise<any> {
    const model = await this.getModelName();
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: "Odczytaj fakturę. Zwróć wyłącznie JSON z polami name (tytuł lub sprzedawca), amount (dodatnia kwota), dueDate (YYYY-MM-DD) i category. Nie zgaduj brakujących danych.",
        images: [imageBase64],
        stream: false,
        format: "json"
      })
    });
    if (!response.ok) throw new Error(`Błąd HTTP ${response.status} podczas analizy faktury.`);
    const data = await response.json() as { response?: string };
    const result = this.extractJson(data.response || "");
    return {
      name: result?.name,
      amount: result?.amount,
      dueDate: result?.dueDate,
      category: result?.category
    };
  }
}
