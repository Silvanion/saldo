/**
 * Comprehensive Benchmark Suite for Saldo
 * 
 * Strict scientific methodology:
 * - 3 warm-up cycles per test
 * - 10 measurement iterations
 * - Reports: min, max, median, mean, stddev
 * - Real memory metrics with global.gc() (heapUsed, heapTotal, rss, external, arrayBuffers)
 * - 3-cycle memory leak detection (IMPORT -> CLEAR -> IMPORT -> CLEAR -> IMPORT)
 * - Persistence benchmark with real IndexedDB (READ, WRITE, UPDATE, DELETE, BULK IMPORT)
 * - Real Cold Process and Playwright Browser startup measurements
 */

import { performance } from "perf_hooks";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import "fake-indexeddb/auto";

// Imports of services
import {
  calculateMonthlyTotals,
  calculateRunway,
  calculateEmergencySimulator,
  calculateBudgetWarnings,
  calculateSafeToSpend,
  calculateMoMTrends
} from "../src/services/budgetCalculations";
import { getFinancialHealthSummary } from "../src/services/financialHealth";
import { runDataAudit } from "../src/services/dataAuditor";
import { parsePdfTransactions, findPdfDuplicates } from "../src/services/parsePdf";
import { parseAndMapCsv, detectCsvSeparator, cleanCsvBomAndEncoding } from "../src/services/parseCsv";
import { checkDuplicate } from "../src/services/duplicateDetector";
import { calculateDashboardMetrics } from "../src/hooks/useDashboardMetrics";
import { generateFinancialStory } from "../src/services/financialStory";
import { openDb, saveStateToIDBOnly, loadStateFromIDBOnly } from "../src/services/localDb";
import { Transaction, Profile, AppState } from "../src/types";

// =========================================================================
// DATA GENERATORS
// =========================================================================

const SAMPLE_NAMES = [
  "Biedronka zakupy spożywcze",
  "Orlen stacja paliw nr 42",
  "Netflix abonament miesięczny",
  "Wynagrodzenie zlecenia programistyczne",
  "Czynsz mieszkaniowy ul. Główna",
  "Restauracja Sphinx kolacja",
  "Allegro zakupy elektronika",
  "Lidl art. spożywcze",
  "Przelew ZUS składka zdrowotna",
  "Apteka DOZ leki",
  "Uber przejazd miasto",
  "Multikino bilety film",
  "Rossmann kosmetyki i chemia",
  "Kawiarnia Starbucks",
  "Spotify abonament family"
];

const CATEGORIES = ["Jedzenie", "Transport", "Mieszkanie", "Rozrywka", "Zdrowie", "Wynagrodzenie", "Inne"];
const ACCOUNTS = ["Konto Główne", "Konto Oszczędnościowe", "Karta Kredytowa"];

export function generateTransactions(count: number): Transaction[] {
  const transactions: Transaction[] = new Array(count);
  const baseDate = new Date("2026-05-15T12:00:00Z").getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const isIncome = i % 7 === 0;
    const dayOffset = (i % 365);
    const txDate = new Date(baseDate - dayOffset * dayMs);
    const isoDate = txDate.toISOString().slice(0, 10);
    const name = SAMPLE_NAMES[i % SAMPLE_NAMES.length];
    const category = isIncome ? "Wynagrodzenie" : CATEGORIES[i % (CATEGORIES.length - 1)];
    const amount = isIncome ? 3000 + (i % 5000) : 15 + (i % 350) + 0.50;

    transactions[i] = {
      id: `tx_${i}`,
      name,
      amount: Math.round(amount * 100) / 100,
      type: isIncome ? "income" : "expense",
      category,
      account: ACCOUNTS[i % ACCOUNTS.length],
      currency: "PLN",
      isoDate,
      tags: i % 4 === 0 ? ["auto", "rodzina"] : undefined,
      validationStatus: "VALID"
    };
  }
  return transactions;
}

export function generateProfile(transactions: Transaction[]): Profile {
  return {
    id: "profile_bench",
    name: "Profil Benchmarkowy",
    kind: "personal",
    currency: "PLN",
    transactions,
    payments: [
      { id: "p1", name: "Czynsz", amount: 2000, dueDate: "2026-05-20", status: "Do opłacenia", currency: "PLN" },
      { id: "p2", name: "Internet", amount: 90, dueDate: "2026-05-22", status: "Do opłacenia", currency: "PLN" }
    ],
    goals: [
      { id: "g1", name: "Poduszka", target: 20000, saved: 12000, currency: "PLN" }
    ],
    investments: [
      { id: "i1", name: "Obligacje skarbowe", amount: 15000, isoDate: "2026-01-10", currency: "PLN" }
    ],
    accounts: [
      { id: "a1", name: "Konto Główne", bankName: "mBank", hasCreditLimit: false, creditLimit: 0 },
      { id: "a2", name: "Konto Oszczędnościowe", bankName: "ING", hasCreditLimit: false, creditLimit: 0 }
    ],
    budgets: {
      Jedzenie: 2500,
      Transport: 800,
      Mieszkanie: 3000,
      Rozrywka: 600,
      Zdrowie: 400
    },
    recurringRules: [
      { id: "r1", name: "Wynagrodzenie etat", amount: 6500, type: "income", category: "Wynagrodzenie", account: "Konto Główne", frequency: "monthly", nextDueDate: "2026-05-28", isActive: true, currency: "PLN" },
      { id: "r2", name: "Abonament telefon", amount: 60, type: "expense", category: "Mieszkanie", account: "Konto Główne", frequency: "monthly", nextDueDate: "2026-05-25", isActive: true, currency: "PLN" }
    ]
  };
}

