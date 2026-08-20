import { test, expect } from "@playwright/test";
import { setupApp, navigateToView } from "./helpers";

test.describe("Cashflow Forecast 30/60/90 Days E2E Flows", () => {
  test("A. Navigates to Analysis view, verifies cashflow forecast section and toggles horizons", async ({ page }) => {
    await setupApp(page, { profileName: "Forecast Test Profile" });

    // Navigate to Analysis view
    await navigateToView(page, "analysis");

    // Verify Cashflow Forecast card
    const forecastCard = page.locator("#cashflow-forecast-card");
    await expect(forecastCard).toBeVisible({ timeout: 10000 });

    // Verify Section Title and Trajectory SVG
    await expect(forecastCard.getByText("Prognoza Cashflow & Płynności")).toBeVisible();
    await expect(forecastCard.getByText("Trajektoria salda gotówkowego")).toBeVisible();

    // Verify KPI indicators
    await expect(page.locator("#kpi-projected-balance")).toBeVisible();
    await expect(page.locator("#kpi-lowest-balance")).toBeVisible();
    await expect(page.locator("#kpi-risk-days")).toBeVisible();
    await expect(page.locator("#kpi-total-outflows")).toBeVisible();

    // Verify 30d default tab is selected
    const tab30 = page.locator("#btn-horizon-30");
    await expect(tab30).toHaveAttribute("aria-selected", "true");

    // Switch to 60 days
    const tab60 = page.locator("#btn-horizon-60");
    await tab60.click();
    await expect(tab60).toHaveAttribute("aria-selected", "true");
    await expect(tab30).toHaveAttribute("aria-selected", "false");

    // Switch to 90 days
    const tab90 = page.locator("#btn-horizon-90");
    await tab90.click();
    await expect(tab90).toHaveAttribute("aria-selected", "true");
    await expect(tab60).toHaveAttribute("aria-selected", "false");
  });
});
