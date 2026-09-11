import { Router, Request, Response, NextFunction } from "express";
import { verifyFirebaseToken } from "../middleware/auth";
import { cloudAiRateLimiter, localAiRateLimiter, noAiRateLimiter, aiPayloadLimiter } from "../middleware/security";
import { createAiProvider } from "../ai/createAiProvider";
import { logCostMetric } from "../services/aiService";
import { z } from "zod";

const router = Router();

/**
 * Middleware 1: Extract and strictly validate AI configuration headers
 */
const extractAndValidateAiConfig = (req: any, res: Response, next: NextFunction) => {
  const modeHeader = req.headers["x-ai-mode"];
  const mode = (modeHeader || "none").toString().toLowerCase();

  // Validate allowed modes
  if (mode !== "cloud" && mode !== "local" && mode !== "none") {
    return res.status(400).json({ error: "Nieprawidłowy tryb AI." });
  }

  let localEndpoint = (req.headers["x-ai-local-endpoint"] || "").toString().trim();
  let localAiModel = (req.headers["x-ai-local-model"] || "").toString().trim();
  
  if (process.env.NODE_ENV === "production" && mode === "local") {
    return res.status(403).json({ 
      error: "Lokalny model AI jest niedostępny w środowisku produkcyjnym." 
    });
  }

  if (mode === "local") {
    if (!localEndpoint) {
      // Default to localhost Ollama if not specified
      localEndpoint = "http://localhost:11434/api/generate";
    }

    // SSRF Protection: Validate URL and enforce localhost boundaries
    try {
      const parsedUrl = new URL(localEndpoint);
      const hostname = parsedUrl.hostname.toLowerCase();
      const isAllowedLocalHost =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1";

      if (!isAllowedLocalHost) {
        return res.status(403).json({
          error: "Lokalny endpoint AI musi wskazywać na bezpieczny adres lokalny (np. http://localhost:11434/api/generate).",
        });
      }
    } catch (err) {
      return res.status(400).json({ error: "Wybrany lokalny endpoint AI jest nieprawidłowy." });
    }
  }

  req.aiConfig = { mode, localEndpoint, localAiModel };
  next();
};

/**
 * Middleware 2: Apply appropriate rate limiting and authentication per mode
 */
const routeSecurityByMode = (req: any, res: Response, next: NextFunction) => {
  const mode = req.aiConfig.mode;

  if (mode === "cloud" || mode === "local") {
    return verifyFirebaseToken(req, res, () => {
      if (mode === "cloud") return cloudAiRateLimiter(req, res, next);
      return localAiRateLimiter(req, res, next);
    });
  }

  // mode === "none"
  return noAiRateLimiter(req, res, next);
};

// Apply pipeline globally to AI router
router.use(extractAndValidateAiConfig);
router.use(aiPayloadLimiter);
router.use(routeSecurityByMode);

/**
 * Endpoint 0: Health / Status Check for AI Provider Configuration
 */
router.all("/health", async (req: any, res: Response) => {
  try {
    const config = req.aiConfig;
    if (config.mode === "none") {
      return res.json({ status: "ok", mode: "none", message: "Tryb bez AI jest aktywny (używa standardowych reguł)." });
    }
    
    if (config.mode === "local") {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const tagsEndpoint = new URL(config.localEndpoint);
        tagsEndpoint.pathname = "/api/tags";
        tagsEndpoint.search = "";
        const testRes = await fetch(tagsEndpoint, {
          method: "GET",
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!testRes.ok) {
          return res.status(502).json({ status: "error", mode: "local", message: `Lokalny endpoint odpowiedział kodem ${testRes.status}.` });
        }
        const data = await testRes.json() as { models?: Array<{ name?: string; model?: string; size?: number; capabilities?: string[] }> };
        const models = (data.models || [])
          .map((model) => ({
            name: model.name || model.model || "",
            size: model.size,
            vision: model.capabilities?.includes("vision") || false
          }))
          .filter((model) => model.name);
        const selectedModel = config.localAiModel || models[0]?.name || null;
        let selectedModelVisionAvailable = false;
        if (selectedModel) {
          try {
            const showEndpoint = new URL(config.localEndpoint);
            showEndpoint.pathname = "/api/show";
            showEndpoint.search = "";
            const showResponse = await fetch(showEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: selectedModel }),
              signal: controller.signal
            });
            if (showResponse.ok) {
              const showData = await showResponse.json() as { capabilities?: string[] };
              selectedModelVisionAvailable = showData.capabilities?.includes("vision") || false;
            }
          } catch {
            selectedModelVisionAvailable = false;
          }
        }
        return res.json({
          status: "ok",
          mode: "local",
          endpoint: config.localEndpoint,
          models,
          selectedModel,
          selectedModelAvailable: selectedModel ? models.some((model) => model.name === selectedModel) : false,
          selectedModelVisionAvailable,
          message: models.length
            ? "Połączenie z Ollamą udane."
            : "Ollama działa, ale nie ma jeszcze pobranych modeli."
        });
      } catch (err: any) {
        clearTimeout(timeoutId);
        return res.status(503).json({ status: "error", mode: "local", message: "Brak możliwości połączenia z lokalnym serwerem AI (Ollama)." });
      }
    }

    if (config.mode === "cloud") {
      return res.json({ status: "ok", mode: "cloud", message: "Chmura AI (Gemini) jest gotowa." });
    }

    res.json({ status: "ok", config });
  } catch (error: any) {
    res.status(500).json({ status: "error", error: error.message || "Błąd weryfikacji zdrowia AI." });
  }
});

