import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// PERF-04: serwer produkcyjny kompresuje zasoby (samodzielny hosting nie ma kompresji Firebase Hosting).
const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/assets");
const mainJs = fs.existsSync(assets) ? fs.readdirSync(assets).find((f) => /^index-.*\.js$/.test(f)) : undefined;

test("główny pakiet JS i index.html są serwowane skompresowane", async ({ request }) => {
  test.skip(!mainJs, "brak dist/assets — uruchom npm run build");
  const js = await request.get(`/assets/${mainJs}`, { headers: { "accept-encoding": "gzip" } });
  expect(js.headers()["content-encoding"]).toBe("gzip");
  expect(Number(js.headers()["content-length"] || 0)).toBeLessThan(fs.statSync(path.join(assets, mainJs!)).size / 2);
  const html = await request.get("/", { headers: { "accept-encoding": "gzip" } });
  expect(html.headers()["content-encoding"]).toBe("gzip");
});
