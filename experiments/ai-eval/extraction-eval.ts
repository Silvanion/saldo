/**
 * Rozstrzyga, czy lokalne AI wyciąga transakcje z nieustrukturyzowanego tekstu
 * (mail bankowy, tekst skopiowany z PDF), którego parseStatementText nie ugryzie.
 *
 * Sam nie wie, ile transakcji "powinno" wyjść z próbki — to Ty oceniasz wynik
 * wzrokowo z raportu. Tu liczy się jakościowe porównanie, nie automatyczny wynik %.
 *
 * Użycie:
 *   npx tsx experiments/ai-eval/extraction-eval.ts [model]
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

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = join(HERE, "data/unstructured-samples");
const REPORT_PATH = join(HERE, "data/extraction-report.md");

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

function formatRows(rows: ExtractedRow[] | { error: string }): string {
  if ("error" in rows) return `⚠ BŁĄD: ${rows.error}`;
  if (rows.length === 0) return "(brak transakcji)";
  return rows.map((r) => `  - ${r.name} | ${r.amount} | ${r.type} | ${r.isoDate ?? "?"}`).join("\n");
}

async function main() {
  const model = process.argv[2] || "qwen2.5:7b";
  console.log(`Model: ${model}\n`);

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
    const ollamaRows = await extractWithOllama(model, text);
    console.log(formatRows(ollamaRows));
    console.log("");

    reportSections.push(
      `## ${file}`,
      "",
      "**Reguły (parseStatementText):**",
      "```",
      ruleRows.length === 0 ? "(brak)" : ruleRows.map((r) => `${r.name} | ${r.amount} | ${r.type} | ${r.isoDate}`).join("\n"),
      "```",
      "",
      `**${model}:**`,
      "```",
      formatRows(ollamaRows),
      "```",
      ""
    );
  }

  writeFileSync(REPORT_PATH, reportSections.join("\n"));
  console.log(`Szczegółowy raport: ${REPORT_PATH}`);
  console.log("\nOceń ręcznie: czy Ollama poprawnie wyciągnęła to, czego reguły nie potrafiły? To jest test, w którym spodziewam się przewagi modelu.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
