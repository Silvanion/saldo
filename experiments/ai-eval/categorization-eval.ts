/**
 * Rozstrzyga, czy lokalne AI kategoryzuje lepiej niż reguły.
 *
 * Użycie:
 *   npx tsx experiments/ai-eval/categorization-eval.ts [model] [--batch=20]
 *
 * Wymaga:
 *   - uruchomionej Ollamy (ollama serve)
 *   - pobranego modelu (ollama pull qwen2.5:7b)
 *   - wypełnionego experiments/ai-eval/data/descriptors.csv
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { autoCategorizeTransaction } from "../../src/utils/categories";
import { callOllama, extractJson, checkOllamaAvailable } from "./lib/ollama";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(HERE, "data/descriptors.csv");
const DATA_EXAMPLE_PATH = join(HERE, "data/descriptors.csv.example");
const REPORT_PATH = join(HERE, "data/categorization-report.md");

const ALLOWED_CATEGORIES = [
  "Żywność", "Dom i rachunki", "Transport", "Zdrowie", "Rozrywka",
  "Kredyt konsumencki", "Raty", "Kredyt hipoteczny", "Spłata karty kredytowej",
  "Wynagrodzenie", "Premia", "Działalność", "Zwrot", "Inne"
];

interface Row {
  descriptor: string;
  expected: string;
}

function parseCsv(path: string): Row[] {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    console.error(
      `Brak pliku ${path}.\n` +
      `Skopiuj szablon: cp ${DATA_EXAMPLE_PATH} ${path}\n` +
      `i wklej tam prawdziwe deskryptory (descriptors.csv jest w .gitignore).`
    );
    process.exit(1);
  }
  const lines = text.split(/\r?\n/).slice(1); // pomiń nagłówek
  const rows: Row[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.lastIndexOf(",");
    if (idx === -1) continue;
    const descriptor = trimmed.slice(0, idx).trim();
    const expected = trimmed.slice(idx + 1).trim();
    if (!descriptor || !expected) continue;
    rows.push({ descriptor, expected });
  }
  return rows;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function categorizeWithOllama(model: string, descriptors: string[], batchSize: number): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const batches = chunk(descriptors, batchSize);

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    process.stdout.write(`  Ollama: partia ${b + 1}/${batches.length} (${batch.length} pozycji)...\n`);

    const numbered = batch.map((d, i) => `${i}: ${d}`).join("\n");
    const prompt = `Skategoryzuj każdy opis transakcji bankowej do JEDNEJ z dozwolonych kategorii.
Dozwolone kategorie (użyj DOKŁADNIE tej pisowni): ${ALLOWED_CATEGORIES.join(", ")}

Opisy indeksowane od 0:
${numbered}

Zwróć JSON w formacie {"categories": ["kategoria dla 0", "kategoria dla 1", ...]}.
Tablica musi mieć dokładnie ${batch.length} elementów, w tej samej kolejności co opisy.`;

    try {
      const raw = await callOllama({ model, prompt, format: "json", temperature: 0 });
      const parsed = extractJson(raw);
      // Model bywa niekonsekwentny w kształcie odpowiedzi mimo instrukcji — akceptujemy
      // zarówno {"categories": [...]}, jak i gołą tablicę.
      const list: unknown = Array.isArray(parsed) ? parsed : parsed?.categories;
      if (!Array.isArray(list) || list.length !== batch.length) {
        throw new Error(`Model zwrócił ${Array.isArray(list) ? list.length : typeof list} elementów, oczekiwano ${batch.length}`);
      }
      batch.forEach((d, i) => results.set(d, String(list[i]).trim()));
    } catch (e: any) {
      console.error(`  ⚠ Partia ${b + 1} nie powiodła się: ${e.message}. Oznaczam jako błąd.`);
      batch.forEach((d) => results.set(d, "__ERROR__"));
    }
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const model = args.find((a) => !a.startsWith("--")) || "qwen2.5:7b";
  const batchArg = args.find((a) => a.startsWith("--batch="));
  const batchSize = batchArg ? parseInt(batchArg.split("=")[1], 10) : 20;

  console.log(`Model: ${model} | rozmiar partii: ${batchSize}\n`);

  const rows = parseCsv(DATA_PATH);
  if (rows.length === 0) {
    console.error(`Brak danych w ${DATA_PATH}.\nWklej prawdziwe deskryptory i uruchom ponownie.`);
    process.exit(1);
  }
  console.log(`Wczytano ${rows.length} zaetykietowanych deskryptorów.\n`);
  if (rows.length < 20) {
    console.log(`⚠ Mało próbek (${rows.length}). Wynik przy tak małej liczbie jest przypadkowy — dołóż więcej deskryptorów, zanim potraktujesz procenty poważnie.\n`);
  }

  const availability = await checkOllamaAvailable(model);
  if (!availability.ok) {
    console.error(`Ollama niedostępna: ${availability.reason}`);
    process.exit(1);
  }

  // --- Wariant 1: obecne reguły aplikacji (bez żadnych reguł użytkownika — czysty "zimny start") ---
  const ruleResults = rows.map((r) => ({
    ...r,
    got: autoCategorizeTransaction(r.descriptor, [], "Inne").category
  }));
  const ruleCorrect = ruleResults.filter((r) => r.got === r.expected).length;

  // --- Wariant 2: model lokalny ---
  console.log("Odpytuję Ollama...");
  const ollamaMap = await categorizeWithOllama(model, rows.map((r) => r.descriptor), batchSize);
  const ollamaResults = rows.map((r) => ({ ...r, got: ollamaMap.get(r.descriptor) || "__MISSING__" }));
  const ollamaCorrect = ollamaResults.filter((r) => r.got === r.expected).length;
  const ollamaErrors = ollamaResults.filter((r) => r.got === "__ERROR__" || r.got === "__MISSING__").length;

  // --- Raport ---
  const ruleAcc = ((ruleCorrect / rows.length) * 100).toFixed(1);
  const ollamaAcc = ((ollamaCorrect / rows.length) * 100).toFixed(1);

  console.log("\n===== WYNIK =====");
  console.log(`Reguły aplikacji (zimny start, 0 reguł użytkownika): ${ruleCorrect}/${rows.length} (${ruleAcc}%)`);
  console.log(`${model}: ${ollamaCorrect}/${rows.length} (${ollamaAcc}%)${ollamaErrors ? ` — ${ollamaErrors} błędów odpowiedzi modelu` : ""}`);

  const mismatches = rows.map((r, i) => ({
    descriptor: r.descriptor,
    expected: r.expected,
    rules: ruleResults[i].got,
    ollama: ollamaResults[i].got
  })).filter((r) => r.rules !== r.expected || r.ollama !== r.expected);

  const reportLines = [
    "# Wynik ewaluacji kategoryzacji",
    "",
    `Model: \`${model}\` | Próbek: ${rows.length}`,
    "",
    "| Wariant | Trafienia | Dokładność |",
    "|---|---|---|",
    `| Reguły aplikacji (0 reguł użytkownika) | ${ruleCorrect}/${rows.length} | ${ruleAcc}% |`,
    `| ${model} | ${ollamaCorrect}/${rows.length} | ${ollamaAcc}% |`,
    "",
    "## Rozbieżności (gdzie przynajmniej jeden wariant się mylił)",
    "",
    "| Deskryptor | Oczekiwane | Reguły | Ollama |",
    "|---|---|---|---|",
    ...mismatches.map((m) => `| ${m.descriptor.replace(/\|/g, "\\|")} | ${m.expected} | ${m.rules} | ${m.ollama} |`)
  ];
  writeFileSync(REPORT_PATH, reportLines.join("\n"));
  console.log(`\nSzczegółowy raport: ${REPORT_PATH}`);

  const delta = Number(ollamaAcc) - Number(ruleAcc);
  console.log(`\nRóżnica: ${delta > 0 ? "+" : ""}${delta.toFixed(1)} pkt proc. na korzyść ${delta >= 0 ? "modelu" : "reguł"}.`);
  if (delta < 10) {
    console.log("Wniosek: różnica jest za mała, żeby uzasadnić koszt (Ollama, model, brak mobile). Reguły + normalizacja deskryptorów prawdopodobnie wystarczą.");
  } else {
    console.log("Wniosek: model wyraźnie wygrywa na zimnym starcie. Warto ocenić, czy przewaga utrzymuje się po dodaniu kilkunastu reguł użytkownika.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
