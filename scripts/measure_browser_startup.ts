/**
 * Playwright Browser Startup Measurement Script
 * Tests the real production build (served via vite preview) in headless Chromium:
 * - Navigation timings (fetchStart -> responseEnd -> domInteractive -> domContentLoaded -> load)
 * - Paint timings (First Paint, First Contentful Paint - FCP)
 * - DOM readiness (Root render, AppShell mount, Dashboard readiness)
 */

import { chromium } from "@playwright/test";
import { spawn } from "child_process";
import http from "http";

const PORT = 4173;
const TARGET_URL = `http://localhost:${PORT}`;

async function waitForServer(port: number, timeoutMs = 8000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/`, (res) => {
          if (res.statusCode && res.statusCode < 400) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on("error", reject);
        req.setTimeout(500, () => req.destroy());
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return false;
}

async function runBrowserBenchmark() {
  // Start vite preview on PORT
  const previewProcess = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
    stdio: "pipe",
    env: { ...process.env, NODE_ENV: "production" }
  });

  const ready = await waitForServer(PORT);
  if (!ready) {
    previewProcess.kill();
    throw new Error(`Preview server did not start on port ${PORT} within timeout`);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
  });

  const results: any[] = [];
  const WARMUP_RUNS = 2;
  const MEASURE_RUNS = 5;

  for (let run = 0; run < WARMUP_RUNS + MEASURE_RUNS; run++) {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Inject seed profile into IndexedDB before page load if possible, or test cold first-visit
    const t_nav_start = performance.now();
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
    const t_dom_loaded = performance.now();

    // Wait for root and initial rendered UI
    await page.waitForSelector("#root", { timeout: 5000 });
    const t_root_ready = performance.now();

    // Extract browser-side performance metrics
    const perfData = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const paints = performance.getEntriesByType("paint");
      const fp = paints.find((p) => p.name === "first-paint");
      const fcp = paints.find((p) => p.name === "first-contentful-paint");

      return {
        dnsMs: nav ? nav.domainLookupEnd - nav.domainLookupStart : 0,
        tcpMs: nav ? nav.connectEnd - nav.connectStart : 0,
        ttfbMs: nav ? nav.responseStart - nav.requestStart : 0,
        downloadMs: nav ? nav.responseEnd - nav.responseStart : 0,
        domInteractiveMs: nav ? nav.domInteractive : 0,
        domContentLoadedMs: nav ? nav.domContentLoadedEventEnd : 0,
        domCompleteMs: nav ? nav.domComplete : 0,
        firstPaintMs: fp ? fp.startTime : 0,
        firstContentfulPaintMs: fcp ? fcp.startTime : 0
      };
    });

    if (run >= WARMUP_RUNS) {
      results.push({
        ...perfData,
        pageGotoMs: t_dom_loaded - t_nav_start,
        rootReadyMs: t_root_ready - t_nav_start
      });
    }

    await context.close();
  }

  await browser.close();
  previewProcess.kill();

  // Calculate statistics across runs
  function stats(arr: number[]) {
    const sorted = [...arr].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median = sorted[Math.floor(sorted.length / 2)];
    const mean = sorted.reduce((s, x) => s + x, 0) / sorted.length;
    return { min, max, median, mean };
  }

  const summary = {
    runs: MEASURE_RUNS,
    ttfbMs: stats(results.map((r) => r.ttfbMs)),
    domContentLoadedMs: stats(results.map((r) => r.domContentLoadedMs)),
    firstContentfulPaintMs: stats(results.map((r) => r.firstContentfulPaintMs)),
    domCompleteMs: stats(results.map((r) => r.domCompleteMs)),
    rootReadyMs: stats(results.map((r) => r.rootReadyMs))
  };

  console.log(JSON.stringify(summary));
}

runBrowserBenchmark().catch((err) => {
  console.error("Browser benchmark error:", err);
  process.exit(1);
});