const PullModelInput = z.object({
  model: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9._:/-]+$/)
});

router.post("/pull", async (req: any, res: Response) => {
  const parsed = PullModelInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Nieprawidłowa nazwa modelu Ollama." });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15 * 60 * 1000);
  let responseFinished = false;
  req.on("close", () => {
    if (!responseFinished) controller.abort();
  });
  try {
    const pullEndpoint = new URL(req.aiConfig.localEndpoint);
    pullEndpoint.pathname = "/api/pull";
    pullEndpoint.search = "";
    const pullResponse = await fetch(pullEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: parsed.data.model, stream: true }),
      signal: controller.signal
    });
    if (!pullResponse.ok) {
      return res.status(502).json({ error: `Ollama nie mogła pobrać modelu (HTTP ${pullResponse.status}).` });
    }
    if (!pullResponse.body) {
      return res.status(502).json({ error: "Ollama nie zwróciła strumienia postępu pobierania." });
    }

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    const reader = pullResponse.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    const remainder = decoder.decode();
    if (remainder) res.write(remainder);
    responseFinished = true;
    return res.end();
  } catch (error: any) {
    if (res.headersSent) {
      responseFinished = true;
      return res.end();
    }
    const message = error?.name === "AbortError"
      ? "Pobieranie modelu trwało zbyt długo i zostało przerwane."
      : "Nie udało się pobrać modelu z Ollamy.";
    return res.status(502).json({ error: message });
  } finally {
    clearTimeout(timeoutId);
  }
});

/**
 * Input schemas
 */
const SuggestEventInput = z.object({
  payment: z.object({
    name: z.string(),
    amount: z.number(),
    dueDate: z.string().optional()
  }),
  currentDate: z.string()
});

const ParseNaturalInput = z.object({
  text: z.string().min(1),
  currentDate: z.string()
});

const ParseStatementInput = z.object({
  text: z.string().min(1),
  currentDate: z.string()
});

const ChatInput = z.object({
  message: z.string().min(1).max(5000),
  profileData: z.object({
    activeProfileId: z.string().nullable().optional(),
    profiles: z.array(z.object({
      id: z.string(),
      name: z.string(),
      kind: z.enum(["personal", "shared"]),
      transactions: z.array(z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        amount: z.number().optional(),
        category: z.string().optional(),
        type: z.string().optional(),
        isoDate: z.string().optional()
      })).max(100).optional(),
      payments: z.array(z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        amount: z.number().optional(),
        dueDate: z.string().optional(),
        status: z.string().optional()
      })).max(50).optional(),
      budgets: z.record(z.string(), z.number()).optional()
    })).max(20).optional()
  }).optional()
});

const ScanInvoiceInput = z.object({
  imageBase64: z.string().min(1).max(10_000_000), // Max 10MB approx in base64
  mimeType: z.string().max(50)
});

const ParseStatementImageInput = z.object({
  imageBase64: z.string().min(1).max(10_000_000),
  mimeType: z.string().max(50),
  currentDate: z.string()
});

/**
 * Output schemas for strict output validation
 */
