import { test, expect } from "@playwright/test";
import { setupApp, navigateToView } from "./helpers";

test.describe("Data Quality & Encryption E2E Flows", () => {
  test("A. PIN protection: encrypted profile survives lock, reload and unlock without data loss", async ({ page }) => {
    await setupApp(page);

    // Add a transaction while the profile is still unlocked
    await navigateToView(page, "transactions");
    await expect(page.locator("#tx-search-input")).toBeVisible({ timeout: 5000 });
    await page.locator("#btn-quick-add-tx").click();
    await expect(page.locator("#input-tx-name")).toBeVisible({ timeout: 5000 });
    await page.locator("#input-tx-name").fill("E2E transakcja przed PIN");
    await page.locator("#input-tx-amount").fill("321");
    await page.locator("#btn-tx-submit").click();
    await expect(page.locator("#tx-table").getByText("E2E transakcja przed PIN")).toBeVisible();

    // Set a PIN on the active profile
    await navigateToView(page, "settings", { tab: "profiles" });
    await expect(page.locator("#settings-pin-card")).toBeVisible({ timeout: 5000 });
    await page.locator("#btn-set-profile-pin").click();

    const pinModal = page.locator("#pin-modal");
    await expect(pinModal).toBeVisible({ timeout: 5000 });
    await page.locator("#input-pin-code").fill("4821");
    await page.locator("#checkbox-pin-recovery-warning").check();
    await page.locator("#btn-pin-submit").click();
    await expect(pinModal).not.toBeVisible();

    // Reload — this forces a real re-decrypt from IndexedDB (not just an
    // in-memory unlocked state). activeProfileId persists across reload, so
    // the app goes straight to the PIN-unlock gate for that profile — no
    // demo/offline re-entry step needed (isDemoMode resetting to false no
    // longer matters once there's already an active profile on disk).
    await page.reload();

    // Profile is now locked behind PIN — unlock it
    const unlockModal = page.locator("#unlock-modal");
    await expect(unlockModal).toBeVisible({ timeout: 15000 });
    await page.locator("#input-unlock-pin").fill("4821");
    await page.locator("#btn-unlock-submit").click();
    await expect(unlockModal).not.toBeVisible({ timeout: 5000 });

    // Verify the transaction created before encryption survived the
    // encrypt -> lock -> reload -> decrypt round trip intact
    await navigateToView(page, "transactions");
    await expect(page.locator("#tx-search-input")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#tx-table").getByText("E2E transakcja przed PIN")).toBeVisible();
    await expect(page.locator("#tx-table").getByText(/321/).first()).toBeVisible();
  });

  test("B. CSV import: completes end to end and imported rows appear in the ledger", async ({ page }) => {
    await setupApp(page);

    await navigateToView(page, "transactions");
    await expect(page.locator("#transactions-view-container")).toBeVisible({ timeout: 5000 });

    await page.locator("#btn-import-csv").click();
    const importDialog = page.getByRole("dialog", { name: "Import historii transakcji bankowych" });
    await expect(importDialog).toBeVisible({ timeout: 5000 });

    const csv = "Data;Kwota;Tytuł\n2026-08-01;-42,50;E2E Import Zakupy\n2026-08-02;+1000,00;E2E Import Wynagrodzenie";
    await importDialog.getByPlaceholder(/Tutaj możesz wkleić skopiowane wiersze/i).fill(csv);
    await importDialog.getByRole("button", { name: /Przetwórz wklejony tekst CSV/i }).click();

    await importDialog.getByRole("button", { name: /Generuj podgląd/i }).click();
    await expect(importDialog.getByText("Do zaimportowania")).toBeVisible();

    await page.locator("#btn-confirm-import").click();
    await expect(importDialog).not.toBeVisible({ timeout: 5000 });

    await expect(page.locator("#tx-table").getByText("E2E Import Zakupy")).toBeVisible();
    await expect(page.locator("#tx-table").getByText("E2E Import Wynagrodzenie")).toBeVisible();
  });

  test("C. CSV import: files over the row limit show a truncation warning instead of silently dropping rows", async ({ page }) => {
    await setupApp(page);

    await navigateToView(page, "transactions");
    await expect(page.locator("#transactions-view-container")).toBeVisible({ timeout: 5000 });

    await page.locator("#btn-import-csv").click();
    const importDialog = page.getByRole("dialog", { name: "Import historii transakcji bankowych" });
    await expect(importDialog).toBeVisible({ timeout: 5000 });

    const rows = Array.from({ length: 2100 }, (_, i) => `2026-08-01;-1,00;E2E Wiersz ${i}`);
    const bigCsv = "Data;Kwota;Tytuł\n" + rows.join("\n");
    await importDialog.getByPlaceholder(/Tutaj możesz wkleić skopiowane wiersze/i).fill(bigCsv);
    await importDialog.getByRole("button", { name: /Przetwórz wklejony tekst CSV/i }).click();
    await importDialog.getByRole("button", { name: /Generuj podgląd/i }).click();

    await expect(importDialog.getByText(/Plik zawierał więcej wierszy niż limit/i)).toBeVisible({ timeout: 10000 });
    await expect(importDialog.getByText("2000", { exact: true }).first()).toBeVisible();
  });
});
