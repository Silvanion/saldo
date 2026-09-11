import { expenseCategories, incomeCategories, iconByCategory } from "../utils/categories";

/**
 * Klient lokalnego AI (Ollama), wołany bezpośrednio z przeglądarki — bez pośredniczącego
 * serwera. Ollama domyślnie ufa originom localhost/127.0.0.1 bez konfiguracji; dla
 * wdrożonej aplikacji HTTPS użytkownik musi raz ustawić OLLAMA_ORIGINS na swoją domenę
 * (Chrome/Firefox obsługują to przez wyjątek mixed-content dla adresów loopback,
 * Safari/WebKit ma to jako otwarty błąd — patrz isLocalAiLikelyUnsupported niżej).
 *
 * Strategie w tym pliku są wynikiem czterech zweryfikowanych eksperymentów
 * (zob. experiments/ai-eval), nie domysłem:
 *  - kategoryzacja: tekst w promptcie z jawnym fallbackiem "Inne", NIGDY wymuszony
 *    schemat enum — enum na 7B modelu dawał 15,7% (gorzej niż same reguły), tekst 62%.
 *  - ekstrakcja: fragmentowanie po kotwicach dat przed wysyłką, bo cały tekst naraz
 *    gubił transakcje (1 z 4 zamiast 4 z 4).
 *  - każda wyciągnięta kwota jest sprawdzana względem tekstu źródłowego — model
 *    potrafił zgubić cyfrę przy spacji jako separatorze tysięcy ("7 200,00" -> 720).
 */

export const DEFAULT_LOCAL_AI_ENDPOINT = "http://localhost:11434/api/generate";
export const DEFAULT_LOCAL_AI_MODEL = "qwen2.5:7b";
const CATEGORY_BATCH_SIZE = 20;
const REQUEST_TIMEOUT_MS = 60_000;
const HEALTH_TIMEOUT_MS = 4_000;

const ALL_CATEGORIES = Array.from(new Set([...expenseCategories, ...incomeCategories]));

export class LocalAiError extends Error {}

interface OllamaCallOptions {
  endpoint: string;
  model: string;
  prompt: string;
  temperature?: number;
  timeoutMs?: number;
}

async function callOllama(opts: OllamaCallOptions): Promise<string> {
  if (!isLocalEndpointSafe(opts.endpoint)) {
    throw new LocalAiError("Lokalne AI może korzystać wyłącznie z adresu localhost.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(opts.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: opts.model,
        prompt: opts.prompt,
        stream: false,
        format: "json",
        options: { temperature: opts.temperature ?? 0 }
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      throw new LocalAiError(`Lokalny model AI odpowiedział błędem HTTP ${res.status}.`);
    }
    const data = await res.json();
    if (typeof data.response !== "string") {
      throw new LocalAiError("Nieoczekiwana odpowiedź lokalnego modelu AI.");
    }
    return data.response;
  } catch (e: any) {
    if (e instanceof LocalAiError) throw e;
    if (e?.name === "AbortError") {
      throw new LocalAiError("Lokalny model AI nie odpowiedział w oczekiwanym czasie.");
    }
    throw new LocalAiError(
      "Nie udało się połączyć z lokalnym AI. Sprawdź, czy Ollama działa (ollama serve) " +
      "i czy model jest pobrany (ollama pull " + opts.model + ")."
    );
  } finally {
    clearTimeout(timeout);
  }
}

/** Wyciąga pierwszy poprawny obiekt/tablicę JSON z odpowiedzi modelu (fence, tekst wokół itp.). */
function extractJson(text: string): any {
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
  throw new LocalAiError("Nie udało się odczytać odpowiedzi lokalnego modelu jako JSON.");
}

export interface LocalAiConfig {
  endpoint: string;
  model: string;
}

export function resolveLocalAiConfig(state?: { localAiEndpoint?: string; localAiModel?: string }): LocalAiConfig {
  return {
    endpoint: state?.localAiEndpoint?.trim() || DEFAULT_LOCAL_AI_ENDPOINT,
    model: state?.localAiModel?.trim() || DEFAULT_LOCAL_AI_MODEL
  };
}

/**
 * Bezpieczeństwo: dopuszcza wyłącznie adresy loopback jako endpoint lokalnego AI —
 * to samo ograniczenie, które kiedyś egzekwował serwer po stronie backendu.
 */
export function isLocalEndpointSafe(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    // URL.hostname zwraca adresy IPv6 w nawiasach kwadratowych, np. "[::1]".
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  } catch {
    return false;
  }
}

