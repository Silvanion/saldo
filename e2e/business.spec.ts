import { test, expect } from "@playwright/test";
import { setupApp } from "./helpers";

test.describe("Business E2E Critical Flows", () => {
  test("A. Add transaction: fills form, submits, and verifies item in list without duplicates", async ({ page }) => {
    await setupApp(page);

    // Navigate to transactions view
    await page.locator("#nav-transactions").click();
    await expect(page.locator("#tx-search-input")).toBeVisible({ timeout: 5000 });

    // Open add transaction modal
    await page.locator("#btn-quick-add-tx").click();
    const modalTitle = page.locator("#tx-modal-title");
    await expect(modalTitle).toBeVisible();

    // Fill form
    await page.locator("#input-tx-name").fill("E2E transakcja biznesowa");
    await page.locator("#input-tx-amount").fill("75");

    // Submit form
    await page.locator("#btn-tx-submit").click();

    // Verify modal is closed
    await expect(modalTitle).not.toBeVisible();

    // Verify transaction name is displayed in the active list
    const txNameItem = page.locator("#tx-table").getByText("E2E transakcja biznesowa");
    await expect(txNameItem).toBeVisible();

    // Verify amount is displayed
    const txAmountItem = page.locator("#tx-table").getByText(/75/);
    await expect(txAmountItem).toBeVisible();

    // Verify exactly one item was created (no duplicate)
    await expect(txNameItem).toHaveCount(1);
  });

  test("B. Add payment: fills form, submits, and verifies payment in list without duplicates", async ({ page }) => {
    await setupApp(page);

    // Navigate to payments view
    await page.locator("#nav-payments").click();
    await expect(page.locator("#btn-add-payment")).toBeVisible({ timeout: 5000 });

    // Open add payment modal
    await page.locator("#btn-add-payment").click();
    const paymentNameInput = page.locator("#input-payment-name");
    await expect(paymentNameInput).toBeVisible();

    // Fill form
    await paymentNameInput.fill("E2E rachunek biznesowy");
    await page.locator("#input-payment-amount").fill("120");

    // Submit form
    await page.locator("#btn-payment-submit").click();

    // Verify modal is closed
    await expect(paymentNameInput).not.toBeVisible();

    // Verify payment name is displayed in the list
    const paymentNameItem = page.locator("#payments-view-container").getByText("E2E rachunek biznesowy");
    await expect(paymentNameItem.first()).toBeVisible();

    // Verify amount is displayed
    const paymentAmountItem = page.locator("#payments-view-container").getByText(/120/);
    await expect(paymentAmountItem.first()).toBeVisible();

    // Verify exactly one item was created (no duplicate)
    await expect(paymentNameItem).toHaveCount(1);
  });

  test("C. Edit transaction: modifies existing transaction and verifies update without duplicates", async ({ page }) => {
    await setupApp(page);

    // Navigate to transactions view
    await page.locator("#nav-transactions").click();
    await expect(page.locator("#tx-search-input")).toBeVisible({ timeout: 5000 });

    // Seed transaction for editing
    await page.locator("#btn-quick-add-tx").click();
    await expect(page.locator("#input-tx-name")).toBeVisible({ timeout: 5000 });
    await page.locator("#input-tx-name").fill("E2E transakcja do edycji");
    await page.locator("#input-tx-amount").fill("50");
    await page.locator("#btn-tx-submit").click();
    await expect(page.locator("#tx-table").getByText("E2E transakcja do edycji")).toBeVisible();

    // Open edit modal for the transaction
    const editBtn = page.getByRole("button", { name: "Edytuj transakcję" }).first();
    await editBtn.click();

    // Verify form opened with existing data
    const nameInput = page.locator("#input-tx-name");
    await expect(nameInput).toHaveValue("E2E transakcja do edycji");

    // Update name and amount
    await nameInput.fill("E2E transakcja zmieniona");
    await page.locator("#input-tx-amount").fill("95");
    await page.locator("#btn-tx-submit").click();

    // Verify modal is closed
    await expect(nameInput).not.toBeVisible();

    // Verify updated name and amount are visible
    const updatedNameItem = page.locator("#tx-table").getByText("E2E transakcja zmieniona");
    await expect(updatedNameItem).toBeVisible();
    await expect(page.locator("#tx-table").getByText(/95/).first()).toBeVisible();

    // Verify original name is no longer present and no duplicate item was created
    await expect(page.locator("#tx-table").getByText("E2E transakcja do edycji")).toHaveCount(0);
    await expect(updatedNameItem).toHaveCount(1);
  });

  test("D. Profile isolation: ensures data created in profile 1 is isolated from profile 2", async ({ page }) => {
    await setupApp(page);

    // Navigate to transactions and create a distinct transaction in Profile 1
    await page.locator("#nav-transactions").click();
    await expect(page.locator("#tx-search-input")).toBeVisible({ timeout: 5000 });
    await page.locator("#btn-quick-add-tx").click();
    await expect(page.locator("#input-tx-name")).toBeVisible();
    await page.locator("#input-tx-name").fill("E2E Unikalna Transakcja Profilu 1");
    await page.locator("#input-tx-amount").fill("250");
    await page.locator("#btn-tx-submit").click();
    await expect(page.getByText("E2E Unikalna Transakcja Profilu 1").first()).toBeVisible();

    // Switch profile via header user menu
    await page.locator("#btn-top-user-menu").click();
    await page.locator("#btn-header-switch-profile").click();
    await expect(page.getByRole("heading", { name: "Wybierz profil do pracy" })).toBeVisible({ timeout: 5000 });

    // Create second profile
    const createProfileBtn = page.getByRole("button", { name: /Utwórz nowy profil/i });
    await createProfileBtn.click();
    await expect(page.locator("#input-profile-name")).toBeVisible();
    await page.locator("#input-profile-name").fill("Drugi Profil E2E");
    await page.getByRole("button", { name: "Utwórz profil" }).click();

    // Wait for shell in Profile 2
    await expect(page.locator("#app-root-shell")).toBeVisible({ timeout: 10000 });

    // Navigate to transactions in Profile 2
    await page.locator("#nav-transactions").click();
    await expect(page.locator("#tx-search-input")).toBeVisible({ timeout: 5000 });

    // Verify Profile 1's transaction is NOT visible in Profile 2
    await expect(page.getByText("E2E Unikalna Transakcja Profilu 1")).toHaveCount(0);

    // Switch back to Profile 1 via header user menu
    await page.locator("#btn-top-user-menu").click();
    await page.locator("#btn-header-switch-profile").click();
    await expect(page.getByRole("heading", { name: "Wybierz profil do pracy" })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /Testowy Profil E2E/i }).first().click();

    // Wait for shell in Profile 1
    await expect(page.locator("#app-root-shell")).toBeVisible({ timeout: 10000 });

    // Navigate to transactions in Profile 1
    await page.locator("#nav-transactions").click();
    await expect(page.locator("#tx-search-input")).toBeVisible({ timeout: 5000 });

    // Verify original transaction is still present in Profile 1
    await expect(page.getByText("E2E Unikalna Transakcja Profilu 1").first()).toBeVisible();
  });
});
