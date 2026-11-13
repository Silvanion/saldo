import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// PWA offline na buildzie produkcyjnym (PERF-03): app shell z precache działa bez sieci, a ciężkie leniwe
// paczki (PDF/canvas), usunięte z precache, trafiają do cache przy pierwszym użyciu i są wtedy dostępne offline.
const assetsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/assets");
const lazyAsset = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).find((f) => /^vendor-jspdf-.*\.js$/.test(f)) : undefined;

test("aplikacja uruchamia się offline z precache po pierwszej wizycie", async ({ page, context }) => {
  await page.goto("/");
  await page.waitForSelector("button", { state: "visible" });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload(); // po reload strona jest kontrolowana przez service worker
  await page.waitForSelector("button", { state: "visible" });
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector("button", { state: "visible", timeout: 15_000 });
  await context.setOffline(false);
});

test("leniwa paczka PDF nie jest w precache, ale po pierwszym użyciu działa offline", async ({ page, context }) => {
  test.skip(!lazyAsset, "brak dist/assets/vendor-jspdf-*.js — uruchom npm run build");
  await page.goto("/");
  await page.waitForSelector("button", { state: "visible" });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForSelector("button", { state: "visible" });

  const precached = await page.evaluate(async (name) => {
    const names = await caches.keys();
    for (const n of names.filter((k) => k.includes("precache"))) {
      const keys = await (await caches.open(n)).keys();
      if (keys.some((r) => r.url.includes(name))) return true;
    }
    return false;
  }, lazyAsset!);
  expect(precached).toBe(false);

  const url = `/assets/${lazyAsset}`;
  expect((await page.evaluate((u) => fetch(u).then((r) => r.status), url))).toBe(200); // pierwsze użycie online → cache
  await page.waitForTimeout(500);
  await context.setOffline(true);
  expect((await page.evaluate((u) => fetch(u).then((r) => r.status), url))).toBe(200); // offline z cache
  await context.setOffline(false);
});
