import { test, expect } from "@playwright/test";

const isCspViolation = (text: string) => /Content Security Policy|Refused to connect/i.test(text);

test.describe("CSP na buildzie produkcyjnym", () => {
  test("start aplikacji nie generuje naruszeń CSP", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => { if (isCspViolation(m.text())) violations.push(m.text()); });
    await page.goto("/");
    await page.waitForSelector("button", { state: "visible" });
    expect(violations).toEqual([]);
  });

  test("start nie łączy się z Google Fonts (czcionka serwowana lokalnie) i ładuje polskie znaki", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (r) => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) external.push(r.url()); });
    await page.goto("/");
    await page.waitForSelector("button", { state: "visible" });
    await page.evaluate(async () => { await document.fonts.load("400 16px 'IBM Plex Sans'", "ąćęłńóśźż"); });
    expect(external).toEqual([]);
    expect(await page.evaluate(() => document.fonts.check("400 16px 'IBM Plex Sans'", "ąćęłńóśźż"))).toBe(true);
  });

  // Połączenia, które aplikacja wykonuje z renderera. Sieć może być niedostępna —
  // liczy się wyłącznie to, że CSP ich nie blokuje.
  const allowed = [
    "https://api.anthropic.com/v1/messages",
    "https://generativelanguage.googleapis.com/v1beta/models/x:generateContent",
    "https://api.nbp.pl/api/exchangerates/tables/A/?format=json",
    "http://localhost:11434/api/tags",
  ];
  for (const url of allowed) {
    test(`CSP zezwala na ${new URL(url).host}`, async ({ page }) => {
      const violations: string[] = [];
      page.on("console", (m) => { if (isCspViolation(m.text())) violations.push(m.text()); });
      await page.goto("/");
      await page.evaluate((u) => fetch(u, { method: "POST", body: "{}" }).catch(() => undefined), url);
      await page.waitForTimeout(200);
      expect(violations).toEqual([]);
    });
  }

  test("CSP nadal blokuje nieznane hosty", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => { if (isCspViolation(m.text())) violations.push(m.text()); });
    await page.goto("/");
    await page.evaluate(() => fetch("https://example.invalid/x").catch(() => undefined));
    await page.waitForTimeout(200);
    expect(violations.length).toBeGreaterThan(0);
  });
});
