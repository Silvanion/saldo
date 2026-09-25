import {
  AIProviderAdapter,
  AIProviderType,
  AIModelDefinition,
  TestConnectionResult,
  AIRequest,
  AIResponse,
  AIError
} from "../types";

export class GeminiProvider implements AIProviderAdapter {
  readonly name: AIProviderType = "gemini";
  readonly displayName = "Google Gemini";
  readonly defaultModel = "gemini-2.5-flash";

  readonly availableModels: AIModelDefinition[] = [
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      description: "Najszybszy i najbardziej wszechstronny model Google (zalecany)",
      recommended: true
    },
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      description: "Nowoczesny, szybki model nowej generacji"
    },
    {
      id: "gemini-1.5-flash",
      name: "Gemini 1.5 Flash",
      description: "Lekki i bardzo ekonomiczny model"
    },
    {
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
      description: "Model o zwiększonej pojemności wnioskowania i głębszej analizy"
    }
  ];

  /**
   * Minimalny test połączenia sprawdzający poprawność klucza i dostępność modelu.
   * Nie wysyła żadnych danych osobowych ani finansowych.
   * Używa autoryzacji w nagłówku x-goog-api-key (nigdy w URL query string).
   */
  async testConnection(apiKey: string, model: string = this.defaultModel): Promise<TestConnectionResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return {
        status: "INVALID_API_KEY",
        message: "Klucz API Gemini nie został podany."
      };
    }

    const trimmedKey = apiKey.trim();
    const cleanModel = (model || this.defaultModel).trim();
    const startTime = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      // Wykonujemy minimalny test zapytania testowego do endpointu generateContent
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": trimmedKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 1, temperature: 0.1 }
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const latencyMs = Math.round(performance.now() - startTime);

      if (response.ok) {
        return {
          status: "SUCCESS",
          message: `Połączono pomyślnie z Google Gemini (${cleanModel}).`,
          latencyMs
        };
      }

      const errorText = await response.text().catch(() => "");
      let errorMessage = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error?.message) {
          errorMessage = parsed.error.message;
        }
      } catch {
        // Ignoruj błąd parsowania
      }

      if (response.status === 400 || response.status === 401 || response.status === 403) {
        const lower = errorMessage.toLowerCase();
        if (lower.includes("api_key_invalid") || lower.includes("api key not valid") || lower.includes("not found")) {
          return {
            status: "INVALID_API_KEY",
            message: "Nieprawidłowy lub nieaktywny klucz API Google Gemini.",
            latencyMs
          };
        }
      }

      if (response.status === 404) {
        return {
          status: "MODEL_NOT_AVAILABLE",
          message: `Model ${cleanModel} nie jest dostępny dla podanego klucza.`,
          latencyMs
        };
      }

      if (response.status === 429) {
        return {
          status: "RATE_LIMITED",
          message: "Przekroczono limit zapytań (Rate Limit) Google Gemini.",
          latencyMs
        };
      }

      if (response.status >= 500) {
        return {
          status: "PROVIDER_ERROR",
          message: "Serwer Google Gemini zwrócił tymczasowy błąd.",
          latencyMs
        };
      }

      return {
        status: "PROVIDER_ERROR",
        message: `Błąd Google Gemini: ${errorMessage}`,
        latencyMs
      };
    } catch (err: any) {
      clearTimeout(timeout);
      const latencyMs = Math.round(performance.now() - startTime);

      if (err?.name === "AbortError") {
        return {
          status: "TIMEOUT",
          message: "Upłynął limit czasu połączenia z Google Gemini (10s).",
          latencyMs
        };
      }

      return {
        status: "NETWORK_ERROR",
        message: "Brak połączenia z siecią lub błąd połączenia z serwerem Google Gemini.",
        latencyMs
      };
    }
  }

  /**
   * Generuje odpowiedź za pomocą Gemini API.
   * Bezpiecznie przekazuje klucz w nagłówku i parsuje odpowiedź JSON.
   */
  async generate(request: AIRequest, apiKey: string): Promise<AIResponse> {
    if (!apiKey) {
      throw new AIError("Brak klucza API Gemini.", "INVALID_API_KEY", this.name);
    }

    const model = request.model || this.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const controller = new AbortController();
    const timeoutMs = request.timeoutMs || 30000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const body: Record<string, any> = {
      contents: [
        {
          role: "user",
          parts: [{ text: request.prompt }]
        }
      ],
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxTokens ?? 2048
      }
    };

    if (request.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: request.systemPrompt }]
      };
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey.trim()
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        let errorMsg = `HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.error?.message) errorMsg = parsed.error.message;
        } catch {
          // ignore
        }

        if (response.status === 401 || response.status === 403) {
          throw new AIError("Nieprawidłowy klucz API Gemini.", "INVALID_API_KEY", this.name, response.status);
        }
        if (response.status === 404) {
          throw new AIError(`Model ${model} nie istnieje.`, "MODEL_NOT_AVAILABLE", this.name, response.status);
        }
        if (response.status === 429) {
          throw new AIError("Przekroczono limit zapytań Gemini API.", "RATE_LIMITED", this.name, response.status);
        }
        throw new AIError(`Błąd Gemini API: ${errorMsg}`, "PROVIDER_ERROR", this.name, response.status);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.map((p: any) => p.text).join("") || "";
      const usageMetadata = data.usageMetadata;

      return {
        text,
        model,
        provider: this.name,
        usage: {
          promptTokens: usageMetadata?.promptTokenCount,
          completionTokens: usageMetadata?.candidatesTokenCount,
          totalTokens: usageMetadata?.totalTokenCount
        }
      };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err instanceof AIError) throw err;
      if (err?.name === "AbortError") {
        throw new AIError(`Upłynął limit czasu zapytania do Gemini (${timeoutMs / 1000}s).`, "TIMEOUT", this.name);
      }
      throw new AIError(
        "Błąd połączenia z serwerem Google Gemini.",
        "NETWORK_ERROR",
        this.name
      );
    }
  }
}
