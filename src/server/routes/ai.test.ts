import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

const parseStatementImage = vi.fn();
const verifyFirebaseToken = vi.fn((_req: unknown, _res: unknown, next: () => void) => next());
let provider: Record<string, unknown> = { parseStatementImage };

vi.mock("../middleware/auth", () => ({
  verifyFirebaseToken
}));
vi.mock("../middleware/security", () => {
  const passThrough = (_req: unknown, _res: unknown, next: () => void) => next();
  return {
    cloudAiRateLimiter: passThrough,
    localAiRateLimiter: passThrough,
    noAiRateLimiter: passThrough,
    aiPayloadLimiter: passThrough,
    identifyUser: passThrough
  };
});
vi.mock("../services/aiService", () => ({ logCostMetric: vi.fn() }));
vi.mock("../ai/createAiProvider", () => ({
  createAiProvider: () => provider
}));

const createTestServer = async () => {
  const { default: aiRouter } = await import("./ai");
  const app = express();
  app.use(express.json());
  app.use("/api/ai", aiRouter);
  return new Promise<{ server: ReturnType<typeof app.listen>; url: string }>((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Test server did not start.");
      resolve({ server, url: `http://127.0.0.1:${address.port}` });
    });
  });
};

describe("POST /api/ai/parse-statement-image", () => {
  afterEach(() => {
    parseStatementImage.mockReset();
    verifyFirebaseToken.mockClear();
    provider = { parseStatementImage };
    vi.restoreAllMocks();
  });

  it("returns validated transaction list from an image provider", async () => {
    parseStatementImage.mockResolvedValue({
      transactions: [{
        name: "Biedronka",
        amount: 25,
        type: "expense",
        isoDate: "2026-09-11",
        category: "Żywność"
      }]
    });

    const { server, url } = await createTestServer();

    try {
      const response = await fetch(`${url}/api/ai/parse-statement-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-mode": "local",
          "x-ai-local-endpoint": "http://localhost:11434/api/generate"
        },
        body: JSON.stringify({
          imageBase64: "aGVsbG8=",
          mimeType: "image/png",
          currentDate: "2026-09-11"
        })
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        transactions: [{
          name: "Biedronka",
          amount: 25,
          type: "expense",
          isoDate: "2026-09-11",
          category: "Żywność"
        }]
      });
      expect(parseStatementImage).toHaveBeenCalledWith("aGVsbG8=", "image/png", "2026-09-11");
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("does not require Firebase authentication for local AI", async () => {
    provider = { parseStatementImage: vi.fn().mockResolvedValue({ transactions: [] }) };
    const { server, url } = await createTestServer();

    try {
      const response = await fetch(`${url}/api/ai/parse-statement-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-mode": "local",
          "x-ai-local-endpoint": "http://localhost:11434/api/generate"
        },
        body: JSON.stringify({
          imageBase64: "aGVsbG8=",
          mimeType: "image/png",
          currentDate: "2026-09-11"
        })
      });

      expect(response.status).toBe(200);
      expect(verifyFirebaseToken).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("rejects malformed request before calling the provider", async () => {
    const { server, url } = await createTestServer();

    try {
      const response = await fetch(`${url}/api/ai/parse-statement-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-ai-mode": "local" },
        body: JSON.stringify({ imageBase64: "", mimeType: "image/png", currentDate: "2026-09-11" })
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Błędne dane obrazu wyciągu." });
      expect(parseStatementImage).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("returns a clear error for providers without image support", async () => {
    provider = {};
    const { server, url } = await createTestServer();

    try {
      const response = await fetch(`${url}/api/ai/parse-statement-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-mode": "local",
          "x-ai-local-endpoint": "http://localhost:11434/api/generate"
        },
        body: JSON.stringify({
          imageBase64: "aGVsbG8=",
          mimeType: "image/png",
          currentDate: "2026-09-11"
        })
      });

      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error: "Wybrany model AI nie obsługuje analizy obrazów." });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("rejects an invalid provider response", async () => {
    parseStatementImage.mockResolvedValue({ transactions: [{ name: "Brak kwoty" }] });
    const { server, url } = await createTestServer();

    try {
      const response = await fetch(`${url}/api/ai/parse-statement-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-mode": "local",
          "x-ai-local-endpoint": "http://localhost:11434/api/generate"
        },
        body: JSON.stringify({
          imageBase64: "aGVsbG8=",
          mimeType: "image/png",
          currentDate: "2026-09-11"
        })
      });

      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ error: "Nieprawidłowa odpowiedź modelu AI." });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("reports vision capability from Ollama /api/show", async () => {
    const nativeFetch = globalThis.fetch;
    const ollamaFetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        models: [{ name: "gemma3:4b", size: 100, capabilities: ["completion"] }]
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        capabilities: ["completion", "vision"]
      }), { status: 200 }));
    const { server, url } = await createTestServer();

    try {
      const response = await nativeFetch(`${url}/api/ai/health`, {
        headers: {
          "x-ai-mode": "local",
          "x-ai-local-endpoint": "http://localhost:11434/api/generate",
          "x-ai-local-model": "gemma3:4b"
        }
      });

      expect(response.status).toBe(200);
      expect((await response.json()).selectedModelVisionAvailable).toBe(true);
      expect(ollamaFetch).toHaveBeenNthCalledWith(
        1,
        new URL("http://localhost:11434/api/tags"),
        expect.objectContaining({ method: "GET" })
      );
      expect(ollamaFetch).toHaveBeenNthCalledWith(
        2,
        new URL("http://localhost:11434/api/show"),
        expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "gemma3:4b" }) })
      );
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});

describe("POST /api/ai/chat", () => {
  afterEach(() => {
    provider = { parseStatementImage };
    vi.restoreAllMocks();
  });

  const postChat = async (url: string) =>
    fetch(`${url}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ai-mode": "local", "x-ai-local-endpoint": "http://localhost:11434/api/generate" },
      body: JSON.stringify({ message: "Ile wydałem w tym miesiącu?", profileData: {} })
    });

  it("passes through a valid addTransaction action", async () => {
    provider = {
      chat: vi.fn().mockResolvedValue({
        reply: "Dodałem propozycję transakcji.",
        action: { type: "addTransaction", payload: { name: "Zarobki", amount: 1000, type: "income" } }
      })
    };
    const { server, url } = await createTestServer();
    try {
      const response = await postChat(url);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        reply: "Dodałem propozycję transakcji.",
        action: { type: "addTransaction", payload: { name: "Zarobki", amount: 1000, type: "income" } }
      });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("drops a malformed action but still returns the text reply", async () => {
    provider = {
      chat: vi.fn().mockResolvedValue({
        reply: "Nie jestem pewien, ale spróbowałem coś zaproponować.",
        action: { type: "deleteEverything", payload: { oops: true } }
      })
    };
    const { server, url } = await createTestServer();
    try {
      const response = await postChat(url);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        reply: "Nie jestem pewien, ale spróbowałem coś zaproponować.",
        action: null
      });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("returns action: null when the model proposes nothing", async () => {
    provider = { chat: vi.fn().mockResolvedValue({ reply: "Wydałeś 1200 zł.", action: null }) };
    const { server, url } = await createTestServer();
    try {
      const response = await postChat(url);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ reply: "Wydałeś 1200 zł.", action: null });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("rejects a response missing the required reply field", async () => {
    provider = { chat: vi.fn().mockResolvedValue({ action: null }) };
    const { server, url } = await createTestServer();
    try {
      const response = await postChat(url);
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({ error: "Nieprawidłowa odpowiedź modelu AI." });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});

describe("Local AI availability in NODE_ENV=production", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalRuntime = process.env.IS_ELECTRON;

  afterEach(() => {
    provider = { parseStatementImage };
    vi.restoreAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
    if (originalRuntime === undefined) delete process.env.IS_ELECTRON;
    else process.env.IS_ELECTRON = originalRuntime;
  });

  const postChat = async (url: string) =>
    fetch(`${url}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ai-mode": "local", "x-ai-local-endpoint": "http://localhost:11434/api/generate" },
      body: JSON.stringify({ message: "Ile wydałem w tym miesiącu?", profileData: {} })
    });

  it("blocks local AI in a real production web deployment (SSRF protection)", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.IS_ELECTRON;
    const { server, url } = await createTestServer();
    try {
      const response = await postChat(url);
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Lokalny model AI jest niedostępny w środowisku produkcyjnym." });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("allows local AI when the embedded server is running inside the desktop app", async () => {
    process.env.NODE_ENV = "production";
    process.env.IS_ELECTRON = "true";
    provider = { chat: vi.fn().mockResolvedValue({ reply: "Wydałeś 1200 zł.", action: null }) };
    const { server, url } = await createTestServer();
    try {
      const response = await postChat(url);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ reply: "Wydałeś 1200 zł.", action: null });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
