import { chromium } from "playwright";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

const TARGET_DIR = path.resolve(import.meta.dirname, "../public/assets/help");

async function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  console.log("Starting vite preview server...");
  const server: ChildProcess = spawn("npx", ["vite", "preview", "--port", "4173"], {
    stdio: "pipe",
    shell: true,
  });

  server.stdout?.on("data", (d) => console.log(`[preview] ${d}`));
  server.stderr?.on("data", (d) => console.error(`[preview error] ${d}`));

  // Wait for server to boot
  await wait(3000);

  console.log("Launching headless Chromium...");
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: "pl-PL",
    colorScheme: "dark",
  });

  const page = await context.newPage();

  try {
    console.log("Navigating to http://localhost:4173...");
    await page.goto("http://localhost:4173", { waitUntil: "networkidle" });

    // Click demo mode button
    const demoBtn = page.locator("#btn-onboarding-demo");
    if (await demoBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("Clicking demo mode button...");
      await demoBtn.click();
      await wait(1000);
    }

    // If on profile selection or creation
    const createBtn = page.getByRole("button", { name: /Utwórz nowy profil/i });
    if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createBtn.click();
      await page.locator("#input-profile-name").fill("Gospodarstwo Domowe");
      await page.getByRole("button", { name: "Utwórz profil" }).click();
      await wait(1000);
    }

    const targetProfileBtn = page.getByRole("button", { name: /Gospodarstwo Domowe|Jan Kowalski|Demo/i }).first();
    if (await targetProfileBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await targetProfileBtn.click();
      await wait(1000);
    }

    await page.waitForSelector("#app-root-shell", { timeout: 10000 });
    console.log("App loaded successfully!");

    // Helper for taking full-bleed crisp screenshot
    async function snap(filename: string) {
      const outPath = path.join(TARGET_DIR, filename);
      await page.screenshot({ path: outPath });
      console.log(`Saved screenshot: ${outPath}`);
    }

    // 1. Dashboard
    console.log("Capturing Dashboard...");
    await page.locator("#nav-dashboard").click();
    await wait(1500);
    await snap("02-dashboard.png");

    // 2. Budget
    console.log("Capturing Budget...");
    await page.locator("#nav-budget").click();
    await wait(1500);
    await snap("08-budget.png");

    // 3. Transactions
    console.log("Capturing Transactions...");
    await page.locator("#nav-transactions").click();
    await wait(1500);
    await snap("06-transactions.png");

    // 4. Debts (Hipoteka Pro)
    console.log("Capturing Debts / Hipoteka Pro...");
    await page.locator("#nav-debts").click();
    await wait(1500);
    await snap("10-debts.png");

    // 5. Debt Strategies Tab
    console.log("Capturing Debt Strategies...");
    const stratTab = page.locator("button:has-text('Kalkulator nadpłat'), button:has-text('Strategie')").first();
    if (await stratTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await stratTab.click();
      await wait(1000);
      await snap("14-debts-strategies.png");
    }

    // 6. Analysis
    console.log("Capturing Analysis...");
    await page.locator("#nav-analysis").click();
    await wait(1500);
    await snap("11-analysis.png");

    // 7. Settings
    console.log("Capturing Settings...");
    await page.locator("#nav-settings").click();
    await wait(1500);
    await snap("12-settings.png");

    // 8. AI Chat
    console.log("Capturing AI Chat...");
    const aiBtn = page.locator("#btn-open-ai-chat, button[title*='AI'], button:has-text('AI')").first();
    if (await aiBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await aiBtn.click();
      await wait(1000);
      await snap("05-ai-chat.png");
      const closeAi = page.locator("button:has-text('Zamknij'), button[aria-label='Zamknij']").first();
      if (await closeAi.isVisible().catch(() => false)) await closeAi.click();
    }

    // 9. Mobile Mockup
    console.log("Capturing Mobile viewport...");
    await context.close();
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 14 size
      deviceScaleFactor: 2,
      locale: "pl-PL",
      colorScheme: "dark",
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto("http://localhost:4173", { waitUntil: "networkidle" });
    const mobileDemo = mobilePage.locator("#btn-onboarding-demo");
    if (await mobileDemo.isVisible({ timeout: 5000 }).catch(() => false)) {
      await mobileDemo.click();
      await wait(1000);
    }
    const mobileProf = mobilePage.getByRole("button", { name: /Gospodarstwo Domowe|Jan Kowalski|Demo/i }).first();
    if (await mobileProf.isVisible({ timeout: 2000 }).catch(() => false)) {
      await mobileProf.click();
      await wait(1000);
    }
    await wait(2000);
    await mobilePage.screenshot({ path: path.join(TARGET_DIR, "mobile-dashboard.png") });
    console.log("Saved mobile-dashboard.png!");

    await mobileContext.close();
    console.log("All screenshots captured successfully!");
  } catch (err) {
    console.error("Screenshot capture failed:", err);
  } finally {
    await browser.close();
    server.kill();
    process.exit(0);
  }
}

main();
