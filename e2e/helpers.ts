import { Page, expect } from "@playwright/test";

export type E2EView = 
  | "dashboard" 
  | "transactions" 
  | "payments" 
  | "budget" 
  | "goals" 
  | "analysis" 
  | "debts"
  | "settings" 
  | "help";

export async function setupApp(page: Page, options?: { profileName?: string }) {
  await page.goto("/");

  const offlineBtn = page.getByRole("button", { name: /Używaj offline/i });
  await expect(offlineBtn).toBeVisible({ timeout: 15000 });
  await offlineBtn.click();

  // Check if we are on "Rozpocznij z Saldo" (0 profiles) or "Wybierz profil do pracy" (>0 profiles)
  const createProfilePromptBtn = page.getByRole("button", { name: /Utwórz nowy profil/i });
  const profileSelectionHeading = page.getByRole("heading", { name: "Wybierz profil do pracy" });

  await Promise.race([
    createProfilePromptBtn.waitFor({ state: "visible", timeout: 10000 }).catch(() => null),
    profileSelectionHeading.waitFor({ state: "visible", timeout: 10000 }).catch(() => null),
  ]);

  if (await createProfilePromptBtn.isVisible()) {
    await createProfilePromptBtn.click();
    const profileNameInput = page.locator("#input-profile-name");
    await expect(profileNameInput).toBeVisible({ timeout: 5000 });
    await profileNameInput.fill(options?.profileName || "Testowy Profil E2E");
    await page.getByRole("button", { name: "Utwórz profil" }).click();
  } else if (await profileSelectionHeading.isVisible()) {
    const targetProfileBtn = page.getByRole("button", { name: options?.profileName || /Testowy Profil E2E/i }).first();
    if (await targetProfileBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await targetProfileBtn.click();
    } else {
      const anyProfileBtn = page.locator("div.grid button").first();
      await expect(anyProfileBtn).toBeVisible({ timeout: 5000 });
      await anyProfileBtn.click();
    }
  }

  await expect(page.locator("#app-root-shell")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("#nav-dashboard")).toBeVisible({ timeout: 15000 });
}

export async function navigateToView(page: Page, view: E2EView, options?: { tab?: string }) {
  const navBtn = page.locator(`#nav-${view}`);
  await expect(navBtn).toBeVisible({ timeout: 10000 });
  await navBtn.click();

  if (view === "settings" && options?.tab) {
    const tabBtn = page.locator(`#btn-settings-tab-${options.tab}`);
    await expect(tabBtn).toBeVisible({ timeout: 5000 });
    await tabBtn.click();
  }
}
