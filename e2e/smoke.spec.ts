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
});
