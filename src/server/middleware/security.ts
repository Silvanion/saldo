import rateLimit from "express-rate-limit";
import { getAuth } from "firebase-admin/auth";

// Populates req.user from a Firebase ID token when the client sends one (see
// src/services/aiClient.ts, which always attaches `Authorization: Bearer <idToken>`
// when the user is signed in). Verification failures never block the request —
// local/offline AI usage without a Firebase session must keep working — they just
// leave req.user unset, so downstream rate limiting/cost logging falls back to IP.
export const identifyUser = async (req: any, _res: any, next: any) => {
  const header = req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (token) {
      try {
        const decoded = await getAuth().verifyIdToken(token);
        req.user = { uid: decoded.uid };
      } catch {
        // Invalid/expired token — proceed unauthenticated rather than failing the request.
      }
    }
  }
  next();
};

// Protects local AI endpoints (moderately strict, max 30 requests per minute per user/IP)
export const localAiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { error: "Zbyt wiele zapytań do lokalnego silnika AI. Spróbuj ponownie za chwilę." },
  standardHeaders: true, 
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req: any) => {
    if (req.user && req.user.uid) return req.user.uid;
    return req.ip || "unknown";
  }
});

// Alias for naming consistency
export const aiLocalRateLimiter = localAiRateLimiter;

// Protects none AI endpoints (most lenient, max 60 requests per minute per user/IP)
export const noAiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { error: "Zbyt wiele zapytań systemowych. Spróbuj ponownie za chwilę." },
  standardHeaders: true, 
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req: any) => {
    if (req.user && req.user.uid) return req.user.uid;
    return req.ip || "unknown";
  }
});

// Alias for naming consistency
export const aiNoneRateLimiter = noAiRateLimiter;

// Strict payload size limiter middleware specifically for AI input
export const aiPayloadLimiter = (req: any, res: any, next: any) => {
  if (req.body) {
    if (req.body.imageBase64) {
      const mimeType = req.body.mimeType;
      if (!mimeType || !["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
        return res.status(400).json({ error: "Nieobsługiwany format obrazu. Dozwolone: jpeg, png, webp." });
      }
      const decodedSize = (req.body.imageBase64.length * 3) / 4;
      if (decodedSize > 3 * 1024 * 1024) {
        return res.status(413).json({ error: "Rozmiar obrazu przekracza limit 3MB." });
      }
    } else {
      // /chat carries a trimmed profile snapshot (up to 100 transactions plus
      // payments, goals, debts…), which routinely exceeds the 20KB text cap.
      const isChat = req.path === "/chat";
      const maxLength = isChat ? 150_000 : 20_000;
      if (JSON.stringify(req.body).length > maxLength) {
        return res.status(413).json({ error: `Zbyt duży rozmiar tekstu (limit ${isChat ? 150 : 20}KB).` });
      }
    }
  }
  next();
};
