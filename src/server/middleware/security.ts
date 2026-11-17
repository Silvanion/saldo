import { getAuth } from "firebase-admin/auth";
import { timingSafeEqual } from "crypto";

// Populates req.user from a Firebase ID token when the client sends one.
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

// Lokalne API w aplikacji desktopowej (SEC-11): serwer nasłuchuje na loopbacku.
// Główny proces Electrona losuje token (SALDO_API_TOKEN) i przekazuje go wyłącznie do okna aplikacji przez preload;
// bez tokenu (hosting web) middleware nic nie robi. Nagłówek Host musi wskazywać na loopback.
const LOOPBACK_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/i;

export const requireLocalApiToken = (req: any, res: any, next: any) => {
  const expected = process.env.SALDO_API_TOKEN;
  if (!expected) return next();

  const host = typeof req.headers?.host === "string" ? req.headers.host : "";
  if (!LOOPBACK_HOST.test(host)) {
    return res.status(403).json({ error: "Niedozwolony adres hosta." });
  }

  const provided = req.headers?.["x-saldo-token"];
  const a = Buffer.from(typeof provided === "string" ? provided : "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Brak autoryzacji lokalnego API." });
  }
  next();
};