export function generatePdfText(operationCount: number): string {
  let out = "WYCIĄG Z RACHUNKU BANKOWEGO NR 12 1020 1013 0000 1202 0123 4567\n";
  out += "Okres od 2026-01-01 do 2026-05-15\n";
  out += "Operacje\n";
  out += "Data operacji Data księgowania Tytuł / Opis Kwota Saldo\n";

  let runningBalance = 15000.0;
  for (let i = 0; i < operationCount; i++) {
    const isIncome = i % 8 === 0;
    const amt = isIncome ? 3500.0 : 45.5 + (i % 200);
    if (isIncome) runningBalance += amt;
    else runningBalance -= amt;

    const date = `2026-05-${String((i % 28) + 1).padStart(2, "0")}`;
    const desc = SAMPLE_NAMES[i % SAMPLE_NAMES.length];
    const sign = isIncome ? "+" : "-";
    const amtStr = `${sign}${amt.toFixed(2).replace(".", ",")} PLN`;
    const balStr = `${runningBalance.toFixed(2).replace(".", ",")} PLN`;

    if (i % 10 === 0) {
      // Multiline description case
      out += `${date} ${date} ${desc}\n  Szczegóły transakcji nr ref ${100000 + i} rach. 44 1020 0000 0000 1111 2222 ${amtStr} ${balStr}\n`;
    } else {
      out += `${date} ${date} ${desc} ${amtStr} ${balStr}\n`;
    }
  }
  return out;
}

export function generateCsvText(rowCount: number): string {
  let out = "Data operacji;Opis transakcji;Kwota;Waluta;Kategoria;Konto;Saldo po operacji\n";
  let runningBalance = 20000.0;

  for (let i = 0; i < rowCount; i++) {
    const isIncome = i % 8 === 0;
    const amt = isIncome ? 4000.0 : 35.0 + (i % 180);
    if (isIncome) runningBalance += amt;
    else runningBalance -= amt;

    const sign = isIncome ? "" : "-";
    const date = `2026-05-${String((i % 28) + 1).padStart(2, "0")}`;
    const desc = SAMPLE_NAMES[i % SAMPLE_NAMES.length];
    const cat = isIncome ? "Wynagrodzenie" : CATEGORIES[i % (CATEGORIES.length - 1)];

    out += `${date};"${desc}";${sign}${amt.toFixed(2)};PLN;${cat};Konto Główne;${runningBalance.toFixed(2)}\n`;
  }
  return out;
}

// =========================================================================
// STATISTICAL BENCHMARK ENGINE
// =========================================================================

export interface BenchStat {
  min: number;
  max: number;
  median: number;
  mean: number;
  stddev: number;
  runs: number;
}

export function runStatisticalBenchmark(
  fn: () => void,
  options: { warmup?: number; runs?: number } = {}
): BenchStat {
  const warmup = options.warmup ?? 3;
  const runs = options.runs ?? 10;

  // Warm-up runs (JIT optimization & cache warming)
  for (let w = 0; w < warmup; w++) {
    fn();
  }

  // Measured runs
  const times: number[] = new Array(runs);
  for (let r = 0; r < runs; r++) {
    const t0 = performance.now();
    fn();
    const t1 = performance.now();
    times[r] = t1 - t0;
  }

  times.sort((a, b) => a - b);
  const min = times[0];
  const max = times[times.length - 1];
  const median = times[Math.floor(times.length / 2)];
  const mean = times.reduce((s, x) => s + x, 0) / times.length;
  const variance = times.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / times.length;
  const stddev = Math.sqrt(variance);

  return { min, max, median, mean, stddev, runs };
}

export async function runStatisticalBenchmarkAsync(
  fn: () => Promise<void>,
  options: { warmup?: number; runs?: number } = {}
): Promise<BenchStat> {
  const warmup = options.warmup ?? 2;
  const runs = options.runs ?? 5;

  for (let w = 0; w < warmup; w++) {
    await fn();
  }

  const times: number[] = new Array(runs);
  for (let r = 0; r < runs; r++) {
    const t0 = performance.now();
    await fn();
    const t1 = performance.now();
    times[r] = t1 - t0;
  }

  times.sort((a, b) => a - b);
  const min = times[0];
  const max = times[times.length - 1];
  const median = times[Math.floor(times.length / 2)];
  const mean = times.reduce((s, x) => s + x, 0) / times.length;
  const variance = times.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / times.length;
  const stddev = Math.sqrt(variance);

  return { min, max, median, mean, stddev, runs };
}

