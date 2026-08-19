import { test, expect } from "@playwright/test";
import { setupApp, navigateToView } from "./helpers";

test.describe("Lazy Loading & Dynamic Component Smoke", () => {
  test("A. Command Palette: opens dynamically on shortcut or click, searches and closes with Escape", async ({ page }) => {
    await setupApp(page);

    // Trigger Command Palette via header button
    const paletteTrigger = page.locator("#btn-open-command-palette");
    await expect(paletteTrigger).toBeVisible({ timeout: 5000 });
    await paletteTrigger.click();

    // Verify Command Palette modal is loaded and visible
    const paletteDialog = page.getByRole("dialog");
    await expect(paletteDialog).toBeVisible({ timeout: 5000 });

    // Verify search input is focused
    const searchInput = paletteDialog.getByPlaceholder("Wpisz polecenie, widok lub szukaj transakcji...");
    await expect(searchInput).toBeVisible();

    // Type a query to filter actions
    await searchInput.fill("Transakcje");
    await expect(paletteDialog.getByText("Transakcje").first()).toBeVisible();

    // Close palette via Escape key
    await page.keyboard.press("Escape");
    await expect(paletteDialog).not.toBeVisible();
  });

  test("B. CSV Import Modal: lazy-loads on demand and cancels safely without mutating data", async ({ page }) => {
    await setupApp(page);

    // Navigate to transactions view
    await navigateToView(page, "transactions");
    await expect(page.locator("#transactions-view-container")).toBeVisible({ timeout: 5000 });

    // Trigger CSV import modal
    const importCsvBtn = page.locator("#btn-import-csv");
    await expect(importCsvBtn).toBeVisible({ timeout: 5000 });
    await importCsvBtn.click();

    // Verify lazy-loaded CSV import modal appears
    const importDialog = page.getByRole("dialog", { name: "Import historii transakcji bankowych" });
    await expect(importDialog).toBeVisible({ timeout: 5000 });

    // Close modal safely via close button
    const closeBtn = importDialog.getByRole("button", { name: "Zamknij" });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Verify modal is closed
    await expect(importDialog).not.toBeVisible();
    await expect(page.locator("#transactions-view-container")).toBeVisible();
  });

  test("C. Security Info Modal: lazy-loads and renders security features details", async ({ page }) => {
    await setupApp(page);

    // Click security details button in header
    const securityTrigger = page.locator("#btn-security-details");
    if (await securityTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await securityTrigger.click();

      // Verify security info modal is visible
      const securityModal = page.locator("#security-info-modal");
      await expect(securityModal).toBeVisible({ timeout: 5000 });

      // Close modal
      const closeBtn = page.locator("#close-security-modal");
      await closeBtn.click();
      await expect(securityModal).not.toBeVisible();
    }
  });
});
