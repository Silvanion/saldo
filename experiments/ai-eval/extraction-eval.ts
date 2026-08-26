/**
 * Rozstrzyga, czy lokalne AI wyciąga transakcje z nieustrukturyzowanego tekstu
 * (mail bankowy, tekst skopiowany z PDF), którego parseStatementText nie ugryzie.
 *
 * Sam nie wie, ile transakcji "powinno" wyjść z próbki — to Ty oceniasz wynik
 * wzrokowo z raportu. Tu liczy się jakościowe porównanie, nie automatyczny wynik %.
 *
 * Każdy wiersz jest oznaczony ✓/⚠ względem isAmountConsistentWithSource — czy kwota
 * faktycznie występuje w tekście źródłowym. To wyłapuje realnie zaobserwowany błąd
 * modelu: "7 200,00" odczytane jako 720 (zgubiona cyfra przy spacji jako separatorze
 * tysięcy). ⚠ nie zawsze znaczy błąd (kwota mogła być zaokrąglona/przeliczona), ale
 * zasługuje na ręczne sprawdzenie.
 *
 * Użycie:
 *   npx tsx experiments/ai-eval/extraction-eval.ts [model] [--chunk]
 *
 * --chunk dzieli tekst na bloki (puste linie) i wysyła każdy osobno zamiast całości
 * za jednym razem — test na to, czy to poprawia odzysk przy tekstach z wieloma
 * transakcjami (obserwowany błąd: model wyciągał tylko 1 z 4 w gęstym tekście).
 *
 * Wymaga:
 *   - uruchomionej Ollamy (ollama serve)
 *   - pobranego modelu (ollama pull qwen2.5:7b)
 *   - prawdziwych próbek w experiments/ai-eval/data/unstructured-samples/*.txt
 *     (patrz README.md w tym katalogu — pliki .example są tylko placeholderami)
 */
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parseStatementText } from "../../src/services/localParsers";
import { callOllama, extractJson, checkOllamaAvailable } from "./lib/ollama";
import { isAmountConsistentWithSource } from "./lib/amountCheck";

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = join(HERE, "data/unstructured-samples");

function reportPath(useChunk: boolean): string {
  return join(HERE, `data/extraction-report${useChunk ? "-chunk" : ""}.md`);
}

interface ExtractedRow {
  name: string;
  amount: number;
  type: "income" | "expense";
  isoDate: string;
}

async function extractWithOllama(model: string, text: string): Promise<ExtractedRow[] | { error: string }> {
  const prompt = `Wyciągnij WSZYSTKIE transakcje bankowe z poniższego tekstu (mail, wyciąg PDF lub inny nieustrukturyzowany format).
Dla każdej zwróć: name (nazwa/tytuł), amount (kwota, zawsze dodatnia liczba), type ("income" lub "expense"), isoDate (YYYY-MM-DD).
Jeśli w tekście nie ma jawnej daty, użyj null dla isoDate.

Tekst:
"""
${text}
"""

Zwróć WYŁĄCZNIE tablicę JSON obiektów o kluczach: name, amount, type, isoDate.
Jeśli nie znajdziesz żadnej transakcji, zwróć [].`;

  try {
    const raw = await callOllama({ model, prompt, format: "json", temperature: 0 });
    const parsed = extractJson(raw);
    // Model bywa niekonsekwentny: przy jednej transakcji potrafi zwrócić goły obiekt
    // zamiast tablicy jednoelementowej, mimo wyraźnej instrukcji. Normalizujemy oba przypadki.
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.transactions)) return parsed.transactions;
    if (parsed && typeof parsed === "object" && "name" in parsed) return [parsed];
    // Pusty obiekt {} bywa sposobem modelu na powiedzenie "nic nie znalazłem".
    if (parsed && typeof parsed === "object" && Object.keys(parsed).length === 0) return [];
    throw new Error(`Odpowiedź nie jest tablicą transakcji (otrzymano: ${typeof parsed})`);
  } catch (e: any) {
    return { error: e.message };
  }
}

const DATE_LINE = /^\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4})\b/;