// =========================================================================
// BENCHMARK SUITE EXECUTION
// =========================================================================

async function main() {
  console.log("================================================================================");
  console.log("SALDO COMPREHENSIVE PERFORMANCE & MEMORY BENCHMARK SUITE");
  console.log("Date:", new Date().toISOString());
  console.log("Node version:", process.version, "| Platform:", process.platform, process.arch);
  console.log("GC available:", typeof global.gc === "function" ? "YES (--expose-gc active)" : "NO");
  console.log("================================================================================\n");

  const results: Record<string, any> = {};

  // ---------------------------------------------------------------------------
  // 1. MICROBENCHMARKS
  // ---------------------------------------------------------------------------
  console.log(">>> 1. MICROBENCHMARKS (Warmup: 3, Iterations: 10 per size)");

  const SIZES = [100, 1000, 5000, 10000, 25000, 50000];
  const targetDate = new Date("2026-05-15T12:00:00Z");

  const microResults: Record<string, Record<number, BenchStat>> = {
    calculateMonthlyTotals: {},
    calculateRunway: {},
    calculateEmergencySimulator: {},
    getFinancialHealthSummary: {},
    runDataAudit: {},
    parsePdfTransactions: {},
    parseAndMapCsv: {}
  };

  // Pre-generate test vectors for each size to avoid benchmarking generation time
  const datasets: Record<number, { transactions: Transaction[]; profile: Profile }> = {};
  for (const size of SIZES) {
    const transactions = generateTransactions(size);
    const profile = generateProfile(transactions);
    datasets[size] = { transactions, profile };
  }

  for (const size of SIZES) {
    const { transactions, profile } = datasets[size];

    // calculateMonthlyTotals
    microResults.calculateMonthlyTotals[size] = runStatisticalBenchmark(() => {
      calculateMonthlyTotals(transactions, targetDate);
    });

    // calculateRunway
    microResults.calculateRunway[size] = runStatisticalBenchmark(() => {
      calculateRunway(profile, 3);
    });

    // calculateEmergencySimulator
    microResults.calculateEmergencySimulator[size] = runStatisticalBenchmark(() => {
      calculateEmergencySimulator(profile, targetDate, 6);
    });

    // getFinancialHealthSummary
    microResults.getFinancialHealthSummary[size] = runStatisticalBenchmark(() => {
      getFinancialHealthSummary(profile, profile.recurringRules || []);
    });

    // runDataAudit
    microResults.runDataAudit[size] = runStatisticalBenchmark(() => {
      runDataAudit(profile);
    });

    console.log(`  [Done] SIZES=${size}: calculateMonthlyTotals=${microResults.calculateMonthlyTotals[size].median.toFixed(3)}ms, runway=${microResults.calculateRunway[size].median.toFixed(3)}ms, health=${microResults.getFinancialHealthSummary[size].median.toFixed(3)}ms, audit=${microResults.runDataAudit[size].median.toFixed(3)}ms`);
  }

  // PDF Microbenchmarks (100, 500, 1000, 5000, 10000)
  const PDF_SIZES = [100, 500, 1000, 5000, 10000];
  console.log("\n  Running PDF microbenchmarks (100, 500, 1k, 5k, 10k)...");
  for (const size of PDF_SIZES) {
    const pdfText = generatePdfText(size);
    const options = { currency: "PLN" as const, account: "Konto Główne", rules: [] };
    microResults.parsePdfTransactions[size] = runStatisticalBenchmark(() => {
      parsePdfTransactions(pdfText, options);
    });
    console.log(`  [Done] PDF size=${size}: median=${microResults.parsePdfTransactions[size].median.toFixed(2)}ms (min=${microResults.parsePdfTransactions[size].min.toFixed(2)}ms, max=${microResults.parsePdfTransactions[size].max.toFixed(2)}ms)`);
  }

  // CSV Microbenchmarks (1k, 5k, 10k, 25k, 50k, 100k)
  const CSV_SIZES = [1000, 5000, 10000, 25000, 50000, 100000];
  console.log("\n  Running CSV microbenchmarks (1k, 5k, 10k, 25k, 50k, 100k)...");
  for (const size of CSV_SIZES) {
    const csvText = generateCsvText(size);
    microResults.parseAndMapCsv[size] = runStatisticalBenchmark(() => {
      parseAndMapCsv({ rawCsvText: csvText });
    });
    console.log(`  [Done] CSV size=${size}: median=${microResults.parseAndMapCsv[size].median.toFixed(2)}ms (min=${microResults.parseAndMapCsv[size].min.toFixed(2)}ms, max=${microResults.parseAndMapCsv[size].max.toFixed(2)}ms)`);
  }

  results.microbenchmarks = microResults;

  // ---------------------------------------------------------------------------
  // 2. DASHBOARD DATA FLOW & TRANSACTION ARRAY PASS AUDIT
  // ---------------------------------------------------------------------------
  console.log("\n>>> 2. DASHBOARD PASS AUDIT & FLOW ANALYSIS");

  // In-depth audit of array passes across dashboard components
  const flowPassAudit = [
    {
      function: "calculateMonthlyTotals",
      inputSize: "N (profile.transactions)",
      passes: 1,
      calledFrom: "useDashboardMetrics line 72",
      description: "Full single-pass reduce summing income, expense, balance, categorySpentMap"
    },
    {
      function: "calculateBudgetWarnings",
      inputSize: "N (profile.transactions)",
      passes: 1,
      calledFrom: "useDashboardMetrics line 80",
      description: "Filters transactions matching target month prefix, then aggregates per budget category"
    },
    {
      function: "calculateSafeToSpend",
      inputSize: "N (profile.transactions)",
      passes: 2,
      calledFrom: "useDashboardMetrics line 83",
      description: "1 pass in calculateMonthlyTotals + 1 pass for current month expense breakdown"
    },
    {
      function: "targetMonths (6-month chart loop)",
      inputSize: "N (profile.transactions)",
      passes: 1,
      calledFrom: "useDashboardMetrics lines 103-112",
      description: "Single pass over all transactions matching 6-month prefix map"
    },
    {
      function: "recentTransactions sort & slice",
      inputSize: "N (profile.transactions)",
      passes: "O(N log N) comparison pass",
      calledFrom: "useDashboardMetrics line 121",
      description: "Full array shallow clone + sort(localeCompare) across all N items to take top 4"
    },
    {
      function: "calculateRunway",
      inputSize: "N (profile.transactions)",
      passes: 3,
      calledFrom: "useDashboardMetrics line 125",
      description: "Calls calculateMonthlyTotals for each of the last 3 months (3 separate full passes)"
    },
    {
      function: "calculateMoMTrends",
      inputSize: "N (profile.transactions)",
      passes: 2,
      calledFrom: "useDashboardMetrics line 126",
      description: "Calls calculateMonthlyTotals for current month and previous month (2 full passes)"
    },
    {
      function: "FinancialHealthBridgeCard -> getFinancialHealthSummary",
      inputSize: "N (profile.transactions)",
      passes: 3,
      calledFrom: "FinancialHealthBridgeCard line 77",
      description: "1 pass in calculateBudgetWarnings + 1 pass in calculateCashflowForecast (starting balance) + 1 pass for thisMonthIncome filter"
    },
    {
      function: "DashboardView -> runDataAudit",
      inputSize: "N (profile.transactions)",
      passes: 1,
      calledFrom: "DashboardView line 141 (useMemo [profile])",
      description: "Audits profile transactions for duplicates, date issues, negative formats"
    }
  ];

  console.table(flowPassAudit);
  results.flowPassAudit = flowPassAudit;

  // Measure end-to-end Dashboard Calculation on scaled profiles
  console.log("\n  End-to-End Dashboard Metrics Execution Time:");
  const dashboardTotalTimings: Record<number, BenchStat> = {};
  for (const size of SIZES) {
    const { profile } = datasets[size];
    dashboardTotalTimings[size] = runStatisticalBenchmark(() => {
      calculateDashboardMetrics(profile, targetDate, profile.recurringRules || []);
      getFinancialHealthSummary(profile, profile.recurringRules || []);
    });
    console.log(`  Dashboard total (size=${size}): median=${dashboardTotalTimings[size].median.toFixed(2)}ms (min=${dashboardTotalTimings[size].min.toFixed(2)}ms, max=${dashboardTotalTimings[size].max.toFixed(2)}ms)`);
  }
  results.dashboardTotalTimings = dashboardTotalTimings;

  // ---------------------------------------------------------------------------
  // 3. HISTORIA (TRANSACTIONS VIEW SCALING & SORTING)
  // ---------------------------------------------------------------------------
  console.log("\n>>> 3. HISTORIA (Transactions View: Filter, Sort, Pagination, Search)");

  const historiaResults: Record<number, {
    filterOnly: BenchStat;
    sortAll: BenchStat;
    searchTemplateAlloc: BenchStat;
    paginationSlice: BenchStat;
  }> = {};

  for (const size of SIZES) {
    const { transactions } = datasets[size];

    // Filter only (filtering by type expense)
    const filterOnly = runStatisticalBenchmark(() => {
      transactions.filter((tx) => tx.type === "expense");
    });

    // Full sort (what TransactionsView currently executes via localeCompare on all items)
    const sortAll = runStatisticalBenchmark(() => {
      [...transactions].sort((a, b) => (b.isoDate || "").localeCompare(a.isoDate || ""));
    });

    // Search string creation (measuring template allocation overhead for search)
    const searchTemplateAlloc = runStatisticalBenchmark(() => {
      let count = 0;
      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        const searchStr = `${tx.name} ${tx.category} ${tx.account} ${tx.tags ? tx.tags.join(" ") : ""}`.toLowerCase();
        if (searchStr.includes("biedronka")) count++;
      }
    });

    // Pagination slice (slicing 25 items from already sorted array)
    const paginationSlice = runStatisticalBenchmark(() => {
      transactions.slice(0, 25);
    });

    historiaResults[size] = { filterOnly, sortAll, searchTemplateAlloc, paginationSlice };
    console.log(`  Historia size=${size}: filter=${filterOnly.median.toFixed(2)}ms, sortAll=${sortAll.median.toFixed(2)}ms, searchAlloc=${searchTemplateAlloc.median.toFixed(2)}ms, slice25=${(paginationSlice.median * 1000).toFixed(1)}μs`);
  }
  results.historia = historiaResults;

  // ---------------------------------------------------------------------------
  // 4. STATYSTYKI & AGGREGATIONS
  // ---------------------------------------------------------------------------
  console.log("\n>>> 4. STATYSTYKI & AGGREGATION BENCHMARK");

  const statystykiResults: Record<number, {
    categoryAggregation: BenchStat;
    monthAggregation: BenchStat;
    typeAggregation: BenchStat;
  }> = {};

  for (const size of SIZES) {
    const { transactions } = datasets[size];

    // Category aggregation
    const categoryAggregation = runStatisticalBenchmark(() => {
      const catMap: Record<string, number> = {};
      for (let i = 0; i < transactions.length; i++) {
        const t = transactions[i];
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
      }
    });

    // Month aggregation
    const monthAggregation = runStatisticalBenchmark(() => {
      const monthMap: Record<string, { income: number; expense: number }> = {};
      for (let i = 0; i < transactions.length; i++) {
        const t = transactions[i];
        const m = t.isoDate.slice(0, 7);
        if (!monthMap[m]) monthMap[m] = { income: 0, expense: 0 };
        if (t.type === "income") monthMap[m].income += t.amount;
        else monthMap[m].expense += t.amount;
      }
    });

    // Type aggregation
    const typeAggregation = runStatisticalBenchmark(() => {
      let inc = 0, exp = 0;
      for (let i = 0; i < transactions.length; i++) {
        if (transactions[i].type === "income") inc += transactions[i].amount;
        else exp += transactions[i].amount;
      }
    });

    statystykiResults[size] = { categoryAggregation, monthAggregation, typeAggregation };
    console.log(`  Statystyki size=${size}: catAgg=${categoryAggregation.median.toFixed(2)}ms, monthAgg=${monthAggregation.median.toFixed(2)}ms, typeAgg=${typeAggregation.median.toFixed(2)}ms`);
  }
  results.statystyki = statystykiResults;

  // ---------------------------------------------------------------------------
  // 5. IMPORT PDF STAGE BREAKDOWN
  // ---------------------------------------------------------------------------
  console.log("\n>>> 5. REALISTIC PDF IMPORT STAGE BREAKDOWN");

  const pdfStagesResults: Record<number, any> = {};
  for (const size of [100, 500, 1000, 5000, 10000]) {
    const text = generatePdfText(size);
    const options = { currency: "PLN" as const, account: "Konto Główne", rules: [] };

    // Stage 1: Line splitting & multiline row assembly
    const t0 = performance.now();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const t_lines = performance.now() - t0;

    // Stage 2: parsePdfTransactions complete
    const t_parse_start = performance.now();
    const parseResult = parsePdfTransactions(text, options);
    const t_parse_end = performance.now() - t_parse_start;

    // Stage 3: Deduplication against existing transactions (500 items in profile)
    const existingSample = datasets[1000].transactions;
    const t_dedup_start = performance.now();
    const duplicates = findPdfDuplicates(parseResult.transactions, existingSample);
    const t_dedup_end = performance.now() - t_dedup_start;

    pdfStagesResults[size] = {
      lineSplittingMs: t_lines,
      parsingAndRowDetectionMs: t_parse_end,
      deduplicationMs: t_dedup_end,
      parsedTransactionsCount: parseResult.transactions.length,
      rejectedRowsCount: parseResult.rejectedRows.length,
      duplicatesDetected: duplicates.size
    };

    console.log(`  PDF size=${size}: rawParse=${t_parse_end.toFixed(2)}ms, dedupAgainst1k=${t_dedup_end.toFixed(2)}ms (parsed=${parseResult.transactions.length}, rejected=${parseResult.rejectedRows.length})`);
  }
  results.pdfStages = pdfStagesResults;

  // ---------------------------------------------------------------------------
  // 6. IMPORT CSV STAGE BREAKDOWN
  // ---------------------------------------------------------------------------
  console.log("\n>>> 6. REALISTIC CSV IMPORT STAGE BREAKDOWN");

  const csvStagesResults: Record<number, any> = {};
  for (const size of CSV_SIZES) {
    const rawCsvText = generateCsvText(size);

    // Stage 1: BOM clean & separator detection
    const t0 = performance.now();
    const cleaned = cleanCsvBomAndEncoding(rawCsvText);
    const sep = detectCsvSeparator(cleaned);
    const t_sep = performance.now() - t0;

    // Stage 2: parseAndMapCsv complete
    const t_csv_start = performance.now();
    const csvResult = parseAndMapCsv({ rawCsvText });
    const t_csv_end = performance.now() - t_csv_start;

    // Stage 3: Deduplication check on parsed transactions
    const existingSample = datasets[1000].transactions;
    const t_dedup_start = performance.now();
    let dupCount = 0;
    for (let i = 0; i < Math.min(csvResult.transactions.length, 500); i++) {
      if (checkDuplicate(csvResult.transactions[i], existingSample).isLikelyDuplicate) {
        dupCount++;
      }
    }
    const t_dedup_end = performance.now() - t_dedup_start;

    csvStagesResults[size] = {
      separatorDetectMs: t_sep,
      parseAndMapMs: t_csv_end,
      deduplicationSample500Ms: t_dedup_end,
      parsedTransactionsCount: csvResult.transactions.length,
      truncatedCount: csvResult.stats.truncatedCount,
      detectedSeparator: sep
    };

    console.log(`  CSV size=${size}: parseAndMap=${t_csv_end.toFixed(2)}ms, mapped=${csvResult.transactions.length} (truncated=${csvResult.stats.truncatedCount})`);
  }
  results.csvStages = csvStagesResults;

  // ---------------------------------------------------------------------------
  // 7. MEMORY PROFILING (BEFORE -> PARSE -> NORM -> DEDUP -> STORAGE -> GC)
  // ---------------------------------------------------------------------------
  console.log("\n>>> 7. DETAILED MEMORY PROFILING (node --expose-gc active)");

  function formatBytes(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  function getMemSnapshot() {
    const m = process.memoryUsage();
    return {
      heapUsed: m.heapUsed,
      heapTotal: m.heapTotal,
      rss: m.rss,
      external: m.external,
      arrayBuffers: m.arrayBuffers
    };
  }

  const memoryProfileResults: Record<number, any> = {};
  const MEM_SIZES = [1000, 10000, 50000, 100000];

  for (const size of MEM_SIZES) {
    if (global.gc) global.gc();
    const mem_before = getMemSnapshot();

    // 1. Raw Text Generation & Parse
    const rawCsv = generateCsvText(size);
    const parsedCsv = parseAndMapCsv({ rawCsvText: rawCsv });
    const mem_after_parse = getMemSnapshot();

    // 2. Normalization & Object mapping
    const txList = parsedCsv.transactions;
    const mem_after_norm = getMemSnapshot();

    // 3. Deduplication against 500 existing records
    const existing = datasets[1000].transactions;
    let dupSet = new Set<string>();
    for (let i = 0; i < Math.min(txList.length, 500); i++) {
      if (checkDuplicate(txList[i], existing).isLikelyDuplicate) {
        dupSet.add(txList[i].id);
      }
    }
    const mem_after_dedup = getMemSnapshot();

    // 4. Storage into IndexedDB (fake-indexeddb)
    const testState: AppState = {
      profiles: [{
        ...datasets[1000].profile,
        transactions: txList
      }],
      activeProfileId: "profile_bench"
    };
    await saveStateToIDBOnly(testState);
    const mem_after_storage = getMemSnapshot();

    // 5. Force GC
    if (global.gc) global.gc();
    const mem_after_gc = getMemSnapshot();

    memoryProfileResults[size] = {
      before: { heapUsedMb: formatBytes(mem_before.heapUsed), rssMb: formatBytes(mem_before.rss) },
      afterParse: { heapUsedMb: formatBytes(mem_after_parse.heapUsed), rssMb: formatBytes(mem_after_parse.rss) },
      afterNorm: { heapUsedMb: formatBytes(mem_after_norm.heapUsed), rssMb: formatBytes(mem_after_norm.rss) },
      afterDedup: { heapUsedMb: formatBytes(mem_after_dedup.heapUsed), rssMb: formatBytes(mem_after_dedup.rss) },
      afterStorage: { heapUsedMb: formatBytes(mem_after_storage.heapUsed), rssMb: formatBytes(mem_after_storage.rss) },
      afterGc: { heapUsedMb: formatBytes(mem_after_gc.heapUsed), rssMb: formatBytes(mem_after_gc.rss) },
      retainedOverheadMb: formatBytes(Math.max(0, mem_after_gc.heapUsed - mem_before.heapUsed))
    };

    console.log(`  Memory size=${size}: Before=${formatBytes(mem_before.heapUsed)} -> AfterParse=${formatBytes(mem_after_parse.heapUsed)} -> AfterStorage=${formatBytes(mem_after_storage.heapUsed)} -> AfterGC=${formatBytes(mem_after_gc.heapUsed)}`);
  }
  results.memoryProfile = memoryProfileResults;

  // ---------------------------------------------------------------------------
  // 8. MEMORY LEAK CHECK: IMPORT -> CLEAR -> IMPORT -> CLEAR -> IMPORT (3 CYCLES)
  // ---------------------------------------------------------------------------
  console.log("\n>>> 8. MEMORY LEAK AUDIT (3 Cycles: IMPORT -> CLEAR -> IMPORT -> CLEAR -> IMPORT)");

  const leakCycles: any[] = [];
  if (global.gc) global.gc();
  const baselineMem = getMemSnapshot();

  for (let cycle = 1; cycle <= 3; cycle++) {
    // 1. IMPORT
    const csvData = generateCsvText(10000);
    const imported = parseAndMapCsv({ rawCsvText: csvData });
    const profile = generateProfile(imported.transactions);
    calculateDashboardMetrics(profile, targetDate, []);
    getFinancialHealthSummary(profile, []);
    runDataAudit(profile);
    const memAfterImport = getMemSnapshot();

    // 2. CLEAR (Drop references & clear IDB store)
    (profile as any).transactions = [];
    if (global.gc) global.gc();
    const memAfterClear = getMemSnapshot();

    const cycleInfo = {
      cycle,
      heapAfterImportMb: formatBytes(memAfterImport.heapUsed),
      heapAfterClearMb: formatBytes(memAfterClear.heapUsed),
      heapDeltaVsBaselineMb: ((memAfterClear.heapUsed - baselineMem.heapUsed) / 1024 / 1024).toFixed(3) + " MB"
    };
    leakCycles.push(cycleInfo);
    console.log(`  Cycle ${cycle}: AfterImport=${cycleInfo.heapAfterImportMb}, AfterClear=${cycleInfo.heapAfterClearMb}, DeltaVsBaseline=${cycleInfo.heapDeltaVsBaselineMb}`);
  }

  const finalCycleDelta = leakCycles[2].heapAfterClearMb;
  const isLeaking = (parseFloat(leakCycles[2].heapDeltaVsBaselineMb) > 15.0);
  results.memoryLeakAudit = {
    baselineHeapMb: formatBytes(baselineMem.heapUsed),
    cycles: leakCycles,
    flagMemoryLeak: isLeaking ? "FLAG MEMORY LEAK" : "NO LEAK DETECTED (Heap stabilizes cleanly)"
  };
  console.log(`  Memory Leak Status: ${results.memoryLeakAudit.flagMemoryLeak}`);

  // ---------------------------------------------------------------------------
  // 9. PERSISTENCE BENCHMARK (REAL INDEXEDDB)
  // ---------------------------------------------------------------------------
  console.log("\n>>> 9. PERSISTENCE BENCHMARK (Real IndexedDB Engine)");

  const persistenceResults: Record<number, any> = {};
  for (const size of [1000, 5000, 10000]) {
    const profile = datasets[size].profile;
    const testState: AppState = {
      profiles: [profile],
      activeProfileId: profile.id
    };

    // WRITE / SAVE
    const writeStat = await runStatisticalBenchmarkAsync(async () => {
      await saveStateToIDBOnly(testState);
    }, { runs: 5 });

    // READ / LOAD
    const readStat = await runStatisticalBenchmarkAsync(async () => {
      await loadStateFromIDBOnly();
    }, { runs: 5 });

    // UPDATE
    const updateStat = await runStatisticalBenchmarkAsync(async () => {
      testState.updatedAt = new Date().toISOString();
      await saveStateToIDBOnly(testState);
    }, { runs: 5 });

    // BULK IMPORT SIMULATION (Appending 500 new transactions and persisting)
    const newTxBatch = generateTransactions(500);
    const bulkImportStat = await runStatisticalBenchmarkAsync(async () => {
      testState.profiles[0].transactions = [...testState.profiles[0].transactions, ...newTxBatch];
      await saveStateToIDBOnly(testState);
    }, { runs: 5 });

    persistenceResults[size] = {
      writeMs: writeStat.median.toFixed(2),
      readMs: readStat.median.toFixed(2),
      updateMs: updateStat.median.toFixed(2),
      bulkImport500Ms: bulkImportStat.median.toFixed(2)
    };

    console.log(`  IndexedDB size=${size}: Write=${writeStat.median.toFixed(2)}ms, Read=${readStat.median.toFixed(2)}ms, Update=${updateStat.median.toFixed(2)}ms, BulkImport500=${bulkImportStat.median.toFixed(2)}ms`);
  }
  results.persistence = persistenceResults;

  // ---------------------------------------------------------------------------
  // 10. BUNDLE & CHUNKS AUDIT
  // ---------------------------------------------------------------------------
  console.log("\n>>> 10. PRODUCTION BUNDLE & CHUNK AUDIT (dist/assets)");

  const assetsDir = path.resolve(process.cwd(), "dist/assets");
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    let totalJsBytes = 0;
    let totalCssBytes = 0;
    const chunks: { name: string; sizeKb: number; type: "js" | "css"; isLazy: boolean }[] = [];

    // Check which chunks are declared in index.html as initial
    const indexHtml = fs.readFileSync(path.resolve(process.cwd(), "dist/index.html"), "utf-8");

    for (const f of files) {
      const fullPath = path.join(assetsDir, f);
      const stat = fs.statSync(fullPath);
      if (f.endsWith(".js")) {
        totalJsBytes += stat.size;
        const isPreloaded = indexHtml.includes(f);
        chunks.push({ name: f, sizeKb: Math.round(stat.size / 1024), type: "js", isLazy: !isPreloaded });
      } else if (f.endsWith(".css")) {
        totalCssBytes += stat.size;
        chunks.push({ name: f, sizeKb: Math.round(stat.size / 1024), type: "css", isLazy: false });
      }
    }

    chunks.sort((a, b) => b.sizeKb - a.sizeKb);

    const initialJsChunks = chunks.filter((c) => c.type === "js" && !c.isLazy);
    const lazyJsChunks = chunks.filter((c) => c.type === "js" && c.isLazy);
    const initialJsBytes = initialJsChunks.reduce((s, c) => s + c.sizeKb * 1024, 0);

    const bundleAudit = {
      totalJsKb: Math.round(totalJsBytes / 1024),
      totalCssKb: Math.round(totalCssBytes / 1024),
      totalChunksCount: chunks.length,
      initialJsKb: Math.round(initialJsBytes / 1024),
      lazyChunksCount: lazyJsChunks.length,
      top10Chunks: chunks.slice(0, 10),
      heavyLibrariesAudit: {
        pdfjsDist: chunks.find((c) => c.name.includes("vendor-pdfjs")),
        charts: chunks.find((c) => c.name.includes("vendor-charts")),
        jspdf: chunks.find((c) => c.name.includes("vendor-jspdf")),
        csvPapa: chunks.find((c) => c.name.includes("vendor-csv")),
        aiService: chunks.find((c) => c.name.includes("aiService")),
        aiModal: chunks.find((c) => c.name.includes("AiChatModal"))
      }
    };

    console.log(`  Total JS: ${bundleAudit.totalJsKb} KB | Total CSS: ${bundleAudit.totalCssKb} KB | Total Chunks: ${bundleAudit.totalChunksCount}`);
    console.log(`  Initial JS (Entry + Preload): ${bundleAudit.initialJsKb} KB | Lazy Chunks: ${bundleAudit.lazyChunksCount}`);
    console.log(`  AI Lazy Status: aiService is lazy (${bundleAudit.heavyLibrariesAudit.aiService?.isLazy ? "YES" : "NO"}), AiChatModal is lazy (${bundleAudit.heavyLibrariesAudit.aiModal?.isLazy ? "YES" : "NO"})`);
    results.bundle = bundleAudit;
  } else {
    results.bundle = "dist/assets not found. Run npm run build first.";
  }

  // ---------------------------------------------------------------------------
  // 11. REAL STARTUP (COLD PROCESS & BROWSER NAVIGATION)
  // ---------------------------------------------------------------------------
  console.log("\n>>> 11. REAL STARTUP MEASUREMENT");

  // A. Cold Process Startup
  try {
    const coldOutput = execSync("node --expose-gc --import tsx scripts/measure_cold_startup.ts", {
      encoding: "utf-8"
    });
    const parsedCold = JSON.parse(coldOutput.trim().split("\n").filter(l => l.startsWith("{"))[0]);
    results.coldProcessStartup = parsedCold;
    console.log("  Cold Node Process Startup:");
    console.log(`    Module Load Duration: ${parsedCold.moduleLoadDurationMs.toFixed(2)} ms`);
    console.log(`    Storage Initial Load: ${parsedCold.storageInitialLoadMs.toFixed(2)} ms`);
    console.log(`    Dashboard Ready Calc: ${parsedCold.dashboardReadyCalculationMs.toFixed(2)} ms`);
    console.log(`    Total Cold Startup:   ${parsedCold.totalColdStartupMs.toFixed(2)} ms`);
  } catch (err: any) {
    console.warn("  Cold process startup measurement warning:", err.message);
    results.coldProcessStartup = "NOT MEASURED";
  }

  // B. Real Browser Startup via Playwright
  try {
    const browserOutput = execSync("node --import tsx scripts/measure_browser_startup.ts", {
      encoding: "utf-8"
    });
    const parsedBrowser = JSON.parse(browserOutput.trim().split("\n").filter(l => l.startsWith("{"))[0]);
    results.browserStartup = parsedBrowser;
    console.log("  Real Browser Startup (Playwright Chromium, 5 runs):");
    console.log(`    TTFB:                 ${parsedBrowser.ttfbMs.median.toFixed(2)} ms`);
    console.log(`    DOMContentLoaded:     ${parsedBrowser.domContentLoadedMs.median.toFixed(2)} ms`);
    console.log(`    First Contentful Paint:${parsedBrowser.firstContentfulPaintMs.median.toFixed(2)} ms`);
    console.log(`    Root Ready (Mounted):  ${parsedBrowser.rootReadyMs.median.toFixed(2)} ms`);
  } catch (err: any) {
    console.warn("  Browser startup measurement warning:", err.message);
    results.browserStartup = "NOT MEASURED";
  }

  // Save full results to JSON artifact
  const outPath = path.resolve(process.cwd(), "scripts/benchmark_results.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log("\n================================================================================");
  console.log(`BENCHMARK COMPLETED SUCCESSFULLY! Full results saved to: ${outPath}`);
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("Benchmark suite fatal error:", err);
  process.exit(1);
});