const SuggestEventOutput = z.object({
  summary: z.string().optional(),
  description: z.string().optional(),
  suggestedDate: z.string().optional(),
  suggestedTime: z.string().optional(),
  suggestedReminders: z.array(z.number()).optional()
}).passthrough();

const ParseNaturalOutput = z.object({
  type: z.string().optional(),
  name: z.string().optional(),
  amount: z.number().optional(),
  category: z.string().optional(),
  dueDate: z.string().optional(),
  isoDate: z.string().optional()
}).passthrough();

const ParseStatementOutput = z.array(
  z.object({
    name: z.string(),
    amount: z.number(),
    type: z.enum(["income", "expense"]),
    isoDate: z.string(),
    category: z.string()
  }).passthrough()
);

const ChatOutput = z.object({
  reply: z.string()
}).passthrough();

const ScanInvoiceOutput = z.object({
  name: z.string().optional(),
  amount: z.number().optional(),
  type: z.enum(["income", "expense"]).optional(),
  isoDate: z.string().optional(),
  category: z.string().optional()
}).passthrough();

// Middleware: zablokuj lokalne AI w produkcji
const checkProductionAiMode = (req: any, res: Response, next: any) => {
  if (process.env.NODE_ENV === "production" && req.aiConfig?.mode === "local") {
    return res.status(403).json({ error: "Lokalny model AI jest niedostępny w środowisku produkcyjnym." });
  }
  next();
};

/**
 * Endpoint 1: Suggest Calendar Event
 */
router.post("/suggest-event", checkProductionAiMode, async (req: any, res: Response) => {
  const uid = req.user?.uid;
  const ip = req.ip || "unknown";
  let parsedInput;
  try {
    parsedInput = SuggestEventInput.parse(req.body);
  } catch (error) {
    return res.status(400).json({ error: "Błędne dane wejściowe." });
  }

  try {
    const provider = createAiProvider(req.aiConfig);
    const rawResult = await provider.suggestEvent(parsedInput.payment, parsedInput.currentDate, uid);
    const result = SuggestEventOutput.parse(rawResult);
    logCostMetric("/suggest-event", uid, ip, 0, true);
    res.json(result);
  } catch (error: any) {
    logCostMetric("/suggest-event", uid, ip, 0, false);
    if (error instanceof z.ZodError) {
      return res.status(502).json({ error: "Nieprawidłowa odpowiedź modelu AI." });
    }
    const message = process.env.NODE_ENV === "production" ? "Błąd silnika AI." : (error.message || "Błąd silnika AI.");
    res.status(500).json({ error: message });
  }
});

/**
 * Endpoint 2: Parse Natural Language Text
 */
router.post("/parse-natural", checkProductionAiMode, async (req: any, res: Response) => {
  const uid = req.user?.uid;
  const ip = req.ip || "unknown";
  let parsedInput;
  try {
    parsedInput = ParseNaturalInput.parse(req.body);
  } catch (error) {
    return res.status(400).json({ error: "Błędne dane wejściowe." });
  }

  try {
    const provider = createAiProvider(req.aiConfig);
    const rawResult = await provider.parseNatural(parsedInput.text, parsedInput.currentDate);
    const result = ParseNaturalOutput.parse(rawResult);
    logCostMetric("/parse-natural", uid, ip, parsedInput.text.length, true);
    res.json(result);
  } catch (error: any) {
    logCostMetric("/parse-natural", uid, ip, 0, false);
    if (error instanceof z.ZodError) {
      return res.status(502).json({ error: "Nieprawidłowa odpowiedź modelu AI." });
    }
    const message = process.env.NODE_ENV === "production" ? "Błąd silnika AI." : (error.message || "Błąd silnika AI.");
    res.status(500).json({ error: message });
  }
});

/**
 * Endpoint 3: Parse Bank Statement
 */
