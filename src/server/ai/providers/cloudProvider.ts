import { AiProvider, CloudAiConfig, CloudAiProvider } from "../types";
import { SecurityVault } from "../../../services/SecurityVault";

/**
 * CloudProvider - Obsługuje zewnętrzne modele AI (Gemini, OpenAI, Anthropic, Custom)
 * Klucze API pobierane są z SecurityVault (Keychain/DPAPI) w momencie requestu
 * Nigdy nie są logowane ani przechowywane w pamięci dłużej niż konieczne.
 */

interface CloudProviderRequestOptions {
  endpoint: string;
  method: "POST" | "GET";
  headers: Record<string, string>;
  body?: any;
  timeoutMs?: number;
}

export class CloudProvider implements AiProvider {
  private config: CloudAiConfig;

  constructor(config: CloudAiConfig) {
    this.config = config;
  }

  /**
   * Pobiera klucz API z SecurityVault i wykonuje operację
   */
  private async executeWithApiKey<T>(operation: (apiKey: string) => Promise<T>): Promise<T> {
    const vaultKeyId = this.config.apiKeyRef;

    try {
      // SecurityVault.executeWithSecret pobiera sekret, wykonuje callback i czyści pamięć
      return await SecurityVault.executeWithSecret(
        vaultKeyId,
        async (apiKey: string) => operation(apiKey),
        `Autoryzuj dostęp do klucza API: ${this.config.provider} (${this.config.model})`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("Nie odnaleziono sekretu")) {
        throw new Error(
          `Klucz API dla ${this.config.provider} nie został skonfigurowany. ` +
          `Dodaj go w Ustawieniach → AI → ${this.config.provider.toUpperCase()}.`
        );
      }
      throw error;
    }
  }

