/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isLocalEndpointSafe,
  isLocalAiLikelyUnsupported,
  resolveLocalAiConfig,
  checkLocalAiHealth,
  categorizeDescriptionsWithLocalAi,
  extractTransactionsWithLocalAi,
  DEFAULT_LOCAL_AI_ENDPOINT,
  DEFAULT_LOCAL_AI_MODEL
} from "./localAi";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonResponse(body: any, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body
  } as Response;
}

describe("isLocalEndpointSafe", () => {
  it.each([
    ["http://localhost:11434/api/generate", true],
    ["http://127.0.0.1:11434/api/generate", true],
    ["http://[::1]:11434/api/generate", true],
    ["http://example.com:11434/api/generate", false],
    ["not a url", false]
  ])("%s -> %s", (endpoint, expected) => {
    expect(isLocalEndpointSafe(endpoint)).toBe(expected);
  });
});

describe("resolveLocalAiConfig", () => {
  it("zwraca domyślne wartości, gdy stan ich nie ma", () => {
    expect(resolveLocalAiConfig(undefined)).toEqual({
      endpoint: DEFAULT_LOCAL_AI_ENDPOINT,
      model: DEFAULT_LOCAL_AI_MODEL
    });
    expect(resolveLocalAiConfig({})).toEqual({
      endpoint: DEFAULT_LOCAL_AI_ENDPOINT,
      model: DEFAULT_LOCAL_AI_MODEL
    });
  });

  it("respektuje wartości z ustawień", () => {
    expect(resolveLocalAiConfig({ localAiEndpoint: "http://localhost:9999/api/generate", localAiModel: "llama3" })).toEqual({
      endpoint: "http://localhost:9999/api/generate",
      model: "llama3"
    });
  });

  it("puste stringi traktuje jak brak wartości", () => {
    expect(resolveLocalAiConfig({ localAiEndpoint: "  ", localAiModel: "" })).toEqual({
      endpoint: DEFAULT_LOCAL_AI_ENDPOINT,
      model: DEFAULT_LOCAL_AI_MODEL
    });
  });
});

describe("isLocalAiLikelyUnsupported (Safari/WebKit + HTTPS)", () => {
  const setEnv = (protocol: string, ua: string) => {
    vi.stubGlobal("location", { protocol } as any);
    vi.stubGlobal("navigator", { userAgent: ua } as any);
  };

  it("Safari na HTTPS -> nieobsługiwane", () => {
    setEnv("https:", "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15");
    expect(isLocalAiLikelyUnsupported()).toBe(true);
  });

  it("Safari na HTTP (dev) -> obsługiwane, mixed content nie dotyczy", () => {
    setEnv("http:", "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15");
    expect(isLocalAiLikelyUnsupported()).toBe(false);
  });

  it("Chrome na HTTPS -> obsługiwane (Chrome UA też zawiera 'Safari', musi być odróżnione)", () => {
    setEnv("https:", "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36");
    expect(isLocalAiLikelyUnsupported()).toBe(false);
  });

  it("Firefox na HTTPS -> obsługiwane", () => {
    setEnv("https:", "Mozilla/5.0 (Macintosh) Gecko/20100101 Firefox/121.0");
    expect(isLocalAiLikelyUnsupported()).toBe(false);
  });
});

describe("checkLocalAiHealth", () => {
  const config = { endpoint: DEFAULT_LOCAL_AI_ENDPOINT, model: "qwen2.5:7b" };

  it("odrzuca endpoint spoza localhost bez wysyłania żądania", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await checkLocalAiHealth({ endpoint: "http://example.com/api/generate", model: "x" });
    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ok gdy model jest na liście", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ models: [{ name: "qwen2.5:7b" }] })));
    const result = await checkLocalAiHealth(config);
    expect(result.ok).toBe(true);
  });

  it("blad gdy model nie jest pobrany", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ models: [{ name: "llama3" }] })));
    const result = await checkLocalAiHealth(config);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("ollama pull");
  });

  it("blad gdy Ollama nie odpowiada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network fail")));
    const result = await checkLocalAiHealth(config);
    expect(result.ok).toBe(false);
  });
});

