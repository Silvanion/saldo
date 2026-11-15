import { test, expect } from "@playwright/test";
import { setupApp, navigateToView } from "../e2e/helpers";
// Przechodzi całą aplikację na buildzie produkcyjnym i wymaga zera naruszeń CSP oraz błędów strony
// (SEC-13: script-src bez unsafe-inline).
test("brak naruszeń CSP w głównych widokach i oknach", async ({ page }) => {
  const v: string[] = [];
  page.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) v.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => v.push("pageerror: " + e.message.slice(0, 160)));
  await setupApp(page);
  for (const view of ["dashboard","transactions","payments","budget","goals","analysis","debts","settings","help"] as const) { await navigateToView(page, view); await page.waitForTimeout(300); }
  await page.locator("#btn-open-command-palette").click(); await page.waitForTimeout(300); await page.keyboard.press("Escape");
  await page.locator("#btn-open-ai-chat").click(); await page.waitForTimeout(300); await page.keyboard.press("Escape");
  expect(v).toEqual([]);
});
