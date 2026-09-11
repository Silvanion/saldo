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
});
