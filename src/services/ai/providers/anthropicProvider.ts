import {
  AIProviderAdapter,
  AIProviderType,
  AIModelDefinition,
  TestConnectionResult,
  AIRequest,
  AIResponse,
  AIError
} from "../types";
import { fetchWithRetry, isTransientStatus } from "../fetchRetry";

export class AnthropicProvider implements AIProviderAdapter {
  readonly name: AIProviderType = "anthropic";
  readonly displayName = "Anthropic (Claude)";
  readonly defaultModel = "claude-haiku-5-5";

  // Modele claude-3-* zostały wycofane przez Anthropic (m.in. 3.5 Sonnet 28.10.2025,
  // 3 Opus 05.01.2026, 3.7 Sonnet i 3.5 Haiku 19.02.2026) — zapytania zwracają błąd.
  readonly availableModels: AIModelDefinition[] = [
    {
      id: "claude-haiku-5-5",
      name: "Claude Haiku 5.5",
      description: "Najtańszy i najszybszy model aktualnej generacji — domyślny wybór do czatu o budżecie (zalecany)",
      recommended: true
    },
    {
      id: "claude-sonnet-5-5",
      name: "Claude Sonnet 5.5",
      description: "Zrównoważony model do dłuższych analiz finansowych"
    },
    {
      id: "claude-opus-5-5",
      name: "Claude Opus 5.5",
      description: "Najmocniejszy model do najgłębszych analiz (najdroższy)"
    },
    {
      id: "claude-sonnet-5",
      name: "Claude Sonnet 5",
      description: "Poprzednia generacja Sonnet w tej samej cenie"
    },
    {
      id: "claude-haiku-4-5",
      name: "Claude Haiku 4.5",
      description: "Poprzednia generacja Haiku (droższa od 5.5)"
    }
  ];

  /** Wycofane modele claude-3-* (np. zapisane we wcześniejszych ustawieniach) → model domyślny. */
  private resolveModel(model?: string): string {
    const m = (model || "").trim();
    return !m || /^claude-3-/.test(m) ? this.defaultModel : m;
  }

  /** Parametr effort jest akceptowany tylko przez modele 5.x (starsze zwracają błąd). */
  private supportsEffort(model: string): boolean {
    return /^claude-(haiku-5|sonnet-5|opus-5|fable-5|mythos-5)/.test(model);
  }

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
    const cleanModel = this.resolveModel(model);
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

    const model = this.resolveModel(request.model);
    const controller = new AbortController();
    const timeoutMs = request.timeoutMs || 30000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const body: Record<string, any> = {
      model,
      max_tokens: request.maxTokens ?? 2048,
      messages: [{ role: "user", content: request.prompt }]
    };
    // Bez `temperature`: modele 5.x odrzucają niedomyślne wartości (400), a od wersji API
    // 2026-10-21 pole jest odrzucane na każdym modelu.
    if (this.supportsEffort(model)) {
      // Czat o budżecie nie potrzebuje głębokiego rozumowania — niski effort to tańsze i szybsze odpowiedzi.
      body.output_config = { effort: "low" };
    }

    if (request.systemPrompt) {
      body.system = request.systemPrompt;
    }

    try {
      const response = await fetchWithRetry(() =>
        fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey.trim(),
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify(body),
          signal: controller.signal
        })
      );

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
        if (isTransientStatus(response.status)) {
          throw new AIError(
            "Serwer Anthropic jest chwilowo przeciążony (po 3 próbach). Spróbuj ponownie za moment albo wybierz inny model w Ustawieniach → Automatyzacja & AI.",
            "PROVIDER_ERROR",
            this.name,
            response.status
          );
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
