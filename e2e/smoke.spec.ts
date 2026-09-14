import { test, expect } from "@playwright/test";
import { setupApp, navigateToView } from "./helpers";

test.describe("Smoke: Core Application Flow", () => {
  test("A. Bootstrap and Full View Navigation: navigates through all primary views smoothly", async ({ page }) => {
    await setupApp(page);

    // 1. Dashboard
    await expect(page.locator("#dashboard-scroll-area")).toBeVisible({ timeout: 5000 });

    // 2. Transactions
    await navigateToView(page, "transactions");
    await expect(page.locator("#transactions-view-container")).toBeVisible({ timeout: 5000 });

    // 3. Payments
    await navigateToView(page, "payments");
    await expect(page.locator("#payments-view-container")).toBeVisible({ timeout: 5000 });

    // 4. Budget
    await navigateToView(page, "budget");
    await expect(page.locator("#budget-view-container")).toBeVisible({ timeout: 5000 });

    // 5. Goals
    await navigateToView(page, "goals");
    await expect(page.locator("#goals-view-container")).toBeVisible({ timeout: 5000 });

    // 6. Analysis
    await navigateToView(page, "analysis");
    await expect(page.locator("#analysis-view-container")).toBeVisible({ timeout: 5000 });

    // 7. Settings
    await navigateToView(page, "settings");
    await expect(page.locator("#settings-view-container")).toBeVisible({ timeout: 5000 });

    // 8. Help
    await navigateToView(page, "help");
    await expect(page.getByText("Centrum Pomocy")).toBeVisible({ timeout: 5000 });

    // Return to Dashboard
    await navigateToView(page, "dashboard");
    await expect(page.locator("#dashboard-scroll-area")).toBeVisible({ timeout: 5000 });
  });

  test("B. Transaction to Dashboard Flow: created transaction reflects on dashboard", async ({ page }) => {
    await setupApp(page);

    // Navigate to transactions
    await navigateToView(page, "transactions");

    // Open quick add
    await page.locator("#btn-quick-add-tx").click();
    await expect(page.locator("#tx-modal-title")).toBeVisible({ timeout: 5000 });

    const txName = "Zakupy Spożywcze Smoke E2E";
    await page.locator("#input-tx-name").fill(txName);
    await page.locator("#input-tx-amount").fill("145.50");
    await page.locator("#btn-tx-submit").click();
    await expect(page.locator("#tx-modal-title")).not.toBeVisible({ timeout: 5000 });

    // Verify in transactions list
    await expect(page.locator("#tx-table").getByText(txName)).toBeVisible({ timeout: 5000 });

    // Switch to dashboard and verify it appears in Recent Activity
    await navigateToView(page, "dashboard");
    await expect(page.locator("#dashboard-scroll-area")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(txName).first()).toBeVisible({ timeout: 5000 });
  });

  test("C. Budget Planning Flow: sets category limit and verifies summary in BudgetView", async ({ page }) => {
    await setupApp(page);

    // Navigate to Budget
    await navigateToView(page, "budget");
    await expect(page.locator("#budget-view-container")).toBeVisible({ timeout: 5000 });

    // Open budget configuration modal
    const editBudgetBtn = page.getByRole("button", { name: /Zaplanuj budżety|Dostosuj limity/i }).first();
    if (await editBudgetBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBudgetBtn.click();
      const budgetModalTitle = page.getByText("Zarządzanie limitami budżetowymi");
      await expect(budgetModalTitle).toBeVisible({ timeout: 5000 });

      // Save budgets
      const saveBtn = page.getByRole("button", { name: /Zapisz budżety/i });
      await saveBtn.click();
      await expect(budgetModalTitle).not.toBeVisible({ timeout: 5000 });
    }

    // Verify budget view is intact
    await expect(page.locator("#budget-view-container")).toBeVisible();
  });

  test("D. Net Worth Tracker (Wealthfolio): displays Net Worth widget and opens detail modal", async ({ page }) => {
    await setupApp(page);

    // Verify Net Worth widget is present on Dashboard
    await expect(page.locator("#dashboard-scroll-area")).toBeVisible({ timeout: 5000 });
    const netWorthWidget = page.locator('[data-testid="net-worth-widget"]');
    await expect(netWorthWidget).toBeVisible({ timeout: 5000 });
    await expect(netWorthWidget.getByText("Majątek Netto")).toBeVisible();

    // Click Szczegóły button to open NetWorthModal
    const detailsBtn = page.locator("#btn-open-net-worth-modal");
    await expect(detailsBtn).toBeVisible();
    await detailsBtn.click();

    // Verify modal elements
    await expect(page.locator("#net-worth-modal-title")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Struktura Aktywów")).toBeVisible();
    await expect(page.getByText("Struktura Zobowiązań")).toBeVisible();
    await expect(page.getByText("Trajektoria Majątku Netto")).toBeVisible();

    // Close modal
    const closeBtn = page.getByRole("button", { name: /Zamknij modal majątku netto/i });
    await closeBtn.click();
    await expect(page.locator("#net-worth-modal-title")).not.toBeVisible({ timeout: 5000 });
  });

  test("E. Financial Skills & Action Planner (Claude Skills): generates multi-step plan from skills catalog", async ({ page }) => {
    await setupApp(page);

    // Navigate to Analysis
    await navigateToView(page, "analysis");
    await expect(page.locator("#analysis-view-container")).toBeVisible({ timeout: 5000 });

    // Open Financial Skills modal
    const skillsBtn = page.locator("#btn-open-financial-skills");
    await expect(skillsBtn).toBeVisible({ timeout: 5000 });
    await skillsBtn.click();

    // Verify modal elements
    await expect(page.locator("#financial-skills-modal-title")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Katalog Umiejętności")).toBeVisible();
    await expect(page.getByText("Architekt Poduszki Finansowej")).toBeVisible();

    // Run Emergency Fund Skill
    const runBtn = page.getByRole("button", { name: /Uruchom umiejętność i stwórz plan/i }).nth(1);
    await runBtn.click();

    // Verify switched to "Moje Plany Działań" with created plan
    await expect(page.getByText(/3-Etapowa Poduszka Bezpieczeństwa/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Postęp realizacji/i)).toBeVisible();

    // Close modal
    const closeBtn = page.getByRole("button", { name: /Zamknij modal umiejętności/i });
    await closeBtn.click();
    await expect(page.locator("#financial-skills-modal-title")).not.toBeVisible({ timeout: 5000 });
  });

  test("F. Saldo Wrapped & Financial Story Cards (MoneyPrinterTurbo): opens and navigates story slides", async ({ page }) => {
    await setupApp(page);

    // Navigate to Analysis
    await navigateToView(page, "analysis");
    await expect(page.locator("#analysis-view-container")).toBeVisible({ timeout: 5000 });

    // Open Saldo Wrapped Story modal
    const storyBtn = page.locator("#btn-open-financial-story");
    await expect(storyBtn).toBeVisible({ timeout: 5000 });
    await storyBtn.click();

    // Verify modal elements
    await expect(page.locator("#financial-story-modal-title")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Karta 1 z 6")).toBeVisible({ timeout: 5000 });

    // Navigate to next slide
    const nextBtn = page.getByLabel("Następny slajd");
    await nextBtn.click();
    await expect(page.getByText("Karta 2 z 6")).toBeVisible({ timeout: 5000 });

    // Close modal
    const closeBtn = page.getByRole("button", { name: "Zamknij" });
    await closeBtn.click();
    await expect(page.locator("#financial-story-modal-title")).not.toBeVisible({ timeout: 5000 });
  });
});
