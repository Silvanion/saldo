import {
  AIProviderAdapter,
  AIProviderType,
  AIModelDefinition,
  TestConnectionResult,
  AIRequest,
  AIResponse,
  AIError
} from "../types";

export class AnthropicProvider implements AIProviderAdapter {
  readonly name: AIProviderType = "anthropic";
  readonly displayName = "Anthropic (Claude)";
  readonly defaultModel = "claude-3-5-sonnet-latest";

  readonly availableModels: AIModelDefinition[] = [
    {
      id: "claude-3-5-sonnet-latest",
      name: "Claude 3.5 Sonnet",
      description: "Najwyższy poziom wnioskowania i analizy finansowej (zalecany)",
      recommended: true
    },
    {
      id: "claude-3-5-haiku-latest",
      name: "Claude 3.5 Haiku",
      description: "Błyskawiczny, lekki i bardzo ekonomiczny model"
    },
    {
      id: "claude-3-opus-latest",
      name: "Claude 3 Opus",
      description: "Model do głębokiej i złożonej analizy długich kontekstów"
    }
  ];

  /**
   * Minimalny test połączenia sprawdzający poprawność klucza i dostępność modelu.
   * Nie wysyła żadnych danych osobowych ani finansowych.
   */
  async testConnection(apiKey: string, model: string = this.defaultModel): Promise<TestConnectionResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      return {
        status: "INVALID_API_KEY",
        message: "Klucz API Anthropic nie został podany."
      };
    }

    const trimmedKey = apiKey.trim();
    const cleanModel = (model || this.defaultModel).trim();
    const startTime = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": trimmedKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: cleanModel,
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }]
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const latencyMs = Math.round(performance.now() - startTime);

      if (response.ok) {
        return {
          status: "SUCCESS",
          message: `Połączono pomyślnie z Anthropic Claude (${cleanModel}).`,
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

      if (response.status === 401) {
        return {
          status: "INVALID_API_KEY",
          message: "Nieprawidłowy klucz API Anthropic (Claude).",
          latencyMs
        };
      }

      if (response.status === 404) {
        return {
          status: "MODEL_NOT_AVAILABLE",
          message: `Model ${cleanModel} nie jest dostępny w usłudze Anthropic.`,
          latencyMs
        };
      }

      if (response.status === 429) {
        return {
          status: "RATE_LIMITED",
          message: "Przekroczono limit zapytań (Rate Limit) Anthropic API.",
          latencyMs
        };
      }

      if (response.status >= 500) {
        return {
          status: "PROVIDER_ERROR",
          message: "Serwer Anthropic zwrócił tymczasowy błąd.",
          latencyMs
        };
      }

      return {
        status: "PROVIDER_ERROR",
        message: `Błąd Anthropic API: ${errorMessage}`,
        latencyMs
      };
    } catch (err: any) {
      clearTimeout(timeout);
      const latencyMs = Math.round(performance.now() - startTime);

      if (err?.name === "AbortError") {
        return {
          status: "TIMEOUT",
          message: "Upłynął limit czasu połączenia z Anthropic Claude (10s).",
          latencyMs
        };
      }

      return {
        status: "NETWORK_ERROR",
        message: "Brak połączenia z siecią lub błąd połączenia z serwerem Anthropic.",
        latencyMs
      };
    }
  }

  /**
   * Generuje odpowiedź za pomocą Anthropic Claude Messages API.
   */
  async generate(request: AIRequest, apiKey: string): Promise<AIResponse> {
    if (!apiKey) {
      throw new AIError("Brak klucza API Anthropic.", "INVALID_API_KEY", this.name);
    }

    const model = request.model || this.defaultModel;
    const controller = new AbortController();
    const timeoutMs = request.timeoutMs || 30000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const body: Record<string, any> = {
      model,
      max_tokens: request.maxTokens ?? 2048,
      temperature: request.temperature ?? 0.2,
      messages: [{ role: "user", content: request.prompt }]
    };

    if (request.systemPrompt) {
      body.system = request.systemPrompt;
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
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

        if (response.status === 401) {
          throw new AIError("Nieprawidłowy klucz API Anthropic.", "INVALID_API_KEY", this.name, response.status);
        }
        if (response.status === 404) {
          throw new AIError(`Model ${model} nie istnieje.`, "MODEL_NOT_AVAILABLE", this.name, response.status);
        }
        if (response.status === 429) {
          throw new AIError("Przekroczono limit zapytań Anthropic API.", "RATE_LIMITED", this.name, response.status);
        }
        throw new AIError(`Błąd Anthropic API: ${errorMsg}`, "PROVIDER_ERROR", this.name, response.status);
      }

      const data = await response.json();
      const text = data.content
        ?.filter((c: any) => c.type === "text")
        ?.map((c: any) => c.text)
        ?.join("") || "";

      return {
        text,
        model,
        provider: this.name,
        usage: {
          promptTokens: data.usage?.input_tokens,
          completionTokens: data.usage?.output_tokens,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        }
      };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err instanceof AIError) throw err;
      if (err?.name === "AbortError") {
        throw new AIError(`Upłynął limit czasu zapytania do Claude (${timeoutMs / 1000}s).`, "TIMEOUT", this.name);
      }
      throw new AIError(
        "Błąd połączenia z serwerem Anthropic.",
        "NETWORK_ERROR",
        this.name
      );
    }
  }
}
