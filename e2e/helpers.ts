import { Page, expect } from "@playwright/test";

export async function setupApp(page: Page) {
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