router.post("/parse-statement", checkProductionAiMode, async (req: any, res: Response) => {
  const uid = req.user?.uid;
  const ip = req.ip || "unknown";
  let parsedInput;
  try {
    parsedInput = ParseStatementInput.parse(req.body);
  } catch (error) {
    return res.status(400).json({ error: "Błędne dane wejściowe." });
  }

  try {
    const provider = createAiProvider(req.aiConfig);
    const rawResult = await provider.parseStatement(parsedInput.text, parsedInput.currentDate);
    const result = ParseStatementOutput.parse(rawResult);
    logCostMetric("/parse-statement", uid, ip, parsedInput.text.length, true);
    res.json(result);
  } catch (error: any) {
    logCostMetric("/parse-statement", uid, ip, 0, false);
    if (error instanceof z.ZodError) {
      return res.status(502).json({ error: "Nieprawidłowa odpowiedź modelu AI." });
    }
    const message = process.env.NODE_ENV === "production" ? "Błąd silnika AI." : (error.message || "Błąd silnika AI.");
    res.status(500).json({ error: message });
  }
});

router.post("/parse-statement-image", checkProductionAiMode, async (req: any, res: Response) => {
  const uid = req.user?.uid;
  const ip = req.ip || "unknown";
  const parsedInput = ParseStatementImageInput.safeParse(req.body);
  if (!parsedInput.success) return res.status(400).json({ error: "Błędne dane obrazu wyciągu." });

  try {
    const provider = createAiProvider(req.aiConfig);
    if (!provider.parseStatementImage) {
      return res.status(422).json({ error: "Wybrany model AI nie obsługuje analizy obrazów." });
    }
    const rawResult = await provider.parseStatementImage(
      parsedInput.data.imageBase64,
      parsedInput.data.mimeType,
      parsedInput.data.currentDate
    );
    const result = ParseStatementOutput.parse(rawResult.transactions || rawResult);
    logCostMetric("/parse-statement-image", uid, ip, parsedInput.data.imageBase64.length, true);
    res.json({ transactions: result });
  } catch (error: any) {
    logCostMetric("/parse-statement-image", uid, ip, 0, false);
    if (error instanceof z.ZodError) return res.status(502).json({ error: "Nieprawidłowa odpowiedź modelu AI." });
    const message = process.env.NODE_ENV === "production" ? "Błąd silnika AI." : (error.message || "Błąd analizy obrazu.");
    res.status(500).json({ error: message });
  }
});

/**
 * Endpoint 4: AI Advisor Chat
 */
router.post("/chat", checkProductionAiMode, async (req: any, res: Response) => {
  const uid = req.user?.uid;
  const ip = req.ip || "unknown";
  let parsedInput;
  try {
    parsedInput = ChatInput.parse(req.body);
  } catch (error) {
    return res.status(400).json({ error: "Błędne dane wejściowe." });
  }

  try {
    const provider = createAiProvider(req.aiConfig);
    const rawResult = await provider.chat(parsedInput.message, parsedInput.profileData);
    const result = ChatOutput.parse(rawResult);
    logCostMetric("/chat", uid, ip, parsedInput.message.length, true);
    res.json(result);
  } catch (error: any) {
    logCostMetric("/chat", uid, ip, 0, false);
    if (error instanceof z.ZodError) {
      return res.status(502).json({ error: "Nieprawidłowa odpowiedź modelu AI." });
    }
    const message = process.env.NODE_ENV === "production" ? "Błąd silnika AI." : (error.message || "Błąd silnika AI.");
    res.status(500).json({ error: message });
  }
});

/**
 * Endpoint 5: Scan Invoice / Document
 */
router.post("/scan-invoice", checkProductionAiMode, async (req: any, res: Response) => {
  const uid = req.user?.uid;
  const ip = req.ip || "unknown";
  let parsedInput;
  try {
    parsedInput = ScanInvoiceInput.parse(req.body);
  } catch (error) {
    return res.status(400).json({ error: "Błędne dane wejściowe." });
  }

  try {
    const provider = createAiProvider(req.aiConfig);
    const rawResult = await provider.scanInvoice(parsedInput.imageBase64, parsedInput.mimeType);
    const result = ScanInvoiceOutput.parse(rawResult);
    logCostMetric("/scan-invoice", uid, ip, parsedInput.imageBase64.length, true);
    res.json(result);
  } catch (error: any) {
    logCostMetric("/scan-invoice", uid, ip, 0, false);
    if (error instanceof z.ZodError) {
      return res.status(502).json({ error: "Nieprawidłowa odpowiedź modelu AI." });
    }
    const message = process.env.NODE_ENV === "production" ? "Błąd silnika AI." : (error.message || "Błąd silnika AI.");
    res.status(500).json({ error: message });
  }
});

export default router;
