import { test, expect } from "@playwright/test";
import { setupApp, navigateToView } from "./helpers";

test.describe("Security & Privacy E2E Flows", () => {
  test("A. Settings Privacy Section: presents device reset controls and cancels safely", async ({ page }) => {
    await setupApp(page);

    // Navigate to Settings
    await navigateToView(page, "settings");
    await expect(page.locator("#settings-view-container")).toBeVisible({ timeout: 5000 });

    // Verify privacy card is reachable
    const privacyCard = page.locator("#settings-privacy-card");
    await expect(privacyCard).toBeVisible({ timeout: 5000 });
    await expect(privacyCard.getByText("Prywatność i zarządzanie urządzeniem")).toBeVisible();

    // Verify local device reset button is present
    const resetDeviceBtn = privacyCard.getByRole("button", { name: /Zresetuj urządzenie \/ Wyczyść dane lokalne/i });
    await expect(resetDeviceBtn).toBeVisible();

    // Click to open confirmation modal
    await resetDeviceBtn.click();

    // Verify confirmation modal opens with dangerous tone warning
    const confirmModal = page.getByRole("dialog");
    await expect(confirmModal).toBeVisible({ timeout: 5000 });
    await expect(confirmModal.getByText("Zresetować Saldo na tym urządzeniu?")).toBeVisible();

    // Cancel modal safely without executing destructive wipe
    const cancelBtn = confirmModal.getByRole("button", { name: "Anuluj" });
    await cancelBtn.click();
    await expect(confirmModal).not.toBeVisible();

    // Ensure settings page remains intact and active
    await expect(page.locator("#settings-view-container")).toBeVisible();
  });

  test("B. Settings Security Section: displays profile security configuration cards", async ({ page }) => {
    await setupApp(page);

    // Navigate to Settings
    await navigateToView(page, "settings");
    await expect(page.locator("#settings-view-container")).toBeVisible({ timeout: 5000 });

    // Verify security configuration card exists in settings
    const securityHeader = page.getByRole("heading", { name: /Zabezpieczenie aktywnego profilu|Prywatność/i });
    await expect(securityHeader.first()).toBeVisible({ timeout: 5000 });
  });
});
