import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

const parseStatementImage = vi.fn();
let provider: Record<string, unknown> = { parseStatementImage };

vi.mock("../middleware/auth", () => ({
  verifyFirebaseToken: (_req: unknown, _res: unknown, next: () => void) => next()
}));
vi.mock("../middleware/security", () => {
  const passThrough = (_req: unknown, _res: unknown, next: () => void) => next();
  return {
    cloudAiRateLimiter: passThrough,
    localAiRateLimiter: passThrough,
    noAiRateLimiter: passThrough,
    aiPayloadLimiter: passThrough
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
    provider = { parseStatementImage };
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
});