/**
 * Safari/WebKit ma otwarty błąd blokujący połączenia z localhost z poziomu strony HTTPS
 * (webkit#171934, regresja iOS 18 #279249) — w dev (HTTP) to ograniczenie nie występuje,
 * dotyczy tylko wdrożonej aplikacji na HTTPS.
 */
export function isLocalAiLikelyUnsupported(): boolean {
  if (typeof navigator === "undefined" || typeof location === "undefined") return false;
  const isHttps = location.protocol === "https:";
  const ua = navigator.userAgent;
  const isSafari = /safari/i.test(ua) && !/chrome|chromium|crios|edg|opr/i.test(ua);
  return isHttps && isSafari;
}

export async function checkLocalAiHealth(config: LocalAiConfig): Promise<{ ok: boolean; reason?: string }> {
  if (!isLocalEndpointSafe(config.endpoint)) {
    return { ok: false, reason: "Dozwolone są wyłącznie adresy lokalne (localhost / 127.0.0.1)." };
  }
  const tagsUrl = config.endpoint.replace(/\/api\/generate\/?$/, "/api/tags");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(tagsUrl, { signal: controller.signal });
    if (!res.ok) return { ok: false, reason: `Ollama odpowiedziała błędem HTTP ${res.status}.` };
    const data = await res.json();
    const names: string[] = (data.models || []).map((m: any) => m.name);
    if (!names.some((n) => n === config.model || n.startsWith(config.model.split(":")[0] + ":"))) {
      return {
        ok: false,
        reason: `Model "${config.model}" nie jest pobrany. Uruchom: ollama pull ${config.model}`
      };
    }
    return { ok: true };
  } catch (e: any) {
    if (e?.name === "AbortError") return { ok: false, reason: "Ollama nie odpowiedziała w oczekiwanym czasie." };
    return { ok: false, reason: "Nie można połączyć się z Ollama. Sprawdź, czy działa (ollama serve)." };
  } finally {
    clearTimeout(timeout);
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Kategoryzuje opisy transakcji przez lokalny model. Zwraca mapę opis -> kategoria;
 * opisy, dla których model nie zwrócił nic sensownego, są pomijane (wywołujący
 * decyduje, co zrobić z brakiem — zwykle zostawia oryginalną kategorię).
 */
export async function categorizeDescriptionsWithLocalAi(
  descriptions: string[],
  config: LocalAiConfig
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const batches = chunk(Array.from(new Set(descriptions)), CATEGORY_BATCH_SIZE);

  for (const batch of batches) {
    const numbered = batch.map((d, i) => `${i}: ${d}`).join("\n");
    const prompt = `Skategoryzuj każdy opis transakcji bankowej do JEDNEJ z dozwolonych kategorii.
Dozwolone kategorie (użyj DOKŁADNIE tej pisowni): ${ALL_CATEGORIES.join(", ")}

Jeśli opis nie pasuje jednoznacznie do żadnej konkretnej kategorii (np. ogólny sklep
internetowy, wypłata gotówki, przelew bez jasnego tytułu), wybierz "Inne" zamiast zgadywać.

Opisy indeksowane od 0:
${numbered}

Zwróć JSON w formacie {"0": "kategoria dla opisu 0", "1": "kategoria dla opisu 1", ...}
z DOKŁADNIE ${batch.length} kluczami — po jednym dla każdego indeksu od 0 do ${batch.length - 1}.`;

    let parsed: any = null;
    for (let attempt = 0; attempt < 2 && parsed === null; attempt++) {
      try {
        const raw = await callOllama({ ...config, prompt, temperature: attempt === 0 ? 0 : 0.2 });
        const candidate = extractJson(raw);
        if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) parsed = candidate;
      } catch {
        // druga próba niżej; jeśli i ona zawiedzie, partia zostaje pominięta
      }
    }
    if (!parsed) continue;

    batch.forEach((d, i) => {
      const val = parsed[String(i)];
      if (typeof val === "string" && ALL_CATEGORIES.includes(val.trim())) {
        results.set(d, val.trim());
      }
    });
  }

  return results;
}

export interface LocalAiExtractedRow {
  name: string;
  amount: number;
  type: "income" | "expense";
  isoDate: string | null;
  category: string;
  categoryIcon: string;
  /** false = kwota nie występuje w tekście źródłowym, do ręcznej weryfikacji przed importem. */
  amountConsistent: boolean;
}

const DATE_LINE = /^\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4})\b/;

/** Dzieli tekst na bloki po wierszach zaczynających się datą — jedna transakcja na wywołanie
 *  modelu zamiast całego wyciągu naraz, bo model gubił transakcje w gęstym tekście. */
