import { describe, expect, it, vi, afterEach } from "vitest";
import { LocalProvider } from "./localProvider";

describe("LocalProvider model selection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("detects the first installed Ollama model when no model is configured", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        models: [{ name: "qwen3:4b" }, { name: "gemma3:4b" }]
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        response: "{\"type\":\"expense\",\"name\":\"Kawa\",\"amount\":12,\"category\":\"Jedzenie\",\"isoDate\":\"2026-09-11\"}"
      }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await new LocalProvider("http://localhost:11434/api/generate").parseNatural("Kawa 12 zł", "2026-09-11");

    expect(fetchMock).toHaveBeenNthCalledWith(1, new URL("http://localhost:11434/api/tags"), { method: "GET" });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe("qwen3:4b");
  });

  it("uses the explicitly configured model without querying the model list", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      response: "{\"type\":\"expense\",\"name\":\"Kawa\",\"amount\":12,\"category\":\"Jedzenie\",\"isoDate\":\"2026-09-11\"}"
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await new LocalProvider("http://localhost:11434/api/generate", "gemma3:4b")
      .parseNatural("Kawa 12 zł", "2026-09-11");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe("gemma3:4b");
  });

  it("reports a useful error when Ollama has no installed models", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ models: [] }),
      { status: 200 }
    )));

    await expect(
      new LocalProvider("http://localhost:11434/api/generate").parseNatural("Kawa", "2026-09-11")
    ).rejects.toThrow("Nie znaleziono żadnego modelu w Ollamie.");
  });

  it("uses an Ollama-compatible transaction wrapper for statement parsing", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      response: JSON.stringify({
        transactions: [{
          name: "Biedronka",
          amount: 25.5,
          type: "expense",
          isoDate: "2026-09-11",
          category: "Żywność"
        }]
      })
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new LocalProvider("http://localhost:11434/api/generate", "qwen3:14b")
      .parseStatement("2026-09-11; Biedronka; -25,50", "2026-09-11");

    expect(result.transactions).toHaveLength(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).prompt).toContain('"transactions"');
  });

  it("falls back to the deterministic parser when Ollama returns an empty object", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      response: "{}"
    }), { status: 200 })));

    const result = await new LocalProvider("http://localhost:11434/api/generate", "qwen3:14b")
      .parseStatement("2026-09-11; Biedronka; -25,50", "2026-09-11");

    expect(result.transactions).toEqual([expect.objectContaining({
      name: "Biedronka",
      amount: 25.5,
      type: "expense",
      isoDate: "2026-09-11"
    })]);
  });

  it("rejects malformed AI rows and falls back to deterministic parsing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      response: JSON.stringify({
        transactions: [{
          name: "Biedronka",
          amount: -25.5,
          type: "expense",
          isoDate: "2026-02-30",
          category: ""
        }]
      })
    }), { status: 200 })));

    const result = await new LocalProvider("http://localhost:11434/api/generate", "qwen3:14b")
      .parseStatement("2026-09-11; Biedronka; -25,50", "2026-09-11");

    expect(result.transactions).toEqual([expect.objectContaining({
      name: "Biedronka",
      amount: 25.5,
      type: "expense",
      isoDate: "2026-09-11"
    })]);
  });
});