describe("categorizeDescriptionsWithLocalAi", () => {
  const config = { endpoint: DEFAULT_LOCAL_AI_ENDPOINT, model: "qwen2.5:7b" };

  it("mapuje opisy na kategorie z odpowiedzi indeksowanej", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ response: JSON.stringify({ "0": "Żywność", "1": "Transport" }) })
      )
    );
    const result = await categorizeDescriptionsWithLocalAi(["BIEDRONKA 123", "ORLEN 456"], config);
    expect(result.get("BIEDRONKA 123")).toBe("Żywność");
    expect(result.get("ORLEN 456")).toBe("Transport");
  });

  it("odrzuca wartość spoza dozwolonych kategorii (model halucynuje)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ response: JSON.stringify({ "0": "Zakupy online" }) }))
    );
    const result = await categorizeDescriptionsWithLocalAi(["ALLEGRO.PL"], config);
    expect(result.has("ALLEGRO.PL")).toBe(false);
  });

  it("ponawia próbę gdy pierwsza odpowiedź nie jest obiektem", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ response: "[]" }))
      .mockResolvedValueOnce(jsonResponse({ response: JSON.stringify({ "0": "Zdrowie" }) }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await categorizeDescriptionsWithLocalAi(["APTEKA 1"], config);
    expect(result.get("APTEKA 1")).toBe("Zdrowie");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("pomija partię po dwóch nieudanych próbach, nie rzuca", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const result = await categorizeDescriptionsWithLocalAi(["X"], config);
    expect(result.size).toBe(0);
  });

  it("dzieli na partie po 20 pozycji", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => {
      const map: Record<string, string> = {};
      for (let i = 0; i < 20; i++) map[String(i)] = "Inne";
      return jsonResponse({ response: JSON.stringify(map) });
    });
    vi.stubGlobal("fetch", fetchMock);
    const descriptions = Array.from({ length: 25 }, (_, i) => `OPIS ${i}`);
    await categorizeDescriptionsWithLocalAi(descriptions, config);
    expect(fetchMock).toHaveBeenCalledTimes(2); // 20 + 5
  });
});

describe("extractTransactionsWithLocalAi", () => {
  const config = { endpoint: DEFAULT_LOCAL_AI_ENDPOINT, model: "qwen2.5:7b" };

  it("wyciąga pojedynczą transakcję z prostego tekstu", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          response: JSON.stringify([{ name: "Zakupy PAYU*MEDIA EXPERT", amount: 156.4, type: "expense", isoDate: "2026-08-12" }])
        })
      )
    );
    const rows = await extractTransactionsWithLocalAi("Kwota: 156,40 PLN\nTytuł: Zakupy PAYU*MEDIA EXPERT", config);
    expect(rows).toHaveLength(1);
    expect(rows[0].amountConsistent).toBe(true);
    expect(rows[0].category).toBe("Inne");
  });

  it("oznacza jako niespójną kwotę, której nie ma w tekście źródłowym (znany błąd: zgubiona cyfra)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ response: JSON.stringify([{ name: "Wynagrodzenie", amount: 720, type: "income", isoDate: "2026-08-01" }]) })
      )
    );
    const rows = await extractTransactionsWithLocalAi("01.08.2026\nWynagrodzenie\n+7 200,00", config);
    expect(rows[0].amountConsistent).toBe(false);
  });

  it("normalizuje pojedynczy obiekt (nie tablicę) do jednoelementowej listy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ response: JSON.stringify({ name: "IKEA", amount: 649, type: "expense", isoDate: "2026-08-10" }) })
      )
    );
    const rows = await extractTransactionsWithLocalAi("Kwota transakcji: 649,00 PLN", config);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("IKEA");
  });

  it("pusty obiekt {} oznacza brak transakcji, nie błąd", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ response: "{}" })));
    const rows = await extractTransactionsWithLocalAi("Losowy tekst bez transakcji", config);
    expect(rows).toEqual([]);
  });

  it("dzieli gęsty tekst na bloki po dacie i woła model osobno dla każdej transakcji", async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init: any) => {
      const body = JSON.parse(init.body);
      const nameMatch = body.prompt.match(/Czynsz|Apteka/);
      if (nameMatch?.[0] === "Czynsz") {
        return jsonResponse({ response: JSON.stringify([{ name: "Czynsz", amount: 1850, type: "expense", isoDate: "2026-08-12" }]) });
      }
      return jsonResponse({ response: JSON.stringify([{ name: "Apteka", amount: 62.3, type: "expense", isoDate: "2026-08-13" }]) });
    });
    vi.stubGlobal("fetch", fetchMock);

    const text = "12.08.2026 Czynsz Wspolnota Mieszkaniowa 1 850,00-\n13.08.2026 Apteka Dr.Max 445 62,30-";
    const rows = await extractTransactionsWithLocalAi(text, config);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(rows.map((r) => r.name)).toEqual(["Czynsz", "Apteka"]);
    expect(rows.every((r) => r.amountConsistent)).toBe(true);
  });

  it("odrzuca wiersze bez nazwy lub z niedodatnią kwotą", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          response: JSON.stringify([
            { name: "", amount: 100, type: "expense", isoDate: "2026-08-01" },
            { name: "Coś", amount: -5, type: "expense", isoDate: "2026-08-01" },
            { name: "Poprawny", amount: 50, type: "expense", isoDate: "2026-08-01" }
          ])
        })
      )
    );
    const rows = await extractTransactionsWithLocalAi("dowolny tekst", config);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Poprawny");
  });

  it("blad sieci na jednym bloku nie przerywa reszty", async () => {
    let call = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => {
      call++;
      if (call === 1) throw new Error("network down");
      return jsonResponse({ response: JSON.stringify([{ name: "Apteka", amount: 62.3, type: "expense", isoDate: "2026-08-13" }]) });
    }));
    const text = "12.08.2026 Czynsz 1 850,00-\n13.08.2026 Apteka 62,30-";
    const rows = await extractTransactionsWithLocalAi(text, config);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Apteka");
  });
});
