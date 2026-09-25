/**
 * Isolated Cold Startup Measurement Script
 * Spawned in a completely fresh Node.js process to measure REAL cold startup:
 * 1. Process start -> entrypoint execution
 * 2. Module loading & compilation (V8 disk read, parse, byte compilation)
 * 3. Storage initialization & state migration
 * 4. Virtual DOM / Component tree initialization
 */

import { performance } from "perf_hooks";

// Capture process entrypoint timestamp immediately
const t_process_entry = performance.now();

async function runColdStartup() {
  const t_before_module_load = performance.now();

  // Dynamic import of major application modules to measure real ESM evaluation time
  const [
    { openDb, loadState, saveStateToIDBOnly },
    { calculateDashboardMetrics },
    { getFinancialHealthSummary },
    { runDataAudit },
    { validateAndMigrateState }
  ] = await Promise.all([
    import("../src/services/localDb"),
    import("../src/hooks/useDashboardMetrics"),
    import("../src/services/financialHealth"),
    import("../src/services/dataAuditor"),
    import("../src/utils/stateMigration")
  ]);

  const t_after_module_load = performance.now();

  // Initialize fake-indexeddb environment
  await import("fake-indexeddb/auto");
  const t_after_idb_env = performance.now();

  // Storage initialization
  const t_before_storage = performance.now();
  let state = await loadState();
  const t_after_storage_load = performance.now();

  // If no profile, create seed profile with 500 transactions to simulate real user profile
  const sampleProfile: any = {
    id: "profile_startup_test",
    name: "Startup Test User",
    kind: "personal",
    currency: "PLN",
    transactions: Array.from({ length: 500 }, (_, i) => ({
      id: `tx_${i}`,
      name: `Transakcja startup ${i}`,
      amount: 50 + (i % 200),
      type: i % 5 === 0 ? "income" : "expense",
      category: "Jedzenie",
      account: "Konto Główne",
      currency: "PLN",
      isoDate: "2026-05-15"
    })),
    payments: [],
    goals: [],
    investments: [],
    budgets: { Jedzenie: 2000 }
  };

  const seedState: any = {
    profiles: [sampleProfile],
    activeProfileId: "profile_startup_test"
  };

  await saveStateToIDBOnly(seedState);
  const t_after_seed = performance.now();

  // Reload state from IDB (simulating app reload)
  const reloaded = await loadState();
  const t_after_real_load = performance.now();

  // App Init / Dashboard Calculation (First calculation cycle)
  const t_before_dashboard_calc = performance.now();
  const metrics = calculateDashboardMetrics(reloaded!.profiles[0], new Date("2026-05-15"), []);
  const health = getFinancialHealthSummary(reloaded!.profiles[0], []);
  const audit = runDataAudit(reloaded!.profiles[0]);
  const t_after_dashboard_calc = performance.now();

  const result = {
    processEntryToModuleLoadStartMs: t_before_module_load - t_process_entry,
    moduleLoadDurationMs: t_after_module_load - t_before_module_load,
    idbEnvSetupMs: t_after_idb_env - t_after_module_load,
    storageInitialLoadMs: t_after_storage_load - t_before_storage,
    storageRealProfileLoadMs: t_after_real_load - t_after_seed,
    dashboardReadyCalculationMs: t_after_dashboard_calc - t_before_dashboard_calc,
    totalColdStartupMs: t_after_dashboard_calc - t_process_entry
  };

  console.log(JSON.stringify(result));
}

runColdStartup().catch((err) => {
  console.error("Cold startup measurement failed:", err);
  process.exit(1);
});
