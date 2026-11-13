import { test, expect, chromium } from "@playwright/test";
import { spawn, spawnSync, type ChildProcess } from "child_process";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";

// Spakowana aplikacja (electron-builder --dir): sprawdza, że fuses (SEC-12) naprawdę weszły do binarki
// i że aplikacja z nimi startuje. Wymaga SALDO_PACKAGED_BIN=<ścieżka do wykonywalnego pliku Saldo>.
// Z fuse'em --inspect wyłączonym Playwright nie może użyć _electron.launch, więc łączymy się przez CDP.
const BIN = process.env.SALDO_PACKAGED_BIN;
const require = createRequire(import.meta.url);
const PREFIX = "saldo-e2e-packaged-";
const made: string[] = [];

test.skip(!BIN || !fs.existsSync(BIN || ""), "ustaw SALDO_PACKAGED_BIN na spakowany plik wykonywalny (electron-builder --dir)");

test.afterEach(() => {
  while (made.length) {
    const dir = made.pop()!;
    if (path.basename(dir).startsWith(PREFIX)) fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});

test("fuses: RunAsNode, NODE_OPTIONS i --inspect są wyłączone w binarce", async () => {
  const { getCurrentFuseWire, FuseV1Options } = require("@electron/fuses");
  const wire = await getCurrentFuseWire(BIN!);
  const DISABLED = 0x30;
  expect(wire[FuseV1Options.RunAsNode]).toBe(DISABLED);
  expect(wire[FuseV1Options.EnableNodeOptionsEnvironmentVariable]).toBe(DISABLED);
  expect(wire[FuseV1Options.EnableNodeCliInspectArguments]).toBe(DISABLED);
});

test("ELECTRON_RUN_AS_NODE nie zamienia aplikacji w interpreter Node", () => {
  const r = spawnSync(BIN!, ["--no-sandbox", "-e", "console.log('RAN_AS_NODE_MARKER')"], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }, timeout: 10_000, encoding: "utf8",
  });
  expect(`${r.stdout}${r.stderr}`).not.toContain("RAN_AS_NODE_MARKER");
});

test("spakowana aplikacja startuje z fuses, ładuje UI i ma działające IPC (preload, token, kopia)", async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), PREFIX));
  made.push(userData);
  const child: ChildProcess = spawn(BIN!, ["--no-sandbox", "--disable-gpu", "--remote-debugging-port=0", `--user-data-dir=${userData}`], { stdio: ["ignore", "pipe", "pipe"], detached: true });
  try {
    const wsUrl = await new Promise<string>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("brak DevTools w 40 s")), 40_000);
      const onData = (b: Buffer) => { const m = /DevTools listening on (ws:\/\/\S+)/.exec(b.toString()); if (m) { clearTimeout(t); resolve(m[1]); } };
      child.stderr!.on("data", onData); child.stdout!.on("data", onData);
      child.on("exit", (c) => { clearTimeout(t); reject(new Error("aplikacja zakończyła się kodem " + c)); });
    });
    const browser = await chromium.connectOverCDP(wsUrl);
    const page = browser.contexts()[0].pages().find((p) => p.url().startsWith("http")) ?? (await browser.contexts()[0].waitForEvent("page"));
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#root *", { timeout: 30_000 });
    const out = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      return {
        token: api?.apiToken,
        write: await api.writeAutoBackup(JSON.stringify({ profiles: [{ id: "p", name: "x", transactions: [] }] })),
        api401: await fetch("/api/ai/health", { headers: { "x-ai-mode": "none" } }).then((r) => r.status),
        apiOk: await fetch("/api/ai/health", { headers: { "x-ai-mode": "none", "x-saldo-token": api.apiToken } }).then((r) => r.status),
      };
    });
    expect(out.token).toMatch(/^[0-9a-f]{64}$/);
    expect(out.write.ok).toBe(true);
    expect(out.api401).toBe(401);
    expect(out.apiOk).toBe(200);
    expect(fs.readdirSync(path.join(userData, "backups"))).toHaveLength(1);
    await browser.close();
  } finally {
    // Zabijamy całą grupę procesów (procesy pomocnicze Chromium nadal zapisują do user-data-dir).
    try { process.kill(-child.pid!, "SIGKILL"); } catch { child.kill("SIGKILL"); }
    await new Promise((r) => setTimeout(r, 500));
  }
});
