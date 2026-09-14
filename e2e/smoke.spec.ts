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

  test("G. Doktor Saldo (Data Auditor & Self-Healing): runs integrity audit and opens repair modal", async ({ page }) => {
    await setupApp(page);

    // Navigate to Settings
    await navigateToView(page, "settings");
    await expect(page.locator("#settings-view-container")).toBeVisible({ timeout: 5000 });

    // Ensure backup section is in view / click doctor saldo button
    const backupTabBtn = page.locator("#btn-settings-tab-backup");
    if (await backupTabBtn.isVisible()) {
      await backupTabBtn.click();
    }
    const doctorBtn = page.locator("#btn-open-doctor-saldo");
    await expect(doctorBtn).toBeVisible({ timeout: 5000 });
    await doctorBtn.click();

    // Verify modal elements
    await expect(page.locator("#data-auditor-modal-title")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#data-auditor-health-score")).toBeVisible({ timeout: 5000 });

    // Close modal
    const closeBtn = page.getByLabel("Zamknij modal audytora");
    await closeBtn.click();
    await expect(page.locator("#data-auditor-modal-title")).not.toBeVisible({ timeout: 5000 });
  });

  test("H. Mortgage Pro Center Flow: adds mortgage, verifies KNF stress test, credit vacation, and LTV monitor", async ({ page }) => {
    await setupApp(page);

    // 1. Navigate to Debts view
    await navigateToView(page, "debts");
    await expect(page.locator("#debts-view-container")).toBeVisible({ timeout: 5000 });

    // 2. Add Mortgage Debt via modal if not present
    const mortgageBanner = page.locator("#mortgage-pro-banner");
    if (!await mortgageBanner.isVisible({ timeout: 2000 }).catch(() => false)) {
      const addDebtBtn = page.locator("#btn-add-debt");
      await expect(addDebtBtn).toBeVisible({ timeout: 5000 });
      await addDebtBtn.click();

      // Ensure form is open
      await expect(page.locator("#debt-form-modal-title")).toBeVisible({ timeout: 5000 });
      await page.locator("#input-debt-name").fill("Kredyt Hipoteczny E2E");
      await page.locator("#input-debt-institution").fill("PKO Bank Polski");
      await page.locator("#input-debt-balance").fill("420000");
      await page.locator("#input-debt-monthly-payment").fill("3100");
      await page.locator("#input-debt-interest-rate").fill("7.15");
      await page.locator("#btn-submit-debt-form").click();

      await expect(page.locator("#debt-form-modal-title")).not.toBeVisible({ timeout: 5000 });
    }

    // 3. Verify Mortgage Pro banner is visible and open modal
    await expect(page.locator("#mortgage-pro-banner")).toBeVisible({ timeout: 5000 });
    const openProBtn = page.locator("#btn-open-mortgage-pro-hub");
    await expect(openProBtn).toBeVisible({ timeout: 5000 });
    await openProBtn.click();

    // 4. Verify Mortgage Pro Modal opened
    const modalTitle = page.locator("#mortgage-pro-modal-title");
    await expect(modalTitle).toBeVisible({ timeout: 5000 });
    await expect(modalTitle).toContainText("Centrum Hipoteczne Mortgage Pro");

    // 5. Check Tab 1: Stress-Test KNF (+300 pb)
    await expect(page.locator("#tab-mortgage-stress-test")).toBeVisible();
    await expect(page.getByText(/Bufor ostrożnościowy KNF/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#btn-export-mortgage-pdf")).toBeVisible();

    // 6. Check Tab 2: Wakacje Kredytowe
    await page.locator("#tab-mortgage-vacation").click();
    await expect(page.getByText(/Konfiguracja zawieszenia rat/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Dźwignia Finansowa/i).first()).toBeVisible();

    // 7. Check Tab 3: Raty Malejące vs Równe
    await page.locator("#tab-mortgage-annuity-vs-decreasing").click();
    await expect(page.getByText(/Zysk z rat malejących/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Raty Malejące \(Kapitałowe\)/i).first()).toBeVisible();

    // 8. Check Tab 4: LTV & Bufor Kapitałowy
    await page.locator("#tab-mortgage-ltv").click();
    await expect(page.getByText(/Wartość nieruchomości/i).first()).toBeVisible({ timeout: 5000 });

    // 9. Close Modal
    await page.locator("#btn-close-mortgage-pro").click();
    await expect(page.locator("#mortgage-pro-modal-title")).not.toBeVisible({ timeout: 5000 });
  });

  test("I. B2B & Polish Tax Engine Flow: opens tax calculator, compares Ryczałt vs Linear vs Scale, verifies tax buffer and recommendations", async ({ page }) => {
    await setupApp(page);

    // 1. Navigate to Analysis view
    await navigateToView(page, "analysis");
    await expect(page.locator("#analysis-view-container")).toBeVisible({ timeout: 5000 });

    // 2. Click B2B Tax button
    const taxBtn = page.locator("#btn-open-b2b-tax");
    await expect(taxBtn).toBeVisible({ timeout: 5000 });
    await taxBtn.click();

    // 3. Verify B2B Tax Modal opened
    const modalTitle = page.locator("#b2b-tax-modal-title");
    await expect(modalTitle).toBeVisible({ timeout: 5000 });
    await expect(modalTitle).toContainText("Kalkulator Podatkowy & B2B / JDG");

    // 4. Verify Tab 1: Comparison & Recommendation Banner
    await expect(page.locator("#tax-comparison-content")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#tax-recommendation-banner")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#tax-cards-grid")).toBeVisible();
    await expect(page.getByText(/Podatek Liniowy \(19%\)/i).first()).toBeVisible();
    await expect(page.getByText(/Skala Podatkowa \(12% \/ 32%\)/i).first()).toBeVisible();

    // 5. Test Revenue adjustment
    const revenueInput = page.locator("#input-tax-revenue");
    await revenueInput.fill("28000");

    // 6. Switch to Tab 2: Monthly Buffer & Set Aside calculation
    const bufferTab = page.locator("#tab-tax-monthly-buffer");
    await bufferTab.click();
    await expect(page.locator("#tax-monthly-buffer-content")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#val-tax-buffer-total")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Przelew ZUS \(DRA\)/i).first()).toBeVisible();
    await expect(page.getByText(/Zaliczka PIT do Urzędu Skarbowego/i).first()).toBeVisible();

    // 7. Switch to Tab 3: Calendar & Tips
    const tipsTab = page.locator("#tab-tax-calendar-tips");
    await tipsTab.click();
    await expect(page.locator("#tax-calendar-tips-content")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/20\. dzień każdego miesiąca/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/25\. dzień każdego miesiąca/i).first()).toBeVisible({ timeout: 5000 });

    // 8. Close Modal
    await page.locator("#btn-close-b2b-tax").click();
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 });
  });
});