  /**
   * Buduje request do odpowiedniego providera
   */
  private buildRequest(apiKey: string, prompt: string, systemPrompt?: string): CloudProviderRequestOptions {
    const { provider, model, baseUrl } = this.config;

    switch (provider) {
      case "gemini": {
        const url = baseUrl || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        return {
          endpoint: url,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: {
            contents: [
              ...(systemPrompt ? [{ role: "user", parts: [{ text: systemPrompt }] }, { role: "model", parts: [{ text: "Rozumiem." }] }] : []),
              { role: "user", parts: [{ text: prompt }] }
            ],
            generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
          }
        };
      }

      case "openai": {
        const url = baseUrl || "https://api.openai.com/v1/chat/completions";
        return {
          endpoint: url,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: {
            model,
            messages: [
              ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
              { role: "user", content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 4096
          }
        };
      }

      case "anthropic": {
        const url = baseUrl || "https://api.anthropic.com/v1/messages";
        return {
          endpoint: url,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: {
            model,
            messages: [{ role: "user", content: prompt }],
            system: systemPrompt,
            max_tokens: 4096,
            temperature: 0.2
          }
        };
      }

      case "custom": {
        if (!baseUrl) throw new Error("Custom provider wymaga baseUrl");
        return {
          endpoint: baseUrl,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: { model, prompt, temperature: 0.2, max_tokens: 4096 }
        };
      }

      default:
        throw new Error(`Nieobsługiwany provider: ${provider}`);
    }
  }

  /**
   * Wykonuje request z timeoutem i obsługą błędów
   */
  private async doRequest(options: CloudProviderRequestOptions): Promise<any> {
    const timeoutMs = options.timeoutMs || 60000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(options.endpoint, {
        method: options.method,
        headers: options.headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errJson = JSON.parse(errorText);
          if (errJson.error?.message) errorMsg = errJson.error.message;
          else if (errJson.error) errorMsg = JSON.stringify(errJson.error);
        } catch { errorMsg = errorText || errorMsg; }
        throw new Error(`${this.config.provider} API error: ${errorMsg}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Timeout: ${this.config.provider} nie odpowiedział w ${timeoutMs/1000}s`);
      }
      throw error;
    }
  }

  // --- Implementacja interfejsu AiProvider ---

  private getSystemPrompt(action: string): string {
    const base = "Jesteś asystentem finansowym w aplikacji Saldo. Odpowiadasz w języku polskim. ";
    const prompts: Record<string, string> = {
      suggestEvent: base + "Zwróć JSON z polami: summary, description, suggestedDate, suggestedTime, suggestedReminders.",
      parseNatural: base + "Zwróć JSON z polami: type (income/expense), name, amount, category, dueDate, isoDate.",
      parseStatement: base + "Zwróć tablicę transakcji JSON: [{name, amount, type (income/expense), isoDate, category}].",
      parseStatementImage: base + "Przeanalizuj obraz wyciągu bankowego. Zwróć tablicę transakcji.",
      chat: base + "Odpowiadaj na pytania finansowe. Możesz propozykcjonować akcje (saveTransaction, createGoal, itp.). Zwróć JSON: {reply, action?}.",
      scanInvoice: base + "Zwróć JSON: {name, amount, type (income/expense), dueDate, isoDate, category}.",
      explain: base + "Wyjaśnij techniczny kod błędu w prostych słowach. Zwróć JSON: {explanation}."
    };
    return prompts[action] || base;
  }

  async suggestEvent(payment: any, currentDate: string, uid?: string): Promise<any> {
    return this.executeWithApiKey(async (apiKey) => {
      const prompt = `Płatność: ${payment.name}, kwota: ${payment.amount} ${payment.currency || "PLN"}, termin: ${payment.dueDate || currentDate}. Kategoria: ${payment.category || "Rachunki"}.`;
      const req = this.buildRequest(apiKey, prompt, this.getSystemPrompt("suggestEvent"));
      const result = await this.doRequest(req);
      return this.parseGeminiResponse(result) || result;
    });
  }

  async parseNatural(text: string, currentDate: string): Promise<any> {
    return this.executeWithApiKey(async (apiKey) => {
      const prompt = `Tekst: "${text}". Data dzisiejsza: ${currentDate}.`;
      const req = this.buildRequest(apiKey, prompt, this.getSystemPrompt("parseNatural"));
      const result = await this.doRequest(req);
      return this.parseGeminiResponse(result) || result;
    });
  }

  async parseStatement(text: string, currentDate: string): Promise<any> {
    return this.executeWithApiKey(async (apiKey) => {
      const prompt = `Wyciąg bankowy (data dzisiejsza: ${currentDate}):\n${text}`;
      const req = this.buildRequest(apiKey, prompt, this.getSystemPrompt("parseStatement"));
      const result = await this.doRequest(req);
      return this.parseGeminiResponse(result) || result;
    });
  }

  async parseStatementImage?(imageBase64: string, mimeType: string, currentDate: string): Promise<any> {
    if (this.config.provider !== "gemini" && this.config.provider !== "openai" && this.config.provider !== "anthropic") {
      throw new Error(`Provider ${this.config.provider} nie obsługuje analizy obrazów.`);
    }
    return this.executeWithApiKey(async (apiKey) => {
      // Vision models require special handling - simplified for now
      const prompt = `Przeanalizuj obraz wyciągu bankowego (MIME: ${mimeType}). Data dzisiejsza: ${currentDate}. Zwróć transakcje jako JSON.`;
      const req = this.buildRequest(apiKey, prompt, this.getSystemPrompt("parseStatementImage"));
      const result = await this.doRequest(req);
      return this.parseGeminiResponse(result) || result;
    });
  }

  async chat(message: string, profileData: any): Promise<any> {
    return this.executeWithApiKey(async (apiKey) => {
      const context = profileData ? `\nKontekst profilu: ${JSON.stringify(profileData, null, 2).slice(0, 2000)}` : "";
      const prompt = `${message}${context}`;
      const req = this.buildRequest(apiKey, prompt, this.getSystemPrompt("chat"));
      const result = await this.doRequest(req);
      return this.parseGeminiResponse(result) || result;
    });
  }

  async scanInvoice(imageBase64: string, mimeType: string): Promise<any> {
    if (this.config.provider !== "gemini" && this.config.provider !== "openai" && this.config.provider !== "anthropic") {
      throw new Error(`Provider ${this.config.provider} nie obsługuje skanowania faktur.`);
    }
    return this.executeWithApiKey(async (apiKey) => {
      const prompt = `Przeanalizuj fakturę/dokument (MIME: ${mimeType}). Zwróć: name, amount, type (income/expense), dueDate, isoDate, category.`;
      const req = this.buildRequest(apiKey, prompt, this.getSystemPrompt("scanInvoice"));
      const result = await this.doRequest(req);
      return this.parseGeminiResponse(result) || result;
    });
  }

  async explain(reasonCode: string, title: string, message: string, missingFields?: string[]): Promise<any> {
    return this.executeWithApiKey(async (apiKey) => {
      const prompt = `Kod: ${reasonCode}\nTytuł: ${title}\nWiadomość: ${message}\nBrakujące pola: ${missingFields?.join(", ") || "brak"}`;
      const req = this.buildRequest(apiKey, prompt, this.getSystemPrompt("explain"));
      const result = await this.doRequest(req);
      return this.parseGeminiResponse(result) || result;
    });
  }

  /**
   * Parsuje odpowiedź Gemini (candidates[0].content.parts[0].text) do JSON
   */
  private parseGeminiResponse(response: any): any {
    if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const text = response.candidates[0].content.parts[0].text;
      try {
        // Usuń ewentualne bloki markdown ```json ... ```
        const clean = text.replace(/^```json\s*|\s*```$/g, "").trim();
        return JSON.parse(clean);
      } catch {
        return { raw: text };
      }
    }
    if (response?.choices?.[0]?.message?.content) {
      // OpenAI format
      const text = response.choices[0].message.content;
      try {
        const clean = text.replace(/^```json\s*|\s*```$/g, "").trim();
        return JSON.parse(clean);
      } catch {
        return { raw: text };
      }
    }
    if (response?.content?.[0]?.text) {
      // Anthropic format
      const text = response.content[0].text;
      try {
        const clean = text.replace(/^```json\s*|\s*```$/g, "").trim();
        return JSON.parse(clean);
      } catch {
        return { raw: text };
      }
    }
    return response;
  }
}