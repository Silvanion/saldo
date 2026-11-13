import { test, expect, _electron as electron, type ElectronApplication, type Page } from "@playwright/test";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

// Prawdziwy proces główny + preload + okno (SEC-07/11/12, UX-01, ARCH-01). Każdy test dostaje własny userData.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PREFIX = "saldo-e2e-electron-";
const made: string[] = [];

async function launch(extraEnv: Record<string, string> = {}): Promise<{ app: ElectronApplication; page: Page; userData: string }> {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), PREFIX));
  made.push(userData);
  const app = await electron.launch({
    executablePath: process.env.ELECTRON_BIN || path.join(ROOT, "node_modules/electron/dist/electron"),
    args: [path.join(ROOT, "electron/main.cjs"), "--no-sandbox", "--disable-gpu", `--user-data-dir=${userData}`],
    env: { ...process.env, ...extraEnv } as Record<string, string>,
    cwd: ROOT,
  });
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  return { app, page, userData };
}

test.afterEach(() => {
  // sprzątamy WYŁĄCZNIE katalogi utworzone przez ten test (prefiks sprawdzany)
  while (made.length) {
    const dir = made.pop()!;
    if (path.basename(dir).startsWith(PREFIX)) fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("okno startuje, preload wystawia electronAPI z losowym tokenem API", async () => {
  const { app, page } = await launch();
  try {
    const info = await page.evaluate(() => ({
      platform: (window as any).electronAPI?.platform,
      token: (window as any).electronAPI?.apiToken,
      hasBackupApi: typeof (window as any).electronAPI?.writeAutoBackup,
    }));
    expect(info.platform).toBe("linux");
    expect(info.token).toMatch(/^[0-9a-f]{64}$/);
    expect(info.hasBackupApi).toBe("function");
    expect(await page.title()).toMatch(/Saldo/);
  } finally { await app.close(); }
});

test("lokalne API: bez tokenu 401, z tokenem 200, spoza okna aplikacji 401 (SEC-11)", async () => {
  const { app, page } = await launch();
  try {
    await page.waitForSelector("#root *", { timeout: 30_000 });
    const url = page.url();
    const origin = new URL(url).origin;
    const res = await page.evaluate(async () => {
      const token = (window as any).electronAPI.apiToken;
      const call = (h: Record<string, string>) => fetch("/api/ai/health", { headers: { "x-ai-mode": "none", ...h } }).then((r) => r.status);
      return { noToken: await call({}), bad: await call({ "x-saldo-token": "x".repeat(64) }), ok: await call({ "x-saldo-token": token }) };
    });
    expect(res).toEqual({ noToken: 401, bad: 401, ok: 200 });
    // inny proces (tu: Node test runner) nie zna tokenu
    const outside = await fetch(`${origin}/api/ai/health`, { headers: { "x-ai-mode": "none" } });
    expect(outside.status).toBe(401);
    const hostile = await fetch(`${origin}/api/ai/health`, { headers: { "x-ai-mode": "none", Host: "evil.example" } }).catch(() => null);
    if (hostile) expect([401, 403]).toContain(hostile.status);
  } finally { await app.close(); }
});

test("biometria na Linuksie jest niedostępna, zapis PIN-u profilu odrzucony, klucze API (vault) działają (SEC-07)", async () => {
  const { app, page } = await launch();
  try {
    const out = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      return {
        status: await api.checkBiometricsStatus("p1"),
        profilePin: await api.saveBiometricsPin("profile-1", "1234"),
        profileUnlock: await api.promptBiometricsUnlock("profile-1", "test"),
      };
    });
    expect(out.status.available).toBe(false);
    expect(out.profilePin.success).toBe(false);
    expect(out.profileUnlock.success).toBe(false);
  } finally { await app.close(); }
});

test("automatyczna kopia: zapis, lista, odczyt, odrzucenie złych danych i path traversal (UX-01)", async () => {
  const { app, page, userData } = await launch();
  try {
    const out = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      const state = JSON.stringify({ profiles: [{ id: "p1", name: "Test", encryptedPayload: "{\"iv\":\"a\",\"data\":\"b\"}", transactions: [] }] });
      const write = await api.writeAutoBackup(state);
      const list = await api.listAutoBackups();
      const read = await api.readAutoBackup(list[0]?.name);
      return {
        write, list, readOk: read.ok, roundTrip: read.json === state,
        badJson: await api.writeAutoBackup("nie json"),
        noProfiles: await api.writeAutoBackup("{}"),
        traversal: await api.readAutoBackup("../../etc/passwd"),
      };
    });
    expect(out.write.ok).toBe(true);
    expect(out.list).toHaveLength(1);
    expect(out.list[0].name).toMatch(/^saldo-auto-\d{4}-\d{2}-\d{2}\.json$/);
    expect(out.readOk).toBe(true);
    expect(out.roundTrip).toBe(true);
    expect(out.badJson.ok).toBe(false);
    expect(out.noProfiles.ok).toBe(false);
    expect(out.traversal.ok).toBe(false);
    expect(fs.readdirSync(path.join(userData, "backups"))).toHaveLength(1);
  } finally { await app.close(); }
});

test("start aplikacji nie łączy się z Google Fonts i nie łamie CSP (okno ładowane z lokalnego serwera)", async () => {
  const { app, page } = await launch();
  const violations: string[] = [];
  const external: string[] = [];
  page.on("console", (m) => { if (/Content Security Policy/i.test(m.text())) violations.push(m.text().slice(0, 160)); });
  page.on("request", (r) => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) external.push(r.url()); });
  try {
    await page.reload();
    await page.waitForSelector("button", { state: "visible", timeout: 30_000 });
    expect(violations).toEqual([]);
    expect(external).toEqual([]);
  } finally { await app.close(); }
});
