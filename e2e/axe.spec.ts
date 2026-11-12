import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { setupApp, navigateToView, type E2EView } from "./helpers";

// Automatyczny skan dostępności (WCAG 2.1 A/AA) kluczowych widoków w obu motywach (A11Y-04).
// Wykrywa m.in. kontrast i błędy ARIA, czego ręczne testy fokusu (a11y.spec.ts) nie pokrywają.
const VIEWS: E2EView[] = ["dashboard", "transactions", "payments", "budget", "goals", "analysis", "debts", "settings", "help"];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

for (const theme of ["light", "dark"] as const) {
  test.describe(`axe — motyw ${theme}`, () => {
    for (const view of VIEWS) {
      test(`widok ${view}: brak poważnych naruszeń WCAG 2.1 AA`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem("saldo_theme", t), theme);
        await setupApp(page);
        await navigateToView(page, view);
        await page.waitForTimeout(600); // animacje wejścia

        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        const summary = results.violations.map((v) => `${v.impact} ${v.id} ×${v.nodes.length} — ${v.help}`);
        if (process.env.AXE_VERBOSE) console.log(`[${theme}/${view}]\n  ` + (summary.join("\n  ") || "OK"));
        const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(serious.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
      });
    }
  });
}