function splitByDateAnchors(text: string): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  for (const line of text.split("\n")) {
    if (DATE_LINE.test(line.trim())) {
      if (current.length) blocks.push(current.join("\n").trim());
      current = [line];
    } else if (line.trim()) {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current.join("\n").trim());
  return blocks.filter(Boolean);
}

function splitIntoBlocks(text: string): string[] {
  const byDate = splitByDateAnchors(text);
  if (byDate.length > 1) return byDate;
  return text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
}

const SPACE_CLASS = "[ \\u00A0]";

function stripDatesAndTimes(text: string): string {
  return text
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .replace(/\b\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4}\b/g, " ")
    .replace(/\b\d{2}:\d{2}(:\d{2})?\b/g, " ");
}

function findAllAmountsInText(text: string): number[] {
  const cleaned = stripDatesAndTimes(text);
  const numberPattern = new RegExp(`\\d{1,3}(?:${SPACE_CLASS}\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?`, "g");
  const stripSpaces = new RegExp(SPACE_CLASS, "g");
  const matches = cleaned.match(numberPattern) || [];
  const amounts: number[] = [];
  for (const raw of matches) {
    const value = parseFloat(raw.replace(stripSpaces, "").replace(",", "."));
    if (Number.isFinite(value) && value > 0) amounts.push(value);
  }
  return amounts;
}

function isAmountConsistentWithSource(claimedAmount: number, sourceText: string): boolean {
  if (!Number.isFinite(claimedAmount)) return false;
  return findAllAmountsInText(sourceText).some((a) => Math.abs(a - claimedAmount) < 0.01);
}

async function extractFromBlock(block: string, config: LocalAiConfig): Promise<LocalAiExtractedRow[]> {
  const prompt = `Wyciągnij WSZYSTKIE transakcje bankowe z poniższego tekstu (mail, wyciąg PDF lub inny
nieustrukturyzowany format). Dla każdej zwróć: name (nazwa/tytuł), amount (kwota, zawsze
dodatnia liczba), type ("income" lub "expense"), isoDate (YYYY-MM-DD lub null, jeśli brak
jawnej daty w tekście).

Tekst:
"""
${block}
"""

Zwróć WYŁĄCZNIE tablicę JSON obiektów o kluczach: name, amount, type, isoDate.
Jeśli nie znajdziesz żadnej transakcji, zwróć [].`;

  let raw: string;
  try {
    raw = await callOllama({ ...config, prompt });
  } catch (error) {
    if (error instanceof LocalAiError) throw error;
    return [];
  }

  let parsed: any;
  try {
    parsed = extractJson(raw);
  } catch {
    return [];
  }

  let rows: any[];
  if (Array.isArray(parsed)) rows = parsed;
  else if (parsed && Array.isArray(parsed.transactions)) rows = parsed.transactions;
  else if (parsed && typeof parsed === "object" && "name" in parsed) rows = [parsed];
  else rows = []; // obiekt {} bez transakcji lub kształt nie do rozpoznania

  const out: LocalAiExtractedRow[] = [];
  for (const r of rows) {
    const amount = typeof r.amount === "number" ? r.amount : parseFloat(r.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (typeof r.name !== "string" || !r.name.trim()) continue;
    const type: "income" | "expense" = r.type === "income" ? "income" : "expense";
    const fallbackCategory = type === "income" ? "Wynagrodzenie" : "Inne";
    out.push({
      name: r.name.trim(),
      amount,
      type,
      isoDate: typeof r.isoDate === "string" && r.isoDate ? r.isoDate : null,
      category: fallbackCategory,
      categoryIcon: iconByCategory[fallbackCategory] || "✨",
      amountConsistent: isAmountConsistentWithSource(amount, block)
    });
  }
  return out;
}

/**
 * Wyciąga transakcje z dowolnego tekstu (mail, PDF-copy, notatka) przez lokalny model.
 * Tekst jest dzielony na bloki po kotwicach dat przed wysyłką — jedno wywołanie modelu
 * na transakcję zamiast całości naraz, bo model gubił transakcje w gęstym tekście.
 */
export async function extractTransactionsWithLocalAi(
  text: string,
  config: LocalAiConfig
): Promise<LocalAiExtractedRow[]> {
  const blocks = splitIntoBlocks(text);
  if (blocks.length <= 1) return extractFromBlock(text, config);

  const all: LocalAiExtractedRow[] = [];
  let firstError: LocalAiError | null = null;
  for (const block of blocks) {
    try {
      all.push(...(await extractFromBlock(block, config)));
    } catch (error) {
      if (!firstError && error instanceof LocalAiError) firstError = error;
    }
  }
  if (all.length === 0 && firstError) throw firstError;
  return all;
}