/**
 * Dzieli tekst na bloki po wierszach zaczynających się datą — jeden taki wiersz zaczyna
 * nową transakcję, kolejne (niedatujące) wiersze do niego dołączają. Obsługuje zarówno
 * "01.08.2026\nWynagrodzenie\n+7200,00" (data w osobnym wierszu, bloki rozdzielone pustą
 * linią) jak i "01.08.2026 Wynagrodzenie +7200,00" (cała transakcja w jednym gęstym
 * wierszu) — oba realne formaty PDF-copy nie mają wspólnej cechy poza tym, że każda
 * transakcja zaczyna się datą.
 */
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
  // Fallback dla tekstu bez wierszy zaczynających się datą (np. maila z pojedynczą
  // transakcją, gdzie data jest w środku zdania) — bloki po pustych liniach.
  return text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
}

async function extractChunked(model: string, text: string): Promise<ExtractedRow[] | { error: string }> {
  const blocks = splitIntoBlocks(text);
  if (blocks.length <= 1) return extractWithOllama(model, text);

  const all: ExtractedRow[] = [];
  const errors: string[] = [];
  for (const block of blocks) {
    const result = await extractWithOllama(model, block);
    if ("error" in result) errors.push(result.error);
    else all.push(...result);
  }
  if (all.length === 0 && errors.length > 0) return { error: errors.join("; ") };
  return all;
}

function formatRows(rows: ExtractedRow[] | { error: string }, sourceText: string): string {
  if ("error" in rows) return `⚠ BŁĄD: ${rows.error}`;
  if (rows.length === 0) return "(brak transakcji)";
  return rows
    .map((r) => {
      const consistent = isAmountConsistentWithSource(r.amount, sourceText);
      const mark = consistent ? "✓" : "⚠ KWOTA NIE ZGADZA SIĘ ZE ŹRÓDŁEM";
      return `  - ${r.name} | ${r.amount} | ${r.type} | ${r.isoDate ?? "?"} ${mark}`;
    })
    .join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const model = args.find((a) => !a.startsWith("--")) || "qwen2.5:7b";
  const useChunk = args.includes("--chunk");
  console.log(`Model: ${model} | tryb: ${useChunk ? "fragmentowany (po pustych liniach)" : "cały tekst naraz"}\n`);

  const availability = await checkOllamaAvailable(model);
  if (!availability.ok) {
    console.error(`Ollama niedostępna: ${availability.reason}`);
    process.exit(1);
  }

  const files = readdirSync(SAMPLES_DIR).filter((f) => f.endsWith(".txt") && !f.endsWith(".txt.example"));
  if (files.length === 0) {
    console.error(
      `Brak próbek .txt w ${SAMPLES_DIR}.\n` +
      `Skopiuj każdy plik *.txt.example do *.txt (bez .example — te są w .gitignore)\n` +
      `i wklej prawdziwą treść, np.: cp email-1.txt.example email-1.txt`
    );
    process.exit(1);
  }
  console.log(`Znaleziono ${files.length} próbek.\n`);

  const reportSections: string[] = ["# Wynik ewaluacji ekstrakcji z tekstu nieustrukturyzowanego", "", `Model: \`${model}\``, ""];

  for (const file of files) {
    const text = readFileSync(join(SAMPLES_DIR, file), "utf8");
    console.log(`=== ${file} ===`);

    const ruleRows = parseStatementText(text);
    console.log(`Reguły (parseStatementText):\n${ruleRows.length === 0 ? "  (brak — spodziewane, format nie jest tabelaryczny)" : ruleRows.map((r) => `  - ${r.name} | ${r.amount} | ${r.type} | ${r.isoDate}`).join("\n")}`);

    console.log(`\nOllama (${model}):`);
    const ollamaRows = useChunk ? await extractChunked(model, text) : await extractWithOllama(model, text);
    console.log(formatRows(ollamaRows, text));
    console.log("");

    reportSections.push(
      `## ${file}`,
      "",
      "**Reguły (parseStatementText):**",
      "```",
      ruleRows.length === 0 ? "(brak)" : ruleRows.map((r) => `${r.name} | ${r.amount} | ${r.type} | ${r.isoDate}`).join("\n"),
      "```",
      "",
      `**${model} [${useChunk ? "fragmentowany" : "cały tekst"}]:**`,
      "```",
      formatRows(ollamaRows, text),
      "```",
      ""
    );
  }

  const outPath = reportPath(useChunk);
  writeFileSync(outPath, reportSections.join("\n"));
  console.log(`Szczegółowy raport: ${outPath}`);
  console.log("\nOceń ręcznie: czy Ollama poprawnie wyciągnęła to, czego reguły nie potrafiły? To jest test, w którym spodziewam się przewagi modelu.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
