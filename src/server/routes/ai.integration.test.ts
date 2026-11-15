// @vitest-environment node
import express from "express";
import http from "http";
import type { AddressInfo } from "net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Integracja BEZ mockowania providera: prawdziwy router /api/ai + prawdziwy LocalProvider rozmawiają po HTTP
// z atrapą Ollamy (prawdziwej Ollamy ani modelu nie da się tu zainstalować). Istniejące testy tras mockują providera w całości.
let fake: http.Server; let fakeUrl: string; let app: http.Server; let appUrl: string;
let generateReply: unknown = { reply: "domyślna odpowiedź" };
let generateStatus = 200;
const received: Array<{ path: string; body: any }> = [];

const readBody = (req: http.IncomingMessage) => new Promise<string>((resolve) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => resolve(d)); });

beforeAll(async () => {
  fake = http.createServer(async (req, res) => {
    const raw = await readBody(req);
    received.push({ path: req.url || "", body: raw ? JSON.parse(raw) : null });
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/api/tags") return res.end(JSON.stringify({ models: [{ name: "fake:1b", capabilities: ["completion", "vision"] }] }));
    if (req.url === "/api/show") return res.end(JSON.stringify({ capabilities: ["vision"] }));
    if (req.url === "/api/generate") {
      res.statusCode = generateStatus;
      return res.end(JSON.stringify({ response: typeof generateReply === "string" ? generateReply : JSON.stringify(generateReply) }));
    }
    res.statusCode = 404; res.end("{}");
  });
  await new Promise<void>((r) => fake.listen(0, "127.0.0.1", () => r()));
  fakeUrl = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;

  const { default: aiRouter } = await import("./ai");
  const server = express();
  server.use(express.json({ limit: "5mb" }));
  server.use("/api/ai", aiRouter);
  app = http.createServer(server);
  await new Promise<void>((r) => app.listen(0, "127.0.0.1", () => r()));
  appUrl = `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
});
afterAll(async () => { await Promise.all([new Promise((r) => fake.close(r)), new Promise((r) => app.close(r))]); });
beforeEach(() => { received.length = 0; generateReply = { reply: "domyślna odpowiedź" }; generateStatus = 200; });

const call = (route: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${appUrl}/api/ai/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ai-mode": "local", "x-ai-local-endpoint": `${fakeUrl}/api/generate`, ...headers },
    body: JSON.stringify(body)
  });

describe("/api/ai z lokalnym modelem (atrapa Ollamy po HTTP)", () => {
  it("health: wykrywa modele i obsługę obrazów", async () => {
    const r = await fetch(`${appUrl}/api/ai/health`, { headers: { "x-ai-mode": "local", "x-ai-local-endpoint": `${fakeUrl}/api/generate` } });
    const j = await r.json();
    expect(r.status).toBe(200);
    expect(j.status).toBe("ok");
    expect(j.models.map((m: any) => m.name)).toEqual(["fake:1b"]);
    expect(j.selectedModelVisionAvailable).toBe(true);
  });

  it("health: niedostępna Ollama daje czytelny błąd 503, nie awarię serwera", async () => {
    const r = await fetch(`${appUrl}/api/ai/health`, { headers: { "x-ai-mode": "local", "x-ai-local-endpoint": "http://127.0.0.1:1/api/generate" } });
    expect(r.status).toBe(503);
  });

  it("chat: odpowiedź modelu trafia do klienta, a żądanie do Ollamy ma właściwy kształt (model wykryty, stream:false, format json)", async () => {
    generateReply = { reply: "Cześć z atrapy" };
    const r = await call("chat", { message: "Cześć" });
    expect(r.status).toBe(200);
    expect((await r.json()).reply).toBe("Cześć z atrapy");
    const gen = received.find((x) => x.path === "/api/generate")!.body;
    expect(gen).toMatchObject({ model: "fake:1b", stream: false, format: "json" });
    expect(typeof gen.prompt).toBe("string");
  });

  it("chat: akcja modelu o złym kształcie jest odrzucana, odpowiedź tekstowa zostaje (granica przed prompt injection)", async () => {
    generateReply = { reply: "Dodam wydatek", action: { type: "addTransaction", payload: { amount: -5, name: "x" } } };
    const j = await (await call("chat", { message: "dodaj wydatek" })).json();
    expect(j.reply).toBe("Dodam wydatek");
    expect(j.action).toBeNull();
  });

  it("chat: poprawna akcja przechodzi walidację", async () => {
    generateReply = { reply: "Dodaję", action: { type: "addTransaction", payload: { name: "Kawa", amount: 12, type: "expense" } } };
    const j = await (await call("chat", { message: "kawa 12 zł" })).json();
    expect(j.action).toMatchObject({ type: "addTransaction", payload: { name: "Kawa", amount: 12 } });
  });

  it("odpowiedź modelu niebędąca JSON-em nie wywraca serwera (500 z komunikatem, kolejne żądanie działa)", async () => {
    generateReply = "to nie jest json {{{";
    const bad = await call("chat", { message: "hej" });
    expect([500, 502]).toContain(bad.status);
    generateReply = { reply: "wracam" };
    expect((await call("chat", { message: "hej" })).status).toBe(200);
  });

  it("błąd HTTP z Ollamy jest zgłaszany jako błąd silnika AI", async () => {
    generateStatus = 500;
    const r = await call("chat", { message: "hej" });
    expect(r.status).toBe(500);
    expect((await r.json()).error).toMatch(/AI/);
  });

  it("endpoint spoza pętli zwrotnej jest blokowany (SSRF) i nigdy nie dociera do atrapy", async () => {
    const r = await call("chat", { message: "hej" }, { "x-ai-local-endpoint": "http://169.254.169.254/latest/meta-data" });
    expect(r.status).toBe(403);
    expect(received).toHaveLength(0);
  });

  it("walidacja wejścia: za długa wiadomość i brak pola → 400", async () => {
    expect((await call("chat", { message: "x".repeat(5001) })).status).toBe(400);
    expect((await call("chat", {})).status).toBe(400);
  });
});
