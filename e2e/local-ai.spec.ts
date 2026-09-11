import { test, expect } from "@playwright/test";
import { setupApp, navigateToView } from "./helpers";

const ollamaTags = {
  models: [{ name: "qwen2.5:7b", size: 100, capabilities: ["completion"] }]
};

test.describe("Local AI E2E Flows", () => {
  test("A. Settings: tests a configured Ollama connection", async ({ page }) => {
    await page.route("http://localhost:11434/api/tags", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ollamaTags) });
    });

    await setupApp(page);
    await navigateToView(page, "settings");
    await page.locator("#toggle-local-ai").click();
    await expect(page.locator("#input-local-ai-model")).toHaveValue("qwen2.5:7b");

    await page.locator("#btn-test-local-ai").click();
    await expect(page.getByText("Połączenie udane! Lokalny model odpowiada prawidłowo.")).toBeVisible();
  });

  test("A2. Settings: detects and selects an Ollama model", async ({ page }) => {
    await page.route("http://localhost:11434/api/tags", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ models: [{ name: "gemma4:12b-mlx", size: 200, capabilities: ["completion", "vision"] }] })
      });
    });

    await setupApp(page);
    await navigateToView(page, "settings");
    await page.locator("#toggle-local-ai").click();
    await page.locator("#btn-detect-local-ai-models").click();
    await expect(page.getByRole("button", { name: /gemma4:12b-mlx.*vision/i })).toBeVisible();
    await expect(page.getByText("Wybrany model obsługuje obrazy i OCR skanów PDF.")).toBeVisible();
  });

  test("B. Import: local AI extracts transactions and opens the review", async ({ page }) => {
    await page.route("http://localhost:11434/api/generate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          response: JSON.stringify([{
            name: "Biedronka E2E AI",
            amount: 25.5,
            type: "expense",
            isoDate: "2026-09-11"
          }])
        })
      });
    });

    await setupApp(page);
    await navigateToView(page, "settings");
    await page.locator("#toggle-local-ai").click();
    await navigateToView(page, "transactions");
    await page.locator("#btn-import-csv").click();

    const dialog = page.getByRole("dialog", { name: "Import historii transakcji bankowych" });
    await dialog.getByRole("button", { name: /Wklej tekst wyciągu/i }).click();
    await dialog.getByPlaceholder(/Wklej historię transakcji z banku/i).fill(
      "2026-09-11; Biedronka E2E AI; -25,50"
    );
    await dialog.getByRole("button", { name: /Spróbuj z lokalnym AI/i }).click();

    await expect(dialog.getByText("Biedronka E2E AI")).toBeVisible({ timeout: 15000 });
    await expect(dialog.getByText("Do zaimportowania")).toBeVisible();
  });

  test("C. Import: reports when Ollama is unavailable", async ({ page }) => {
    await page.route("http://localhost:11434/api/generate", async (route) => {
      await route.abort("failed");
    });

    await setupApp(page);
    await navigateToView(page, "settings");
    await page.locator("#toggle-local-ai").click();
    await navigateToView(page, "transactions");
    await page.locator("#btn-import-csv").click();

    const dialog = page.getByRole("dialog", { name: "Import historii transakcji bankowych" });
    await dialog.getByRole("button", { name: /Wklej tekst wyciągu/i }).click();
    await dialog.getByPlaceholder(/Wklej historię transakcji z banku/i).fill(
      "2026-09-11; Niedostępne AI; -10,00"
    );
    await dialog.getByRole("button", { name: /Spróbuj z lokalnym AI/i }).click();

    await expect(dialog.getByText("Nie udało się połączyć z lokalnym AI")).toBeVisible({ timeout: 15000 });
  });

  test("D. Invoice scan: clearly requires cloud AI when local mode is active", async ({ page }) => {
    await setupApp(page);
    await navigateToView(page, "settings");
    await page.locator("#toggle-local-ai").click();
    await navigateToView(page, "payments");
    await page.getByRole("button", { name: /Dodaj.*płatność|Dodaj.*rachunek/i }).first().click();

    const dialog = page.getByRole("dialog", { name: /Dodaj rachunek/i });
    const invoiceInput = dialog.locator('input[type="file"]');
    await invoiceInput.setInputFiles({
      name: "invoice.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake invoice")
    });

    await expect(dialog.getByText("Skanowanie faktur wymaga trybu chmurowego AI (Gemini).")).toBeVisible();
    await expect(dialog.locator("#input-payment-name")).toHaveValue("");
  });
});
