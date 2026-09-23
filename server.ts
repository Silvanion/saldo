import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { initializeApp, getApps } from "firebase-admin/app";
import aiRouter from "./src/server/routes/ai";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

dotenv.config();

const PORT = Number(process.env.PORT ?? 3000);

// Initialize Firebase Admin safely
if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  if (process.env.NODE_ENV === "production" && !projectId && process.env.IS_ELECTRON !== "true") {
    console.error("FIREBASE_PROJECT_ID missing");
    process.exit(1);
  }
  if (!projectId) {
    console.warn("FIREBASE_PROJECT_ID not set. Firebase Admin initialized with default project credentials.");
  }
  try {
    initializeApp(projectId ? { projectId } : undefined);
  } catch (err) {
    console.warn("Failed to initialize Firebase Admin SDK:", err);
  }
}

export async function startServer(customPort?: number) {
  const app = express();
  const actualPort = customPort || PORT;

  // Security Middleware
  app.set("trust proxy", 1); // For express-rate-limit to work correctly behind proxy
  if (process.env.NODE_ENV === "production" && !process.env.ALLOWED_ORIGINS && process.env.IS_ELECTRON !== "true") {
    console.error("ALLOWED_ORIGINS environment variable missing in production");
    process.exit(1);
  }

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/state/reset", (req, res) => {
    res.json({ data: { profiles: [] } });
  });

  // Use Helmet but configure CSP for Vite development and Firebase Auth
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com", "https://www.gstatic.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: [
          "'self'",
          "https://apis.google.com",
          "https://*.googleapis.com",
          "https://securetoken.googleapis.com",
          "https://firestore.googleapis.com",
          "https://identitytoolkit.googleapis.com",
          // Kursy walut (src/services/currencyService.ts)
          "https://api.nbp.pl",
          "http://localhost:11434",
          "http://127.0.0.1:11434",
          // Sprawdzanie/pobieranie aktualizacji (UpdateManager/UpdateToast) łączy
          // się bezpośrednio z GitHub z procesu renderera — potrzebne tylko w
          // aplikacji desktopowej (hosting web nie ma tej funkcji), stąd warunek.
          ...(process.env.IS_ELECTRON === "true" ? ["https://api.github.com", "https://github.com", "https://objects.githubusercontent.com"] : [])
        ],
        frameSrc: ["'self'", "https://*.firebaseapp.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://lh3.googleusercontent.com"],
      }
    } : false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false
  }));

  // CORS configuration
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
    : (process.env.IS_ELECTRON === "true" ? ["http://localhost", "http://127.0.0.1"] : []);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like health checks, same-origin, curl)
      if (!origin) {
        return callback(null, true);
      }
      if (process.env.IS_ELECTRON === "true") {
        if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:") || origin === "null") {
          return callback(null, true);
        }
      }
      if (process.env.NODE_ENV === "production" && allowedOrigins.length > 0) {
        if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
          return callback(null, true);
        }
        console.warn(`CORS blocked request from origin: ${origin}`);
        return callback(null, false);
      }
      return callback(null, true);
    }
  }));

  // Global Rate Limiting (API routes only)
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: "Too many requests from this IP, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, trustProxy: false }
  });
  app.use("/api", globalLimiter);

  app.use(express.json({ limit: "5mb" })); // Increased payload size to accommodate 3MB base64 images

  // Specific Rate Limiting for AI Endpoint
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 50, // Strict limit for AI API
    message: { error: "Zbyt wiele zapytań do API AI. Spróbuj ponownie później." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, trustProxy: false }
  });

  // AI Routes
  app.use("/api/ai", aiLimiter, aiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static files: in bundled CJS dist/server.cjs, __dirname is the dist directory.
    // Fall back to process.cwd()/dist if running outside the dist directory.
    const distPath = fs.existsSync(path.join(__dirname, "index.html"))
      ? __dirname
      : path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Unhandled Server Error:", process.env.NODE_ENV === "production" ? err.message : err.stack);
    const statusCode = err.status || 500;
    const message = process.env.NODE_ENV === "production" 
      ? "Wewnętrzny błąd serwera. Spróbuj ponownie później." 
      : err.message || "Błąd wewnętrzny.";
    
    res.status(statusCode).json({
      error: message
    });
  });

  return new Promise((resolve, reject) => {
    // Desktop: loopback only — binding 0.0.0.0 exposed the local API to the
    // LAN and triggered the macOS firewall "accept incoming connections?"
    // prompt on every launch of an unsigned build.
    const host = process.env.IS_ELECTRON === "true" ? "127.0.0.1" : "0.0.0.0";
    const server = app.listen(actualPort, host, () => {
      console.log(`Server running on http://${host}:${actualPort}`);
      resolve(server);
    });
    server.on('error', reject);
  });
}

if (process.env.IS_ELECTRON !== "true") {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
  });
}
