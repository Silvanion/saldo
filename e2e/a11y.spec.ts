import { test, expect, Page } from "@playwright/test";

async function setupApp(page: Page) {
  await page.goto("/");
  const offlineBtn = page.getByRole("button", { name: /Używaj offline/i });
  if (await offlineBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await offlineBtn.click();
  }

  // If prompted to create initial profile:
  const createProfilePromptBtn = page.getByRole("button", { name: /Utwórz nowy profil/i });
  if (await createProfilePromptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await createProfilePromptBtn.click();
  }

  const profileNameInput = page.locator("#input-profile-name");
  if (await profileNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await profileNameInput.fill("Testowy Profil E2E");
    await page.getByRole("button", { name: "Utwórz profil" }).click();
  }

  await expect(page.locator("#app-root-shell")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("#nav-dashboard")).toBeVisible({ timeout: 10000 });
}

test.describe("Accessibility (A11y) Critical Flows", () => {
  test("A. Skip link: allows keyboard users to bypass navigation directly to main content", async ({ page }) => {
    await setupApp(page);

    // Focus the skip link directly to test keyboard visibility and activation
    const skipLink = page.getByRole("link", { name: "Przejdź do głównej treści" });
    await skipLink.focus();

    // When focused, skip link must be visible and focused
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toBeFocused();

    // Pressing Enter activates the link and focuses #main-content
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("B. Transactions view: delete confirmation inline dialog traps focus and closes with Escape", async ({ page }) => {
    await setupApp(page);

    // Navigate to transactions view
    await page.locator("#nav-transactions").click();
    await expect(page.locator("#tx-search-input")).toBeVisible({ timeout: 5000 });

    // Ensure at least one transaction exists
    const deleteButtons = page.locator('button[id^="btn-delete-tx-"]');
    if ((await deleteButtons.count()) === 0) {
      await page.locator("#btn-quick-add-tx").click();
      await expect(page.locator("#input-tx-name")).toBeVisible({ timeout: 5000 });
      await page.locator("#input-tx-name").fill("Testowa transakcja E2E");
      await page.locator("#input-tx-amount").fill("50");
      await page.locator("#btn-tx-submit").click();
      await expect(deleteButtons.first()).toBeVisible({ timeout: 5000 });
    }

    // Open inline delete confirmation dialog
    await deleteButtons.first().click();

    // Verify dialog semantics
    const dialog = page.locator('div[role="dialog"][aria-labelledby="delete-tx-title"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");

    // Verify focus is trapped inside dialog
    await page.keyboard.press("Tab");
    const isInsideDialog = await page.evaluate(() => {
      const dialogEl = document.querySelector('div[role="dialog"][aria-labelledby="delete-tx-title"]');
      return Boolean(dialogEl && dialogEl.contains(document.activeElement));
    });
    expect(isInsideDialog).toBe(true);

    // Verify Escape key closes dialog
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("C. Payments view: delete confirmation inline dialog traps focus and closes with Escape", async ({ page }) => {
    await setupApp(page);

    // Navigate to payments view
    await page.locator("#nav-payments").click();

    // Ensure at least one payment exists
    const deleteButtons = page.locator('button[id^="btn-delete-payment-"]');
    if ((await deleteButtons.count()) === 0) {
      await page.locator("#btn-add-payment").click();
      await expect(page.locator("#input-payment-name")).toBeVisible({ timeout: 5000 });
      await page.locator("#input-payment-name").fill("Testowy rachunek E2E");
      await page.locator("#input-payment-amount").fill("120");
      await page.locator("#btn-payment-submit").click();
      await expect(deleteButtons.first()).toBeVisible({ timeout: 5000 });
    }

    // Open inline delete confirmation dialog
    await deleteButtons.first().click();

    // Verify dialog semantics
    const dialog = page.locator('div[role="dialog"][aria-labelledby="delete-payment-title"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");

    // Verify focus is trapped inside dialog
    await page.keyboard.press("Tab");
    const isInsideDialog = await page.evaluate(() => {
      const dialogEl = document.querySelector('div[role="dialog"][aria-labelledby="delete-payment-title"]');
      return Boolean(dialogEl && dialogEl.contains(document.activeElement));
    });
    expect(isInsideDialog).toBe(true);

    // Verify Escape key closes dialog
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("D. Dashboard: customizer modal has dialog semantics, traps focus, and closes with Escape", async ({ page }) => {
    await setupApp(page);

    // Navigate to dashboard view
    await page.locator("#nav-dashboard").click();

    // Open customizer
    const customizeBtn = page.getByRole("button", { name: "Dostosuj układ ekranu głównego" });
    await expect(customizeBtn).toBeVisible({ timeout: 5000 });
    await customizeBtn.click();

    // Verify dialog semantics
    const dialog = page.locator('div[role="dialog"][aria-labelledby="dashboard-customizer-title"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");

    // Verify focus is trapped inside dialog
    await page.keyboard.press("Tab");
    const isInsideDialog = await page.evaluate(() => {
      const dialogEl = document.querySelector('div[role="dialog"][aria-labelledby="dashboard-customizer-title"]');
      return Boolean(dialogEl && dialogEl.contains(document.activeElement));
    });
    expect(isInsideDialog).toBe(true);

    // Verify Escape key closes dialog
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});
