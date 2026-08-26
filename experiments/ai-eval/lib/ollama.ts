/**
 * Minimalny klient Ollama używany tylko przez skrypty ewaluacyjne w experiments/ai-eval.
 * Nie jest częścią aplikacji.
 */

export interface OllamaCallOptions {
  model: string;
  prompt: string;
  format?: "json";
  temperature?: number;
  timeoutMs?: number;
  endpoint?: string;
}

export async function callOllama(opts: OllamaCallOptions): Promise<string> {
  const endpoint = opts.endpoint || "http://localhost:11434/api/generate";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: opts.model,
        prompt: opts.prompt,
        stream: false,
        format: opts.format,
        options: { temperature: opts.temperature ?? 0.1 }
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`Ollama HTTP ${res.status}: ${await res.text().catch(() => "")}`);
    }

    const data = await res.json();
    if (typeof data.response !== "string") {
      throw new Error("Nieoczekiwana odpowiedź Ollama: brak pola 'response'");
    }
    return data.response;
  } finally {
    clearTimeout(timeout);
  }
}

/** Wyciąga pierwszy poprawny obiekt/tablicę JSON z odpowiedzi modelu (fence, tekst wokół itp.). */
export function extractJson(text: string): any {
  const raw = text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    // spróbuj dalej
  }

  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      // spróbuj dalej
    }
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  const firstBracket = raw.indexOf("[");
  const lastBracket = raw.lastIndexOf("]");

  if (firstBracket !== -1 && lastBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    try {
      return JSON.parse(raw.slice(firstBracket, lastBracket + 1));
    } catch {
      // spróbuj dalej
    }
  }
  if (firstBrace !== -1 && lastBrace !== -1) {
    return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
  }

  throw new Error("Nie udało się wyciągnąć JSON z odpowiedzi modelu.");
}

export async function checkOllamaAvailable(model: string, endpoint?: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const res = await fetch((endpoint || "http://localhost:11434/api/tags"));
    if (!res.ok) return { ok: false, reason: `Ollama nie odpowiada (HTTP ${res.status}). Uruchom: ollama serve` };
    const data = await res.json();
    const names: string[] = (data.models || []).map((m: any) => m.name);
    if (!names.some((n) => n === model || n.startsWith(model.split(":")[0] + ":"))) {
      return { ok: false, reason: `Model "${model}" nie jest pobrany. Uruchom: ollama pull ${model}\nDostępne modele: ${names.join(", ") || "(brak)"}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: `Nie można połączyć się z Ollama na localhost:11434 (${e?.message || e}). Uruchom: ollama serve` };
  }
}
