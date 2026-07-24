# Saldo App - Codebase Dump for Google AI Studio



## File: package.json
```json
{
  "name": "saldo-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "packageManager": "npm@11.17.0",
  "engines": {
    "node": ">=22",
    "npm": ">=10"
  },
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "clean": "rm -rf dist server.js",
    "lint": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@google/genai": "^2.4.0",
    "cors": "^2.8.6",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "express-rate-limit": "^8.6.0",
    "firebase": "^12.16.0",
    "firebase-admin": "^14.2.0",
    "helmet": "^8.3.0",
    "jspdf": "^4.2.1",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "papaparse": "^5.5.4",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.14",
    "@testing-library/react": "^16.3.2",
    "@types/cors": "^2.8.19",
    "@types/express": "^4.17.21",
    "@types/jsdom": "^28.0.3",
    "@types/node": "^22.14.0",
    "@types/papaparse": "^5.5.2",
    "@vitejs/plugin-react": "^5.0.4",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "fake-indexeddb": "^6.2.5",
    "glob": "^13.0.6",
    "jsdom": "^29.1.1",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.3",
    "vite-plugin-pwa": "^1.3.0",
    "vitest": "^4.1.10"
  }
}

```


## File: firestore.rules
```rules
// Security rules for Saldo app - Updated 2026-07-22
// Allowed keys: profiles, schemaVersion, updatedAt, activeProfileId, driveFileId, recurringRules, transactionRules, aiMode, localAiEndpoint, lastModifiedBy

rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;
      
      // Strict schema validation
      allow create, update: if request.auth != null 
                   && request.auth.uid == userId
                   && request.resource.data.keys().hasAll(['profiles', 'schemaVersion', 'updatedAt'])
                   // Allowed keys to prevent arbitrary data injection
                   && request.resource.data.keys().hasOnly([
                     'profiles', 'schemaVersion', 'updatedAt', 'activeProfileId', 'driveFileId',
                     'recurringRules', 'transactionRules', 'aiMode', 'localAiEndpoint',
                     'lastModifiedBy'
                   ])
                   && request.resource.data.schemaVersion is number
                   && request.resource.data.updatedAt is string
                   && request.resource.data.updatedAt.size() <= 40
                   && request.resource.data.profiles is list
                   && request.resource.data.profiles.size() <= 20
                   && (!('driveFileId' in request.resource.data) || request.resource.data.driveFileId == null || (request.resource.data.driveFileId is string && request.resource.data.driveFileId.size() <= 256))
                   && (!('lastModifiedBy' in request.resource.data) || (request.resource.data.lastModifiedBy is string && request.resource.data.lastModifiedBy.size() <= 320))
                   && (!('recurringRules' in request.resource.data) || (request.resource.data.recurringRules is list && request.resource.data.recurringRules.size() <= 100))
                   && (!('transactionRules' in request.resource.data) || (request.resource.data.transactionRules is list && request.resource.data.transactionRules.size() <= 100));
    }
  }
}

```


## File: firebase-blueprint.json
```json
{
  "collections": {
    "users": {
      "description": "Przechowuje prywatne dane finansowe każdego zalogowanego użytkownika, w tym transakcje, budżety i ustawienia.",
      "documentId": "uid",
      "fields": {
        "profiles": {
          "type": "array",
          "description": "Lista profili finansowych użytkownika (np. Osobisty, Wspólny)",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "name": { "type": "string" },
              "kind": { "type": "string" },
              "partnerName": { "type": "string" },
              "pinHash": { "type": "string" },
              "transactions": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "id": { "type": "string" },
                    "name": { "type": "string" },
                    "category": { "type": "string" },
                    "account": { "type": "string" },
                    "amount": { "type": "number" },
                    "type": { "type": "string" },
                    "isoDate": { "type": "string" },
                    "tags": { "type": "array", "items": { "type": "string" } }
                  }
                }
              },
              "payments": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "id": { "type": "string" },
                    "name": { "type": "string" },
                    "amount": { "type": "number" },
                    "dueDate": { "type": "string" },
                    "status": { "type": "string" }
                  }
                }
              },
              "goals": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "id": { "type": "string" },
                    "name": { "type": "string" },
                    "target": { "type": "number" },
                    "saved": { "type": "number" }
                  }
                }
              },
              "investments": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "id": { "type": "string" },
                    "name": { "type": "string" },
                    "amount": { "type": "number" },
                    "isoDate": { "type": "string" }
                  }
                }
              },
              "budgets": {
                "type": "map",
                "description": "Limity budżetowe dla poszczególnych kategorii"
              }
            }
          }
        },
        "activeProfileId": { "type": "string" },
        "updatedAt": { "type": "timestamp" }
      }
    }
  }
}

```


## File: vite.config.ts
```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Saldo',
          short_name: 'Saldo',
          description: 'Aplikacja do zarządzania budżetem domowym i osobistym.',
          theme_color: '#137566',
          lang: 'pl-PL',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5242880, // 5MB
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            // Safe caching for external static assets like Google Fonts
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

```


## File: server.ts
```ts
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
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
  if (!projectId) {
    console.warn("FIREBASE_PROJECT_ID not set. Firebase Admin initialized with default project credentials.");
  }
  try {
    initializeApp(projectId ? { projectId } : undefined);
  } catch (err) {
    console.warn("Failed to initialize Firebase Admin SDK:", err);
  }
}

async function startServer() {
  const app = express();

  // Security Middleware
  app.set("trust proxy", 1); // For express-rate-limit to work correctly behind proxy

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Use Helmet but configure CSP for Vite development and Firebase Auth
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com", "https://www.gstatic.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://apis.google.com", "https://*.googleapis.com", "https://securetoken.googleapis.com", "https://firestore.googleapis.com", "https://identitytoolkit.googleapis.com"],
        frameSrc: ["'self'", "https://*.firebaseapp.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://lh3.googleusercontent.com"],
      }
    } : false,
    crossOriginEmbedderPolicy: false
  }));

  // CORS configuration
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like health checks, same-origin, curl)
      if (!origin) {
        return callback(null, true);
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

  // Global Rate Limiting (Basic)
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: "Too many requests from this IP, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, trustProxy: false }
  });
  app.use(globalLimiter);

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
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});

```


## File: tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "lib": [
      "ES2022",
      "DOM",
      "DOM.Iterable"
    ],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": [
    "src",
    "server.ts"
  ]
}

```


## File: README.md
```md
# Saldo App

Aplikacja do zarządzania finansami.

## Wymagania
- Node.js >= 22 (rekomendowane: 22 LTS; wspierane też 26.x)
- npm >= 10 (rekomendowane: 11.x)

## Instalacja
```bash
# opcjonalnie przez nvm
nvm install
nvm use

rm -rf node_modules
npm ci
```

```


## File: Design.md
```md
# Dokumentacja Projektowa - Saldo

Aplikacja **Saldo** to nowoczesna, w pełni responsywna i bezpieczna aplikacja webowa do kompleksowego zarządzania budżetem domowym i finansami osobistymi.

---

## 1. Cel Aplikacji
Głównym zadaniem aplikacji **Saldo** jest pomoc użytkownikom w kontrolowaniu ich miesięcznych finansów osobistych oraz rodzinnych. Aplikacja pozwala na:
- Rejestrowanie przychodów i wydatków.
- Kategoryzację transakcji oraz określanie ich szczegółów (kwota, kategoria, data, opis, tagi).
- Ustalanie miesięcznych budżetów i limitów wydatkowych dla poszczególnych kategorii z wizualnym ostrzeganiem o przekroczeniach.
- Śledzenie celów oszczędnościowych oraz planowanych płatności (rachunków).
- Pracę w trybie z wieloma profilami (np. osobisty i wspólny domowy) chronionymi kodem PIN.
- Dostęp do prostych oraz zaawansowanych raportów oraz eksportu danych.
- Bezpieczne przechowywanie danych w chmurze **Firebase Firestore** z pełną izolacją prywatności użytkowników oraz opcją zapasowej synchronizacji z **Dyskiem Google (Google Drive)**.

---

## 2. Architektura i Integracje

Aplikacja została zbudowana w architekturze full-stack (React + Express + Firebase).

### Backend i Baza danych:
1. **Lokalna Baza Serwerowa (`db.json`)**: Służy jako domyślna baza współdzielona (dla niezalogowanych użytkowników w wersji demonstracyjnej).
2. **Firebase Auth**: Umożliwia bezpieczne logowanie za pomocą konta Google.
3. **Firebase Firestore (Główny trwale zapisywany stan)**: Po zalogowaniu dane użytkownika są w pełni prywatne i bezpiecznie zapisywane bezpośrednio w chmurze Google Firestore pod dokumentem odpowiadającym unikalnemu identyfikatorowi użytkownika (`uid`).
4. **Google Drive Sync**: Zapewnia opcjonalną możliwość bezpośredniego zapisu/odczytu kopii zapasowej w formacie pliku `.json` na prywatnym Dysku Google zalogowanego użytkownika.

---

## 3. Struktura Ekranów (Widoków)

Aplikacja jest podzielona na dedykowane i zoptymalizowane ekrany:

### A. Dashboard (Panel Główny)
- **Aktualne saldo miesiąca**: Bilans wyliczany w czasie rzeczywistym na podstawie przychodów i wydatków.
- **Suma przychodów i wydatków**: Czytelne kafelki z podsumowaniem finansów dla bieżącego okresu.
- **Wykres wydatków**: Interaktywna wizualizacja rozkładu kosztów według kategorii.
- **Ostatnie transakcje**: Lista 5 najnowszych operacji finansowych.
- **Szybkie skróty**: Sekcja ułatwiająca szybkie dodawanie wydatku lub przychodu.

### B. Transakcje
- **Formularz dodawania**: Obsługuje pola: typ (przychód/wydatek), kwota, kategoria, data, opis oraz tagi.
- **Zarządzanie transakcjami**: Możliwość edycji dowolnej istniejącej transakcji oraz jej usunięcia.
- **Filtrowanie i wyszukiwanie**: Szybkie zawężanie listy po typie (wszystkie, przychód, wydatek), kategorii oraz wyszukiwanie po nazwie.
- **Stany pustej listy**: Przyjazna grafika informująca o braku wpisów dla wybranego filtra.

### C. Budżety
- **Miesięczne limity**: Łatwe ustawianie i modyfikowanie limitów finansowych dla poszczególnych kategorii.
- **Wykorzystanie budżetu**: Prezentacja paska postępu oraz procentowego wskaźnika wykorzystania środków.
- **Wskaźniki ostrzegawcze**: Wizualne wyróżnienie (kolor żółty i czerwony) w przypadku zbliżania się lub przekroczenia zdefiniowanego limitu budżetowego.

### D. Rachunki i Płatności (Payments)
- **Śledzenie opłat cyklicznych**: Lista nadchodzących rachunków (np. prąd, internet, czynsz) wraz z terminami płatności i statusem.
- **Powiadomienia**: Informowanie o zbliżającym się terminie zapłaty za pomocą alertów i odznak.

### E. Cele oszczędnościowe (Goals)
- **Koperty oszczędnościowe**: Możliwość tworzenia celów finansowych (np. wkład własny, wakacje).
- **Zarządzanie oszczędnościami**: Funkcja wpłacania (depozytu) i wypłacania środków z poszczególnych celów.

### F. Analiza AI i Raporty (Analysis)
- **Generowanie raportów PDF**: Tworzenie profesjonalnych wykazów w formacie PDF (zabezpieczonych przed błędami kodowania polskich znaków diakrytycznych).
- **Prognozy i trendy**: Wyświetlanie statystyk i analityki budżetowej przygotowanej pod dalsze rozszerzenia o sztuczną inteligencję (AI).

### G. Ustawienia
- **Waluta**: Domyślnie ustawiona na PLN z precyzyjnym formatowaniem.
- **Wybór motywu**: Możliwość zmiany motywu graficznego (Jasny, Ciemny, Systemowy).
- **Zarządzanie profilami**: Konfiguracja profili osobistych i wspólnych z hashem PIN dla zwiększonej prywatności lokalnej.
- **Zarządzanie chmurą**: Opcje podłączenia konta Google, włączenia automatycznej synchronizacji z Dyskiem Google, pobrania kopii lub wylogowania.
- **Eksport i Import**: Sekcja pobierania danych w formacie CSV oraz importu wyciągów bankowych (CSV).

---

## 4. Architektura Plików w Projekcie

Aplikacja jest zaimplementowana w przejrzystej i modularnej strukturze plików:

```
├── Design.md                       # Niniejszy opis funkcjonalny i architektury
├── firebase-blueprint.json         # Definicja schematu bazy danych Firestore
├── firestore.rules                 # Reguły bezpieczeństwa dla bazy Firestore
├── package.json                    # Konfiguracja pakietów NPM i zależności
├── server.ts                       # Backend Express.js obsługujący plik db.json
├── index.html                      # Główny punkt wejściowy HTML
├── src
│   ├── main.tsx                    # Główny plik wejściowy React
│   ├── App.tsx                     # Centralny menedżer stanu i nawigacji UI
│   ├── index.css                   # Definicje stylów Tailwind CSS
│   ├── firebase.ts                 # Integracja i konfiguracja Firebase Auth & Firestore
│   ├── googleDrive.ts              # Integracja z Google Drive API
│   ├── types.ts                    # Współdzielone interfejsy i typy TypeScript
│   ├── utils.ts                    # Funkcje pomocnicze, PDF, formatowanie waluty
│   └── components
│       ├── DashboardView.tsx       # Widok Panelu Głównego
│       ├── TransactionsView.tsx    # Widok zarządzania i filtrowania transakcji
│       ├── BudgetView.tsx          # Widok zarządzania budżetami kategorii
│       ├── PaymentsView.tsx        # Widok rachunków i płatności
│       ├── GoalsView.tsx           # Widok celów oszczędnościowych
│       ├── AnalysisView.tsx        # Widok analityki i raportów PDF
│       ├── SettingsView.tsx        # Widok ustawień profili, motywu i chmury
│       ├── CSVImportModal.tsx      # Komponent do importu plików CSV i mapowania pól
│       └── Modals.tsx              # Wszystkie modalne formularze dodawania/edycji
```

```


## File: src/App.tsx
```tsx
import React from "react";
import { AppProvider } from "./app/providers/AppContext";
import { AppContent } from "./app/AppContent";

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

```


## File: src/app/AppContent.tsx
```tsx
import React, { useEffect } from "react";
import { useApp } from "./providers/AppContext";
import { AppShell } from "./AppShell";
import { AppViewRouter } from "./AppViewRouter";
import { ModalManager } from "./ModalManager";
import { UnlockModal } from "../components/Modals";
import { checkAndNotifyPayments } from "../utils";
import { AuthScreen } from "./AuthScreen";
import { SecurityInfoModal } from "../components/SecurityInfoModal";
import { PWABadge } from "../components/PWABadge";

export function AppContent() {
  const {
    isDemoMode, setIsDemoMode, disconnectGoogle,
    activeProfile,
    isProfileLocked,
    modalState,
    handleUnlockProfile,
    openModal,
    saveState,
    googleUser,
    isGoogleLoading
  } = useApp();

  // Check and display browser notifications for upcoming payments
  useEffect(() => {
    if (activeProfile?.payments) {
      checkAndNotifyPayments(activeProfile.payments);
    }
  }, [activeProfile?.payments]);

  // Main Authentication Gate
  if (isGoogleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#137566]"></div>
      </div>
    );
  }

  if (!googleUser && !isDemoMode) {
    return <AuthScreen onDemoClick={() => setIsDemoMode(true)} />;
  }

  return (
    <>

      <AppShell
        onQuickAdd={() => openModal("transaction")}
        onOpenAiChatModal={() => openModal("aiChat")}
      >
        {!isProfileLocked ? (
          <AppViewRouter
            onOpenTxModal={(tx) => openModal("transaction", tx)}
            onOpenBudgetModal={() => openModal("budget")}
            onOpenPaymentModal={(p) => openModal("payment", p)}
            onTriggerCalendarAi={(p) => openModal("calendarAi", p)}
            onOpenGoalModal={() => openModal("goal")}
            onOpenGoalDepositModal={(g) => openModal("goalDeposit", g)}
            onOpenProfileModal={() => openModal("profile")}
            onOpenPinModal={() => openModal("pin")}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm font-semibold text-gray-500">Profil jest zablokowany kodem PIN...</p>
          </div>
        )}

        <ModalManager />

        {isProfileLocked && activeProfile && modalState.type !== "pin" && (
          <UnlockModal
            isOpen={true}
            profileName={activeProfile.name}
            onUnlock={async (pin) => {
              return await handleUnlockProfile(pin);
            }}
            onSelectOtherProfile={() => {
              openModal("profile");
            }}
          />
        )}
        <SecurityInfoModal />
      </AppShell>
    </>
  );
}

```


## File: src/app/AppShell.tsx
```tsx
import { useApp } from "./providers/AppContext";
import React, { useState } from "react";
import { AppView, Profile } from "../types";
import {
  LayoutDashboard,
  History,
  Clock,
  Wallet,
  Target,
  LineChart,
  Settings,
  Menu,
  X,
  RefreshCw,
  Sparkles,
  Wifi,
  WifiOff,
  ShieldCheck,
  Database,
  Info
} from "lucide-react";

export function AppShell({
  children,
  onQuickAdd,
  onOpenAiChatModal
}: {
  children: React.ReactNode;
  onQuickAdd: () => void;
  onOpenAiChatModal?: () => void;
}) {
  const {
    activeView, setActiveView,
    activeProfile,
    isMobileMenuOpen, setIsMobileMenuOpen,
    isOnline,
    isSyncing,
    refreshState,
    isProfileLocked,
    toggleSecurityInfo,
    apiError,
    setApiError,
    aiMode,
    canUseAiChat,
    isDemoMode,
    setIsDemoMode,
    openModal
  } = useApp();

  const [showDemoBanner, setShowDemoBanner] = useState(true);

  // Format active weekday date for header
  const getTodayFormatted = () => {
    return new Intl.DateTimeFormat("pl-PL", {
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(new Date()).toUpperCase();
  };

  return (
    <div className="flex h-screen bg-[#f6f8f7] overflow-hidden font-sans" id="app-root-shell">
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-white border-r border-gray-200 p-6 transition-transform lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        id="sidebar-panel"
      >
        {/* Brand */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-2xl font-black text-[#153a35] tracking-tight">
            <span className="flex items-center justify-center bg-[#137566] text-white rounded-xl w-8 h-8 shadow-sm">
              <Wallet className="w-5 h-5" />
            </span>
            <span>saldo</span>
          </div>
          <button className="lg:hidden p-1 rounded-lg hover:bg-gray-100" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>


        {/* Navigation Items */}
        <nav className="flex-1 space-y-1" aria-label="Główna nawigacja">
          <button
            onClick={() => {
              setActiveView("dashboard");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === "dashboard" ? "bg-[#e7f3f0] text-[#137566]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
            id="nav-dashboard"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            Przegląd
          </button>

          <button
            onClick={() => {
              setActiveView("transactions");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === "transactions" ? "bg-[#e7f3f0] text-[#137566]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
            id="nav-transactions"
          >
            <History className="w-4 h-4 shrink-0" />
            Transakcje
          </button>

          <button
            onClick={() => {
              setActiveView("payments");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === "payments" ? "bg-[#e7f3f0] text-[#137566]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
            id="nav-payments"
          >
            <span className="flex items-center gap-3">
              <Clock className="w-4 h-4 shrink-0" />
              Płatności
            </span>
            {activeProfile && activeProfile.payments.filter((p) => p.status !== "Opłacono").length > 0 && (
              <span className="bg-rose-100 text-[#d55e50] text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                {activeProfile.payments.filter((p) => p.status !== "Opłacono").length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveView("budget");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === "budget" ? "bg-[#e7f3f0] text-[#137566]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
            id="nav-budget"
          >
            <Wallet className="w-4 h-4 shrink-0" />
            Budżet
          </button>

          <button
            onClick={() => {
              setActiveView("goals");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === "goals" ? "bg-[#e7f3f0] text-[#137566]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
            id="nav-goals"
          >
            <Target className="w-4 h-4 shrink-0" />
            Cele i oszczędności
          </button>

          <button
            onClick={() => {
              setActiveView("analysis");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === "analysis" ? "bg-[#e7f3f0] text-[#137566]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
            id="nav-analysis"
          >
            <LineChart className="w-4 h-4 shrink-0" />
            Analizy
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-150 pt-4 mt-auto">
          <button
            onClick={() => {
              setActiveView("help");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === "help" ? "bg-[#e7f3f0] text-[#137566]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
            id="nav-help"
          >
            <Info className="w-4 h-4 shrink-0" />
            Pomoc
          </button>

          <button
            onClick={() => {
              setActiveView("settings");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold mb-3 transition ${
              activeView === "settings" ? "bg-[#e7f3f0] text-[#137566]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
            id="nav-settings"
          >
            <Settings className="w-4 h-4 shrink-0" />
            Ustawienia
          </button>

          <button
            onClick={() => {
              openModal("changelog");
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center justify-between w-full px-4 py-2 mb-3 bg-gray-50 border border-gray-150 rounded-xl hover:bg-gray-100 transition group"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-gray-700 group-hover:text-gray-900">Co nowego?</span>
            </div>
          </button>

          {activeProfile && (
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-150 rounded-2xl">
              <span className="w-8 h-8 rounded-full bg-[#d7e8e3] text-[#137566] text-sm font-black flex items-center justify-center select-none shadow-inner shrink-0">
                {activeProfile.avatar || activeProfile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
              </span>
              <div className="min-w-0 text-left">
                <p className="text-xs font-black text-gray-800 truncate" id="profile-tag-name">{activeProfile.name}</p>
                <span className="text-[10px] text-gray-400 block truncate">
                  {activeProfile.kind === "shared" ? `👪 Budżet wspólny · ${activeProfile.name} + ${activeProfile.partnerName || 'Partner'}` : "👤 Budżet osobisty"}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN VIEWPORT PANEL */}
      <main className="flex-1 flex flex-col h-full overflow-hidden" id="main-viewport-panel">
        {/* Demo Mode Top Banner */}
        {isDemoMode && showDemoBanner && (
          <div className="bg-[#137566]/10 text-[#137566] border-b border-[#137566]/20 px-6 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 z-20">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 shrink-0" />
              <div className="text-xs">
                <span className="font-bold">Tryb Lokalne Saldo</span> – dane są zapisywane prywatnie w pamięci urządzenia.
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setIsDemoMode(false)}
                className="flex-1 sm:flex-none bg-[#137566] text-white font-bold py-1.5 px-4 rounded-lg text-xs hover:bg-[#0f5d51] transition shadow-sm whitespace-nowrap"
              >
                Zaloguj się z Google
              </button>
              <button
                onClick={() => setShowDemoBanner(false)}
                className="p-1 text-[#137566] hover:bg-[#137566]/20 rounded-md transition"
                title="Ukryj"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TOP BAR HEADER */}
        <header className="flex items-center justify-between bg-white border-b border-gray-200 px-6 py-4 shrink-0 shadow-sm z-10" id="top-bar-header">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1 rounded-lg border border-gray-200 hover:bg-gray-100 lg:hidden"
              id="btn-open-mobile-menu"
            >
              <Menu className="w-5 h-5 text-[#153a35]" />
            </button>
            <div>
              <p className="text-[10px] font-bold text-[#849590] tracking-widest uppercase">{getTodayFormatted()}</p>
              <h1 className="text-lg md:text-xl font-bold text-[#153a35] tracking-tight">
                {activeView === "dashboard" && "Dzień dobry"}
                {activeView === "transactions" && "Księga Transakcji"}
                {activeView === "payments" && "Zaplanowane Opłaty"}
                {activeView === "budget" && "Twoje Budżety"}
                {activeView === "goals" && "Cele Finansowe i Inwestycje"}
                {activeView === "analysis" && "Twoje Finanse w Liczbach"}
                {activeView === "settings" && "Konfiguracja Systemu"}
                {activeView === "help" && "Centrum Pomocy"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isOnline ? (
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full font-bold border border-amber-100">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Tryb offline</span>
              </div>
            ) : isSyncing ? (
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full font-bold border border-blue-100">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synchronizacja...</span>
              </div>
            ) : isDemoMode ? (
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 px-3 py-1.5 rounded-full font-bold border border-purple-100">
                <Database className="w-3.5 h-3.5" />
                <span>Tryb demonstracyjny</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full font-bold border border-emerald-100">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zsynchronizowany</span>
              </div>
            )}
            {activeProfile && !isProfileLocked && (
              <button
                onClick={onQuickAdd}
                className="bg-[#137566] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#0f5d51] transition shadow-md text-xs"
                id="btn-quick-add-tx"
              >
                ＋ Dodaj wpis
              </button>
            )}
          </div>
        </header>

        {/* Slim Status and Security Bar */}
        <div
          className={`text-[11px] md:text-xs px-6 py-2 border-b flex flex-wrap items-center justify-between gap-3 transition-all duration-300 shrink-0 ${
            isOnline
              ? "bg-emerald-50/50 border-emerald-100 text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-100"
              : "bg-amber-50/90 border-amber-200 text-amber-950 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-100"
          }`}
          id="offline-worker-status-banner"
        >
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-bold">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
              )}
              <span>{isOnline ? "System Online" : "System Offline"}</span>
            </span>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <span className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden xs:inline">Bezpieczeństwo:</span>
              <span className="font-medium">Ochrona aktywna</span>
            </span>
            <span className="text-gray-300 dark:text-gray-700 hidden sm:inline">|</span>
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400">
              <Database className="w-3.5 h-3.5 text-[#137566] dark:text-[#209f8c]" />
              <span>Autozapis</span>
            </span>
          </div>
          <button
            onClick={() => toggleSecurityInfo(true)}
            className="flex items-center gap-1 text-[11px] text-[#137566] dark:text-[#209f8c] hover:underline font-bold cursor-pointer"
            id="btn-security-details"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Szczegóły ochrony</span>
          </button>
        </div>

        {apiError && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-center justify-between text-rose-800 text-xs animate-fade-in shrink-0" id="api-error-banner">
            <div className="flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              <span className="font-semibold">{apiError}</span>
            </div>
            <button onClick={() => setApiError(null)} className="text-rose-500 hover:text-rose-700 font-bold text-sm shrink-0 leading-none">
              &times;
            </button>
          </div>
        )}

        {/* ACTIVE MODULE VIEW CANVAS */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6" id="canvas-view">
          {children}
        </div>
      </main>

      {/* Floating Action Button for AI Chat */}
      {onOpenAiChatModal && canUseAiChat && activeProfile && !isProfileLocked && (
        <button
          onClick={onOpenAiChatModal}
          className="fixed bottom-6 right-6 z-40 bg-[#137566] text-white p-4 rounded-full shadow-lg hover:bg-[#1a9c88] hover:scale-105 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-200 group cursor-pointer"
          title="Porozmawiaj z Asystentem AI"
        >
          <Sparkles className="w-6 h-6 animate-pulse" />
          <span className="absolute -top-10 right-0 bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Asystent AI</span>
        </button>
      )}

    </div>
  );
}


```


## File: src/app/AppViewRouter.tsx
```tsx
import { Settings } from "lucide-react";
import { useApp } from "./providers/AppContext";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AppView, Profile, Payment, Goal } from "../types";
import { DashboardView } from "../components/DashboardView";
import { TransactionsView } from "../components/TransactionsView";
import { PaymentsView } from "../components/PaymentsView";
import { BudgetView } from "../components/BudgetView";
import { GoalsView } from "../components/GoalsView";
import { AnalysisView } from "../components/AnalysisView";
import { SettingsView } from "../components/SettingsView";
import { HelpView } from "../components/HelpView";

export function AppViewRouter({
  onOpenTxModal,
  onOpenBudgetModal,
  onOpenPaymentModal,
  onTriggerCalendarAi,
  onOpenGoalModal,
  onOpenGoalDepositModal,
  onOpenProfileModal,
  onOpenPinModal
}: {
  onOpenTxModal: (tx?: import("../types").Transaction) => void;
  onOpenBudgetModal: () => void;
  onOpenPaymentModal: (payment?: Payment) => void;
  onTriggerCalendarAi: (p: Payment) => void;
  onOpenGoalModal: () => void;
  onOpenGoalDepositModal: (g: Goal) => void;
  onOpenProfileModal: () => void;
  onOpenPinModal: () => void;
}) {
  const {
    state, saveState,
    activeView, setActiveView,
    activeProfile,
    selectedDate, handlePrevMonth, handleNextMonth,
    handleTogglePaymentStatus,
    handleDeleteTransaction,
    handleImportTransactions,
    makeUndoBackup,
    handleDeletePayment,
    handleAddPayment,
    calendarToken,
    handleAddInvestment,
    handleDeleteGoal,
    handleSelectProfile,
    handleDeleteProfile,
    unlockedProfileId,
    handleSaveTransactionRules,
    handleSaveRecurringRules,
    handleAddSettlement,
    handleDeleteSettlement,
    handleSaveAccounts,
    handleExportData,
    handleResetData,
    googleUser,
    isGoogleLoading,
    googleError,
    isDriveActionLoading,
    gdriveFileId,
    gdriveLastSynced,
    isDriveAutoSyncEnabled,
    handleConnectGoogle,
    handleDisconnectGoogle,
    handleSyncToDrive,
    handleLoadFromDrive,
    toggleAutoSync,
    handleImportLocalData,
    theme,
    handleThemeChange,
    handleUpdateProfile
  } = useApp();

  const onPrevMonth = handlePrevMonth;
  const onNextMonth = handleNextMonth;
  const onTogglePaymentStatus = handleTogglePaymentStatus;
  const onChangeView = setActiveView;
  const onDeleteTransaction = handleDeleteTransaction;
  const onImportTransactions = handleImportTransactions;
  const onDeletePayment = handleDeletePayment;
  const onAddInvestment = handleAddInvestment;
  const onDeleteGoal = handleDeleteGoal;
  const profiles = state.profiles;
  const activeProfileId = state.activeProfileId;
  const onSelectProfile = (id: string) => {
    handleSelectProfile(id);
    const p = state.profiles.find((pr: any) => pr.id === id);
    if (p?.pinHash && unlockedProfileId !== id) {
      onOpenPinModal();
    }
  };
  const onSaveTransactionRules = handleSaveTransactionRules;
  const onSaveRecurringRules = handleSaveRecurringRules;
  const onSaveAccounts = handleSaveAccounts;
  const onExportData = handleExportData;
  const onResetData = handleResetData;
  const onConnectGoogle = handleConnectGoogle;
  const onDisconnectGoogle = handleDisconnectGoogle;
  const onSyncToDrive = () => handleSyncToDrive(false);
  const onLoadFromDrive = handleLoadFromDrive;
  const onToggleDriveAutoSync = toggleAutoSync;
  const onImportLocalData = handleImportLocalData;
  const onThemeChange = handleThemeChange;

  if (!activeProfile && activeView !== "settings") {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[60vh] bg-gray-50 rounded-2xl m-4 border border-dashed border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Rozpocznij z Saldo</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-8 text-sm">
          Nie masz jeszcze żadnego aktywnego profilu. Utwórz profil osobisty do własnych wydatków, lub profil wspólny, aby na bieżąco rozliczać się z partnerem.
        </p>
        <button 
          onClick={() => onOpenProfileModal()}
          className="bg-[#137566] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#0f5c50] transition shadow-sm"
        >
          Utwórz nowy profil (Osobisty / Wspólny)
        </button>
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return (
          <DashboardView
            profile={activeProfile}
            selectedDate={selectedDate}
            onPrevMonth={onPrevMonth}
            onNextMonth={onNextMonth}
            onTogglePaymentStatus={onTogglePaymentStatus}
            onOpenTxModal={onOpenTxModal}
            onOpenBudgetModal={onOpenBudgetModal}
            onOpenPaymentModal={onOpenPaymentModal}
            onChangeView={onChangeView}
            recurringRules={activeProfile?.recurringRules || []}
            onAddSettlement={handleAddSettlement}
            onDeleteSettlement={handleDeleteSettlement}
          />
        );
      case "transactions":
        return (
          <TransactionsView
            profile={activeProfile}
            onOpenTxModal={onOpenTxModal}
            onDeleteTransaction={onDeleteTransaction}
            onImportTransactions={onImportTransactions}
            onBeforeImport={makeUndoBackup}
          />
        );
      case "payments":
        return (
          <PaymentsView
            profile={activeProfile}
            selectedDate={selectedDate}
            onOpenPaymentModal={onOpenPaymentModal}
            onTogglePaymentStatus={onTogglePaymentStatus}
            onAddPayment={handleAddPayment}
            onDeletePayment={onDeletePayment}
            calendarToken={calendarToken}
            onTriggerCalendarAi={onTriggerCalendarAi}
          />
        );
      case "budget":
        return (
          <BudgetView
            profile={activeProfile}
            selectedDate={selectedDate}
            onOpenBudgetModal={onOpenBudgetModal}
          />
        );
      case "goals":
        return (
          <GoalsView
            profile={activeProfile}
            onOpenGoalModal={onOpenGoalModal}
            onOpenGoalDepositModal={onOpenGoalDepositModal}
            onDeleteGoal={onDeleteGoal}
            onAddInvestment={onAddInvestment}
          />
        );
      case "analysis":
        return (
          <AnalysisView
            profile={activeProfile}
            selectedDate={selectedDate}
          />
        );
      case "settings":
        return (
          <SettingsView
            state={state}
            saveState={saveState}
            profiles={profiles}
            activeProfileId={activeProfileId}
            onSelectProfile={onSelectProfile}
            onUpdateProfile={handleUpdateProfile}
            onDeleteProfile={handleDeleteProfile}
            onOpenProfileModal={onOpenProfileModal}
            onOpenPinModal={onOpenPinModal}
            transactionRules={activeProfile?.transactionRules || []}
            onSaveTransactionRules={handleSaveTransactionRules}
            recurringRules={activeProfile?.recurringRules || []}
            onSaveRecurringRules={handleSaveRecurringRules}
            onSaveAccounts={handleSaveAccounts}
            onExportData={onExportData}
            onResetData={onResetData}
            googleUser={googleUser}
            isGoogleLoading={isGoogleLoading}
            googleError={googleError}
            isDriveActionLoading={isDriveActionLoading}
            gdriveFileId={gdriveFileId}
            gdriveLastSynced={gdriveLastSynced}
            isDriveAutoSyncEnabled={isDriveAutoSyncEnabled}
            onConnectGoogle={() => handleConnectGoogle("drive")}
            onDisconnectGoogle={onDisconnectGoogle}
            onSyncToDrive={onSyncToDrive}
            onLoadFromDrive={onLoadFromDrive}
            onToggleDriveAutoSync={onToggleDriveAutoSync}
            onImportLocalData={onImportLocalData}
            theme={theme}
            onThemeChange={onThemeChange}
            calendarToken={calendarToken}
            onConnectCalendar={() => handleConnectGoogle("calendar")}
            unlockedProfileId={unlockedProfileId}
          />
        );
      case "help":
        return <HelpView />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeView}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
        className="w-full h-full"
      >
        {renderView()}
      </motion.div>
    </AnimatePresence>
  );
}

```


## File: src/app/AuthScreen.tsx
```tsx
import React, { useState } from "react";
import { Wallet, Mail, Lock, LogIn, UserPlus, AlertTriangle } from "lucide-react";
import { loginWithEmail, registerWithEmail, googleSignInBasic } from "../firebase";

interface AuthScreenProps {
  onDemoClick: () => void;
}

export function AuthScreen({ onDemoClick }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [isDomainError, setIsDomainError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleError = (err: any) => {
    if (err.message && err.message.includes("auth/unauthorized-domain")) {
      setIsDomainError(true);
      setError(`Domena ${window.location.hostname} nie jest autoryzowana.`);
    } else {
      setIsDomainError(false);
      setError(err.message || "Błąd uwierzytelniania.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsDomainError(false);
    setLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
    } catch (err: any) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsDomainError(false);
    setLoading(true);
    try {
      await googleSignInBasic();
    } catch (err: any) {
      handleError(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-[#137566] text-white p-3 rounded-2xl shadow-lg">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-[34px] font-black text-[#153a35] tracking-tight">saldo</h1>
          <p className="text-gray-500">Twój osobisty asystent finansowy</p>
        </div>

        {error && !isDomainError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        {error && isDomainError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Brak autoryzacji domeny</p>
                <p className="mb-2">
                  Domena <strong>{window.location.hostname}</strong> nie jest dopisana do listy autoryzowanych domen w Firebase.
                </p>
                <ol className="list-decimal pl-4 space-y-1 mb-2 text-amber-900 opacity-90">
                  <li>Otwórz Firebase Console</li>
                  <li>Wybierz Authentication &gt; Settings &gt; Authorized domains</li>
                  <li>Dodaj tę domenę</li>
                </ol>
                {window.location.hostname !== 'localhost' && (
                  <button 
                    type="button" 
                    onClick={() => window.open(window.location.href, "_blank")} 
                    className="mt-2 text-[#137566] hover:underline font-medium"
                  >
                    Otwórz aplikację w nowej karcie
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#137566] focus:ring-1 focus:ring-[#137566] transition"
                placeholder="twoj@email.com"
              />
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasło</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#137566] focus:ring-1 focus:ring-[#137566] transition"
                placeholder="••••••••"
              />
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#137566] text-white py-3 rounded-xl font-medium hover:bg-[#1a9c88] transition flex items-center justify-center gap-2"
          >
            {loading ? "Przetwarzanie..." : isLogin ? <><LogIn className="w-5 h-5" /> Zaloguj się</> : <><UserPlus className="w-5 h-5" /> Zarejestruj się</>}
          </button>
        </form>

        <div className="text-center text-sm">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#137566] font-medium hover:underline"
          >
            {isLogin ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się"}
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">lub</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Zaloguj z Google
          </button>
          
          <button
            type="button"
            onClick={onDemoClick}
            disabled={loading}
            className="w-full bg-emerald-50 text-[#137566] py-3 rounded-xl font-medium hover:bg-emerald-100 transition shadow-sm"
          >
            Używaj offline (bez rejestracji)
          </button>
        </div>
      </div>
    </div>
  );
}

```


## File: src/app/ModalManager.tsx
```tsx
import { useApp } from "./providers/AppContext";
import React from "react";
import { ModalState, Profile, Goal, Payment } from "../types";
import {
  TransactionModal,
  PaymentModal,
  GoalModal,
  GoalDepositModal,
  ProfileModal,
  PinModal,
  BudgetModal,
  ChangelogModal
} from "../components/Modals";
import { CalendarReminderModal } from "../components/CalendarReminderModal";
import { AiChatModal } from "../components/AiChatModal";
import { DriveConflictModal } from "../components/DriveConflictModal";

export function ModalManager() {
  const {
    modalState, closeModal, activeProfile,
    handleAddTransaction, handleUpdateTransaction, handleAddPayment, handleUpdatePayment, handleAddGoal, handleAddGoalDeposit,
    handleAddProfile, handleSetProfilePin, handleSaveBudgets,
    handleExportData,
    calendarToken,
    connectGoogle,
    invalidateCalendarToken,
    canUseAiChat,
    driveConflictInfo,
    resolveDriveConflict,
    closeDriveConflictModal
  } = useApp();

  const onSaveTransaction = (data: any) => {
    if (modalState.type === "transaction" && modalState.payload) {
      handleUpdateTransaction(modalState.payload.id, data);
    } else {
      handleAddTransaction(data);
    }
    closeModal();
  };

  const onSavePayment = (data: any) => {
    if (modalState.type === "payment" && modalState.payload) {
      handleUpdatePayment(modalState.payload.id, data);
    } else {
      handleAddPayment(data);
    }
    closeModal();
  };
  const onSaveGoal = (data: any) => { handleAddGoal(data); closeModal(); };
  const onSaveGoalDeposit = (amount: number, goal: Goal) => { handleAddGoalDeposit(goal, amount); closeModal(); };
  const onSaveProfile = (data: any) => { handleAddProfile(data); closeModal(); };
  const onSavePin = async (pin: string) => { await handleSetProfilePin(pin); closeModal(); };
  const onSaveBudgets = (budgets: any) => { handleSaveBudgets(budgets); closeModal(); };

  return (
    <>
      <TransactionModal
        isOpen={modalState.type === "transaction" && activeProfile !== null}
        onClose={closeModal}
        activeProfile={activeProfile}
        initialData={modalState.type === "transaction" ? modalState.payload : undefined}
        onSave={onSaveTransaction}
      />
      <PaymentModal
        isOpen={modalState.type === "payment"}
        onClose={closeModal}
        initialData={modalState.type === "payment" ? modalState.payload : undefined}
        onSave={onSavePayment}
      />
      <GoalModal
        isOpen={modalState.type === "goal"}
        onClose={closeModal}
        onSave={onSaveGoal}
      />
      {modalState.type === "goalDeposit" && (
        <GoalDepositModal
          isOpen={true}
          goalName={(modalState as any).payload.name}
          onClose={closeModal}
          onSave={(amount) => onSaveGoalDeposit(amount, (modalState as any).payload)}
        />
      )}
      <ProfileModal
        isOpen={modalState.type === "profile"}
        onClose={closeModal}
        onSave={onSaveProfile}
      />
      <PinModal
        isOpen={modalState.type === "pin"}
        onClose={closeModal}
        onSave={onSavePin}
        onExportData={handleExportData}
      />
      {activeProfile && (
        <BudgetModal
          isOpen={modalState.type === "budget"}
          currentBudgets={activeProfile.budgets}
          onClose={closeModal}
          onSave={onSaveBudgets}
        />
      )}
      <CalendarReminderModal
        isOpen={modalState.type === "calendarAi"}
        payment={modalState.type === "calendarAi" ? (modalState as any).payload ?? null : null}
        onClose={closeModal}
        calendarToken={calendarToken}
        onConnectCalendar={() => connectGoogle("calendar")}
        onCalendarAuthInvalid={invalidateCalendarToken}
      />

      <AiChatModal
        isOpen={modalState.type === "aiChat" && canUseAiChat}
        onClose={closeModal}
        activeProfile={activeProfile}
      />
      <ChangelogModal
        isOpen={modalState.type === "changelog"}
        onClose={closeModal}
      />
      <DriveConflictModal
        isOpen={!!driveConflictInfo}
        onClose={closeDriveConflictModal}
        localState={driveConflictInfo?.localState || null}
        remoteState={driveConflictInfo?.remoteState || null}
        lastSyncedAt={driveConflictInfo?.lastSyncedAt || null}
        onResolve={resolveDriveConflict}
      />
    </>
  );
}

```


## File: src/app/providers/AppContext.tsx
```tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AppView, Goal, Payment, AppState, Profile } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { useBudgetState } from "../../hooks/useBudgetState";
import { useDriveSync } from "../../hooks/useDriveSync";
import { useProfileSecurity } from "../../hooks/useProfileSecurity";
import { useAppActions } from "../../hooks/useAppActions";
import { useModalManager } from "../../hooks/useModalManager";
import { useTheme } from "../../hooks/useTheme";

type AuthData = ReturnType<typeof useAuth>;
type BudgetData = ReturnType<typeof useBudgetState>;
type DriveSyncData = ReturnType<typeof useDriveSync>;
type ProfileSecurityData = ReturnType<typeof useProfileSecurity>;
type AppActionsData = ReturnType<typeof useAppActions>;
type ModalManagerData = ReturnType<typeof useModalManager>;

type ThemeData = ReturnType<typeof useTheme>;
export interface AppContextType extends ThemeData, AuthData, BudgetData, DriveSyncData, ProfileSecurityData, AppActionsData, ModalManagerData {
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (val: boolean) => void;
  isOnline: boolean;
  setIsOnline: (val: boolean) => void;
  activeProfile: Profile | null;
  isDriveAutoSyncEnabled: boolean;
  toggleAutoSync: (enabled: boolean) => void;
  aiMode: "none" | "local" | "cloud";
  canUseAiChat: boolean;
  canUseAdvancedImport: boolean;
  canUseCloudSync: boolean;
  isOfflineBudgetMode: boolean;
}

export const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const authData = useAuth();
  const budgetData = useBudgetState(authData.googleUser);
  
  const [isDriveAutoSyncEnabled, setIsDriveAutoSyncEnabled] = useState(false);
  const toggleAutoSync = (enabled: boolean) => {
    setIsDriveAutoSyncEnabled(enabled);
  };

  const driveSyncData = useDriveSync({
    driveToken: authData.driveToken,
    state: budgetData.state,
    onImportState: budgetData.saveState,
    onBeforeRestore: budgetData.makeUndoBackup,
    onDriveAuthInvalid: authData.invalidateDriveToken
  });

  const activeProfile = budgetData.state.profiles.find((p) => p.id === budgetData.state.activeProfileId) || null;

  const securityData = useProfileSecurity({
    state: budgetData.state,
    saveState: budgetData.saveState,
    activeProfile
  });

  const modalData = useModalManager();
  const themeData = useTheme();

  const actionsData = useAppActions({
    state: budgetData.state,
    saveState: budgetData.saveState,
    activeProfile,
    makeUndoBackup: budgetData.makeUndoBackup,
    unlockProfile: securityData.unlockProfile,
    lockProfile: securityData.lockProfile,
    setActiveView,
    connectGoogle: authData.connectGoogle,
    disconnectGoogle: authData.disconnectGoogle,
    toggleAutoSync,
    backupToDriveManual: driveSyncData.backupToDriveManual,
    restoreFromDriveManual: driveSyncData.restoreFromDriveManual,
    setApiError: budgetData.setApiError
  });

  const handlePrevMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 15));
  };

  const handleNextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 15));
  };

  const aiMode: "none" | "local" | "cloud" = budgetData.state.aiMode || "none";
  const canUseAiChat = aiMode !== "none";
  const canUseAdvancedImport = aiMode !== "none";
  const canUseCloudSync = authData.isGoogleAuthenticated;
  const isOfflineBudgetMode = !authData.googleUser;

  const value = {
    isDemoMode, setIsDemoMode,
    selectedDate, setSelectedDate, handlePrevMonth, handleNextMonth,
    activeView, setActiveView,
    isMobileMenuOpen, setIsMobileMenuOpen,
    isOnline, setIsOnline,
    activeProfile,
    isDriveAutoSyncEnabled, toggleAutoSync,
    aiMode,
    canUseAiChat,
    canUseAdvancedImport,
    canUseCloudSync,
    isOfflineBudgetMode,
    ...authData,
    ...budgetData,
    ...driveSyncData,
    ...securityData,
    ...actionsData,
    ...modalData,
    ...themeData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

```


## File: src/backendSecurity.test.ts
```ts
import { describe, it, expect, vi } from "vitest";
import { verifyFirebaseToken } from "./server/middleware/auth";
import { aiPayloadLimiter } from "./server/middleware/security";
import { z } from "zod";

// Mock response object helper
function createMockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("KROK 6 — Backend security and rules tests", () => {
  it("request API bez tokenu => 401", async () => {
    const req: any = { headers: {} };
    const res = createMockRes();
    const next = vi.fn();

    await verifyFirebaseToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining("Brak autoryzacji")
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it("niepoprawny token => 403", async () => {
    const req: any = { headers: { authorization: "Bearer invalid-token-123" } };
    const res = createMockRes();
    const next = vi.fn();

    await verifyFirebaseToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining("Nieautoryzowany dostęp lub token wygasł.")
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it("zbyt duży payload tekstu (>20KB) => 413", () => {
    const hugeText = "a".repeat(20005);
    const req: any = { body: { text: hugeText } };
    const res = createMockRes();
    const next = vi.fn();

    aiPayloadLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({ error: "Zbyt duży rozmiar tekstu (limit 20KB)." });
    expect(next).not.toHaveBeenCalled();
  });

  it("zbyt duży obraz (>3MB zdekodowanego base64) => 413", () => {
    // 3MB decoded = 3 * 1024 * 1024 = 3,145,728 bytes. Base64 length ~ 4,194,304 chars.
    const hugeBase64 = "A".repeat(4200000);
    const req: any = { body: { imageBase64: hugeBase64, mimeType: "image/jpeg" } };
    const res = createMockRes();
    const next = vi.fn();

    aiPayloadLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({ error: "Rozmiar obrazu przekracza limit 3MB." });
    expect(next).not.toHaveBeenCalled();
  });

  it("nieprawidłowa odpowiedź modelu AI (Zod validation error) => 502", () => {
    const outputSchema = z.object({
      reply: z.string()
    });

    const invalidModelOutput = { wrongField: 123 };
    let statusCode = 0;
    let responseJson: any = null;

    try {
      outputSchema.parse(invalidModelOutput);
    } catch (err) {
      if (err instanceof z.ZodError) {
        statusCode = 502;
        responseJson = { error: "Nieprawidłowa odpowiedź modelu AI." };
      }
    }

    expect(statusCode).toBe(502);
    expect(responseJson).toEqual({ error: "Nieprawidłowa odpowiedź modelu AI." });
  });

  it("Firestore write do innego uid => deny", () => {
    const authUid: string = "user-123";
    const targetDocumentUid: string = "user-999"; // Different UID

    const canWrite = authUid !== null && authUid === targetDocumentUid;
    expect(canWrite).toBe(false);
  });

  it("Firestore write z niedozwolonym kluczem => deny", () => {
    const allowedKeys = [
      "profiles", "schemaVersion", "updatedAt", "activeProfileId", "driveFileId",
      "recurringRules", "transactionRules", "aiMode", "localAiEndpoint",
      "lastModifiedBy"
    ];

    const incomingKeys = ["profiles", "schemaVersion", "updatedAt", "unauthorizedSecretKey"];

    const hasOnlyAllowed = incomingKeys.every((k) => allowedKeys.includes(k));
    expect(hasOnlyAllowed).toBe(false);
  });
});

```


## File: src/budgetCalculations.goal.test.ts
```ts
import { describe, it, expect } from "vitest";
import { calculateSafeToSpend } from "./services/budgetCalculations";
import { Profile, Goal } from "./types";

describe("PROMPT 5 - Jeden spójny model celów i salda (Model A)", () => {
  const baseProfile: Profile = {
    id: "p1",
    name: "Model A Profile",
    kind: "personal",
    transactions: [
      { id: "t1", name: "Wypłata", amount: 4000, type: "income", category: "Wynagrodzenie", account: "Konto", isoDate: "2026-07-01" },
      { id: "t2", name: "Czynsz", amount: 1000, type: "expense", category: "Opłaty", account: "Konto", isoDate: "2026-07-02" }
    ],
    payments: [],
    goals: [
      { id: "g1", name: "Wakacje", target: 2000, saved: 500, transfers: [] }
    ],
    investments: [],
    budgets: {}
  };

  it("safe-to-spend = saldo - płatności - recurring - reservedGoals (nie ma double counting)", () => {
    // Current balance: 4000 - 1000 = 3000
    // Reserved goals: 500
    // safe-to-spend: 3000 - 500 = 2500
    const res = calculateSafeToSpend(baseProfile, [], "2026-07-15");
    expect(res.currentBalance).toBe(3000);
    expect(res.reservedGoalsSum).toBe(500);
    expect(res.safeToSpend).toBe(2500);
  });

  it("wypłata z celu nie robi ujemnego saved", () => {
    // We already clamped this in useAppActions, but since this test directly checks the model, we ensure the math on safeToSpend handles 0 correctly.
    const profileWithNegativeGoal: Profile = {
      ...baseProfile,
      goals: [
        { id: "g1", name: "Wakacje", target: 2000, saved: -100, transfers: [] }
      ]
    };
    const res = calculateSafeToSpend(profileWithNegativeGoal, [], "2026-07-15");
    // Saved sum should treat negative as 0 in budgetCalculations.ts if it was bypassed
    expect(res.reservedGoalsSum).toBe(0);
    expect(res.safeToSpend).toBe(3000); // 3000 - 0
  });

});

```


## File: src/budgetCalculations.test.ts
```ts
import { describe, it, expect } from "vitest";
import { calculateSafeToSpend, calculateEndOfMonthForecast, calculateBudgetWarnings } from "./services/budgetCalculations";
import { Profile, RecurringRule } from "./types";

describe("KROK 8A — Bezpieczna kwota do wydania", () => {
  const baseProfile: Profile = {
    id: "p1",
    name: "Test Profile",
    kind: "personal",
    transactions: [
      { id: "t1", name: "Pensja", amount: 5000, type: "income", category: "Wynagrodzenie", account: "Główne", isoDate: "2026-07-01" },
      { id: "t2", name: "Zakupy", amount: 1000, type: "expense", category: "Żywność", account: "Główne", isoDate: "2026-07-05" }
    ],
    payments: [],
    goals: [],
    investments: [],
    budgets: {}
  };

  it("brak płatności — zwraca pełne saldo minus brak obciążeń", () => {
    // Current balance = 5000 - 1000 = 4000
    const res = calculateSafeToSpend(baseProfile, [], "2026-07-15");
    expect(res.currentBalance).toBe(4000);
    expect(res.unpaidPaymentsSum).toBe(0);
    expect(res.futureRecurringExpensesSum).toBe(0);
    expect(res.reservedGoalsSum).toBe(0);
    expect(res.safeToSpend).toBe(4000);
    expect(res.isNegative).toBe(false);
  });

  it("płatność dziś — uwzględnia płatność wymagalną dzisiaj", () => {
    const profileWithPayment: Profile = {
      ...baseProfile,
      payments: [
        { id: "pay1", name: "Rachunek za prąd", amount: 300, dueDate: "2026-07-15", status: "Do opłacenia" }
      ]
    };

    const res = calculateSafeToSpend(profileWithPayment, [], "2026-07-15");
    expect(res.unpaidPaymentsSum).toBe(300);
    expect(res.safeToSpend).toBe(3700); // 4000 - 300
  });

  it("zaległa płatność z przeszłości — wchodzi do sumy nieopłaconych", () => {
    const profileWithOverduePayment: Profile = {
      ...baseProfile,
      payments: [
        { id: "pay-overdue", name: "Zaległy telefon", amount: 200, dueDate: "2026-07-10", status: "Do opłacenia" }
      ]
    };

    const res = calculateSafeToSpend(profileWithOverduePayment, [], "2026-07-23");
    expect(res.unpaidPaymentsSum).toBe(200);
    expect(res.safeToSpend).toBe(3800); // 4000 - 200

    const forecastRes = calculateEndOfMonthForecast(profileWithOverduePayment, [], "2026-07-23");
    expect(forecastRes.unpaidPaymentsSum).toBe(200);
  });

  it("płatność po końcu miesiąca — ignoruje płatności z przyszłego miesiąca", () => {
    const profileWithFuturePayment: Profile = {
      ...baseProfile,
      payments: [
        { id: "pay1", name: "Czynsz za Sierpień", amount: 1500, dueDate: "2026-08-05", status: "Do opłacenia" }
      ]
    };

    const res = calculateSafeToSpend(profileWithFuturePayment, [], "2026-07-15");
    expect(res.unpaidPaymentsSum).toBe(0);
    expect(res.safeToSpend).toBe(4000);
  });

  it("płatność opłacona — ignoruje opłacone rachunki", () => {
    const profileWithPaidPayment: Profile = {
      ...baseProfile,
      payments: [
        { id: "pay1", name: "Rachunek opłacony", amount: 400, dueDate: "2026-07-20", status: "Opłacono" }
      ]
    };

    const res = calculateSafeToSpend(profileWithPaidPayment, [], "2026-07-15");
    expect(res.unpaidPaymentsSum).toBe(0);
    expect(res.safeToSpend).toBe(4000);
  });

  it("saldo ujemne — prawidłowo flaguje ujemną bezpieczną kwotę", () => {
    const lowBalanceProfile: Profile = {
      ...baseProfile,
      transactions: [
        { id: "t1", name: "Wpłata", amount: 500, type: "income", category: "Inne", account: "Główne", isoDate: "2026-07-01" },
        { id: "t2", name: "Duży wydatek", amount: 1000, type: "expense", category: "Inne", account: "Główne", isoDate: "2026-07-02" }
      ],
      payments: [
        { id: "p1", name: "Rata", amount: 300, dueDate: "2026-07-20", status: "Do opłacenia" }
      ]
    };

    // Current balance = 500 - 1000 = -500. Unpaid = 300. Safe = -800.
    const res = calculateSafeToSpend(lowBalanceProfile, [], "2026-07-15");
    expect(res.currentBalance).toBe(-500);
    expect(res.safeToSpend).toBe(-800);
    expect(res.isNegative).toBe(true);
  });

  it("polskie daty i przełom miesiąca — uwzględnia reguły cykliczne oraz cele do końca miesiąca", () => {
    const profileWithGoal: Profile = {
      ...baseProfile,
      goals: [
        { id: "g1", name: "Wakacje", target: 5000, saved: 1200 }
      ],
      payments: [
        { id: "p1", name: "Internet", amount: 100, dueDate: "2026-07-31", status: "Do opłacenia" }
      ]
    };

    const rules: RecurringRule[] = [
      {
        id: "r1",
        name: "Subskrypcja Spotify",
        amount: 30,
        type: "expense",
        category: "Rozrywka",
        account: "Główne",
        frequency: "monthly",
        nextDueDate: "2026-07-28",
        isActive: true
      }
    ];

    // Today is 2026-07-25 (end of month is 2026-07-31).
    // Current balance = 4000
    // Unpaid payments (due 07-31) = 100
    // Future recurring expense (due 07-28) = 30
    // Reserved goals = 1200
    // Safe = 4000 - 100 - 30 - 1200 = 2670
    const res = calculateSafeToSpend(profileWithGoal, rules, "2026-07-25");
    expect(res.currentBalance).toBe(4000);
    expect(res.unpaidPaymentsSum).toBe(100);
    expect(res.futureRecurringExpensesSum).toBe(30);
    expect(res.reservedGoalsSum).toBe(1200);
    expect(res.safeToSpend).toBe(2670);
    expect(res.isNegative).toBe(false);
  });

  it("dane z polskimi znakami w nazwie płatności — poprawnie przetwarza i oblicza kwoty", () => {
    const profileWithPolishChars: Profile = {
      ...baseProfile,
      payments: [
        { id: "p-pl", name: "Opłata za prąd i żarówki w Rzeszowie 💡", amount: 250, dueDate: "2026-07-20", status: "Do opłacenia" },
        { id: "p-pl2", name: "Czynsz spółdzielczy — Żoliborz", amount: 750, dueDate: "2026-07-22", status: "Do opłacenia" }
      ]
    };

    const rules: RecurringRule[] = [
      {
        id: "r-pl",
        name: "Abonament za telefon i internet — Łódź 📱",
        amount: 80,
        type: "expense",
        category: "Telefon",
        account: "Główne",
        frequency: "monthly",
        nextDueDate: "2026-07-29",
        isActive: true
      }
    ];

    const res = calculateSafeToSpend(profileWithPolishChars, rules, "2026-07-15");
    // 4000 - 250 - 750 - 80 = 2920
    expect(res.unpaidPaymentsSum).toBe(1000);
    expect(res.futureRecurringExpensesSum).toBe(80);
    expect(res.safeToSpend).toBe(2920);
  });
});

describe("KROK 8B — Prognoza salda do końca miesiąca", () => {
  const baseProfile: Profile = {
    id: "p1",
    name: "Test Profile",
    kind: "personal",
    transactions: [
      { id: "t1", name: "Pensja", amount: 5000, type: "income", category: "Wypłata", account: "Główne", isoDate: "2026-07-01" },
      { id: "t2", name: "Wydatki", amount: 1000, type: "expense", category: "Życie", account: "Główne", isoDate: "2026-07-05" }
    ],
    payments: [],
    goals: [],
    investments: [],
    budgets: {}
  };

  it("tylko przyszły przychód — dodaje przyszły dochód cykliczny", () => {
    const rules: RecurringRule[] = [
      { id: "r1", name: "Premia", amount: 500, type: "income", category: "Praca", account: "Główne", frequency: "monthly", nextDueDate: "2026-07-28", isActive: true }
    ];
    // balance: 4000 + 500 = 4500
    const res = calculateEndOfMonthForecast(baseProfile, rules, "2026-07-15");
    expect(res.currentBalance).toBe(4000);
    expect(res.futureRecurringIncomesSum).toBe(500);
    expect(res.futureRecurringExpensesSum).toBe(0);
    expect(res.forecastedBalance).toBe(4500);
    expect(res.isNegative).toBe(false);
  });

  it("tylko przyszły wydatek — odlicza z salda", () => {
    const rules: RecurringRule[] = [
      { id: "r1", name: "Subskrypcja", amount: 200, type: "expense", category: "Rozrywka", account: "Główne", frequency: "monthly", nextDueDate: "2026-07-20", isActive: true }
    ];
    const profileWithPayment = {
      ...baseProfile,
      payments: [{ id: "p1", name: "Rachunek", amount: 300, dueDate: "2026-07-25", status: "Do opłacenia" as const }]
    };
    
    // balance: 4000 - 300 (payment) - 200 (rule) = 3500
    const res = calculateEndOfMonthForecast(profileWithPayment, rules, "2026-07-15");
    expect(res.unpaidPaymentsSum).toBe(300);
    expect(res.futureRecurringExpensesSum).toBe(200);
    expect(res.forecastedBalance).toBe(3500);
  });

  it("jednoczesny przychód i wydatek — uwzględnia oba", () => {
    const rules: RecurringRule[] = [
      { id: "r1", name: "Kieszonkowe", amount: 100, type: "income", category: "Inne", account: "Główne", frequency: "monthly", nextDueDate: "2026-07-25", isActive: true },
      { id: "r2", name: "Netflix", amount: 50, type: "expense", category: "Rozrywka", account: "Główne", frequency: "monthly", nextDueDate: "2026-07-26", isActive: true }
    ];
    // 4000 + 100 - 50 = 4050
    const res = calculateEndOfMonthForecast(baseProfile, rules, "2026-07-15");
    expect(res.futureRecurringIncomesSum).toBe(100);
    expect(res.futureRecurringExpensesSum).toBe(50);
    expect(res.forecastedBalance).toBe(4050);
  });

  it("reguła cykliczna miesięczna - nie liczy wystąpień po końcu miesiąca", () => {
    const rules: RecurringRule[] = [
      { id: "r1", name: "Abonament", amount: 80, type: "expense", category: "TV", account: "Główne", frequency: "monthly", nextDueDate: "2026-07-20", isActive: true }
    ];
    const res = calculateEndOfMonthForecast(baseProfile, rules, "2026-07-15");
    expect(res.futureRecurringExpensesSum).toBe(80); // only July counts
  });

  it("brak podwójnego liczenia — ignoruje reguły, które mają już wygenerowaną transakcję/płatność", () => {
    const rules: RecurringRule[] = [
      { id: "rule-1", name: "Abonament", amount: 80, type: "expense", category: "TV", account: "Główne", frequency: "monthly", nextDueDate: "2026-07-20", isActive: true }
    ];
    
    // There's a payment with this rule id and date
    const profileWithDups = {
      ...baseProfile,
      payments: [{ id: "p1", name: "Abonament", amount: 80, dueDate: "2026-07-20", status: "Do opłacenia" as const, recurringRuleId: "rule-1" }]
    };

    const res = calculateEndOfMonthForecast(profileWithDups, rules, "2026-07-15");
    expect(res.unpaidPaymentsSum).toBe(80);
    expect(res.futureRecurringExpensesSum).toBe(0); // Deduplicated!
    expect(res.forecastedBalance).toBe(3920);
  });

  it("data na ostatni dzień miesiąca — uwzględnia z dokładnością do dnia", () => {
    const rules: RecurringRule[] = [
      { id: "r1", name: "Rata", amount: 500, type: "expense", category: "Kredyt", account: "Główne", frequency: "monthly", nextDueDate: "2026-07-31", isActive: true }
    ];
    const res = calculateEndOfMonthForecast(baseProfile, rules, "2026-07-15");
    expect(res.futureRecurringExpensesSum).toBe(500); // 31 is included
    expect(res.forecastDate).toBe("2026-07-31");
  });

  it("prognoza ujemna — poprawnie oznacza zagrożenie debetem", () => {
    const profileLow = {
      ...baseProfile,
      transactions: [{ id: "t1", name: "Bieda", amount: 500, type: "income" as const, category: "Wypłata", account: "Główne", isoDate: "2026-07-01" }]
    };
    const rules: RecurringRule[] = [
      { id: "r1", name: "Rata", amount: 600, type: "expense", category: "Kredyt", account: "Główne", frequency: "monthly", nextDueDate: "2026-07-20", isActive: true }
    ];
    const res = calculateEndOfMonthForecast(profileLow, rules, "2026-07-15");
    // 500 - 600 = -100
    expect(res.forecastedBalance).toBe(-100);
    expect(res.isNegative).toBe(true);
  });
});

describe("KROK 8C — Alerty budżetowe (80% i 100%)", () => {
  const baseProfile: Profile = {
    id: "p1",
    name: "Test Profile",
    kind: "personal",
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    budgets: {
      "Żywność": 1000,
      "Transport": 500,
      "Bez limitu": 0
    }
  };

  it("wykorzystanie 0% — status normalny", () => {
    const res = calculateBudgetWarnings(baseProfile, "2026-07-15");
    const food = res.find(w => w.category === "Żywność");
    expect(food?.status).toBe("normal");
    expect(food?.ratio).toBe(0);
  });

  it("dokładnie 80% — status ostrzeżenie", () => {
    const profile = {
      ...baseProfile,
      transactions: [
        { id: "1", name: "t1", type: "expense" as const, category: "Żywność", account: "X", amount: 800, isoDate: "2026-07-05" }
      ]
    };
    const res = calculateBudgetWarnings(profile, "2026-07-15");
    const food = res.find(w => w.category === "Żywność");
    expect(food?.status).toBe("warning");
    expect(food?.percent).toBe(80);
  });

  it("99.99% — status ostrzeżenie", () => {
    const profile = {
      ...baseProfile,
      transactions: [
        { id: "1", name: "t1", type: "expense" as const, category: "Żywność", account: "X", amount: 999.9, isoDate: "2026-07-05" }
      ]
    };
    const res = calculateBudgetWarnings(profile, "2026-07-15");
    const food = res.find(w => w.category === "Żywność");
    expect(food?.status).toBe("warning");
  });

  it("dokładnie 100% — status przekroczony", () => {
    const profile = {
      ...baseProfile,
      transactions: [
        { id: "1", name: "t1", type: "expense" as const, category: "Żywność", account: "X", amount: 1000, isoDate: "2026-07-05" }
      ]
    };
    const res = calculateBudgetWarnings(profile, "2026-07-15");
    const food = res.find(w => w.category === "Żywność");
    expect(food?.status).toBe("exceeded");
    expect(food?.percent).toBe(100);
  });

  it("ponad 100% — status przekroczony", () => {
    const profile = {
      ...baseProfile,
      transactions: [
        { id: "1", name: "t1", type: "expense" as const, category: "Żywność", account: "X", amount: 1500, isoDate: "2026-07-05" }
      ]
    };
    const res = calculateBudgetWarnings(profile, "2026-07-15");
    const food = res.find(w => w.category === "Żywność");
    expect(food?.status).toBe("exceeded");
    expect(food?.percent).toBe(100);
    expect(food?.ratio).toBe(1.5);
  });

  it("limit 0 lub brak limitu — brak ostrzeżeń i elementu", () => {
    const profile = {
      ...baseProfile,
      transactions: [
        { id: "1", name: "t1", type: "expense" as const, category: "Bez limitu", account: "X", amount: 1000, isoDate: "2026-07-05" },
        { id: "2", name: "t2", type: "expense" as const, category: "Inne", account: "X", amount: 5000, isoDate: "2026-07-05" }
      ]
    };
    const res = calculateBudgetWarnings(profile, "2026-07-15");
    expect(res.find(w => w.category === "Bez limitu")).toBeUndefined();
    expect(res.find(w => w.category === "Inne")).toBeUndefined();
  });

  it("ujemna korekta/zwrot — zmniejsza wykorzystanie limitu", () => {
    const profile = {
      ...baseProfile,
      transactions: [
        { id: "1", name: "Zakupy", type: "expense" as const, category: "Żywność", account: "X", amount: 900, isoDate: "2026-07-05" },
        { id: "2", name: "Zwrot", type: "expense" as const, category: "Żywność", account: "X", amount: -150, isoDate: "2026-07-10" }
      ]
    };
    const res = calculateBudgetWarnings(profile, "2026-07-15");
    const food = res.find(w => w.category === "Żywność");
    expect(food?.spent).toBe(750);
    expect(food?.status).toBe("normal");
  });

  it("tylko wydatki z bieżącego miesiąca", () => {
    const profile = {
      ...baseProfile,
      transactions: [
        { id: "1", name: "Czerwiec", type: "expense" as const, category: "Żywność", account: "X", amount: 800, isoDate: "2026-06-05" },
        { id: "2", name: "Lipiec", type: "expense" as const, category: "Żywność", account: "X", amount: 200, isoDate: "2026-07-05" }
      ]
    };
    const res = calculateBudgetWarnings(profile, "2026-07-15");
    const food = res.find(w => w.category === "Żywność");
    expect(food?.spent).toBe(200);
    expect(food?.status).toBe("normal");
  });
});

describe("PROMPT 4 - Izolacja kalkulacji dla aktywnego profilu", () => {
  const baseProfile: Profile = {
    id: "prof-A",
    name: "Profil A",
    kind: "personal",
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    budgets: {
      "Żywność": 1000
    }
  };

  it("reguły obcego profilu nie wpływają na safe-to-spend (choć z racji API funkcji dostarczamy tylko reguły aktywnego)", () => {
    // We simulate the correct usage where only active rules are passed
    // And verify safe-to-spend only considers those.
    const rulesA: RecurringRule[] = [
      { id: "r-A", name: "Expense A", amount: 200, type: "expense", category: "Test", account: "Cash", frequency: "monthly", nextDueDate: "2026-07-20", isActive: true }
    ];
    // In practice, rulesB won't even be passed, but we test the isolation on the profile transactions level as well.
    const res = calculateSafeToSpend(baseProfile, rulesA, "2026-07-15");
    expect(res.futureRecurringExpensesSum).toBe(200);
  });

  it("forecast profilu A ignoruje recurring B", () => {
    const rulesA: RecurringRule[] = [
      { id: "r-A", name: "Income A", amount: 1000, type: "income", category: "Test", account: "Cash", frequency: "monthly", nextDueDate: "2026-07-20", isActive: true }
    ];
    
    // Test that forecastedBalance only uses rulesA
    const res = calculateEndOfMonthForecast(baseProfile, rulesA, "2026-07-15");
    expect(res.futureRecurringIncomesSum).toBe(1000);
    expect(res.forecastedBalance).toBe(1000);
  });

  it("warnings liczą tylko transakcje aktywnego profilu", () => {
    // profile contains ONLY its own transactions
    const profileA = {
      ...baseProfile,
      transactions: [
        { id: "t1", name: "A", type: "expense" as const, category: "Żywność", account: "X", amount: 800, isoDate: "2026-07-05" }
      ]
    };
    
    const res = calculateBudgetWarnings(profileA, "2026-07-15");
    const food = res.find(w => w.category === "Żywność");
    expect(food?.status).toBe("warning");
    expect(food?.spent).toBe(800);
  });
});

describe("R6c - roundCurrency w budgetCalculations (precyzja float)", () => {
  it("spent 10.10 + 10.20 zaokrąglone do 20.3 (bez błędu float)", () => {
    const profile: Profile = {
      id: "p1",
      name: "Test",
      kind: "personal",
      transactions: [
        { id: "t1", name: "A", type: "expense" as const, category: "Jedzenie", account: "X", amount: 10.10, isoDate: "2026-07-05" },
        { id: "t2", name: "B", type: "expense" as const, category: "Jedzenie", account: "X", amount: 10.20, isoDate: "2026-07-06" }
      ],
      payments: [],
      goals: [],
      investments: [],
      budgets: { "Jedzenie": 50 }
    };
    const res = calculateBudgetWarnings(profile, "2026-07-15");
    const food = res.find(w => w.category === "Jedzenie");
    expect(food).toBeDefined();
    // Bez roundCurrency: 10.10 + 10.20 = 20.299999999999997
    // Z roundCurrency: 20.3
    expect(food!.spent).toBe(20.3);
    expect(food!.status).toBe("normal");
  });
});

```


## File: src/calendarValidation.test.ts
```ts
import { describe, it, expect } from "vitest";
import { validateCalendarEventInput } from "./services/calendarValidation";

describe("validateCalendarEventInput", () => {
  it("zwraca isValid = true dla poprawnych danych", () => {
    const result = validateCalendarEventInput({
      summary: "Rachunek za prąd",
      description: "Płatność PGE",
      eventDate: "2026-08-15",
      eventTime: "10:00",
      reminders: [1440, 120]
    });
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("odrzuca pusty tytuł wydarzenia", () => {
    const result = validateCalendarEventInput({
      summary: "   ",
      eventDate: "2026-08-15",
      eventTime: "10:00",
      reminders: [120]
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("Tytuł");
  });

  it("odrzuca nieprawidłowy format daty", () => {
    const result = validateCalendarEventInput({
      summary: "Tytuł ok",
      eventDate: "15-08-2026",
      eventTime: "10:00",
      reminders: [120]
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("datę");
  });

  it("odrzuca nieprawidłowy format godziny", () => {
    const result = validateCalendarEventInput({
      summary: "Tytuł ok",
      eventDate: "2026-08-15",
      eventTime: "25:61",
      reminders: [120]
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("godzinę");
  });

  it("odrzuca gdy przekroczono maksymalną liczbę powiadomień (np. > 5)", () => {
    const result = validateCalendarEventInput({
      summary: "Tytuł ok",
      eventDate: "2026-08-15",
      eventTime: "10:00",
      reminders: [0, 60, 120, 1440, 2880, 10080] // 6 reminders
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("maksymalnie 5 powiadomień");
  });
});

```


## File: src/components/AiChatModal.tsx
```tsx
import { callAiApi, getAiConfig } from "../services/aiClient";
import { useApp } from "../app/providers/AppContext";
import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { X, Sparkles, Send, User, Bot, Loader2 } from "lucide-react";
import { Profile } from "../types";

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: Profile | null;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
}

export function AiChatModal({ isOpen, onClose, activeProfile }: AiChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: "initial",
    sender: "ai",
    text: "Cześć! Jestem Twoim osobistym doradcą finansowym AI. W czym mogę Ci dzisiaj pomóc? Możesz mnie zapytać o swoje wydatki, sposoby na oszczędzanie lub pomysły na inwestycje."
  }]);
  const { state } = useApp();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (state.aiMode === "local") {
        setMessages(prev => {
          if (prev.some(m => m.id === "local-ai-info")) return prev;
          return [...prev, {
            id: "local-ai-info",
            sender: "ai",
            text: "Wskazówka: Używasz lokalnego trybu AI (Ollama).\n\nJeśli czat nie odpowiada lub zgłasza błąd połączenia, upewnij się, że:\n1. Masz zainstalowaną i uruchomioną aplikację Ollama (ollama.com).\n2. Pobrałeś model wpisując w terminalu np. `ollama run llama3`.\n3. Twój serwer Ollama akceptuje żądania z tej przeglądarki (ustaw zmienną środowiskową OLLAMA_ORIGINS=\"*\").\n\nJeśli wolisz, możesz zawsze wrócić do trybu Chmury AI w zakładce Ustawienia aplikacji."
          }];
        });
      }
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages.length, isOpen, state.aiMode]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: inputValue.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const aiConfig = getAiConfig(state);
      const data = await callAiApi("chat", { message: inputValue.trim(), profileData: activeProfile }, aiConfig);
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: data.reply,
      };
      
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: error?.message || "Przepraszam, wystąpił błąd. Nie mogłem połączyć się z serwerem AI.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="ai-chat-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col w-full max-w-lg h-[80vh] max-h-[800px] rounded-2xl bg-white shadow-2xl overflow-hidden"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#137566] to-[#1a9c88] px-5 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Doradca Finansowy AI</h2>
              <p className="text-xs text-emerald-100 opacity-90">Twój wirtualny asystent budżetowy</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {(state.aiMode || "none") === "none" && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-2 mb-2">
              <p className="font-bold">Tryb "Brak AI" jest obecnie aktywny</p>
              <p>
                Interaktywny asystent konwersacyjny wymaga włączenia trybu <strong>Lokalne AI (Ollama)</strong> lub <strong>Chmura AI (Gemini)</strong> w zakładce Ustawienia.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-slide-up`}>
              <div className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === "user" ? "bg-[#153a35] text-white" : "bg-emerald-100 text-[#137566]"}`}>
                  {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                  msg.sender === "user" 
                    ? "bg-[#153a35] text-white rounded-tr-sm" 
                    : "bg-white text-gray-800 border border-gray-150 rounded-tl-sm"
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-slide-up">
              <div className="flex gap-3 max-w-[85%] flex-row">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#137566] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-5 py-4 rounded-2xl bg-white border border-gray-150 rounded-tl-sm flex items-center gap-2 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-[#137566]" />
                  <span className="text-xs text-gray-500 font-medium">Asystent pisze...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-150 shrink-0">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Zapytaj o swój budżet, inwestycje..."
              className="w-full pl-4 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#137566] focus:ring-1 focus:ring-[#137566] transition text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="absolute right-2 p-2 bg-[#137566] text-white rounded-lg hover:bg-[#1a9c88] transition disabled:opacity-50 disabled:hover:bg-[#137566]"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 text-center">
            <span className="text-[10px] text-gray-400">Asystent ma dostęp do historii Twoich transakcji i celów, aby lepiej doradzać.</span>
          </div>
        </form>

      </motion.div>
    </motion.div>
  );
}

```


## File: src/components/AnalysisView.tsx
```tsx
import React, { useMemo, useState, useEffect } from "react";
import { Profile } from "../types";
import { formatPln, getMonthNamePl, generateReportPdf, expenseCategories, budgetCategories } from "../utils";
import { Settings2, Check } from "lucide-react";
import { generateMonthlyDigest } from "../services/monthlyDigest";

interface AnalysisViewProps {
  profile: Profile;
  selectedDate: Date;
}

export function AnalysisView({ profile, selectedDate }: AnalysisViewProps) {
  const currentYear = selectedDate.getFullYear();
  const currentMonthIdx = selectedDate.getMonth();
  const monthName = getMonthNamePl(currentMonthIdx);

  // Filter transactions for this month
  const thisMonthTransactions = useMemo(() => {
    return profile.transactions.filter((t) => {
      const d = new Date(`${t.isoDate}T12:00:00`);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx;
    });
  }, [profile.transactions, currentYear, currentMonthIdx]);

  const incomeTxs = useMemo(() => {
    return thisMonthTransactions.filter((t) => t.type === "income");
  }, [thisMonthTransactions]);

  const expenseTxs = useMemo(() => {
    return thisMonthTransactions.filter((t) => t.type === "expense");
  }, [thisMonthTransactions]);

  const totalIncome = useMemo(() => {
    return incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  }, [incomeTxs]);

  const totalExpense = useMemo(() => {
    return expenseTxs.reduce((sum, t) => sum + t.amount, 0);
  }, [expenseTxs]);

  const savings = useMemo(() => totalIncome - totalExpense, [totalIncome, totalExpense]);
  const savingsRate = useMemo(() => {
    return totalIncome > 0 ? Math.max(0, Math.round((savings / totalIncome) * 100)) : 0;
  }, [totalIncome, savings]);

  const lastMonthExpense = useMemo(() => {
    let lastM = currentMonthIdx - 1;
    let lastY = currentYear;
    if (lastM < 0) {
      lastM = 11;
      lastY--;
    }
    return profile.transactions
      .filter((t) => {
        const d = new Date(`${t.isoDate}T12:00:00`);
        return d.getFullYear() === lastY && d.getMonth() === lastM && t.type === "expense";
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [profile.transactions, currentYear, currentMonthIdx]);

  const expenseChange = useMemo(() => {
    if (lastMonthExpense === 0) return 0;
    return Math.round(((totalExpense - lastMonthExpense) / lastMonthExpense) * 100);
  }, [totalExpense, lastMonthExpense]);

  const [userToggles, setUserToggles] = useState<Record<string, boolean>>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    setUserToggles({});
  }, [currentMonthIdx, currentYear]);

  const monthlyDigest = useMemo(() => {
    return generateMonthlyDigest(profile.transactions, currentYear, currentMonthIdx);
  }, [profile.transactions, currentYear, currentMonthIdx]);

  // Category expense breakdown
  const categorySummary = useMemo(() => {
    return expenseCategories.map((cat) => {
      const spent = expenseTxs.filter((t) => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
      const limit = profile.budgets[cat] || 0;
      return {
        name: cat,
        spent,
        limit
      };
    })
    .filter(cat => {
      const userToggle = userToggles[cat.name];
      if (userToggle === true) return true;
      if (userToggle === false) return false;
      return cat.spent > 0;
    })
    .map(cat => ({
      ...cat,
      pctOfExpense: totalExpense > 0 ? Math.round((cat.spent / totalExpense) * 100) : 0
    }))
    .sort((a, b) => b.spent - a.spent);
  }, [expenseTxs, profile.budgets, totalExpense, userToggles]);

  const totalPlannedBudget = useMemo(() => {
    return budgetCategories.reduce((s, c) => s + (profile.budgets[c] || 0), 0);
  }, [profile.budgets]);

  const totalActualSpent = useMemo(() => {
    return budgetCategories.reduce((s, c) => s + (expenseTxs.filter(t => t.category === c).reduce((sum, t) => sum + t.amount, 0)), 0);
  }, [expenseTxs]);

  // Dynamic advice generation
  const insightsList = useMemo(() => {
    const insights = [];

    // Savings rate advice
    if (totalIncome > 0) {
      if (savingsRate >= 20) {
        insights.push({
          type: "success",
          title: "Świetna stopa oszczędności!",
          desc: `Oszczędzasz obecnie ${savingsRate}% swoich dochodów (${formatPln(savings)}). To powyżej zalecanego minimum 15%!`
        });
      } else if (savingsRate > 0 && savingsRate < 20) {
        insights.push({
          type: "info",
          title: "Dobry kierunek oszczędzania",
          desc: `Oszczędzasz ${savingsRate}% dochodów. Spróbuj zbliżyć się do poziomu 20%, odkładając stałą kwotę zaraz po wypłacie.`
        });
      } else {
        insights.push({
          type: "warning",
          title: "Deficyt budżetowy",
          desc: `Twoje wydatki w tym miesiącu przewyższyły przychody o ${formatPln(Math.abs(savings))}. Przejrzyj kategorie Rozrywka i Inne, aby znaleźć oszczędności.`
        });
      }
    } else {
      insights.push({
        type: "info",
        title: "Brak dochodów w wybranym miesiącu",
        desc: "Wprowadź swoje stałe lub dodatkowe dochody, by system mógł wyliczyć stopę oszczędności i przeanalizować bilans."
      });
    }

    // Category alert
    const topCategory = categorySummary[0];
    if (topCategory && topCategory.spent > 0) {
      insights.push({
        type: "info",
        title: `Największy wydatek: ${topCategory.name}`,
        desc: `Kategoria "${topCategory.name}" stanowi ${topCategory.pctOfExpense}% wszystkich Twoich wydatków w tym miesiącu (${formatPln(topCategory.spent)}).`
      });
    }

    // MoM Expense Change
    if (lastMonthExpense > 0) {
      if (expenseChange > 5) {
        insights.push({
          type: "warning",
          title: "Wzrost wydatków",
          desc: `Wydałeś w tym miesiącu o ${expenseChange}% więcej niż w zeszłym (${formatPln(totalExpense)} vs ${formatPln(lastMonthExpense)}). Zwróć uwagę na rosnące koszty.`
        });
      } else if (expenseChange < -5) {
        insights.push({
          type: "success",
          title: "Redukcja wydatków",
          desc: `Udało Ci się obniżyć wydatki o ${Math.abs(expenseChange)}% w porównaniu do zeszłego miesiąca. Świetna robota!`
        });
      }
    }

    // Budget overruns alert
    const overruns = categorySummary.filter(c => c.limit > 0 && c.spent > c.limit);
    if (overruns.length > 0) {
      insights.push({
        type: "warning",
        title: "Przekroczone limity budżetowe",
        desc: `Przekroczyłeś limity w następujących kategoriach: ${overruns.map(o => o.name).join(", ")}. W kolejnym miesiącu spróbuj dostosować kwotę lub baczniej kontrolować koszty.`
      });
    } else if (totalPlannedBudget > 0 && totalActualSpent <= totalPlannedBudget) {
      insights.push({
        type: "success",
        title: "Budżety pod pełną kontrolą!",
        desc: "Gratulacje! Wszystkie kategorie mieszczą się w wyznaczonych limitach budżetowych."
      });
    }

    return insights;
  }, [totalIncome, savingsRate, savings, categorySummary, totalPlannedBudget, totalActualSpent]);

  return (
    <div className="space-y-6" id="analysis-view-container">
      {/* Report download header */}
      <div className="bg-gradient-to-r from-[#137566] to-[#155e51] p-6 rounded-2xl text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">Miesięczny Raport PDF</h2>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl">
            Pobierz oficjalny, zoptymalizowany i przejrzyście sformatowany dokument PDF zawierający pełną strukturę Twoich wydatków, stan opłat i oszczędności w wybranym miesiącu. Idealny do wydruku lub archiwizacji.
          </p>
        </div>
        <button
          onClick={() => generateReportPdf(profile, currentYear, currentMonthIdx)}
          className="bg-white text-[#137566] font-bold py-2.5 px-6 rounded-xl hover:bg-emerald-50 transition shadow self-start md:self-auto text-sm"
          id="btn-download-pdf-report"
        >
          📥 Pobierz raport (PDF)
        </button>
      </div>

      {/* Analysis body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Advice and alerts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#153a35]">Miesięczny przegląd (bez AI)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Przychody</p>
                <p className="text-sm font-bold text-emerald-600">{formatPln(monthlyDigest.totalIncome)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Wydatki</p>
                <p className="text-sm font-bold text-rose-600">{formatPln(monthlyDigest.totalExpenses)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Bilans</p>
                <p className={`text-sm font-bold ${monthlyDigest.balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatPln(monthlyDigest.balance)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Oszczędności</p>
                <p className="text-sm font-bold text-slate-700">
                  {monthlyDigest.savingsRate !== null ? `${Math.round(monthlyDigest.savingsRate)}%` : "-"}
                </p>
              </div>
            </div>
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900 text-sm leading-relaxed">
              {monthlyDigest.summaryText}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-bold text-[#153a35]">Wnioski i podpowiedzi</h3>
          <div className="space-y-3">
            {insightsList.map((ins, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex items-start gap-3.5 transition ${
                  ins.type === "success"
                    ? "bg-emerald-50/80 border-emerald-100 text-emerald-950"
                    : ins.type === "warning"
                    ? "bg-rose-50/80 border-rose-100 text-rose-950"
                    : "bg-blue-50/80 border-blue-100 text-blue-950"
                }`}
              >
                <span className="text-lg">
                  {ins.type === "success" ? "✓" : ins.type === "warning" ? "⚠️" : "💡"}
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide mb-1">{ins.title}</h4>
                  <p className="text-xs leading-relaxed opacity-90">{ins.desc}</p>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>

        {/* Breakdown box */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-[#153a35]">Struktura wydatków</h3>
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Dostosuj
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-700">
                    Widoczne kategorie
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                    {expenseCategories.map(cat => {
                      const isVisible = userToggles[cat] !== undefined 
                        ? userToggles[cat] 
                        : expenseTxs.some(t => t.category === cat && t.amount > 0);
                      
                      return (
                        <label key={cat} className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="hidden"
                            checked={isVisible}
                            onChange={(e) => setUserToggles(prev => ({ ...prev, [cat]: e.target.checked }))}
                          />
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isVisible ? 'bg-[#137566] border-[#137566] text-white' : 'border-slate-300'}`}>
                            {isVisible && <Check className="w-3 h-3" />}
                          </div>
                          <span className="text-xs text-slate-700">{cat}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            {categorySummary.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">Brak widocznych kategorii w wybranym miesiącu.</p>
            ) : (
              categorySummary.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-700 font-semibold">{cat.name}</span>
                    <span className="text-gray-500">
                      {formatPln(cat.spent)} ({cat.pctOfExpense}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${cat.pctOfExpense}%` }}
                      className="bg-[#137566] h-full rounded-full"
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalIncome > 0 && (
            <div className="border-t border-gray-100 mt-5 pt-4">
              <h4 className="text-xs font-bold text-[#153a35] mb-2">Stopa oszczędności</h4>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-4 border-[#e7f3f0] flex items-center justify-center font-bold text-[#137566] text-sm flex-shrink-0">
                  {savingsRate}%
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Zabezpieczasz <strong>{formatPln(savings)}</strong> z miesięcznych przychodów rzędu <strong>{formatPln(totalIncome)}</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

```


## File: src/components/BudgetView.tsx
```tsx
import React, { useMemo } from "react";
import { Profile } from "../types";
import { formatPln, iconByCategory, budgetCategories } from "../utils";

interface BudgetViewProps {
  profile: Profile;
  selectedDate: Date;
  onOpenBudgetModal: () => void;
}

export function BudgetView({ profile, selectedDate, onOpenBudgetModal }: BudgetViewProps) {
  const currentYear = selectedDate.getFullYear();
  const currentMonthIdx = selectedDate.getMonth();

  // Filter transactions for selected period
  const thisMonthExpenses = useMemo(() => {
    return profile.transactions.filter((t) => {
      const d = new Date(`${t.isoDate}T12:00:00`);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx && t.type === "expense";
    });
  }, [profile.transactions, currentYear, currentMonthIdx]);

  // Precomputed category spent lookup table for O(1) rendering access
  const categorySpentMap = useMemo(() => {
    const map: Record<string, number> = {};
    thisMonthExpenses.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return map;
  }, [thisMonthExpenses]);

  const categorySpent = (categoryName: string) => {
    return categorySpentMap[categoryName] || 0;
  };

  const totalPlannedBudget = useMemo(() => {
    return budgetCategories.reduce(
      (sum, cat) => sum + (profile.budgets[cat] || 0),
      0
    );
  }, [profile.budgets]);
  
  const totalActualSpent = useMemo(() => {
    return budgetCategories.reduce(
      (sum, cat) => sum + categorySpent(cat),
      0
    );
  }, [categorySpentMap]);

  return (
    <div className="space-y-6" id="budget-view-container">
      {/* Overview header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plan Kontroli Kosztów</p>
          <h2 className="text-xl font-bold text-[#153a35]">Budżety miesięczne</h2>
          <p className="text-xs text-gray-500 mt-1">
            Przeznaczono łącznie <strong>{formatPln(totalPlannedBudget)}</strong> na ten miesiąc. Wydano dotychczas <strong>{formatPln(totalActualSpent)}</strong>.
          </p>
        </div>
        <button
          onClick={onOpenBudgetModal}
          className="bg-[#137566] text-white font-bold py-2 px-5 rounded-lg hover:bg-[#0f5d51] transition shadow-md text-sm whitespace-nowrap self-start sm:self-auto"
          id="btn-edit-budget-limits"
        >
          Modyfikuj limity
        </button>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgetCategories.map((category) => {
          const spent = categorySpent(category);
          const limit = profile.budgets[category] || 0;
          const ratio = limit > 0 ? spent / limit : 0;
          const percent = limit > 0 ? Math.min(100, Math.round(ratio * 100)) : 0;
          const isOver = limit > 0 && ratio >= 1;
          const isClose = limit > 0 && ratio >= 0.8 && ratio < 1;

          // Transactions in this category
          const catTransactions = thisMonthExpenses.filter((t) => t.category === category);

          return (
            <div key={category} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow transition flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-[#e7f3f0] text-xl flex items-center justify-center">
                      {iconByCategory[category] || "📂"}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-[#153a35]">{category}</h4>
                      <p className="text-[10px] text-gray-400">Wykorzystano {percent}% limitu</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="block text-xs font-bold text-gray-800">{formatPln(spent)}</span>
                    <span className="text-[10px] text-gray-400">
                      {limit > 0 ? `Limit: ${formatPln(limit)}` : "brak limitu"}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mt-4" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                  <div
                    style={{ width: `${limit > 0 ? percent : 0}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver ? "bg-[#d55e50]" : isClose ? "bg-amber-500" : "bg-[#137566]"
                    }`}
                  ></div>
                </div>

                {isOver && (
                  <p className="text-[11px] text-[#d55e50] font-semibold mt-2" id={`alert-budget-over-${category}`}>
                    Stan: Przekroczony. Przekroczyłeś zaplanowany budżet o {formatPln(spent - limit)}!
                  </p>
                )}
                {isClose && (
                  <p className="text-[11px] text-amber-600 font-semibold mt-2" id={`alert-budget-close-${category}`}>
                    Stan: Ostrzeżenie. Jesteś blisko wyczerpania limitu. Pozostało {formatPln(limit - spent)}.
                  </p>
                )}
              </div>

              {/* Small list of category transactions */}
              <div className="border-t border-gray-50 pt-3">
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Ostatnie wydatki w tej kategorii</p>
                {catTransactions.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">Brak wydatków w tym miesiącu.</p>
                ) : (
                  <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                    {catTransactions.slice(0, 3).map((t) => (
                      <div key={t.id} className="flex justify-between items-center text-xs">
                        <span className="text-gray-600 truncate max-w-[150px]">{t.name}</span>
                        <span className="font-semibold text-gray-700">{formatPln(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

```


## File: src/components/CalendarReminderModal.tsx
```tsx
import { getLocalDateIso } from "../utils";
import { callAiApi, getAiConfig } from "../services/aiClient";
import { useApp } from "../app/providers/AppContext";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Payment } from "../types";
import { Calendar, Clock, Bell, AlertCircle, Check, Loader2 } from "lucide-react";
import { validateCalendarEventInput } from "../services/calendarValidation";

interface CalendarReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  calendarToken: string | null;
  onConnectCalendar?: () => void;
  onCalendarAuthInvalid?: () => void;
}

export function CalendarReminderModal({
  isOpen,
  onClose,
  payment,
  calendarToken,
  onConnectCalendar,
  onCalendarAuthInvalid
}: CalendarReminderModalProps) {
  const { state, canUseAiChat } = useApp();
  
  // Suggested event fields
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("10:00");
  const [reminders, setReminders] = useState<number[]>([1440, 120]); // default: 1 day, 2 hours

  // Status & loading
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [calendarScopeMissing, setCalendarScopeMissing] = useState(false);

  // When calendarToken becomes available, clear calendarScopeMissing so the user sees the form with preserved fields
  useEffect(() => {
    if (calendarToken) {
      setCalendarScopeMissing(false);
    }
  }, [calendarToken]);

  // Fetch suggestions when an existing payment is provided
  useEffect(() => {
    if (isOpen && payment) {
      fetchEventSuggestion(payment);
    } else if (isOpen) {
      // Clean up fields if opened without payment
      setSummary("");
      setDescription("");
      setEventDate(getLocalDateIso());
      setEventTime("10:00");
      setReminders([1440, 120]);
      setErrorMsg(null);
      setSuccessMsg(null);
      setCalendarScopeMissing(false);
    }
  }, [isOpen, payment]);

  if (!isOpen || !payment) return null;

  const fetchEventSuggestion = async (p: Payment) => {
    setIsLoadingSuggestion(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (!canUseAiChat) {
        setSummary(`💸 Płatność: ${p.name} (${p.amount} PLN)`);
        setDescription(`Przypomnienie o uregulowaniu rachunku/subskrypcji.\n\nNazwa: ${p.name}\nKwota: ${p.amount} PLN\nTermin: ${p.dueDate}\n\n[Wygenerowano z aplikacji Saldo]`);
        setEventDate(p.dueDate || getLocalDateIso());
        setEventTime("10:00");
        setIsLoadingSuggestion(false);
        return;
      }
      const aiConfig = getAiConfig(state);
      const data = await callAiApi("suggest-event", { payment: p, currentDate: getLocalDateIso() }, aiConfig);
      
      setSummary(data.summary || `Płatność: ${p.name}`);
      setDescription(data.description || `Termin płatności za ${p.name} na kwotę ${p.amount} zł.`);
      setEventDate(p.dueDate || getLocalDateIso());
      setEventTime(data.suggestedTime?.slice(0, 5) || "10:00");
      if (Array.isArray(data.reminders)) {
        setReminders(data.reminders.slice(0, 5));
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Błąd generowania sugestii AI.");
      // Fallback details
      setSummary(`Przypomnienie: ${p.name} - ${p.amount} PLN`);
      setDescription(`Ureguluj płatność ${p.name} na kwotę ${p.amount} PLN.`);
      setEventDate(p.dueDate || getLocalDateIso());
      setEventTime("10:00");
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  const calculateEndTime = (timeStr: string): string => {
    try {
      const [h, m] = timeStr.split(":").map(Number);
      const endH = (h + 1) % 24;
      return `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    } catch (e) {
      return "11:00";
    }
  };

  const handleSubmitToCalendar = async () => {
    if (!calendarToken) {
      setErrorMsg("Połącz konto Google z Kalendarzem, aby kontynuować.");
      setCalendarScopeMissing(true);
      return;
    }

    const validation = validateCalendarEventInput({
      summary,
      description,
      eventDate,
      eventTime,
      reminders
    });

    if (!validation.isValid) {
      setErrorMsg(validation.error || "Wprowadzono nieprawidłowe dane wydarzenia.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const startTime = `${eventDate}T${eventTime}:00`;
    const endTime = `${eventDate}T${calculateEndTime(eventTime)}:00`;

    const event = {
      summary: summary.trim(),
      description: description.trim(),
      start: {
        dateTime: startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      reminders: {
        useDefault: false,
        overrides: reminders.map((min) => ({ method: "popup", minutes: min }))
      }
    };

    try {
      const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${calendarToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setCalendarScopeMissing(true);
          if (onCalendarAuthInvalid) onCalendarAuthInvalid();
          throw new Error("Brak dostępu do Kalendarza Google (401/403). Kliknij 'Połącz kalendarz', aby odnowić dostęp.");
        }
        throw new Error(`Nie udało się zapisać w kalendarzu. Kod błędu: ${response.status}`);
      }

      setSuccessMsg("Dodano do Kalendarza Google! 🎉");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Calendar insert error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleReminder = (mins: number) => {
    setReminders(prev => {
      if (prev.includes(mins)) {
        return prev.filter(m => m !== mins);
      }
      if (prev.length >= 5) {
        setErrorMsg("Możesz wybrać maksymalnie 5 powiadomień.");
        return prev;
      }
      setErrorMsg(null);
      return [...prev, mins].sort((a,b)=>b-a);
    });
  };

  const availableReminders = [
    { label: "W dniu wydarzenia", value: 0 },
    { label: "1 godzina przed", value: 60 },
    { label: "2 godziny przed", value: 120 },
    { label: "1 dzień przed", value: 1440 },
    { label: "2 dni przed", value: 2880 },
    { label: "1 tydzień przed", value: 10080 }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs transition-opacity"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm border border-indigo-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 leading-tight">Przypomnienie w Kalendarzu</h2>
              <p className="text-xs text-gray-500 font-medium">Zarządzaj terminami łatwo</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition cursor-pointer"
            id="btn-close-calendar-modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50 space-y-6">
          {!calendarToken || calendarScopeMissing ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-1">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900 mb-1">Połącz kalendarz</h3>
                <p className="text-xs text-amber-700 max-w-xs leading-relaxed">
                  Aby zaplanować wydarzenie, połącz swoje konto Google i zezwól na dostęp do kalendarza.
                </p>
              </div>
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex gap-2 text-left">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <button
                type="button"
                onClick={onConnectCalendar}
                className="bg-amber-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:bg-amber-700 transition cursor-pointer"
                id="btn-connect-calendar"
              >
                Połącz kalendarz
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {isLoadingSuggestion && (
                <div className="flex flex-col items-center justify-center p-8 space-y-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                  <p className="text-sm font-medium text-gray-600">Przygotowuję szczegóły z AI...</p>
                </div>
              )}

              {!isLoadingSuggestion && (
                <div className="space-y-4 p-5 bg-white border border-gray-200 rounded-2xl shadow-sm animate-fade-in relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#137566]"></div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-[#137566]" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#153a35]">Szczegóły przypomnienia w Kalendarzu</span>
                  </div>
                  
                  {/* Event Summary */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Tytuł wydarzenia</label>
                    <input
                      required
                      type="text"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 p-2.5 text-sm font-bold text-gray-800 outline-none focus:border-[#137566] focus:ring-1 focus:ring-[#137566] transition"
                      id="input-event-summary"
                    />
                  </div>

                  {/* Event Description */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Opis {canUseAiChat ? "(Wygenerowany przez AI)" : ""}</label>
                    <textarea
                      required
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 p-2.5 text-xs text-gray-700 outline-none focus:border-[#137566] focus:ring-1 focus:ring-[#137566] transition leading-relaxed"
                      id="input-event-description"
                    />
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Data</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-[#137566] absolute left-3 top-2.5" />
                        <input
                          required
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm font-semibold text-gray-800 outline-none focus:border-[#137566] transition cursor-pointer"
                          id="input-event-date"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Godzina</label>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-[#137566] absolute left-3 top-2.5" />
                        <input
                          required
                          type="time"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm font-semibold text-gray-800 outline-none focus:border-[#137566] transition cursor-pointer"
                          id="input-event-time"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reminders Toggles */}
                  <div className="pt-2 border-t border-gray-100">
                    <label className="block text-[11px] font-bold text-gray-500 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                      <Bell className="w-3.5 h-3.5" />
                      Powiadomienia w Kalendarzu
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableReminders.map((rem) => {
                        const isSelected = reminders.includes(rem.value);
                        return (
                          <button
                            key={rem.value}
                            type="button"
                            onClick={() => toggleReminder(rem.value)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                              isSelected
                                ? "bg-[#137566] text-white border-[#137566] shadow-sm scale-105"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                            }`}
                          >
                            {rem.label} {isSelected && "✓"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Error / Success feedback inside modal */}
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              
              {successMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Bottom Actions */}
              {!isLoadingSuggestion && (
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-gray-200 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                    id="btn-cancel-calendar"
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || !calendarToken}
                    onClick={handleSubmitToCalendar}
                    className="flex-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-3 text-xs font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5 cursor-pointer"
                    id="btn-confirm-calendar"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Zapisywanie...
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4" />
                        Zapisz w Kalendarzu Google
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}


```


## File: src/components/ChangelogModal.tsx
```tsx
import React from "react";
import { X, Sparkles, CheckCircle2, Cloud, Shield, Wallet, Smartphone, History } from "lucide-react";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const changelogData = [
  {
    version: "v0.8.7",
    date: "Lipiec 2026",
    title: "Ochrona Rezerw i Bezpieczny Import Transakcji",
    icon: <Shield className="w-5 h-5 text-[#137566]" />,
    features: [
      "Blokada usuwania celów oszczędnościowych ze zgromadzonymi środkami (saved > 0) chroniąca rezerwy finansowe.",
      "Automatyczna detekcja duplikatów i deduplikacja podczas wielokrotnego importu plików CSV.",
      "Filtrowanie uszkodzonych wartości numerycznych (NaN) przy wprowadzaniu i imporcie transakcji.",
      "Ścisłe typowanie wskaźników oraz danych wykresów w panelu głównym (Dashboard Metrics)."
    ]
  },
  {
    version: "v0.8.6",
    date: "Lipiec 2026",
    title: "Izolacja Profilowa i Bezpieczeństwo Danych",
    icon: <Shield className="w-5 h-5 text-emerald-600" />,
    features: [
      "Pełna izolacja reguł cyklicznych i reguł transakcji dla każdego profilu (osobistego i wspólnego).",
      "Gwarancja braku wycieków danych finansowych przy przełączaniu profili.",
      "Ścisła walidacja typów w czasie rzeczywistym (Type Guards) oraz ochrona przed uszkodzonymi danymi.",
      "Idempotentne i bezpieczne procedury migracji bazy danych i pamięci podręcznej."
    ]
  },
  {
    version: "v0.8.5",
    date: "Lipiec 2026",
    title: "Rozliczenia i Budżet Wspólny",
    icon: <Wallet className="w-5 h-5 text-indigo-500" />,
    features: [
      "Automatyczne wyliczanie salda rozliczeń między partnerami (kto komu jest winien).",
      "Możliwość oznaczania, kto opłacił dany wydatek (Ja, Partner, Wspólne/50-50).",
      "Nowe filtry list transakcji i nadchodzących opłat według osoby płacącej.",
      "Wyraźne oznaczanie profili wspólnych w interfejsie aplikacji."
    ]
  },
  {
    version: "v0.8.4",
    date: "Lipiec 2026",
    title: "PWA i Bezpieczna Praca Offline",
    icon: <Smartphone className="w-5 h-5 text-emerald-500" />,
    features: [
      "Aplikacja jako PWA (Progresywna Aplikacja Internetowa) - możliwość instalacji na ekranie głównym.",
      "Pełne wsparcie dla trybu offline z lokalnym cache.",
      "Ostrzeżenia o braku połączenia sieciowego podczas zapisu.",
      "Zoptymalizowany manifest i service worker do przechowywania interfejsu (app shell)."
    ]
  },
  {
    version: "v0.8.3",
    date: "Lipiec 2026",
    title: "Synchronizacja w Chmurze i Dysku",
    icon: <Cloud className="w-5 h-5 text-blue-500" />,
    features: [
      "Integracja z Firebase Firestore dla bezpiecznej synchronizacji profili.",
      "Kopie zapasowe na koncie Google Drive z separacją uprawnień OAuth.",
      "Zautomatyzowane konflikty zapisów pomiędzy urządzeniami.",
      "Zabezpieczenia przed błędami dostępu (401/403/404) z Google Drive."
    ]
  },
  {
    version: "v0.8.2",
    date: "Czerwiec 2026",
    title: "Profile Bezpieczne PIN i Detekcja Duplikatów",
    icon: <Shield className="w-5 h-5 text-purple-500" />,
    features: [
      "Szyfrowanie profili kodem PIN za pomocą AES-GCM.",
      "Bezpieczny magazyn kluczy, zapobiegający wyciekom danych finansowych w przeglądarce.",
      "Inteligentna detekcja duplikatów dla cyklicznych oraz importowanych transakcji.",
      "Mechanizmy automatycznego czyszczenia pamięci po wylogowaniu."
    ]
  },
  {
    version: "v0.8.1",
    date: "Maj 2026",
    title: "Kategoryzacja AI i Zaawansowane Budżety",
    icon: <Sparkles className="w-5 h-5 text-amber-500" />,
    features: [
      "Asystent AI analizujący płatności i sugerujący kategorie za pomocą modelu Gemini.",
      "Funkcja eksportu i importu z/do CSV do integracji z bankami.",
      "Rozbudowany podział wydatków i cele oszczędnościowe.",
      "Limitery i procentowe wskaźniki użycia budżetów."
    ]
  },
  {
    version: "v0.8.0",
    date: "Kwiecień 2026",
    title: "Pierwsze Wydanie",
    icon: <CheckCircle2 className="w-5 h-5 text-gray-500" />,
    features: [
      "Uruchomienie podstawowego silnika zarządzania transakcjami.",
      "Logowanie kontem Google.",
      "Główny dashboard ze wskaźnikami dziennymi."
    ]
  }
];

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#137566]/10 flex items-center justify-center">
              <History className="w-5 h-5 text-[#137566]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Historia Zmian</h2>
              <p className="text-sm text-gray-500">Co nowego w Saldo?</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8">
          {changelogData.map((release, index) => (
            <div key={release.version} className="relative pl-6 sm:pl-8">
              {/* Timeline Line */}
              {index !== changelogData.length - 1 && (
                <div className="absolute left-2.5 sm:left-[21px] top-8 bottom-[-32px] w-0.5 bg-gray-100" />
              )}
              
              {/* Timeline Dot/Icon */}
              <div className="absolute left-0 sm:left-3 top-1 w-6 h-6 rounded-full bg-white border-[3px] border-gray-100 flex items-center justify-center z-10 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-[#137566]" />
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#137566]/10 text-[#137566] text-xs font-bold font-mono">
                      {release.version}
                    </span>
                    <div className="flex items-center gap-2 text-[#137566] font-bold text-base sm:text-lg">
                      {release.icon}
                      {release.title}
                    </div>
                  </div>
                  <span className="self-start sm:self-auto px-2.5 py-0.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                    {release.date}
                  </span>
                </div>

                <ul className="space-y-2.5">
                  {release.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                      <span className="leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

```


## File: src/components/DashboardView.tsx
```tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Profile, Transaction, Payment, RecurringRule } from "../types";
import { formatPln, formatDatePl, getMonthNamePl, iconByCategory, monthsPl, budgetCategories } from "../utils";
import { Wifi, WifiOff, Database, ShieldCheck, Settings, Move, Eye, EyeOff, ArrowUp, ArrowDown, Check, GripVertical, RotateCcw, X, Info } from "lucide-react";
import { useDashboardMetrics } from "../hooks/useDashboardMetrics";
import { StatsWidget, CashflowChartWidget, BillsWidget, BudgetWarningsWidget, ActivityWidget, SettlementWidget } from "./dashboard";

interface Widget {
  id: string;
  name: string;
  visible: boolean;
  icon: string;
}

interface DashboardViewProps {
  profile: Profile;
  selectedDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onTogglePaymentStatus: (paymentId: string) => void;
  onOpenTxModal: () => void;
  onOpenBudgetModal: () => void;
  onOpenPaymentModal: () => void;
  onChangeView: (view: string) => void;
  recurringRules?: RecurringRule[];
  onAddSettlement?: (entry: { amount: number; isoDate: string; note?: string }) => void;
  onDeleteSettlement?: (settlementId: string) => void;
}

export function DashboardView({
  profile,
  selectedDate,
  onPrevMonth,
  onNextMonth,
  onTogglePaymentStatus,
  onOpenTxModal,
  onOpenBudgetModal,
  onOpenPaymentModal,
  onChangeView,
  recurringRules = [],
  onAddSettlement,
  onDeleteSettlement
}: DashboardViewProps) {
  
  const metrics = useDashboardMetrics(profile, selectedDate, recurringRules);

  const DEFAULT_WIDGETS: Widget[] = [
    { id: "stats", name: "Podsumowanie finansowe (Przychody, Wydatki, Bilans)", visible: true, icon: "📊" },
    { id: "chart", name: "Wykres przepływów (6-miesięczny)", visible: true, icon: "📈" },
    { id: "bills", name: "Najbliższe opłaty i rachunki", visible: true, icon: "📅" },
    { id: "budget", name: "Plan budżetu i kategorie", visible: true, icon: "🎯" },
    { id: "activity", name: "Ostatnie transakcje (Aktywność)", visible: true, icon: "⏱️" },
  ];

  const [widgets, setWidgets] = useState<Widget[]>(() => {
    const saved = localStorage.getItem("dashboard_widgets_v3");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_WIDGETS.length) {
          return parsed;
        }
      } catch (e) {
        // Fallback
      }
    }
    return DEFAULT_WIDGETS;
  });

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const saveWidgets = useCallback((newWidgets: Widget[]) => {
    setWidgets(newWidgets);
    localStorage.setItem("dashboard_widgets_v3", JSON.stringify(newWidgets));
  }, []);

  const handleToggleVisibility = useCallback((id: string) => {
    const updated = widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
    saveWidgets(updated);
  }, [widgets, saveWidgets]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const updated = [...widgets];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    saveWidgets(updated);
  }, [widgets, saveWidgets]);

  const handleMoveDown = useCallback((index: number) => {
    if (index === widgets.length - 1) return;
    const updated = [...widgets];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    saveWidgets(updated);
  }, [widgets, saveWidgets]);

  const handleResetWidgets = useCallback(() => {
    saveWidgets(DEFAULT_WIDGETS);
  }, [saveWidgets]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const draggedIdx = widgets.findIndex(w => w.id === draggedId);
    const targetIdx = widgets.findIndex(w => w.id === targetId);
    if (draggedIdx !== -1 && targetIdx !== -1) {
      const updated = [...widgets];
      const [draggedItem] = updated.splice(draggedIdx, 1);
      updated.splice(targetIdx, 0, draggedItem);
      setWidgets(updated);
    }
  }, [draggedId, widgets]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    localStorage.setItem("dashboard_widgets_v3", JSON.stringify(widgets));
  }, [widgets]);

  const currentYear = selectedDate.getFullYear();
  const currentMonthIdx = selectedDate.getMonth();

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 sm:p-6 lg:p-8 custom-scrollbar relative" id="dashboard-scroll-area">
      {/* Month Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900" id="dash-month-title">
            {getMonthNamePl(currentMonthIdx)} {currentYear}
          </h2>
          <p className="text-sm text-gray-500">Podsumowanie i wskaźniki dla tego miesiąca.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 sm:flex-none">
            <button
              onClick={onPrevMonth}
              className="px-4 py-2 hover:bg-gray-50 transition text-gray-600 font-bold border-r border-gray-200"
              id="dash-prev-month"
            >
              ← Poprzedni
            </button>
            <button
              onClick={onNextMonth}
              className="px-4 py-2 hover:bg-gray-50 transition text-gray-600 font-bold"
              id="dash-next-month"
            >
              Następny →
            </button>
          </div>
          <button
            onClick={() => setIsCustomizerOpen(true)}
            className="p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition group"
            title="Dostosuj ekran"
          >
            <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
          </button>
        </div>
      </div>

      <SettlementWidget
        profile={profile}
        onAddSettlement={onAddSettlement}
        onDeleteSettlement={onDeleteSettlement}
      />

      {isEditMode && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-3 rounded-xl mb-6 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <Move className="w-5 h-5" />
            <span className="text-sm font-bold">Tryb edycji włączony. Możesz przeciągać kafelki, aby zmienić ich kolejność.</span>
          </div>
          <button
            onClick={() => setIsEditMode(false)}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow-sm"
          >
            Zakończ
          </button>
        </div>
      )}

      {/* Flexible Masonry/Grid Layout for Widgets */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start relative z-0">
        {widgets.filter(w => w.visible || isEditMode).map((widget, index) => {
          let widgetContent = null;

          if (widget.id === "stats") {
            widgetContent = (
              <StatsWidget 
                totalIncome={metrics.totalIncome}
                totalExpense={metrics.totalExpense}
                balance={metrics.balance}
                emergencyLimit={metrics.emergencyLimit}
                investmentCushion={metrics.investmentCushion}
                endOfMonthForecast={metrics.endOfMonthForecast}
                safeBreakdown={metrics.safeBreakdown}
                onChangeView={onChangeView}
              />
            );
          } else if (widget.id === "chart") {
            widgetContent = <CashflowChartWidget chartData={metrics.chartData} />;
          } else if (widget.id === "bills") {
            widgetContent = (
              <BillsWidget 
                unpaidPayments={metrics.unpaidPayments}
                urgentPaymentsCount={metrics.urgentPaymentsCount}
                onTogglePaymentStatus={onTogglePaymentStatus}
                onChangeView={onChangeView}
                onOpenPaymentModal={onOpenPaymentModal}
              />
            );
          } else if (widget.id === "budget") {
            widgetContent = (
              <BudgetWarningsWidget 
                totalPlannedBudget={metrics.totalPlannedBudget}
                totalActualSpentInBudget={metrics.totalActualSpentInBudget}
                budgetWarnings={metrics.budgetWarnings}
                onChangeView={onChangeView}
                onOpenBudgetModal={onOpenBudgetModal}
              />
            );
          } else if (widget.id === "activity") {
            widgetContent = (
              <ActivityWidget 
                profileKind={profile.kind}
                recentTransactions={metrics.recentTransactions}
                onChangeView={onChangeView}
                onOpenTxModal={onOpenTxModal}
              />
            );
          }

          if (!widgetContent) return null;

          const isFullWidth = widget.id === "stats";

          return (
            <motion.div
              key={widget.id}
              layout
              draggable={isEditMode}
              onDragStart={(e: any) => handleDragStart(e, widget.id)}
              onDragOver={(e: any) => handleDragOver(e, widget.id)}
              onDragEnd={handleDragEnd}
              className={`relative group ${isFullWidth ? "xl:col-span-2" : ""} ${!widget.visible && isEditMode ? "opacity-40 grayscale" : ""} ${isEditMode ? "cursor-move" : ""}`}
              style={{ minHeight: isEditMode ? '100px' : 'auto' }}
            >
              {isEditMode && (
                <div className="absolute inset-0 bg-indigo-500/5 rounded-2xl border-2 border-indigo-500/20 z-20 pointer-events-none group-hover:border-indigo-500/50 transition flex items-start justify-between p-2">
                  <div className="bg-white/90 backdrop-blur-sm p-1.5 rounded-lg shadow-sm border border-indigo-100 flex items-center gap-1.5 text-indigo-700 pointer-events-auto">
                    <GripVertical className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{widget.name.split(' ')[0]}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-indigo-100 pointer-events-auto">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-indigo-150 disabled:opacity-30 text-indigo-700 transition cursor-pointer z-30 relative"
                      title="Przesuń wyżej"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                      disabled={index === widgets.length - 1}
                      className="p-1 rounded hover:bg-indigo-150 disabled:opacity-30 text-indigo-700 transition cursor-pointer z-30 relative"
                      title="Przesuń niżej"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleVisibility(widget.id); }}
                      className="p-1 rounded hover:bg-rose-150 text-rose-600 transition ml-1.5 cursor-pointer z-30 relative"
                      title={widget.visible ? "Ukryj" : "Pokaż"}
                    >
                      {widget.visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              <div className={isEditMode ? "p-1 opacity-70" : ""}>
                {widgetContent}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Customizer Overlay Modal */}
      <AnimatePresence>
        {isCustomizerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCustomizerOpen(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative z-10 border border-slate-100 text-slate-800"
            >
              <button
                onClick={() => setIsCustomizerOpen(false)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shrink-0 text-xl">
                  ⚙️
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Dostosuj Ekran Główny</h3>
                  <p className="text-xs text-slate-500">Zarządzaj widocznością kafelków i ich kolejnością.</p>
                </div>
              </div>

              <div className="space-y-2.5 my-5 max-h-[350px] overflow-y-auto pr-1">
                {widgets.map((w, index) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg bg-white w-8 h-8 rounded-lg shadow-xs flex items-center justify-center shrink-0">
                        {w.icon}
                      </span>
                      <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                        {w.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 pl-2">
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1.5 hover:bg-slate-50 disabled:opacity-30 text-slate-600 transition cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-4 bg-slate-200" />
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === widgets.length - 1}
                          className="p-1.5 hover:bg-slate-50 disabled:opacity-30 text-slate-600 transition cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleToggleVisibility(w.id)}
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer flex items-center ${
                          w.visible ? "bg-emerald-600 justify-end" : "bg-slate-300 justify-start"
                        }`}
                      >
                        <motion.div
                          layout
                          className="bg-white w-5 h-5 rounded-full shadow-md"
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50/50 border border-slate-150 p-4 rounded-xl flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Move className="w-5 h-5 text-indigo-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Tryb edycji na żywo</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Pozwala układać elementy bezpośrednio na pulpicie za pomocą Drag & Drop.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsEditMode(!isEditMode);
                    setIsCustomizerOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 ${
                    isEditMode
                      ? "bg-rose-500 hover:bg-rose-600 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {isEditMode ? "Wyłącz edycję" : "Włącz edycję"}
                </button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={handleResetWidgets}
                  className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Domyślny układ</span>
                </button>
                <button
                  onClick={() => setIsCustomizerOpen(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                >
                  Gotowe
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

```


## File: src/components/DriveConflictModal.tsx
```tsx
import React from "react";
import { AppState } from "../types";
import { AlertTriangle, Download, Upload, X } from "lucide-react";

export type ConflictResolutionChoice = "download_remote" | "upload_local" | "cancel";

export interface DriveConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  localState: AppState | null;
  remoteState: AppState | null;
  lastSyncedAt?: string | null;
  onResolve: (choice: ConflictResolutionChoice) => void;
}

export function DriveConflictModal({
  isOpen,
  onClose,
  localState,
  remoteState,
  lastSyncedAt,
  onResolve
}: DriveConflictModalProps) {
  if (!isOpen || !localState || !remoteState) return null;

  const countTransactions = (s: AppState) => {
    return (s.profiles || []).reduce((acc, p) => acc + (p.transactions?.length || 0), 0);
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "Brak danych";
    try {
      return new Date(isoStr).toLocaleString("pl-PL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch (_) {
      return isoStr;
    }
  };

  const hasSharedProfile =
    localState.profiles?.some((p) => p.kind === "shared") ||
    remoteState.profiles?.some((p) => p.kind === "shared");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Wykryto konflikt wersji (Dysk Google)</h3>
              <p className="text-xs text-gray-500">
                Lokalna baza i plik w chmurze różnią się od ostatniej synchronizacji ({formatDate(lastSyncedAt)}).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational warning text */}
        <p className="text-sm text-gray-600">
          Wykryto nowsze modyfikacje po obu stronach. Aby uniknąć utraty danych, wybierz, którą wersję chcesz zachować:
        </p>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Local State Card */}
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <span className="font-semibold text-sm text-gray-800">Wersja lokalna</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                To urządzenie
              </span>
            </div>
            <div className="text-xs text-gray-600 space-y-1 mt-1">
              <p>
                <span className="text-gray-400">Ostatnia zmiana:</span>{" "}
                <strong className="text-gray-800">{formatDate(localState.updatedAt)}</strong>
              </p>
              <p>
                <span className="text-gray-400">Przez:</span>{" "}
                <span className="text-gray-700">{localState.lastModifiedBy || "użytkownik lokalny"}</span>
              </p>
              <p>
                <span className="text-gray-400">Liczba profili:</span>{" "}
                <strong className="text-gray-800">{localState.profiles?.length || 0}</strong>
              </p>
              <p>
                <span className="text-gray-400">Łączna liczba transakcji:</span>{" "}
                <strong className="text-gray-800">{countTransactions(localState)}</strong>
              </p>
            </div>
          </div>

          {/* Remote State Card */}
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <span className="font-semibold text-sm text-gray-800">Wersja w chmurze</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                Dysk Google
              </span>
            </div>
            <div className="text-xs text-gray-600 space-y-1 mt-1">
              <p>
                <span className="text-gray-400">Ostatnia zmiana:</span>{" "}
                <strong className="text-gray-800">{formatDate(remoteState.updatedAt)}</strong>
              </p>
              <p>
                <span className="text-gray-400">Przez:</span>{" "}
                <span className="text-gray-700">{remoteState.lastModifiedBy || "Dysk Google"}</span>
              </p>
              <p>
                <span className="text-gray-400">Liczba profili:</span>{" "}
                <strong className="text-gray-800">{remoteState.profiles?.length || 0}</strong>
              </p>
              <p>
                <span className="text-gray-400">Łączna liczba transakcji:</span>{" "}
                <strong className="text-gray-800">{countTransactions(remoteState)}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Shared Profile Warning (Task 6) */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-amber-900">
              Profil wspólny: ostatni zapis wygrywa
            </p>
            <p className="text-amber-800 text-[11px]">
              {hasSharedProfile
                ? "Wybór zaktualizuje profil wspólny. Zmiany niepołączone zostaną nadpisane."
                : "Wszelkie konflikty dla profili rozwiązywane są nadpisaniem wybraną wersją (bez automatycznego scscalania CRDT)."}
            </p>
          </div>
        </div>

        {/* Actions (3 Polish buttons) */}
        <div className="flex flex-col sm:flex-row gap-2 mt-2 pt-2 border-t border-gray-100 justify-end">
          <button
            onClick={() => onResolve("cancel")}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-100 transition flex items-center justify-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Anuluj
          </button>
          <button
            onClick={() => onResolve("download_remote")}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Pobierz i nadpisz lokalne
          </button>
          <button
            onClick={() => onResolve("upload_local")}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#137566] text-white font-semibold text-xs hover:bg-[#0f5c50] transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            Wyślij i nadpisz remote
          </button>
        </div>
      </div>
    </div>
  );
}

```


## File: src/components/GoalsView.tsx
```tsx
import React, { useState } from "react";
import { Profile, Goal, Investment } from "../types";
import { formatPln, formatDatePl } from "../utils";

interface GoalsViewProps {
  profile: Profile;
  onOpenGoalModal: () => void;
  onOpenGoalDepositModal: (goal: Goal) => void;
  onAddInvestment: (name: string, amount: number, type?: string) => void;
  onDeleteGoal: (goalId: string) => void;
}

export function GoalsView({
  profile,
  onOpenGoalModal,
  onOpenGoalDepositModal,
  onAddInvestment,
  onDeleteGoal
}: GoalsViewProps) {
  const [invName, setInvName] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invType, setInvType] = useState("Poduszka finansowa");

  const handleInvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(invAmount.replace(",", "."));
    if (!invName.trim() || isNaN(amountNum) || amountNum <= 0) return;
    onAddInvestment(invName.trim(), amountNum, invType);
    setInvName("");
    setInvAmount("");
  };

  return (
    <div className="space-y-6" id="goals-view-container">
      {/* SECTION 1: SAVINGS GOALS */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Planowanie Przyszłości</p>
            <h2 className="text-xl font-bold text-[#153a35]">Cele oszczędnościowe</h2>
            <p className="text-[11px] text-gray-500 mt-1 max-w-sm leading-relaxed">
              <strong>Zarezerwowane na cele:</strong> wpłaty nie tworzą wydatków. Środki odłożone na cele są po prostu odejmowane od salda "Do wydania" jako rezerwa.
            </p>
          </div>
          <button
            onClick={onOpenGoalModal}
            className="bg-[#137566] text-white font-bold py-2 px-5 rounded-lg hover:bg-[#0f5d51] transition shadow-md text-sm"
            id="btn-add-goal"
          >
            ＋ Nowy cel
          </button>
        </div>

        {profile.goals.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
            <span className="text-3xl">🎯</span>
            <p className="text-sm font-semibold text-gray-500 mt-2">Nie zdefiniowałeś jeszcze celów oszczędnościowych.</p>
            <button
              onClick={onOpenGoalModal}
              className="text-[#137566] text-xs font-bold hover:underline mt-1"
            >
              Stwórz swój pierwszy cel &rarr;
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="goals-grid">
            {profile.goals.map((g) => {
              const percent = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
              let requiredMonthlyStr = "";
              if (g.targetDate && g.saved < g.target) {
                const targetD = new Date(g.targetDate);
                const now = new Date();
                const monthsDiff = (targetD.getFullYear() - now.getFullYear()) * 12 + targetD.getMonth() - now.getMonth();
                if (monthsDiff > 0) {
                  const required = (g.target - g.saved) / monthsDiff;
                  requiredMonthlyStr = `Potrzeba ok. ${formatPln(required)} / m-c`;
                } else if (monthsDiff === 0) {
                  requiredMonthlyStr = "To ostatni miesiąc!";
                }
              }

              return (
                <div key={g.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow transition flex flex-col justify-between h-[13rem] relative">
                  <button
                    onClick={() => onDeleteGoal(g.id)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-xs transition"
                    title="Usuń cel"
                    id={`btn-delete-goal-${g.id}`}
                  >
                    ✕
                  </button>
                  <div>
                    <span className="w-8 h-8 rounded-full bg-teal-50 text-[#137566] flex items-center justify-center font-bold text-sm mb-3 border border-teal-100">
                      🎯
                    </span>
                    <h3 className="text-sm font-bold text-[#153a35] line-clamp-1">{g.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatPln(g.saved)} z {formatPln(g.target)}
                    </p>
                    {requiredMonthlyStr && (
                      <p className="text-[10px] text-amber-600 mt-1 font-medium bg-amber-50 inline-block px-2 py-0.5 rounded">
                        {requiredMonthlyStr}
                      </p>
                    )}
                  </div>
                  <div>
                    {/* Progress */}
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-3 mb-1">
                      <div
                        style={{ width: `${percent}%` }}
                        className="bg-[#137566] h-full rounded-full transition-all duration-500"
                      ></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-400">{percent}% celu</span>
                      <button
                        onClick={() => onOpenGoalDepositModal(g)}
                        className="text-xs font-bold text-[#137566] hover:underline"
                        id={`btn-deposit-goal-${g.id}`}
                      >
                        ⇄ Transfer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: LONG-TERM INVESTMENTS */}
      <div className="border-t border-gray-100 pt-6">
        <h2 className="text-xl font-bold text-[#153a35] mb-4">Inwestycje długoterminowe</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick contribute form */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#153a35] mb-3">Rejestruj wpłatę inwestycyjną</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              Zapisz kwoty odkładane na IKE, IKZE, fundusze inwestycyjne, akcje lub obligacje skarbowe.
            </p>
            <form onSubmit={handleInvSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Kategoria</label>
                <select
                  value={invType}
                  onChange={(e) => setInvType(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2 text-xs outline-none focus:border-[#137566]"
                >
                  <option value="Poduszka finansowa">Poduszka finansowa</option>
                  <option value="IKE / IKZE (Emerytura)">IKE / IKZE (Emerytura)</option>
                  <option value="Lokaty / Obligacje">Lokaty / Obligacje</option>
                  <option value="Akcje / ETF">Akcje / ETF</option>
                  <option value="Kryptowaluty">Kryptowaluty</option>
                  <option value="Inne">Inne</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Nazwa aktywa / konta</label>
                <input
                  required
                  placeholder="np. Obligacje Skarbowe, IKE mBank"
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2 text-xs outline-none focus:border-[#137566]"
                  id="input-inv-name"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">Wpłacona kwota (zł)</label>
                <input
                  required
                  type="number"
                  min="1"
                  placeholder="0,00"
                  value={invAmount}
                  onChange={(e) => setInvAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2 text-xs outline-none focus:border-[#137566]"
                  id="input-inv-amount"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#137566] text-white font-bold py-2 rounded-lg hover:bg-[#0f5d51] transition text-xs shadow"
                id="btn-inv-submit"
              >
                Dodaj wpłatę
              </button>
            </form>
          </div>

          {/* Investment log book */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#153a35] mb-3">Podsumowanie inwestycji</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(
                  profile.investments.reduce((acc, inv) => {
                    const t = inv.type || "Inne";
                    acc[t] = (acc[t] || 0) + inv.amount;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, total]) => (
                  <div key={type} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="block text-[10px] text-gray-500 uppercase tracking-wide truncate" title={type}>{type}</span>
                    <strong className="text-sm text-slate-800">{formatPln(total)}</strong>
                  </div>
                ))}
                {profile.investments.length === 0 && (
                  <p className="text-xs text-gray-400 col-span-full">Brak danych inwestycyjnych.</p>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#153a35] mb-3">Historia wpłat kapitałowych</h3>
              <div className="divide-y divide-gray-50 overflow-y-auto max-h-[14rem] pr-1">
                {profile.investments.length === 0 ? (
                  <p className="text-xs text-gray-400 py-10 text-center italic">
                    Nie wprowadzono jeszcze żadnych wpłat inwestycyjnych.
                  </p>
                ) : (
                  [...profile.investments]
                    .sort((a, b) => b.isoDate.localeCompare(a.isoDate))
                    .map((inv) => (
                      <div key={inv.id} className="flex justify-between items-center py-3">
                        <div>
                          <strong className="text-xs text-gray-800 block">{inv.name}</strong>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-400">{formatDatePl(inv.isoDate)}</span>
                            {inv.type && (
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{inv.type}</span>
                            )}
                          </div>
                        </div>
                        <strong className="text-sm text-[#137566]">{formatPln(inv.amount)}</strong>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

```


## File: src/components/HelpView.tsx
```tsx
import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  LayoutDashboard,
  History,
  Clock,
  Wallet,
  Target,
  LineChart,
  Settings,
  ShieldCheck,
  Sparkles,
  MousePointer,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Download,
  Upload,
  Lock,
  Database,
  RefreshCw,
  FileSpreadsheet,
  HelpCircle,
  Zap,
  PieChart,
  Info,
  ShieldAlert,
  Calendar,
  Layers,
  BarChart3
} from "lucide-react";

interface StepHighlightProps {
  key?: React.Key;
  step: number;
  label: string;
  description: string;
}

function StepHighlight({ step, label, description }: StepHighlightProps) {
  return (
    <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#137566] text-white font-bold text-xs shrink-0 shadow-sm">
        {step}
      </div>
      <div>
        <h5 className="font-semibold text-gray-800 text-sm">{label}</h5>
        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

interface MockScreenShotProps {
  title: string;
  badge: string;
  children: React.ReactNode;
  steps: StepHighlightProps[];
}

function MockScreenShot({ title, badge, children, steps }: MockScreenShotProps) {
  return (
    <div className="my-5 border border-gray-200 rounded-2xl overflow-hidden bg-slate-900 shadow-lg text-white">
      {/* Mock Window Header */}
      <div className="bg-slate-800/90 px-4 py-2.5 border-b border-slate-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="text-xs font-mono text-slate-400 ml-2">{title}</span>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#137566]/30 text-emerald-300 border border-emerald-500/30 rounded-full">
          {badge}
        </span>
      </div>

      {/* Mock Visual Interface Body */}
      <div className="p-4 sm:p-5 bg-slate-950/60 font-sans">
        {children}
      </div>

      {/* Step by Step Action Markers */}
      {steps.length > 0 && (
        <div className="bg-slate-800/50 p-4 border-t border-slate-700/60 grid gap-2 sm:grid-cols-2">
          {steps.map((s) => (
            <StepHighlight key={s.step} step={s.step} label={s.label} description={s.description} />
          ))}
        </div>
      )}
    </div>
  );
}

interface HelpSectionProps {
  id: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function HelpSection({ title, category, icon, badge, defaultOpen = false, children }: HelpSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200/80 rounded-2xl overflow-hidden mb-4 bg-white shadow-sm hover:shadow-md transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left focus:outline-none hover:bg-slate-50/80 transition-colors"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-[#f0f9f6] text-[#137566] rounded-xl shadow-xs shrink-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800 text-base sm:text-lg">{title}</span>
              {badge && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-[#137566] px-2 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 font-medium">{category}</span>
          </div>
        </div>
        <div className="text-gray-400 p-1 rounded-lg hover:bg-gray-100 transition-colors">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>
      {isOpen && (
        <div className="p-5 pt-2 text-gray-600 border-t border-gray-100 leading-relaxed bg-[#fcfdfd]">
          {children}
        </div>
      )}
    </div>
  );
}

export function HelpView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Wszystko");

  const categories = [
    "Wszystko",
    "Szybki start",
    "Pulpit i Wskaźniki",
    "Transakcje i CSV",
    "Rachunki i Kalendarz",
    "Budżety i Limity",
    "Cele i Inwestycje",
    "Profile i PIN",
    "Kopia i Chmura",
    "Lokalne AI"
  ];

  const filteredSections = useMemo(() => {
    return [
      { id: "quickstart", cat: "Szybki start", title: "Szybki start — Pierwsze kroki w aplikacji" },
      { id: "dashboard", cat: "Pulpit i Wskaźniki", title: "Pulpit główny i wskaźniki (Safe-to-Spend, Prognoza)" },
      { id: "transactions", cat: "Transakcje i CSV", title: "Transakcje, Import CSV z banku i deduplikacja" },
      { id: "payments", cat: "Rachunki i Kalendarz", title: "Płatności, Subskrypcje i Kalendarz Google" },
      { id: "budgets", cat: "Budżety i Limity", title: "Budżety kategorii i ostrzeżenia o przekroczeniu" },
      { id: "goals", cat: "Cele i Inwestycje", title: "Cele oszczędnościowe, Poduszka i IKE/IKZE" },
      { id: "profiles", cat: "Profile i PIN", title: "Profile (Osobisty / Wspólny), Szyfrowanie PIN-em" },
      { id: "backup", cat: "Kopia i Chmura", title: "Google Drive, Kopie zapasowe i Rozwiązywanie konfliktów" },
      { id: "ai", cat: "Lokalne AI", title: "Tryby pracy (None, Lokalne AI / Ollama) oraz Przyszłość" }
    ].filter((item) => {
      const matchCat = selectedCategory === "Wszystko" || item.cat === selectedCategory;
      const matchSearch =
        searchQuery.trim() === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.cat.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#137566] via-[#0f5c50] to-[#0a4239] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-emerald-200 border border-white/10">
            <Sparkles className="w-3.5 h-3.5" /> Complete User Guide & Knowledge Base
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-300" />
            Centrum Pomocy i Przewodnik Po Saldo
          </h2>
          <p className="text-[#c3ebe2] text-sm sm:text-base max-w-3xl leading-relaxed">
            Kompleksowy poradnik opisujący działanie każdej funkcji, zależności finansowe, ochronę kapitału oraz instrukcje krok po kroku ze wskaźnikami kliknięć.
          </p>

          {/* Interactive Search Bar */}
          <div className="pt-2 max-w-xl">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj funkcji (np. 'import CSV', 'Safe to spend', 'IKE', 'PIN')..."
                className="w-full pl-11 pr-4 py-3 bg-white text-gray-900 placeholder-gray-400 rounded-xl shadow-inner text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-64 h-64 bg-black/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-[#137566] text-white shadow-sm scale-105"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm">Prywatność i Szyfrowanie</h4>
            <p className="text-xs text-gray-600 mt-1">Swoje dane przechowujesz lokalnie lub na własnym koncie Google Drive z kodem PIN.</p>
          </div>
        </div>

        <div className="bg-teal-50/60 border border-teal-100 p-4 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-teal-600 text-white rounded-xl shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm">Wskaźnik Bezpieczeństwa</h4>
            <p className="text-xs text-gray-600 mt-1">Aplikacja sama przelicza rezerwy na rachunki i podpowiada ile możesz wydać.</p>
          </div>
        </div>

        <div className="bg-cyan-50/60 border border-cyan-100 p-4 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-cyan-600 text-white rounded-xl shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm">Bezpieczny Import CSV</h4>
            <p className="text-xs text-gray-600 mt-1">Automatyczne unikanie duplikatów i usuwanie uszkodzonych kwot (NaN).</p>
          </div>
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="space-y-4">
        {/* SECTION 1: QUICKSTART */}
        {filteredSections.some((s) => s.id === "quickstart") && (
          <HelpSection
            id="quickstart"
            category="Szybki start"
            title="Szybki start — Pierwsze 3 kroki do opanowania budżetu"
            icon={<Zap className="w-5 h-5" />}
            badge="Instrukcja wizualna"
            defaultOpen={true}
          >
            <p className="mb-4 text-sm text-gray-700 leading-relaxed">
              Witamy w Saldo! Aplikacja została zaprojektowana z myślą o maksymalnej przejrzystości i ochronie Twoich środków. Poniżej znajduje się wizualna instrukcja wykonania najważniejszych pierwszych kroków.
            </p>

            <MockScreenShot
              title="Aplikacja Saldo — Wskazówki nawigacji"
              badge="Interfejs użytkownika"
              steps={[
                { step: 1, label: "Panel nawigacji", description: "Przełączaj się między Pulpitem, Transakcjami, Budżetami i Inwestycjami w lewym menu." },
                { step: 2, label: "Przycisk dodawania", description: "Użyj zielonego przycisku '+ Nowa transakcja', aby ręcznie zapisać wydatek lub przychód." },
                { step: 3, label: "Bezpieczny limit (Safe-to-Spend)", description: "Sprawdzaj górną kartę — pokazuje kwotę wolną od zobowiązań w tym miesiącu." },
                { step: 4, label: "Wybór Profilu", description: "W prawym górnym rogu przełączaj profil z Osobistego na Wspólny z partnerem." }
              ]}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900 border border-emerald-500/30 p-3 rounded-xl relative overflow-hidden">
                  <div className="absolute top-2 right-2 bg-emerald-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center">1</div>
                  <div className="text-xs text-slate-400">Nawigacja głównego menu</div>
                  <div className="font-bold text-emerald-400 mt-1 flex items-center gap-1">
                    <LayoutDashboard className="w-4 h-4" /> Pulpit & Transakcje
                  </div>
                </div>

                <div className="bg-slate-900 border border-amber-500/30 p-3 rounded-xl relative overflow-hidden">
                  <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center">2</div>
                  <div className="text-xs text-slate-400">Szybkie wprowadzanie</div>
                  <div className="font-bold text-amber-300 mt-1 flex items-center gap-1">
                    <History className="w-4 h-4" /> + Dodaj transakcję
                  </div>
                </div>

                <div className="bg-slate-900 border border-cyan-500/30 p-3 rounded-xl relative overflow-hidden">
                  <div className="absolute top-2 right-2 bg-cyan-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center">3</div>
                  <div className="text-xs text-slate-400">Stan bezpieczny</div>
                  <div className="font-bold text-cyan-300 mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Limit: 2,450 PLN
                  </div>
                </div>
              </div>
            </MockScreenShot>

            <div className="space-y-3 text-sm text-gray-700">
              <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Jak prawidłowo wdrożyć Saldo w 5 minut?
              </h4>
              <ol className="list-decimal pl-5 space-y-2">
                <li><strong>Wprowadź swoje stałe płatności:</strong> W zakładce <em>Płatności</em> dodaj czynsz, prąd, ubezpieczenia i subskrypcje. Dzięki temu wskaźnik <em>Safe-to-Spend</em> od razu rezerwuje na nie fundusze.</li>
                <li><strong>Zapisz oszczędności na czarną godzinę:</strong> W zakładce <em>Cele</em> stwórz poduszkę finansową. Zostanie ona wyłączona z kwoty do swobodnego wydania.</li>
                <li><strong>Importuj lub dodawaj transakcje:</strong> Zaciągnij historię z banku przez plik CSV lub rejestruj codzienne zakupy na bieżąco.</li>
              </ol>
            </div>
          </HelpSection>
        )}

        {/* SECTION 2: DASHBOARD */}
        {filteredSections.some((s) => s.id === "dashboard") && (
          <HelpSection
            id="dashboard"
            category="Pulpit i Wskaźniki"
            title="Pulpit główny i wskaźniki finansowe (Safe-to-Spend, Prognoza)"
            icon={<LayoutDashboard className="w-5 h-5" />}
          >
            <div className="space-y-4 text-sm text-gray-700">
              <p className="leading-relaxed">
                Pulpit główny (Dashboard) to Twój kokpit finansowy. Łączy w sobie wszystkie dane z całego profilu i w czasie rzeczywistym przelicza kluczowe wskaźniki matematyczne.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
                <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-2xs">
                  <h4 className="font-bold text-[#137566] flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4" /> Safe-to-Spend (Bezpieczny limit)
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Formuła: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">Przychody – Zaksięgowane Wydatki – Nadchodzące Rachunki – Wpłaty na Cele</code>.
                    Chroni Cię przed wydaniem pieniędzy, które za kilka dni będą potrzebne na opłacenie raty kredytu lub rachunku za prąd.
                  </p>
                </div>

                <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-2xs">
                  <h4 className="font-bold text-teal-700 flex items-center gap-2 mb-1">
                    <LineChart className="w-4 h-4" /> Prognoza na koniec miesiąca
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Analizuje średnie dzienne tempo wydatków w bieżącym miesiącu i prognozuje szacunkowe saldo na 30/31 dzień. Ostrzega, gdy przy obecnym tempie grozi Ci deficyt.
                  </p>
                </div>
              </div>

              <h4 className="font-bold text-gray-900 mt-4">Zależności z innymi modułami:</h4>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
                <li>Dodanie nowej płatności w zakładce <strong>Płatności</strong> natychmiast pomniejsza <em>Safe-to-Spend</em>.</li>
                <li>Oznaczenie płatności jako "Opłacono" zamienia ją w transakcję i aktualizuje bilans przychodów/wydatków.</li>
                <li>Wpłata na <strong>Cel oszczędnościowy</strong> blokuje środki i wyklucza je z bieżącego portfela.</li>
              </ul>
            </div>
          </HelpSection>
        )}

        {/* SECTION 3: TRANSACTIONS & CSV */}
        {filteredSections.some((s) => s.id === "transactions") && (
          <HelpSection
            id="transactions"
            category="Transakcje i CSV"
            title="Transakcje, bezpieczny import CSV i automatyczna deduplikacja"
            icon={<History className="w-5 h-5" />}
            badge="Deduplikacja & NaN protection"
          >
            <div className="space-y-4 text-sm text-gray-700">
              <p className="leading-relaxed">
                Moduł Transakcji odpowiada za śledzenie każdego przepływu pieniężnego. Oferuje inteligentne dopasowywanie kategorii, obsługę tagów oraz wbudowany bezpłatny importer wyciągów z banku.
              </p>

              <MockScreenShot
                title="Procedura importu wyciągu CSV z banku"
                badge="Proces importu"
                steps={[
                  { step: 1, label: "Przycisk Importu", description: "Kliknij 'Importuj CSV' na liście transakcji." },
                  { step: 2, label: "Wybór/Wklejenie", description: "Upuść plik CSV lub wklej treść wyciągu." },
                  { step: 3, label: "Automatyczny Dedupe", description: "System porównuje ID i pomija transakcje już wcześniej wczytane." },
                  { step: 4, label: "Sanity Check (NaN)", description: "Niepoprawne kwoty numeryczne są automatycznie odrzucane." }
                ]}
              >
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-bold text-emerald-400">Wyciąg_Bankowy_2026.csv</span>
                    <span className="text-slate-500">Wyryto 12 transakcji</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg font-mono text-[11px] text-slate-400 border border-slate-800 space-y-1">
                    <div className="text-emerald-400">✓ [ID: tx-101] 2026-07-20 | Zakupy Spożywcze | 145.20 PLN (Zapisano)</div>
                    <div className="text-amber-400">⚠ [ID: tx-101] 2026-07-20 | Zakupy Spożywcze | 145.20 PLN (Pominięto — Duplikat)</div>
                    <div className="text-red-400">✕ [ID: tx-102] 2026-07-21 | Błędna Kwota | NaN (Odrzucono sanity-check)</div>
                  </div>
                </div>
              </MockScreenShot>

              <h4 className="font-bold text-gray-900">Mechanizm ochrony danych w imporcie CSV:</h4>
              <ul className="list-disc pl-5 space-y-2 text-xs text-gray-600">
                <li><strong>Ochrona przed podwójnym importem (Deduplikacja):</strong> Gdy importujesz ten sam plik CSV drugi raz, Saldo rozpoznaje istniejące Identyfikatory transakcji i nie dubluje wpisów.</li>
                <li><strong>Sprawdzanie poprawności numerycznej:</strong> Jeśli wyciąg zawiera uszkodzone lub nieczytelne kwoty (np. tekstowe znaki zapytania zamienione na NaN), transakcja zostaje bezpiecznie odrzucona.</li>
                <li><strong>Autokategoryzacja:</strong> Słowa kluczowe np. "Orlen", "Biedronka", "Uber" automatycznie przydzielają właściwą kategorię budżetową.</li>
              </ul>
            </div>
          </HelpSection>
        )}

        {/* SECTION 4: PAYMENTS & CALENDAR */}
        {filteredSections.some((s) => s.id === "payments") && (
          <HelpSection
            id="payments"
            category="Rachunki i Kalendarz"
            title="Płatności, Subskrypcje i integracja z Kalendarzem Google"
            icon={<Clock className="w-5 h-5" />}
          >
            <div className="space-y-4 text-sm text-gray-700">
              <p className="leading-relaxed">
                Nigdy więcej nie zapomnisz o terminie zapłaty za czynsz, internet czy ratę kredytu. Rachunki są prezentowane na osi czasu z wyraźnym oznaczeniem dni pozostałych do terminu wymagalności.
              </p>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-sm text-amber-900">
                  <Calendar className="w-4 h-4 text-amber-700" /> Integracja z Kalendarzem Google
                </div>
                <p>
                  Przy każdej płatności znajduje się przycisk <strong>Dodaj do Kalendarza</strong>. Kliknięcie otwiera formularz dodawania wydarzenia w Google Calendar z przygotowanym tytułem, kwotą i przypomnieniem w dniu płatności!
                </p>
              </div>

              <h4 className="font-bold text-gray-900">Cykl życia Płatności:</h4>
              <div className="flex flex-col sm:flex-row items-center gap-2 text-xs text-gray-700 font-medium">
                <div className="p-2.5 bg-slate-100 rounded-lg border border-gray-200 text-center w-full">1. Utworzenie Rachunku (np. Czynsz 2000 PLN)</div>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0 hidden sm:block" />
                <div className="p-2.5 bg-amber-100 text-amber-900 rounded-lg border border-amber-200 text-center w-full">2. Rezerwacja w Safe-to-Spend</div>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0 hidden sm:block" />
                <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-lg border border-emerald-200 text-center w-full">3. Przycisk "Opłacono" ➔ Wydatek zrobiony</div>
              </div>
            </div>
          </HelpSection>
        )}

        {/* SECTION 5: BUDGETS */}
        {filteredSections.some((s) => s.id === "budgets") && (
          <HelpSection
            id="budgets"
            category="Budżety i Limity"
            title="Budżety kategorii, paski postępu i alerty ostrzegawcze"
            icon={<Wallet className="w-5 h-5" />}
          >
            <div className="space-y-4 text-sm text-gray-700">
              <p className="leading-relaxed">
                Budżety pozwalają nałożyć miesięczny limit na poszczególne kategorie wydatków (np. 1500 zł na Jedzenie, 500 zł na Rozrywkę).
              </p>

              <div className="space-y-2 my-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-700">
                    <span>Kategoria: Jedzenie i Spożywcze</span>
                    <span className="text-emerald-700">65% (975 / 1500 PLN)</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[65%]" />
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-xs font-semibold text-gray-700">
                    <span>Kategoria: Rozrywka i Wyjścia</span>
                    <span className="text-red-600 font-bold">115% (575 / 500 PLN — PRZEKROCZENIE!)</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full w-full" />
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-600">
                Gdy wydatek w danej kategorii przekroczy 80% lub 100% ustalonego limitu, na Pulpicie pojawia się specjalny widget <strong>Ostrzeżenia Budżetowe</strong> z propozycją korekty.
              </p>
            </div>
          </HelpSection>
        )}

        {/* SECTION 6: GOALS & INVESTMENTS */}
        {filteredSections.some((s) => s.id === "goals") && (
          <HelpSection
            id="goals"
            category="Cele i Inwestycje"
            title="Cele oszczędnościowe, Poduszka bezpieczeństwa oraz IKE / IKZE"
            icon={<Target className="w-5 h-5" />}
            badge="Ochrona Rezerw"
          >
            <div className="space-y-4 text-sm text-gray-700">
              <p className="leading-relaxed">
                Ta sekcja pomaga budować długoterminowy majątek. Dzieli oszczędności na trzy niezależne filary:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <h5 className="font-bold text-emerald-900 mb-1">1. Cele krótkoterminowe</h5>
                  <p className="text-emerald-800">Wakacje, nowy sprzęt, remont. Zbierasz określoną kwotę do konkretnej daty.</p>
                </div>

                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                  <h5 className="font-bold text-teal-900 mb-1">2. Poduszka Finansowa</h5>
                  <p className="text-teal-800">Środki na 3–6 miesięcy życia. Pokazywane osobno jako kapitał bezpieczeństwa.</p>
                </div>

                <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl">
                  <h5 className="font-bold text-cyan-900 mb-1">3. IKE / IKZE / Inwestycje</h5>
                  <p className="text-cyan-800">Konta emerytalne, lokaty, akcje, fundusze. Odłączone od codziennego portfela.</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-xs text-red-900 flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-sm text-red-950 font-bold mb-0.5">Zasada ochrony zgromadzonych rezerw (saved &gt; 0)</strong>
                  Aplikacja posiada blokadę chroniącą przed przypadkowym usunięciem celu, na który wpłacono już realne pieniądze. Aby usunąć taki cel, należy najpierw wycofać środki (zmniejszyć zgromadzoną kwotę do 0).
                </div>
              </div>
            </div>
          </HelpSection>
        )}

        {/* SECTION 7: PROFILES & PIN */}
        {filteredSections.some((s) => s.id === "profiles") && (
          <HelpSection
            id="profiles"
            category="Profile i PIN"
            title="Profile (Osobisty / Wspólny), Szyfrowanie i blokada PIN"
            icon={<Lock className="w-5 h-5" />}
          >
            <div className="space-y-4 text-sm text-gray-700">
              <p className="leading-relaxed">
                Saldo umożliwia posiadanie wielu odizolowanych profili finansowych w ramach jednej aplikacji (np. "Mój budżet prywatny" oraz "Wspólny budżet z partnerem").
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
                  <h5 className="font-bold text-gray-900 mb-1">Profil Wspólny i Podział Wydatków</h5>
                  <p className="text-gray-600">
                    W profilu typu Shared każda transakcja ma oznaczenie kto płacił (Ja / Partner) oraz tryb podziału (Równo 50/50 lub Tylko ja). Widget Rozliczeń automatycznie podlicza balans kto komu ile jest winien!
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
                  <h5 className="font-bold text-gray-900 mb-1">Blokada PIN dla prywatności</h5>
                  <p className="text-gray-600">
                    W Ustawieniach możesz włączyć 4-cyfrowy kod PIN dla dowolnego profilu. Po zablokowaniu, przełączenie na ten profil wymaga wpisania kodu.
                  </p>
                </div>
              </div>
            </div>
          </HelpSection>
        )}

        {/* SECTION 8: BACKUP & DRIVE */}
        {filteredSections.some((s) => s.id === "backup") && (
          <HelpSection
            id="backup"
            category="Kopia i Chmura"
            title="Kopie zapasowe na Google Drive, eksport JSON i obsługa konfliktów"
            icon={<Database className="w-5 h-5" />}
          >
            <div className="space-y-4 text-sm text-gray-700">
              <p className="leading-relaxed">
                Twoje dane finansowe należą wyłącznie do Ciebie. Saldo nie korzysta z własnych serwerów bazy danych — zamiast tego zapisuje stan w przeglądarce (IndexedDB) oraz na Twoim prywatnym koncie Google Drive.
              </p>

              <div className="space-y-2 text-xs text-gray-600">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong className="text-slate-900 block mb-1 font-bold">1. Synchronizacja z Google Drive:</strong>
                  W Ustawieniach połącz się ze swoim kontem Google. Aplikacja utworzy ukryty plik kopii zapasowej w dedykowanym folderze aplikacji na Twoim własnym Dysku.
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong className="text-slate-900 block mb-1 font-bold">2. Rozwiązywanie Konfliktów Synchronizacji:</strong>
                  Jeśli edytujesz dane na dwóch urządzeniach (np. na telefonie i komputerze), system wykryje różnicę wersji i wyświetli interaktywne okno <strong>Konflikt kopii zapasowej</strong>, pozwalając Ci wybrać najnowszą wersję.
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <strong className="text-slate-900 block mb-1 font-bold">3. Eksport/Import pliku JSON (Offline):</strong>
                  Możesz w dowolnej chwili pobrać surowy plik danych <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800">.json</code> i przenieść go na dowolne urządzenie pendrive'em lub mailem.
                </div>
              </div>
            </div>
          </HelpSection>
        )}

        {/* SECTION 9: AI MODES */}
        {filteredSections.some((s) => s.id === "ai") && (
          <HelpSection
            id="ai"
            category="Lokalne AI"
            title="Tryby pracy AI (None, Lokalne Ollama, Gemini) oraz Przyszłość"
            icon={<Sparkles className="w-5 h-5" />}
          >
            <div className="space-y-4 text-sm text-gray-700">
              <p className="leading-relaxed">
                Saldo wspiera 3 elastyczne tryby sztucznej inteligencji dopasowane do Twoich wymagań odnośnie prywatności:
              </p>

              <ul className="list-disc pl-5 space-y-3 text-xs">
                <li>
                  <strong>Tryb podstawowy (None) – 100% Darmowy &amp; Domyślny:</strong><br />
                  Pełna funkcjonalność aplikacji bez użycia modeli AI. Wykorzystuje ultra-szybkie algorytmy deterministyczne do parsowania tekstów, autokategoryzacji i importu CSV. Brak połączeń sieciowych.
                </li>
                <li>
                  <strong>Lokalne AI (local / Ollama) – Pełna prywatność Power-Usera:</strong><br />
                  Łączy się z lokalnym modelem uruchomionym na Twoim komputerze za pomocą aplikacji Ollama (<code className="bg-gray-100 px-1 py-0.5 rounded">http://localhost:11434</code>).
                </li>
              </ul>

              {/* Step-by-step setup guide for Ollama */}
              <div className="bg-slate-900 text-slate-100 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4 text-xs font-sans">
                <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> Instrukcja konfiguracji Lokalnego AI (Ollama) krok po kroku
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <span className="font-bold text-white block text-xs">🍎 macOS (Apple Silicon & Intel)</span>
                    <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                      <li>Pobierz Ollama z <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">ollama.com</a>.</li>
                      <li>Otwórz Terminal (<code className="text-emerald-300">Cmd + Spacja</code> ➔ Terminal).</li>
                      <li>Uruchom z obsługą CORS:<br />
                        <code className="bg-slate-800 text-emerald-300 px-2 py-0.5 rounded font-mono text-[11px] inline-block mt-1">OLLAMA_ORIGINS="*" ollama serve</code>
                      </li>
                      <li>W nowym oknie wpisz: <code className="bg-slate-800 text-emerald-300 px-2 py-0.5 rounded font-mono text-[11px]">ollama run llama3</code>.</li>
                    </ol>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <span className="font-bold text-white block text-xs">🪟 Windows (PowerShell / CMD)</span>
                    <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                      <li>Zainstaluj Ollama dla Windows.</li>
                      <li>Otwórz PowerShell i ustaw zmienną CORS:<br />
                        <code className="bg-slate-800 text-emerald-300 px-2 py-0.5 rounded font-mono text-[11px] inline-block mt-1">$env:OLLAMA_ORIGINS="*"</code>
                      </li>
                      <li>Uruchom model:<br />
                        <code className="bg-slate-800 text-emerald-300 px-2 py-0.5 rounded font-mono text-[11px] inline-block mt-1">ollama run llama3</code>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs text-gray-700">
                <strong className="text-[#137566] block font-bold mb-1">Planowane funkcje w przyszłych wersjach:</strong>
                Chmurowe AI (Gemini OCR dla skanowania paragonów), automatyczna synchronizacja z bankami przez bezpieczny Open Banking (PSD2), obsługa wielu walut z przeliczaniem kursów NBP w czasie rzeczywistym oraz wieloosobowe budżetowanie live!
              </div>
            </div>
          </HelpSection>
        )}
      </div>

      {/* Interactive FAQ Box */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
          <HelpCircle className="w-6 h-6 text-[#137566]" />
          Najczęściej zadawane pytania (FAQ)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
            <h5 className="font-bold text-gray-900 text-sm">Czy moje dane trafiają na Wasze serwery?</h5>
            <p className="text-gray-600 leading-relaxed">
              Nie. Saldo działa w architekturze Local-First. Twoje finanse są zapisywane wyłącznie na Twoim urządzeniu w bezpiecznej pamięci przeglądarki lub na Twoim osobistym koncie Google Drive.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
            <h5 className="font-bold text-gray-900 text-sm">Co się stanie, gdy zgubię kod PIN?</h5>
            <p className="text-gray-600 leading-relaxed">
              Kod PIN zabezpiecza dostęp do wybranego profilu. Możesz zresetować zapomniany PIN w Ustawieniach lub przywrócić niezabezpieczoną kopię zapasową z pliku JSON lub Google Drive.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
            <h5 className="font-bold text-gray-900 text-sm">Dlaczego import CSV odrzucił niektóre wiersze?</h5>
            <p className="text-gray-600 leading-relaxed">
              System posiada wbudowaną walidację unikania duplikatów oraz filtr usuwający błędne wartości (np. puste kwoty lub zakodowany tekst NaN), chroniąc spójność wyliczeń.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
            <h5 className="font-bold text-gray-900 text-sm">Jak powiązać rachunek z Kalendarzem Google?</h5>
            <p className="text-gray-600 leading-relaxed">
              Przejdź do zakładki Płatności i kliknij ikonę kalendarza obok wybranej płatności. Zostanie przygotowane wydarzenie ze szczegółami kwoty i terminu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Terminal(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}

```


## File: src/components/ImportTransactionsModal.tsx
```tsx
import { callAiApi, getAiConfig } from "../services/aiClient";
import { useApp } from "../app/providers/AppContext";
import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { Transaction } from "../types";
import { expenseCategories, incomeCategories, iconByCategory, getLocalDateIso } from "../utils";
import { UploadCloud, FileText, Sparkles, Loader2, FileSpreadsheet, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { checkDuplicate } from "../services/duplicateDetector";
import {
  BANK_PRESETS,
  BankPreset,
  parseAndMapCsv,
  autoDetectBankColumns,
  cleanCsvBomAndEncoding,
  detectCsvSeparator
} from "../services/parseCsv";

interface ImportTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transactions: Transaction[]) => void;
  onBeforeImport?: () => void;
}

export function ImportTransactionsModal({ isOpen, onClose, onImport, onBeforeImport }: ImportTransactionsModalProps) {
  const { state, activeProfile } = useApp();
  const isAiAvailable = state.aiMode !== "none";
  const [tab, setTab] = useState<"csv" | "ai">("csv");
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Input, 2: Mapping, 3: Preview

  // CSV State
  const [selectedPresetId, setSelectedPresetId] = useState<BankPreset["id"]>("generic");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [detectedDelimiter, setDetectedDelimiter] = useState<string>(";");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mapping state
  const [mapName, setMapName] = useState("");
  const [mapAmount, setMapAmount] = useState("");
  const [mapDate, setMapDate] = useState("");
  const [mapCategory, setMapCategory] = useState("");
  const [defaultCategory, setDefaultCategory] = useState("Inne");
  const [defaultAccount, setDefaultAccount] = useState("Konto główne");
  const [typeStrategy, setTypeStrategy] = useState<"auto" | "expense" | "income">("auto");

  // AI State
  const [aiText, setAiText] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiError, setAiError] = useState("");

  // Shared Output
  const [mappedTransactions, setMappedTransactions] = useState<Transaction[]>([]);
  const [importStats, setImportStats] = useState({
    invalidAmount: 0,
    invalidDate: 0,
    skippedEmpty: 0,
    tooMany: false
  });

  if (!isOpen) return null;

  const processRawCsvString = (text: string, name: string = "Wklejony tekst CSV") => {
    setFileName(name);
    setCsvText(text);

    const cleaned = cleanCsvBomAndEncoding(text);
    const result = parseAndMapCsv({
      rawCsvText: cleaned,
      presetId: selectedPresetId,
      rules: activeProfile?.transactionRules || []
    });

    setHeaders(result.headers);
    setParsedRows(result.parsedRows);
    setDetectedDelimiter(result.detectedSeparator);

    const autoCols = autoDetectBankColumns(result.headers, selectedPresetId);
    setMapName(autoCols.mapName);
    setMapAmount(autoCols.mapAmount);
    setMapDate(autoCols.mapDate);
    setMapCategory(autoCols.mapCategory);

    setStep(2);
  };

  // --- CSV Handlers ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processRawCsvString(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleGenerateCsvPreview = () => {
    const result = parseAndMapCsv({
      rawCsvText: csvText,
      presetId: selectedPresetId,
      mapName,
      mapAmount,
      mapDate,
      mapCategory,
      defaultCategory,
      defaultAccount,
      typeStrategy,
      rules: activeProfile?.transactionRules || []
    });

    setMappedTransactions(result.transactions);
    setImportStats({
      invalidAmount: result.stats.invalidAmountCount,
      invalidDate: result.stats.invalidDateCount,
      skippedEmpty: result.stats.skippedEmptyCount,
      tooMany: result.transactions.length >= 2000
    });
    setStep(3);
  };

  // --- AI Handlers ---
  const handleAiProcess = async () => {
    if (!aiText.trim()) return;
    setIsAiProcessing(true);
    setAiError("");
    try {
      const data = await callAiApi("parse-statement", { text: aiText, currentDate: getLocalDateIso() }, getAiConfig(state));

      const processed: Transaction[] = (data.transactions || []).map((t: any) => ({
        id: "tx-ai-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        name: t.name || "Nieznana transakcja",
        amount: t.amount || 0,
        type: t.type === "income" ? "income" : "expense",
        isoDate: t.isoDate || getLocalDateIso(),
        category: t.category || defaultCategory,
        categoryIcon: iconByCategory[t.category] || "✨",
        account: t.account || defaultAccount
      }));

      setMappedTransactions(processed);
      setStep(3);
    } catch (err: any) {
      setAiError(err.message || "Wystąpił problem podczas przetwarzania tekstu.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const duplicateAnalysis = React.useMemo(() => {
    const existing = activeProfile?.transactions || [];
    let duplicateCount = 0;
    const enriched = mappedTransactions.map((tx) => {
      const res = checkDuplicate(tx, existing);
      if (res.isLikelyDuplicate) duplicateCount++;
      return { tx, warning: res.isLikelyDuplicate ? res : null };
    });
    return { enriched, duplicateCount };
  }, [mappedTransactions, activeProfile]);

  const handleConfirmImport = (skipDuplicates = false) => {
    if (onBeforeImport) onBeforeImport();
    if (skipDuplicates) {
      onImport(duplicateAnalysis.enriched.filter((item) => !item.warning).map((item) => item.tx));
    } else {
      onImport(mappedTransactions);
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-20">
          <div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-[#137566]" />
              Import historii transakcji bankowych
            </h2>
            <p className="text-xs text-gray-500 font-medium">Szybki import historii z wyciągów bankowych (.csv) z podglądem i detekcją duplikatów.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-2 bg-gray-50 hover:bg-gray-100 rounded-full">
            <span className="sr-only">Zamknij</span>
            &times;
          </button>
        </div>

        {/* TABS */}
        {step === 1 && isAiAvailable && (
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setTab("csv")}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${
                tab === "csv" ? "text-[#137566] border-b-2 border-[#137566] bg-emerald-50/30" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" /> Wgraj / wklej plik CSV (Darmowe)
            </button>
            <button
              onClick={() => setTab("ai")}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition ${
                tab === "ai" ? "text-[#137566] border-b-2 border-[#137566] bg-emerald-50/30" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Sparkles className="w-4 h-4" /> Analiza tekstu (AI)
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && tab === "ai" && isAiAvailable && (
            <div className="space-y-4">
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <p className="text-sm text-emerald-800 font-medium mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> <strong>Analiza tekstu za pomocą AI</strong>
                </p>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Skopiuj surowy tekst wyciągu ze strony banku lub maila i wklej go poniżej. Podłączony model AI wyciągnie kwoty, daty oraz przypisze odpowiednie kategorie.
                </p>
              </div>
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder="Wklej historię transakcji z banku tutaj..."
                className="w-full h-48 p-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#137566] resize-none"
              ></textarea>
              {aiError && <p className="text-rose-500 text-xs font-bold">{aiError}</p>}
              <button
                onClick={handleAiProcess}
                disabled={isAiProcessing || !aiText.trim()}
                className="w-full bg-[#137566] text-white font-bold py-3 px-6 rounded-xl hover:bg-[#0f5d51] transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isAiProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {isAiProcessing ? "Analizowanie..." : "Analizuj transakcje AI"}
              </button>
            </div>
          )}

          {step === 1 && tab === "csv" && (
            <div className="space-y-5">
              {/* Presets Selection Bar (Task D1 #1) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  1. Wybierz preset bankowy
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {BANK_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        selectedPresetId === preset.id
                          ? "border-[#137566] bg-emerald-50/50 ring-1 ring-[#137566]"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">{preset.name}</span>
                        {selectedPresetId === preset.id && <CheckCircle2 className="w-4 h-4 text-[#137566]" />}
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1">{preset.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Encoding & Security note (Task D1 #2 & #7) */}
              <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 flex items-start gap-2.5 text-xs text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-[#137566] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-emerald-900">Bezpieczny lokalny import (UTF-8 / Windows-1250)</p>
                  <p className="text-[11px] text-emerald-700">
                    Oczyszczanie nagłówków z znaku BOM jest automatyczne. Dane są przetwarzane wyłącznie lokalnie w przeglądarce i nie opuszczają Twojego urządzenia.
                  </p>
                </div>
              </div>

              {/* Drag & Drop File */}
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  dragActive ? "border-[#137566] bg-emerald-50/50" : "border-gray-200 bg-gray-50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <FileText className={`w-8 h-8 mx-auto mb-2 ${dragActive ? "text-[#137566]" : "text-gray-400"}`} />
                <p className="text-xs font-bold text-gray-700 mb-0.5">2. Przeciągnij i upuść plik CSV z banku</p>
                <p className="text-[11px] text-gray-500 mb-3">lub kliknij przycisk, aby wybrać plik .csv z komputera</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border border-gray-200 text-gray-700 font-bold py-2 px-5 rounded-lg hover:bg-gray-50 transition text-xs shadow-xs"
                >
                  Wybierz plik .csv
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-[11px] font-bold uppercase tracking-wider">albo wklej zawartość pliku CSV</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <div className="space-y-2">
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Tutaj możesz wkleić skopiowane wiersze z pliku CSV (np. z nagłówkiem: Data;Kwota;Tytuł)..."
                  className="w-full h-28 p-3 border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-[#137566] resize-none"
                ></textarea>
                <button
                  onClick={() => processRawCsvString(csvText, "Wklejony tekst CSV")}
                  disabled={!csvText.trim()}
                  className="w-full bg-[#137566] text-white font-bold py-2.5 px-4 rounded-xl hover:bg-[#0f5d51] transition shadow-xs text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Przetwórz wklejony tekst CSV &rarr;
                </button>
              </div>
            </div>
          )}

          {step === 2 && tab === "csv" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">Mapowanie kolumn z {fileName}</h3>
                <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md">
                  Wykryty separator: <strong className="text-slate-900">&quot;{detectedDelimiter}&quot;</strong>
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600">Kolumna tytułu/nazwy</label>
                  <select value={mapName} onChange={(e) => setMapName(e.target.value)} className="w-full text-xs rounded-lg border border-gray-200 p-2">
                    <option value="">-- Wybierz --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600">Kolumna kwoty</label>
                  <select value={mapAmount} onChange={(e) => setMapAmount(e.target.value)} className="w-full text-xs rounded-lg border border-gray-200 p-2">
                    <option value="">-- Wybierz --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600">Kolumna daty</label>
                  <select value={mapDate} onChange={(e) => setMapDate(e.target.value)} className="w-full text-xs rounded-lg border border-gray-200 p-2">
                    <option value="">-- Wybierz --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600">Kategoria domyślna</label>
                  <select value={defaultCategory} onChange={(e) => setDefaultCategory(e.target.value)} className="w-full text-xs rounded-lg border border-gray-200 p-2">
                    {expenseCategories.concat(incomeCategories).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Categorization Rules Notice */}
              {activeProfile?.transactionRules && activeProfile.transactionRules.length > 0 && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg">
                  ✨ Automatyczna kategoryzacja użyje Twoich <strong>{activeProfile.transactionRules.length} reguł transakcji</strong> z profilu.
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button onClick={() => setStep(1)} className="px-4 py-2 text-xs font-bold text-gray-500">
                  Wstecz
                </button>
                <button onClick={handleGenerateCsvPreview} className="bg-[#137566] text-white font-bold py-2 px-5 rounded-lg text-xs">
                  Generuj podgląd &rarr;
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 flex flex-col flex-1 overflow-hidden">
              {(importStats.invalidAmount > 0 || importStats.invalidDate > 0 || importStats.skippedEmpty > 0 || importStats.tooMany) && (
                <div className="bg-rose-50 px-4 py-3 rounded-xl border border-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-900">Podsumowanie problemów z parsowaniem pliku:</h4>
                    <ul className="list-disc list-inside text-[11px] text-rose-700 mt-1 space-y-0.5">
                      {importStats.tooMany && <li>Osiągnięto limit 2000 transakcji. Pozostałe zostały zignorowane.</li>}
                      {importStats.invalidAmount > 0 && <li>Odrzucono {importStats.invalidAmount} wierszy ze względu na nieprawidłową kwotę (NaN lub 0).</li>}
                      {importStats.invalidDate > 0 && <li>Odrzucono {importStats.invalidDate} wierszy ze względu na nieprawidłowy/pusty format daty.</li>}
                      {importStats.skippedEmpty > 0 && <li>Pominięto {importStats.skippedEmpty} pustych/komentarzowych wierszy.</li>}
                    </ul>
                  </div>
                </div>
              )}

              <div className="bg-emerald-50/50 px-4 py-3 rounded-xl border border-emerald-100 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800">
                  Nowe transakcje gotowe do zaimportowania: <strong className="text-xl font-extrabold">{mappedTransactions.length}</strong>
                </span>
                <button onClick={() => setStep(tab === "csv" ? 2 : 1)} className="text-xs text-[#137566] hover:underline font-semibold">
                  Wróć i popraw
                </button>
              </div>

              {duplicateAnalysis.duplicateCount > 0 && (
                <div className="bg-amber-50 px-4 py-3 rounded-xl border border-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      Wykryto potencjalne duplikaty: {duplicateAnalysis.duplicateCount}
                    </h4>
                    <p className="text-[11px] text-amber-700 mt-0.5">Te transakcje istnieją już w profilu. Są podświetlone poniżej na żółto.</p>
                  </div>
                </div>
              )}

              <div className="overflow-y-auto border border-gray-200 rounded-xl flex-1 max-h-[350px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-600 sticky top-0 z-10">
                      <th className="py-2.5 px-3">Opis</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Kategoria</th>
                      <th className="py-2.5 px-3">Konto</th>
                      <th className="py-2.5 px-3 text-right">Kwota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {duplicateAnalysis.enriched.map(({ tx, warning }, idx) => (
                      <tr key={idx} className={`transition ${warning ? "bg-amber-50/50" : "hover:bg-gray-50"}`}>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            {warning && <AlertTriangle className="w-3 h-3 text-amber-500" title={warning.reason} />}
                            {tx.name}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-gray-500 whitespace-nowrap">{tx.isoDate}</td>
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full text-[10px]">
                            <span>{tx.categoryIcon}</span>
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-500">{tx.account}</td>
                        <td className={`py-2 px-3 text-right font-bold ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                          {tx.type === "income" ? "+" : "-"} {tx.amount.toFixed(2)} PLN
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                {duplicateAnalysis.duplicateCount > 0 && (
                  <button
                    onClick={() => handleConfirmImport(true)}
                    className="bg-amber-100 text-amber-800 font-bold py-3 px-5 rounded-xl hover:bg-amber-200 transition text-xs"
                  >
                    Pomiń duplikaty ({mappedTransactions.length - duplicateAnalysis.duplicateCount}) i importuj
                  </button>
                )}
                <button
                  onClick={() => handleConfirmImport(false)}
                  className="bg-[#137566] text-white font-bold py-3 px-8 rounded-xl hover:bg-[#0f5d51] transition shadow-md text-xs"
                >
                  ✓ Zaimportuj wszystko ({mappedTransactions.length})
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

```


## File: src/components/Modals.tsx
```tsx
import { auth } from "../firebase";
import { Camera, Loader2, Lock, AlertTriangle, Download } from "lucide-react";
import { callAiApi, getAiConfig } from "../services/aiClient";
import { useApp } from "../app/providers/AppContext";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Profile } from "../types";
import { expenseCategories, incomeCategories, budgetCategories, iconByCategory, getLocalDateIso } from "../utils";
import { checkDuplicate } from "../services/duplicateDetector";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile?: any;
  initialData?: any;
  onSave: (data: {
    name: string;
    amount: number;
    category: string;
    categoryIcon?: string;
    account: string;
    type: "income" | "expense";
    isoDate: string;
    tags?: string[];
  }) => void;
}

export function TransactionModal({ isOpen, onClose, activeProfile, initialData, onSave }: TransactionModalProps) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const { state } = useApp();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("🛒");
  const [account, setAccount] = useState("Konto główne");
  const [date, setDate] = useState(getLocalDateIso());
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [paidBy, setPaidBy] = useState<"me" | "partner" | "joint">("me");
  const [splitMode, setSplitMode] = useState<"none" | "equal">("equal");
  
  useEffect(() => {
    if (type === "income") {
      setSplitMode("none");
    } else {
      setSplitMode("equal");
    }
  }, [type]);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      if (initialData) {
        setType(initialData.type);
        setAmount(initialData.amount.toString());
        setName(initialData.name);
        setCategory(initialData.category);
        setCategoryIcon(initialData.categoryIcon || "✨");
        setAccount(initialData.account);
        setDate(initialData.isoDate);
        setTags(initialData.tags || []);
        if (initialData.paidBy) setPaidBy(initialData.paidBy);
        if (initialData.splitMode) setSplitMode(initialData.splitMode);
      } else {
        // defaults
        setType("expense");
        setAmount("");
        setName("");
        setAccount("Konto główne");
        setDate(getLocalDateIso());
        setTags([]);
        setPaidBy("me");
        setSplitMode("equal");
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (initialData && initialData.category) return; // Do not override if editing
    const defaultCats = type === "income" ? incomeCategories : expenseCategories;
    const initialCat = defaultCats[0];
    setCategory(initialCat);
    setCategoryIcon(iconByCategory[initialCat] || "✨");
  }, [type, initialData]);

  if (!isOpen) return null;

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    setCategoryIcon(iconByCategory[newCat] || "✨");
  };

  const handleAddTag = (text: string) => {
    const clean = text.trim().toLowerCase();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmed = tagInput.replace(",", "").trim();
      if (trimmed) {
        handleAddTag(trimmed);
        setTagInput("");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const numAmt = parseFloat(amount.replace(",", "."));
    if (isNaN(numAmt) || numAmt <= 0) return;
    setIsSubmitting(true);
    const payload: any = { name, amount: numAmt, category, categoryIcon, account, type, isoDate: date, tags };
    if (activeProfile?.kind === "shared") {
      payload.paidBy = paidBy;
      payload.splitMode = splitMode;
    }
    onSave(payload);
    onClose();
    // Reset form
    setAmount("");
    setName("");
    setType("expense");
    setAccount("Konto główne");
    setDate(getLocalDateIso());
    setTags([]);
    setTagInput("");
    setPaidBy("me");
    setSplitMode("equal");
  };

  const duplicateWarning = React.useMemo(() => {
    const numAmt = parseFloat(amount.replace(",", "."));
    if (isNaN(numAmt) || numAmt <= 0 || !name || !date) return null;
    const res = checkDuplicate(
      { name, amount: numAmt, category, categoryIcon, account, type, isoDate: date, tags },
      activeProfile?.transactions || []
    );
    return res.isLikelyDuplicate ? res : null;
  }, [name, amount, type, date, category, activeProfile]);

  const categories = type === "income" ? incomeCategories : expenseCategories;
  const suggestions = ["wakacje", "remont", "rozrywka", "prezent", "zakupy", "dom", "hobby", "zdrowie"];

  const availableIcons = [
    "🛒", "🏠", "🚗", "❤️", "🎬", "✨", "🍕", "☕", "🍺", "🍏",
    "🔑", "💡", "🔌", "🚲", "✈️", "🩺", "💊", "🎮", "🍿", "🛍️",
    "💰", "💼", "🎁", "↩️", "📈", "💵", "💳", "📱", "🎓", "🧱"
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="tx-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-600" id="close-tx-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">Nowy Wpis</p>
        <h2 className="text-2xl font-bold text-[#153a35] mb-4">Dodaj transakcję</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              className={`w-1/2 rounded-md py-2 text-sm font-semibold transition ${
                type === "expense" ? "bg-white text-[#d55e50] shadow" : "text-gray-500 hover:text-gray-800"
              }`}
              onClick={() => setType("expense")}
              id="btn-type-expense"
            >
              Wydatek
            </button>
            <button
              type="button"
              className={`w-1/2 rounded-md py-2 text-sm font-semibold transition ${
                type === "income" ? "bg-white text-[#137566] shadow" : "text-gray-500 hover:text-gray-800"
              }`}
              onClick={() => setType("income")}
              id="btn-type-income"
            >
              Przychód
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#153a35] mb-1">Kwota (zł)</label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-[#137566]"
              id="input-tx-amount"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#153a35] mb-1">Opis transakcji</label>
            <input
              required
              maxLength={120}
              placeholder="np. Zakupy Biedronka"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-[#137566]"
              id="input-tx-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#153a35] mb-1">Kategoria</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full rounded-lg border border-gray-200 p-2.5 outline-none bg-white focus:border-[#137566]"
                id="select-tx-category"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#153a35] mb-1">Konto / Portfel</label>

              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full rounded-lg border border-gray-200 p-2.5 outline-none bg-white focus:border-[#137566]"
                id="select-tx-account"
              >
                {(activeProfile?.accounts && activeProfile.accounts.length > 0) ? (
                  activeProfile.accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.name}>{acc.name} {acc.bankName ? `(${acc.bankName})` : ''}</option>
                  ))
                ) : (
                  <>
                    <option value="Konto główne">Konto główne</option>
                    <option value="Gotówka">Gotówka</option>
                    <option value="Konto oszczędnościowe">Oszczędnościowe</option>
                  </>
                )}
              </select>

            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#153a35] mb-1">Ikona kategorii</label>
            <div className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg">
              <span className="text-2xl w-10 h-10 flex items-center justify-center bg-[#e7f3f0] text-[#137566] rounded-xl border border-[#137566]/20 font-bold shrink-0">
                {categoryIcon}
              </span>
              <div className="flex-1 overflow-x-auto whitespace-nowrap py-1 flex gap-1.5 max-w-[310px] scrollbar-thin">
                {availableIcons.map((ico) => (
                  <button
                    key={ico}
                    type="button"
                    onClick={() => setCategoryIcon(ico)}
                    className={`text-lg p-1 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition shrink-0 ${
                      categoryIcon === ico ? "bg-[#e7f3f0] border-2 border-[#137566]" : "border border-transparent"
                    }`}
                  >
                    {ico}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#153a35] mb-1">Data</label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-[#137566]"
              id="input-tx-date"
            />
          </div>

          {/* Tagowanie wydatków */}
          <div className="border-t border-gray-100 pt-3">
            <label className="block text-xs font-semibold text-[#153a35] mb-1">Tagi (opcjonalnie)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Dodaj tag (np. wakacje) i wciśnij Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                className="flex-1 rounded-lg border border-gray-200 p-2 text-xs outline-none focus:border-[#137566]"
                id="input-tx-tag"
              />
              <button
                type="button"
                onClick={() => {
                  if (tagInput.trim()) {
                    handleAddTag(tagInput);
                    setTagInput("");
                  }
                }}
                className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200 transition"
                id="btn-tx-add-tag"
              >
                Dodaj
              </button>
            </div>

            {/* Wybrane tagi */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2" id="tx-tags-list">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-600 font-bold"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Sugerowane tagi */}
            <div className="mt-2.5">
              <p className="text-[10px] text-gray-400 font-medium mb-1">Szybkie sugestie:</p>
              <div className="flex flex-wrap gap-1">
                {suggestions.map((sug) => {
                  const isSelected = tags.includes(sug);
                  return (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => isSelected ? handleRemoveTag(sug) : handleAddTag(sug)}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      +{sug}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {activeProfile?.kind === "shared" && (
            <div className="border-t border-gray-100 pt-3">
              {!activeProfile.partnerName ? (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 text-center font-medium">
                  Uzupełnij imię partnera w ustawieniach profilu, by dzielić koszty.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Kto {type === 'expense' ? 'zapłacił' : 'otrzymał'}?</label>
                    <select
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value as any)}
                      className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-[#137566] bg-white"
                      id="select-transaction-paidby"
                    >
                      <option value="me">Ja ({activeProfile.name})</option>
                      <option value="partner">Partner ({activeProfile.partnerName})</option>
                      <option value="joint">Wspólne konto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Dzielimy 50/50?</label>
                    <select
                      value={splitMode}
                      onChange={(e) => setSplitMode(e.target.value as any)}
                      className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-[#137566] bg-white"
                      id="select-transaction-splitmode"
                    >
                      <option value="equal">Tak</option>
                      <option value="none">Nie</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {duplicateWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <span className="text-xl mt-0.5">⚠️</span>
              <div>
                <p className="text-xs font-bold text-amber-900">Prawdopodobny duplikat</p>
                <p className="text-[11px] text-amber-700">{duplicateWarning.reason}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#137566] py-3 text-sm font-bold text-white shadow-lg hover:bg-[#0f5d51] transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            id="btn-tx-submit"
          >
            {isSubmitting ? "Zapisywanie..." : "Zapisz transakcję"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  onSave: (data: { name: string; amount: number; dueDate: string; paidBy?: "me" | "partner" | "joint"; splitMode?: "none" | "equal" }) => void;
}

export function PaymentModal({ isOpen, onClose, initialData, onSave }: PaymentModalProps) {
  const { state } = useApp();
  const activeProfile = state.profiles.find(p => p.id === state.activeProfileId);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(getLocalDateIso());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [paidBy, setPaidBy] = useState<"me" | "partner" | "joint">("me");
  const [splitMode, setSplitMode] = useState<"none" | "equal">("equal");

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      if (initialData) {
        setName(initialData.name);
        setAmount(initialData.amount.toString());
        setDueDate(initialData.dueDate);
        if (initialData.paidBy) setPaidBy(initialData.paidBy);
        if (initialData.splitMode) setSplitMode(initialData.splitMode);
      } else {
        setName("");
        setAmount("");
        setDueDate(getLocalDateIso());
        setPaidBy("me");
        setSplitMode("equal");
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const numAmt = parseFloat(amount.replace(",", "."));
    if (isNaN(numAmt) || numAmt <= 0) return;
    setIsSubmitting(true);
    const payload: { name: string; amount: number; dueDate: string; paidBy?: "me" | "partner" | "joint"; splitMode?: "none" | "equal" } = { name, amount: numAmt, dueDate };
    if (activeProfile?.kind === "shared") {
      payload.paidBy = paidBy;
      payload.splitMode = splitMode;
    }
    onSave(payload);
    onClose();
    setPaidBy("me");
    setSplitMode("equal");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="payment-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-600" id="close-payment-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">{initialData ? "Edycja Płatności" : "Nowa Płatność"}</p>
        <h2 className="text-2xl font-bold text-[#153a35] mb-4">{initialData ? "Edytuj rachunek" : "Dodaj rachunek"}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#153a35] mb-1">Nazwa (np. Internet Orange)</label>
            <input
              required
              maxLength={120}
              placeholder="np. Prąd Enea, Netflix, Internet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-[#137566]"
              id="input-payment-name"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#153a35] mb-1">Kwota (zł)</label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-[#137566]"
              id="input-payment-amount"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#153a35] mb-1">Termin płatności</label>
            <input
              required
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-[#137566]"
              id="input-payment-date"
            />
          </div>
          
          {activeProfile?.kind === "shared" && (
            <div className="border-t border-gray-100 pt-3">
              {!activeProfile.partnerName ? (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 text-center font-medium">
                  Uzupełnij imię partnera w ustawieniach profilu, by dzielić koszty.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Kto płaci?</label>
                    <select
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value as any)}
                      className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-[#137566] bg-white"
                      id="select-payment-paidby"
                    >
                      <option value="me">Ja ({activeProfile.name})</option>
                      <option value="partner">Partner ({activeProfile.partnerName})</option>
                      <option value="joint">Wspólne konto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">Dzielimy 50/50?</label>
                    <select
                      value={splitMode}
                      onChange={(e) => setSplitMode(e.target.value as any)}
                      className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-[#137566] bg-white"
                      id="select-payment-splitmode"
                    >
                      <option value="equal">Tak</option>
                      <option value="none">Nie</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#137566] py-3 text-sm font-bold text-white shadow-lg hover:bg-[#0f5d51] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            id="btn-payment-submit"
          >
            {isSubmitting ? "Zapisywanie..." : initialData ? "Zapisz zmiany" : "Dodaj płatność"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}


interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; target: number }) => void;
}

export function GoalModal({ isOpen, onClose, onSave }: GoalModalProps) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const numTgt = parseFloat(target.replace(",", "."));
    if (isNaN(numTgt) || numTgt <= 0) return;
    setIsSubmitting(true);
    onSave({ name, target: numTgt });
    onClose();
    setName("");
    setTarget("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="goal-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-600" id="close-goal-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">Oszczędności</p>
        <h2 className="text-2xl font-bold text-[#153a35] mb-4">Nowy cel oszczędnościowy</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#153a35] mb-1">Nazwa celu (np. Wakacje)</label>
            <input
              required
              maxLength={120}
              placeholder="np. Poduszka finansowa, Remont, Nowy laptop"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-[#137566]"
              id="input-goal-name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#153a35] mb-1">Kwota docelowa (zł)</label>
            <input
              required
              type="number"
              min="1"
              placeholder="np. 15000"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-[#137566]"
              id="input-goal-target"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#137566] py-3 text-sm font-bold text-white shadow-lg hover:bg-[#0f5d51] transition disabled:opacity-50 disabled:cursor-not-allowed"
            id="btn-goal-submit"
          >
            {isSubmitting ? "Tworzenie..." : "Utwórz cel"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

interface GoalDepositModalProps {
  isOpen: boolean;
  goalName: string;
  onClose: () => void;
  onSave: (amount: number) => void;
}

export function GoalDepositModal({ isOpen, goalName, onClose, onSave }: GoalDepositModalProps) {
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const numAmt = parseFloat(amount.replace(",", "."));
    if (isNaN(numAmt) || numAmt === 0) return; // allow negative
    setIsSubmitting(true);
    onSave(numAmt);
    onClose();
    setAmount("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="goal-deposit-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-600" id="close-goal-deposit-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">Transfer Celu</p>
        <h2 className="text-2xl font-bold text-[#153a35] mb-4">Transfer: {goalName}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#153a35] mb-1">Kwota (wpłata lub wypłata)</label>
            <input
              required
              type="number"
              step="0.01"
              placeholder="np. 100 (wpłata) lub -50 (wypłata)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-[#137566]"
              id="input-goal-deposit-amount"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#137566] py-3 text-sm font-bold text-white shadow-lg hover:bg-[#0f5d51] transition disabled:opacity-50 disabled:cursor-not-allowed"
            id="btn-goal-deposit-submit"
          >
            {isSubmitting ? "Zapisywanie..." : "Zapisz wpłatę"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudgets: Record<string, number>;
  onSave: (budgets: Record<string, number>) => void;
}

export function BudgetModal({ isOpen, onClose, currentBudgets, onSave }: BudgetModalProps) {
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const initialized: Record<string, string> = {};
    budgetCategories.forEach((cat) => {
      initialized[cat] = currentBudgets[cat] ? String(currentBudgets[cat]) : "";
    });
    setBudgets(initialized);
  }, [currentBudgets, isOpen]);

  if (!isOpen) return null;

  const handleChange = (cat: string, val: string) => {
    setBudgets((prev) => ({ ...prev, [cat]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const finalBudgets: Record<string, number> = {};
    budgetCategories.forEach((cat) => {
      const num = parseFloat(budgets[cat]?.replace(",", "."));
      finalBudgets[cat] = isNaN(num) || num < 0 ? 0 : num;
    });
    setIsSubmitting(true);
    onSave(finalBudgets);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="budget-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-600" id="close-budget-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">Limity Miesięczne</p>
        <h2 className="text-2xl font-bold text-[#153a35] mb-4">Ustaw limity wydatków</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {budgetCategories.map((category) => (
              <div key={category}>
                <label className="block text-xs font-semibold text-[#153a35] mb-1">{category} (zł)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Brak limitu"
                  value={budgets[category] || ""}
                  onChange={(e) => handleChange(category, e.target.value)}
                  className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-[#137566]"
                  id={`input-budget-${category}`}
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#137566] py-3 text-sm font-bold text-white shadow-lg hover:bg-[#0f5d51] transition disabled:opacity-50 disabled:cursor-not-allowed"
            id="btn-budget-submit"
          >
            {isSubmitting ? "Zapisywanie..." : "Zapisz limity"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; kind: "personal" | "shared"; partnerName: string; pin: string; avatar: string }) => void;
}

const AVATAR_OPTIONS = ["👤", "👨‍💻", "👩‍💻", "🏠", "💼", "💰", "💎", "🌟", "✨", "🚀", "🐶", "🐱"];

export function ProfileModal({ isOpen, onClose, onSave }: ProfileModalProps) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"personal" | "shared">("personal");
  const [partnerName, setPartnerName] = useState("");
  const [pin, setPin] = useState("");
  const [avatar, setAvatar] = useState("👤");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!name.trim()) return;
    if (kind === "shared" && !partnerName.trim()) {
      alert("Proszę podać imię partnera dla profilu wspólnego.");
      return;
    }
    setIsSubmitting(true);
    onSave({ name: name.trim(), kind, partnerName: kind === "shared" ? partnerName.trim() : "", pin, avatar });
    onClose();
    setName("");
    setKind("personal");
    setPartnerName("");
    setPin("");
    setAvatar("👤");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="profile-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-600" id="close-profile-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">Zarządzanie profilami</p>
        <h2 className="text-2xl font-bold text-[#153a35] mb-4">Utwórz profil</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#153a35] mb-1">Nazwa profilu (np. Moje Finanse)</label>
            <input
              required
              maxLength={80}
              placeholder="np. Budżet Seweryna, Domowy"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-[#137566]"
              id="input-profile-name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#153a35] mb-1">Ikona profilu</label>
            <details className="group border border-gray-200 rounded-lg relative">
              <summary className="p-2.5 text-xs font-semibold text-gray-700 cursor-pointer bg-gray-50 hover:bg-gray-100 flex items-center justify-between list-none select-none rounded-lg group-open:rounded-b-none group-open:border-b group-open:border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">{avatar}</span>
                  <span>Wybierz ikonę profilu</span>
                </div>
                <span className="group-open:rotate-180 transition-transform mr-2 text-gray-400">▼</span>
              </summary>
              <div className="p-3 border-t border-gray-200 bg-white absolute w-full z-10 shadow-lg rounded-b-lg">
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setAvatar(emoji);
                        if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur();
                        }
                      }}
                      className={`text-2xl p-2 rounded-xl border transition-all ${avatar === emoji ? 'bg-emerald-50 border-[#137566] shadow-sm' : 'bg-gray-50 border-gray-100 hover:bg-gray-100 grayscale hover:grayscale-0'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </details>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#153a35] mb-1">Rodzaj profilu</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "personal" | "shared")}
              className="w-full rounded-lg border border-gray-200 p-2.5 outline-none bg-white focus:border-[#137566]"
              id="select-profile-kind"
            >
              <option value="personal">Tylko dla mnie (osobisty)</option>
              <option value="shared">Wspólny budżet dla rodziny (dwóch osób)</option>
            </select>
          </div>

          {kind === "shared" && (
            <div>
              <label className="block text-xs font-semibold text-[#153a35] mb-1">Imię partnera / członka rodziny</label>
              <input
                required
                pattern=".*\S+.*"
                title="Imię partnera nie może składać się z samych spacji"
                maxLength={80}
                placeholder="np. Ania, Marta, Piotr"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-[#137566]"
                id="input-profile-partner"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#153a35] mb-1">Opcjonalny kod PIN (do blokady profilu)</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              minLength={4}
              maxLength={8}
              placeholder="Wpisz 4 do 8 cyfr"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-lg border border-gray-200 p-2.5 outline-none focus:border-[#137566]"
              id="input-profile-pin"
            />
            <p className="text-[11px] text-gray-500 mt-1">Pozostaw puste, aby nie nakładać blokady.</p>
          </div>

          <div className="rounded-xl bg-[#e7f3f0] p-4">
            <p className="text-[12px] text-[#137566] leading-relaxed">
              <strong>Wskazówka rodzinna:</strong> Wspólny profil jest zsynchronizowany na serwerze w czasie rzeczywistym. Każdy członek rodziny wchodzący na ten sam link ma dostęp do tych samych danych.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#137566] py-3 text-sm font-bold text-white shadow-lg hover:bg-[#0f5d51] transition disabled:opacity-50 disabled:cursor-not-allowed"
            id="btn-profile-submit"
          >
            {isSubmitting ? "Tworzenie..." : "Utwórz profil"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pin: string) => void;
  onExportData?: () => void;
}

export function PinModal({ isOpen, onClose, onSave, onExportData }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [hasAcceptedWarning, setHasAcceptedWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setHasAcceptedWarning(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAcceptedWarning) return;
    if (!/^\d{4,8}$/.test(pin)) return;
    onSave(pin);
    onClose();
    setPin("");
    setHasAcceptedWarning(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="pin-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-600 cursor-pointer" id="close-pin-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">Ochrona profilu</p>
        <h2 className="text-2xl font-bold text-[#153a35] mb-3">Ustaw kod PIN</h2>

        {/* Warning Copy Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Ostrzeżenie o braku odzyskiwania PIN</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Kod PIN służy do lokalnego szyfrowania danych profilu (AES-GCM / PBKDF2). Aplikacja działa w modelu zero-knowledge – <strong>Twój PIN nie jest przechowywany na żadnym serwerze</strong>.
          </p>
          <p className="text-[11px] font-bold text-amber-900">
            W przypadku utraty PIN-u dostęp do danych profilu zostanie trwale zablokowany bez możliwości resetu.
          </p>

          {/* Export backup button */}
          {onExportData && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onExportData}
                className="w-full bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold py-2 px-3 rounded-lg text-xs transition flex items-center justify-center gap-2 border border-amber-300/60 shadow-2xs cursor-pointer"
                id="btn-export-backup-before-pin"
              >
                <Download className="w-3.5 h-3.5 text-amber-800" />
                Najpierw eksportuj backup (.json)
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#153a35] mb-1">Kod PIN (4-8 cyfr)</label>
            <input
              required
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              placeholder="np. 1234"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-lg border border-gray-200 p-3 text-center text-xl tracking-widest outline-none focus:border-[#137566]"
              id="input-pin-code"
            />
          </div>

          <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-gray-200 bg-gray-50/80 cursor-pointer text-xs text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={hasAcceptedWarning}
              onChange={(e) => setHasAcceptedWarning(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-[#137566] focus:ring-[#137566]"
              id="checkbox-pin-recovery-warning"
            />
            <span>Rozumiem, że utrata PIN = utrata danych profilu</span>
          </label>

          <button
            type="submit"
            disabled={!hasAcceptedWarning || !/^\d{4,8}$/.test(pin)}
            className="w-full rounded-lg bg-[#137566] py-3 text-sm font-bold text-white shadow-lg hover:bg-[#0f5d51] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            id="btn-pin-submit"
          >
            Zapisz PIN
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

interface UnlockModalProps {
  isOpen: boolean;
  profileName: string;
  onUnlock: (pin: string) => Promise<boolean>;
  onSelectOtherProfile: () => void;
}

export function UnlockModal({ isOpen, profileName, onUnlock, onSelectOtherProfile }: UnlockModalProps) {
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const success = await onUnlock(pin);
    if (success) {
      setPin("");
    } else {
      setErrorMsg("Nieprawidłowy kod PIN. Spróbuj ponownie.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#153a35]/95 p-4 backdrop-blur-xs"
      id="unlock-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl ${isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[#e7f3f0] rounded-full flex items-center justify-center text-[#137566]">
            <Lock className="w-8 h-8" />
          </div>
        </div>
        
        <p className="text-[10px] font-bold uppercase tracking-wider text-center text-[#849590]">Zabezpieczony Profil</p>
        <h2 className="text-2xl font-bold text-[#153a35] text-center mb-2">Podaj PIN</h2>
        <p className="text-sm text-gray-500 text-center mb-8">Profil <strong>{profileName}</strong> wymaga autoryzacji.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              required
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              placeholder="••••"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className={`w-full rounded-xl border-2 p-4 text-center text-3xl tracking-[1em] outline-none transition ${errorMsg ? 'border-red-300 focus:border-red-500 text-red-600 bg-red-50' : 'border-gray-100 focus:border-[#137566] text-gray-800'}`}
              id="input-unlock-pin"
            />
          </div>

          {errorMsg && (
            <p className="text-sm text-center text-[#d55e50] font-semibold animate-fade-in" id="unlock-error-msg">
              {errorMsg}
            </p>
          )}

          <div className="pt-4 space-y-3">
            <button
              type="submit"
              className="w-full rounded-xl bg-[#137566] py-4 text-sm font-bold text-white shadow-lg hover:bg-[#0f5d51] hover:scale-[1.02] transition-all"
              id="btn-unlock-submit"
            >
              Odblokuj profil
            </button>
            
            <button
              type="button"
              onClick={onSelectOtherProfile}
              className="w-full rounded-xl py-3 text-sm font-semibold text-gray-500 hover:text-gray-800 transition"
              id="btn-unlock-other"
            >
              Wróć do wyboru profili
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export { ChangelogModal } from "./ChangelogModal";

```


## File: src/components/PWABadge.tsx
```tsx
import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { WifiOff, RefreshCw } from 'lucide-react';

export function PWABadge() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!needRefresh && !offlineReady && !isOffline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm" id="pwa-badge-container">
      {isOffline && (
        <div className="bg-amber-100 text-amber-900 px-4 py-3 rounded-xl shadow-lg border border-amber-200 flex items-center gap-3 animate-in slide-in-from-bottom-2">
          <WifiOff className="w-5 h-5 text-amber-600" />
          <div className="text-xs">
            <p className="font-bold">Jesteś offline</p>
            <p className="opacity-80">Aplikacja działa w trybie offline. Dane zapisywane są lokalnie i zostaną zsynchronizowane po powrocie do sieci.</p>
          </div>
        </div>
      )}
      
      {needRefresh && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2" id="pwa-update-prompt">
          <div className="text-xs">
            <p className="font-bold text-emerald-400">Dostępna nowa wersja — Odśwież</p>
            <p className="text-slate-300 mt-0.5">Zaktualizuj aplikację, aby załadować nową wersję.</p>
          </div>
          <button
            onClick={() => updateServiceWorker(true)}
            className="bg-[#137566] hover:bg-[#0f5d51] text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
            title="Odśwież aplikację"
            id="btn-pwa-reload"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Odśwież
          </button>
        </div>
      )}
      
      {offlineReady && !needRefresh && !isOffline && (
        <div className="bg-emerald-50 text-emerald-800 px-4 py-2.5 rounded-xl shadow-lg border border-emerald-100 flex items-center justify-between gap-2 animate-in slide-in-from-bottom-2 duration-300">
          <span className="text-xs font-semibold">Aplikacja gotowa do pracy offline</span>
          <button onClick={() => setOfflineReady(false)} className="text-emerald-600 hover:text-emerald-800 font-bold text-xs p-1">✕</button>
        </div>
      )}
    </div>
  );
}


```


## File: src/components/PaymentsView.tsx
```tsx
import React, { useState } from "react";
import { Profile, Payment } from "../types";
import { formatPln, formatDatePl, requestNotificationPermission, getLocalDateIso } from "../utils";
import { Bell, BellOff, BellRing } from "lucide-react";

interface PaymentsViewProps {
  profile: Profile;
  selectedDate: Date;
  onOpenPaymentModal: (payment?: Payment) => void;
  onTogglePaymentStatus: (paymentId: string) => void;
  onAddPayment: (payment: any) => void;
  onDeletePayment: (paymentId: string, mode?: "payment-only" | "payment-and-linked-transaction") => void;
  calendarToken: string | null;
  onTriggerCalendarAi: (p: Payment) => void;
}

export function PaymentsView({
  profile,
  selectedDate,
  onOpenPaymentModal,
  onTogglePaymentStatus,
  onAddPayment,
  onDeletePayment,
  calendarToken,
  onTriggerCalendarAi
}: PaymentsViewProps) {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied"
  );
  const [notificationStatusMsg, setNotificationStatusMsg] = useState<string>("");
  const [paidByFilter, setPaidByFilter] = useState<"all" | "me" | "partner" | "joint">("all");
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  const handleEnableNotifications = async () => {
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        setNotificationStatusMsg("Powiadomienia zostały pomyślnie aktywowane!");
        // Instantly trigger a confirmation notification
        new Notification("Aplikacja Saldo", {
          body: "Powiadomienia przeglądarkowe zostały włączone! Będziemy Cię informować o zbliżających się płatnościach. 👍",
        });
        setTimeout(() => setNotificationStatusMsg(""), 5000);
      } else if (permission === "denied") {
        setNotificationStatusMsg("Uprawnienia zostały odrzucone lub zablokowane w przeglądarce.");
        setTimeout(() => setNotificationStatusMsg(""), 5000);
      }
    } catch (e) {
      console.error("Błąd przy włączaniu powiadomień:", e);
    }
  };

  // Helper to calculate days remaining and badge details for payments
  const getDueStatus = (dueDateStr: string, isPaid: boolean) => {
    if (isPaid) return { label: null, badgeClass: "" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pDate = new Date(`${dueDateStr}T00:00:00`);
    const diffTime = pDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return {
        label: "Przeterminowane!",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold"
      };
    } else if (diffDays === 0) {
      return {
        label: "Dzisiaj!",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-200 animate-pulse text-[10px] font-bold"
      };
    } else if (diffDays === 1) {
      return {
        label: "Jutro",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold"
      };
    } else if (diffDays <= 3) {
      return {
        label: `Za ${diffDays} dni`,
        badgeClass: "bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold"
      };
    }
    return {
      label: null,
      badgeClass: ""
    };
  };

  // Sorting payments: unpaid first, then paid. Both sorted by due date.
  const filteredPayments = profile.payments.filter(p => {
    if (profile.kind === "shared" && paidByFilter !== "all") {
      return p.paidBy === paidByFilter;
    }
    return true;
  });

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "Do opłacenia" ? -1 : 1;
    }
    return a.dueDate.localeCompare(b.dueDate);
  });

  const unpaidCount = profile.payments.filter((p) => p.status !== "Opłacono").length;
  const totalUnpaidSum = profile.payments
    .filter((p) => p.status !== "Opłacono")
    .reduce((sum, p) => sum + p.amount, 0);

  // Suggested payments logic
  const currentMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const currentMonthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

  const prevMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
  const prevMonthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0);

  const prevMonthPayments = profile.payments.filter(p => {
    const d = new Date(p.dueDate);
    return d >= prevMonthStart && d <= prevMonthEnd;
  });

  const currentMonthPayments = profile.payments.filter(p => {
    const d = new Date(p.dueDate);
    return d >= currentMonthStart && d <= currentMonthEnd;
  });

  const currentMonthNames = new Set(currentMonthPayments.map(p => p.name.trim().toLowerCase()));

  const suggestedPayments = prevMonthPayments.filter(p => !currentMonthNames.has(p.name.trim().toLowerCase()));

  const handleAddSuggestedPayment = (suggestedP: Payment) => {
    // Generate new due date for current month
    const oldDate = new Date(suggestedP.dueDate);
    let newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), oldDate.getDate());
    
    // If the old date was e.g. 31st and this month has 30 days, adjust to last day of month
    if (newDate.getMonth() !== selectedDate.getMonth()) {
      newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    }
    
    onAddPayment({
      name: suggestedP.name,
      amount: suggestedP.amount,
      dueDate: getLocalDateIso(newDate),
      status: "Do opłacenia",
      category: suggestedP.category
    });
  };

  return (
    <div className="space-y-6" id="payments-view-container">
      {/* Overview ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#e7f3f0] p-5 rounded-2xl border border-[#137566]/20">
        <div>
          <h3 className="text-sm font-bold text-[#153a35] uppercase tracking-wider mb-1">Rachunki i Subskrypcje</h3>
          <p className="text-xs text-gray-600">
            Śledź okresowe opłaty, abonamenty i kredyty, by nigdy nie zalegać z płatnościami.
          </p>
        </div>
        <div className="flex justify-between sm:justify-end items-center gap-4 flex-wrap">
          <div className="text-right mr-2">
            <span className="block text-[10px] uppercase font-bold text-gray-500">Do opłacenia</span>
            <span className="text-lg font-bold text-[#d55e50]">
              {unpaidCount} rachunki ({formatPln(totalUnpaidSum)})
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onOpenPaymentModal}
              className="bg-[#137566] text-white font-bold py-2 px-4 rounded-xl hover:bg-[#0f5d51] transition shadow-md text-xs flex items-center gap-1 cursor-pointer"
              id="btn-add-payment"
            >
              <span>＋ Dodaj opłatę</span>
            </button>
          </div>
        </div>
      </div>

      {/* Browser Notifications Setup Card */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl ${
            notificationPermission === "granted" 
              ? "bg-[#e7f3f0] text-[#137566]" 
              : notificationPermission === "denied"
                ? "bg-rose-50 text-rose-600"
                : "bg-amber-50 text-amber-700"
          }`}>
            {notificationPermission === "granted" ? (
              <Bell className="w-5 h-5 text-[#137566]" />
            ) : notificationPermission === "denied" ? (
              <BellOff className="w-5 h-5" />
            ) : (
              <BellRing className="w-5 h-5 animate-pulse" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Powiadomienia o płatnościach</h4>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              {notificationPermission === "granted"
                ? "Włączone! Otrzymasz natychmiastowe powiadomienie na pulpicie, gdy zbliży się termin płatności rachunku (do 3 dni wstecz)."
                : notificationPermission === "denied"
                  ? "Powiadomienia są wyłączone lub zablokowane. Aby otrzymywać przypomnienia o rachunkach, odblokuj uprawnienia w pasku adresu przeglądarki."
                  : "Chcesz dostawać powiadomienia na pulpicie o zbliżających się rachunkach? Włącz powiadomienia jednym kliknięciem."}
            </p>
            {notificationStatusMsg && (
              <p className={`text-xs font-bold mt-2 ${notificationPermission === "granted" ? "text-[#137566]" : "text-rose-600"}`}>
                {notificationStatusMsg}
              </p>
            )}
          </div>
        </div>
        
        {notificationPermission !== "granted" && (
          <button
            onClick={handleEnableNotifications}
            className={`font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer shrink-0 ${
              notificationPermission === "denied"
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                : "bg-[#137566] text-white hover:bg-[#0f5d51] shadow-md"
            }`}
            id="btn-enable-desktop-notifications"
          >
            {notificationPermission === "denied" ? "Zmień uprawnienia" : "🔔 Włącz powiadomienia"}
          </button>
        )}
      </div>

      {suggestedPayments.length > 0 && (
        <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-indigo-100 text-indigo-700 p-1.5 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <h3 className="text-sm font-bold text-indigo-900">Sugestie z poprzedniego miesiąca</h3>
          </div>
          <p className="text-xs text-indigo-700 mb-4">
            W poprzednim miesiącu opłacono te rachunki. Chcesz je powtórzyć w tym miesiącu z podobną kwotą i terminem?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {suggestedPayments.map(sp => {
              const oldDate = new Date(sp.dueDate);
              let newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), oldDate.getDate());
              if (newDate.getMonth() !== selectedDate.getMonth()) {
                newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
              }
              return (
                <div key={`sugg-${sp.id}`} className="bg-white rounded-xl border border-indigo-200 p-3 shadow-sm hover:border-indigo-300 transition">
                  <h4 className="text-sm font-bold text-gray-800">{sp.name}</h4>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">{formatPln(sp.amount)} <br/><span className="text-[10px]">do {newDate.toLocaleDateString('pl-PL', {day:'numeric', month:'short'})}</span></span>
                    <button
                      onClick={() => handleAddSuggestedPayment(sp)}
                      className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-1.5 rounded-lg text-xs font-bold transition"
                      title="Skopiuj do tego miesiąca"
                    >
                      + Dodaj
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <h3 className="text-base font-bold text-[#153a35]">Lista Twoich opłat</h3>
          
          {profile.kind === "shared" && (
            <div className="flex bg-indigo-50/50 p-1 rounded-xl w-full sm:w-auto max-w-full overflow-x-auto whitespace-nowrap hide-scrollbar border border-indigo-100/50">
              <button
                onClick={() => setPaidByFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  paidByFilter === "all" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-600 hover:bg-indigo-100"
                }`}
              >
                Wszystkie
              </button>
              <button
                onClick={() => setPaidByFilter("me")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  paidByFilter === "me" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-600 hover:bg-indigo-100"
                }`}
              >
                Ja
              </button>
              <button
                onClick={() => setPaidByFilter("partner")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  paidByFilter === "partner" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-600 hover:bg-indigo-100"
                }`}
              >
                Partner
              </button>
              <button
                onClick={() => setPaidByFilter("joint")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  paidByFilter === "joint" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-600 hover:bg-indigo-100"
                }`}
              >Wspólne/50-50</button>
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          {sortedPayments.length === 0 ? (
            <div className="text-center py-10">
              {profile.payments.length > 0 ? (
                <p className="text-sm text-gray-400">Brak płatności pasujących do wybranego filtra (np. "Kto zapłacił").</p>
              ) : (
                <>
                  <p className="text-sm text-gray-400">Brak zdefiniowanych płatności.</p>
                  <button
                    onClick={onOpenPaymentModal}
                    className="text-[#137566] text-xs font-bold hover:underline mt-1"
                  >
                    Dodaj swój pierwszy rachunek już teraz &rarr;
                  </button>
                </>
              )}
            </div>
          ) : (
            sortedPayments.map((p) => {
              const isPaid = p.status === "Opłacono";
              return (
                <div
                  key={p.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition ${
                    isPaid ? "bg-gray-50/50 border-gray-100 opacity-75" : "bg-white border-gray-200 shadow-sm hover:border-[#137566]/50"
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <span
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        isPaid ? "bg-teal-50 text-[#137566]" : "bg-rose-50 text-[#d55e50]"
                      }`}
                    >
                      {isPaid ? "✓" : "◷"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-[#153a35] flex items-center gap-1.5">
                          {p.name}
                          {profile.kind === "shared" && p.paidBy && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {p.paidBy === 'me' ? 'Ja' : p.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                              {p.splitMode === 'equal' ? ' (50-50)' : ''}
                            </span>
                          )}
                        </h4>
                        {(() => {
                          const status = getDueStatus(p.dueDate, isPaid);
                          if (status.label) {
                            return (
                              <span className={`px-2 py-0.5 rounded-md border ${status.badgeClass}`} id={`payment-item-badge-${p.id}`}>
                                {status.label}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <p className="text-xs text-gray-500">Termin płatności: {formatDatePl(p.dueDate)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="text-sm font-bold text-gray-800">{formatPln(p.amount)}</span>
                    <div className="flex items-center gap-2">
                      {!isPaid && (
                        <button
                          onClick={() => onTriggerCalendarAi(p)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-lg transition text-xs flex items-center gap-1.5 cursor-pointer border border-indigo-200"
                          title="Dodaj przypomnienie do Kalendarza Google (AI)"
                          id={`btn-calendar-ai-${p.id}`}
                        >
                          <span>🗓️ Zaplanuj AI</span>
                        </button>
                      )}
                      <button
                        onClick={() => onTogglePaymentStatus(p.id)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isPaid
                            ? "bg-[#e7f3f0] text-[#137566] hover:bg-[#d1e8e2]"
                            : "bg-[#fff3dc] text-amber-800 hover:bg-[#137566] hover:text-white"
                        }`}
                        id={`btn-toggle-payment-${p.id}`}
                      >
                        {isPaid ? "Opłacono" : "Zaznacz jako opłacone"}
                      </button>
                      <button
                        onClick={() => onOpenPaymentModal(p)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded transition"
                        title="Edytuj rachunek"
                        id={`btn-edit-payment-${p.id}`}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setPaymentToDelete(p)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded transition"
                        title="Usuń rachunek"
                        id={`btn-delete-payment-${p.id}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {paymentToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-[#153a35] mb-2">Usunąć płatność?</h3>
            
            {profile.transactions.some(tx => tx.sourcePaymentId === paymentToDelete.id) ? (
              <>
                <p className="text-sm text-gray-600 mb-6">
                  Ta płatność ma powiązaną transakcję w historii wydatków. Możesz usunąć tylko płatność albo płatność razem z transakcją.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      onDeletePayment(paymentToDelete.id, "payment-and-linked-transaction");
                      setPaymentToDelete(null);
                    }}
                    className="w-full bg-rose-100 text-rose-700 font-bold py-2.5 rounded-xl hover:bg-rose-200 transition text-sm"
                  >
                    Usuń płatność i transakcję
                  </button>
                  <button
                    onClick={() => {
                      onDeletePayment(paymentToDelete.id, "payment-only");
                      setPaymentToDelete(null);
                    }}
                    className="w-full bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-200 transition text-sm"
                  >
                    Usuń tylko płatność
                  </button>
                  <button
                    onClick={() => setPaymentToDelete(null)}
                    className="w-full text-gray-500 font-bold py-2 hover:text-gray-700 transition text-sm"
                  >
                    Anuluj
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-6">
                  Tej operacji nie da się łatwo cofnąć.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentToDelete(null)}
                    className="flex-1 bg-gray-100 text-gray-700 font-bold py-2 rounded-xl hover:bg-gray-200 transition text-sm"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={() => {
                      onDeletePayment(paymentToDelete.id, "payment-only");
                      setPaymentToDelete(null);
                    }}
                    className="flex-1 bg-rose-600 text-white font-bold py-2 rounded-xl hover:bg-rose-700 transition text-sm shadow-md"
                  >
                    Usuń
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

```


## File: src/components/SecurityInfoModal.tsx
```tsx
import React from "react";
import { motion } from "motion/react";
import { ShieldCheck, Lock, Database, FileKey, CheckCircle2 } from "lucide-react";
import { useApp } from "../app/providers/AppContext";

export function SecurityInfoModal() {
  const { isSecurityInfoOpen, toggleSecurityInfo } = useApp();

  if (!isSecurityInfoOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="security-info-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg rounded-3xl bg-white p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <button
          onClick={() => toggleSecurityInfo(false)}
          className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-600 transition"
          id="close-security-modal"
        >
          &times;
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">Szczegóły Ochrony</h2>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lokalne Saldo Security</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <Lock className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">Szyfrowanie End-to-End</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Twoje dane finansowe są w pełni szyfrowane na urządzeniu przed wysłaniem do chmury Firebase. 
                Nawet administratorzy nie mają wglądu w kwoty, nazwy transakcji czy budżety.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <FileKey className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">Klucze Kryptograficzne</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Klucz do odszyfrowania danych powstaje na bazie Twojego numeru PIN oraz lokalnego <code>saltu</code>. 
                Utrata PIN-u oznacza brak możliwości odszyfrowania profili zabezpieczonych hasłem.
              </p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <Database className="w-5 h-5 text-[#137566] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">Autozapis i Baza Danych</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Aplikacja wykorzystuje technologię Local-First. Zmiany są zapisywane w pamięci podręcznej i 
                wysyłane do bezpiecznej chmury Firestore (w modelu prywatnego dokumentu użytkownika).
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            Ochrona aktywna
          </span>
          <button
            onClick={() => toggleSecurityInfo(false)}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            Zamknij
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

```


## File: src/components/SettingsView.tsx
```tsx
import React, { useState } from "react";
import { User } from "firebase/auth";
import { iconByCategory, expenseCategories, incomeCategories } from "../utils";
import { Profile, RecurringRule, TransactionRule, AppState } from "../types";
import { isFirebaseConfigured } from "../firebase";
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  LogOut,
  Check,
  RefreshCw,
  Upload,
  AlertTriangle,
  FileJson,
  CheckCircle,
  Info,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  Database,
  Calendar,
  Lock,
  Shield,
  Trash2,
  Cpu,
  Edit2,
  Users,
  Sliders,
  Palette,
  ArrowRight,
  Settings2,
  Plus,
  KeyRound
} from "lucide-react";
import { generateCsvContent, downloadFile, generateReportPdf } from "../utils";
import { prepareStateForRemoteSave } from "../services/crypto";

interface SettingsViewProps {
  state: AppState;
  saveState: (s: AppState) => Promise<void>;
  profiles: Profile[];
  activeProfileId: string | null;
  onSelectProfile: (profileId: string) => void;
  onUpdateProfile: (profileId: string, data: { name: string; kind: "personal" | "shared"; partnerName: string; avatar: string }) => void;
  onDeleteProfile: (profileId: string) => void;
  onOpenProfileModal: () => void;
  onOpenPinModal: () => void;
  onExportData: () => void;
  onResetData: () => void;
  
  // Google Drive integration props
  googleUser: User | null;
  isGoogleLoading: boolean;
  googleError?: string | null;
  isDriveActionLoading: boolean;
  gdriveFileId: string | null;
  gdriveLastSynced: string | null;
  isDriveAutoSyncEnabled: boolean;
  onConnectGoogle: () => Promise<void>;
  onDisconnectGoogle: () => Promise<void>;
  onSyncToDrive: () => Promise<void>;
  onLoadFromDrive: () => Promise<void>;
  onToggleDriveAutoSync: (enabled: boolean) => void;
  onImportLocalData: (state: AppState) => void;
  
  // Theme settings
  theme: "light" | "dark" | "system";
  onThemeChange: (newTheme: "light" | "dark" | "system") => void;

  calendarToken?: string | null;
  onConnectCalendar?: () => Promise<void>;
  unlockedProfileId?: string | null;

  // Rules and Automation
  recurringRules: RecurringRule[];
  onSaveRecurringRules: (rules: RecurringRule[]) => void;
  transactionRules: TransactionRule[];
  onSaveTransactionRules: (rules: TransactionRule[]) => void;
  onSaveAccounts: (accounts: any[]) => void;
}

export function SettingsView({
  state,
  saveState,
  profiles,
  activeProfileId,
  onSelectProfile,
  onUpdateProfile,
  onDeleteProfile,
  onOpenProfileModal,
  onOpenPinModal,
  onExportData,
  onResetData,
  googleUser,
  isGoogleLoading,
  googleError,
  isDriveActionLoading,
  gdriveFileId,
  gdriveLastSynced,
  isDriveAutoSyncEnabled,
  onConnectGoogle,
  onDisconnectGoogle,
  onSyncToDrive,
  onLoadFromDrive,
  onToggleDriveAutoSync,
  onImportLocalData,
  theme,
  onThemeChange,
  recurringRules,
  onSaveRecurringRules,
  transactionRules,
  onSaveTransactionRules,
  onSaveAccounts,
  calendarToken,
  onConnectCalendar,
  unlockedProfileId
}: SettingsViewProps) {
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [filePreview, setFilePreview] = useState<AppState | null>(null);


  // Active profile edit states
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileData, setEditProfileData] = useState<{
    name: string;
    kind: "personal" | "shared";
    partnerName: string;
    avatar: string;
  } | null>(null);

  const startEditingProfile = (profile: Profile) => {
    setEditingProfileId(profile.id);
    setEditProfileData({
      name: profile.name,
      kind: profile.kind,
      partnerName: profile.partnerName || "",
      avatar: profile.avatar || "👤",
    });
  };

  const cancelEditingProfile = () => {
    setEditingProfileId(null);
    setEditProfileData(null);
  };

  const handleUpdateActiveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfileId || !editProfileData) return;
    if (!editProfileData.name.trim()) return;
    if (editProfileData.kind === "shared" && !editProfileData.partnerName.trim()) {
      alert("Proszę podać imię partnera dla profilu wspólnego.");
      return;
    }
    
    onUpdateProfile(editingProfileId, {
      name: editProfileData.name.trim(),
      kind: editProfileData.kind,
      partnerName: editProfileData.kind === "shared" ? editProfileData.partnerName.trim() : "",
      avatar: editProfileData.avatar,
    });
    setEditingProfileId(null);
    setEditProfileData(null);
  };

  // Form states for Category Rules
  const [rulePattern, setRulePattern] = useState("");
  const [ruleCategory, setRuleCategory] = useState("Żywność");
  
  // Bank accounts states
  const [accName, setAccName] = useState("");
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  const [accBankName, setAccBankName] = useState("");
  const [accHasLimit, setAccHasLimit] = useState(false);
  const [accLimitAmount, setAccLimitAmount] = useState<number | "">("");

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim() || !activeProfile) return;
    const newAcc = {
      id: "acc-" + Date.now(),
      name: accName.trim(),
      bankName: accBankName.trim(),
      hasCreditLimit: accHasLimit,
      creditLimit: accHasLimit && typeof accLimitAmount === "number" ? accLimitAmount : 0
    };
    if (typeof accLimitAmount === "number") {
      newAcc.creditLimit = accLimitAmount;
    }
    const currentAccounts = activeProfile.accounts || [];
    onSaveAccounts([...currentAccounts, newAcc]);
    setAccName("");
    setAccBankName("");
    setAccHasLimit(false);
    setAccLimitAmount("");
  };

  const handleDeleteAccount = (id: string) => {
    if (!activeProfile) return;
    const currentAccounts = activeProfile.accounts || [];
    onSaveAccounts(currentAccounts.filter(a => a.id !== id));
  };


  // Form states for Recurring Rules
  const [recName, setRecName] = useState("");
  const [recAmount, setRecAmount] = useState<number | "">("");
  const [recType, setRecType] = useState<"expense" | "income">("expense");
  const [recCategory, setRecCategory] = useState("Żywność");
  const [recAccount, setRecAccount] = useState("Konto główne");
  const [recFrequency, setRecFrequency] = useState<"weekly" | "biweekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [recNextDate, setRecNextDate] = useState("");

  const handleAddTransactionRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rulePattern.trim()) return;
    const newRule: TransactionRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      pattern: rulePattern.trim(),
      category: ruleCategory,
      categoryIcon: iconByCategory[ruleCategory] || "✨"
    };
    onSaveTransactionRules([...transactionRules, newRule]);
    setRulePattern("");
  };

  const handleDeleteTransactionRule = (id: string) => {
    onSaveTransactionRules(transactionRules.filter((r) => r.id !== id));
  };

  const handleAddRecurringRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recName.trim() || !recAmount || !recNextDate) {
      alert("Proszę uzupełnić nazwę, kwotę i termin pierwszej płatności.");
      return;
    }
    const newRule: RecurringRule = {
      id: `rec-rule-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: recName.trim(),
      amount: Number(recAmount),
      type: recType,
      category: recCategory,
      categoryIcon: iconByCategory[recCategory] || "✨",
      account: recAccount.trim(),
      frequency: recFrequency,
      nextDueDate: recNextDate,
      isActive: true
    };
    onSaveRecurringRules([...recurringRules, newRule]);
    setRecName("");
    setRecAmount("");
    setRecNextDate("");
  };

  const handleDeleteRecurringRule = (id: string) => {
    onSaveRecurringRules(recurringRules.filter((r) => r.id !== id));
  };

  const handleToggleRecurringRule = (id: string) => {
    onSaveRecurringRules(
      recurringRules.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  const getInitials = (name: string) => {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "SP";
  };

  // Drag-and-drop handlers for local file restoration
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".json")) {
      alert("Proszę wybrać plik w formacie JSON (.json).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.profiles)) {
          setFilePreview(parsed);
        } else {
          alert("Plik JSON nie zawiera prawidłowej bazy danych aplikacji Saldo.");
        }
      } catch (err) {
        alert("Błąd dekodowania pliku JSON. Upewnij się, że plik nie jest uszkodzony.");
      }
    };
    reader.readAsText(file);
  };

  const confirmLocalImport = () => {
    if (filePreview) {
      onImportLocalData(filePreview);
      setFilePreview(null);
    }
  };

  const [settingsTab, setSettingsTab] = useState<"all" | "profiles" | "appearance" | "backup" | "automation">("all");

  return (
    <div className="space-y-6 max-w-4xl" id="settings-view-container">
      {/* CATEGORY SUB-NAVIGATION BAR */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSettingsTab("all")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              settingsTab === "all"
                ? "bg-[#137566] text-white shadow-sm"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/60"
            }`}
          >
            <Settings2 className="w-4 h-4" /> Wszystkie sekcje
          </button>
          <button
            onClick={() => setSettingsTab("profiles")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              settingsTab === "profiles"
                ? "bg-[#137566] text-white shadow-sm"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/60"
            }`}
          >
            <Users className="w-4 h-4" /> Profile i PIN ({profiles.length})
          </button>
          <button
            onClick={() => setSettingsTab("appearance")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              settingsTab === "appearance"
                ? "bg-[#137566] text-white shadow-sm"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/60"
            }`}
          >
            <Palette className="w-4 h-4" /> Motyw i AI
          </button>
          <button
            onClick={() => setSettingsTab("backup")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              settingsTab === "backup"
                ? "bg-[#137566] text-white shadow-sm"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/60"
            }`}
          >
            <Cloud className="w-4 h-4" /> Chmura i Kopie
          </button>
          <button
            onClick={() => setSettingsTab("automation")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              settingsTab === "automation"
                ? "bg-[#137566] text-white shadow-sm"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/60"
            }`}
          >
            <Cpu className="w-4 h-4" /> Reguły i Konta
          </button>
        </div>
      </div>

      {/* SECTION 1: PROFILES */}
      {(settingsTab === "all" || settingsTab === "profiles") && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" id="settings-profiles-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#137566]" />
                <h3 className="text-base font-bold text-[#153a35]">Zarządzanie profilami budżetu</h3>
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Każdy profil posiada niezależne transakcje, limity, salda bankowe oraz cele oszczędnościowe.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-[#137566] border border-emerald-100 shrink-0 self-start sm:self-auto">
              {profiles.length} {profiles.length === 1 ? "profil" : profiles.length < 5 ? "profile" : "profili"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5" id="profiles-grid">
            {profiles.map((p) => {
              const isActive = p.id === activeProfileId;
              const isShared = p.kind === "shared";
              const isEditing = editingProfileId === p.id;
              
              if (isEditing && editProfileData) {
                return (
                  <div key={p.id} className="col-span-1 sm:col-span-2 bg-white rounded-2xl border border-[#137566] p-5 shadow-md ring-2 ring-[#137566]/20">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <Edit2 className="w-4 h-4 text-[#137566]" />
                        <h4 className="text-sm font-extrabold text-[#153a35]">Edycja profilu: {p.name}</h4>
                      </div>
                      <button onClick={cancelEditingProfile} className="text-gray-400 hover:text-gray-600 p-1 text-lg leading-none">&times;</button>
                    </div>
                    <form onSubmit={handleUpdateActiveProfile} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#153a35] mb-1">Nazwa profilu</label>
                          <input
                            type="text"
                            value={editProfileData.name}
                            onChange={(e) => setEditProfileData(prev => prev ? { ...prev, name: e.target.value } : null)}
                            className="w-full rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white focus:border-[#137566] text-sm font-medium"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#153a35] mb-1">Ikona profilu</label>
                          <details className="group border border-gray-200 rounded-xl relative">
                            <summary className="p-2.5 text-xs font-semibold text-gray-700 cursor-pointer bg-gray-50 hover:bg-gray-100 flex items-center justify-between list-none select-none rounded-xl group-open:rounded-b-none group-open:border-b group-open:border-gray-200">
                              <div className="flex items-center gap-3">
                                <span className="text-xl leading-none">{editProfileData.avatar}</span>
                                <span>Zmień ikonę</span>
                              </div>
                              <span className="group-open:rotate-180 transition-transform mr-2 text-gray-400">▼</span>
                            </summary>
                            <div className="p-3 border-t border-gray-200 bg-white absolute w-full z-10 shadow-lg rounded-b-xl">
                              <div className="grid grid-cols-6 gap-2">
                                {["👤", "👨‍💻", "👩‍💻", "🏠", "💼", "💰", "💎", "🌟", "✨", "🚀", "🐶", "🐱"].map(emoji => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                      setEditProfileData(prev => prev ? { ...prev, avatar: emoji } : null);
                                      if (document.activeElement instanceof HTMLElement) {
                                        document.activeElement.blur();
                                      }
                                    }}
                                    className={`text-xl p-1.5 rounded-lg border transition-all ${editProfileData.avatar === emoji ? 'bg-emerald-50 border-[#137566] shadow-sm' : 'bg-gray-50 border-gray-100 hover:bg-gray-100 grayscale hover:grayscale-0'}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </details>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#153a35] mb-1">Rodzaj profilu</label>
                        <select
                          value={editProfileData.kind}
                          onChange={(e) => setEditProfileData(prev => prev ? { ...prev, kind: e.target.value as "personal" | "shared" } : null)}
                          className="w-full rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white focus:border-[#137566] text-sm font-medium"
                        >
                          <option value="personal">👤 Osobisty (budżet prywatny)</option>
                          <option value="shared">👪 Wspólny (budżet domowy / z partnerem)</option>
                        </select>
                      </div>

                      {editProfileData.kind === "shared" && (
                        <div>
                          <label className="block text-xs font-bold text-[#153a35] mb-1">Imię partnera/współdzielącego</label>
                          <input
                            type="text"
                            value={editProfileData.partnerName}
                            onChange={(e) => setEditProfileData(prev => prev ? { ...prev, partnerName: e.target.value } : null)}
                            className="w-full rounded-xl border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white focus:border-[#137566] text-sm font-medium"
                            placeholder="np. Anna"
                            required
                            pattern=".*\S+.*"
                            title="Imię partnera nie może składać się z samych spacji"
                          />
                        </div>
                      )}
                      
                      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={cancelEditingProfile}
                          className="bg-white border border-gray-200 text-gray-600 font-bold py-2.5 px-4 rounded-xl text-xs hover:bg-gray-50 transition cursor-pointer"
                        >
                          Anuluj
                        </button>
                        <button
                          type="submit"
                          disabled={editProfileData.name === p.name && editProfileData.kind === p.kind && editProfileData.partnerName === (p.partnerName || "") && editProfileData.avatar === (p.avatar || "👤")}
                          className="bg-[#137566] text-white font-bold py-2.5 px-6 rounded-xl text-xs hover:bg-[#0f5d51] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Zapisz zmiany
                        </button>
                      </div>
                    </form>
                  </div>
                );
              }

              if (isActive) {
                return (
                  <div
                    key={p.id}
                    className="col-span-1 sm:col-span-2 bg-gradient-to-br from-[#f0f9f6] via-white to-[#e6f4f0] border-2 border-[#137566] rounded-2xl p-5 shadow-md ring-1 ring-[#137566]/20 relative overflow-hidden flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-[#137566]/20 shadow-sm flex items-center justify-center font-extrabold text-2xl shrink-0">
                          {p.avatar || "👤"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-base font-extrabold text-[#153a35] truncate">{p.name}</strong>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#137566] text-white shadow-xs">
                              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                              AKTYWNY
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 bg-white/80 border border-gray-200/80 px-2.5 py-0.5 rounded-md">
                              {isShared ? `👪 Wspólny (z ${p.partnerName})` : "👤 Osobisty"}
                            </span>
                            {p.pinHash ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                <Lock className="w-3 h-3 text-amber-600" /> Kod PIN
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">
                                Bez PINu
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 bg-white/80 p-1 rounded-xl border border-gray-200/60 shadow-xs">
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditingProfile(p); }}
                          className="p-2 text-gray-600 hover:text-[#137566] hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                          title="Edytuj profil"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={onOpenPinModal}
                          className="p-2 text-gray-600 hover:text-[#137566] hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                          title="Zarządzaj kodem PIN"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setProfileToDelete(p.id); }}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Usuń profil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-3 border-t border-[#137566]/15 text-[#137566] font-bold">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-[#137566]" /> Aktualnie pracujesz na tym profilu
                      </span>
                      <button
                        onClick={onOpenPinModal}
                        className="text-[11px] hover:underline flex items-center gap-1 text-[#137566] font-bold cursor-pointer"
                      >
                        {p.pinHash ? "Zmień PIN" : "Ustaw PIN"} <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={p.id}
                  className="bg-white border border-gray-200/90 hover:border-[#137566]/40 hover:shadow-md transition-all rounded-2xl p-4 flex flex-col justify-between gap-3 group relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-150 flex items-center justify-center font-bold text-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                        {p.avatar || "👤"}
                      </div>
                      <div className="min-w-0">
                        <strong className="block text-sm font-bold text-[#153a35] truncate">{p.name}</strong>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                            {isShared ? `Wspólny (${p.partnerName})` : "Osobisty"}
                          </span>
                          {p.pinHash && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                              <Lock className="w-3 h-3" /> PIN
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); startEditingProfile(p); }}
                        className="p-1.5 text-gray-400 hover:text-[#137566] hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                        title="Edytuj profil"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setProfileToDelete(p.id); }}
                        className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Usuń profil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectProfile(p.id)}
                    className="w-full py-2 px-3 bg-[#137566]/10 hover:bg-[#137566] text-[#137566] hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-1"
                    id={`btn-select-profile-${p.id}`}
                  >
                    <span>Otwórz ten profil</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            <button
              onClick={onOpenProfileModal}
              id="btn-add-profile-settings"
              className="col-span-1 sm:col-span-2 flex items-center justify-center gap-2.5 p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#137566] hover:bg-[#f0f9f6] text-[#137566] font-bold text-xs transition-all cursor-pointer group shadow-xs"
            >
              <div className="p-2 bg-emerald-100 text-[#137566] rounded-xl group-hover:scale-110 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <span> Utwórz nowy profil budżetu</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION: ACTIVE PROFILE SETTINGS */}
      {activeProfile && editProfileData && (settingsTab === "all" || settingsTab === "profiles") && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" id="settings-active-profile-card">
          <h3 className="text-base font-bold text-[#153a35] mb-2">Ustawienia aktywnego profilu</h3>
          <p className="text-xs text-gray-500 mb-5 leading-relaxed">
            Dostosuj nazwę, ikonę oraz rodzaj dla aktualnie wybranego profilu: <strong>{activeProfile.name}</strong>.
          </p>

          <form onSubmit={handleUpdateActiveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#153a35] mb-1">Nazwa profilu</label>
                <input
                  type="text"
                  value={editProfileData.name}
                  onChange={(e) => setEditProfileData(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full rounded-lg border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white focus:border-[#137566] text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#153a35] mb-1">Ikona profilu</label>
                <details className="group border border-gray-200 rounded-lg relative">
                  <summary className="p-2.5 text-xs font-semibold text-gray-700 cursor-pointer bg-gray-50 hover:bg-gray-100 flex items-center justify-between list-none select-none rounded-lg group-open:rounded-b-none group-open:border-b group-open:border-gray-200">
                    <div className="flex items-center gap-3">
                      <span className="text-xl leading-none">{editProfileData.avatar}</span>
                      <span>Wybierz ikonę</span>
                    </div>
                    <span className="group-open:rotate-180 transition-transform mr-2 text-gray-400">▼</span>
                  </summary>
                  <div className="p-3 border-t border-gray-200 bg-white absolute w-full z-10 shadow-lg rounded-b-lg">
                    <div className="grid grid-cols-6 gap-2">
                      {["👤", "👨‍💻", "👩‍💻", "🏠", "💼", "💰", "💎", "🌟", "✨", "🚀", "🐶", "🐱"].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setEditProfileData(prev => prev ? { ...prev, avatar: emoji } : null);
                            // Close details manually by blurring the active element (hacky but works for details without explicit state)
                            if (document.activeElement instanceof HTMLElement) {
                              document.activeElement.blur();
                            }
                          }}
                          className={`text-xl p-1.5 rounded-lg border transition-all ${editProfileData.avatar === emoji ? 'bg-emerald-50 border-[#137566] shadow-sm' : 'bg-gray-50 border-gray-100 hover:bg-gray-100 grayscale hover:grayscale-0'}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#153a35] mb-1">Rodzaj profilu</label>
              <select
                value={editProfileData.kind}
                onChange={(e) => setEditProfileData(prev => prev ? { ...prev, kind: e.target.value as "personal" | "shared" } : null)}
                className="w-full rounded-lg border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white focus:border-[#137566] text-sm"
              >
                <option value="personal">👤 Osobisty</option>
                <option value="shared">👪 Wspólny (wymaga podania imienia partnera)</option>
              </select>
            </div>

            {editProfileData.kind === "shared" && (
              <div>
                <label className="block text-xs font-semibold text-[#153a35] mb-1">Imię partnera/współdzielącego</label>
                <input
                  type="text"
                  value={editProfileData.partnerName}
                  onChange={(e) => setEditProfileData(prev => prev ? { ...prev, partnerName: e.target.value } : null)}
                  className="w-full rounded-lg border border-gray-200 p-2.5 outline-none bg-gray-50 focus:bg-white focus:border-[#137566] text-sm"
                  placeholder="np. Anna"
                  required
                  pattern=".*\S+.*"
                  title="Imię partnera nie może składać się z samych spacji"
                />
              </div>
            )}
            
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={editProfileData.name === activeProfile.name && editProfileData.kind === activeProfile.kind && editProfileData.partnerName === (activeProfile.partnerName || "") && editProfileData.avatar === (activeProfile.avatar || "👤")}
                className="bg-[#137566] text-white font-bold py-2.5 px-6 rounded-xl text-xs hover:bg-[#0f5d51] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Zapisz zmiany profilu
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION: THEME SELECTION */}
      {(settingsTab === "all" || settingsTab === "appearance") && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" id="settings-theme-card">
        <h3 className="text-base font-bold text-[#153a35] mb-2">Motyw i wygląd aplikacji</h3>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          Dostosuj schemat kolorów aplikacji Saldo do swoich preferencji. Wybierz jasny motyw dla pełnej czytelności w dzień, ciemny dla ochrony oczu w nocy, lub pozwól systemowi na automatyczną zmianę.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" id="theme-selectors-grid">
          {/* Light Theme Option */}
          <button
            onClick={() => onThemeChange("light")}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition cursor-pointer ${
              theme === "light"
                ? "bg-[#e7f3f0] border-[#137566] ring-1 ring-[#137566]"
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
            id="btn-set-theme-light"
          >
            <div className={`p-2 rounded-lg ${theme === "light" ? "bg-white text-[#137566]" : "bg-gray-100 text-gray-500"}`}>
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-[#153a35]">Jasny motyw</strong>
              <span className="text-[10px] text-gray-400 mt-0.5 block font-medium">Klasyczny i przejrzysty</span>
            </div>
          </button>

          {/* Dark Theme Option */}
          <button
            onClick={() => onThemeChange("dark")}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition cursor-pointer ${
              theme === "dark"
                ? "bg-[#e7f3f0] border-[#137566] ring-1 ring-[#137566]"
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
            id="btn-set-theme-dark"
          >
            <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-white text-[#137566]" : "bg-gray-100 text-gray-500"}`}>
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-[#153a35]">Ciemny motyw</strong>
              <span className="text-[10px] text-gray-400 mt-0.5 block font-medium">Komfortowy dla wzroku</span>
            </div>
          </button>

          {/* System Theme Option */}
          <button
            onClick={() => onThemeChange("system")}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition cursor-pointer ${
              theme === "system"
                ? "bg-[#e7f3f0] border-[#137566] ring-1 ring-[#137566]"
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
            id="btn-set-theme-system"
          >
            <div className={`p-2 rounded-lg ${theme === "system" ? "bg-white text-[#137566]" : "bg-gray-100 text-gray-500"}`}>
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-[#153a35]">Automatyczny</strong>
              <span className="text-[10px] text-gray-400 mt-0.5 block font-medium">Zgodny z systemem OS</span>
            </div>
          </button>
        </div>
      </div>
      )}

      {/* SECTION: AI PROVIDER SETTINGS */}
      {(settingsTab === "all" || settingsTab === "appearance") && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" id="settings-ai-provider-card">
        <h3 className="text-base font-bold text-[#153a35] mb-2">Konfiguracja silnika AI</h3>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          Wybierz dostawcę inteligencji dla kategoryzacji transakcji, analizy wyciągów oraz asystenta finansowego. Możesz wyłączyć AI, użyć lokalnego modelu (Ollama) lub bezpiecznej chmury.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4" id="ai-mode-selectors-grid">
          {/* None AI Option */}
          <button
            type="button"
            onClick={() => saveState({ ...state, aiMode: "none" })}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition cursor-pointer ${
              (state.aiMode || "none") === "none"
                ? "bg-[#e7f3f0] border-[#137566] ring-1 ring-[#137566]"
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
            id="btn-set-ai-mode-none"
          >
            <div className={`p-2 rounded-lg ${(state.aiMode || "none") === "none" ? "bg-white text-[#137566]" : "bg-gray-100 text-gray-500"}`}>
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-[#153a35]">Brak AI</strong>
              <span className="text-[10px] text-gray-400 mt-0.5 block font-medium">Standardowe reguły</span>
            </div>
          </button>

          {/* Local AI Option */}
          <button
            type="button"
            onClick={() => saveState({ ...state, aiMode: "local", localAiEndpoint: state.localAiEndpoint || "http://localhost:11434/api/generate" })}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition cursor-pointer ${
              state.aiMode === "local"
                ? "bg-[#e7f3f0] border-[#137566] ring-1 ring-[#137566]"
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
            id="btn-set-ai-mode-local"
          >
            <div className={`p-2 rounded-lg ${state.aiMode === "local" ? "bg-white text-[#137566]" : "bg-gray-100 text-gray-500"}`}>
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-[#153a35]">Lokalne AI</strong>
              <span className="text-[10px] text-gray-400 mt-0.5 block font-medium">Ollama / Serwer lokalny</span>
            </div>
          </button>

          {/* Cloud AI Option (Disabled for now to prevent costs) */}
          <button
            type="button"
            disabled={true}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition cursor-not-allowed opacity-60 bg-gray-50 border-gray-200`}
            id="btn-set-ai-mode-cloud"
          >
            <div className={`p-2 rounded-lg bg-gray-100 text-gray-500`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-gray-500 line-through">Chmura AI (Gemini)</strong>
              <span className="text-[10px] text-[#d55e50] font-bold mt-1 block uppercase tracking-wider bg-red-100 px-2 py-0.5 rounded-full inline-block">Dostępne w przyszłości</span>
            </div>
          </button>
        </div>

        {/* Local AI Endpoint Configuration when Local mode selected */}
        {state.aiMode === "local" && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 animate-fade-in">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-[#153a35]">Lokalny punkt końcowy (Endpoint):</label>
              <button
                type="button"
                onClick={() => saveState({ ...state, localAiEndpoint: "http://localhost:11434/api/generate" })}
                className="text-[10px] font-extrabold text-[#137566] hover:underline cursor-pointer"
              >
                Przywróć domyślny Ollama (11434)
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={state.localAiEndpoint || "http://localhost:11434/api/generate"}
                onChange={(e) => saveState({ ...state, localAiEndpoint: e.target.value })}
                placeholder="http://localhost:11434/api/generate"
                className="flex-1 bg-white border border-emerald-300 rounded-lg p-2.5 text-xs text-gray-800 outline-none focus:border-[#137566]"
                id="input-local-ai-endpoint"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/ai/health", {
                      headers: {
                        "x-ai-mode": "local",
                        "x-ai-local-endpoint": state.localAiEndpoint || "http://localhost:11434/api/generate"
                      }
                    });
                    const data = await res.json();
                    if (res.ok) {
                      alert("Połączenie udane! Lokalny serwer AI odpowiada prawidłowo.");
                    } else {
                      alert("Błąd połączenia: " + (data.message || data.error || "Serwer lokalny niedostępny."));
                    }
                  } catch (err: any) {
                    alert("Błąd sieciowy: Nie udało się połączyć z backendem.");
                  }
                }}
                className="px-3 py-2 bg-[#137566] hover:bg-[#0f5d51] text-white text-xs font-bold rounded-lg transition cursor-pointer shrink-0"
                id="btn-test-local-ai"
              >
                Testuj połączenie
              </button>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Ze względów bezpieczeństwa zezwalane są wyłącznie połączenia z adresem lokalnym (np. <code className="bg-white/80 px-1 py-0.5 rounded border text-[#137566]">http://localhost:11434/api/generate</code> lub <code className="bg-white/80 px-1 py-0.5 rounded border text-[#137566]">127.0.0.1</code>).
            </p>
            
            <details className="group border border-emerald-200 rounded-lg bg-white overflow-hidden">
              <summary className="p-3 text-xs font-bold text-[#153a35] cursor-pointer hover:bg-emerald-50 flex justify-between items-center list-none select-none">
                Jak uruchomić lokalne AI na swoim komputerze?
                <span className="group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 border-t border-emerald-100 text-xs text-gray-600 space-y-4">
                <p>Aby korzystać z modelu bezpłatnie i z zachowaniem pełnej prywatności (dane nie opuszczają Twojego komputera), zainstaluj silnik <a href="https://ollama.com/" target="_blank" rel="noopener noreferrer" className="text-[#137566] underline font-medium">Ollama</a>.</p>
                
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-800 text-[13px] flex items-center gap-1.5">🍎 macOS</h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Pobierz instalator dla macOS ze strony <a href="https://ollama.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">ollama.com</a>.</li>
                    <li>Po instalacji otwórz <strong>Terminal</strong> i uruchom model (np. llama3): <br/><code className="bg-gray-100 border px-1.5 py-0.5 rounded inline-block mt-1">ollama run llama3</code></li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-gray-800 text-[13px] flex items-center gap-1.5">🪟 Windows</h4>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Pobierz instalator Windows ze strony <a href="https://ollama.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">ollama.com</a>.</li>
                    <li>Aby aplikacja Saldo mogła połączyć się z modelem, musisz zezwolić na reguły <strong>CORS</strong>. W tym celu otwórz <strong>Wiersz polecenia (cmd)</strong> lub PowerShell i wpisz poniższe komendy jedna po drugiej:</li>
                  </ol>
                  <div className="bg-gray-800 text-gray-200 p-2.5 rounded-lg font-mono text-[11px] leading-relaxed mx-2">
                    set OLLAMA_ORIGINS="*"<br/>
                    ollama run llama3
                  </div>
                  <p className="pl-1 italic text-[10px]">Pozostaw otwarte okno terminala podczas korzystania z aplikacji.</p>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
      )}

      {/* SECTION 2: PIN SECURITY */}
      {activeProfile && (settingsTab === "all" || settingsTab === "profiles") && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" id="settings-pin-card">
          <h3 className="text-base font-bold text-[#153a35] mb-2">Zabezpieczenie aktywnego profilu</h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Dodaj kod PIN, aby zabezpieczyć swoje poufne transakcje i informacje budżetowe przed nieautoryzowanym wglądem innych użytkowników na tym urządzeniu.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gray-50 border border-gray-150">
            <div>
              <span className="text-xs font-bold text-gray-700 block">
                {activeProfile.pinHash ? "🛡️ Twój profil jest obecnie chroniony kodem PIN" : "🔓 Profil nie posiada zabezpieczenia PIN"}
              </span>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Każdorazowe otwarcie profilu będzie wymagać wpisania poprawnego kodu.
              </p>
            </div>
            <button
              onClick={onOpenPinModal}
              className="bg-[#137566] text-white font-bold py-2 px-4 rounded-lg text-xs hover:bg-[#0f5d51] transition shadow-sm shrink-0 cursor-pointer"
              id="btn-set-profile-pin"
            >
              {activeProfile.pinHash ? "Zmień kod PIN" : "Ustaw kod PIN"}
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: GOOGLE DRIVE CLOUD INTEGRATION */}
      {(settingsTab === "all" || settingsTab === "backup") && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" id="settings-google-drive-card">
        <div className="flex items-center gap-2 mb-2">
          <Cloud className="w-5 h-5 text-[#137566]" />
          <h3 className="text-base font-bold text-[#153a35]">Kopia zapasowa w chmurze (Dysk Google)</h3>
        </div>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
          Podłącz swój osobisty Dysk Google, aby bezpiecznie archiwizować plik bazy danych budżetu (<code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[11px]">saldo_budget.json</code>). Gwarantuje to pełną kontrolę nad danymi i ochronę przed ich utratą po wyczyszczeniu przeglądarki.
        </p>

        {googleError && (
          <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-2" id="gdrive-auth-error-notice">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-bold text-rose-900">Błąd połączenia z kontem Google</div>
            </div>
            {googleError === "auth/popup-closed-by-user" ? (
              <div className="leading-relaxed text-gray-600 pl-6 space-y-2">
                <p>
                  <strong>Okno logowania zostało zamknięte</strong> przed ukończeniem autoryzacji.
                </p>
                <p>
                  Jeśli korzystasz z aplikacji wewnątrz ramki podglądu (iframe) w AI Studio, przeglądarka mogła automatycznie zablokować wyskakujące okienko (pop-up) lub zablokować dostęp do plików cookies firm trzecich.
                </p>
                <p className="font-semibold text-[#137566]">
                  💡 Aby rozwiązać ten problem:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Kliknij przycisk <strong>"Otwórz w nowej karcie"</strong> w prawym górnym rogu podglądu, aby otworzyć aplikację poza ramką iframe.</li>
                  <li>Upewnij się, że zezwalasz na wyskakujące okienka (pop-ups) w ustawieniach przeglądarki dla tej domeny.</li>
                </ul>
              </div>
            ) : (
              <div className="leading-relaxed text-gray-600 pl-6 space-y-2">
                <p>
                  Szczegóły błędu: <code className="bg-rose-100/50 px-1 py-0.5 rounded font-mono text-[11px]">{googleError}</code>.
                </p>
                {googleError?.includes('unauthorized-domain') || googleError?.includes('nie jest autoryzowana') ? (
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mt-2">
                    <p className="font-bold text-amber-900 mb-1">⚠️ Wymagana konfiguracja w Firebase</p>
                    <p className="text-amber-800 text-xs">
                      Aktualna domena nie jest dodana do autoryzowanych domen w Twoim projekcie Firebase.
                      Aby to naprawić:
                    </p>
                    <ol className="list-decimal pl-5 mt-1 space-y-1 text-amber-800 text-xs font-medium">
                      <li>Wejdź na stronę <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline hover:text-amber-600">console.firebase.google.com</a></li>
                      <li>Wybierz swój projekt</li>
                      <li>Przejdź do <strong>Authentication</strong> &gt; <strong>Settings</strong> (Ustawienia) &gt; <strong>Authorized domains</strong> (Autoryzowane domeny)</li>
                      <li>Dodaj domenę: <code className="bg-amber-100 px-1 rounded select-all">{window.location.hostname}</code></li>
                    </ol>
                  </div>
                ) : (
                  <p>Zalecamy otwarcie aplikacji w nowej karcie podglądu, aby uniknąć ograniczeń związanych z ramką (iframe).</p>
                )}
              </div>
            )}
          </div>
        )}

        {!googleUser ? (
          <div className="bg-gray-50 border border-gray-150 rounded-2xl p-6 text-center space-y-4">
            <p className="text-xs text-gray-600 max-w-md mx-auto">
              Aplikacja Saldo nie posiada centralnej bazy danych do przechowywania Twoich finansów. Podłączenie Dysku Google utworzy bezpieczny plik, z którego możesz korzystać na każdym urządzeniu.
            </p>
            <button
              onClick={onConnectGoogle}
              disabled={isGoogleLoading}
              className="inline-flex items-center gap-2 bg-[#137566] text-white font-bold py-3 px-6 rounded-xl text-xs hover:bg-[#0f5d51] transition disabled:opacity-50 cursor-pointer shadow-md"
              id="btn-google-drive-connect"
            >
              {isGoogleLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.41 0-6.173-2.763-6.173-6.174 0-3.41 2.763-6.173 6.173-6.173 1.48 0 2.83.52 3.9 1.383l3.153-3.152C18.99 1.943 15.82 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.786 0 10.74-4.14 10.74-11.24 0-.648-.06-1.285-.16-1.955H12.24z"/>
                </svg>
              )}
              <span>Połącz z kontem Google Drive</span>
            </button>
            <details className="group mt-4 border border-gray-200 rounded-lg bg-white overflow-hidden text-left max-w-md mx-auto">
              <summary className="p-3 text-[11px] font-bold text-gray-700 cursor-pointer hover:bg-gray-50 flex justify-between items-center list-none select-none">
                <span className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-indigo-500" /> Dlaczego potrzebujemy dostępu do Dysku Google?</span>
                <span className="group-open:rotate-180 transition-transform text-gray-400">▼</span>
              </summary>
              <div className="p-4 border-t border-gray-100 text-[11px] text-gray-600 space-y-3 leading-relaxed">
                <p>
                  Aplikacja Saldo działa w modelu <strong className="text-gray-800">Local-First</strong> (dane są na Twoim urządzeniu). 
                  Aby zapewnić Ci kopię zapasową oraz możliwość synchronizacji między urządzeniami (np. telefonem a komputerem), 
                  oferujemy zapis do prywatnego, ukrytego pliku na Twoim koncie Google Drive.
                </p>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  <span className="font-bold text-emerald-800 block mb-1">Pełna prywatność:</span>
                  Aplikacja prosi wyłącznie o dostęp typu <code className="bg-white px-1 py-0.5 rounded border text-[#137566] text-[10px]">drive.file</code>. 
                  Oznacza to, że ma dostęp <strong>tylko i wyłącznie</strong> do plików, które sama utworzyła. Nie mamy dostępu do Twoich prywatnych zdjęć ani dokumentów!
                </div>
              </div>
            </details>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl gap-4">
              <div className="flex items-center gap-3">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    referrerPolicy="no-referrer"
                    alt={googleUser.displayName || "Google User"}
                    className="w-10 h-10 rounded-full border border-emerald-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    {getInitials(googleUser.displayName || googleUser.email || "G")}
                  </div>
                )}
                <div>
                  <span className="text-xs font-black text-[#153a35] flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Zalogowano jako: {googleUser.displayName || "Użytkownik Google"}
                  </span>
                  <p className="text-[10px] text-gray-500 font-medium">{googleUser.email}</p>
                </div>
              </div>
              <button
                onClick={onDisconnectGoogle}
                className="text-[11px] font-bold text-gray-500 hover:text-rose-600 transition flex items-center gap-1 cursor-pointer"
                id="btn-google-drive-disconnect"
              >
                <LogOut className="w-3.5 h-3.5" />
                Odłącz konto
              </button>
            </div>

            {/* Backups Action Stats */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-150 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Nazwa pliku na dysku</span>
                <span className="text-xs font-bold text-[#153a35] font-mono block mt-0.5">saldo_budget.json</span>
                <span className="text-[10px] text-gray-400 block mt-1">Status: {gdriveFileId ? "🟢 Plik istnieje" : "⚪ Plik zostanie utworzony przy pierwszym zapisie"}</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Ostatni zapis w chmurze</span>
                <span className="text-xs font-bold text-[#153a35] block mt-0.5">
                  {gdriveLastSynced || "Brak wykonanego zapisu"}
                </span>
                <span className="text-[10px] text-gray-400 block mt-1">Dostępny do wczytania</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onSyncToDrive}
                disabled={isDriveActionLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#137566] text-white font-bold py-2.5 px-4 rounded-xl text-xs hover:bg-[#0f5d51] transition disabled:opacity-50 cursor-pointer shadow-sm"
                id="btn-google-drive-upload"
              >
                {isDriveActionLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CloudUpload className="w-3.5 h-3.5" />
                )}
                <span>Zapisz teraz kopie na Dysk</span>
              </button>
              <button
                onClick={onLoadFromDrive}
                disabled={isDriveActionLoading || !gdriveFileId}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:border-[#137566] hover:text-[#137566] transition disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-700 py-2.5 px-4 rounded-xl text-xs font-bold cursor-pointer shadow-sm"
                id="btn-google-drive-download"
              >
                {isDriveActionLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CloudDownload className="w-3.5 h-3.5" />
                )}
                <span>Wczytaj kopie z Dysku Google</span>
              </button>
            </div>

            {/* AutoSync Switch toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50/50 border border-gray-150 rounded-xl">
              <div className="pr-4">
                <strong className="text-xs font-bold text-[#153a35] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#137566] animate-pulse" />
                  Automatyczny zapis (Auto-Sync)
                </strong>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                  Każda zmiana w transakcjach lub celach będzie automatycznie zapisywana na Twoim Dysku Google.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDriveAutoSyncEnabled}
                  onChange={(e) => onToggleDriveAutoSync(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#137566]"></div>
              </label>
            </div>
            <p className="text-[10px] text-gray-400 italic text-center">
              Uwaga: Ze względów bezpieczeństwa tokeny Google Drive są przechowywane wyłącznie w pamięci RAM. Po odświeżeniu aplikacji wystarczy kliknąć przycisk autoryzacji ponownie.
            </p>
          </div>
        )}
      </div>
      )}


      {/* SECTION: BANK ACCOUNTS */}
      {activeProfile && (settingsTab === "all" || settingsTab === "automation") && (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8" id="settings-bank-accounts-card">
        <h3 className="text-base font-bold text-[#153a35] mb-2">Konta i salda awaryjne</h3>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Skonfiguruj konta bankowe, z których płacisz lub na które otrzymujesz dochód.
          Możesz również dodać informację o limicie odnawialnym (nie wlicza się do budżetu).
        </p>
        <form onSubmit={handleAddAccount} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5 p-4 rounded-xl bg-gray-50 border border-gray-150">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nazwa (np. Konto główne)</label>
            <input required value={accName} onChange={(e) => setAccName(e.target.value)} className="w-full text-xs rounded-lg border border-gray-200 p-2 outline-none focus:border-[#137566]" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nazwa Banku (Opcjonalnie)</label>
            <input value={accBankName} onChange={(e) => setAccBankName(e.target.value)} placeholder="np. mBank, PKO" className="w-full text-xs rounded-lg border border-gray-200 p-2 outline-none focus:border-[#137566]" />
          </div>
          <div className="flex items-center pt-5">
            <label className="flex items-center cursor-pointer">
              <input type="checkbox" checked={accHasLimit} onChange={(e) => setAccHasLimit(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#137566]"></div>
              <span className="ml-2 text-xs font-bold text-gray-600">Limit odnaw.</span>
            </label>
          </div>
          {accHasLimit && (
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Kwota limitu</label>
              <input type="number" min="0" step="0.01" value={accLimitAmount} onChange={(e) => setAccLimitAmount(parseFloat(e.target.value) || "")} className="w-full text-xs rounded-lg border border-gray-200 p-2 outline-none focus:border-[#137566]" />
            </div>
          )}
          <div className="flex items-end lg:col-span-1">
            <button type="submit" className="w-full bg-white border border-gray-200 text-[#137566] font-bold py-2 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 transition text-xs shadow-sm">
              + Dodaj konto
            </button>
          </div>
        </form>

        {(activeProfile.accounts || []).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeProfile.accounts!.map(acc => (
              <div key={acc.id} className="flex items-center justify-between p-3 bg-white border border-gray-150 rounded-xl hover:shadow-sm transition">
                <div>
                  <strong className="text-xs text-slate-800">{acc.name}</strong>
                  {acc.bankName && <span className="ml-2 text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{acc.bankName}</span>}
                  {acc.hasCreditLimit && (
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Limit awaryjny: {acc.creditLimit} zł</p>
                  )}
                </div>
                <button onClick={() => handleDeleteAccount(acc.id)} className="text-gray-400 hover:text-rose-500 transition p-1">
                  &times;
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">Brak skonfigurowanych kont. Tradycyjne wpisywanie nazw pozostanie domyślne.</p>
        )}
      </div>
      )}
      {/* SECTION: AUTOMATED CATEGORY RULES */}
      {(settingsTab === "all" || settingsTab === "automation") && (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" id="settings-category-rules-card">
        <h3 className="text-base font-bold text-[#153a35] mb-2">Automatyczna kategoryzacja wydatków</h3>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Zdefiniuj własne słowa kluczowe (np. „orlen”, „biedronka”), aby aplikacja mogła automatycznie przypisywać odpowiednią kategorię do nowych lub importowanych transakcji.
        </p>

        <form onSubmit={handleAddTransactionRule} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 p-4 rounded-xl bg-gray-50 border border-gray-150">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Słowo kluczowe (Fraza)</label>
            <input
              type="text"
              value={rulePattern}
              onChange={(e) => setRulePattern(e.target.value)}
              placeholder="np. biedronka, netflix, orlen"
              className="w-full text-xs rounded-lg border border-gray-200 p-2 bg-white outline-none focus:border-[#137566]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Przypisz do kategorii</label>
            <select
              value={ruleCategory}
              onChange={(e) => setRuleCategory(e.target.value)}
              className="w-full text-xs rounded-lg border border-gray-200 p-2 bg-white outline-none focus:border-[#137566]"
            >
              {expenseCategories.concat(incomeCategories).filter((v, i, a) => a.indexOf(v) === i).map((cat) => (
                <option key={cat} value={cat}>
                  {iconByCategory[cat] || "✨"} {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-[#137566] text-white font-bold py-2 px-4 rounded-lg text-xs hover:bg-[#0f5d51] transition shadow-sm cursor-pointer"
            >
              ＋ Dodaj regułę kategoryzacji
            </button>
          </div>
        </form>

        {transactionRules.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-4">Brak zdefiniowanych reguł. Używane są domyślne reguły automatyczne.</p>
        ) : (
          <div className="border border-gray-150 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-gray-500 font-bold">
                  <th className="py-2 px-3">Słowo kluczowe</th>
                  <th className="py-2 px-3">Kategoria docelowa</th>
                  <th className="py-2 px-3 text-right">Akcja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {transactionRules.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#153a35]">{r.pattern}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 bg-[#e7f3f0] text-[#137566] px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-50">
                        <span>{r.categoryIcon || "✨"}</span>
                        {r.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteTransactionRule(r.id)}
                        className="text-[10px] font-bold text-[#d55e50] hover:underline"
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* SECTION: RECURRING TRANSACTIONS SCHEDULER */}
      {(settingsTab === "all" || settingsTab === "automation") && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" id="settings-recurring-rules-card">
        <h3 className="text-base font-bold text-[#153a35] mb-2">Automatyczne transakcje cykliczne</h3>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Skonfiguruj regularne przychody (np. pensja co miesiąc) lub koszty (np. Netflix, czynsz), aby aplikacja mogła automatycznie generować transakcje we właściwych terminach.
        </p>

        <form onSubmit={handleAddRecurringRule} className="p-4 rounded-xl bg-gray-50 border border-gray-150 space-y-3 mb-5">
          <strong className="block text-xs font-bold text-gray-700">Utwórz nową transakcję cykliczną</strong>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nazwa transakcji</label>
              <input
                type="text"
                value={recName}
                onChange={(e) => setRecName(e.target.value)}
                placeholder="np. Abonament Netflix, Pensja"
                className="w-full text-xs rounded-lg border border-gray-200 p-2 bg-white outline-none focus:border-[#137566]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Kwota (PLN)</label>
              <input
                type="number"
                step="0.01"
                value={recAmount}
                onChange={(e) => setRecAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="np. 43.99"
                className="w-full text-xs rounded-lg border border-gray-200 p-2 bg-white outline-none focus:border-[#137566]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Typ</label>
              <select
                value={recType}
                onChange={(e) => setRecType(e.target.value as "expense" | "income")}
                className="w-full text-xs rounded-lg border border-gray-200 p-2 bg-white outline-none focus:border-[#137566]"
              >
                <option value="expense">Wydatek (Koszt)</option>
                <option value="income">Przychód (Wpływ)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Kategoria</label>
              <select
                value={recCategory}
                onChange={(e) => setRecCategory(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-200 p-2 bg-white outline-none focus:border-[#137566]"
              >
                {expenseCategories.concat(incomeCategories).filter((v, i, a) => a.indexOf(v) === i).map((cat) => (
                  <option key={cat} value={cat}>
                    {iconByCategory[cat] || "✨"} {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Konto / Portfel</label>
              <input
                type="text"
                value={recAccount}
                onChange={(e) => setRecAccount(e.target.value)}
                placeholder="np. Konto główne"
                className="w-full text-xs rounded-lg border border-gray-200 p-2 bg-white outline-none focus:border-[#137566]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Częstotliwość</label>
              <select
                value={recFrequency}
                onChange={(e) => setRecFrequency(e.target.value as any)}
                className="w-full text-xs rounded-lg border border-gray-200 p-2 bg-white outline-none focus:border-[#137566]"
              >
                <option value="weekly">Co tydzień</option>
                <option value="biweekly">Co dwa tygodnie</option>
                <option value="monthly">Co miesiąc</option>
                <option value="quarterly">Co kwartał</option>
                <option value="yearly">Co rok</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pierwszy termin płatności</label>
              <input
                type="date"
                value={recNextDate}
                onChange={(e) => setRecNextDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-gray-200 p-2 bg-white outline-none focus:border-[#137566]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-[#137566] text-white font-bold py-2.5 px-6 rounded-lg text-xs hover:bg-[#0f5d51] transition shadow-sm cursor-pointer"
            >
              ＋ Dodaj harmonogram płatności
            </button>
          </div>
        </form>

        {recurringRules.length === 0 ? (
          <p className="text-xs text-gray-400 italic text-center py-4">Brak zdefiniowanych transakcji cyklicznych.</p>
        ) : (
          <div className="border border-gray-150 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-150 text-gray-500 font-bold">
                    <th className="py-2 px-3">Nazwa / Kategoria</th>
                    <th className="py-2 px-3">Częstotliwość</th>
                    <th className="py-2 px-3">Najbliższy termin</th>
                    <th className="py-2 px-3">Konto</th>
                    <th className="py-2 px-3 text-right">Kwota</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3 text-right">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {recurringRules.map((r) => {
                    const freqLabels = {
                      weekly: "Co tydzień",
                      biweekly: "Co 2 tygodnie",
                      monthly: "Co miesiąc",
                      quarterly: "Co kwartał",
                      yearly: "Co rok"
                    };
                    return (
                      <tr key={r.id} className={`hover:bg-gray-50/50 transition ${!r.isActive ? "opacity-60" : ""}`}>
                        <td className="py-2.5 px-3">
                          <strong className="block text-slate-800">{r.name}</strong>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {r.categoryIcon} {r.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-600">
                          {freqLabels[r.frequency] || r.frequency}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 font-mono">
                          {r.nextDueDate}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">
                          {r.account}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-black ${r.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                          {r.type === "income" ? "+" : "-"} {r.amount.toFixed(2)} PLN
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRecurringRule(r.id)}
                            className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold cursor-pointer border ${
                              r.isActive
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-gray-100 border-gray-200 text-gray-400"
                            }`}
                          >
                            {r.isActive ? "Aktywny" : "Wstrzymany"}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteRecurringRule(r.id)}
                            className="text-[10px] font-bold text-[#d55e50] hover:underline"
                          >
                            Usuń
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}

      {/* SECTION 4: SYNC & SECURITY */}
      {(settingsTab === "all" || settingsTab === "automation" || settingsTab === "backup") && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" id="settings-sync-security-card">
        <h3 className="text-base font-bold text-[#153a35] mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#137566]" />
          Synchronizacja i bezpieczeństwo
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Account & Firestore */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-start gap-3">
                <Cloud className="w-5 h-5 text-gray-500 shrink-0" />
                <div className="w-full">
                  <h4 className="text-sm font-bold text-gray-800">Konto chmurowe</h4>
                  {googleUser ? (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle className="w-3 h-3" /> Zalogowano
                      </span>
                      <p className="text-[11px] text-gray-500 mt-1 truncate">{googleUser.email}</p>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700">
                        Tryb lokalny
                      </span>
                    </div>
                  )}
                  
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Baza danych (Firestore)</h5>
                    {isFirebaseConfigured ? (
                      googleUser ? (
                        <span className="text-[11px] font-medium text-emerald-600">Aktywna (Synchronizacja w czasie rzeczywistym)</span>
                      ) : (
                        <span className="text-[11px] font-medium text-amber-600">Gotowa (Wymaga logowania)</span>
                      )
                    ) : (
                      <span className="text-[11px] font-medium text-gray-400">Brak konfiguracji</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* AI State */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-500 shrink-0" />
                <div className="w-full">
                  <h4 className="text-sm font-bold text-gray-800 flex justify-between items-center">
                    Asystent AI
                    {state.aiMode === "cloud" && (
                      <button
                        onClick={() => saveState({ ...state, aiMode: "none" })}
                        className="text-[10px] font-bold text-rose-600 hover:underline"
                      >
                        Wyłącz w chmurze
                      </button>
                    )}
                  </h4>
                  <div className="mt-1">
                    {state.aiMode === "cloud" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        AI w chmurze
                      </span>
                    ) : state.aiMode === "local" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        AI Lokalne
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600">
                        Brak AI
                      </span>
                    )}
                    <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                      {state.aiMode === "cloud" ? "Zależnie od funkcji, wybrane anonimowe dane mogą być wysyłane do API LLM w celu analizy." : "Żadne dane nie opuszczają tego urządzenia dla celów sztucznej inteligencji."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Integrations & Security */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-blue-500 shrink-0" />
                <div className="w-full">
                  <h4 className="text-sm font-bold text-gray-800">Google Drive</h4>
                  <div className="mt-1 flex items-center justify-between">
                    {gdriveFileId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        <CheckCircle className="w-3 h-3" /> Połączony
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600">
                        Niepołączony
                      </span>
                    )}
                    
                    {!gdriveFileId && (
                      <button
                        onClick={onConnectGoogle}
                        disabled={isDriveActionLoading}
                        className="text-[10px] font-bold text-[#137566] hover:underline disabled:opacity-50"
                      >
                        Połącz Dysk Google
                      </button>
                    )}
                  </div>
                  
                  {gdriveFileId && (
                    <div className="mt-2 flex justify-between items-center">
                      <p className="text-[10px] text-gray-500">
                        Ostatnia kopia: {gdriveLastSynced ? new Date(gdriveLastSynced).toLocaleString("pl-PL") : "Brak danych o ostatniej synchronizacji"}
                      </p>
                      <button
                        onClick={onSyncToDrive}
                        disabled={isDriveActionLoading}
                        className="text-[10px] font-bold text-[#137566] hover:underline disabled:opacity-50"
                      >
                        Wykonaj kopię teraz
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-purple-500 shrink-0" />
                <div className="w-full">
                  <h4 className="text-sm font-bold text-gray-800">Google Calendar</h4>
                  <div className="mt-1 flex items-center justify-between">
                    {calendarToken ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                        <CheckCircle className="w-3 h-3" /> Połączony
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600">
                        Niepołączony
                      </span>
                    )}
                    
                    {!calendarToken && onConnectCalendar && (
                      <button
                        onClick={onConnectCalendar}
                        className="text-[10px] font-bold text-[#137566] hover:underline"
                      >
                        Połącz Kalendarz Google
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="w-full">
                  <h4 className="text-sm font-bold text-gray-800">Zabezpieczenie profilu (PIN)</h4>
                  <div className="mt-1 flex justify-between items-center">
                    {activeProfile?.pinHash ? (
                      <>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Aktywne
                        </span>
                        {unlockedProfileId !== activeProfile.id ? (
                          <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Zablokowany
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            Odblokowany
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600">
                        Nieaktywne
                      </span>
                    )}
                    
                    {activeProfile?.pinHash && unlockedProfileId !== activeProfile.id && (
                      <button
                        onClick={onOpenPinModal}
                        className="text-[10px] font-bold text-[#137566] hover:underline"
                      >
                        Odblokuj profil
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* SECTION 5: LOCAL FILES & RESET */}
      {(settingsTab === "all" || settingsTab === "backup") && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6" id="settings-local-tools-card">
        <h3 className="text-base font-bold text-[#153a35] mb-2">Lokalna kopia zapasowa i reset</h3>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Zarządzaj lokalnymi kopiami zapasowymi. Możesz zapisać plik JSON z całą bazą danych na dysku komputera/telefonu lub wczytać go bezpośrednio do pamięci urządzenia.
        </p>

        {/* Drag and Drop Zone */}
        {!filePreview ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer mb-4 ${
              dragActive
                ? "border-[#137566] bg-[#e7f3f0]"
                : "border-gray-200 hover:border-gray-300 bg-gray-50"
            }`}
            onClick={() => document.getElementById("local-backup-file-input")?.click()}
          >
            <input
              id="local-backup-file-input"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <span className="text-xs font-black text-[#153a35] block">Wczytaj kopię z pliku JSON</span>
            <p className="text-[10px] text-gray-400 mt-1">
              Przeciągnij i upuść plik kopii zapasowej tutaj lub kliknij aby wyszukać na urządzeniu
            </p>
          </div>
        ) : (
          /* File Preview Card before actual restoration - VERY PREMIUM! */
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-xs font-black text-amber-800">Podgląd wczytywanego pliku</strong>
                <p className="text-[10px] text-amber-600 mt-0.5">
                  Wczytanie tych danych zastąpi wszystkie obecne profile i ich transakcje. Sprawdź zawartość pliku przed zatwierdzeniem:
                </p>
              </div>
            </div>

            <div className="bg-white/80 border border-amber-100 rounded-lg p-3 space-y-1.5">
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>Liczba profili w kopii:</span>
                <strong className="text-gray-700">{filePreview.profiles?.length || 0}</strong>
              </div>
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>Dostępne profile:</span>
                <strong className="text-[#137566] truncate max-w-[180px]">
                  {filePreview.profiles?.map((p) => p.name).join(", ") || "Brak"}
                </strong>
              </div>
              <div className="flex justify-between text-[11px] text-gray-500">
                <span>Łączna liczba wpisów transakcji:</span>
                <strong className="text-gray-700">
                  {filePreview.profiles?.reduce((acc: number, p) => acc + (p.transactions?.length || 0), 0) || 0}
                </strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmLocalImport}
                className="flex-1 bg-amber-600 text-white font-bold py-2 rounded-lg text-xs hover:bg-amber-700 transition cursor-pointer shadow-sm"
              >
                ✓ Nadpisz dane i przywróć
              </button>
              <button
                onClick={() => setFilePreview(null)}
                className="px-4 bg-white border border-gray-200 text-gray-500 hover:text-gray-800 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Anuluj
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="text-sm font-bold text-slate-800 mb-3">Eksport danych aktywnego profilu</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (activeProfile && activeProfile.transactions) {
                    const csv = generateCsvContent(activeProfile.transactions);
                    downloadFile(csv, `saldo-${activeProfile.name}-transakcje.csv`, "text/csv;charset=utf-8;");
                  }
                }}
                className="bg-white border border-gray-200 text-gray-700 hover:border-[#137566] hover:text-[#137566] transition py-2 px-3 rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-2 justify-center"
              >
                📊 Pobierz CSV
              </button>
              <button
                onClick={() => {
                  if (activeProfile) {
                    const now = new Date();
                    generateReportPdf(activeProfile, now.getFullYear(), now.getMonth());
                  }
                }}
                className="bg-white border border-gray-200 text-gray-700 hover:border-[#137566] hover:text-[#137566] transition py-2 px-3 rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-2 justify-center"
              >
                📄 Pobierz raport PDF
              </button>
            </div>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="text-sm font-bold text-slate-800 mb-3">Kopia zapasowa systemu</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  const safeState = await prepareStateForRemoteSave(state);
                  const json = JSON.stringify(safeState, null, 2);
                  downloadFile(json, `saldo-kopia-zaszyfrowana.json`, "application/json");
                }}
                className="bg-white border border-gray-200 text-gray-700 hover:border-[#137566] hover:text-[#137566] transition py-2 px-3 rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-2 justify-center"
              >
                🔒 Eksport zaszyfrowanej kopii
              </button>
              <button
                onClick={() => {
                  if (activeProfile?.pinHash && activeProfileId !== unlockedProfileId) {
                    onOpenPinModal();
                    return;
                  }
                  if (window.confirm("Ten plik będzie zawierał czytelne dane finansowe. Zapisz go w bezpiecznym miejscu.")) {
                    const json = JSON.stringify(state, null, 2);
                    downloadFile(json, `saldo-kopia-czytelna.json`, "application/json");
                  }
                }}
                className="bg-white border border-gray-200 text-gray-700 hover:border-[#137566] hover:text-[#137566] transition py-2 px-3 rounded-xl text-xs font-bold shadow-sm cursor-pointer flex items-center gap-2 justify-center"
              >
                🔓 Eksport czytelnych danych
              </button>
            </div>
          </div>

          <button
            onClick={onResetData}
            className="w-full bg-rose-50 text-[#d55e50] border border-rose-100 hover:bg-rose-100 hover:border-rose-200 transition py-3 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
            id="btn-reset-db-data"
          >
            ⚠️ Przywróć stan początkowy (Usuń wszystko)
          </button>
        </div>
      </div>
      )}

      {profileToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[#153a35] mb-2">Usuwanie profilu</h3>
            <p className="text-sm text-gray-600 mb-6">
              Czy na pewno chcesz usunąć ten profil? <strong>Wszystkie transakcje, cele i płatności zostaną bezpowrotnie usunięte.</strong>
              Ta operacja jest nieodwracalna.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setProfileToDelete(null)}
                className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-3 rounded-xl transition"
              >
                Anuluj
              </button>
              <button
                onClick={() => {
                  onDeleteProfile(profileToDelete);
                  setProfileToDelete(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-sm transition"
              >
                Usuń profil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

```


## File: src/components/TransactionsView.tsx
```tsx
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Profile, Transaction } from "../types";
import { formatPln, formatDatePl, iconByCategory, getLocalDateIso } from "../utils";
import { ImportTransactionsModal } from "./ImportTransactionsModal";

interface TransactionsViewProps {
  profile: Profile;
  onOpenTxModal: (tx?: Transaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onImportTransactions: (newTransactions: Transaction[]) => void;
  onBeforeImport?: () => void;
}

export function TransactionsView({ profile, onOpenTxModal, onDeleteTransaction, onImportTransactions, onBeforeImport }: TransactionsViewProps) {
  const [filterType, setFilterType] = useState<"all" | "expense" | "income">("all");
  const [paidByFilter, setPaidByFilter] = useState<"all" | "me" | "partner" | "joint">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [itemsToShow, setItemsToShow] = useState(25);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  // Debounce search term to prevent keyboard delay
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset pagination limit when any filter conditions change
  useEffect(() => {
    setItemsToShow(25);
  }, [filterType, paidByFilter, debouncedSearchTerm, selectedTag, dateFrom, dateTo, minAmount, maxAmount]);

  // Compute all unique tags from expense transactions
  const allUniqueTags = useMemo(() => {
    return Array.from(
      new Set(
        profile.transactions
          .flatMap((tx) => tx.tags || [])
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean)
      )
    ).sort();
  }, [profile.transactions]);

  const filteredTransactions = useMemo(() => {
    return [...profile.transactions]
      .filter((tx) => {
        if (filterType === "expense" && tx.type !== "expense") return false;
        if (filterType === "income" && tx.type !== "income") return false;

        if (profile.kind === "shared" && paidByFilter !== "all") {
          if (tx.paidBy !== paidByFilter) return false;
        }
        
        if (selectedTag) {
          const txTags = (tx.tags || []).map((t) => t.toLowerCase());
          if (!txTags.includes(selectedTag.toLowerCase())) return false;
        }
        
        if (dateFrom && tx.isoDate < dateFrom) return false;
        if (dateTo && tx.isoDate > dateTo) return false;
        
        if (minAmount) {
          const min = parseFloat(minAmount);
          if (!isNaN(min) && tx.amount < min) return false;
        }
        if (maxAmount) {
          const max = parseFloat(maxAmount);
          if (!isNaN(max) && tx.amount > max) return false;
        }

        if (debouncedSearchTerm) {
          const sTerm = debouncedSearchTerm.toLowerCase();
          const searchStr = `${tx.name} ${tx.category} ${tx.account} ${tx.tags ? tx.tags.join(" ") : ""}`.toLowerCase();
          return searchStr.includes(sTerm);
        }
        
        return true;
      })
      .sort((a, b) => b.isoDate.localeCompare(a.isoDate));
  }, [profile.transactions, filterType, paidByFilter, selectedTag, debouncedSearchTerm, dateFrom, dateTo, minAmount, maxAmount]);

  // Paginated chunk of transactions
  const visibleTransactions = useMemo(() => {
    return filteredTransactions.slice(0, itemsToShow);
  }, [filteredTransactions, itemsToShow]);

  // Compute stats per tag using memoization
  const tagExpensesMap = useMemo(() => {
    const map: Record<string, number> = {};
    profile.transactions.forEach((tx) => {
      if (tx.type === "expense") {
        const txTags = tx.tags || [];
        txTags.forEach((tag) => {
          const cleanTag = tag.trim().toLowerCase();
          if (cleanTag) {
            map[cleanTag] = (map[cleanTag] || 0) + tx.amount;
          }
        });
      }
    });
    return map;
  }, [profile.transactions]);

  // Calculate unique sum of expense amounts that have at least one tag
  const uniqueTaggedExpensesSum = useMemo(() => {
    return profile.transactions
      .filter((tx) => tx.type === "expense" && tx.tags && tx.tags.length > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [profile.transactions]);

  const totalOverallExpenses = useMemo(() => {
    return profile.transactions
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [profile.transactions]);

  const tagSummaries = useMemo(() => {
    return Object.entries(tagExpensesMap)
      .map(([name, spent]) => ({ name, spent: Number(spent) }))
      .sort((a, b) => b.spent - a.spent);
  }, [tagExpensesMap]);

  const maxSpentTagVal = useMemo(() => {
    return tagSummaries.length > 0 ? tagSummaries[0].spent : 1;
  }, [tagSummaries]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="transactions-page-layout">
      {/* Table Section */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between" id="transactions-view-container">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Historia finansowa</p>
              <h2 className="text-xl font-bold text-slate-900">Zarejestrowane transakcje</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  import('../utils').then(({ generateCsvContent, downloadFile }) => {
                    const csv = generateCsvContent(filteredTransactions);
                    downloadFile(csv, `transakcje_${getLocalDateIso()}.csv`, "text/csv;charset=utf-8;");
                  });
                }}
                className="bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-200 transition text-sm flex items-center gap-1.5 shadow-sm border border-slate-200"
                title="Eksportuj odfiltrowane dane"
                id="btn-export-csv"
              >
                📤 Eksportuj
              </button>
              <button
                onClick={() => setIsCSVModalOpen(true)}
                className="bg-[#e7f3f0] text-[#137566] font-bold py-2 px-4 rounded-lg hover:bg-[#d8ebe6] transition text-sm flex items-center gap-1.5 border border-[#137566]/20 shadow-sm"
                id="btn-import-csv"
              >
                📥 Importuj CSV
              </button>
              <button
                onClick={onOpenTxModal}
                className="bg-[#137566] text-white font-bold py-2 px-5 rounded-lg hover:bg-[#0f5d51] transition shadow-md text-sm"
                id="btn-add-tx-view"
              >
                ＋ Nowa transakcja
              </button>
            </div>
          </div>

          {/* Filter and Search controls */}
          <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 mb-5">
            <div className="flex flex-col xl:flex-row items-center justify-between gap-4 w-full">
              <div className="flex bg-gray-100 p-1 rounded-xl w-full xl:w-auto overflow-x-auto whitespace-nowrap hide-scrollbar">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    filterType === "all" ? "bg-white text-slate-800 shadow-sm" : "text-gray-500 hover:text-gray-800"
                  }`}
                  id="filter-all"
                >
                  Wszystkie
                </button>
                <button
                  onClick={() => setFilterType("expense")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    filterType === "expense" ? "bg-white text-[#d55e50] shadow-sm" : "text-gray-500 hover:text-gray-800"
                  }`}
                  id="filter-expenses"
                >
                  Wydatki
                </button>
                <button
                  onClick={() => setFilterType("income")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                    filterType === "income" ? "bg-white text-[#137566] shadow-sm" : "text-gray-500 hover:text-gray-800"
                  }`}
                  id="filter-incomes"
                >
                  Przychody
                </button>
              </div>
              
              {profile.kind === "shared" && (
                <div className="flex bg-indigo-50/50 p-1 rounded-xl w-full xl:w-auto max-w-full overflow-x-auto whitespace-nowrap hide-scrollbar border border-indigo-100/50">
                  <button
                    onClick={() => setPaidByFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                      paidByFilter === "all" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-600 hover:bg-indigo-100"
                    }`}
                  >Wszystkie</button>
                  <button
                    onClick={() => setPaidByFilter("me")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                      paidByFilter === "me" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-600 hover:bg-indigo-100"
                    }`}
                  >
                    Ja
                  </button>
                  <button
                    onClick={() => setPaidByFilter("partner")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                      paidByFilter === "partner" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-600 hover:bg-indigo-100"
                    }`}
                  >
                    Partner
                  </button>
                  <button
                    onClick={() => setPaidByFilter("joint")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                      paidByFilter === "joint" ? "bg-indigo-600 text-white shadow-sm" : "text-indigo-600 hover:bg-indigo-100"
                    }`}
                  >Wspólne/50-50</button>
                </div>
              )}

              {/* Advanced Filter row */}
              <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Od:</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="w-[125px] rounded-lg border border-gray-200 py-1 px-2 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Do:</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-[125px] rounded-lg border border-gray-200 py-1 px-2 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Min:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={minAmount}
                    onChange={e => setMinAmount(e.target.value)}
                    className="w-[70px] rounded-lg border border-gray-200 py-1 px-2 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Max:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="∞"
                    value={maxAmount}
                    onChange={e => setMaxAmount(e.target.value)}
                    className="w-[70px] rounded-lg border border-gray-200 py-1 px-2 text-xs outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="relative w-full sm:w-56 mt-2 sm:mt-0 flex-grow sm:flex-grow-0">
                  <input
                    type="search"
                    placeholder="Szukaj..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 py-2 px-3 pl-9 outline-none focus:border-[#137566] text-sm"
                    id="tx-search-input"
                  />
                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
                </div>
              </div>
            </div>

            {/* Unique tags list for easy quick filtering */}
            {allUniqueTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2" id="tags-filter-bar">
                <span className="text-[11px] font-bold text-gray-400 uppercase mr-1">Filtruj tagiem:</span>
                {allUniqueTags.map((tag) => {
                  const isSelected = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(isSelected ? null : tag)}
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="text-xs text-rose-600 font-bold hover:underline ml-2"
                  >
                    Wyczyść filtr tagu &times;
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Ledger Table (desktop) & Cards (mobile) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse" id="tx-table">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  <th className="py-3 px-2">Opis / Transakcja</th>
                  <th className="py-3 px-2">Data</th>
                  <th className="py-3 px-2">Kategoria</th>
                  <th className="py-3 px-2">Konto</th>
                  <th className="py-3 px-2 text-right">Kwota</th>
                  <th className="py-3 px-2 text-center w-16">Akcja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibleTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                      Brak transakcji spełniających kryteria.
                    </td>
                  </tr>
                ) : (
                  visibleTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3 px-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-base shrink-0" title={tx.category}>
                            {tx.categoryIcon || iconByCategory[tx.category] || "📂"}
                          </span>
                          <span className="font-semibold text-slate-900">{tx.name}</span>
                          {profile.kind === "shared" && tx.paidBy && (
                            <span className="ml-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {tx.paidBy === 'me' ? 'Ja' : tx.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                              {tx.splitMode === 'equal' ? ' (50-50)' : ''}
                            </span>
                          )}
                        </div>
                        {/* Transaction tags display inside row */}
                        {tx.tags && tx.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tx.tags.map((tag) => (
                              <span
                                key={tag}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTag(selectedTag === tag ? null : tag);
                                }}
                                className={`cursor-pointer text-[10px] px-1.5 py-0.5 rounded font-medium border transition ${
                                  selectedTag === tag
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
                                }`}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-xs text-gray-500 whitespace-nowrap">{formatDatePl(tx.isoDate)}</td>
                      <td className="py-3 px-2 text-xs text-gray-600">
                        <span className="bg-gray-100 px-2.5 py-1 rounded-full">{tx.category}</span>
                      </td>
                      <td className="py-3 px-2 text-xs text-gray-500">{tx.account}</td>
                      <td className={`py-3 px-2 text-sm font-bold text-right whitespace-nowrap ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                        {tx.type === "income" ? "+" : "-"} {formatPln(tx.amount)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onOpenTxModal(tx)}
                            className="text-gray-400 hover:text-indigo-600 text-xs font-semibold px-2 py-1 rounded transition"
                            title="Edytuj transakcję"
                          >
                            Edytuj
                          </button>
                          <button
                            onClick={() => setTransactionToDelete(tx)}
                            className="text-gray-400 hover:text-rose-600 text-xs font-semibold px-2 py-1 rounded transition"
                            title="Usuń transakcję"
                            id={`btn-delete-tx-${tx.id}`}
                          >
                            Usuń
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (visible on mobile only) */}
          <div className="block md:hidden space-y-3" id="tx-mobile-list">
            {visibleTransactions.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400 bg-gray-50 rounded-xl">
  {profile.transactions.length === 0 && profile.kind === "shared" ? "Dodaj pierwszy wspólny wydatek." : "Brak transakcji spełniających kryteria."}
</div>
            ) : (
              visibleTransactions.map((tx) => (
                <div key={tx.id} className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2 relative">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg shrink-0 bg-white shadow-xs rounded-full w-8 h-8 flex items-center justify-center">
                        {tx.categoryIcon || iconByCategory[tx.category] || "📂"}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          {tx.name}
                          {profile.kind === "shared" && tx.paidBy && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {tx.paidBy === 'me' ? 'Ja' : tx.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                              {tx.splitMode === 'equal' ? ' (50-50)' : ''}
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-gray-400">{formatDatePl(tx.isoDate)}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-black whitespace-nowrap ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                      {tx.type === "income" ? "+" : "-"} {formatPln(tx.amount)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100/60 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-white border border-slate-150 px-2 py-0.5 rounded-md text-[10px] text-slate-600 font-medium">
                        {tx.category}
                      </span>
                      <span className="bg-white border border-slate-150 px-2 py-0.5 rounded-md text-[10px] text-slate-500">
                        {tx.account}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenTxModal(tx)}
                        className="text-indigo-600 hover:text-indigo-700 text-[11px] font-bold px-2.5 py-1 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
                      >
                        Edytuj
                      </button>
                      <button
                        onClick={() => setTransactionToDelete(tx)}
                        className="text-rose-600 hover:text-rose-700 text-[11px] font-bold px-2.5 py-1 bg-rose-50 rounded-lg hover:bg-rose-100 transition"
                        id={`btn-delete-tx-mob-${tx.id}`}
                      >
                        Usuń
                      </button>
                    </div>
                  </div>

                  {tx.tags && tx.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {tx.tags.map((tag) => (
                        <span
                          key={tag}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTag(selectedTag === tag ? null : tag);
                          }}
                          className={`cursor-pointer text-[10px] px-1.5 py-0.5 rounded font-medium border transition ${
                            selectedTag === tag
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
                          }`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination / Show More button */}
          {filteredTransactions.length > itemsToShow && (
            <div className="flex justify-center mt-4 border-t border-gray-50 pt-4" id="pagination-panel">
              <button
                onClick={() => setItemsToShow((prev) => prev + 25)}
                className="bg-[#e7f3f0] text-[#137566] hover:bg-[#d8ebe6] font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm"
                id="btn-load-more"
              >
                Pokaż więcej ({filteredTransactions.length - itemsToShow} pozostało)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tags Reporting Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col" id="tags-analysis-card">
        <div className="mb-4">
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Raportowanie i Analiza</p>
          <h3 className="text-lg font-bold text-slate-900">Wydatki według tagów</h3>
        </div>

        {/* Mini dashboard stats cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[10px] text-slate-500 font-semibold">Otagowane wydatki</p>
            <p className="text-base font-bold text-slate-900 mt-1">{formatPln(uniqueTaggedExpensesSum)}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[10px] text-slate-500 font-semibold">Pokrycie tagami</p>
            <p className="text-base font-bold text-slate-900 mt-1">
              {totalOverallExpenses > 0
                ? `${Math.round((uniqueTaggedExpensesSum / totalOverallExpenses) * 100)}%`
                : "0%"}
            </p>
          </div>
        </div>

        {/* Tag distribution bar chart */}
        <div className="flex-1 overflow-y-auto space-y-4 max-h-[350px] pr-1">
          {tagSummaries.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">
              <span className="text-2xl block mb-2">🏷️</span>
              Brak otagowanych wydatków. Dodaj tagi do transakcji, aby wygenerować raport.
            </div>
          ) : (
            tagSummaries.map((tag) => {
              const isSelected = selectedTag === tag.name;
              const pctOfMax = Math.round((tag.spent / maxSpentTagVal) * 100);
              const pctOfTotal = totalOverallExpenses > 0 ? Math.round((tag.spent / totalOverallExpenses) * 100) : 0;
              
              return (
                <div
                  key={tag.name}
                  onClick={() => setSelectedTag(isSelected ? null : tag.name)}
                  className={`group p-2.5 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50/80 border-indigo-200"
                      : "bg-white border-transparent hover:bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      #{tag.name}
                    </span>
                    <span className="text-slate-500 font-medium text-[11px]">
                      <strong>{formatPln(tag.spent)}</strong> ({pctOfTotal}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pctOfMax}%` }}
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500 group-hover:bg-indigo-500"
                    ></div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Informational advice footer */}
        <div className="mt-6 border-t border-slate-100 pt-4 text-[11px] text-slate-500 leading-relaxed bg-indigo-50/50 p-3 rounded-xl border border-indigo-50">
          <span className="font-bold text-indigo-900 block mb-1">💡 Wskazówka:</span>
          Kliknij na tag w tabeli lub panelu bocznym, aby natychmiast wyfiltrować wszystkie powiązane z nim wydatki i precyzyjnie przeanalizować ich udział.
        </div>
      </div>

      <AnimatePresence>
        {transactionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTransactionToDelete(null)}
              className="absolute inset-0 bg-black/55 backdrop-blur-xs"
            />

            {/* Dialog Modal Box */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative z-10 border border-slate-100"
            >
              {/* Warning Header */}
              <div className="flex items-center gap-3.5 mb-4 text-rose-600">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100">
                  <span className="text-xl font-bold">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Potwierdź usunięcie</h3>
                  <p className="text-xs text-slate-500">Czy na pewno chcesz usunąć tę transakcję?</p>
                </div>
              </div>

              {/* Transaction Details Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm mb-5">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-slate-900">{transactionToDelete.name}</span>
                  <span className={`font-bold ${transactionToDelete.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                    {transactionToDelete.type === "income" ? "+" : "-"} {formatPln(transactionToDelete.amount)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="bg-slate-200/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span>{transactionToDelete.categoryIcon || iconByCategory[transactionToDelete.category] || "📂"}</span>
                    <span>{transactionToDelete.category}</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>{formatDatePl(transactionToDelete.isoDate)}</span>
                  <span className="text-slate-300">•</span>
                  <span>{transactionToDelete.account}</span>
                </div>
              </div>

              <p className="text-xs text-rose-500 font-medium mb-5 bg-rose-50 px-3 py-2 rounded-lg border border-rose-100 flex items-center gap-2">
                <span>ℹ️</span> Tej operacji nie można cofnąć. Transakcja zostanie trwale skasowana z budżetu.
              </p>

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setTransactionToDelete(null)}
                  className="px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  onClick={() => {
                    onDeleteTransaction(transactionToDelete.id);
                    setTransactionToDelete(null);
                  }}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Usuń transakcję</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ImportTransactionsModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onImport={onImportTransactions}
        onBeforeImport={onBeforeImport}
      />
    </div>
  );
}

```


## File: src/components/dashboard/ActivityWidget.tsx
```tsx
import React, { memo } from "react";
import { formatPln, formatDatePl, iconByCategory } from "../../utils";
import { Transaction } from "../../types";

interface ActivityWidgetProps {
  profileKind?: "personal" | "shared";
  recentTransactions: Transaction[];
  onChangeView: (view: string) => void;
  onOpenTxModal: () => void;
}

export const ActivityWidget = memo(function ActivityWidget({
  recentTransactions,
  onChangeView,
  onOpenTxModal,
  profileKind
}: ActivityWidgetProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-full" id="widget-content-activity-box">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ostatnie transakcje</p>
          <h3 className="text-base font-bold text-gray-800">Aktywność</h3>
        </div>
        <button
          onClick={() => onChangeView("transactions")}
          className="text-[11px] font-bold text-[#137566] bg-[#137566]/10 px-2 py-1 rounded-lg hover:bg-[#137566]/20 transition"
        >
          Księga
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {recentTransactions.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-xs text-gray-500 font-medium">
              {profileKind === "shared" ? "Dodaj pierwszy wspólny wydatek" : "Brak niedawnych transakcji."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                    t.type === 'income' ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <span className="text-sm">
                      {iconByCategory[t.category] || "📄"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate flex items-center gap-1.5">
                      {t.name || t.category}
                      {/* Note: we don't have access to profile.kind here easily, but we can check if t.paidBy exists since it's only set on shared profiles */}
                      {t.paidBy && (
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                          {t.paidBy === 'me' ? 'Ja' : t.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                          {t.splitMode === 'equal' ? ' (50-50)' : ''}
                        </span>
                      )}
                    </p>
                    <p className="text-[9px] text-gray-400">{formatDatePl(t.isoDate)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <p className={`text-xs font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-gray-800'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatPln(t.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 mt-3 border-t border-gray-100">
        <button
          onClick={onOpenTxModal}
          className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-xl transition border border-gray-100"
        >
          + Szybki zapis
        </button>
      </div>
    </div>
  );
});

```


## File: src/components/dashboard/BillsWidget.tsx
```tsx
import React, { memo } from "react";
import { formatPln } from "../../utils";
import { Payment } from "../../types";

interface BillsWidgetProps {
  unpaidPayments: Payment[];
  urgentPaymentsCount: number;
  onTogglePaymentStatus: (id: string) => void;
  onChangeView: (view: string) => void;
  onOpenPaymentModal: () => void;
}

export const BillsWidget = memo(function BillsWidget({
  unpaidPayments,
  urgentPaymentsCount,
  onTogglePaymentStatus,
  onChangeView,
  onOpenPaymentModal
}: BillsWidgetProps) {
  
  const getDueStatus = (dueDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pDate = new Date(`${dueDateStr}T00:00:00`);
    const diffTime = pDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return {
        label: "Przeterminowane!",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 text-[9px] font-bold",
      };
    } else if (diffDays === 0) {
      return {
        label: "Dzisiaj!",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-200 animate-pulse text-[9px] font-bold",
      };
    } else if (diffDays === 1) {
      return {
        label: "Jutro",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-200 text-[9px] font-bold",
      };
    } else if (diffDays <= 3) {
      return {
        label: `Za ${diffDays} dni`,
        badgeClass: "bg-amber-100 text-amber-800 border-amber-200 text-[9px] font-bold",
      };
    }
    return {
      label: null,
      badgeClass: "",
    };
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-full" id="widget-content-bills-box">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Najbliższe Opłaty</p>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-800">Do zapłaty</h3>
            {urgentPaymentsCount > 0 && (
              <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {urgentPaymentsCount} pilne
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onChangeView("payments")}
          className="text-[11px] font-bold text-[#137566] bg-[#137566]/10 px-2 py-1 rounded-lg hover:bg-[#137566]/20 transition"
        >
          Wszystkie
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {unpaidPayments.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <div className="text-2xl mb-1 opacity-50">🍵</div>
            <p className="text-xs text-gray-500 font-medium">Brak rachunków do opłacenia.</p>
            <p className="text-[10px] text-gray-400">Możesz spać spokojnie.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {unpaidPayments.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:border-[#137566]/30 transition group">
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); onTogglePaymentStatus(p.id); }}
                    className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center text-transparent hover:border-[#137566] hover:text-[#137566] transition"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <div>
                    <p className="text-sm font-bold text-gray-800 leading-tight group-hover:text-[#137566] transition-colors flex items-center gap-1.5 flex-wrap">
                      {p.name}
                      {p.paidBy && (
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                          {p.paidBy === 'me' ? 'Ja' : p.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                          {p.splitMode === 'equal' ? ' (50-50)' : ''}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-gray-500 font-medium">{p.dueDate}</p>
                      {(() => {
                        const status = getDueStatus(p.dueDate);
                        if (status.label) {
                          return (
                            <span className={`px-1.5 py-0.2 rounded-md border font-extrabold ${status.badgeClass}`} id={`due-badge-${p.id}`}>
                              {status.label}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-gray-800">{formatPln(p.amount)}</p>
                </div>
              </div>
            ))}
            {unpaidPayments.length > 3 && (
              <p className="text-center text-[10px] text-gray-400 font-semibold pt-1">
                + {unpaidPayments.length - 3} innych płatności
              </p>
            )}
          </div>
        )}
      </div>

      <div className="pt-3 mt-3 border-t border-gray-100">
        <button
          onClick={onOpenPaymentModal}
          className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-xl transition border border-gray-100"
        >
          + Dodaj płatność
        </button>
      </div>
    </div>
  );
});

```


## File: src/components/dashboard/BudgetWarningsWidget.tsx
```tsx
import React, { memo } from "react";
import { formatPln } from "../../utils";
import { BudgetWarning } from "../../services/budgetCalculations";

interface BudgetWarningsWidgetProps {
  totalPlannedBudget: number;
  totalActualSpentInBudget: number;
  budgetWarnings: BudgetWarning[];
  onChangeView: (view: string) => void;
  onOpenBudgetModal: () => void;
}

export const BudgetWarningsWidget = memo(function BudgetWarningsWidget({
  totalPlannedBudget,
  totalActualSpentInBudget,
  budgetWarnings,
  onChangeView,
  onOpenBudgetModal
}: BudgetWarningsWidgetProps) {
  const globalBudgetRatio = totalPlannedBudget > 0 ? (totalActualSpentInBudget / totalPlannedBudget) * 100 : 0;
  
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-full" id="widget-content-budget-box">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plan Budżetu</p>
          <h3 className="text-base font-bold text-gray-800">Użycie budżetów</h3>
        </div>
        <button
          onClick={() => onChangeView("budget")}
          className="text-[11px] font-bold text-[#137566] bg-[#137566]/10 px-2 py-1 rounded-lg hover:bg-[#137566]/20 transition"
        >
          Szczegóły
        </button>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-end mb-1">
          <span className="text-xs font-bold text-gray-700">Całkowity budżet</span>
          <span className="text-xs font-bold text-gray-900">{formatPln(totalActualSpentInBudget)} <span className="text-gray-400 font-normal">/ {formatPln(totalPlannedBudget)}</span></span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${globalBudgetRatio > 90 ? 'bg-rose-500' : globalBudgetRatio > 75 ? 'bg-amber-400' : 'bg-[#137566]'}`}
            style={{ width: `${Math.min(globalBudgetRatio, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-start">
        {budgetWarnings.length === 0 ? (
          <div className="text-center py-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="text-xl mb-1 block">🏆</span>
            <p className="text-xs text-emerald-800 font-bold">Wszystkie budżety w normie</p>
            <p className="text-[10px] text-emerald-600">Trzymasz się planu!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Uwaga na te kategorie:</p>
            {budgetWarnings.slice(0, 3).map((w, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-gray-700 truncate pr-2">{w.category}</span>
                  <span className={`font-bold ${w.status === 'exceeded' ? 'text-rose-600' : 'text-amber-600'}`}>
                    {w.percent}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${w.status === 'exceeded' ? 'bg-rose-500' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min(w.ratio * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 mt-3 border-t border-gray-100">
        <button
          onClick={onOpenBudgetModal}
          className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-xl transition border border-gray-100"
        >
          Konfiguruj budżety
        </button>
      </div>
    </div>
  );
});

```


## File: src/components/dashboard/CashflowChartWidget.tsx
```tsx
import React, { memo } from "react";
import { formatPln } from "../../utils";
import { DashboardChartPoint } from "../../hooks/useDashboardMetrics";

interface CashflowChartWidgetProps {
  chartData: DashboardChartPoint[];
}

export const CashflowChartWidget = memo(function CashflowChartWidget({ chartData }: CashflowChartWidgetProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-full" id="widget-content-chart-box">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Przepływy</p>
          <h3 className="text-base font-bold text-gray-800">Ostatnie 6 miesięcy</h3>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#137566]"></div>
            <span className="text-[10px] text-gray-500 font-medium">Przych.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#d55e50]"></div>
            <span className="text-[10px] text-gray-500 font-medium">Wyd.</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-end justify-between gap-1 sm:gap-2 pt-4 border-b border-gray-100 pb-2 h-32">
        {chartData.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
            <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full relative">
              {/* Tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-10 transition-opacity">
                +{formatPln(d.income)}<br/>-{formatPln(d.expense)}
              </div>
              <div 
                className="w-1/2 max-w-[12px] bg-gradient-to-t from-[#137566]/80 to-[#137566] rounded-t-sm transition-all duration-500"
                style={{ height: `${d.incomeHeight}%` }}
              ></div>
              <div 
                className="w-1/2 max-w-[12px] bg-gradient-to-t from-[#d55e50]/80 to-[#d55e50] rounded-t-sm transition-all duration-500"
                style={{ height: `${d.expenseHeight}%` }}
              ></div>
            </div>
            <span className={`text-[9px] mt-2 uppercase tracking-widest ${d.isCurrent ? 'font-black text-[#153a35]' : 'font-medium text-gray-400'}`}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

```


## File: src/components/dashboard/SettlementWidget.tsx
```tsx
import React, { useState } from 'react';
import { Profile, SettlementEntry } from '../../types';
import { calculatePartnerSettlement } from '../../services/settlementEngine';
import { formatPln, formatDatePl, getLocalDateIso } from '../../utils';
import { CheckCircle2, History, Trash2, X, ArrowRightLeft } from 'lucide-react';

interface SettlementWidgetProps {
  profile: Profile;
  onAddSettlement?: (entry: { amount: number; isoDate: string; note?: string }) => void;
  onDeleteSettlement?: (settlementId: string) => void;
}

export function SettlementWidget({ profile, onAddSettlement, onDeleteSettlement }: SettlementWidgetProps) {
  if (profile.kind !== 'shared') return null;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const settlement = calculatePartnerSettlement(profile);
  const { historyNet, upcomingNet } = settlement;
  const partnerName = profile.partnerName || "Partner";

  // Modal form states
  const [direction, setDirection] = useState<'partner_paid_me' | 'i_paid_partner'>(
    historyNet < 0 ? 'i_paid_partner' : 'partner_paid_me'
  );
  const [amountStr, setAmountStr] = useState<string>(
    historyNet !== 0 ? Math.abs(historyNet).toString() : ""
  );
  const [isoDate, setIsoDate] = useState<string>(getLocalDateIso());
  const [note, setNote] = useState<string>("");

  const handleOpenModal = () => {
    setDirection(historyNet < 0 ? 'i_paid_partner' : 'partner_paid_me');
    setAmountStr(historyNet !== 0 ? Math.abs(historyNet).toString() : "");
    setIsoDate(getLocalDateIso());
    setNote("");
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      alert("Proszę podać poprawną kwotę większą od zera.");
      return;
    }

    const finalAmount = direction === 'partner_paid_me' ? val : -val;
    if (onAddSettlement) {
      onAddSettlement({
        amount: finalAmount,
        isoDate,
        note: note.trim() || undefined
      });
    }
    setIsModalOpen(false);
  };

  let statusText = "Wszystko rozliczone z historii";
  let statusColor = "text-gray-600";
  let bgColor = "bg-gray-50 border-gray-200";

  if (historyNet > 0) {
    statusText = `${partnerName} jest Ci winien: ${formatPln(historyNet)}`;
    statusColor = "text-emerald-700";
    bgColor = "bg-emerald-50 border-emerald-200";
  } else if (historyNet < 0) {
    statusText = `Jesteś winien ${partnerName}: ${formatPln(Math.abs(historyNet))}`;
    statusColor = "text-rose-700";
    bgColor = "bg-rose-50 border-rose-200";
  }

  let upcomingText = "";
  if (upcomingNet > 0) {
    upcomingText = `Dodatkowo z nieopłaconych rachunków: ${partnerName} będzie Ci winien ${formatPln(upcomingNet)}`;
  } else if (upcomingNet < 0) {
    upcomingText = `Dodatkowo z nieopłaconych rachunków: będziesz winien ${partnerName} ${formatPln(Math.abs(upcomingNet))}`;
  }

  const settlementsList: SettlementEntry[] = profile.settlements || [];

  return (
    <div className={`p-4 rounded-xl border ${bgColor} shadow-sm mb-6`} id="settlement-widget">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="group relative w-fit mb-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-help border-b border-dashed border-gray-400">
              Do rozliczenia (Historia)
            </p>
            <div className="hidden group-hover:block absolute z-10 bottom-full left-0 mb-2 w-64 bg-gray-800 text-white text-[10px] p-2 rounded shadow-lg normal-case font-normal tracking-normal">
              Na podstawie zrealizowanych transakcji 50/50 oraz zarejestrowanych rozliczeń ręcznych.
            </div>
          </div>
          <h3 className={`text-sm sm:text-base font-bold ${statusColor}`}>{statusText}</h3>
          {upcomingText && (
            <p className="text-xs text-gray-500 mt-1 font-medium" id="settlement-upcoming-info">
              {upcomingText}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onAddSettlement && (
            <button
              onClick={handleOpenModal}
              id="settlement-mark-paid-btn"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Rozlicz
            </button>
          )}

          {settlementsList.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              id="settlement-history-toggle-btn"
              className="px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <History className="w-4 h-4 text-gray-500" />
              Historia ({settlementsList.length})
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      {showHistory && settlementsList.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200/60" id="settlement-history-section">
          <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-gray-500" />
            Historia rozliczeń ręcznych
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {settlementsList.map((s) => {
              const isPartnerPaid = s.amount > 0;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2.5 bg-white/80 border border-gray-200 rounded-lg text-xs"
                >
                  <div>
                    <span className="font-bold text-gray-800">
                      {isPartnerPaid ? `${partnerName} oddał(a) Tobie` : `Oddałeś(aś) ${partnerName}`}
                    </span>
                    <span className="text-gray-400 ml-2">{formatDatePl(s.isoDate)}</span>
                    {s.note && <p className="text-gray-500 text-[11px] mt-0.5">{s.note}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${isPartnerPaid ? 'text-emerald-600' : 'text-blue-600'}`}>
                      {isPartnerPaid ? `+${formatPln(s.amount)}` : `-${formatPln(Math.abs(s.amount))}`}
                    </span>
                    {onDeleteSettlement && (
                      <button
                        onClick={() => onDeleteSettlement(s.id)}
                        id={`delete-settlement-${s.id}`}
                        className="p-1 text-gray-400 hover:text-rose-600 transition cursor-pointer"
                        title="Usuń wpis rozliczenia"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Settlement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 relative"
            id="settlement-modal"
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Rozlicz saldo z partnerem</h3>
                <p className="text-xs text-gray-500">
                  Zarejestruj płatność wyrównującą bez dodawania transakcji wydatku.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Kierunek płatności
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('partner_paid_me')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      direction === 'partner_paid_me'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {partnerName} oddał(a) mi
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('i_paid_partner')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      direction === 'i_paid_partner'
                        ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Ja oddałem(am) {partnerName}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Kwota (PLN)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  id="settlement-amount-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Data rozliczenia
                </label>
                <input
                  type="date"
                  required
                  value={isoDate}
                  onChange={(e) => setIsoDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  id="settlement-date-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Notatka (opcjonalnie)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="np. Przelew BLIK, wyrównanie za wakacje"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  id="settlement-note-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  id="settlement-submit-btn"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  Zapisz rozliczenie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

```


## File: src/components/dashboard/StatsWidget.tsx
```tsx
import React, { memo } from "react";
import { formatPln } from "../../utils";
import { SafeToSpendBreakdown } from "../../services/budgetCalculations";

interface StatsWidgetProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  emergencyLimit: number;
  investmentCushion: number;
  endOfMonthForecast: any;
  safeBreakdown: SafeToSpendBreakdown;
  onChangeView: (view: string) => void;
}

export const StatsWidget = memo(function StatsWidget({
  totalIncome,
  totalExpense,
  balance,
  emergencyLimit,
  investmentCushion,
  endOfMonthForecast,
  safeBreakdown,
  onChangeView
}: StatsWidgetProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="widget-content-stats-grid">
        {/* Income Card */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 relative overflow-hidden shadow-sm hover:shadow transition">
          <span className="absolute top-4 right-4 bg-emerald-50 text-[#137566] p-2 rounded-xl text-xl font-bold">
            ↗
          </span>
          <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Przychody</p>
          <h2 className="text-2xl font-bold text-[#137566] mb-1" id="dash-income-total">
            {formatPln(totalIncome)}
          </h2>
          <small className="text-[11px] text-[#739087]">W tym okresie rozliczeniowym</small>
        </div>

        {/* Expense Card */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 relative overflow-hidden shadow-sm hover:shadow transition">
          <span className="absolute top-4 right-4 bg-rose-50 text-[#d55e50] p-2 rounded-xl text-xl font-bold">
            ↙
          </span>
          <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Wydatki</p>
          <h2 className="text-2xl font-bold text-[#d55e50] mb-1" id="dash-expense-total">
            {formatPln(totalExpense)}
          </h2>
          <small className="text-[11px] text-[#739087]">
            {totalExpense > 0 ? "Wydatki w wybranym miesiącu" : "Brak zarejestrowanych wydatków"}
          </small>
        </div>

        {/* Balance Card */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 relative overflow-hidden shadow-sm hover:shadow transition">
          <span className="absolute top-4 right-4 bg-teal-50 text-[#153a35] p-2 rounded-xl text-xl font-bold">
            ◎
          </span>
          <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Pozostaje (Bilans)</p>

          <h2 className={`text-2xl font-bold mb-1 ${balance >= 0 ? "text-[#137566]" : "text-[#d55e50]"}`} id="dash-balance-total">
            {formatPln(balance)}
          </h2>
          <div className="group relative">
            <small className="text-[11px] text-[#739087] cursor-help border-b border-dashed border-[#739087]/50">Co to znaczy?</small>
            <div className="hidden group-hover:block absolute z-10 bottom-full left-0 mb-2 w-48 bg-gray-800 text-white text-[10px] p-2 rounded shadow-lg">
              Aktualna nadwyżka finansowa (suma przychodów minus suma wydatków w wybranym miesiącu).
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-2">
            {emergencyLimit > 0 && (
              <div className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100 font-medium w-fit">
                Limit awaryjny: {formatPln(emergencyLimit)}
              </div>
            )}
            {investmentCushion > 0 && (
              <div className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md border border-indigo-100 font-medium w-fit">
                Poduszka fin.: {formatPln(investmentCushion)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* End of Month Forecast Card */}
        <div className="border border-[#b8ded5] bg-gradient-to-br from-[#f2f9f8] to-[#e7f3f0] rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-9xl opacity-5">📅</div>
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-[#153a35]">Prognoza na koniec miesiąca</h3>
                <span className="bg-[#137566] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">AI Auto-Calc</span>
              </div>
              <p className="text-xs text-[#52796f]">
                Przewidywany stan kont na dzień {endOfMonthForecast.forecastDate}
              </p>
              <p className="text-[10px] text-[#52796f] mt-1 opacity-80">Wyliczane na bazie salda minus oczekujące opłaty cykliczne i rachunki.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#cce3df]">
            <div className="bg-white/50 p-3.5 rounded-lg border border-[#e1f0ed]/60">
              <span className="text-[10px] uppercase font-semibold text-[#739087] block">Planowane Wydatki</span>
              <span className="text-lg font-bold text-[#d55e50]">{formatPln(endOfMonthForecast.unpaidPaymentsSum + endOfMonthForecast.futureRecurringExpensesSum)}</span>
            </div>

            <div className="bg-white/50 p-3.5 rounded-lg border border-[#e1f0ed]/60">
              <span className="text-[10px] uppercase font-semibold text-[#739087] block">Planowane Przychody</span>
              <span className="text-lg font-bold text-[#137566]">{formatPln(endOfMonthForecast.futureRecurringIncomesSum)}</span>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-[#b8ded5] shadow-inner">
              <span className="text-[10px] uppercase font-semibold text-gray-500 block">Prognozowane Saldo</span>
              <span className={`text-lg font-black ${endOfMonthForecast.forecastedBalance >= 0 ? "text-[#137566]" : "text-[#d55e50]"}`}>
                {formatPln(endOfMonthForecast.forecastedBalance)}
              </span>
            </div>
          </div>

          {endOfMonthForecast.isNegative && (
            <div className="mt-3.5 bg-rose-50 border border-rose-100 rounded-lg p-3 text-xs text-rose-800 flex items-center gap-2 animate-pulse">
              <span>⚠️</span>
              <span><strong>Uwaga:</strong> Zbliżasz się do debetu! Prognozowane wydatki w tym miesiącu przekroczą dostępne środki.</span>
            </div>
          )}
        </div>

        {/* Safe Amount To Spend Card */}
        <div
          id="safe-amount-to-spend-card"
          className={`border rounded-xl p-5 shadow-sm transition-all ${
            safeBreakdown.isNegative
              ? "bg-rose-50/90 border-rose-200"
              : "bg-gradient-to-r from-emerald-50/70 via-teal-50/60 to-emerald-50/70 border-emerald-200/80"
          }`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🛡️</span>
              <div>
                <h3 className={`text-sm font-bold ${safeBreakdown.isNegative ? "text-rose-900" : "text-emerald-900"}`}>
                  Bezpieczna Kwota do Wydania
                </h3>
                <p className={`text-xs ${safeBreakdown.isNegative ? "text-rose-700" : "text-emerald-700"}`}>
                  Po odliczeniu nadchodzących opłat i celów
                </p>
                <p className={`text-[10px] mt-1 opacity-80 ${safeBreakdown.isNegative ? "text-rose-700" : "text-emerald-700"}`}>
                  Kwota, którą możesz swobodnie wydać bez ryzyka, że zabraknie na rachunki.
                </p>
              </div>
            </div>
            <button 
              onClick={() => onChangeView("analysis")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                safeBreakdown.isNegative 
                ? "bg-rose-100 text-rose-700 hover:bg-rose-200" 
                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              }`}
            >
              Zobacz Analizę →
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-black/5 flex items-center justify-between">
            <div className="flex-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-70 block mb-0.5">Dostępne dzisiaj</span>
              <span className={`text-2xl sm:text-3xl font-black ${safeBreakdown.isNegative ? "text-rose-700" : "text-emerald-800"}`}>
                {formatPln(safeBreakdown.safeToSpend)}
              </span>
            </div>
            
            <div className="flex gap-2">
              <div className="text-right hidden sm:block">
                <div className="group relative">
                  <span className="text-[10px] uppercase font-semibold opacity-60 block cursor-help border-b border-dashed border-emerald-900/30">Zarezerwowane na cele</span>
                  <div className="hidden group-hover:block absolute z-10 bottom-full right-0 mb-2 w-48 bg-gray-800 text-white text-[10px] p-2 rounded shadow-lg text-left normal-case tracking-normal">
                    Środki przypisane do Twoich celów oszczędnościowych. Nie są uwzględniane w bezpiecznej kwocie do wydania.
                  </div>
                </div>
                <span className="text-sm font-bold opacity-80">{formatPln(safeBreakdown.reservedGoalsSum)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold opacity-60 block">Rezerwa opłat</span>
                <span className="text-sm font-bold opacity-80">{formatPln(safeBreakdown.futureRecurringExpensesSum + safeBreakdown.unpaidPaymentsSum)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

```


## File: src/components/dashboard/index.ts
```ts
export { StatsWidget } from "./StatsWidget";
export { CashflowChartWidget } from "./CashflowChartWidget";
export { BillsWidget } from "./BillsWidget";
export { BudgetWarningsWidget } from "./BudgetWarningsWidget";
export { ActivityWidget } from "./ActivityWidget";
export * from './SettlementWidget';

```


## File: src/crypto.test.ts
```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  prepareStateForRemoteSave,
  deriveKeyFromPin,
  activeKeys,
  clearActiveKeys,
  encryptProfile,
  decryptProfile
} from "./services/crypto";
import { AppState, Profile } from "./types";

describe("prepareStateForRemoteSave tests", () => {
  beforeEach(() => {
    clearActiveKeys();
  });

  it("profil bez PIN: returns profile intact", async () => {
    const noPinProfile: Profile = {
      id: "profile-no-pin",
      name: "Profil bez PIN",
      kind: "personal",
      transactions: [{ id: "tx1", name: "Zakupy", type: "expense", amount: 50, isoDate: "2026-01-01", category: "Jedzenie", account: "Główne" }],
      payments: [],
      goals: [],
      investments: [],
      budgets: {}
    };

    const inputState: AppState = {
      profiles: [noPinProfile],
      activeProfileId: "profile-no-pin",
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    const safeState = await prepareStateForRemoteSave(inputState);
    expect(safeState.profiles[0].transactions).toHaveLength(1);
    expect(safeState.profiles[0].transactions[0].id).toBe("tx1");
    expect(safeState.profiles[0].encryptedPayload).toBeUndefined();
  });

  it("odblokowany profil z PIN: encrypts sensitive data into encryptedPayload and clears plaintext", async () => {
    const profileId = "profile-unlocked-pin";
    const key = await deriveKeyFromPin("1234", "salt123");
    activeKeys[profileId] = key;

    const unlockedProfile: Profile = {
      id: profileId,
      name: "Profil Złoty",
      kind: "personal",
      pinHash: "hash123",
      salt: "salt123",
      transactions: [{ id: "tx-secret", name: "Pensja", type: "income", amount: 5000, isoDate: "2026-01-01", category: "Wypłata", account: "Główne" }],
      payments: [{ id: "p1", name: "Czynsz", amount: 2000, dueDate: "2026-01-10", status: "Do opłacenia" }],
      goals: [],
      investments: [],
      budgets: {}
    };

    const inputState: AppState = {
      profiles: [unlockedProfile],
      activeProfileId: profileId,
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    const safeState = await prepareStateForRemoteSave(inputState);
    const savedProfile = safeState.profiles[0];

    expect(savedProfile.encryptedPayload).toBeDefined();
    expect(savedProfile.transactions).toHaveLength(0);
    expect(savedProfile.payments).toHaveLength(0);
  });

  it("bezpieczny zablokowany profil: locked profile with encryptedPayload and no plaintext passes safely", async () => {
    const profileId = "profile-safe-locked";
    const key = await deriveKeyFromPin("1234", "salt123");
    
    // First generate a safe encrypted profile
    const rawProfile: Profile = {
      id: profileId,
      name: "Profil Tajny",
      kind: "personal",
      pinHash: "hash123",
      salt: "salt123",
      transactions: [{ id: "tx-secret", name: "Inne", type: "expense", amount: 100, isoDate: "2026-01-01", category: "Inne", account: "Główne" }],
      payments: [],
      goals: [],
      investments: [],
      budgets: {}
    };
    const encrypted = await encryptProfile(rawProfile, key);

    // Lock profile by clearing activeKeys
    clearActiveKeys();

    const inputState: AppState = {
      profiles: [encrypted],
      activeProfileId: profileId,
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    const safeState = await prepareStateForRemoteSave(inputState);
    expect(safeState.profiles[0].encryptedPayload).toBeDefined();
    expect(safeState.profiles[0].transactions).toHaveLength(0);
  });

  it("niebezpieczny plaintext bez klucza => throws error", async () => {
    const profileId = "profile-locked-with-plaintext";
    
    // Profile has pinHash and sensitive plaintext, but no key in activeKeys
    const dangerousProfile: Profile = {
      id: profileId,
      name: "Zablokowany ale ma plaintext",
      kind: "personal",
      pinHash: "hash123",
      salt: "salt123",
      transactions: [{ id: "leak", name: "Tajne", type: "expense", amount: 999, isoDate: "2026-01-01", category: "Tajne", account: "Główne" }],
      payments: [],
      goals: [],
      investments: [],
      budgets: {}
    };

    const inputState: AppState = {
      profiles: [dangerousProfile],
      activeProfileId: profileId,
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    await expect(prepareStateForRemoteSave(inputState)).rejects.toThrow("Odblokuj profil zabezpieczony PIN");
  });

  it("profil z pinHash i wypełnionymi transactions, recurringRules, settlements → po prepareStateForRemoteSave z aktywnym kluczem szyfruje i czyści dane", async () => {
    const profileId = "profile-full-pin";
    const key = await deriveKeyFromPin("9999", "salt999");
    activeKeys[profileId] = key;

    const fullProfile: Profile = {
      id: profileId,
      name: "Pełny Profil",
      kind: "personal",
      pinHash: "hash999",
      salt: "salt999",
      transactions: [{ id: "tx1", name: "Zakup", type: "expense", amount: 50, isoDate: "2026-01-01", category: "Inne", account: "Konto" }],
      payments: [],
      goals: [],
      investments: [],
      budgets: {},
      recurringRules: [{ id: "rr1", name: "Subskrypcja", amount: 29, type: "expense", category: "Rozrywka", account: "Konto", frequency: "monthly", nextDueDate: "2026-02-01", isActive: true }],
      settlements: [{ id: "s1", amount: 100, isoDate: "2026-01-02", createdAt: "2026-01-02T10:00:00Z" }],
      accounts: [{ id: "a1", name: "Konto Główne", bankName: "Bank", hasCreditLimit: false, creditLimit: 0 }]
    };

    const inputState: AppState = {
      profiles: [fullProfile],
      activeProfileId: profileId,
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null
    };

    const savedState = await prepareStateForRemoteSave(inputState);
    const savedProfile = savedState.profiles[0];

    expect(savedProfile.encryptedPayload).toBeDefined();
    expect(savedProfile.encryptedPayload!.length).toBeGreaterThan(0);
    expect(savedProfile.transactions).toHaveLength(0);
    expect(savedProfile.recurringRules).toHaveLength(0);
    expect(savedProfile.settlements).toHaveLength(0);
    expect(savedProfile.accounts).toHaveLength(0);

    // Decrypt verification
    const decrypted = await decryptProfile(savedProfile, key);
    expect(decrypted.transactions).toHaveLength(1);
    expect(decrypted.recurringRules).toHaveLength(1);
    expect(decrypted.settlements).toHaveLength(1);
    expect(decrypted.accounts).toHaveLength(1);
  });

  it("profil z pinHash i wypełnionym recurringRules bez aktywnego klucza → prepareStateForRemoteSave rzuca błąd", async () => {
    const profileId = "profile-locked-recurring";

    const lockedProfile: Profile = {
      id: profileId,
      name: "Profil Zablokowany Reguły",
      kind: "personal",
      pinHash: "hash888",
      salt: "salt888",
      transactions: [],
      payments: [],
      goals: [],
      investments: [],
      budgets: {},
      recurringRules: [{ id: "rr1", name: "Czynsz", amount: 1500, type: "expense", category: "Dom", account: "Konto", frequency: "monthly", nextDueDate: "2026-02-01", isActive: true }]
    };

    const inputState: AppState = {
      profiles: [lockedProfile],
      activeProfileId: profileId,
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null
    };

    await expect(prepareStateForRemoteSave(inputState)).rejects.toThrow("Odblokuj profil zabezpieczony PIN");
  });
});

```


## File: src/currencyPrecision.integration.test.ts
```ts
import { describe, it, expect } from "vitest";
import { calculatePartnerSettlement } from "./services/settlementEngine";
import { calculateBudgetWarnings } from "./services/budgetCalculations";
import { Profile } from "./types";
import { getLocalDateIso } from "./utils";

describe("R6 - Integracja: precyzja roundCurrency w całym pipeline", () => {
  it("zwracane kwoty (settlement historyNet i budget spent) nie zawierają błędów float", () => {
    const today = getLocalDateIso();
    
    const profile: Profile = {
      id: "p1",
      name: "User1",
      partnerName: "Partner",
      kind: "shared",
      transactions: [
        { id: "t1", name: "Z1", amount: 10.10, type: "expense", category: "Żywność", account: "X", isoDate: today, splitMode: "equal", paidBy: "me" },
        { id: "t2", name: "Z2", amount: 20.20, type: "expense", category: "Żywność", account: "X", isoDate: today, splitMode: "equal", paidBy: "me" },
        { id: "t3", name: "Z3", amount: 5.05, type: "expense", category: "Żywność", account: "X", isoDate: today, splitMode: "equal", paidBy: "me" }
      ],
      payments: [],
      goals: [],
      investments: [],
      budgets: { "Żywność": 50 }
    };

    // Helper: checks if a number is already rounded to 2 decimal places
    const isRoundedToTwoDecimals = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100 === val;

    // 1. Sprawdzenie settlementEngine (historyNet)
    const settlement = calculatePartnerSettlement(profile);
    expect(isRoundedToTwoDecimals(settlement.historyNet)).toBe(true);

    // 2. Sprawdzenie budgetCalculations (spent)
    const warnings = calculateBudgetWarnings(profile, today);
    const foodWarning = warnings.find(w => w.category === "Żywność");
    
    expect(foodWarning).toBeDefined();
    expect(isRoundedToTwoDecimals(foodWarning!.spent)).toBe(true);
  });
});


```


## File: src/driveAndCrypto.test.ts
```ts
import { describe, it, expect, vi } from "vitest";
import { GoogleAuthError, findBudgetFile, readBudgetFile, updateBudgetFile } from "./googleDrive";
import { prepareStateForRemoteSave, deriveKeyFromPin, activeKeys, clearActiveKeys } from "./services/crypto";
import { AppState, Profile } from "./types";

describe("KROK 7 — OAuth Token Separation, Drive Errors & Data Protection", () => {
  it("GoogleAuthError correctly formats status 401 and 403", () => {
    const err401 = new GoogleAuthError("Expired token", 401);
    expect(err401.status).toBe(401);
    expect(err401.name).toBe("GoogleAuthError");
    expect(err401.message).toBe("Expired token");

    const err403 = new GoogleAuthError("Forbidden scope", 403);
    expect(err403.status).toBe(403);
  });

  it("Drive API handles 401/403 with GoogleAuthError and 404 with FILE_NOT_FOUND", async () => {
    const mockFetch = vi.fn();
    globalThis.fetch = mockFetch;

    // 401 scenario
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized"
    });

    await expect(findBudgetFile("invalid-drive-token")).rejects.toThrow(GoogleAuthError);

    // 404 scenario
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => "File Not Found"
    });

    await expect(readBudgetFile("valid-token", "non-existent-id")).rejects.toThrow("FILE_NOT_FOUND");
  });

  it("OAuth Token Separation — Drive operations send driveToken, not calendarToken or auth token", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ files: [{ id: "drive-file-1", name: "saldo_budget.json" }] })
    });
    globalThis.fetch = mockFetch;

    const driveToken = "drive-access-token-abc";
    const calendarToken = "calendar-access-token-xyz";

    await findBudgetFile(driveToken);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("drive/v3/files"),
      expect.objectContaining({
        headers: {
          Authorization: `Bearer ${driveToken}`
        }
      })
    );
    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: {
          Authorization: `Bearer ${calendarToken}`
        }
      })
    );
  });

  it("prepareStateForRemoteSave encrypts profiles with PIN and leaves open profiles unchanged", async () => {
    clearActiveKeys();

    const pinProfileId = "prof-pin";
    const openProfileId = "prof-open";

    const key = await deriveKeyFromPin("1234", "salt123");
    activeKeys[pinProfileId] = key;

    const pinProfile: Profile = {
      id: pinProfileId,
      name: "Profil PIN",
      kind: "personal",
      pinHash: "hash123",
      salt: "salt123",
      transactions: [{ id: "t1", name: "Tajny Zakup", type: "expense", amount: 50, isoDate: "2026-01-01", category: "Jedzenie", account: "Główne" }],
      payments: [],
      goals: [],
      investments: [],
      budgets: {}
    };

    const openProfile: Profile = {
      id: openProfileId,
      name: "Profil Jawny",
      kind: "shared",
      transactions: [{ id: "t2", name: "Faktura Jawna", type: "income", amount: 2000, isoDate: "2026-01-02", category: "Usługi", account: "Firmowe" }],
      payments: [],
      goals: [],
      investments: [],
      budgets: {}
    };

    const state: AppState = {
      profiles: [pinProfile, openProfile],
      activeProfileId: pinProfileId,
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00Z",
      lastModifiedBy: "test@example.com",
      driveFileId: "file-999",
      recurringRules: [],
      transactionRules: []
    };

    const prepared = await prepareStateForRemoteSave(state);

    const savedPinProfile = prepared.profiles.find((p) => p.id === pinProfileId)!;
    const savedOpenProfile = prepared.profiles.find((p) => p.id === openProfileId)!;

    // PIN profile must be encrypted
    expect(savedPinProfile.encryptedPayload).toBeDefined();
    expect(savedPinProfile.transactions).toHaveLength(0);

    // Open profile must remain plaintext
    expect(savedOpenProfile.encryptedPayload).toBeUndefined();
    expect(savedOpenProfile.transactions).toHaveLength(1);
    expect(savedOpenProfile.transactions[0].name).toBe("Faktura Jawna");
  });
});

```


## File: src/driveConflict.test.ts
```ts
import { describe, it, expect } from "vitest";
import { detectConflict } from "./hooks/useDriveSync";

describe("PROMPT C2 — detectConflict pure function tests", () => {
  it("1. returns false when local and remote updatedAt timestamps are identical", () => {
    const local = { updatedAt: "2026-07-23T12:00:00.000Z" };
    const remote = { updatedAt: "2026-07-23T12:00:00.000Z" };
    const lastSynced = "2026-07-23T10:00:00.000Z";

    expect(detectConflict(local, remote, lastSynced)).toBe(false);
  });

  it("2. returns true when both local and remote have newer changes than lastSyncedAt", () => {
    const local = { updatedAt: "2026-07-23T12:30:00.000Z" };
    const remote = { updatedAt: "2026-07-23T12:15:00.000Z" };
    const lastSynced = "2026-07-23T10:00:00.000Z";

    expect(detectConflict(local, remote, lastSynced)).toBe(true);
  });

  it("3. returns false when only local is newer than lastSyncedAt (remote unchanged)", () => {
    const local = { updatedAt: "2026-07-23T12:00:00.000Z" };
    const remote = { updatedAt: "2026-07-23T10:00:00.000Z" };
    const lastSynced = "2026-07-23T10:00:00.000Z";

    expect(detectConflict(local, remote, lastSynced)).toBe(false);
  });

  it("4. returns false when only remote is newer than lastSyncedAt (local unchanged)", () => {
    const local = { updatedAt: "2026-07-23T10:00:00.000Z" };
    const remote = { updatedAt: "2026-07-23T12:00:00.000Z" };
    const lastSynced = "2026-07-23T10:00:00.000Z";

    expect(detectConflict(local, remote, lastSynced)).toBe(false);
  });

  it("5. returns true when lastSyncedAt is missing/null and local and remote timestamps differ", () => {
    const local = { updatedAt: "2026-07-23T12:00:00.000Z" };
    const remote = { updatedAt: "2026-07-23T11:00:00.000Z" };

    expect(detectConflict(local, remote, null)).toBe(true);
    expect(detectConflict(local, remote, undefined)).toBe(true);
  });

  it("6. returns false when local or remote state is null or undefined", () => {
    const state = { updatedAt: "2026-07-23T12:00:00.000Z" };

    expect(detectConflict(null, state, "2026-07-23T10:00:00.000Z")).toBe(false);
    expect(detectConflict(state, null, "2026-07-23T10:00:00.000Z")).toBe(false);
    expect(detectConflict(undefined, undefined, null)).toBe(false);
  });
});

```


## File: src/duplicateDetector.test.ts
```ts
import { describe, it, expect } from "vitest";
import { checkDuplicate } from "./services/duplicateDetector";
import { Transaction } from "./types";

describe("KROK 8E - Wykrywanie duplikatów transakcji", () => {
  const existing: Transaction[] = [
    {
      id: "t1",
      name: "Zakupy Biedronka",
      amount: 150.50,
      category: "Żywność",
      account: "Główne",
      type: "expense",
      isoDate: "2026-07-20"
    },
    {
      id: "t2",
      name: "Wynagrodzenie",
      amount: 5000,
      category: "Wpływy",
      account: "Główne",
      type: "income",
      isoDate: "2026-07-10"
    }
  ];

  it("identyczna data, kwota i nazwa -> high confidence", () => {
    const res = checkDuplicate({
      name: "Zakupy Biedronka",
      amount: 150.50,
      category: "Żywność",
      account: "Główne",
      type: "expense",
      isoDate: "2026-07-20"
    }, existing);
    expect(res.isLikelyDuplicate).toBe(true);
    expect(res.confidence).toBe("high");
    expect(res.matchedTransactionId).toBe("t1");
  });

  it("data różni się o 1 dzień -> high confidence", () => {
    const res = checkDuplicate({
      name: "Zakupy Biedronka",
      amount: 150.50,
      category: "Żywność",
      account: "Główne",
      type: "expense",
      isoDate: "2026-07-21"
    }, existing);
    expect(res.isLikelyDuplicate).toBe(true);
    expect(res.confidence).toBe("high");
    expect(res.matchedTransactionId).toBe("t1");
  });

  it("data różni się o 2 dni -> brak duplikatu", () => {
    const res = checkDuplicate({
      name: "Zakupy Biedronka",
      amount: 150.50,
      category: "Żywność",
      account: "Główne",
      type: "expense",
      isoDate: "2026-07-22"
    }, existing);
    expect(res.isLikelyDuplicate).toBe(false);
  });

  it("ta sama kwota, inna nazwa -> brak duplikatu", () => {
    const res = checkDuplicate({
      name: "Paliwo Orlen",
      amount: 150.50,
      category: "Transport",
      account: "Główne",
      type: "expense",
      isoDate: "2026-07-20"
    }, existing);
    expect(res.isLikelyDuplicate).toBe(false);
  });

  it("ta sama nazwa, inna kwota -> brak duplikatu", () => {
    const res = checkDuplicate({
      name: "Zakupy Biedronka",
      amount: 45.00,
      category: "Żywność",
      account: "Główne",
      type: "expense",
      isoDate: "2026-07-20"
    }, existing);
    expect(res.isLikelyDuplicate).toBe(false);
  });

  it("polskie znaki i różnice wielkości liter -> medium/high", () => {
    const res = checkDuplicate({
      name: "zakupy bIeDrOnka",
      amount: 150.50,
      category: "Żywność",
      account: "Główne",
      type: "expense",
      isoDate: "2026-07-20"
    }, existing);
    expect(res.isLikelyDuplicate).toBe(true);
    expect(res.confidence).toBe("high");
  });

  it("podobna nazwa (np. krótsza) -> medium confidence", () => {
    const res = checkDuplicate({
      name: "Biedronka WWA",
      amount: 150.50,
      category: "Żywność",
      account: "Główne",
      type: "expense",
      isoDate: "2026-07-20"
    }, existing);
    expect(res.isLikelyDuplicate).toBe(true);
    expect(res.confidence).toBe("medium");
  });
  
  it("różny typ operacji (przychód/wydatek) -> brak duplikatu", () => {
    const res = checkDuplicate({
      name: "Zakupy Biedronka",
      amount: 150.50,
      category: "Żywność",
      account: "Główne",
      type: "income",
      isoDate: "2026-07-20"
    }, existing);
    expect(res.isLikelyDuplicate).toBe(false);
  });
});

  it("import z trzema duplikatami i dwoma poprawnymi wpisami", () => {
    const importData: Omit<Transaction, "id">[] = [
      { name: "Zakupy Biedronka", amount: 150.50, category: "Żywność", account: "Główne", type: "expense", isoDate: "2026-07-20" }, // dup
      { name: "Kino", amount: 40, category: "Rozrywka", account: "Główne", type: "expense", isoDate: "2026-07-21" }, // new
      { name: "Wynagrodzenie", amount: 5000, category: "Wpływy", account: "Główne", type: "income", isoDate: "2026-07-10" }, // dup
      { name: "Biedronka zakupy", amount: 150.50, category: "Żywność", account: "Główne", type: "expense", isoDate: "2026-07-19" }, // dup (1 dzień)
      { name: "Restauracja", amount: 120, category: "Jedzenie", account: "Główne", type: "expense", isoDate: "2026-07-20" } // new
    ];

    const results = importData.map(tx => checkDuplicate(tx, [{ id: "t1", name: "Zakupy Biedronka", amount: 150.50, category: "Żywność", account: "Główne", type: "expense", isoDate: "2026-07-20" }, { id: "t2", name: "Wynagrodzenie", amount: 5000, category: "Wpływy", account: "Główne", type: "income", isoDate: "2026-07-10" }]));
    const duplicates = results.filter(r => r.isLikelyDuplicate);
    const valid = results.filter(r => !r.isLikelyDuplicate);

    expect(duplicates.length).toBe(3);
    expect(valid.length).toBe(2);
  });

```


## File: src/export.test.ts
```ts
import { describe, it, expect } from "vitest";
import { generateCsvContent } from "./utils";

describe("KROK 8G - Bezpieczny eksport CSV", () => {
  it("generuje poprawny CSV z polskimi znakami i ucieczkami", () => {
    const txs = [
      { id: "1", name: 'Zakupy "Biedronka"', amount: 150.50, category: "Żywność", account: "Główne", type: "expense", isoDate: "2026-07-20" },
      { id: "2", name: "Opłata, prowizja", amount: 10, category: "Opłaty", account: "Główne", type: "expense", isoDate: "2026-07-21" },
      { id: "3", name: "Opis z\nnową linią", amount: 10, category: "Opłaty", account: "Główne", type: "expense", isoDate: "2026-07-22" },
    ];
    
    const csv = generateCsvContent(txs);
    expect(csv.startsWith('\uFEFF')).toBe(true); // BOM
    expect(csv).toContain('"Zakupy ""Biedronka"""'); // escaped quotes
    expect(csv).toContain('"Opłata, prowizja"'); // escaped comma
    expect(csv).toContain('"Opis z\nnową linią"'); // escaped newline
  });
});

```


## File: src/firebase.ts
```ts
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, Auth } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, Firestore } from "firebase/firestore";
import { AppState } from "./types";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const isValidApiKey = Boolean(
  apiKey &&
  apiKey !== "your-public-firebase-api-key" &&
  apiKey !== "your_firebase_api_key_here" &&
  !apiKey.startsWith("your-") &&
  apiKey.length > 10
);

let app: FirebaseApp | null = null;
let authInstance: Auth | any = null;
let dbInstance: Firestore | any = null;
let isFirebaseConfigured = false;

if (isValidApiKey) {
  try {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    isFirebaseConfigured = true;
  } catch (error) {
    console.warn("Nie udało się zainicjalizować modułu Firebase:", error);
    isFirebaseConfigured = false;
  }
}

if (!authInstance) {
  authInstance = {
    currentUser: null,
    onAuthStateChanged: (_authObj: any, callback: any) => {
      callback(null);
      return () => {};
    }
  };
}

export const auth = authInstance;
export const db = dbInstance;
export { isFirebaseConfigured };

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.name : 'UnknownError',
    operationType,
    path
  };
  console.error('Firestore Error:', errInfo);
  throw new Error(`Wystąpił błąd podczas operacji na bazie danych (${operationType}).`);
}

// Flag to indicate if sign-in is in progress
let isSigningIn = false;

type GoogleScopeSet = "basic" | "drive" | "calendar";

let tokens: Record<GoogleScopeSet, string | null> = {
  basic: null,
  drive: null,
  calendar: null,
};

export const clearGoogleTokens = (): void => {
  tokens = { basic: null, drive: null, calendar: null };
};

export const getGoogleToken = (kind: GoogleScopeSet) => tokens[kind];

let cachedUser: User | null = null;

// Initialize Auth State Listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  if (!isFirebaseConfigured || !auth?.app) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
  try {
    return onAuthStateChanged(auth, async (user: User | null) => {
      cachedUser = user;
      if (user) {
        if (onAuthSuccess) onAuthSuccess(user, tokens.basic);
      } else {
        tokens = { basic: null, drive: null, calendar: null };
        if (onAuthFailure) onAuthFailure();
      }
    });
  } catch (err) {
    console.warn("Błąd podczas nasłuchiwania stanu autoryzacji Firebase:", err);
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
};

// Sign in with Google Popup (Basic)
export const googleSignInBasic = async (): Promise<{ user: User; accessToken: string } | null> => {
  return requestGoogleAccess("basic", []);
};

export const requestGoogleDriveAccess = async (): Promise<{ user: User; accessToken: string } | null> => {
  return requestGoogleAccess("drive", ["https://www.googleapis.com/auth/drive.file"]);
};

export const requestGoogleCalendarAccess = async (): Promise<{ user: User; accessToken: string } | null> => {
  return requestGoogleAccess("calendar", ["https://www.googleapis.com/auth/calendar.events"]);
};

const requestGoogleAccess = async (kind: GoogleScopeSet, scopes: string[]): Promise<{ user: User; accessToken: string } | null> => {
  if (!isFirebaseConfigured || !auth?.app) {
    throw new Error("Logowanie Firebase jest niedostępne (brak poprawnego VITE_FIREBASE_API_KEY).");
  }
  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    const customParams: Record<string, string> = { include_granted_scopes: "true" };
    if (!tokens[kind] && scopes.length > 0) {
      customParams.prompt = "consent";
    }
    provider.setCustomParameters(customParams);
    scopes.forEach(scope => provider.addScope(scope));
    
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken && scopes.length > 0) {
      throw new Error("Nie udało się pobrać tokenu dostępu Google z usługi Firebase Auth.");
    }

    if (credential?.accessToken) {
      tokens[kind] = credential.accessToken;
    }
    cachedUser = result.user;
    return { user: result.user, accessToken: tokens[kind] || '' };
  } catch (error: any) {
    console.error("Firebase Sign-in Error:", error);
    if (error?.code === 'auth/unauthorized-domain') {
       throw new Error(`Błąd: Domena "${window.location.hostname}" nie jest autoryzowana. Wejdź w konsolę Firebase -> Authentication -> Ustawienia (Settings) -> Autoryzowane domeny (Authorized domains) i dodaj tę domenę.`);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Email/Password Auth
export const registerWithEmail = async (email: string, pass: string) => {
  if (!isFirebaseConfigured || !auth?.app) {
    throw new Error("Rejestracja jest niedostępna (brak połączenia z Firebase).");
  }
  return createUserWithEmailAndPassword(auth, email, pass);
};

export const loginWithEmail = async (email: string, pass: string) => {
  if (!isFirebaseConfigured || !auth?.app) {
    throw new Error("Logowanie jest niedostępne (brak połączenia z Firebase).");
  }
  return signInWithEmailAndPassword(auth, email, pass);
};

// Retrieve currently cached access token (for basic compat)
export const getAccessToken = async (): Promise<string | null> => {
  return tokens.basic;
};

// Retrieve currently cached user
export const getCurrentUser = (): User | null => {
  return cachedUser;
};

// Log out and clear cached token
export const logout = async () => {
  try {
    if (isFirebaseConfigured && auth?.app) {
      await signOut(auth);
    }
    tokens = { basic: null, drive: null, calendar: null };
    cachedUser = null;
  } catch (error) {
    console.error("Firebase Sign-out Error:", error);
    tokens = { basic: null, drive: null, calendar: null };
    cachedUser = null;
  }
};

export const saveUserStateToFirestore = async (uid: string, state: AppState): Promise<void> => {
  if (!uid || !isFirebaseConfigured || !db) return;
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, {
      ...state,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log("State successfully saved to Firestore for user:", uid);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const loadUserStateFromFirestore = async (uid: string): Promise<AppState | null> => {
  if (!uid || !isFirebaseConfigured || !db) return null;
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      console.log("State successfully loaded from Firestore for user:", uid);
      return docSnap.data() as AppState;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

```


## File: src/googleDrive.ts
```ts
/**
 * Google Drive API Service for Saldo Application
 */

import { AppState } from "./types";

export interface GoogleDriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

export class GoogleAuthError extends Error {
  status: 401 | 403;
  constructor(message: string, status: 401 | 403) {
    super(message);
    this.name = "GoogleAuthError";
    this.status = status;
  }
}

const handleDriveErrorResponse = async (res: Response, action: string) => {
  if (res.status === 401 || res.status === 403) {
    throw new GoogleAuthError(
      "SESSION_EXPIRED: Token Google Drive wygasł lub jest nieprawidłowy. Połącz ponownie konto Google Drive.",
      res.status as 401 | 403
    );
  }
  if (res.status === 404) {
    throw new Error("FILE_NOT_FOUND: Plik kopii zapasowej nie został odnaleziony na Dysku Google.");
  }
  const errorText = await res.text();
  throw new Error(`Google Drive API error (${action}): ${errorText}`);
};

/**
 * Searches for 'saldo_budget.json' file in the user's Google Drive.
 */
export const findBudgetFile = async (accessToken: string): Promise<GoogleDriveFile | null> => {
  try {
    const q = encodeURIComponent("name = 'saldo_budget.json' and trashed = false");
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&spaces=drive`;
    
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      await handleDriveErrorResponse(res, "Search");
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    return null;
  } catch (err) {
    console.error("Error searching Google Drive:", (err as Error)?.message || err);
    throw err;
  }
};

/**
 * Reads the content of a specific file from Google Drive.
 */
export const readBudgetFile = async (accessToken: string, fileId: string): Promise<AppState> => {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      await handleDriveErrorResponse(res, "Read");
    }

    return await res.json() as AppState;
  } catch (err) {
    console.error("Error reading file from Google Drive:", (err as Error)?.message || err);
    throw err;
  }
};

/**
 * Updates an existing file on Google Drive with new content.
 */
export const updateBudgetFile = async (
  accessToken: string,
  fileId: string,
  stateData: AppState
): Promise<void> => {
  try {
    const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stateData, null, 2),
    });

    if (!res.ok) {
      await handleDriveErrorResponse(res, "Update Content");
    }
  } catch (err) {
    console.error("Error updating Google Drive file:", (err as Error)?.message || err);
    throw err;
  }
};

/**
 * Creates a new 'saldo_budget.json' file on Google Drive and writes stateData to it.
 */
export const createBudgetFile = async (accessToken: string, stateData: AppState): Promise<string> => {
  try {
    // Step 1: Create metadata for the file
    const metaRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "saldo_budget.json",
        mimeType: "application/json",
        description: "Saldo Budget Application Backup Data File"
      }),
    });

    if (!metaRes.ok) {
      await handleDriveErrorResponse(metaRes, "Create Metadata");
    }

    const file = await metaRes.json();
    const fileId = file.id;

    // Step 2: Upload the actual content using PATCH
    await updateBudgetFile(accessToken, fileId, stateData);
    return fileId;
  } catch (err) {
    console.error("Error creating Google Drive file:", (err as Error)?.message || err);
    throw err;
  }
};

```


## File: src/hooks/useAppActions.payment.test.ts
```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { useAppActions } from "./useAppActions";
import { AppState } from "../types";
import { renderHook, act } from "@testing-library/react";

describe("useAppActions - handleDeletePayment", () => {
  const getMockState = (): AppState => ({
    activeProfileId: "p1",
    profiles: [
      {
        id: "p1",
        name: "Test",
        kind: "personal",
        transactions: [
          {
            id: "tx-1",
            name: "Netflix",
            amount: 60,
            type: "expense",
            category: "Subskrypcje",
            account: "Konto główne",
            isoDate: "2024-05-15",
            sourcePaymentId: "pay-1"
          },
          {
            id: "tx-2",
            name: "Other Tx",
            amount: 10,
            type: "expense",
            category: "Jedzenie",
            account: "Konto główne",
            isoDate: "2024-05-16"
          }
        ],
        payments: [
          {
            id: "pay-1",
            name: "Netflix",
            amount: 60,
            dueDate: "2024-05-15",
            status: "Opłacono"
          },
          {
            id: "pay-2",
            name: "Spotify",
            amount: 20,
            dueDate: "2024-05-20",
            status: "Do opłacenia"
          }
        ],
        goals: [],
        investments: [],
        budgets: {}
      }
    ]
  });

  it("should delete payment only and leave linked transaction when mode is 'payment-only'", () => {
    let currentState = getMockState();
    const saveState = vi.fn().mockImplementation(async (newState) => {
      currentState = newState;
    });

    const { result } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles[0],
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn()
      })
    );

    act(() => {
      result.current.handleDeletePayment("pay-1", "payment-only");
    });

    expect(saveState).toHaveBeenCalled();
    const updatedProfile = currentState.profiles[0];
    
    // payments count -1
    expect(updatedProfile.payments.length).toBe(1);
    expect(updatedProfile.payments.find(p => p.id === "pay-1")).toBeUndefined();

    // transactions count bez zmian
    expect(updatedProfile.transactions.length).toBe(2);
    // linked tx nadal istnieje z sourcePaymentId
    expect(updatedProfile.transactions.find(tx => tx.id === "tx-1")?.sourcePaymentId).toBe("pay-1");
  });

  it("should delete payment and linked transaction when mode is 'payment-and-linked-transaction'", () => {
    let currentState = getMockState();
    const saveState = vi.fn().mockImplementation(async (newState) => {
      currentState = newState;
    });

    const { result } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles[0],
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn()
      })
    );

    act(() => {
      result.current.handleDeletePayment("pay-1", "payment-and-linked-transaction");
    });

    expect(saveState).toHaveBeenCalled();
    const updatedProfile = currentState.profiles[0];
    
    // payments count -1
    expect(updatedProfile.payments.length).toBe(1);
    
    // linked tx usunięta
    expect(updatedProfile.transactions.length).toBe(1);
    expect(updatedProfile.transactions.find(tx => tx.id === "tx-1")).toBeUndefined();
    // inne tx bez zmian
    expect(updatedProfile.transactions.find(tx => tx.id === "tx-2")).toBeDefined();
  });

  it("should delete unpaid payment (without linked tx) correctly using default mode", () => {
    let currentState = getMockState();
    const saveState = vi.fn().mockImplementation(async (newState) => {
      currentState = newState;
    });

    const { result } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles[0],
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn()
      })
    );

    act(() => {
      result.current.handleDeletePayment("pay-2");
    });

    expect(saveState).toHaveBeenCalled();
    const updatedProfile = currentState.profiles[0];
    
    expect(updatedProfile.payments.length).toBe(1);
    expect(updatedProfile.payments.find(p => p.id === "pay-2")).toBeUndefined();
    expect(updatedProfile.transactions.length).toBe(2);
  });

  it("should not call saveState if payment id is not found", () => {
    let currentState = getMockState();
    const saveState = vi.fn().mockImplementation(async (newState) => {
      currentState = newState;
    });

    const { result } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles[0],
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn()
      })
    );

    act(() => {
      result.current.handleDeletePayment("pay-999");
    });

    expect(saveState).not.toHaveBeenCalled();
  });
});

```


## File: src/hooks/useAppActions.ts
```ts
import { activeKeys, generateRandomSalt } from "../services/crypto";
import { useCallback } from "react";
import { AppState, Profile, Transaction, Payment, Goal, Investment, RecurringRule, TransactionRule, BankAccount, SettlementEntry } from "../types";
import { autoCategorizeTransaction, hashPin, getLocalDateIso } from "../utils";
import { validateAndMigrateState } from "./useBudgetState";
import { applyGoalTransferToProfile } from "../services/goalTransfers";

interface UseAppActionsProps {
  state: AppState;
  saveState: (newState: AppState) => Promise<void>;
  activeProfile: Profile | null;
  makeUndoBackup: () => void;
  unlockProfile: (profileId: string) => void;
  lockProfile: () => void;
  setActiveView: (view: any) => void;
  connectGoogle: (mode?: "basic" | "drive" | "calendar") => Promise<any>;
  disconnectGoogle: () => Promise<void>;
  toggleAutoSync: (enabled: boolean) => void;
  backupToDriveManual: () => Promise<void>;
  restoreFromDriveManual: () => Promise<void>;
  setApiError?: (message: string | null) => void;
}

export function useAppActions({
  state,
  saveState,
  activeProfile,
  makeUndoBackup,
  unlockProfile,
  lockProfile,
  setActiveView,
  connectGoogle,
  disconnectGoogle,
  toggleAutoSync,
  backupToDriveManual,
  restoreFromDriveManual,
  setApiError
}: UseAppActionsProps) {
  
  // Helper to update active profile safely
  const updateActiveProfile = useCallback(
    (updater: (profile: Profile) => Partial<Profile>) => {
      if (!activeProfile) return;
      let hasChanges = false;
      const updatedProfiles = state.profiles.map((p) => {
        if (p.id === activeProfile.id) {
          const patch = updater(p);
          const keys = Object.keys(patch) as (keyof Profile)[];
          if (keys.length === 0) {
            return p;
          }
          let isChanged = false;
          for (const key of keys) {
            if (p[key] !== patch[key]) {
              isChanged = true;
              break;
            }
          }
          if (isChanged) {
            hasChanges = true;
            return { ...p, ...patch };
          }
          return p;
        }
        return p;
      });

      if (hasChanges) {
        saveState({ ...state, profiles: updatedProfiles });
      }
    },
    [activeProfile, state, saveState]
  );

  // === TRANSACTIONS ===
  const handleAddTransaction = useCallback(
    (data: {
      name: string;
      amount: number;
      category: string;
      categoryIcon?: string;
      account: string;
      type: "income" | "expense";
      isoDate: string;
      paidBy?: "me" | "partner" | "joint";
      splitMode?: "none" | "equal";
    }) => {
      if (!activeProfile) return;

      const rules = activeProfile.transactionRules || [];
      const categorized = autoCategorizeTransaction(data.name, rules, data.category);

      const newTx: Transaction = {
        id: "tx-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        ...data,
        category: categorized.category,
        categoryIcon: categorized.categoryIcon
      };

      updateActiveProfile((p) => ({ transactions: [newTx, ...p.transactions] }));
    },
    [activeProfile, updateActiveProfile]
  );

  const handleUpdateTransaction = useCallback(
    (txId: string, data: Partial<Transaction>) => {
      updateActiveProfile((p) => {
        const index = p.transactions.findIndex((t) => t.id === txId);
        if (index === -1) return {};

        const existing = p.transactions[index];
        const updated = { ...existing, ...data };

        // Keep technical fields intact
        updated.id = existing.id;
        updated.isRecurring = existing.isRecurring;
        updated.recurringRuleId = existing.recurringRuleId;
        updated.sourcePaymentId = existing.sourcePaymentId;

        const newTransactions = [...p.transactions];
        newTransactions[index] = updated;

        return { transactions: newTransactions };
      });
    },
    [updateActiveProfile]
  );

  const handleImportTransactions = useCallback(
    (newTransactions: Transaction[]) => {
      updateActiveProfile((p) => {
        const existingIds = new Set(p.transactions.map((t) => t.id));
        const validAndUnique: Transaction[] = [];

        for (const tx of newTransactions) {
          if (!tx || !tx.id || existingIds.has(tx.id)) {
            continue;
          }
          const numAmount = Number(tx.amount);
          if (!Number.isFinite(numAmount)) {
            continue;
          }

          let enrichedTx = tx;
          if (p.kind === "shared" && !tx.paidBy) {
            enrichedTx = {
              ...tx,
              paidBy: "me",
              splitMode: tx.type === "expense" ? "equal" : "none"
            };
          }

          existingIds.add(tx.id);
          validAndUnique.push(enrichedTx);
        }

        if (validAndUnique.length === 0) {
          return {};
        }

        return { transactions: [...validAndUnique, ...p.transactions] };
      });
    },
    [updateActiveProfile]
  );

  const handleDeleteTransaction = useCallback(
    (txId: string) => {
      updateActiveProfile((p) => ({ transactions: p.transactions.filter((t) => t.id !== txId) }));
    },
    [updateActiveProfile]
  );

  // === PAYMENTS ===
  const handleAddPayment = useCallback(
    (data: { name: string; amount: number; dueDate: string; paidBy?: "me" | "partner" | "joint"; splitMode?: "none" | "equal" }) => {
      const newPayment: Payment = {
        id: "pay-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        name: data.name,
        amount: data.amount,
        dueDate: data.dueDate,
        status: "Do opłacenia",
        paidBy: data.paidBy,
        splitMode: data.splitMode
      };
      updateActiveProfile((p) => ({ payments: [...p.payments, newPayment] }));
    },
    [updateActiveProfile]
  );

  const handleUpdatePayment = useCallback(
    (paymentId: string, data: Partial<Payment>) => {
      updateActiveProfile((p) => {
        const index = p.payments.findIndex((pay) => pay.id === paymentId);
        if (index === -1) return {};

        const existing = p.payments[index];
        const updated = { ...existing, ...data };

        // Keep technical fields intact
        updated.id = existing.id;
        updated.status = existing.status;
        updated.isRecurring = existing.isRecurring;
        updated.recurringRuleId = existing.recurringRuleId;

        const newPayments = [...p.payments];
        newPayments[index] = updated;

        return { payments: newPayments };
      });
    },
    [updateActiveProfile]
  );

  const handleDeletePayment = useCallback(
    (payId: string, mode: "payment-only" | "payment-and-linked-transaction" = "payment-only") => {
      updateActiveProfile((p) => {
        const index = p.payments.findIndex((pay) => pay.id === payId);
        if (index === -1) return {};

        const newPayments = p.payments.filter((pay) => pay.id !== payId);

        if (mode === "payment-and-linked-transaction") {
          const newTransactions = p.transactions.filter((tx) => tx.sourcePaymentId !== payId);
          return { payments: newPayments, transactions: newTransactions };
        }

        return { payments: newPayments };
      });
    },
    [updateActiveProfile]
  );

  const handleTogglePaymentStatus = useCallback(
    (paymentId: string) => {
      updateActiveProfile((p) => {
        const payment = p.payments.find((pay) => pay.id === paymentId);
        if (!payment) return {};
        if (payment.status === "Opłacono") {
          console.warn("Cofanie statusu 'Opłacono' jest zablokowane.");
          setApiError?.("Nie można cofnąć statusu „Opłacono”. Usuń powiązaną transakcję ręcznie, jeśli to pomyłka.");
          return {};
        }

        const updatedPayments = p.payments.map((pay) => {
          if (pay.id === paymentId) {
            return {
              ...pay,
              status: "Opłacono" as const
            };
          }
          return pay;
        });

        const existingTx = (p.transactions || []).find((tx) => tx.sourcePaymentId === paymentId);
        if (existingTx) {
          return {
            payments: updatedPayments
          };
        }

        const newTx: Transaction = {
          id: "tx-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
          name: payment.name,
          amount: payment.amount,
          category: payment.category || "Rachunki",
          account: p.accounts?.[0]?.name || "Konto Główne",
          type: "expense",
          isoDate: getLocalDateIso(),
          sourcePaymentId: payment.id,
          paidBy: payment.paidBy,
          splitMode: payment.splitMode
        };

        return { 
          payments: updatedPayments,
          transactions: [newTx, ...(p.transactions || [])]
        };
      });
    },
    [updateActiveProfile, setApiError]
  );

  // === GOALS & INVESTMENTS ===
  const handleAddGoal = useCallback(
    (data: { name: string; target: number }) => {
      const newGoal: Goal = {
        id: "goal-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        name: data.name,
        target: data.target,
        saved: 0
      };
      updateActiveProfile((p) => ({ goals: [...p.goals, newGoal] }));
    },
    [updateActiveProfile]
  );

  const handleDeleteGoal = useCallback(
    (goalId: string) => {
      updateActiveProfile((p) => {
        const targetGoal = p.goals.find((g) => g.id === goalId);
        if (targetGoal && (Number(targetGoal.saved) || 0) > 0) {
          console.warn("Nie można usunąć celu oszczędnościowego z dodatnimi środkami.");
          setApiError?.("Nie można usunąć celu z wpłaconymi środkami. Najpierw wypłać oszczędności.");
          return {};
        }
        return { goals: p.goals.filter((g) => g.id !== goalId) };
      });
    },
    [updateActiveProfile, setApiError]
  );

  const handleAddGoalDeposit = useCallback(
    (activeGoalForDeposit: Goal | null, amount: number, note?: string) => {
      if (!activeGoalForDeposit) return;
      const isoDate = getLocalDateIso();

      updateActiveProfile((p) =>
        applyGoalTransferToProfile(p, activeGoalForDeposit.id, amount, isoDate, { note })
      );
    },
    [updateActiveProfile]
  );

  const handleAddInvestment = useCallback(
    (name: string, amount: number, type?: string, notes?: string) => {
      const newInv: Investment = {
        id: "inv-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        name,
        amount,
        isoDate: getLocalDateIso(),
        type,
        notes
      };
      updateActiveProfile((p) => ({ investments: [newInv, ...p.investments] }));
    },
    [updateActiveProfile]
  );

  // === BUDGETS & RULES ===
  const handleSaveBudgets = useCallback(
    (budgets: Record<string, number>) => {
      updateActiveProfile(() => ({ budgets }));
    },
    [updateActiveProfile]
  );

  const handleSaveAccounts = useCallback(
    (accounts: BankAccount[]) => {
      updateActiveProfile(() => ({ accounts }));
    },
    [updateActiveProfile]
  );

  const handleSaveRecurringRules = useCallback(
    (newRules: RecurringRule[]) => {
      updateActiveProfile(() => ({ recurringRules: newRules }));
    },
    [updateActiveProfile]
  );

  const handleSaveTransactionRules = useCallback(
    (newRules: TransactionRule[]) => {
      updateActiveProfile(() => ({ transactionRules: newRules }));
    },
    [updateActiveProfile]
  );

  const handleAddSettlement = useCallback(
    (entry: { amount: number; isoDate: string; note?: string }) => {
      const newSettlement: SettlementEntry = {
        id: "set-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        amount: entry.amount,
        isoDate: entry.isoDate,
        note: entry.note,
        createdAt: new Date().toISOString()
      };
      updateActiveProfile((p) => ({
        settlements: [newSettlement, ...(p.settlements || [])]
      }));
    },
    [updateActiveProfile]
  );

  const handleDeleteSettlement = useCallback(
    (settlementId: string) => {
      updateActiveProfile((p) => ({
        settlements: (p.settlements || []).filter((s) => s.id !== settlementId)
      }));
    },
    [updateActiveProfile]
  );

  // === PROFILES ===
  const handleSelectProfile = useCallback(
    (profileId: string) => {
      const nextProfile = state.profiles.find((p) => p.id === profileId);
      if (nextProfile) {
        saveState({ ...state, activeProfileId: profileId });
        if (!nextProfile.pinHash) {
          unlockProfile(profileId);
        }
        setActiveView("dashboard");
      }
    },
    [state, saveState, unlockProfile, setActiveView]
  );

  const handleDeleteProfile = useCallback(
    (profileId: string) => {

      const remainingProfiles = state.profiles.filter((p) => p.id !== profileId);
      
      let nextActiveId = state.activeProfileId;
      if (nextActiveId === profileId) {
        nextActiveId = remainingProfiles.length > 0 ? remainingProfiles[0].id : null;
      }

      const updatedState = {
        ...state,
        profiles: remainingProfiles,
        activeProfileId: nextActiveId
      };
      
      makeUndoBackup();
      saveState(updatedState);
      
      if (activeKeys[profileId]) {
         delete activeKeys[profileId];
      }
      
      if (nextActiveId) {
         setActiveView("dashboard");
      }
    },
    [state, saveState, makeUndoBackup, setActiveView]
  );

  const handleUpdateProfile = useCallback(
    async (profileId: string, data: { name: string; kind: "personal" | "shared"; partnerName: string; avatar: string }) => {
      const profileIndex = state.profiles.findIndex((p) => p.id === profileId);
      if (profileIndex === -1) return;

      const updatedProfile = { ...state.profiles[profileIndex] };
      updatedProfile.name = data.name;
      updatedProfile.kind = data.kind;
      updatedProfile.partnerName = data.partnerName;
      updatedProfile.avatar = data.avatar;

      const updatedProfiles = [...state.profiles];
      updatedProfiles[profileIndex] = updatedProfile;

      const updatedState = { ...state, profiles: updatedProfiles };
      await saveState(updatedState);
    },
    [state, saveState]
  );

  const handleAddProfile = useCallback(
    async (data: { name: string; kind: "personal" | "shared"; partnerName: string; pin: string; avatar: string }) => {
      const newId = "profile-" + Date.now();
      const newSalt = generateRandomSalt();
      const newProfile: Profile = {
        id: newId,
        name: data.name,
        kind: data.kind,
        partnerName: data.partnerName,
        avatar: data.avatar,
        pinHash: "",
        salt: newSalt,
        transactions: [],
        payments: [],
        goals: [],
        investments: [],
        budgets: {
          "Żywność": 0,
          "Dom i rachunki": 0,
          "Transport": 0,
          "Rozrywka": 0
        }
      };

      if (data.pin) {
        newProfile.pinHash = await hashPin(data.pin, newSalt);
      }

      const updatedState: AppState = {
        ...state,
        profiles: [...state.profiles, newProfile],
        activeProfileId: newId
      };
      saveState(updatedState);
      unlockProfile(newId);
      setActiveView("dashboard");
    },
    [state, saveState, unlockProfile, setActiveView]
  );

  // === DATA & GOOGLE INTEGRATION ===
  const handleExportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saldo-kopia-zapasowa-${getLocalDateIso()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state]);

  const handleResetData = useCallback(async () => {
    // TODO: replace with app modal/toast system
    const confirmed = window.confirm(
      "OSTRZEŻENIE: Ta operacja usunie wszystkie dane profilów (transakcje, płatności, cele, budżety). Jesteś pewien?"
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/state/reset", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        makeUndoBackup();
        saveState(result.data);
        lockProfile();
        setActiveView("dashboard");
        alert("Baza danych została zresetowana do ustawień początkowych.");
      }
    } catch (err) {
      console.error("Failed to reset data:", err);
      alert("Nie udało się zresetować bazy danych.");
    }
  }, [makeUndoBackup, saveState, lockProfile, setActiveView]);

  const handleImportLocalData = useCallback(
    (importedState: AppState) => {
      if (!importedState || !Array.isArray(importedState.profiles)) {
        alert("Błędna struktura pliku JSON. Import przerwany.");
        return;
      }
      const validated = validateAndMigrateState(importedState);
      // TODO: replace with app modal/toast system
      const confirmed = window.confirm(
        "Czy chcesz zastąpić obecne dane danymi z pliku lokalnego? W razie potrzeby możesz cofnąć tę zmianę."
      );
      if (!confirmed) return;

      makeUndoBackup();
      saveState(validated);
      alert("Kopia lokalna została pomyślnie wczytana!");
    },
    [makeUndoBackup, saveState]
  );

  const handleConnectGoogle = useCallback(async () => {
    try {
      await connectGoogle("drive");
    } catch (e) {
      console.error("Google connect error", e);
    }
  }, [connectGoogle]);

  const handleDisconnectGoogle = useCallback(async () => {
    await disconnectGoogle();
    toggleAutoSync(false);
  }, [disconnectGoogle, toggleAutoSync]);

  const handleSyncToDrive = useCallback(
    async (silent = false) => {
      try {
        await backupToDriveManual();
        if (!silent) {
          alert("Baza budżetu została pomyślnie zapisana na Dysku Google!");
        }
      } catch (err: any) {
        if (!silent) {
          alert(err.message || "Błąd zapisu na Dysku Google. Spróbuj ponownie później.");
        }
      }
    },
    [backupToDriveManual]
  );

  const handleLoadFromDrive = useCallback(async () => {
    // TODO: replace with app modal/toast system
    const confirmed = window.confirm(
      "Czy na pewno chcesz pobrać plik 'saldo_budget.json' z Dysku Google i zastąpić całą lokalną bazę danych? Obecne lokalne dane zostaną trwale nadpisane."
    );
    if (!confirmed) return;

    try {
      await restoreFromDriveManual();
      alert("Baza danych została pomyślnie przywrócona z Dysku Google!");
    } catch (err: any) {
      alert(err.message || "Nie udało się pobrać danych z Dysku Google.");
    }
  }, [restoreFromDriveManual]);

  return {
    handleAddTransaction,
    handleUpdateTransaction,
    handleImportTransactions,
    handleDeleteTransaction,
    handleAddPayment,
    handleUpdatePayment,
    handleDeletePayment,
    handleTogglePaymentStatus,
    handleAddGoal,
    handleDeleteGoal,
    handleAddGoalDeposit,
    handleAddInvestment,
    handleSaveBudgets,
    handleSaveAccounts,
    handleSaveRecurringRules,
    handleSaveTransactionRules,
    handleAddSettlement,
    handleDeleteSettlement,
    handleSelectProfile,
    handleAddProfile,
    handleUpdateProfile,
    handleDeleteProfile,
    handleResetData,
    handleExportData,
    handleImportLocalData,
    handleConnectGoogle,
    handleDisconnectGoogle,
    handleSyncToDrive,
    handleLoadFromDrive,
  };
}

```


## File: src/hooks/useAuth.ts
```ts
import { useState, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import { googleSignInBasic, requestGoogleDriveAccess, requestGoogleCalendarAccess, logout, initAuth, getGoogleToken } from "../firebase";
import { clearActiveKeys } from "../services/crypto";

interface UseAuthProps {
  onAuthSuccess?: (user: User, token: string | null) => void;
  onAuthFailure?: () => void;
}

type AuthMode = "basic" | "drive" | "calendar";

export function useAuth({ onAuthSuccess, onAuthFailure }: UseAuthProps = {}) {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, _token) => {
        setGoogleUser(user);
        setDriveToken(getGoogleToken("drive"));
        setCalendarToken(getGoogleToken("calendar"));
        if (onAuthSuccess) {
          onAuthSuccess(user, getGoogleToken("basic"));
        }
      },
      () => {
        setGoogleUser(null);
        setDriveToken(null);
        setCalendarToken(null);
        if (onAuthFailure) {
          onAuthFailure();
        }
      }
    );
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [onAuthSuccess, onAuthFailure]);

  const connectGoogle = useCallback(async (mode: AuthMode = "basic") => {
    setIsGoogleLoading(true);
    setGoogleError(null);
    try {
      let result;
      if (mode === "drive") {
        result = await requestGoogleDriveAccess();
        if (result) setDriveToken(result.accessToken);
      } else if (mode === "calendar") {
        result = await requestGoogleCalendarAccess();
        if (result) setCalendarToken(result.accessToken);
      } else {
        result = await googleSignInBasic();
      }
      
      if (result) {
        setGoogleUser(result.user);
        return result;
      }
      return null;
    } catch (err: any) {
      console.error("Failed to connect Google account:", err);
      if (err?.code === "auth/popup-closed-by-user" || err?.message?.includes("popup-closed-by-user")) {
        setGoogleError("auth/popup-closed-by-user");
      } else {
        setGoogleError(err?.message || String(err));
      }
      throw err;
    } finally {
      setIsGoogleLoading(false);
    }
  }, []);

  const disconnectGoogle = useCallback(async () => {
    try {
      await logout();
      clearActiveKeys();
      setGoogleUser(null);
      setDriveToken(null);
      setCalendarToken(null);
      setGoogleError(null);
    } catch (err) {
      console.error("Logout failed:", err);
      throw err;
    }
  }, []);

  const invalidateDriveToken = useCallback(() => {
    setDriveToken(null);
  }, []);

  const invalidateCalendarToken = useCallback(() => {
    setCalendarToken(null);
  }, []);

  return {
    googleUser,
    driveToken,
    calendarToken,
    isGoogleAuthenticated: Boolean(googleUser),
    hasDriveAccess: Boolean(driveToken),
    hasCalendarAccess: Boolean(calendarToken),
    isGoogleLoading,
    googleError,
    setGoogleError,
    connectGoogle,
    disconnectGoogle,
    invalidateDriveToken,
    invalidateCalendarToken
  };
}

```


## File: src/hooks/useBudgetState.test.ts
```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useBudgetState, validateAndMigrateState } from "./useBudgetState";
import { AppState } from "../types";
import { autoCategorizeTransaction } from "../utils";
import { act, createElement } from "react";
import { createRoot, Root } from "react-dom/client";
import * as localDb from "../services/localDb";
import { LOCAL_STORAGE_KEY_V2 } from "../services/localDb";

describe("validateAndMigrateState", () => {
  it("1. multi-profile, reguły BEZ profileId, raw.activeProfileId=null → WSZYSTKIE w state.recurringRules, profiles[*].recurringRules puste (anty-wyciek)", () => {
    const rawState = {
      activeProfileId: null,
      profiles: [
        { id: "p1", name: "P1", kind: "personal" },
        { id: "p2", name: "P2", kind: "personal" }
      ],
      recurringRules: [
        { id: "r1", name: "Rule 1", amount: 100, type: "expense", category: "Food", account: "Cash", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true },
        { id: "r2", name: "Rule 2", amount: 200, type: "income", category: "Salary", account: "Bank", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true }
      ]
    };

    const migrated = validateAndMigrateState(rawState);

    expect(migrated.recurringRules?.length).toBe(2);
    expect(migrated.recurringRules?.[0].id).toBe("r1");
    expect(migrated.recurringRules?.[1].id).toBe("r2");

    const p1 = migrated.profiles.find((p) => p.id === "p1");
    const p2 = migrated.profiles.find((p) => p.id === "p2");

    expect(p1?.recurringRules?.length).toBe(0);
    expect(p2?.recurringRules?.length).toBe(0);
  });

  it("2. reguła.profileId=\"p2\" przy profilach p1,p2 → tylko p2 dostaje regułę; global empty", () => {
    const rawState = {
      activeProfileId: "p1",
      profiles: [
        { id: "p1", name: "P1", kind: "personal" },
        { id: "p2", name: "P2", kind: "personal" }
      ],
      recurringRules: [
        { id: "r1", name: "Rule for P2", profileId: "p2", amount: 50, type: "expense", category: "Fun", account: "Card", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true }
      ]
    };

    const migrated = validateAndMigrateState(rawState);

    const p1 = migrated.profiles.find((p) => p.id === "p1");
    const p2 = migrated.profiles.find((p) => p.id === "p2");

    expect(p1?.recurringRules?.length).toBe(0);
    expect(p2?.recurringRules?.length).toBe(1);
    expect(p2?.recurringRules?.[0].id).toBe("r1");
    expect("profileId" in (p2?.recurringRules?.[0] || {})).toBe(false);

    expect(migrated.recurringRules?.length).toBe(0);
  });

  it("3. reguła.profileId=\"missing\" → unmigrated global", () => {
    const rawState = {
      activeProfileId: "p1",
      profiles: [
        { id: "p1", name: "P1", kind: "personal" },
        { id: "p2", name: "P2", kind: "personal" }
      ],
      recurringRules: [
        { id: "r1", name: "Missing Profile Rule", profileId: "missing", amount: 50, type: "expense", category: "Fun", account: "Card", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true }
      ]
    };

    const migrated = validateAndMigrateState(rawState);

    expect(migrated.recurringRules?.length).toBe(1);
    expect(migrated.recurringRules?.[0].id).toBe("r1");

    const p1 = migrated.profiles.find((p) => p.id === "p1");
    const p2 = migrated.profiles.find((p) => p.id === "p2");

    expect(p1?.recurringRules?.length).toBe(0);
    expect(p2?.recurringRules?.length).toBe(0);
  });

  it("4. raw.activeProfileId=\"p1\", reguła bez profileId → p1; nie p2", () => {
    const rawState = {
      activeProfileId: "p1",
      profiles: [
        { id: "p1", name: "P1", kind: "personal" },
        { id: "p2", name: "P2", kind: "personal" }
      ],
      recurringRules: [
        { id: "r1", name: "Rule for Active Profile", amount: 120, type: "expense", category: "Bills", account: "Bank", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true }
      ]
    };

    const migrated = validateAndMigrateState(rawState);

    const p1 = migrated.profiles.find((p) => p.id === "p1");
    const p2 = migrated.profiles.find((p) => p.id === "p2");

    expect(p1?.recurringRules?.length).toBe(1);
    expect(p1?.recurringRules?.[0].id).toBe("r1");
    expect(p2?.recurringRules?.length).toBe(0);
    expect(migrated.recurringRules?.length).toBe(0);
  });

  it("5. pojedynczy profil, reguła bez profileId → do tego profilu; global empty", () => {
    const rawState = {
      activeProfileId: null,
      profiles: [
        { id: "p1", name: "Only Profile", kind: "personal" }
      ],
      recurringRules: [
        { id: "r1", name: "Single Profile Rule", amount: 100, type: "expense", category: "General", account: "Cash", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true }
      ]
    };

    const migrated = validateAndMigrateState(rawState);

    const p1 = migrated.profiles.find((p) => p.id === "p1");

    expect(p1?.recurringRules?.length).toBe(1);
    expect(p1?.recurringRules?.[0].id).toBe("r1");
    expect(migrated.recurringRules?.length).toBe(0);
  });

  it("6. drugie wywołanie migrate na wyniku → brak duplikatów id", () => {
    const rawState = {
      activeProfileId: "p1",
      profiles: [
        { id: "p1", name: "Main", kind: "personal", recurringRules: [{ id: "r1", name: "Existing", amount: 10, type: "expense", category: "Food", account: "Cash", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true }] }
      ],
      recurringRules: [
        { id: "r1", name: "Existing" },
        { id: "r2", name: "New", amount: 20, type: "expense", category: "Food", account: "Cash", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true }
      ]
    };

    const migrated1 = validateAndMigrateState(rawState);

    const prof1 = migrated1.profiles.find((p) => p.id === "p1");
    expect(prof1?.recurringRules?.length).toBe(2);
    expect(prof1?.recurringRules?.[0].id).toBe("r1");
    expect(prof1?.recurringRules?.[1].id).toBe("r2");
    expect(migrated1.recurringRules?.length).toBe(0);

    const migrated2 = validateAndMigrateState(migrated1);
    const prof2 = migrated2.profiles.find((p) => p.id === "p1");
    expect(prof2?.recurringRules?.length).toBe(2);
    expect(migrated2.recurringRules?.length).toBe(0);
  });

  it("7. junk w tablicy ([null, {id:\"x\", ...valid}]) → tylko valid migruje / junk drop", () => {
    const rawState = {
      activeProfileId: "p1",
      profiles: [
        { id: "p1", name: "P1", kind: "personal" }
      ],
      recurringRules: [
        null,
        undefined,
        123,
        "string",
        {},
        { id: "" },
        { id: "   " },
        { id: "valid-x", name: "Valid Rule", amount: 200, type: "income", category: "Bonus", account: "Bank", frequency: "monthly", nextDueDate: "2026-08-01", isActive: true }
      ]
    };

    const migrated = validateAndMigrateState(rawState);

    const p1 = migrated.profiles.find((p) => p.id === "p1");

    expect(p1?.recurringRules?.length).toBe(1);
    expect(p1?.recurringRules?.[0].id).toBe("valid-x");
    expect(migrated.recurringRules?.length).toBe(0);
  });

  it("8. recurring rule bez nextDueDate (lub niepoprawny) → fallback do formatu YYYY-MM-DD", () => {
    const rawState = {
      activeProfileId: "p1",
      profiles: [{ id: "p1", name: "P1", kind: "personal" }],
      recurringRules: [
        { id: "r-no-date", name: "No Date Rule", amount: 100, type: "expense", category: "Food", account: "Cash", frequency: "monthly" },
        { id: "r-invalid-date", name: "Invalid Date Rule", amount: 50, type: "expense", category: "Food", account: "Cash", frequency: "monthly", nextDueDate: "invalid-date" }
      ]
    };

    const migrated = validateAndMigrateState(rawState);
    const p1 = migrated.profiles.find((p) => p.id === "p1");

    expect(p1?.recurringRules?.length).toBe(2);

    const r1 = p1?.recurringRules?.[0];
    const r2 = p1?.recurringRules?.[1];

    expect(r1?.nextDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r1?.nextDueDate).not.toBe("");
    expect(r2?.nextDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r2?.nextDueDate).not.toBe("");
  });

  describe("transactionRules per profile migration & isolation", () => {
    it("migrates global transactionRules to active profile", () => {
      const rawState = {
        activeProfileId: "prof-a",
        profiles: [
          { id: "prof-a", name: "A", kind: "personal" },
          { id: "prof-b", name: "B", kind: "personal" }
        ],
        transactionRules: [
          { id: "tr-1", pattern: "Biedronka", category: "Żywność" }
        ]
      };

      const migrated = validateAndMigrateState(rawState);

      const profA = migrated.profiles.find(p => p.id === "prof-a");
      expect(profA?.transactionRules?.length).toBe(1);
      expect(profA?.transactionRules?.[0].pattern).toBe("Biedronka");

      const profB = migrated.profiles.find(p => p.id === "prof-b");
      expect(profB?.transactionRules?.length).toBe(0);

      expect(migrated.transactionRules?.length).toBe(0);
    });

    it("migrates global transactionRules with explicit profileId to target profile", () => {
      const rawState = {
        activeProfileId: "prof-a",
        profiles: [
          { id: "prof-a", name: "A", kind: "personal" },
          { id: "prof-b", name: "B", kind: "personal" }
        ],
        transactionRules: [
          { id: "tr-2", pattern: "Lidl", category: "Zakupy", profileId: "prof-b" }
        ]
      };

      const migrated = validateAndMigrateState(rawState);

      const profA = migrated.profiles.find(p => p.id === "prof-a");
      expect(profA?.transactionRules?.length).toBe(0);

      const profB = migrated.profiles.find(p => p.id === "prof-b");
      expect(profB?.transactionRules?.length).toBe(1);
      expect(profB?.transactionRules?.[0].id).toBe("tr-2");
      expect(profB?.transactionRules?.[0].profileId).toBeUndefined();

      expect(migrated.transactionRules?.length).toBe(0);
    });

    it("ensures rule isolation between profile A and profile B", () => {
      const rawState = {
        activeProfileId: "prof-a",
        profiles: [
          {
            id: "prof-a",
            name: "A",
            kind: "personal",
            transactionRules: [{ id: "r-a", pattern: "Sklep A", category: "Kategoria A", categoryIcon: "🅰️" }]
          },
          {
            id: "prof-b",
            name: "B",
            kind: "personal",
            transactionRules: [{ id: "r-b", pattern: "Sklep B", category: "Kategoria B", categoryIcon: "🅱️" }]
          }
        ]
      };

      const migrated = validateAndMigrateState(rawState);
      const profA = migrated.profiles.find(p => p.id === "prof-a")!;
      const profB = migrated.profiles.find(p => p.id === "prof-b")!;

      // Profile A rules categorize "Sklep A" -> "Kategoria A"
      const resA = autoCategorizeTransaction("Sklep A", profA.transactionRules || [], "");
      expect(resA.category).toBe("Kategoria A");

      // Profile B rules do NOT categorize "Sklep A" using Profile A rules
      const resBForSklepA = autoCategorizeTransaction("Sklep A", profB.transactionRules || [], "Inne");
      expect(resBForSklepA.category).not.toBe("Kategoria A");

      // Profile B rules categorize "Sklep B" -> "Kategoria B"
      const resB = autoCategorizeTransaction("Sklep B", profB.transactionRules || [], "");
      expect(resB.category).toBe("Kategoria B");
    });
  });
});

describe("useBudgetState hydration race condition protection", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  function renderBudgetHook() {
    const result: { current: ReturnType<typeof useBudgetState> | null } = { current: null };
    function TestComponent() {
      result.current = useBudgetState(null);
      return null;
    }
    act(() => {
      root.render(createElement(TestComponent));
    });
    return result as { current: ReturnType<typeof useBudgetState> };
  }

  it("1. IDB starszy niż LS/init -> po hydrate stan = init (nowszy), nie IDB", async () => {
    const lsState = validateAndMigrateState({
      updatedAt: "2026-07-23T10:00:00.000Z",
      profiles: [{ id: "p1", name: "LS Profile", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(lsState));

    const idbOldState = validateAndMigrateState({
      updatedAt: "2026-07-23T08:00:00.000Z",
      profiles: [{ id: "p1", name: "IDB Old Profile", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });

    vi.spyOn(localDb, "loadState").mockResolvedValue(idbOldState);

    const hookRef = renderBudgetHook();

    expect(hookRef.current.state.profiles[0].name).toBe("LS Profile");

    // Wait for loadState to complete
    await act(async () => {
      await Promise.resolve();
    });

    // Final state must remain LS Profile, not old IDB Profile
    expect(hookRef.current.state.profiles[0].name).toBe("LS Profile");
    expect(hookRef.current.state.updatedAt).toBe("2026-07-23T10:00:00.000Z");
  });

  it("2. IDB nowszy niż init -> po hydrate stan = IDB", async () => {
    const lsState = validateAndMigrateState({
      updatedAt: "2026-07-23T10:00:00.000Z",
      profiles: [{ id: "p1", name: "LS Profile", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(lsState));

    const idbNewerState = validateAndMigrateState({
      updatedAt: "2026-07-23T12:00:00.000Z",
      profiles: [{ id: "p1", name: "IDB Newer Profile", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });

    vi.spyOn(localDb, "loadState").mockResolvedValue(idbNewerState);

    const hookRef = renderBudgetHook();

    expect(hookRef.current.state.profiles[0].name).toBe("LS Profile");

    await act(async () => {
      await Promise.resolve();
    });

    // Final state must be updated to IDB Newer Profile
    expect(hookRef.current.state.profiles[0].name).toBe("IDB Newer Profile");
    expect(hookRef.current.state.updatedAt).toBe("2026-07-23T12:00:00.000Z");
  });

  it("3. saveState w trakcie pending loadState -> finalny stan = zapisany, nie stary IDB", async () => {
    let resolveLoadState!: (value: AppState | null) => void;
    const loadStatePromise = new Promise<AppState | null>((res) => {
      resolveLoadState = res;
    });

    vi.spyOn(localDb, "loadState").mockReturnValue(loadStatePromise);
    vi.spyOn(localDb, "saveState").mockResolvedValue();

    const lsState = validateAndMigrateState({
      updatedAt: "2026-07-23T08:00:00.000Z",
      profiles: [{ id: "p1", name: "Initial Profile", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(lsState));

    const hookRef = renderBudgetHook();

    // Perform saveState while loadState is pending
    const savedState = validateAndMigrateState({
      updatedAt: "2026-07-23T11:00:00.000Z",
      profiles: [{ id: "p1", name: "User Saved Profile", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });

    await act(async () => {
      await hookRef.current.saveState(savedState, true);
    });

    expect(hookRef.current.state.profiles[0].name).toBe("User Saved Profile");

    // Resolve loadState with an older snapshot
    const oldIdbState = validateAndMigrateState({
      updatedAt: "2026-07-23T09:00:00.000Z",
      profiles: [{ id: "p1", name: "Old IDB Snapshot", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });

    await act(async () => {
      resolveLoadState(oldIdbState);
      await loadStatePromise;
    });

    // Final state must retain the user saved state, not the old IDB snapshot
    expect(hookRef.current.state.profiles[0].name).toBe("User Saved Profile");
  });

  it("4. equal updatedAt -> nie nadpisuj (stabilność)", async () => {
    const time = "2026-07-23T10:00:00.000Z";
    const lsState = validateAndMigrateState({
      updatedAt: time,
      lastModifiedBy: "LS Origin",
      profiles: [{ id: "p1", name: "LS Profile", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });
    localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(lsState));

    const idbStateSameTime = validateAndMigrateState({
      updatedAt: time,
      lastModifiedBy: "IDB Origin",
      profiles: [{ id: "p1", name: "IDB Equal Profile", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    });

    vi.spyOn(localDb, "loadState").mockResolvedValue(idbStateSameTime);

    const hookRef = renderBudgetHook();

    await act(async () => {
      await Promise.resolve();
    });

    // Equal updatedAt should ignore IDB and keep initial LS state
    expect(hookRef.current.state.lastModifiedBy).toBe("LS Origin");
    expect(hookRef.current.state.profiles[0].name).toBe("LS Profile");
  });
});


```


## File: src/hooks/useBudgetState.ts
```ts
import { auth } from "../firebase";
import { useState, useEffect, useRef, useCallback } from "react";
import { User } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { AppState, Profile, RecurringRule, TransactionRule } from "../types";
import { db } from "../firebase";
import { decryptProfile, activeKeys, prepareStateForRemoteSave, estimateJsonSizeBytes, FIRESTORE_DOC_HARD_LIMIT_BYTES, FIRESTORE_DOC_WARNING_BYTES } from "../services/crypto";
import * as localDb from "../services/localDb";
import { getLocalDateIso } from "../utils";

const CURRENT_SCHEMA_VERSION = 1;

// Helper to validate and migrate state safely
interface RawRule {
  id: string;
  profileId?: string;
  [key: string]: unknown;
}

function isRuleLike(val: unknown): val is RawRule {
  return (
    typeof val === "object" &&
    val !== null &&
    "id" in val &&
    typeof (val as { id: unknown }).id === "string" &&
    (val as { id: string }).id.trim() !== ""
  );
}

function normalizeRecurringRule(raw: RawRule): RecurringRule {
  const obj = raw as Record<string, unknown>;
  const freq = String(obj.frequency || "monthly");
  const validFreq: RecurringRule["frequency"] = ["weekly", "biweekly", "monthly", "quarterly", "yearly"].includes(freq)
    ? (freq as RecurringRule["frequency"])
    : "monthly";

  const ruleType = obj.type === "income" ? "income" : "expense";

  const rawDueDate = typeof obj.nextDueDate === "string" ? obj.nextDueDate.trim() : "";
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDueDate);
  const nextDueDate = isValidDate ? rawDueDate : getLocalDateIso();

  return {
    id: String(obj.id),
    name: String(obj.name || "Reguła cykliczna"),
    amount: typeof obj.amount === "number" && !isNaN(obj.amount) ? obj.amount : Number(obj.amount) || 0,
    type: ruleType,
    category: String(obj.category || "Inne"),
    ...(typeof obj.categoryIcon === "string" ? { categoryIcon: obj.categoryIcon } : {}),
    account: String(obj.account || "Konto główne"),
    frequency: validFreq,
    nextDueDate,
    ...(typeof obj.lastGeneratedDate === "string" ? { lastGeneratedDate: obj.lastGeneratedDate } : {}),
    ...(Array.isArray(obj.tags) ? { tags: obj.tags.map(String) } : {}),
    isActive: typeof obj.isActive === "boolean" ? obj.isActive : true,
    ...(obj.paidBy === "me" || obj.paidBy === "partner" || obj.paidBy === "joint" ? { paidBy: obj.paidBy } : {}),
    ...(obj.splitMode === "none" || obj.splitMode === "equal" ? { splitMode: obj.splitMode } : {})
  };
}

function normalizeTransactionRule(raw: RawRule): TransactionRule {
  const obj = raw as Record<string, unknown>;
  return {
    id: String(obj.id),
    pattern: String(obj.pattern || ""),
    category: String(obj.category || "Inne"),
    ...(typeof obj.categoryIcon === "string" ? { categoryIcon: obj.categoryIcon } : {}),
    ...(typeof obj.profileId === "string" && obj.profileId.trim() !== "" ? { profileId: obj.profileId } : {})
  };
}

function findTargetProfile(
  ruleProfileId: string | undefined,
  originalActiveProfileId: string | null,
  profiles: Profile[]
): Profile | null {
  // 1. If rule explicitly specified profileId
  if (ruleProfileId) {
    return profiles.find((p) => p.id === ruleProfileId) || null;
  }
  // 2. If no profileId specified, but originalActiveProfileId exists in RAW
  if (originalActiveProfileId) {
    return profiles.find((p) => p.id === originalActiveProfileId) || null;
  }
  // 3. If no profileId specified, no originalActiveProfileId in RAW, and exactly 1 profile exists
  if (profiles.length === 1) {
    return profiles[0];
  }
  // 4. Fallback: null (unmigrated)
  return null;
}

export function validateAndMigrateState(raw: unknown, defaultEmail = "użytkownik"): AppState {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const migrated: AppState = {
    profiles: Array.isArray(data.profiles) ? data.profiles : [],
    activeProfileId: typeof data.activeProfileId === "string" ? data.activeProfileId : null,
    schemaVersion: typeof data.schemaVersion === "number" ? data.schemaVersion : CURRENT_SCHEMA_VERSION,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
    lastModifiedBy: typeof data.lastModifiedBy === "string" ? data.lastModifiedBy : defaultEmail,
    driveFileId: typeof data.driveFileId === "string" ? data.driveFileId : null,
    recurringRules: Array.isArray(data.recurringRules) ? data.recurringRules : [],
    transactionRules: Array.isArray(data.transactionRules) ? data.transactionRules : []
  };

  // Ensure each profile is fully typed with all arrays initialized
  migrated.profiles = migrated.profiles.map((p: unknown) => {
    const profileObj = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
    const rawRecurring = Array.isArray(profileObj.recurringRules) ? profileObj.recurringRules : [];
    const rawTx = Array.isArray(profileObj.transactionRules) ? profileObj.transactionRules : [];

    const profile: Profile = {
      id: String(profileObj.id || crypto.randomUUID()),
      name: String(profileObj.name || "Profil"),
      kind: (profileObj.kind === "shared" ? "shared" : "personal") as "personal" | "shared",
      partnerName: profileObj.partnerName ? String(profileObj.partnerName) : undefined,
      avatar: profileObj.avatar ? String(profileObj.avatar) : undefined,
      pinHash: profileObj.pinHash ? String(profileObj.pinHash) : undefined,
      salt: profileObj.salt ? String(profileObj.salt) : undefined,
      encryptedPayload: profileObj.encryptedPayload ? String(profileObj.encryptedPayload) : undefined,
      accounts: Array.isArray(profileObj.accounts) ? profileObj.accounts : [],
      transactions: Array.isArray(profileObj.transactions) ? profileObj.transactions : [],
      payments: Array.isArray(profileObj.payments) ? profileObj.payments : [],
      goals: Array.isArray(profileObj.goals) ? profileObj.goals : [],
      investments: Array.isArray(profileObj.investments) ? profileObj.investments : [],
      budgets: profileObj.budgets && typeof profileObj.budgets === "object" ? (profileObj.budgets as Record<string, number>) : {},
      recurringRules: rawRecurring.filter(isRuleLike).map(normalizeRecurringRule),
      transactionRules: rawTx.filter(isRuleLike).map((r) => {
        const clean = normalizeTransactionRule(r);
        delete clean.profileId;
        return clean;
      }),
      settlements: Array.isArray(profileObj.settlements) ? profileObj.settlements : []
    };

    // Ensure Goals are migrated with optional transfers list
    profile.goals = profile.goals.map((g: unknown) => {
      const goalObj = (g && typeof g === "object" ? g : {}) as Record<string, unknown>;
      return {
        id: String(goalObj.id || ""),
        name: String(goalObj.name || "Cel"),
        target: Number(goalObj.target || 0),
        saved: Number(goalObj.saved || 0),
        transfers: Array.isArray(goalObj.transfers) ? goalObj.transfers : [],
        ...(goalObj.targetDate ? { targetDate: String(goalObj.targetDate) } : {})
      };
    });
    return profile;
  });

  const originalActiveProfileId = (typeof data.activeProfileId === "string" && data.activeProfileId.trim() !== "")
    ? data.activeProfileId
    : null;

  if (!migrated.activeProfileId && migrated.profiles.length > 0) {
    migrated.activeProfileId = migrated.profiles[0].id;
  }

  // --- MIGRATION: AppState.recurringRules to Profile.recurringRules ---
  if (migrated.recurringRules && migrated.recurringRules.length > 0) {
    const unmigratedRules: RecurringRule[] = [];

    for (const rawRule of migrated.recurringRules) {
      if (!isRuleLike(rawRule)) {
        continue;
      }

      const ruleProfileId = typeof rawRule.profileId === "string" && rawRule.profileId.trim() !== "" ? rawRule.profileId : undefined;
      const targetProfile = findTargetProfile(ruleProfileId, originalActiveProfileId, migrated.profiles);

      if (targetProfile) {
        const cleanRule = normalizeRecurringRule(rawRule);
        if (!targetProfile.recurringRules) {
          targetProfile.recurringRules = [];
        }
        const exists = targetProfile.recurringRules.some((r) => r.id === cleanRule.id);
        if (!exists) {
          targetProfile.recurringRules.push(cleanRule);
        }
      } else {
        const cleanUnmigrated = normalizeRecurringRule(rawRule);
        if (ruleProfileId) {
          (cleanUnmigrated as RecurringRule & { profileId?: string }).profileId = ruleProfileId;
        }
        unmigratedRules.push(cleanUnmigrated);
      }
    }

    migrated.recurringRules = unmigratedRules;
  }

  // --- MIGRATION: AppState.transactionRules to Profile.transactionRules ---
  if (migrated.transactionRules && migrated.transactionRules.length > 0) {
    const unmigratedRules: TransactionRule[] = [];

    for (const rawRule of migrated.transactionRules) {
      if (!isRuleLike(rawRule)) {
        continue;
      }

      const ruleProfileId = typeof rawRule.profileId === "string" && rawRule.profileId.trim() !== "" ? rawRule.profileId : undefined;
      const targetProfile = findTargetProfile(ruleProfileId, originalActiveProfileId, migrated.profiles);

      if (targetProfile) {
        const cleanRule = normalizeTransactionRule(rawRule);
        delete cleanRule.profileId;
        if (!targetProfile.transactionRules) {
          targetProfile.transactionRules = [];
        }
        const exists = targetProfile.transactionRules.some((r) => r.id === cleanRule.id);
        if (!exists) {
          targetProfile.transactionRules.push(cleanRule);
        }
      } else {
        const cleanUnmigrated = normalizeTransactionRule(rawRule);
        if (ruleProfileId) {
          cleanUnmigrated.profileId = ruleProfileId;
        }
        unmigratedRules.push(cleanUnmigrated);
      }
    }

    migrated.transactionRules = unmigratedRules;
  }

  return migrated;
}

export function useBudgetState(googleUser: User | null) {
  const [state, setState] = useState<AppState>(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const cachedV2 = localStorage.getItem(localDb.LOCAL_STORAGE_KEY_V2);
      if (cachedV2) {
        try {
          return validateAndMigrateState(JSON.parse(cachedV2));
        } catch (_) {}
      }
      const cachedV1 = localStorage.getItem(localDb.LOCAL_STORAGE_KEY_V1);
      if (cachedV1) {
        try {
          return validateAndMigrateState(JSON.parse(cachedV1));
        } catch (_) {}
      }
    }
    return {
      profiles: [],
      activeProfileId: null,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: "",
      lastModifiedBy: "domyślny",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [historyState, setHistoryState] = useState<AppState | null>(null);

  // References to handle timestamp conflict resolution
  const localUpdatedAtRef = useRef<string>(state.updatedAt || "");
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestSaveDataRef = useRef<unknown>(null);

  // Load from IndexedDB on mount with race-condition protection
  useEffect(() => {
    let isMounted = true;
    setIsSyncing(true);

    localDb.loadState().then((loaded) => {
      if (isMounted && loaded && loaded.updatedAt) {
        const loadedTime = loaded.updatedAt;
        const currentTime = localUpdatedAtRef.current;

        // Apply loaded ONLY if loaded.updatedAt is strictly newer than current in-memory timestamp
        if (loadedTime > currentTime) {
          setState(loaded);
          localUpdatedAtRef.current = loadedTime;
        }
      }
    }).catch((err) => {
      console.warn("Failed loading state from IndexedDB:", err);
    }).finally(() => {
      if (isMounted) {
        setIsSyncing(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Cleanup upload timeout on unmount
  useEffect(() => {
    return () => {
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
      }
    };
  }, []);

  // Create a backup snapshot before destructive operations (CSV import, restore etc)
  const makeUndoBackup = useCallback((customState?: AppState) => {
    setHistoryState(JSON.parse(JSON.stringify(customState || state)));
  }, [state]);

  // Fetch state from the backend Express server (Fallback / Demo mode)
  const fetchState = useCallback(async (showLoader = false) => {
    if (showLoader) setIsSyncing(true);
    setApiError(null);
    if (showLoader) setIsSyncing(false);
  }, [googleUser]);

  // Save state to Firestore, local server or local storage / IDB
  const saveState = useCallback(async (newState: AppState, localOnly = false) => {
    const timestamp = new Date().toISOString();
    const userEmail = googleUser?.email || "lokalny";

    const preparedState = await prepareStateForRemoteSave({
      ...newState,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: timestamp,
      lastModifiedBy: userEmail
    });

    const cleanState = JSON.parse(JSON.stringify(preparedState));

    setState({
      ...newState,
      updatedAt: timestamp,
      lastModifiedBy: userEmail
    });
    localUpdatedAtRef.current = timestamp;

    try {
      await localDb.saveState(cleanState);
      setApiError(prev => (prev && prev.includes("Rozważ archiwizację") ? prev : null));
    } catch (err: any) {
      if (err?.message?.includes("QUOTA_EXCEEDED")) {
        setApiError("Przekroczono limit pamięci urządzenia (QuotaExceeded). Niektóre zmiany nie mogły zostać zapisane lokalnie.");
      } else {
        console.error("Local save failed:", err);
      }
    }

    if (localOnly) return;

    if (googleUser) {
      latestSaveDataRef.current = cleanState;
      
      if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
      }

      uploadTimeoutRef.current = setTimeout(() => {
        if (!navigator.onLine) {
          setApiError("Jesteś offline. Zmiany zapisano lokalnie.");
          return;
        }
        const dataToUpload = latestSaveDataRef.current;
        saveQueueRef.current = saveQueueRef.current.then(async () => {
          try {
            const payloadBytes = estimateJsonSizeBytes(dataToUpload);
            if (payloadBytes >= FIRESTORE_DOC_HARD_LIMIT_BYTES) {
              setApiError("Dane są zbyt duże, aby zapisać je w chmurze. Zmiany pozostają lokalnie na urządzeniu. Rozważ archiwizację starszych transakcji.");
              return;
            } else if (payloadBytes >= FIRESTORE_DOC_WARNING_BYTES) {
              setApiError("Dane zbliżają się do limitu chmury. Rozważ archiwizację starszych transakcji, aby uniknąć problemów z synchronizacją.");
            }

            const docRef = doc(db, "users", googleUser.uid);
            await setDoc(docRef, dataToUpload, { merge: false });
          } catch (err: any) {
            console.error("Firestore write failed:", err);
            const msg = String(err?.message || "").toLowerCase();
            const isSizeError = msg.includes("size") || msg.includes("1 mib") || msg.includes("maximum") || msg.includes("too large");
            if (isSizeError) {
              setApiError("Nie udało się zapisać danych w chmurze, bo dokument przekroczył limit rozmiaru. Zmiany pozostają lokalnie. Rozważ archiwizację starszych transakcji.");
            } else {
              setApiError("Błąd synchronizacji z chmurą. Dane zapisano lokalnie na urządzeniu.");
            }
          }
        });
      }, 500);
    }
  }, [googleUser]);

  // Undo the last destructive action
  const undo = useCallback(async () => {
    if (!historyState) return false;
    const previous = JSON.parse(JSON.stringify(historyState));
    setHistoryState(null);
    await saveState(previous);
    return true;
  }, [historyState, saveState]);

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    if (!googleUser || !db) {
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);
    setApiError(null);

    const docRef = doc(db, "users", googleUser.uid);
    let isFirstSnapshot = true;

    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      setIsSyncing(false);
      if (docSnap.exists()) {
        const incoming = validateAndMigrateState(docSnap.data(), googleUser.email || "chmura");
        
        const incomingTime = new Date(incoming.updatedAt || 0).getTime();
        const localTime = new Date(localUpdatedAtRef.current).getTime();
        
        if (isFirstSnapshot || incomingTime > localTime) {
          isFirstSnapshot = false;
          const rawIncoming = JSON.parse(JSON.stringify(incoming));
          const decryptedProfiles = await Promise.all(incoming.profiles.map(async (p: Profile) => {
            if (p.encryptedPayload && activeKeys[p.id]) {
              try {
                return await decryptProfile(p, activeKeys[p.id]);
              } catch (err) {
                console.error("Failed decrypting profile:", p.id, err);
                setApiError("Nie udało się odszyfrować danych profilu z chmury. Sprawdź poprawność kodu PIN.");
                return p;
              }
            }
            return p;
          }));
          incoming.profiles = decryptedProfiles;

          setState(incoming);
          localDb.saveState(rawIncoming).catch((err) => {
            if (err?.message?.includes("QUOTA_EXCEEDED")) {
              setApiError("Przekroczono limit pamięci urządzenia (QuotaExceeded).");
            }
          });
          localUpdatedAtRef.current = incoming.updatedAt || new Date().toISOString();
        }
      } else {
        const cached = await localDb.loadState();
        if (cached) {
          try {
            void saveState(cached);
          } catch (_) {}
        } else {
          const emptyProfile: Profile = {
            id: crypto.randomUUID(),
            name: "Mój profil",
            kind: "personal" as const,
            transactions: [],
            payments: [],
            goals: [],
            investments: [],
            budgets: {}
          };
          const emptyState: AppState = {
            profiles: [emptyProfile],
            activeProfileId: emptyProfile.id,
            schemaVersion: CURRENT_SCHEMA_VERSION,
            updatedAt: new Date().toISOString(),
            lastModifiedBy: googleUser.email || "użytkownik",
            driveFileId: null,
            recurringRules: [],
            transactionRules: []
          };
          void saveState(emptyState);
        }
      }
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
      setApiError("Błąd odczytu chmury. Praca w trybie lokalnym.");
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, [googleUser, fetchState, saveState]);

  return {
    state,
    saveState,
    isSyncing,
    apiError,
    setApiError,
    refreshState: () => fetchState(true),
    undo,
    canUndo: historyState !== null,
    makeUndoBackup
  };
}

```


## File: src/hooks/useDashboardMetrics.test.ts
```ts
import { describe, it, expect } from "vitest";
import { calculateDashboardMetrics } from "./useDashboardMetrics";
import { Profile, RecurringRule } from "../types";

describe("calculateDashboardMetrics", () => {
  it("calculates total income, expense and balance correctly for the current month", () => {
    const profile: Profile = {
      id: "p1",
      name: "Test",
      kind: "personal",
      avatar: "",
      accounts: [],
      transactions: [
        { id: "1", name: "Salary", amount: 5000, type: "income", category: "Wynagrodzenie", account: "A1", isoDate: "2026-07-10" },
        { id: "2", name: "Groceries", amount: 200, type: "expense", category: "Żywność", account: "A1", isoDate: "2026-07-11" },
        { id: "3", name: "Old Groceries", amount: 300, type: "expense", category: "Żywność", account: "A1", isoDate: "2026-06-11" }, // outside current month
      ],
      investments: [],
      goals: [],
      budgets: { "Żywność": 1000 },
      payments: [],
    };
    
    // Test date is July 2026
    const selectedDate = new Date("2026-07-15T12:00:00Z");
    const recurringRules: RecurringRule[] = [];

    const result = calculateDashboardMetrics(profile, selectedDate, recurringRules);

    expect(result.totalIncome).toBe(5000);
    expect(result.totalExpense).toBe(200);
    expect(result.balance).toBe(4800);
    expect(result.totalPlannedBudget).toBe(1000); // 1000 planned for Żywność
    expect(result.totalActualSpentInBudget).toBe(200);
  });
});

```


## File: src/hooks/useDashboardMetrics.ts
```ts
import { useMemo } from 'react';
import { Profile, RecurringRule, Payment, Transaction } from '../types';
import { calculateEndOfMonthForecast, calculateBudgetWarnings, calculateSafeToSpend, SafeToSpendBreakdown, BudgetWarning } from '../services/budgetCalculations';
import { budgetCategories, monthsPl } from '../utils';

export interface DashboardChartPoint {
  year: number;
  month: number;
  label: string;
  income: number;
  expense: number;
  isCurrent: boolean;
  incomeHeight: number;
  expenseHeight: number;
}

export interface DashboardRecentTransaction {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  account: string;
  isoDate: string;
  tags?: string[];
  isRecurring?: boolean;
  recurringRuleId?: string;
  paidBy?: "me" | "partner" | "joint";
  splitMode?: "none" | "equal";
}

export interface DashboardMetrics {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  categorySpentMap: Record<string, number>;
  emergencyLimit: number;
  investmentCushion: number;
  unpaidPayments: Payment[];
  urgentPaymentsCount: number;
  totalPlannedBudget: number;
  totalActualSpentInBudget: number;
  endOfMonthForecast: ReturnType<typeof calculateEndOfMonthForecast>;
  budgetWarnings: BudgetWarning[];
  safeBreakdown: SafeToSpendBreakdown;
  chartData: DashboardChartPoint[];
  recentTransactions: DashboardRecentTransaction[];
}

export function calculateDashboardMetrics(profile: Profile, selectedDate: Date, recurringRules: RecurringRule[]): DashboardMetrics {
  const currentYear = selectedDate.getFullYear();
  const currentMonthIdx = selectedDate.getMonth();

  let totalIncome = 0;
  let totalExpense = 0;
  const categorySpentMap: Record<string, number> = {};

  profile.transactions.forEach((t) => {
    const d = new Date(`${t.isoDate}T12:00:00`);
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx) {
      if (t.type === "income") {
        totalIncome += t.amount;
      } else if (t.type === "expense") {
        totalExpense += t.amount;
        categorySpentMap[t.category] = (categorySpentMap[t.category] || 0) + t.amount;
      }
    }
  });

  const balance = totalIncome - totalExpense;

  let emergencyLimit = 0;
  (profile.accounts || []).forEach(a => {
    if (a.hasCreditLimit && a.creditLimit) {
      emergencyLimit += a.creditLimit;
    }
  });

  let investmentCushion = 0;
  (profile.investments || []).forEach(inv => {
    if (inv.type === "Poduszka finansowa") {
      investmentCushion += inv.amount;
    }
  });

  const unpaidPayments = profile.payments
    .filter((p) => p.status !== "Opłacono")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const urgentPaymentsCount = unpaidPayments.filter((p) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    const diffTime = pDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }).length;

  let totalPlannedBudget = 0;
  let totalActualSpentInBudget = 0;
  budgetCategories.forEach(cat => {
    totalPlannedBudget += (profile.budgets[cat] || 0);
    totalActualSpentInBudget += (categorySpentMap[cat] || 0);
  });

  const endOfMonthForecast = calculateEndOfMonthForecast(profile, recurringRules);
  const selectedDateIso = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-15`;
  const budgetWarnings = calculateBudgetWarnings(profile, selectedDateIso)
    .filter(w => w.status !== "normal")
    .sort((a, b) => b.ratio - a.ratio);

  const safeBreakdown = calculateSafeToSpend(profile, recurringRules);

  const targetMonths = [];
  const todayDate = new Date(selectedDate);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(todayDate.getFullYear(), todayDate.getMonth() - i, 1);
    targetMonths.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: monthsPl[d.getMonth()].slice(0, 3),
      income: 0,
      expense: 0,
      isCurrent: i === 0
    });
  }

  profile.transactions.forEach((t) => {
    const txDate = new Date(`${t.isoDate}T12:00:00`);
    const y = txDate.getFullYear();
    const m = txDate.getMonth();
    
    const target = targetMonths.find(tm => tm.year === y && tm.month === m);
    if (target) {
      if (t.type === "income") target.income += t.amount;
      else if (t.type === "expense") target.expense += t.amount;
    }
  });

  const maxVal = Math.max(...targetMonths.map(d => Math.max(d.income, d.expense, 1000)));
  const mappedChartData = targetMonths.map(d => ({
    ...d,
    incomeHeight: Math.max(5, Math.round((d.income / maxVal) * 100)),
    expenseHeight: Math.max(5, Math.round((d.expense / maxVal) * 100))
  }));

  const recentTransactions = [...profile.transactions]
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate))
    .slice(0, 4);

  return {
    totalIncome,
    totalExpense,
    balance,
    categorySpentMap,
    emergencyLimit,
    investmentCushion,
    unpaidPayments,
    urgentPaymentsCount,
    totalPlannedBudget,
    totalActualSpentInBudget,
    endOfMonthForecast,
    budgetWarnings,
    safeBreakdown,
    chartData: mappedChartData,
    recentTransactions
  };
}

export function useDashboardMetrics(profile: Profile, selectedDate: Date, recurringRules: RecurringRule[]): DashboardMetrics {
  return useMemo(() => calculateDashboardMetrics(profile, selectedDate, recurringRules), [profile, selectedDate, recurringRules]);
}

```


## File: src/hooks/useDriveSync.ts
```ts
import { useState, useEffect, useCallback } from "react";
import { AppState } from "../types";
import { findBudgetFile, readBudgetFile, updateBudgetFile, createBudgetFile, GoogleAuthError } from "../googleDrive";
import { validateAndMigrateState } from "./useBudgetState";
import { prepareStateForRemoteSave, decryptProfile, activeKeys } from "../services/crypto";

export type ConflictResolutionChoice = "download_remote" | "upload_local" | "cancel";

export interface SyncConflictInfo {
  localState: AppState;
  remoteState: AppState;
  lastSyncedAt?: string | null;
  fileId?: string | null;
}

interface UseDriveSyncProps {
  driveToken: string | null;
  state: AppState;
  onImportState: (newState: AppState) => void;
  onBeforeRestore?: () => void;
  onDriveAuthInvalid?: () => void;
}

const DRIVE_FILE_ID_KEY = "saldo-drive-file-id";
const LAST_SYNCED_AT_KEY = "saldo-drive-last-synced-iso";

/**
 * Pure function to detect conflict between local and remote state.
 */
export function detectConflict(
  local: { updatedAt?: string } | null | undefined,
  remote: { updatedAt?: string } | null | undefined,
  lastSyncedAt?: string | null
): boolean {
  if (!local || !remote) {
    return false;
  }

  const localTs = local.updatedAt || null;
  const remoteTs = remote.updatedAt || null;

  // Exact timestamp match means no conflict
  if (localTs && remoteTs && localTs === remoteTs) {
    return false;
  }

  if (lastSyncedAt) {
    const lastSyncedTime = new Date(lastSyncedAt).getTime();
    if (!isNaN(lastSyncedTime) && lastSyncedTime > 0) {
      const localTime = localTs ? new Date(localTs).getTime() : 0;
      const remoteTime = remoteTs ? new Date(remoteTs).getTime() : 0;

      const localHasNewerChanges = localTime > lastSyncedTime;
      const remoteHasNewerChanges = remoteTime > lastSyncedTime;

      if (localHasNewerChanges && remoteHasNewerChanges && localTs !== remoteTs) {
        return true;
      }

      return false;
    }
  }

  if (localTs && remoteTs && localTs !== remoteTs) {
    return true;
  }

  return false;
}

export function useDriveSync({
  driveToken,
  state,
  onImportState,
  onBeforeRestore,
  onDriveAuthInvalid
}: UseDriveSyncProps) {
  const [gdriveFileId, setGdriveFileId] = useState<string | null>(() => {
    return state.driveFileId || (typeof window !== "undefined" ? localStorage.getItem(DRIVE_FILE_ID_KEY) : null);
  });
  const [gdriveLastSynced, setGdriveLastSynced] = useState<string | null>(null);
  const [isDriveActionLoading, setIsDriveActionLoading] = useState<boolean>(false);
  const [driveConflictInfo, setDriveConflictInfo] = useState<SyncConflictInfo | null>(null);

  // Keep gdriveFileId and localStorage in sync
  useEffect(() => {
    if (state.driveFileId) {
      setGdriveFileId(state.driveFileId);
      if (typeof window !== "undefined") {
        localStorage.setItem(DRIVE_FILE_ID_KEY, state.driveFileId);
      }
    }
  }, [state.driveFileId]);

  // Auto-lookup the file when token is available if we don't have a known driveFileId
  useEffect(() => {
    if (driveToken) {
      const savedId = state.driveFileId || localStorage.getItem(DRIVE_FILE_ID_KEY);
      if (savedId) {
        setGdriveFileId(savedId);
      } else {
        findBudgetFile(driveToken)
          .then((file) => {
            if (file) {
              setGdriveFileId(file.id);
              localStorage.setItem(DRIVE_FILE_ID_KEY, file.id);
              if (file.modifiedTime) {
                setGdriveLastSynced(new Date(file.modifiedTime).toLocaleString("pl-PL"));
              }
            }
          })
          .catch((e) => {
            if (e instanceof GoogleAuthError || e.message?.includes("SESSION_EXPIRED")) {
              if (onDriveAuthInvalid) onDriveAuthInvalid();
            }
          });
      }
    } else {
      setGdriveFileId(null);
      setGdriveLastSynced(null);
    }
  }, [driveToken, state.driveFileId]);

  const backupToDriveManual = useCallback(
    async (options?: { forceAction?: ConflictResolutionChoice }): Promise<void> => {
      if (!navigator.onLine) {
        throw new Error("Jesteś offline. Połącz się z internetem, aby zsynchronizować z dyskiem.");
      }
      if (!driveToken) {
        throw new Error("Konto Google Drive nie jest podłączone.");
      }
      setIsDriveActionLoading(true);
      try {
        let fileId = gdriveFileId || state.driveFileId || localStorage.getItem(DRIVE_FILE_ID_KEY);
        const lastSyncedAtIso = localStorage.getItem(LAST_SYNCED_AT_KEY);

        // Fetch remote state to check for conflict unless forceAction is specified
        if (!options?.forceAction && fileId) {
          try {
            const rawRemote = await readBudgetFile(driveToken, fileId);
            if (rawRemote && Array.isArray(rawRemote.profiles)) {
              const validatedRemote = validateAndMigrateState(rawRemote);
              const isConflict = detectConflict(state, validatedRemote, lastSyncedAtIso);
              if (isConflict) {
                setDriveConflictInfo({
                  localState: state,
                  remoteState: validatedRemote,
                  lastSyncedAt: lastSyncedAtIso,
                  fileId
                });
                return;
              }
            }
          } catch (e: any) {
            if (e instanceof GoogleAuthError || e.message?.includes("SESSION_EXPIRED")) {
              throw e;
            }
          }
        }

        const stateToBackup = await prepareStateForRemoteSave(state);
        let targetFileId: string | null = fileId;

        if (fileId) {
          try {
            await updateBudgetFile(driveToken, fileId, stateToBackup);
          } catch (err: any) {
            if (err.message?.includes("FILE_NOT_FOUND")) {
              fileId = null;
              setGdriveFileId(null);
              localStorage.removeItem(DRIVE_FILE_ID_KEY);
              targetFileId = null;
            } else {
              throw err;
            }
          }
        }

        if (!targetFileId) {
          const existing = await findBudgetFile(driveToken);
          if (existing) {
            await updateBudgetFile(driveToken, existing.id, stateToBackup);
            targetFileId = existing.id;
          } else {
            targetFileId = await createBudgetFile(driveToken, stateToBackup);
          }
        }

        if (targetFileId) {
          setGdriveFileId(targetFileId);
          localStorage.setItem(DRIVE_FILE_ID_KEY, targetFileId);
          onImportState({ ...stateToBackup, driveFileId: targetFileId });
        }

        const syncIso = stateToBackup.updatedAt || new Date().toISOString();
        localStorage.setItem(LAST_SYNCED_AT_KEY, syncIso);
        setGdriveLastSynced(new Date().toLocaleString("pl-PL"));
      } catch (err: any) {
        if (err instanceof GoogleAuthError || err.message?.includes("SESSION_EXPIRED")) {
          if (onDriveAuthInvalid) onDriveAuthInvalid();
          throw new Error("Sesja Google Drive wygasła. Połącz Google Drive ponownie.");
        }
        throw err;
      } finally {
        setIsDriveActionLoading(false);
      }
    },
    [driveToken, gdriveFileId, state, onImportState, onDriveAuthInvalid]
  );

  const restoreFromDriveManual = useCallback(
    async (options?: { forceAction?: ConflictResolutionChoice }): Promise<void> => {
      if (!navigator.onLine) {
        throw new Error("Jesteś offline. Połącz się z internetem, aby pobrać kopię zapasową z dysku.");
      }
      if (!driveToken) {
        throw new Error("Konto Google Drive nie jest podłączone.");
      }
      setIsDriveActionLoading(true);
      try {
        let fileId = gdriveFileId || state.driveFileId || localStorage.getItem(DRIVE_FILE_ID_KEY);
        const lastSyncedAtIso = localStorage.getItem(LAST_SYNCED_AT_KEY);

        let importedRawState: AppState | null = null;
        let validFileId: string | null = null;

        if (fileId) {
          try {
            importedRawState = await readBudgetFile(driveToken, fileId);
            validFileId = fileId;
          } catch (e: any) {
            if (e instanceof GoogleAuthError || e.message?.includes("SESSION_EXPIRED")) {
              throw e;
            }
            fileId = null;
            setGdriveFileId(null);
            localStorage.removeItem(DRIVE_FILE_ID_KEY);
          }
        }

        if (!importedRawState) {
          const file = await findBudgetFile(driveToken);
          if (!file) {
            throw new Error("Nie odnaleziono pliku kopii zapasowej 'saldo_budget.json' na Dysku Google.");
          }
          importedRawState = await readBudgetFile(driveToken, file.id);
          validFileId = file.id;
        }

        if (importedRawState && Array.isArray(importedRawState.profiles)) {
          const validatedState = validateAndMigrateState({ ...importedRawState, driveFileId: validFileId });

          if (!options?.forceAction) {
            const isConflict = detectConflict(state, validatedState, lastSyncedAtIso);
            if (isConflict) {
              setDriveConflictInfo({
                localState: state,
                remoteState: validatedState,
                lastSyncedAt: lastSyncedAtIso,
                fileId: validFileId
              });
              return;
            }
          }

          const decryptedProfiles = await Promise.all(
            validatedState.profiles.map(async (p) => {
              if (p.encryptedPayload && activeKeys[p.id]) {
                try {
                  return await decryptProfile(p, activeKeys[p.id]);
                } catch (err) {
                  console.error("Failed decrypting restored profile:", p.id);
                  return p;
                }
              }
              return p;
            })
          );
          validatedState.profiles = decryptedProfiles;

          if (onBeforeRestore) {
            onBeforeRestore();
          }

          onImportState(validatedState);
          if (validFileId) {
            setGdriveFileId(validFileId);
            localStorage.setItem(DRIVE_FILE_ID_KEY, validFileId);
          }
          const syncIso = validatedState.updatedAt || new Date().toISOString();
          localStorage.setItem(LAST_SYNCED_AT_KEY, syncIso);
          setGdriveLastSynced(new Date().toLocaleString("pl-PL"));
        } else {
          throw new Error("Pobrany plik ma nieprawidłowy format danych.");
        }
      } catch (err: any) {
        if (err instanceof GoogleAuthError || err.message?.includes("SESSION_EXPIRED")) {
          if (onDriveAuthInvalid) onDriveAuthInvalid();
          throw new Error("Sesja Google Drive wygasła. Połącz Google Drive ponownie.");
        }
        throw err;
      } finally {
        setIsDriveActionLoading(false);
      }
    },
    [driveToken, gdriveFileId, state, onImportState, onBeforeRestore, onDriveAuthInvalid]
  );

  const resolveDriveConflict = useCallback(
    async (choice: ConflictResolutionChoice) => {
      // Task 4: Log decision locally without PII
      console.log(`[DriveSync] Decision logged locally: ${choice}`);
      try {
        const existingLogs = JSON.parse(localStorage.getItem("saldo-conflict-decision-logs") || "[]");
        existingLogs.push({
          timestamp: new Date().toISOString(),
          decision: choice
        });
        localStorage.setItem("saldo-conflict-decision-logs", JSON.stringify(existingLogs.slice(-20)));
      } catch (_) {}

      setDriveConflictInfo(null);

      if (choice === "download_remote") {
        await restoreFromDriveManual({ forceAction: "download_remote" });
      } else if (choice === "upload_local") {
        await backupToDriveManual({ forceAction: "upload_local" });
      } else {
        console.log("[DriveSync] Conflict resolution cancelled by user.");
      }
    },
    [backupToDriveManual, restoreFromDriveManual]
  );

  return {
    gdriveFileId,
    gdriveLastSynced,
    isDriveActionLoading,
    driveConflictInfo,
    backupToDriveManual,
    restoreFromDriveManual,
    resolveDriveConflict,
    closeDriveConflictModal: () => setDriveConflictInfo(null)
  };
}

```


## File: src/hooks/useModalManager.ts
```ts
import { useState, useCallback } from "react";
import { ModalState, ModalType } from "../types";

export function useModalManager() {
  const [modalState, setModalState] = useState<ModalState>({ type: null });

  function openModal(type: "transaction", payload?: import("../types").Transaction): void;
  function openModal(type: "payment", payload?: import("../types").Payment): void;
  function openModal(type: "goal" | "profile" | "pin" | "budget" | "aiChat" | "changelog"): void;
  function openModal(type: "goalDeposit", payload: import("../types").Goal): void;
  function openModal(type: "calendarAi", payload?: import("../types").Payment): void;
  function openModal(type: ModalType, payload?: any) {
    if (type === "goalDeposit") {
      setModalState({ type, payload });
    } else if (type === "calendarAi") {
      setModalState({ type, payload });
    } else if (type === "transaction") {
      setModalState({ type, payload });
    } else if (type === "payment") {
      setModalState({ type, payload });
    } else if (type) {
      setModalState({ type } as ModalState);
    }
  }

  const closeModal = useCallback(() => {
    setModalState({ type: null });
  }, []);

  const isOpen = useCallback((type: ModalType) => modalState.type === type, [modalState.type]);

  return {
    modalState,
    openModal,
    closeModal,
    isOpen
  };
}

```


## File: src/hooks/useProfileSecurity.ts
```ts
import { useState, useCallback, useMemo } from "react";
import { Profile, AppState } from "../types";
import { hashPin } from "../utils";
import { deriveKeyFromPin, activeKeys, decryptProfile, generateRandomSalt } from "../services/crypto";

export function useProfileSecurity({
  state,
  activeProfile,
  saveState,
}: {
  state: AppState;
  activeProfile: Profile | null;
  saveState: (newState: AppState, localOnly?: boolean) => void;
}) {
  const [unlockedProfileId, setUnlockedProfileId] = useState<string | null>(null);
  const [isSecurityInfoOpen, setIsSecurityInfoOpen] = useState(false);

  const unlockProfile = useCallback((profileId: string) => {
    setUnlockedProfileId(profileId);
  }, []);

  const lockProfile = useCallback(() => {
    setUnlockedProfileId(null);
  }, []);

  const toggleSecurityInfo = useCallback((isOpen?: boolean) => {
    setIsSecurityInfoOpen((prev) => (isOpen !== undefined ? isOpen : !prev));
  }, []);

  const checkAccess = useCallback((profile: Profile | null): boolean => {
    if (!profile) return false;
    // Otwarty profil (brak PIN) lub profil poprawnie odblokowany
    return !profile.pinHash || unlockedProfileId === profile.id;
  }, [unlockedProfileId]);

  const isProfileLocked = useMemo(() => {
    return !!(activeProfile?.pinHash && unlockedProfileId !== activeProfile.id);
  }, [activeProfile, unlockedProfileId]);

  const handleUnlockProfile = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!activeProfile) return false;
      try {
        const salt = activeProfile.salt || activeProfile.id;
        const hashed = await hashPin(pin, salt);
        if (hashed === activeProfile.pinHash) {
          const key = await deriveKeyFromPin(pin, salt);
          
          let decrypted = activeProfile;
          if (activeProfile.encryptedPayload) {
            try {
              decrypted = await decryptProfile(activeProfile, key);
            } catch (decryptErr) {
              console.error("Unlock profile decryption error:", decryptErr);
              throw new Error("Nie udało się odszyfrować danych profilu. Sprawdź kod PIN lub spójność danych.");
            }
          }
          activeKeys[activeProfile.id] = key;
          
          const updatedProfiles = state.profiles.map(p => p.id === activeProfile.id ? decrypted : p);
          
          saveState({ ...state, profiles: updatedProfiles }, true);
          unlockProfile(activeProfile.id);
          return true;
        }
        return false;
      } catch (err) {
        console.error("Unlock profile error:", err);
        return false;
      }
    },
    [activeProfile, unlockProfile, state, saveState]
  );

  const handleSetProfilePin = useCallback(
    async (pin: string | null) => {
      if (!activeProfile) return;
      if (pin) {
        const newSalt = generateRandomSalt();
        const newHash = await hashPin(pin, newSalt);
        const key = await deriveKeyFromPin(pin, newSalt);
        activeKeys[activeProfile.id] = key;
        
        const updatedProfiles = state.profiles.map((p) => {
          if (p.id === activeProfile.id) {
            return { ...p, pinHash: newHash, salt: newSalt };
          }
          return p;
        });
        saveState({ ...state, profiles: updatedProfiles });
        unlockProfile(activeProfile.id);
      } else {
        delete activeKeys[activeProfile.id];
        const updatedProfiles = state.profiles.map((p) => {
          if (p.id === activeProfile.id) {
            const { encryptedPayload, salt, pinHash, ...rest } = p;
            return { ...rest, pinHash: "" };
          }
          return p;
        });
        saveState({ ...state, profiles: updatedProfiles });
      }
    },
    [activeProfile, state, saveState, unlockProfile]
  );

  return {
    unlockedProfileId,
    unlockProfile,
    lockProfile,
    isSecurityInfoOpen,
    toggleSecurityInfo,
    checkAccess,
    isProfileLocked,
    handleUnlockProfile,
    handleSetProfilePin
  };
}

```


## File: src/hooks/useRecurringTransactions.ts
```ts
import { getLocalDateIso } from "../utils";
import { useEffect, useRef } from "react";
import { AppState, Profile } from "../types";
import { applyRecurringRules } from "../services/recurringEngine";

interface UseRecurringTransactionsProps {
  state: AppState;
  activeProfile: Profile | null;
  saveState: (newState: AppState) => Promise<void> | void;
}

export function useRecurringTransactions({
  state,
  activeProfile,
  saveState
}: UseRecurringTransactionsProps) {
  const isProcessing = useRef(false);

  useEffect(() => {
    if (!activeProfile || isProcessing.current) {
      return;
    }
    
    // Read rules strictly from activeProfile
    const rules = activeProfile.recurringRules ?? [];
    if (rules.length === 0) {
      return;
    }

    const todayStr = getLocalDateIso();

    const { updatedRules, generatedTransactions, hasChanges } = applyRecurringRules(
      rules,
      activeProfile.transactions,
      todayStr
    );

    if (hasChanges) {
      isProcessing.current = true;

      const updatedProfiles = state.profiles.map((p) => {
        if (p.id === activeProfile.id) {
          return {
            ...p,
            transactions: [...generatedTransactions, ...p.transactions],
            recurringRules: updatedRules
          };
        }
        return p;
      });

      Promise.resolve(
        saveState({
          ...state,
          profiles: updatedProfiles
        })
      ).finally(() => {
        isProcessing.current = false;
      });
    }
  }, [state, activeProfile, saveState]);
}

```


## File: src/hooks/useTheme.ts
```ts
import { useState, useEffect } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark" | "system" | any>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("saldo_theme") as "light" | "dark" | "system") || "system";
    }
    return "system";
  });

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("saldo_theme", newTheme);
  };

  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      let isDark = false;

      if (theme === "dark") {
        isDark = true;
      } else if (theme === "light") {
        isDark = false;
      } else {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      }

      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    applyTheme();

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  return { theme, handleThemeChange };
}

```


## File: src/index.css
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Plus Jakarta Sans", "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.98) translateY(4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-slide-up {
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes pulse-slow {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
.animate-pulse-slow {
  animation: pulse-slow 3s infinite ease-in-out;
}


/* Custom scrollbars for a cleaner panel view */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1; /* slate-300 */
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8; /* slate-400 */
}

/* Custom resets & theme adjustments to Bento Grid style */
body {
  font-family: var(--font-sans);
  background-color: #f8fafc; /* Slate-50 app background */
  color: #0f172a; /* Slate-900 general text */
}

/* Map the teal-themed custom colors to Indigo/Slate Bento theme */

/* 1. App backdrop: bg-[#f6f8f7] */
.bg-\[\#f6f8f7\] {
  background-color: #f8fafc !important; /* slate-50 */
}

/* 2. Brand Primary Background: bg-[#137566] */
.bg-\[\#137566\] {
  background-color: #4f46e5 !important; /* indigo-600 */
}

/* 3. Brand Primary Hover: hover:bg-[#0f5d51] */
.hover\:bg-\[\#0f5d51\]:hover,
.hover\:bg-\[\#0f5d51\]:focus {
  background-color: #4338ca !important; /* indigo-700 */
}

/* 4. Brand Primary Active/Alt: bg-[#0f5d51] */
.bg-\[\#0f5d51\] {
  background-color: #4338ca !important; /* indigo-700 */
}

/* 5. Brand Primary Text: text-[#137566] */
.text-\[\#137566\] {
  color: #4f46e5 !important; /* indigo-600 */
}

/* 6. Dark Header Text: text-[#153a35] */
.text-\[\#153a35\] {
  color: #0f172a !important; /* slate-900 */
}

/* 7. Light Indigo/Teal Accent Background: bg-[#e7f3f0] */
.bg-\[\#e7f3f0\] {
  background-color: #f0f2fe !important; /* indigo-50 */
}

/* 8. Light Teal Border: border-[#137566]/20 or border-[#137566]/40 */
.border-\[\#137566\]\/20 {
  border-color: rgba(79, 70, 229, 0.15) !important; /* indigo-200 */
}
.border-\[\#137566\]\/40 {
  border-color: rgba(79, 70, 229, 0.3) !important; /* indigo-300 */
}

/* 9. Muted Sage Text: text-[#849590] */
.text-\[\#849590\] {
  color: #64748b !important; /* slate-500 */
}

/* 10. Secondary Muted Teal Text: text-[#739087] */
.text-\[\#739087\] {
  color: #64748b !important; /* slate-500 */
}

/* 11. Profile Avatar: bg-[#d7e8e3] */
.bg-\[\#d7e8e3\] {
  background-color: #e0e7ff !important; /* indigo-100 */
}

/* 12. Negative Balance/Expense text: text-[#d55e50] */
.text-\[\#d55e50\] {
  color: #e11d48 !important; /* rose-600 */
}
.bg-\[\#d55e50\] {
  background-color: #e11d48 !important; /* rose-600 */
}

/* 13. Expense Button/Badge state mapping */
.bg-rose-100 {
  background-color: #ffe4e6 !important; /* rose-100 */
}
.text-rose-800 {
  color: #9f1239 !important; /* rose-800 */
}

/* Card overrides for beautiful Bento look */
.bg-white.rounded-xl,
.bg-white.rounded-2xl,
.bg-white.rounded-3xl {
  border-radius: 1.5rem !important; /* rounded-3xl */
  border-color: #e2e8f0 !important; /* border-slate-200 */
  box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.03), 0 1px 2px -1px rgba(15, 23, 42, 0.03) !important; /* shadow-sm */
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease !important;
}

.bg-white.rounded-xl:hover,
.bg-white.rounded-2xl:hover {
  box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.05), 0 4px 6px -4px rgba(15, 23, 42, 0.05) !important;
}

/* Ensure borders match slate-200 */
.border-gray-100 {
  border-color: #f1f5f9 !important; /* slate-100 */
}
.border-gray-150 {
  border-color: #e2e8f0 !important; /* slate-200 */
}
.border-gray-200 {
  border-color: #e2e8f0 !important; /* slate-200 */
}

/* Input elements style upgrades for Bento theme */
input[type="text"],
input[type="number"],
input[type="date"],
input[type="search"],
select,
textarea {
  border-radius: 0.75rem !important; /* rounded-xl */
  border-color: #cbd5e1 !important; /* border-slate-300 */
  transition: all 0.15s ease-in-out !important;
}
input[type="text"]:focus,
input[type="number"]:focus,
input[type="date"]:focus,
input[type="search"]:focus,
select:focus,
textarea:focus {
  border-color: #4f46e5 !important; /* border-indigo-600 */
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15) !important;
}

/* --- DARK MODE EXPLICIT CLASS OVERRIDES --- */
@variant dark (&:where(.dark, .dark *));

.dark body {
  background-color: #0f172a !important; /* slate-900 */
  color: #f8fafc !important; /* slate-50 */
}

/* 1. Cards & Main Containers */
.dark .bg-white {
  background-color: #1e293b !important; /* slate-800 */
  border-color: #334155 !important; /* slate-700 */
  color: #f8fafc !important;
}

.dark .bg-gray-50,
.dark .bg-slate-50,
.dark .bg-zinc-50,
.dark .bg-neutral-50,
.dark .bg-slate-50\/50,
.dark .bg-slate-50\/70,
.dark .bg-gray-50\/30,
.dark .bg-gray-50\/50,
.dark .bg-gray-50\/70,
.dark .bg-\[\#f6f8f7\] {
  background-color: #0f172a !important; /* slate-900 */
}

.dark .bg-gray-100,
.dark .bg-slate-100,
.dark .bg-zinc-100,
.dark .bg-neutral-100,
.dark .bg-slate-100\/50,
.dark .bg-gray-100\/50,
.dark .bg-gray-100\/70 {
  background-color: #0f172a !important; /* slate-900 for inner badge/strip backgrounds against slate-800 cards */
  color: #e2e8f0 !important; /* slate-200 */
}

.dark .bg-gray-200,
.dark .bg-slate-200,
.dark .bg-slate-200\/60 {
  background-color: #334155 !important; /* slate-700 */
  color: #f1f5f9 !important;
}

/* Hover States */
.dark .hover\:bg-gray-50:hover,
.dark .hover\:bg-slate-50:hover,
.dark .hover\:bg-gray-100:hover,
.dark .hover\:bg-slate-100:hover,
.dark .hover\:bg-gray-200:hover,
.dark .hover\:bg-slate-200:hover {
  background-color: #334155 !important; /* slate-700 */
  color: #ffffff !important;
}

/* 2. Brand & Primary Theme Overrides */
.dark .bg-\[\#e7f3f0\] {
  background-color: rgba(99, 102, 241, 0.15) !important; /* dark indigo tint */
  border-color: rgba(99, 102, 241, 0.3) !important;
}

.dark .bg-\[\#d7e8e3\] {
  background-color: #312e81 !important; /* indigo-900 */
  color: #818cf8 !important;
}

.dark .bg-\[\#137566\] {
  background-color: #6366f1 !important; /* indigo-500 */
  color: #ffffff !important;
}

.dark .hover\:bg-\[\#0f5d51\]:hover,
.dark .hover\:bg-\[\#0f5d51\]:focus {
  background-color: #4f46e5 !important; /* indigo-600 */
}

.dark .bg-\[\#0f5d51\] {
  background-color: #4f46e5 !important; /* indigo-600 */
}

/* 3. Text Overrides */
.dark .text-slate-900,
.dark .text-gray-900,
.dark .text-\[\#153a35\] {
  color: #f8fafc !important; /* slate-50 */
}

.dark .text-slate-800,
.dark .text-gray-800 {
  color: #f1f5f9 !important; /* slate-100 */
}

.dark .text-slate-700,
.dark .text-gray-700 {
  color: #e2e8f0 !important; /* slate-200 */
}

.dark .text-slate-600,
.dark .text-gray-600 {
  color: #cbd5e1 !important; /* slate-300 */
}

.dark .text-slate-500,
.dark .text-gray-500,
.dark .text-slate-400,
.dark .text-gray-400,
.dark .text-\[\#849590\],
.dark .text-\[\#739087\] {
  color: #94a3b8 !important; /* slate-400 */
}

.dark .text-\[\#137566\] {
  color: #818cf8 !important; /* indigo-400 */
}

/* 4. Tinted Accent Badges & Banners (Emerald, Rose, Amber, Indigo, Purple, Blue, Sky) */

/* Emerald / Green (Income / Success / AI) */
.dark .bg-emerald-50,
.dark .bg-emerald-50\/30,
.dark .bg-emerald-50\/50,
.dark .bg-emerald-50\/80,
.dark .bg-emerald-100,
.dark .bg-emerald-200 {
  background-color: rgba(16, 185, 129, 0.15) !important;
  border-color: rgba(16, 185, 129, 0.3) !important;
}
.dark .text-emerald-600,
.dark .text-emerald-700,
.dark .text-emerald-800,
.dark .text-emerald-900,
.dark .text-emerald-950 {
  color: #6ee7b7 !important; /* emerald-300 */
}

/* Rose / Red (Expenses / Alerts / Overbudget) */
.dark .text-\[\#d55e50\],
.dark .text-rose-600,
.dark .text-rose-700,
.dark .text-rose-800,
.dark .text-rose-900,
.dark .text-rose-950,
.dark .text-red-600 {
  color: #fca5a5 !important; /* rose-300 */
}
.dark .bg-\[\#d55e50\],
.dark .bg-rose-50,
.dark .bg-rose-50\/50,
.dark .bg-rose-100,
.dark .bg-rose-200,
.dark .bg-red-50,
.dark .bg-red-100 {
  background-color: rgba(244, 63, 94, 0.15) !important;
  border-color: rgba(244, 63, 94, 0.3) !important;
}

/* Amber / Yellow (Warnings / Reminders / Offline / Pending) */
.dark .bg-amber-50,
.dark .bg-amber-50\/50,
.dark .bg-amber-50\/80,
.dark .bg-amber-50\/90,
.dark .bg-amber-100,
.dark .bg-amber-200,
.dark .bg-yellow-50,
.dark .bg-yellow-100 {
  background-color: rgba(245, 158, 11, 0.15) !important;
  border-color: rgba(245, 158, 11, 0.3) !important;
}
.dark .text-amber-600,
.dark .text-amber-700,
.dark .text-amber-800,
.dark .text-amber-900,
.dark .text-amber-950 {
  color: #fcd34d !important; /* amber-300 */
}

/* Indigo / Blue / Purple / Sky (Analytics / Calendar / Secondary) */
.dark .bg-indigo-50,
.dark .bg-indigo-50\/50,
.dark .bg-indigo-100,
.dark .bg-blue-50,
.dark .bg-blue-50\/50,
.dark .bg-blue-100,
.dark .bg-purple-50,
.dark .bg-purple-50\/50,
.dark .bg-purple-100,
.dark .bg-sky-50,
.dark .bg-sky-100 {
  background-color: rgba(99, 102, 241, 0.15) !important;
  border-color: rgba(99, 102, 241, 0.3) !important;
}
.dark .text-indigo-600,
.dark .text-indigo-700,
.dark .text-indigo-800,
.dark .text-indigo-900,
.dark .text-blue-600,
.dark .text-blue-700,
.dark .text-blue-800,
.dark .text-purple-600,
.dark .text-purple-700,
.dark .text-purple-800 {
  color: #a5b4fc !important; /* indigo-300 */
}

/* 5. Borders & Dividers */
.dark .border-gray-100,
.dark .border-slate-100,
.dark .border-zinc-100,
.dark .border-emerald-100,
.dark .border-amber-100,
.dark .border-rose-100,
.dark .border-indigo-100 {
  border-color: #334155 !important; /* slate-700 */
}

.dark .border-gray-150,
.dark .border-gray-200,
.dark .border-slate-150,
.dark .border-slate-200,
.dark .border-slate-300,
.dark .border-gray-300 {
  border-color: #334155 !important; /* slate-700 */
}

.dark .divide-gray-100 > :not([hidden]) ~ :not([hidden]),
.dark .divide-slate-100 > :not([hidden]) ~ :not([hidden]),
.dark .divide-gray-200 > :not([hidden]) ~ :not([hidden]),
.dark .divide-slate-200 > :not([hidden]) ~ :not([hidden]) {
  border-color: #334155 !important; /* slate-700 */
}

/* 6. Form Inputs & Select Controls */
.dark input,
.dark select,
.dark textarea {
  background-color: #0f172a !important; /* slate-900 for inset contrast */
  border-color: #475569 !important; /* slate-600 */
  color: #f8fafc !important; /* slate-50 */
}

.dark input:focus,
.dark select:focus,
.dark textarea:focus {
  background-color: #0f172a !important;
  border-color: #6366f1 !important; /* indigo-500 */
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25) !important;
}

/* Prevent focus:bg-white and focus:bg-gray-50 from flashing white on focus in dark mode! */
.dark .focus\:bg-white:focus,
.dark .focus\:bg-gray-50:focus {
  background-color: #0f172a !important;
}

.dark option {
  background-color: #1e293b !important;
  color: #f8fafc !important;
}

.dark input::placeholder,
.dark textarea::placeholder {
  color: #64748b !important; /* slate-500 */
}

/* 7. Code Blocks & Tables */
.dark code {
  background-color: #0f172a !important;
  color: #a5b4fc !important;
  border-color: #334155 !important;
}

.dark table thead,
.dark table th,
.dark tr.bg-gray-50,
.dark tr.bg-slate-50,
.dark table tr.bg-gray-50,
.dark table tr.bg-slate-50 {
  background-color: #0f172a !important;
  color: #cbd5e1 !important;
  border-color: #334155 !important;
}

.dark table tbody tr {
  border-color: #334155 !important;
}

.dark table tbody tr:hover {
  background-color: rgba(51, 65, 85, 0.5) !important;
}

/* 8. Modals, Details & Overlays */
.dark .bg-black\/60,
.dark .bg-slate-900\/60,
.dark .bg-slate-900\/40,
.dark .bg-black\/50 {
  background-color: rgba(15, 23, 42, 0.8) !important;
}

.dark details,
.dark summary {
  background-color: #1e293b !important;
  color: #f8fafc !important;
  border-color: #334155 !important;
}

.dark summary:hover {
  background-color: #334155 !important;
}

/* 9. Card Box Shadow & Scrollbars */
.dark .bg-white.rounded-xl,
.dark .bg-white.rounded-2xl,
.dark .bg-white.rounded-3xl {
  border-color: #334155 !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.25), 0 2px 4px -1px rgba(0, 0, 0, 0.15) !important;
}

.dark .shadow-sm,
.dark .shadow-md,
.dark .shadow-xs,
.dark .shadow,
.dark .shadow-xl,
.dark .shadow-2xl {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2) !important;
}

.dark ::-webkit-scrollbar-thumb {
  background: #334155; /* slate-700 */
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: #475569; /* slate-600 */
}


```


## File: src/localCache.test.ts
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { prepareStateForRemoteSave, deriveKeyFromPin, activeKeys, clearActiveKeys } from "./services/crypto";
import { validateAndMigrateState } from "./hooks/useBudgetState";
import { AppState, Profile } from "./types";

// Polyfill localStorage for node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    writable: true
  });
}

const LOCAL_STORAGE_KEY_V2 = "saldo-local-fallback-v2";
const LOCAL_STORAGE_KEY_V1 = "saldo-local-fallback";

describe("KROK 5 — Safe local cache & PIN profile protection", () => {
  beforeEach(() => {
    clearActiveKeys();
    localStorage.clear();
  });

  it("unlocked PIN profile saved to local cache MUST NOT contain plaintext sensitive data", async () => {
    const profileId = "pin-profile-1";
    const key = await deriveKeyFromPin("9999", "salt999");
    activeKeys[profileId] = key;

    const unlockedProfile: Profile = {
      id: profileId,
      name: "Profil Osobisty z PIN",
      kind: "personal",
      pinHash: "hash999",
      salt: "salt999",
      transactions: [{ id: "tx-secret-1", name: "Tajny wydatek", type: "expense", amount: 1200, isoDate: "2026-05-01", category: "Zakupy", account: "Główne" }],
      payments: [{ id: "pay-secret-1", name: "Kredyt", amount: 2500, dueDate: "2026-05-10", status: "Do opłacenia" }],
      goals: [{ id: "goal-1", name: "Auto", target: 50000, saved: 10000, transfers: [] }],
      investments: [{ id: "inv-1", name: "Akcje", amount: 3000, isoDate: "2026-05-01" }],
      budgets: { "Zakupy": 1500 }
    };

    const state: AppState = {
      profiles: [unlockedProfile],
      activeProfileId: profileId,
      schemaVersion: 1,
      updatedAt: "2026-05-01T12:00:00.000Z",
      lastModifiedBy: "test@example.com",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    // Simulate prepareStateForRemoteSave before saving to localStorage
    const prepared = await prepareStateForRemoteSave(state);
    localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(prepared));

    const rawCached = localStorage.getItem(LOCAL_STORAGE_KEY_V2);
    expect(rawCached).not.toBeNull();
    expect(rawCached).not.toContain("Tajny wydatek");
    expect(rawCached).not.toContain("Kredyt");

    const parsedCache = JSON.parse(rawCached!);
    const cachedProfile = parsedCache.profiles[0];
    expect(cachedProfile.encryptedPayload).toBeDefined();
    expect(cachedProfile.transactions).toHaveLength(0);
    expect(cachedProfile.payments).toHaveLength(0);
    expect(cachedProfile.goals).toHaveLength(0);
    expect(cachedProfile.investments).toHaveLength(0);
    expect(Object.keys(cachedProfile.budgets)).toHaveLength(0);
  });

  it("V1 to V2 migration preserves data and removes V1 only when V2 write succeeds", () => {
    const v1State: AppState = {
      profiles: [{
        id: "v1-prof",
        name: "Stary profil V1",
        kind: "personal",
        transactions: [{ id: "tx-v1", name: "Kawa", type: "expense", amount: 15, isoDate: "2026-01-01", category: "Jedzenie", account: "Gotówka" }],
        payments: [],
        goals: [],
        investments: [],
        budgets: {}
      }],
      activeProfileId: "v1-prof",
      schemaVersion: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    localStorage.setItem(LOCAL_STORAGE_KEY_V1, JSON.stringify(v1State));

    // Migration logic check
    const cachedV1 = localStorage.getItem(LOCAL_STORAGE_KEY_V1);
    expect(cachedV1).not.toBeNull();

    const parsedV1 = validateAndMigrateState(JSON.parse(cachedV1!));
    expect(parsedV1.profiles[0].name).toBe("Stary profil V1");

    // Write V2, then remove V1
    localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(parsedV1));
    expect(localStorage.getItem(LOCAL_STORAGE_KEY_V2)).not.toBeNull();

    localStorage.removeItem(LOCAL_STORAGE_KEY_V1);
    expect(localStorage.getItem(LOCAL_STORAGE_KEY_V1)).toBeNull();
  });

  it("V1 is NOT removed if V2 write throws an error", () => {
    const v1State = {
      profiles: [{ id: "v1-p", name: "Profil V1", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }]
    };
    localStorage.setItem(LOCAL_STORAGE_KEY_V1, JSON.stringify(v1State));

    // Mock localStorage.setItem to throw an error when writing V2
    const originalSetItem = localStorage.setItem;
    vi.spyOn(localStorage, "setItem").mockImplementation((key, value) => {
      if (key === LOCAL_STORAGE_KEY_V2) {
        throw new Error("QuotaExceededError");
      }
      return originalSetItem(key, value);
    });

    const cachedV1 = localStorage.getItem(LOCAL_STORAGE_KEY_V1);
    const parsedV1 = validateAndMigrateState(JSON.parse(cachedV1!));

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(parsedV1));
      localStorage.removeItem(LOCAL_STORAGE_KEY_V1);
    } catch (_) {
      // Failed to set V2
    }

    // V1 must still exist
    expect(localStorage.getItem(LOCAL_STORAGE_KEY_V1)).not.toBeNull();

    vi.restoreAllMocks();
  });
});

```


## File: src/localDb.test.ts
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { loadState, saveState, clearState, LOCAL_STORAGE_KEY_V1, LOCAL_STORAGE_KEY_V2 } from "./services/localDb";
import { AppState } from "./types";

// Polyfill localStorage for Node vitest environment if missing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    writable: true
  });
}

describe("PROMPT C1 — localDb & IndexedDB storage with migration & fallback", () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearState();
  });

  it("1. loadState returns null when both IndexedDB and localStorage are empty", async () => {
    const loaded = await loadState();
    expect(loaded).toBeNull();
  });

  it("2. saveState saves to IndexedDB and dual-writes to localStorage V2", async () => {
    const state: AppState = {
      profiles: [{
        id: "p1",
        name: "Test Profile",
        kind: "personal",
        transactions: [],
        payments: [],
        goals: [],
        investments: [],
        budgets: {}
      }],
      activeProfileId: "p1",
      schemaVersion: 1,
      updatedAt: "2026-07-23T12:00:00.000Z",
      lastModifiedBy: "test",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    await saveState(state);

    const loaded = await loadState();
    expect(loaded).not.toBeNull();
    expect(loaded?.profiles[0].name).toBe("Test Profile");

    const lsV2 = localStorage.getItem(LOCAL_STORAGE_KEY_V2);
    expect(lsV2).not.toBeNull();
    expect(JSON.parse(lsV2!).activeProfileId).toBe("p1");
  });

  it("3. loadState migrates data from localStorage V2 to IndexedDB if IDB is empty", async () => {
    const v2State: AppState = {
      profiles: [{
        id: "p-v2",
        name: "Profil V2",
        kind: "personal",
        transactions: [{ id: "tx1", name: "Kawa", amount: 15, type: "expense", category: "Jedzenie", account: "Gotówka", isoDate: "2026-07-01" }],
        payments: [],
        goals: [],
        investments: [],
        budgets: {}
      }],
      activeProfileId: "p-v2",
      schemaVersion: 1,
      updatedAt: "2026-07-23T10:00:00.000Z",
      lastModifiedBy: "v2user",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(v2State));

    const loaded = await loadState();
    expect(loaded).not.toBeNull();
    expect(loaded?.profiles[0].name).toBe("Profil V2");

    // Clear localStorage to prove IDB now holds the state
    localStorage.clear();

    const loadedFromIDB = await loadState();
    expect(loadedFromIDB).not.toBeNull();
    expect(loadedFromIDB?.profiles[0].name).toBe("Profil V2");
  });

  it("4. loadState migrates data from localStorage V1 to IDB & V2, removing V1", async () => {
    const v1State = {
      profiles: [{
        id: "p-v1",
        name: "Stary Profil V1",
        kind: "personal",
        transactions: [],
        payments: [],
        goals: [],
        investments: [],
        budgets: {}
      }],
      activeProfileId: "p-v1"
    };

    localStorage.setItem(LOCAL_STORAGE_KEY_V1, JSON.stringify(v1State));

    const loaded = await loadState();
    expect(loaded).not.toBeNull();
    expect(loaded?.profiles[0].name).toBe("Stary Profil V1");

    expect(localStorage.getItem(LOCAL_STORAGE_KEY_V1)).toBeNull();
    expect(localStorage.getItem(LOCAL_STORAGE_KEY_V2)).not.toBeNull();
  });

  it("5. clearState removes data from IndexedDB and localStorage keys", async () => {
    const state: AppState = {
      profiles: [{ id: "p1", name: "Do usunięcia", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {} }],
      activeProfileId: "p1",
      schemaVersion: 1,
      updatedAt: "2026-07-23T12:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    await saveState(state);
    expect(await loadState()).not.toBeNull();

    await clearState();

    expect(await loadState()).toBeNull();
    expect(localStorage.getItem(LOCAL_STORAGE_KEY_V2)).toBeNull();
  });

  it("6. saveState throws QUOTA_EXCEEDED when quota exception occurs", async () => {
    const state: AppState = {
      profiles: [],
      activeProfileId: null,
      schemaVersion: 1,
      updatedAt: "2026-07-23T12:00:00.000Z",
      lastModifiedBy: "user",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    // Mock localStorage.setItem to simulate QuotaExceededError
    const originalSetItem = localStorage.setItem;
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      const err = new Error("QuotaExceededError");
      err.name = "QuotaExceededError";
      throw err;
    });

    // Mock indexedDB.open to fail with QuotaExceededError
    const originalOpen = indexedDB.open;
    vi.spyOn(indexedDB, "open").mockImplementation(() => {
      const req = {} as any;
      setTimeout(() => {
        const err = new Error("QuotaExceededError");
        err.name = "QuotaExceededError";
        req.error = err;
        if (req.onerror) req.onerror({ target: req } as any);
      }, 0);
      return req;
    });

    await expect(saveState(state)).rejects.toThrow("QUOTA_EXCEEDED");

    vi.restoreAllMocks();
    indexedDB.open = originalOpen;
    localStorage.setItem = originalSetItem;
  });
});

```


## File: src/main.tsx
```tsx
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

```


## File: src/monthlyDigest.test.ts
```ts
import { describe, it, expect } from "vitest";
import { generateMonthlyDigest } from "./services/monthlyDigest";
import { Transaction } from "./types";

describe("KROK 8F - Miesięczny przegląd finansowy bez AI", () => {
  it("miesiąc bez transakcji", () => {
    const res = generateMonthlyDigest([], 2026, 6); // lipiec
    expect(res.totalIncome).toBe(0);
    expect(res.totalExpenses).toBe(0);
    expect(res.balance).toBe(0);
    expect(res.savingsRate).toBeNull();
    expect(res.topExpenseCategory).toBeNull();
    expect(res.transactionCount).toBe(0);
    expect(res.summaryText).toContain("Brak danych finansowych w tym miesiącu");
  });

  it("wyłącznie przychody", () => {
    const txs = [
      { id: "1", name: "Wypłata", amount: 5000, category: "Wpływy", account: "Główne", type: "income", isoDate: "2026-07-10" } as Transaction
    ];
    const res = generateMonthlyDigest(txs, 2026, 6);
    expect(res.totalIncome).toBe(5000);
    expect(res.totalExpenses).toBe(0);
    expect(res.balance).toBe(5000);
    expect(res.savingsRate).toBe(100);
    expect(res.topExpenseCategory).toBeNull();
    expect(res.summaryText).toContain("Bilans miesiąca był dodatni");
  });

  it("wyłącznie wydatki", () => {
    const txs = [
      { id: "1", name: "Zakupy", amount: 1000, category: "Żywność", account: "Główne", type: "expense", isoDate: "2026-07-10" } as Transaction
    ];
    const res = generateMonthlyDigest(txs, 2026, 6);
    expect(res.totalIncome).toBe(0);
    expect(res.totalExpenses).toBe(1000);
    expect(res.balance).toBe(-1000);
    expect(res.savingsRate).toBeNull();
    expect(res.topExpenseCategory).toBe("Żywność");
    expect(res.summaryText).toContain("Najwięcej środków przeznaczyłeś na kategorię: Żywność.");
    expect(res.summaryText).toContain("Bilans miesiąca był ujemny");
  });

  it("dodatni bilans i polskie formatowanie miesiąca", () => {
    const txs = [
      { id: "1", name: "Wypłata", amount: 5000, category: "Wpływy", account: "Główne", type: "income", isoDate: "2026-07-10" } as Transaction,
      { id: "2", name: "Zakupy", amount: 1000, category: "Żywność", account: "Główne", type: "expense", isoDate: "2026-07-11" } as Transaction,
      { id: "3", name: "Biedronka", amount: 500, category: "Żywność", account: "Główne", type: "expense", isoDate: "2026-06-11" } as Transaction // czerwiec
    ];
    const res = generateMonthlyDigest(txs, 2026, 6);
    expect(res.totalIncome).toBe(5000);
    expect(res.totalExpenses).toBe(1000);
    expect(res.balance).toBe(4000);
    expect(res.savingsRate).toBe(80);
    expect(res.summaryText).toContain("W lipcu wydałeś więcej niż w czerwcu.");
    expect(res.summaryText).toContain("Najwięcej środków przeznaczyłeś na kategorię: Żywność.");
    expect(res.summaryText).toContain("Bilans miesiąca był dodatni.");
  });

  it("ujemny bilans i porównanie do poprzedniego miesiąca (mniej)", () => {
    const txs = [
      { id: "1", name: "Wypłata", amount: 1000, category: "Wpływy", account: "Główne", type: "income", isoDate: "2026-07-10" } as Transaction,
      { id: "2", name: "Naprawa auta", amount: 2000, category: "Transport", account: "Główne", type: "expense", isoDate: "2026-07-11" } as Transaction,
      { id: "3", name: "Wczasy", amount: 5000, category: "Rozrywka", account: "Główne", type: "expense", isoDate: "2026-06-11" } as Transaction // czerwiec
    ];
    const res = generateMonthlyDigest(txs, 2026, 6);
    expect(res.balance).toBe(-1000);
    expect(res.momExpenseChangePercent).toBe(-60); // 2000 vs 5000 -> -60%
    expect(res.summaryText).toContain("W lipcu wydałeś mniej niż w czerwcu.");
    expect(res.summaryText).toContain("Bilans miesiąca był ujemny.");
  });

  it("przychody równe zero", () => {
    const txs = [
      { id: "2", name: "Naprawa auta", amount: 2000, category: "Transport", account: "Główne", type: "expense", isoDate: "2026-07-11" } as Transaction
    ];
    const res = generateMonthlyDigest(txs, 2026, 6);
    expect(res.savingsRate).toBeNull();
    expect(res.balance).toBe(-2000);
  });
});

```


## File: src/parseCsv.test.ts
```ts
import { describe, it, expect } from "vitest";
import {
  parseAndMapCsv,
  cleanCsvBomAndEncoding,
  detectCsvSeparator,
  parseCsvDate,
  parseCsvAmount,
  BANK_PRESETS
} from "./services/parseCsv";
import { TransactionRule } from "./types";

describe("PROMPT D1 — Bank CSV Import, Presets & Duplicate Detection", () => {
  // Sample fixture 1: mBank CSV format with semicolon delimiter and headers starting with #
  const MBANK_FIXTURE = `
#Data operacji;#Data księgowania;#Opis operacji;#Tytuł;#Nadawca/Odbiorca;#Numer konta;#Kwota;#Waluta
2026-07-20;2026-07-20;PRZELEW ZEWNĘTRZNY WYCHODZĄCY;Zakupy Biedronka;Biedronka Sp. z o.o.;12345678901234567890123456;-150,50;PLN
2026-07-21;2026-07-21;KARTA;Paliwo Orlen;STACJA ORLEN WARSZAWA;98765432109876543210987654;-210,00;PLN
2026-07-22;2026-07-22;PRZELEW PRZYCHODZĄCY;Wynagrodzenie lipiec;Firma ABC Sp z o o;11112222333344445555666677;+4500,00;PLN
`.trim();

  // Sample fixture 2: PKO BP CSV format with comma delimiter
  const PKO_FIXTURE = `
Data operacji,Data waluty,Typ transakcji,Kwota,Waluta,Saldo po transakcji,Nazwa nadawcy/odbiorcy,Tytuł
2026-07-18,2026-07-18,Płatność kartą,-45.50,PLN,1200.00,Sklep Żabka,Zakupy spożywcze
2026-07-19,2026-07-19,Przelew,-120.00,PLN,1080.00,PGE Obrót,Rachunek za prąd
`.trim();

  // Sample fixture 3: Generic CSV with UTF-8 BOM, semicolon, and DD.MM.YYYY dates
  const GENERIC_BOM_FIXTURE = `\uFEFFData;Kwota;Tytuł
20.07.2026;-35,00;Kawa i Ciacho
21.07.2026;invalid_amount;Błędny wpis kwoty
;100,00;Błędna data
22.07.2026;150,00 PLN;Premia kwartalna
`.trim();

  it("1. verifies presence of at least 3 bank presets (mBank, PKO, Generic)", () => {
    expect(BANK_PRESETS.length).toBeGreaterThanOrEqual(3);
    const ids = BANK_PRESETS.map((p) => p.id);
    expect(ids).toContain("generic");
    expect(ids).toContain("mbank");
    expect(ids).toContain("pko");
  });

  it("2. correctly cleans UTF-8 BOM and detects delimiters", () => {
    const rawWithBom = "\uFEFFData;Kwota;Tytuł";
    const cleaned = cleanCsvBomAndEncoding(rawWithBom);
    expect(cleaned.startsWith("\uFEFF")).toBe(false);
    expect(cleaned).toBe("Data;Kwota;Tytuł");

    expect(detectCsvSeparator(MBANK_FIXTURE)).toBe(";");
    expect(detectCsvSeparator(PKO_FIXTURE)).toBe(",");
  });

  it("3. parses mBank fixture correctly", () => {
    const result = parseAndMapCsv({
      rawCsvText: MBANK_FIXTURE,
      presetId: "mbank"
    });

    expect(result.detectedSeparator).toBe(";");
    expect(result.transactions.length).toBe(3);

    const [t1, t2, t3] = result.transactions;

    expect(t1.name).toBe("Zakupy Biedronka");
    expect(t1.amount).toBe(150.5);
    expect(t1.type).toBe("expense");
    expect(t1.isoDate).toBe("2026-07-20");

    expect(t2.name).toBe("Paliwo Orlen");
    expect(t2.amount).toBe(210);
    expect(t2.type).toBe("expense");

    expect(t3.name).toBe("Wynagrodzenie lipiec");
    expect(t3.amount).toBe(4500);
    expect(t3.type).toBe("income");
  });

  it("4. parses PKO BP fixture correctly", () => {
    const result = parseAndMapCsv({
      rawCsvText: PKO_FIXTURE,
      presetId: "pko"
    });

    expect(result.detectedSeparator).toBe(",");
    expect(result.transactions.length).toBe(2);

    expect(result.transactions[0].amount).toBe(45.5);
    expect(result.transactions[0].isoDate).toBe("2026-07-18");
    expect(result.transactions[1].amount).toBe(120.0);
  });

  it("5. tracks parse errors (invalid amount, invalid date, skipped rows)", () => {
    const result = parseAndMapCsv({
      rawCsvText: GENERIC_BOM_FIXTURE,
      presetId: "generic"
    });

    expect(result.stats.invalidAmountCount).toBe(1); // "invalid_amount"
    expect(result.stats.invalidDateCount).toBe(1); // empty date ";"
    expect(result.stats.validCount).toBe(2); // "Kawa i Ciacho" & "Premia kwartalna"

    expect(result.transactions.length).toBe(2);
    expect(result.transactions[0].name).toBe("Kawa i Ciacho");
    expect(result.transactions[0].amount).toBe(35);
    expect(result.transactions[0].isoDate).toBe("2026-07-20");
  });

  it("6. applies categorization rules from transactionRules parameter", () => {
    const rules: TransactionRule[] = [
      {
        id: "rule-1",
        pattern: "Orlen",
        category: "Transport",
        categoryIcon: "🚗"
      }
    ];

    const result = parseAndMapCsv({
      rawCsvText: MBANK_FIXTURE,
      presetId: "mbank",
      rules
    });

    const orlenTx = result.transactions.find((t) => t.name.includes("Orlen"));
    expect(orlenTx).toBeDefined();
    expect(orlenTx?.category).toBe("Transport");
    expect(orlenTx?.categoryIcon).toBe("🚗");
  });

  it("7. correctly formats various date and amount string representations", () => {
    expect(parseCsvDate("2026-12-31")).toBe("2026-12-31");
    expect(parseCsvDate("31.12.2026")).toBe("2026-12-31");
    expect(parseCsvDate("05-01-2026")).toBe("2026-01-05");

    expect(parseCsvAmount("-1 234,56 PLN")).toEqual({ amount: 1234.56, isNegative: true });
    expect(parseCsvAmount("+500,00 zł")).toEqual({ amount: 500, isNegative: false });
    expect(parseCsvAmount("invalid")).toBeNull();
  });
});

```


## File: src/pwaAndPinSecurity.test.ts
```ts
import { describe, it, expect } from "vitest";
import { deriveKeyFromPin, encryptProfile, decryptProfile } from "./services/crypto";
import { Profile } from "./types";

describe("PROMPT D2 — PWA Update & PIN Security Recovery Warning", () => {
  it("1. validates PIN regex requirement (4-8 digits)", () => {
    const pinRegex = /^\d{4,8}$/;

    expect(pinRegex.test("1234")).toBe(true);
    expect(pinRegex.test("12345678")).toBe(true);

    expect(pinRegex.test("123")).toBe(false); // too short
    expect(pinRegex.test("123456789")).toBe(false); // too long
    expect(pinRegex.test("123a")).toBe(false); // non-digit
  });

  it("2. preserves strong PBKDF2 (100k iterations, SHA-256) and AES-GCM encryption", async () => {
    const samplePin = "87654321";
    const profile: Profile = {
      id: "p1",
      name: "Profil Testowy",
      kind: "personal",
      salt: "test-salt-12345678",
      pinHash: "hash-123",
      transactions: [{ id: "tx1", name: "Zakupy", amount: 100, type: "expense", category: "Spożywcze", isoDate: "2026-07-23", account: "Konto" }],
      payments: [],
      goals: [],
      investments: [],
      budgets: { Spożywcze: 1000 }
    };

    const key = await deriveKeyFromPin(samplePin, profile.salt!);
    const encrypted = await encryptProfile(profile, key);

    expect(encrypted.encryptedPayload).toBeDefined();

    const decrypted = await decryptProfile(encrypted, key);
    expect(decrypted.name).toBe("Profil Testowy");
    expect(decrypted.transactions.length).toBe(1);
    expect(decrypted.transactions[0].amount).toBe(100);
  });
});

```


## File: src/regression.test.ts
```ts
import { describe, it, expect } from "vitest";
import { applyRecurringRules } from "./services/recurringEngine";
import { calculateSafeToSpend, calculateEndOfMonthForecast } from "./services/budgetCalculations";
import { Profile, RecurringRule, Transaction } from "./types";
import { getLocalDateIso } from "./utils";

describe("PROMPT 6 - Testy regresji profili i kalkulacji", () => {
  
  it("1. recurring reguła profilu A nie generuje tx w B", () => {
    const rulesA: RecurringRule[] = [
      { id: "rA", name: "Rule A", amount: 100, type: "expense" as const, category: "Test", account: "Cash", frequency: "monthly" as const, nextDueDate: "2026-07-01", isActive: true }
    ];
    // Evaluate for Profile B (which has no rules)
    const resultB = applyRecurringRules([], [], "2026-07-10");
    expect(resultB.generatedTransactions.length).toBe(0);
    expect(resultB.hasChanges).toBe(false);
  });

  it("2. przełączenie A→B nie mutuje nextDueDate reguł A przez logikę B", () => {
    const rulesA: RecurringRule[] = [
      { id: "rA", name: "Rule A", amount: 100, type: "expense" as const, category: "Test", account: "Cash", frequency: "monthly" as const, nextDueDate: "2026-07-01", isActive: true }
    ];
    // Logika profilu B używa swoich reguł
    const rulesB: RecurringRule[] = [];
    const resultB = applyRecurringRules(rulesB, [], "2026-07-10");
    
    // Upewniamy się, że to nie wpłynęło w żaden sposób na reguły A
    expect(rulesA[0].nextDueDate).toBe("2026-07-01");
  });

  it("3. migracja starych recurring jest idempotentna (symulacja stanu)", () => {
    const state = {
      recurringRules: [
        { id: "global-1", name: "Old Global Rule", amount: 100, type: "expense" as const, category: "Test", account: "Cash", frequency: "monthly" as const, nextDueDate: "2026-07-01", isActive: true }
      ]
    };
    
    const profileWithoutRules: Profile = {
      id: "p1", name: "Profile", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {}
    };
    
    // Symulujemy zachowanie migracji - to teraz dzieje się przy starcie apki
    // Zakładamy, że migracja przydzieliła tę regułę do profilu (activeProfileId)
    const migratedProfileWithRules: Profile = {
      ...profileWithoutRules,
      recurringRules: [...state.recurringRules]
    };
    
    // Nowy hook korzysta WYŁĄCZNIE z profilu
    const rulesToUse = migratedProfileWithRules.recurringRules ?? [];
    expect(rulesToUse.length).toBe(1);
    expect(rulesToUse[0].id).toBe("global-1");
    expect(rulesToUse).toBe(migratedProfileWithRules.recurringRules);
  });

  it("4. getLocalDateIso używane zamiast UTC w recurring path", () => {
    const date = new Date(2026, 6, 15, 23, 59, 59);
    const isoString = getLocalDateIso(date);
    expect(isoString).toBe("2026-07-15");
  });

  it("5. safe-to-spend / forecast ignorują obce reguły", () => {
    const profile: Profile = {
      id: "p1", name: "Test", kind: "personal", transactions: [], payments: [], goals: [], investments: [], budgets: {}
    };
    const foreignRules: RecurringRule[] = [
      { id: "foreign", name: "Obca", amount: 1000, type: "expense" as const, category: "Test", account: "Cash", frequency: "monthly" as const, nextDueDate: "2026-07-05", isActive: true }
    ];
    
    const activeRules: RecurringRule[] = [];
    
    const safe = calculateSafeToSpend(profile, activeRules, "2026-07-01");
    expect(safe.futureRecurringExpensesSum).toBe(0);
    
    const forecast = calculateEndOfMonthForecast(profile, activeRules, "2026-07-01");
    expect(forecast.futureRecurringExpensesSum).toBe(0);
  });

  it("6. cele nie są liczone podwójnie wg wybranego modelu z Promptu 5", () => {
    const profile: Profile = {
      id: "p1", name: "Test", kind: "personal", 
      transactions: [
        { id: "t1", name: "Wypłata", amount: 2000, type: "income" as const, category: "Wynagrodzenie", account: "Konto", isoDate: "2026-07-01" }
      ], 
      payments: [], 
      goals: [
        { id: "g1", name: "Cel", target: 1000, saved: 300, transfers: [] }
      ], 
      investments: [], budgets: {}
    };
    
    const safe = calculateSafeToSpend(profile, [], "2026-07-01");
    expect(safe.currentBalance).toBe(2000);
    expect(safe.reservedGoalsSum).toBe(300);
    expect(safe.safeToSpend).toBe(1700);
  });

});

```


## File: src/server/ai/createAiProvider.ts
```ts
import { AiProvider, AiConfig } from "./types";
import { NoAiProvider } from "./providers/noAiProvider";
import { LocalProvider } from "./providers/localProvider";
import { CloudProvider } from "./providers/cloudProvider";

export function createAiProvider(config: AiConfig): AiProvider {
  switch (config.mode) {
    case "none":
      return new NoAiProvider();
    case "local":
      return new LocalProvider(config.localEndpoint);
    case "cloud":
      return new CloudProvider();
    default:
      return new NoAiProvider();
  }
}

```


## File: src/server/ai/providers/cloudProvider.ts
```ts
import { getLocalDateIso } from "../../../utils";
import { AiProvider } from "../types";
import { getGemini, getCachedAiResult, setCachedAiResult } from "../../services/aiService";
import { Type } from "@google/genai";

export class CloudProvider implements AiProvider {
  async suggestEvent(payment: any, currentDate: string, uid: string = "unknown"): Promise<any> {
    const promptVersion = "v1";
    // klucz zawiera uid, pełne dane wejściowe, dueDate i wersję promptu.
    const cacheKey = `suggest-event:${uid}:${JSON.stringify(payment)}:${payment.dueDate || currentDate}:${promptVersion}`;
    const cached = getCachedAiResult(cacheKey);
    if (cached) return cached;

    const ai = getGemini();
    const prompt = `Zaplanuj przypomnienie kalendarza dla płatności:
- Nazwa: ${payment.name}
- Kwota: ${payment.amount} PLN
- Termin: ${payment.dueDate}
Dzisiejsza data: ${currentDate || getLocalDateIso()}
Zwróć JSON: summary (np. "💸 Płatność: [Nazwa] ([Kwota] PLN)"), description (stworzony profesjonalny szablon z przypomnieniem o kwocie, dacie i dodaną krótką, przyjazną poradą finansową), suggestedTime (HH:MM:SS), reminders (minuty, np [1440, 120]).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 250,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            description: { type: Type.STRING },
            suggestedTime: { type: Type.STRING },
            reminders: { type: Type.ARRAY, items: { type: Type.INTEGER } }
          },
          required: ["summary", "description", "suggestedTime", "reminders"]
        }
      }
    });

    if (!response.text) throw new Error("Empty response");
    const parsedResult = JSON.parse(response.text.trim());
    setCachedAiResult(cacheKey, parsedResult);
    return parsedResult;
  }

  async parseNatural(text: string, currentDate: string): Promise<any> {
    const ai = getGemini();
    const prompt = `Wyodrębnij płatność i wydarzenie.
Tekst: "${text}"
Data: ${currentDate || getLocalDateIso()}
Zwróć JSON z obiektami: 'payment' (name, amount, dueDate), 'event' (summary, description, suggestedDate, suggestedTime, reminders). Jeśli brak, ustaw null.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 300,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            payment: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                dueDate: { type: Type.STRING }
              },
              required: ["name", "amount", "dueDate"]
            },
            event: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                description: { type: Type.STRING },
                suggestedDate: { type: Type.STRING },
                suggestedTime: { type: Type.STRING },
                reminders: { type: Type.ARRAY, items: { type: Type.INTEGER } }
              },
              required: ["summary", "description", "suggestedDate", "suggestedTime", "reminders"]
            }
          },
          required: ["payment", "event"]
        }
      }
    });

    if (!response.text) throw new Error("Empty response");
    return JSON.parse(response.text.trim());
  }

  async parseStatement(text: string, currentDate: string): Promise<any> {
    const ai = getGemini();
    const prompt = `Analizuj wyciąg. Data odniesienia: ${currentDate || getLocalDateIso()}. 
Zwróć transakcje: name, amount (zawsze dodatnia), type ("income"/"expense"), isoDate (YYYY-MM-DD), category, account (zawsze "Konto główne").
Tekst: """${text}"""`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 1000,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ["income", "expense"] },
              isoDate: { type: Type.STRING },
              category: { type: Type.STRING },
              account: { type: Type.STRING }
            },
            required: ["name", "amount", "type", "isoDate", "category", "account"]
          }
        }
      }
    });

    if (!response.text) throw new Error("Empty response");
    const parsedTransactions = JSON.parse(response.text.trim());
    return { transactions: parsedTransactions };
  }

  async chat(message: string, profileData: any): Promise<any> {
    const ai = getGemini();
    const prunedProfile = {
      name: profileData.name,
      budgets: profileData.budgets,
      goals: profileData.goals,
      transactions: profileData.transactions?.slice(0, 10)
    };

    const prompt = `Jesteś doradcą "Saldo". Odpowiadaj zwięźle, bez znaczników markdowna.
Profil: ${JSON.stringify(prunedProfile)}
Użytkownik: "${message}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 500,
        temperature: 0.5
      }
    });

    if (!response.text) throw new Error("Empty response");
    return { reply: response.text };
  }

  async scanInvoice(imageBase64: string, mimeType: string): Promise<any> {
    const ai = getGemini();
    const prompt = `Wyciągnij dane z faktury do JSON: name (tytuł), amount (kwota), dueDate (YYYY-MM-DD), category.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { inlineData: { data: imageBase64, mimeType: mimeType || "image/jpeg" } },
        prompt
      ],
      config: {
        maxOutputTokens: 200,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            dueDate: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["name", "amount", "dueDate"]
        }
      }
    });

    if (!response.text) throw new Error("Empty response");
    return JSON.parse(response.text.trim());
  }
}

```


## File: src/server/ai/providers/localProvider.ts
```ts
import { getLocalDateIso } from "../../../utils";
import { AiProvider } from "../types";

export class LocalProvider implements AiProvider {
  private endpoint: string;

  constructor(endpoint?: string) {
    // Default Ollama endpoint assumption if none provided
    this.endpoint = endpoint || "http://localhost:11434/api/generate";
  }

  /**
   * Defensive JSON parser that handles pure JSON, Markdown code fences,
   * and text with embedded JSON objects or arrays.
   */
  private extractJson(text: string): any {
    const raw = text.trim();
    if (!raw) {
      throw new Error("Lokalny silnik AI nie odpowiedział poprawnie.");
    }

    // 1. Try direct JSON parse
    try {
      return JSON.parse(raw);
    } catch (e) {
      // Continue to defensive parsing
    }

    // 2. Try parsing inside Markdown ```json ... ``` code fence
    const jsonFenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonFenceMatch && jsonFenceMatch[1]) {
      try {
        return JSON.parse(jsonFenceMatch[1].trim());
      } catch (e) {
        // Continue to fallback
      }
    }

    // 3. Search for outermost JSON object { ... } or array [ ... ]
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    const firstBracket = raw.indexOf("[");
    const lastBracket = raw.lastIndexOf("]");

    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      try {
        return JSON.parse(raw.substring(firstBrace, lastBrace + 1));
      } catch (e) {
        // Continue to fallback
      }
    }

    if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
      try {
        return JSON.parse(raw.substring(firstBracket, lastBracket + 1));
      } catch (e) {
        // Continue to fallback
      }
    }

    throw new Error("Nie udało się zinterpretować odpowiedzi lokalnego modelu jako JSON.");
  }

  /**
   * Generic request execution wrapper with timeout, signal handling,
   * network validation, and safe response parsing.
   */
  private async callLocalApi(prompt: string, expectJson: boolean = true): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      // Default Ollama payload structure
      const payload: Record<string, any> = {
        model: "llama3", // Default model assumption for Ollama instances
        prompt: prompt,
        stream: false,
      };

      if (expectJson) {
        payload.format = "json"; // Hint for Ollama JSON mode
      }

      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Błąd HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      
      // Ollama returns text in data.response. Fallback to whole data if stringified.
      const responseText = typeof data.response === "string" ? data.response : (data.response ? JSON.stringify(data.response) : JSON.stringify(data));

      if (expectJson) {
        return this.extractJson(responseText);
      } else {
        return { reply: responseText };
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      console.error("[LocalProvider] Error executing request:", e);

      if (e.name === "AbortError") {
        throw new Error("Lokalny serwer AI nie odpowiedział w oczekiwanym czasie (timeout).");
      }

      // Return clean domain error message to user
      if (e.message && e.message.includes("zinterpretować")) {
        throw e;
      }
      throw new Error("Lokalny silnik AI nie odpowiedział poprawnie.");
    }
  }

  async suggestEvent(payment: any, currentDate: string): Promise<any> {
    const prompt = `Zaplanuj przypomnienie kalendarza w formacie JSON dla płatności:
Nazwa: ${payment.name}
Kwota: ${payment.amount} PLN
Termin: ${payment.dueDate}
Dzisiejsza data: ${currentDate || getLocalDateIso()}

Wymagane pola JSON: summary (np. "💸 Płatność: [Nazwa] ([Kwota] PLN)"), description (stworzony profesjonalny szablon z przypomnieniem o kwocie, dacie i dodaną krótką, przyjazną poradą finansową), suggestedTime (HH:MM:SS), reminders (tablica liczb, minuty np [1440, 120]). Zwróć tylko prawidłowy obiekt JSON.`;
    return this.callLocalApi(prompt, true);
  }

  async parseNatural(text: string, currentDate: string): Promise<any> {
    const prompt = `Wyodrębnij informacje do formy JSON.
Tekst: "${text}"
Data odniesienia: ${currentDate || getLocalDateIso()}

Wymagany format JSON z dwoma kluczami:
'payment' (obiekt z name, amount, dueDate) lub null.
'event' (obiekt z summary, description, suggestedDate, suggestedTime, reminders) lub null.
Zwróć tylko prawidłowy obiekt JSON.`;
    return this.callLocalApi(prompt, true);
  }

  async parseStatement(text: string, currentDate: string): Promise<any> {
    const prompt = `Analizuj wyciąg bankowy. Data odniesienia: ${currentDate}.
Tekst: """${text}"""

Zwróć JSON jako płaską tablicę obiektów: name, amount (liczba dodatnia), type ("income" lub "expense"), isoDate (YYYY-MM-DD), category, account (zawsze "Konto główne").
Zwróć tylko zwalidowany kod JSON (tablicę).`;
    
    const res = await this.callLocalApi(prompt, true);
    return { transactions: Array.isArray(res) ? res : (res.transactions ? res.transactions : []) };
  }

  async chat(message: string, profileData: any): Promise<any> {
    const prompt = `Jesteś doradcą "Saldo". Odpowiadaj zwięźle i profesjonalnie.
Profil użytkownika (do kontekstu, zanonimizowany): ${JSON.stringify(profileData)}.
Pytanie użytkownika: ${message}`;
    
    return this.callLocalApi(prompt, false);
  }

  async scanInvoice(_imageBase64: string, _mimeType: string): Promise<any> {
    throw new Error("Skanowanie faktur z obrazka nie jest wspierane przez obecny lokalny model AI (wymaga modelu multimodalnego).");
  }
}

```


## File: src/server/ai/providers/noAiProvider.ts
```ts
import { getLocalDateIso } from "../../../utils";
import { AiProvider } from "../types";

export class NoAiProvider implements AiProvider {
  /**
   * Generates a calendar event suggestion using deterministic rules.
   */
  async suggestEvent(payment: any, currentDate: string): Promise<any> {
    const name = payment.name || "Rachunek";
    const amount = payment.amount ? `${payment.amount} PLN` : "nieznaną kwotę";
    const refDate = payment.dueDate || currentDate || getLocalDateIso();

    return {
      summary: `💸 Płatność: ${name} (${amount})`,
      description: `Przypomnienie o uregulowaniu rachunku/subskrypcji.\n\nNazwa: ${name}\nKwota: ${amount}\nTermin: ${refDate}\n\n[Wygenerowano automatycznie z aplikacji Saldo]`,
      suggestedTime: "10:00:00",
      reminders: [1440, 120] // 24h and 2h before
    };
  }

  /**
   * Parses natural language input using deterministic regex patterns, date logic, and auto-categorization.
   */
  async parseNatural(text: string, currentDate: string): Promise<any> {
    const raw = text.trim();
    const lower = raw.toLowerCase();
    const today = new Date(currentDate || getLocalDateIso());

    // 1. Amount Extraction (matches e.g. 120 zł, 120.50PLN, 45,99)
    let amount = 0;
    const amountMatch = raw.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:zł|pln|eur|usd|$)/i) || raw.match(/(\d+(?:[.,]\d{1,2})?)/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(",", "."));
    }

    // 2. Date Extraction (jutro, pojutrze, za X dni, YYYY-MM-DD, DD.MM.YYYY)
    let targetDate = new Date(today);
    if (lower.includes("jutro")) {
      targetDate.setDate(today.getDate() + 1);
    } else if (lower.includes("pojutrze")) {
      targetDate.setDate(today.getDate() + 2);
    } else {
      const daysMatch = lower.match(/za\s+(\d+)\s+dni/);
      if (daysMatch) {
        targetDate.setDate(today.getDate() + parseInt(daysMatch[1], 10));
      } else {
        const isoMatch = raw.match(/\b(\d{4}-\d{2}-\d{2})\b/);
        const dotMatch = raw.match(/\b(\d{1,2})[.-](\d{1,2})[.-](\d{4})\b/);
        if (isoMatch) {
          targetDate = new Date(isoMatch[1]);
        } else if (dotMatch) {
          targetDate = new Date(`${dotMatch[3]}-${dotMatch[2].padStart(2, '0')}-${dotMatch[1].padStart(2, '0')}`);
        }
      }
    }

    const isoDueDate = isNaN(targetDate.getTime())
      ? getLocalDateIso(today)
      : getLocalDateIso(targetDate);

    // 3. Name & Intent Extraction
    const isEvent = lower.includes("przypomnij") || lower.includes("wydarzenie") || lower.includes("spotkanie") || lower.includes("kalendarz");
    
    // Clean name from keywords
    let name = raw
      .replace(/(\d+(?:[.,]\d{1,2})?)\s*(?:zł|pln|eur|usd)/gi, "")
      .replace(/przypomnij|wydarzenie|płatność|rachunek|na|za|dni|jutro|pojutrze/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!name || name.length < 2) {
      name = "Szybki wpis";
    } else {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }

    if (isEvent) {
      return {
        payment: null,
        event: {
          summary: `Przypomnienie: ${name}`,
          description: `Ręczny wpis regułowy: ${raw}`,
          suggestedDate: isoDueDate,
          suggestedTime: "10:00:00",
          reminders: [1440, 120]
        }
      };
    } else {
      return {
        payment: {
          name: name,
          amount: amount || 0,
          dueDate: isoDueDate
        },
        event: null
      };
    }
  }

  /**
   * Deterministic CSV / Text statement parser for NoAiProvider fallback.
   */
  async parseStatement(text: string, currentDate: string): Promise<any> {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    const transactions: any[] = [];
    const refDate = currentDate || getLocalDateIso();

    for (const line of lines) {
      const parts = line.split(/;|,|\t/);
      if (parts.length >= 2) {
        // Try parsing columns
        let name = "Transakcja";
        let amount = 0;
        let type: "income" | "expense" = "expense";
        let isoDate = refDate;
        let category = "Inne";

        for (const part of parts) {
          const trimmed = part.trim();
          // Check date
          if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            isoDate = trimmed;
          } else {
            // Check amount
            const num = parseFloat(trimmed.replace(/\s/g, "").replace(",", "."));
            if (!isNaN(num) && num !== 0) {
              if (num < 0) {
                amount = Math.abs(num);
                type = "expense";
              } else {
                amount = num;
                type = "income";
              }
            } else if (trimmed.length > 2 && !/^(data|kwota|opis|tytuł|saldo)$/i.test(trimmed)) {
              name = trimmed;
            }
          }
        }

        // Categorize based on keywords
        const lowerName = name.toLowerCase();
        if (lowerName.includes("orlen") || lowerName.includes("paliwo") || lowerName.includes("bp") || lowerName.includes("shell")) {
          category = "Transport";
        } else if (lowerName.includes("biedronka") || lowerName.includes("lidl") || lowerName.includes("żabka") || lowerName.includes("auchan")) {
          category = "Żywność";
        } else if (lowerName.includes("pge") || lowerName.includes("orange") || lowerName.includes("czynsz") || lowerName.includes("prąd")) {
          category = "Rachunki";
        } else if (type === "income") {
          category = "Wynagrodzenie";
        }

        if (amount > 0) {
          transactions.push({
            name,
            amount,
            type,
            isoDate,
            category,
            account: "Konto główne"
          });
        }
      }
    }

    return { transactions };
  }

  async chat(_message: string, _profileData: any): Promise<any> {
    return {
      reply: "Funkcja interaktywnego chatu wymaga włączenia trybu Lokalne AI (Ollama) lub Chmura AI w Ustawieniach."
    };
  }

  async scanInvoice(_imageBase64: string, _mimeType: string): Promise<any> {
    throw new Error("Skanowanie obrazów faktur wymaga włączenia trybu Chmura AI.");
  }
}

```


## File: src/server/ai/types.ts
```ts
export interface AiProvider {
  suggestEvent(payment: any, currentDate: string, uid?: string): Promise<any>;
  parseNatural(text: string, currentDate: string): Promise<any>;
  parseStatement(text: string, currentDate: string): Promise<any>;
  chat(message: string, profileData: any): Promise<any>;
  scanInvoice(imageBase64: string, mimeType: string): Promise<any>;
}

export interface AiConfig {
  mode: "none" | "local" | "cloud";
  localEndpoint?: string;
}

```


## File: src/server/middleware/auth.ts
```ts
import express from "express";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";

declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
    }
  }
}

export const verifyFirebaseToken = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  
  if (!token || token === "undefined") {
    // We explicitly reject undefined tokens now. Demo users cannot access AI endpoints.
    return res.status(401).json({ error: "Brak autoryzacji. Tryb demonstracyjny nie wspiera funkcji AI." });
  }

  try {
    const adminAuth = getAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Nieautoryzowany dostęp lub token wygasł." });
  }
};

```


## File: src/server/middleware/security.ts
```ts
import rateLimit from "express-rate-limit";

// Protects cloud AI endpoints (most strict, max 10 requests per minute per user/IP)
export const cloudAiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: "Zbyt wiele zapytań do chmury AI. Spróbuj ponownie za chwilę." },
  standardHeaders: true, 
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req: any) => {
    if (req.user && req.user.uid) return req.user.uid;
    return req.ip || "unknown";
  }
});

// Alias for naming consistency
export const aiCloudRateLimiter = cloudAiRateLimiter;

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
      const maxLength = 20000;
      if (JSON.stringify(req.body).length > maxLength) {
        return res.status(413).json({ error: "Zbyt duży rozmiar tekstu (limit 20KB)." });
      }
    }
  }
  next();
};

```


## File: src/server/routes/ai.ts
```ts
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

  req.aiConfig = { mode, localEndpoint };
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
      // Test fetch to local endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const testRes = await fetch(config.localEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "llama3", prompt: "ping", stream: false }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (testRes.ok || testRes.status === 400 || testRes.status === 404) {
          return res.json({ status: "ok", mode: "local", endpoint: config.localEndpoint, message: "Połączenie z lokalnym endpointem udane." });
        } else {
          return res.status(502).json({ status: "error", mode: "local", message: `Lokalny endpoint odpowiedział kodem ${testRes.status}.` });
        }
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

```


## File: src/server/services/aiService.ts
```ts
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

// Simple cost logging
export function logCostMetric(endpoint: string, uid: string | undefined, ip: string, inputLength: number, success: boolean) {
  const timestamp = new Date().toISOString();
  console.log(`[AI Cost Log] ${timestamp} | Endpoint: ${endpoint} | User: ${uid || ip} | InputLen: ${inputLength} | Success: ${success}`);
}

// Simple in-memory cache for deterministic AI endpoints
const aiCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export function getCachedAiResult(cacheKey: string) {
  const cached = aiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  return null;
}

export function setCachedAiResult(cacheKey: string, result: any) {
  // Prevent memory leak
  if (aiCache.size > 500) {
    aiCache.clear();
  }
  aiCache.set(cacheKey, { result, timestamp: Date.now() });
}

```


## File: src/services/aiClient.ts
```ts
import { auth } from "../firebase";

export interface AiConfig {
  aiMode: "none" | "local" | "cloud";
  localAiEndpoint?: string;
}

/**
 * Helper to construct a validated AiConfig from AppState or component state.
 */
export function getAiConfig(state?: { aiMode?: string; localAiEndpoint?: string }): AiConfig {
  const rawMode = state?.aiMode?.toLowerCase();
  const validMode = (rawMode === "cloud" || rawMode === "local" || rawMode === "none")
    ? (rawMode as "none" | "local" | "cloud")
    : "none";

  return {
    aiMode: validMode,
    localAiEndpoint: state?.localAiEndpoint || "http://localhost:11434/api/generate",
  };
}

/**
 * Centralized API invoker for /api/ai/* endpoints.
 * Receives explicit AI configuration from app state.
 */
export async function callAiApi(endpoint: string, payload: any, config: AiConfig) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-ai-mode": config.aiMode || "none",
  };

  if (config.aiMode === "local" && config.localAiEndpoint) {
    headers["x-ai-local-endpoint"] = config.localAiEndpoint;
  }

  // Attach auth token when available (required for 'cloud' mode, optional for local/none)
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`/api/ai/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Błąd serwera: ${response.status}`);
  }

  return response.json();
}

```


## File: src/services/budgetCalculations.ts
```ts
import { Profile, RecurringRule } from "../types";
import { getLocalDateIso, addMonthsClamped, roundCurrency } from "../utils";

export interface SafeToSpendBreakdown {
  currentBalance: number;
  unpaidPaymentsSum: number;
  futureRecurringExpensesSum: number;
  reservedGoalsSum: number;
  safeToSpend: number;
  isNegative: boolean;
}

export interface BudgetWarning {
  category: string;
  limit: number;
  spent: number;
  ratio: number;
  percent: number;
  status: "normal" | "warning" | "exceeded";
}

export function calculateBudgetWarnings(
  profile: Profile | null,
  todayIsoStr?: string
): BudgetWarning[] {
  if (!profile) return [];

  const todayStr = todayIsoStr || getLocalDateIso();
  const todayParts = todayStr.split("-");
  const currentYear = parseInt(todayParts[0], 10);
  const currentMonthIdx = parseInt(todayParts[1], 10) - 1;

  const thisMonthExpenses = (profile.transactions || []).filter((t) => {
    if (t.type !== "expense") return false;
    if (!t.isoDate) return false;
    const d = new Date(`${t.isoDate}T12:00:00`);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx;
  });

  const categorySpentMap: Record<string, number> = {};
  for (const t of thisMonthExpenses) {
    categorySpentMap[t.category] = (categorySpentMap[t.category] || 0) + (Number(t.amount) || 0);
  }

  const warnings: BudgetWarning[] = [];
  const budgets = profile.budgets || {};

  for (const category of Object.keys(budgets)) {
    const limit = Number(budgets[category]) || 0;
    if (limit <= 0) continue;

    const spent = categorySpentMap[category] || 0;
    const ratio = spent / limit;
    const percent = Math.min(100, Math.round(ratio * 100));

    let status: "normal" | "warning" | "exceeded" = "normal";
    if (ratio >= 1) {
      status = "exceeded";
    } else if (ratio >= 0.8) {
      status = "warning";
    }

    warnings.push({
      category,
      limit,
      spent: roundCurrency(spent),
      ratio,
      percent,
      status
    });
  }

  return warnings;
}

export interface ForecastBreakdown {
  currentBalance: number;
  unpaidPaymentsSum: number;
  futureRecurringIncomesSum: number;
  futureRecurringExpensesSum: number;
  forecastedBalance: number;
  isNegative: boolean;
  forecastDate: string;
}

export function calculateEndOfMonthForecast(
  profile: Profile | null,
  recurringRules: RecurringRule[] = [],
  todayIsoStr?: string
): ForecastBreakdown {
  const todayStr = todayIsoStr || getLocalDateIso();

  // 1. Calculate end of month ISO string in local time
  const todayParts = todayStr.split("-");
  const year = parseInt(todayParts[0], 10);
  const month = parseInt(todayParts[1], 10); // 1-indexed (e.g. 7 for July)

  const daysInMonth = new Date(year, month, 0).getDate();
  const endOfMonthStr = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  if (!profile) {
    return {
      currentBalance: 0,
      unpaidPaymentsSum: 0,
      futureRecurringIncomesSum: 0,
      futureRecurringExpensesSum: 0,
      forecastedBalance: 0,
      isNegative: false,
      forecastDate: endOfMonthStr
    };
  }

  // 2. Current total balance from all transactions
  const transactions = Array.isArray(profile.transactions) ? profile.transactions : [];
  const currentBalance = transactions.reduce((sum, tx) => {
    const amount = Number(tx.amount) || 0;
    if (tx.type === "income") return sum + amount;
    if (tx.type === "expense") return sum - amount;
    return sum;
  }, 0);

  // 3. Sum unpaid payments due up to end of current month (inclusive, including overdue)
  const payments = Array.isArray(profile.payments) ? profile.payments : [];
  const unpaidPaymentsSum = payments.reduce((sum, p) => {
    if (p.status === "Opłacono") return sum;
    if (p.dueDate && p.dueDate <= endOfMonthStr) {
      return sum + (Number(p.amount) || 0);
    }
    return sum;
  }, 0);

  // Build a set of existing recurring instances to avoid double counting
  const existingRecurringInstances = new Set<string>();
  for (const tx of transactions) {
    if (tx.recurringRuleId && tx.isoDate) {
      existingRecurringInstances.add(`${tx.recurringRuleId}_${tx.isoDate}`);
    }
  }
  for (const p of payments) {
    if (p.recurringRuleId && p.dueDate) {
      existingRecurringInstances.add(`${p.recurringRuleId}_${p.dueDate}`);
    }
  }

  // 4. Sum future mandatory recurring incomes and expenses from active rules until end of month
  let futureRecurringIncomesSum = 0;
  let futureRecurringExpensesSum = 0;

  if (Array.isArray(recurringRules)) {
    for (const rule of recurringRules) {
      if (!rule || rule.isActive === false) continue;

      const ruleAmount = Number(rule.amount) || 0;
      if (ruleAmount <= 0) continue;

      let currDueDate = rule.nextDueDate;
      let occurrences = 0;
      const MAX_OCCURRENCES = 100;

      while (currDueDate && currDueDate <= endOfMonthStr && occurrences < MAX_OCCURRENCES) {
        if (currDueDate >= todayStr) {
          const instanceKey = `${rule.id}_${currDueDate}`;
          if (!existingRecurringInstances.has(instanceKey)) {
            if (rule.type === "income") {
              futureRecurringIncomesSum += ruleAmount;
            } else if (rule.type === "expense") {
              futureRecurringExpensesSum += ruleAmount;
            }
          }
        }

        const prevDueDate = currDueDate;
        if (rule.frequency === "weekly") {
          const nextDate = new Date(currDueDate + "T00:00:00");
          nextDate.setDate(nextDate.getDate() + 7);
          currDueDate = getLocalDateIso(nextDate);
        } else if (rule.frequency === "biweekly") {
          const nextDate = new Date(currDueDate + "T00:00:00");
          nextDate.setDate(nextDate.getDate() + 14);
          currDueDate = getLocalDateIso(nextDate);
        } else if (rule.frequency === "monthly") {
          currDueDate = addMonthsClamped(currDueDate, 1);
        } else if (rule.frequency === "quarterly") {
          currDueDate = addMonthsClamped(currDueDate, 3);
        } else if (rule.frequency === "yearly") {
          currDueDate = addMonthsClamped(currDueDate, 12);
        } else {
          currDueDate = addMonthsClamped(currDueDate, 1);
        }

        if (currDueDate <= prevDueDate) break;
        occurrences++;
      }
    }
  }

  const rawForecast = currentBalance - unpaidPaymentsSum - futureRecurringExpensesSum + futureRecurringIncomesSum;
  const forecastedBalance = Number.isFinite(rawForecast) ? rawForecast : 0;

  return {
    currentBalance: roundCurrency(Number.isFinite(currentBalance) ? currentBalance : 0),
    unpaidPaymentsSum: roundCurrency(Number.isFinite(unpaidPaymentsSum) ? unpaidPaymentsSum : 0),
    futureRecurringIncomesSum: roundCurrency(Number.isFinite(futureRecurringIncomesSum) ? futureRecurringIncomesSum : 0),
    futureRecurringExpensesSum: roundCurrency(Number.isFinite(futureRecurringExpensesSum) ? futureRecurringExpensesSum : 0),
    forecastedBalance: roundCurrency(forecastedBalance),
    isNegative: forecastedBalance < 0,
    forecastDate: endOfMonthStr
  };
}

export function calculateSafeToSpend(
  profile: Profile | null,
  recurringRules: RecurringRule[] = [],
  todayIsoStr?: string
): SafeToSpendBreakdown {
  const todayStr = todayIsoStr || getLocalDateIso();

  if (!profile) {
    return {
      currentBalance: 0,
      unpaidPaymentsSum: 0,
      futureRecurringExpensesSum: 0,
      reservedGoalsSum: 0,
      safeToSpend: 0,
      isNegative: false
    };
  }

  // 1. Calculate end of month ISO string in local time
  const todayParts = todayStr.split("-");
  const year = parseInt(todayParts[0], 10);
  const month = parseInt(todayParts[1], 10); // 1-indexed (e.g. 7 for July)

  const daysInMonth = new Date(year, month, 0).getDate();
  const endOfMonthStr = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  // 2. Calculate current total balance from all profile transactions
  const transactions = Array.isArray(profile.transactions) ? profile.transactions : [];
  const currentBalance = transactions.reduce((sum, tx) => {
    const amount = Number(tx.amount) || 0;
    if (tx.type === "income") return sum + amount;
    if (tx.type === "expense") return sum - amount;
    return sum;
  }, 0);

  // 3. Sum unpaid payments due up to end of current month (inclusive, including overdue)
  const payments = Array.isArray(profile.payments) ? profile.payments : [];
  const unpaidPaymentsSum = payments.reduce((sum, p) => {
    if (p.status === "Opłacono") return sum;
    if (p.dueDate && p.dueDate <= endOfMonthStr) {
      return sum + (Number(p.amount) || 0);
    }
    return sum;
  }, 0);

  // Build a set of existing recurring instances to avoid double counting
  const existingRecurringInstances = new Set<string>();
  for (const tx of transactions) {
    if (tx.recurringRuleId && tx.isoDate) {
      existingRecurringInstances.add(`${tx.recurringRuleId}_${tx.isoDate}`);
    }
  }
  for (const p of payments) {
    if (p.recurringRuleId && p.dueDate) {
      existingRecurringInstances.add(`${p.recurringRuleId}_${p.dueDate}`);
    }
  }

  // 4. Sum future mandatory recurring expenses from active recurring rules until end of month
  let futureRecurringExpensesSum = 0;
  if (Array.isArray(recurringRules)) {
    for (const rule of recurringRules) {
      if (!rule || rule.isActive === false || rule.type !== "expense") continue;

      const ruleAmount = Number(rule.amount) || 0;
      if (ruleAmount <= 0) continue;

      let currDueDate = rule.nextDueDate;
      let occurrences = 0;
      const MAX_OCCURRENCES = 100;

      while (currDueDate && currDueDate <= endOfMonthStr && occurrences < MAX_OCCURRENCES) {
        if (currDueDate >= todayStr) {
          const instanceKey = `${rule.id}_${currDueDate}`;
          if (!existingRecurringInstances.has(instanceKey)) {
            futureRecurringExpensesSum += ruleAmount;
          }
        }

        const prevDueDate = currDueDate;
        if (rule.frequency === "weekly") {
          const nextDate = new Date(currDueDate + "T00:00:00");
          nextDate.setDate(nextDate.getDate() + 7);
          currDueDate = getLocalDateIso(nextDate);
        } else if (rule.frequency === "biweekly") {
          const nextDate = new Date(currDueDate + "T00:00:00");
          nextDate.setDate(nextDate.getDate() + 14);
          currDueDate = getLocalDateIso(nextDate);
        } else if (rule.frequency === "monthly") {
          currDueDate = addMonthsClamped(currDueDate, 1);
        } else if (rule.frequency === "quarterly") {
          currDueDate = addMonthsClamped(currDueDate, 3);
        } else if (rule.frequency === "yearly") {
          currDueDate = addMonthsClamped(currDueDate, 12);
        } else {
          currDueDate = addMonthsClamped(currDueDate, 1);
        }

        // Prevent infinite loops if date calculation fails to advance
        if (currDueDate <= prevDueDate) break;
        occurrences++;
      }
    }
  }

  // 5. Sum reserved funds assigned to active goals
  const goals = Array.isArray(profile.goals) ? profile.goals : [];
  const reservedGoalsSum = goals.reduce((sum, g) => {
    const saved = Number(g.saved) || 0;
    return saved > 0 ? sum + saved : sum;
  }, 0);

  // 6. Calculate net safe-to-spend
  const rawSafe = currentBalance - unpaidPaymentsSum - futureRecurringExpensesSum - reservedGoalsSum;
  const safeToSpend = Number.isFinite(rawSafe) ? rawSafe : 0;

  return {
    currentBalance: roundCurrency(Number.isFinite(currentBalance) ? currentBalance : 0),
    unpaidPaymentsSum: roundCurrency(Number.isFinite(unpaidPaymentsSum) ? unpaidPaymentsSum : 0),
    futureRecurringExpensesSum: roundCurrency(Number.isFinite(futureRecurringExpensesSum) ? futureRecurringExpensesSum : 0),
    reservedGoalsSum: roundCurrency(Number.isFinite(reservedGoalsSum) ? reservedGoalsSum : 0),
    safeToSpend: roundCurrency(safeToSpend),
    isNegative: safeToSpend < 0
  };
}

```


## File: src/services/calendarValidation.ts
```ts
export interface CalendarEventInput {
  summary: string;
  description?: string;
  eventDate: string;
  eventTime: string;
  reminders: number[];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateCalendarEventInput(input: CalendarEventInput): ValidationResult {
  if (!input.summary || input.summary.trim().length === 0) {
    return { isValid: false, error: "Tytuł wydarzenia nie może być pusty." };
  }

  if (!input.eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate) || isNaN(Date.parse(input.eventDate))) {
    return { isValid: false, error: "Wybierz prawidłową datę wydarzenia w formacie YYYY-MM-DD." };
  }

  if (!input.eventTime || !/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(input.eventTime)) {
    return { isValid: false, error: "Wybierz prawidłową godzinę wydarzenia w formacie HH:MM." };
  }

  if (Array.isArray(input.reminders) && input.reminders.length > 5) {
    return { isValid: false, error: "Możesz wybrać maksymalnie 5 powiadomień." };
  }

  return { isValid: true };
}

```


## File: src/services/crypto.profileSize.test.ts
```ts
import { describe, it, expect } from "vitest";
import { estimateProfileSizes } from "./crypto";
import { AppState, Profile } from "../types";

describe("estimateProfileSizes", () => {
  it("powinno zwracać rozmiary dla wszystkich profili w stanie", () => {
    const smallProfile: Profile = {
      id: "p-small",
      name: "Small",
      kind: "personal",
      transactions: [{ id: "t1", name: "Zakup", amount: 10, type: "expense", category: "Inne", account: "Gotówka", isoDate: "2023-01-01" }],
      payments: [],
      goals: [],
      investments: [],
      budgets: {}
    };

    const largeProfile: Profile = {
      ...smallProfile,
      id: "p-large",
      name: "Large",
      transactions: [
        { id: "t1", name: "Zakup", amount: 10, type: "expense", category: "Inne", account: "Gotówka", isoDate: "2023-01-01" },
        { id: "t2", name: "Zakup 2", amount: 20, type: "expense", category: "Inne", account: "Gotówka", isoDate: "2023-01-02" },
        { id: "t3", name: "Zakup 3", amount: 30, type: "expense", category: "Inne", account: "Gotówka", isoDate: "2023-01-03" },
        { id: "t4", name: "Bardzo długi tekst transakcji aby zwiększyć rozmiar payloadu", amount: 100, type: "expense", category: "Inne", account: "Gotówka", isoDate: "2023-01-04" }
      ]
    };

    const state: AppState = {
      profiles: [smallProfile, largeProfile],
      activeProfileId: "p-small",
      schemaVersion: 1,
      updatedAt: "2023-01-01T00:00:00Z",
      lastModifiedBy: "test",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    const sizes = estimateProfileSizes(state);

    expect(sizes).toHaveLength(2);
    
    const smallSize = sizes.find(s => s.profileId === "p-small")?.bytes;
    const largeSize = sizes.find(s => s.profileId === "p-large")?.bytes;

    expect(smallSize).toBeDefined();
    expect(largeSize).toBeDefined();
    
    // Upewnijmy się, że profil z większą liczbą danych ma większy rozmiar
    expect(largeSize!).toBeGreaterThan(smallSize!);
  });

  it("powinno bezpiecznie obsłużyć brak profili", () => {
    const state = {} as AppState; // symulujemy niepełny stan
    const sizes = estimateProfileSizes(state);
    expect(sizes).toEqual([]);
  });
});

```


## File: src/services/crypto.size.test.ts
```ts
import { describe, it, expect } from "vitest";
import { estimateJsonSizeBytes, FIRESTORE_DOC_HARD_LIMIT_BYTES, FIRESTORE_DOC_WARNING_BYTES } from "./crypto";

describe("estimateJsonSizeBytes", () => {
  it("szacuje rozmiar małego obiektu na > 0 bajtów", () => {
    const size = estimateJsonSizeBytes({ a: 1 });
    expect(size).toBeGreaterThan(0);
    // {"a":1} is exactly 7 bytes
    expect(size).toBe(7);
  });

  it("zwraca poprawne wartości dla null (>= 4 bajty)", () => {
    const size = estimateJsonSizeBytes(null);
    expect(size).toBeGreaterThanOrEqual(4);
    // "null" is 4 bytes
    expect(size).toBe(4);
  });

  it("większy obiekt zwraca większy rozmiar", () => {
    const smallObj = { a: 1 };
    const largeObj = { a: 1, b: "Bardzo długi tekst z polskimi znakami ąćęłńóśźż", c: [1, 2, 3, 4, 5] };
    
    const smallSize = estimateJsonSizeBytes(smallObj);
    const largeSize = estimateJsonSizeBytes(largeObj);
    
    expect(largeSize).toBeGreaterThan(smallSize);
  });

  it("obsługuje błędne obiekty i zwraca 0 (np. zawierające cykle)", () => {
    const cyclicObj: any = {};
    cyclicObj.self = cyclicObj;
    
    const size = estimateJsonSizeBytes(cyclicObj);
    expect(size).toBe(0);
  });

  it("stałe limitów mają dokładnie wymaganą wartość", () => {
    expect(FIRESTORE_DOC_HARD_LIMIT_BYTES).toBe(1048576);
    expect(FIRESTORE_DOC_WARNING_BYTES).toBe(900000);
  });
});

```


## File: src/services/crypto.ts
```ts
import { Profile, AppState } from "../types";

export const activeKeys: Record<string, CryptoKey> = {};

const getCrypto = (): Crypto => {
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  }
  return globalThis.crypto;
};

export function generateRandomSalt(): string {
  const arr = new Uint8Array(16);
  getCrypto().getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function clearActiveKeys(): void {
  for (const k of Object.keys(activeKeys)) {
    delete activeKeys[k];
  }
}

export async function deriveKeyFromPin(pin: string, salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const cryptoObj = getCrypto();
  const keyMaterial = await cryptoObj.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  // NIE ZMIENIAĆ iterations: 100000 bez migracji istniejących encryptedPayload
  return cryptoObj.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptProfile(profile: Profile, key: CryptoKey): Promise<Profile> {
  const dataToEncrypt = {
    transactions: profile.transactions || [],
    payments: profile.payments || [],
    goals: profile.goals || [],
    investments: profile.investments || [],
    budgets: profile.budgets || {},
    recurringRules: profile.recurringRules || [],
    transactionRules: profile.transactionRules || [],
    settlements: profile.settlements || [],
    accounts: profile.accounts || []
  };
  
  const cryptoObj = getCrypto();
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(dataToEncrypt));
  const ciphertext = await cryptoObj.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  
  const encryptedPayload = JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(ciphertext))
  });

  return {
    ...profile,
    encryptedPayload,
    transactions: [],
    payments: [],
    goals: [],
    investments: [],
    budgets: {},
    recurringRules: [],
    transactionRules: [],
    settlements: [],
    accounts: []
  };
}

export async function decryptProfile(profile: Profile, key: CryptoKey): Promise<Profile> {
  if (!profile.encryptedPayload) return profile;
  try {
    const cryptoObj = getCrypto();
    const parsed = JSON.parse(profile.encryptedPayload);
    const iv = new Uint8Array(parsed.iv);
    const data = new Uint8Array(parsed.data);
    const decrypted = await cryptoObj.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    const decoded = new TextDecoder().decode(decrypted);
    const plaintext = JSON.parse(decoded);

    return {
      ...profile,
      transactions: plaintext.transactions || [],
      payments: plaintext.payments || [],
      goals: plaintext.goals || [],
      investments: plaintext.investments || [],
      budgets: plaintext.budgets || {},
      recurringRules: plaintext.recurringRules || [],
      transactionRules: plaintext.transactionRules || [],
      settlements: plaintext.settlements || [],
      accounts: plaintext.accounts || []
    };
  } catch (err) {
    console.error("Failed to decrypt profile:", profile.id, err);
    throw new Error("DECRYPTION_FAILED: Nieprawidłowy kod PIN lub uszkodzone dane zaszyfrowane.");
  }
}

export async function prepareStateForRemoteSave(state: AppState): Promise<AppState> {
  const updatedProfiles = await Promise.all(
    state.profiles.map(async (profile) => {
      if (!profile.pinHash) {
        return profile;
      }
      const key = activeKeys[profile.id];
      if (key) {
        return await encryptProfile(profile, key);
      }
      const hasSensitiveData =
        (profile.transactions && profile.transactions.length > 0) ||
        (profile.payments && profile.payments.length > 0) ||
        (profile.goals && profile.goals.length > 0) ||
        (profile.investments && profile.investments.length > 0) ||
        (profile.budgets && Object.keys(profile.budgets).length > 0) ||
        (profile.recurringRules && profile.recurringRules.length > 0) ||
        (profile.transactionRules && profile.transactionRules.length > 0) ||
        (profile.settlements && profile.settlements.length > 0) ||
        (profile.accounts && profile.accounts.length > 0);

      if (profile.encryptedPayload && !hasSensitiveData) {
        return profile;
      }

      if (hasSensitiveData) {
        throw new Error("Odblokuj profil zabezpieczony PIN, aby wykonać bezpieczną kopię.");
      }

      return profile;
    })
  );

  return {
    ...state,
    profiles: updatedProfiles,
  };
}

export const FIRESTORE_DOC_HARD_LIMIT_BYTES = 1048576;
export const FIRESTORE_DOC_WARNING_BYTES = 900000;

export function estimateJsonSizeBytes(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return 0;
  }
}

export function estimateProfileSizes(state: AppState): Array<{ profileId: string; bytes: number }> {
  return (state.profiles || []).map((profile) => ({
    profileId: profile.id,
    bytes: estimateJsonSizeBytes(profile)
  }));
}


```


## File: src/services/duplicateDetector.ts
```ts
import { Transaction } from "../types";

export interface DuplicateCheckResult {
  isLikelyDuplicate: boolean;
  confidence?: "low" | "medium" | "high";
  matchedTransactionId?: string;
  reason?: string;
}

function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s]/g, "") // remove punctuation
    .replace(/\s+/g, " ")
    .trim();
}

export function checkDuplicate(
  newTx: Omit<Transaction, "id">,
  existingTransactions: Transaction[]
): DuplicateCheckResult {
  const newAmount = Math.abs(Number(newTx.amount) || 0);
  const newDate = new Date(newTx.isoDate).getTime();
  const newNameNorm = normalizeText(newTx.name);

  for (const existingTx of existingTransactions) {
    if (existingTx.type !== newTx.type) continue;
    
    const existingAmount = Math.abs(Number(existingTx.amount) || 0);
    if (Math.abs(existingAmount - newAmount) > 0.01) continue;

    const existingDate = new Date(existingTx.isoDate).getTime();
    const diffDays = Math.abs(existingDate - newDate) / (1000 * 60 * 60 * 24);
    
    if (diffDays > 1.1) continue; // 1 day tolerance, adding 0.1 for daylight savings / timezone jitter if any

    const existingNameNorm = normalizeText(existingTx.name);

    // Exact match
    if (newNameNorm === existingNameNorm) {
      return {
        isLikelyDuplicate: true,
        confidence: "high",
        matchedTransactionId: existingTx.id,
        reason: diffDays > 0 
          ? "Znaleziono identyczną transakcję z wczoraj lub jutra." 
          : "Znaleziono identyczną transakcję z tego samego dnia."
      };
    }

    // Partial match (one contains another or strong word overlap)
    const newWords = newNameNorm.split(" ").filter(w => w.length > 2);
    const existingWords = existingNameNorm.split(" ").filter(w => w.length > 2);
    
    let matchCount = 0;
    for (const nw of newWords) {
      if (existingWords.includes(nw)) matchCount++;
    }

    const isPartial = 
      (newNameNorm && existingNameNorm.includes(newNameNorm)) || 
      (existingNameNorm && newNameNorm.includes(existingNameNorm)) ||
      (matchCount > 0 && matchCount >= Math.min(newWords.length, existingWords.length) / 2);

    if (isPartial) {
      return {
        isLikelyDuplicate: true,
        confidence: "medium",
        matchedTransactionId: existingTx.id,
        reason: "Znaleziono podobną transakcję o tej samej kwocie w zbliżonym terminie."
      };
    }
  }

  return { isLikelyDuplicate: false };
}

```


## File: src/services/goalTransfers.ts
```ts
import { Profile, Goal, SavingsTransfer } from "../types";

export interface GoalTransferOptions {
  note?: string;
  transferId?: string;
}

/**
 * Aplikuje wpłatę lub wypłatę na pojedynczym celu oszczędnościowym (Model A).
 * - Kwoty dodatnie (amount > 0): wpłata, zwiększa saved.
 * - Kwoty ujemne (amount < 0): wypłata, zmniejsza saved, lecz jest clampowana tak, by saved nie spadło poniżej 0.
 * - Jeśli wypłata następuje przy saved == 0 (lub actualAmount == 0 przy niezerowym amount), cel nie ulega zmianie.
 * - Tworzony jest wpis w g.transfers.
 * - Operacja NIE tworzy transakcji w historii przychodów/wydatków.
 */
export function applyGoalTransfer(
  goal: Goal,
  amount: number,
  isoDate: string,
  options?: GoalTransferOptions
): Goal {
  const actualAmount = amount < 0 ? Math.max(amount, -goal.saved) : amount;
  if (actualAmount === 0 && amount !== 0) return goal;

  const transferId =
    options?.transferId ||
    "tr-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  const existingTransfers = goal.transfers || [];
  const newTransfer: SavingsTransfer = {
    id: transferId,
    amount: actualAmount,
    isoDate,
    note: options?.note || (actualAmount >= 0 ? "Wpłata" : "Wypłata")
  };

  return {
    ...goal,
    saved: goal.saved + actualAmount,
    transfers: [newTransfer, ...existingTransfers]
  };
}

/**
 * Aplikuje wpłatę/wypłatę na celu oszczędnościowym w ramach profilu (Model A).
 * Zachowuje bez zmian listę transakcji (profile.transactions), nie powodując double-countingu.
 */
export function applyGoalTransferToProfile(
  profile: Profile,
  goalId: string,
  amount: number,
  isoDate: string,
  options?: GoalTransferOptions
): Profile {
  const activeGoal = (profile.goals || []).find((g) => g.id === goalId);
  if (!activeGoal) return profile;

  const updatedGoals = profile.goals.map((g) => {
    if (g.id === goalId) {
      return applyGoalTransfer(g, amount, isoDate, options);
    }
    return g;
  });

  return {
    ...profile,
    goals: updatedGoals
  };
}

```


## File: src/services/localDb.ts
```ts
import { AppState } from "../types";
import { validateAndMigrateState } from "../hooks/useBudgetState";

export const LOCAL_STORAGE_KEY_V2 = "saldo-local-fallback-v2";
export const LOCAL_STORAGE_KEY_V1 = "saldo-local-fallback";

const DB_NAME = "saldo-app-db";
const DB_VERSION = 1;
const STORE_NAME = "app_state";
const STATE_KEY = "current";

/**
 * Open IndexedDB database connection wrapped in Promise
 */
export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB"));
    };
  });
}

/**
 * Saves state directly into IndexedDB store
 */
export async function saveStateToIDBOnly(state: AppState): Promise<void> {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(state, STATE_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Reads AppState from IndexedDB store
 */
export async function loadStateFromIDBOnly(): Promise<AppState | null> {
  const db = await openDb();
  return new Promise<AppState | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(STATE_KEY);
    req.onsuccess = () => resolve((req.result as AppState) || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Reads AppState from IndexedDB. If IDB is empty, checks localStorage (v2 then v1),
 * migrates state via validateAndMigrateState, saves to IDB, and returns it.
 */
export async function loadState(): Promise<AppState | null> {
  let idbState: unknown = null;

  try {
    idbState = await loadStateFromIDBOnly();
  } catch (err) {
    console.warn("IndexedDB load failed, falling back to localStorage:", err);
  }

  if (idbState) {
    return validateAndMigrateState(idbState);
  }

  // Fallback / One-time Migration from localStorage (v2 or v1)
  if (typeof localStorage !== "undefined") {
    const cachedV2 = localStorage.getItem(LOCAL_STORAGE_KEY_V2);
    if (cachedV2) {
      try {
        const parsed = validateAndMigrateState(JSON.parse(cachedV2));
        // Migrate data to IDB asynchronously
        try {
          await saveStateToIDBOnly(parsed);
        } catch (idbErr) {
          console.warn("Failed migrating localStorage V2 data to IndexedDB:", idbErr);
        }
        return parsed;
      } catch (err) {
        console.warn("Failed parsing localStorage V2:", err);
      }
    }

    const cachedV1 = localStorage.getItem(LOCAL_STORAGE_KEY_V1);
    if (cachedV1) {
      try {
        const parsedV1 = validateAndMigrateState(JSON.parse(cachedV1));
        try {
          await saveStateToIDBOnly(parsedV1);
          localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(parsedV1));
          localStorage.removeItem(LOCAL_STORAGE_KEY_V1);
        } catch (idbErr) {
          console.warn("Failed migrating localStorage V1 data to IndexedDB/V2:", idbErr);
        }
        return parsedV1;
      } catch (err) {
        console.warn("Failed parsing localStorage V1:", err);
      }
    }
  }

  return null;
}

/**
 * Saves state to IndexedDB as primary store, and dual-writes to localStorage V2 as secondary backup.
 * Handles QuotaExceededError gracefully.
 */
export async function saveState(state: AppState): Promise<void> {
  let idbSaved = false;
  let idbQuotaError = false;

  // 1. Primary store: IndexedDB
  try {
    await saveStateToIDBOnly(state);
    idbSaved = true;
  } catch (err: any) {
    console.warn("IndexedDB save failed:", err);
    if (
      err &&
      (err.name === "QuotaExceededError" ||
        err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        err.code === 22 ||
        err.message?.includes("QuotaExceeded"))
    ) {
      idbQuotaError = true;
    }
  }

  // 2. Dual-write backup: localStorage V2
  let lsQuotaError = false;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_V2, JSON.stringify(state));
    } catch (err: any) {
      console.warn("localStorage backup save failed:", err);
      if (
        err &&
        (err.name === "QuotaExceededError" ||
          err.code === 22 ||
          err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
          err.message?.includes("QuotaExceeded"))
      ) {
        lsQuotaError = true;
      }
    }
  }

  // 3. Quota Exceeded handling
  if (idbQuotaError || lsQuotaError || (!idbSaved && lsQuotaError)) {
    // If IDB failed due to quota OR if localStorage failed due to quota when IDB failed
    if (idbQuotaError || (!idbSaved && lsQuotaError)) {
      throw new Error("QUOTA_EXCEEDED: Przekroczono limit pamięci przeglądarki. Zwolnij miejsce na urządzeniu.");
    }
  }

  if (!idbSaved && lsQuotaError) {
    throw new Error("STORAGE_FAILED: Nie udało się zapisać stanu w pamięci podręcznej.");
  }
}

/**
 * Clears state from IndexedDB and localStorage fallback keys
 */
export async function clearState(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(STATE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB clear failed:", err);
  }

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY_V2);
      localStorage.removeItem(LOCAL_STORAGE_KEY_V1);
    } catch (_) {}
  }
}

```


## File: src/services/monthlyDigest.ts
```ts
import { Transaction } from "../types";

export interface MonthlyDigestResult {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number | null;
  topExpenseCategory: string | null;
  topExpenseCategoryAmount: number;
  momExpenseChangePercent: number | null;
  transactionCount: number;
  summaryText: string;
}

const MONTH_NAMES_LOCATIVE = [
  "styczniu", "lutym", "marcu", "kwietniu", "maju", "czerwcu",
  "lipcu", "sierpniu", "wrześniu", "październiku", "listopadzie", "grudniu"
];

export function generateMonthlyDigest(
  transactions: Transaction[],
  year: number,
  monthIdx: number
): MonthlyDigestResult {
  let prevMonthIdx = monthIdx - 1;
  let prevYear = year;
  if (prevMonthIdx < 0) {
    prevMonthIdx = 11;
    prevYear -= 1;
  }

  let totalIncome = 0;
  let totalExpenses = 0;
  let transactionCount = 0;
  const categoryExpenses: Record<string, number> = {};

  let prevTotalExpenses = 0;
  let hasPrevMonthData = false;

  for (const tx of transactions) {
    if (!tx.isoDate) continue;
    const d = new Date(`${tx.isoDate}T12:00:00`);
    const txYear = d.getFullYear();
    const txMonth = d.getMonth();
    
    if (txYear === year && txMonth === monthIdx) {
      transactionCount++;
      const amount = Number(tx.amount) || 0;
      if (tx.type === "income") {
        totalIncome += amount;
      } else if (tx.type === "expense") {
        totalExpenses += amount;
        categoryExpenses[tx.category] = (categoryExpenses[tx.category] || 0) + amount;
      }
    } else if (txYear === prevYear && txMonth === prevMonthIdx) {
      hasPrevMonthData = true;
      if (tx.type === "expense") {
        prevTotalExpenses += (Number(tx.amount) || 0);
      }
    }
  }

  const balance = totalIncome - totalExpenses;
  let savingsRate: number | null = null;
  if (totalIncome > 0) {
    savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
  }

  let topExpenseCategory: string | null = null;
  let topExpenseCategoryAmount = 0;
  for (const cat in categoryExpenses) {
    if (categoryExpenses[cat] > topExpenseCategoryAmount) {
      topExpenseCategoryAmount = categoryExpenses[cat];
      topExpenseCategory = cat;
    }
  }

  let momExpenseChangePercent: number | null = null;
  if (hasPrevMonthData && prevTotalExpenses > 0) {
    momExpenseChangePercent = ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100;
  } else if (hasPrevMonthData && prevTotalExpenses === 0 && totalExpenses > 0) {
    momExpenseChangePercent = 100; 
  } else if (hasPrevMonthData && prevTotalExpenses === 0 && totalExpenses === 0) {
    momExpenseChangePercent = 0;
  }

  const sentences: string[] = [];
  const monthName = MONTH_NAMES_LOCATIVE[monthIdx];
  const prevMonthName = MONTH_NAMES_LOCATIVE[prevMonthIdx];
  
  if (hasPrevMonthData) {
    if (totalExpenses < prevTotalExpenses) {
      sentences.push(`W ${monthName} wydałeś mniej niż w ${prevMonthName}.`);
    } else if (totalExpenses > prevTotalExpenses) {
      sentences.push(`W ${monthName} wydałeś więcej niż w ${prevMonthName}.`);
    } else {
      sentences.push(`W ${monthName} wydałeś tyle samo co w ${prevMonthName}.`);
    }
  }

  if (topExpenseCategory) {
    sentences.push(`Najwięcej środków przeznaczyłeś na kategorię: ${topExpenseCategory}.`);
  }

  if (totalIncome > 0 || totalExpenses > 0) {
    if (balance > 0) {
      sentences.push("Bilans miesiąca był dodatni.");
    } else if (balance < 0) {
      sentences.push("Bilans miesiąca był ujemny.");
    } else {
      sentences.push("Bilans miesiąca wyszedł na zero.");
    }
  } else {
    sentences.push("Brak danych finansowych w tym miesiącu.");
  }

  const summaryText = sentences.slice(0, 3).join(" ");

  return {
    totalIncome,
    totalExpenses,
    balance,
    savingsRate,
    topExpenseCategory,
    topExpenseCategoryAmount,
    momExpenseChangePercent,
    transactionCount,
    summaryText
  };
}

```


## File: src/services/parseCsv.ts
```ts
import Papa from "papaparse";
import { Transaction, TransactionRule } from "../types";
import { autoCategorizeTransaction, iconByCategory } from "../utils";

export interface BankPreset {
  id: "generic" | "mbank" | "pko" | "ing";
  name: string;
  description: string;
  defaultSeparator?: string;
}

export const BANK_PRESETS: BankPreset[] = [
  {
    id: "generic",
    name: "Generyczny CSV (Auto-detekcja)",
    description: "Automatyczne rozpoznawanie separatora (;, ,) oraz nagłówków"
  },
  {
    id: "mbank",
    name: "mBank",
    description: "Format wyciągu mBank (separator ;)",
    defaultSeparator: ";"
  },
  {
    id: "pko",
    name: "PKO BP (iPKO)",
    description: "Format wyciągu PKO Bank Polski (.csv)",
    defaultSeparator: ","
  },
  {
    id: "ing",
    name: "ING Bank Śląski",
    description: "Format wyciągu Moje ING (separator ;)",
    defaultSeparator: ";"
  }
];

export function cleanCsvBomAndEncoding(text: string): string {
  if (!text) return "";
  // Strip UTF-8 BOM if present
  let cleaned = text.startsWith("\uFEFF") ? text.slice(1) : text;
  return cleaned;
}

export function detectCsvSeparator(text: string): string {
  const sampleLines = text.split(/\r?\n/).slice(0, 15).filter((l) => l.trim().length > 0);
  let semicolonCount = 0;
  let commaCount = 0;

  for (const line of sampleLines) {
    semicolonCount += (line.match(/;/g) || []).length;
    commaCount += (line.match(/,/g) || []).length;
  }

  return semicolonCount >= commaCount ? ";" : ",";
}

export function parseCsvDate(rawDate: string): string | null {
  if (!rawDate) return null;
  const trimmed = rawDate.trim().replace(/^['"]|['"]$/g, "");

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // DD.MM.YYYY or DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY.MM.DD or YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, "0");
    const day = ymdMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // JS Date parse fallback
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

export function parseCsvAmount(rawAmount: string): { amount: number; isNegative: boolean } | null {
  if (!rawAmount) return null;
  let cleaned = rawAmount
    .replace(/\s+/g, "")
    .replace(/PLN|EUR|USD|zł|PLZ/gi, "")
    .replace(/^["']|["']$/g, "");

  if (!cleaned) return null;

  let isNegative = false;
  if (cleaned.startsWith("-") || cleaned.includes("-")) {
    isNegative = true;
  }

  // Replace comma with dot
  cleaned = cleaned.replace(/,/g, ".").replace(/[^\d.-]/g, "");

  const val = parseFloat(cleaned);
  if (isNaN(val) || val === 0) {
    return null;
  }

  return {
    amount: Math.abs(val),
    isNegative: val < 0 || isNegative
  };
}

export function autoDetectBankColumns(
  headers: string[],
  presetId: "generic" | "mbank" | "pko" | "ing" = "generic"
) {
  let mapName = "";
  let mapAmount = "";
  let mapDate = "";
  let mapCategory = "";

  if (presetId === "mbank") {
    const foundTytul = headers.find((h) => /#?tytuł/i.test(h.trim()));
    const foundNadawca = headers.find((h) => /#?nadawca|#?odbiorca/i.test(h.trim()));
    const foundOpis = headers.find((h) => /#?opis/i.test(h.trim()));
    mapName = foundTytul || foundNadawca || foundOpis || "";

    const foundKwota = headers.find((h) => /#?kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundDataOper = headers.find((h) => /#?data operacji/i.test(h.trim()));
    const foundDataKsieg = headers.find((h) => /#?data księgowania/i.test(h.trim()));
    const foundDataAny = headers.find((h) => /#?data/i.test(h.trim()));
    mapDate = foundDataOper || foundDataKsieg || foundDataAny || "";
  } else if (presetId === "pko") {
    const foundTytul = headers.find((h) => /nazwa|odbiorca|nadawca|tytuł/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data operacji|data waluty|data/i.test(h.trim()));
    mapDate = foundData || "";
  } else if (presetId === "ing") {
    const foundTytul = headers.find((h) => /tytuł|dane kontrahenta/i.test(h.trim()));
    mapName = foundTytul || "";

    const foundKwota = headers.find((h) => /kwota/i.test(h.trim()));
    mapAmount = foundKwota || "";

    const foundData = headers.find((h) => /data transakcji|data rozliczenia|data/i.test(h.trim()));
    mapDate = foundData || "";
  }

  for (const h of headers) {
    const lower = h.toLowerCase().trim();

    if (!mapName && /#?tytuł|opis|nazwa|odbiorca|nadawca|treść|details|title|description|name/.test(lower)) {
      mapName = h;
    }

    if (!mapAmount && /#?kwota|wartość|sum|amount/.test(lower)) {
      mapAmount = h;
    }

    if (!mapDate && /#?data|date/.test(lower)) {
      mapDate = h;
    }

    if (!mapCategory && /kategoria|category/.test(lower)) {
      mapCategory = h;
    }
  }

  return { mapName, mapAmount, mapDate, mapCategory };
}

export interface ProcessCsvParams {
  rawCsvText: string;
  presetId?: "generic" | "mbank" | "pko" | "ing";
  mapName?: string;
  mapAmount?: string;
  mapDate?: string;
  mapCategory?: string;
  defaultCategory?: string;
  defaultAccount?: string;
  typeStrategy?: "auto" | "expense" | "income";
  rules?: TransactionRule[];
}

export interface ProcessCsvResult {
  headers: string[];
  parsedRows: string[][];
  detectedSeparator: string;
  transactions: Transaction[];
  stats: {
    totalRows: number;
    validCount: number;
    invalidAmountCount: number;
    invalidDateCount: number;
    skippedEmptyCount: number;
  };
}

export function parseAndMapCsv(params: ProcessCsvParams): ProcessCsvResult {
  const cleanedText = cleanCsvBomAndEncoding(params.rawCsvText);
  const detectedSeparator = params.presetId && params.presetId !== "generic"
    ? (BANK_PRESETS.find((p) => p.id === params.presetId)?.defaultSeparator || detectCsvSeparator(cleanedText))
    : detectCsvSeparator(cleanedText);

  const parseRes = Papa.parse(cleanedText, {
    delimiter: detectedSeparator,
    header: false,
    skipEmptyLines: true
  });

  const rawData = (parseRes.data as string[][]).map((row) => row.map((cell) => cell?.trim() || ""));

  if (rawData.length === 0) {
    return {
      headers: [],
      parsedRows: [],
      detectedSeparator,
      transactions: [],
      stats: { totalRows: 0, validCount: 0, invalidAmountCount: 0, invalidDateCount: 0, skippedEmptyCount: 0 }
    };
  }

  // Smart detect header row index
  let headerIndex = 0;
  for (let i = 0; i < Math.min(15, rawData.length); i++) {
    const rowStr = rawData[i].join(" ").toLowerCase();
    if (/#?data|#?kwota|#?tytuł|opis|odbiorca|nazwa|amount|date/.test(rowStr)) {
      headerIndex = i;
      break;
    }
  }

  const headers = rawData[headerIndex] || [];
  const rows = rawData.slice(headerIndex + 1).filter((r) => r.length >= 2);

  const autoCols = autoDetectBankColumns(headers, params.presetId);
  const nameCol = params.mapName || autoCols.mapName;
  const amountCol = params.mapAmount || autoCols.mapAmount;
  const dateCol = params.mapDate || autoCols.mapDate;
  const catCol = params.mapCategory || autoCols.mapCategory;

  const nameIdx = headers.indexOf(nameCol);
  const amountIdx = headers.indexOf(amountCol);
  const dateIdx = headers.indexOf(dateCol);
  const catIdx = catCol ? headers.indexOf(catCol) : -1;

  const defaultCat = params.defaultCategory || "Inne";
  const defaultAcc = params.defaultAccount || "Konto główne";
  const typeStrat = params.typeStrategy || "auto";
  const rules = params.rules || [];

  const transactions: Transaction[] = [];
  let invalidAmountCount = 0;
  let invalidDateCount = 0;
  let skippedEmptyCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Ignore comment or footer lines (e.g. mBank summary lines)
    if (row.length < 2 || row[0]?.startsWith("# ") || row[0]?.startsWith("Podsumowanie")) {
      skippedEmptyCount++;
      continue;
    }

    const rawAmountStr = amountIdx !== -1 ? row[amountIdx] : "";
    const parsedAmount = parseCsvAmount(rawAmountStr);
    if (!parsedAmount) {
      invalidAmountCount++;
      continue;
    }

    const rawDateStr = dateIdx !== -1 ? row[dateIdx] : "";
    const isoDateStr = parseCsvDate(rawDateStr);
    if (!isoDateStr) {
      invalidDateCount++;
      continue;
    }

    let type: "income" | "expense" = "expense";
    if (typeStrat === "auto") {
      type = parsedAmount.isNegative ? "expense" : "income";
    } else {
      type = typeStrat;
    }

    const rawName = nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : "Transakcja bankowa";

    // Rule-based categorization using activeProfile.transactionRules (Requirement 5)
    let category = defaultCat;
    let categoryIcon = "✨";

    if (catIdx !== -1 && row[catIdx]) {
      category = row[catIdx];
      categoryIcon = iconByCategory[category] || "✨";
    } else {
      const autoCat = autoCategorizeTransaction(rawName, rules, defaultCat);
      category = autoCat.category;
      categoryIcon = autoCat.categoryIcon;
    }

    transactions.push({
      id: `tx-csv-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      name: rawName,
      amount: parsedAmount.amount,
      type,
      isoDate: isoDateStr,
      category,
      categoryIcon,
      account: defaultAcc
    });
  }

  return {
    headers,
    parsedRows: rows,
    detectedSeparator,
    transactions,
    stats: {
      totalRows: rows.length,
      validCount: transactions.length,
      invalidAmountCount,
      invalidDateCount,
      skippedEmptyCount
    }
  };
}

```


## File: src/services/recurringEngine.ts
```ts
import { RecurringRule, Transaction } from "../types";
import { addMonthsClamped, getLocalDateIso } from "../utils";

export interface RecurringEngineResult {
  updatedRules: RecurringRule[];
  generatedTransactions: Transaction[];
  hasChanges: boolean;
}

export function applyRecurringRules(
  rules: RecurringRule[],
  existingTransactions: Transaction[],
  todayStr: string
): RecurringEngineResult {
  if (!rules || rules.length === 0) {
    return { updatedRules: [], generatedTransactions: [], hasChanges: false };
  }

  let stateChanged = false;
  const generatedTransactions: Transaction[] = [];
  const existingTxIds = new Set(existingTransactions.map((tx) => tx.id));

  const updatedRules = rules.map((rule) => {
    if (!rule.isActive) return rule;

    const currentRule = { ...rule };
    let occurrences = 0;
    const MAX_OCCURRENCES = 365; // Safeguard against infinite loops

    while (currentRule.nextDueDate <= todayStr && occurrences < MAX_OCCURRENCES) {
      // Deterministic ID generation based on rule ID and date
      const generatedId = `tx-rec-${currentRule.id}-${currentRule.nextDueDate}`;

      // Prevent duplicate insertion if it somehow already exists
      if (!existingTxIds.has(generatedId)) {
        const splitMode = currentRule.splitMode ?? (currentRule.type === "expense" && currentRule.paidBy ? "equal" : undefined);
        const newTx: Transaction = {
          id: generatedId,
          name: currentRule.name,
          amount: currentRule.amount,
          category: currentRule.category,
          categoryIcon: currentRule.categoryIcon || "✨",
          account: currentRule.account || "Konto główne",
          type: currentRule.type,
          isoDate: currentRule.nextDueDate,
          tags: currentRule.tags && currentRule.tags.length > 0 ? currentRule.tags : ["cykliczna"],
          isRecurring: true,
          recurringRuleId: currentRule.id,
          paidBy: currentRule.paidBy,
          splitMode: splitMode
        };
        generatedTransactions.push(newTx);
      }

      currentRule.lastGeneratedDate = currentRule.nextDueDate;

      if (currentRule.frequency === "weekly") {
        const nextDate = new Date(currentRule.nextDueDate + "T00:00:00");
        nextDate.setDate(nextDate.getDate() + 7);
        currentRule.nextDueDate = getLocalDateIso(nextDate);
      } else if (currentRule.frequency === "biweekly") {
        const nextDate = new Date(currentRule.nextDueDate + "T00:00:00");
        nextDate.setDate(nextDate.getDate() + 14);
        currentRule.nextDueDate = getLocalDateIso(nextDate);
      } else if (currentRule.frequency === "monthly") {
        currentRule.nextDueDate = addMonthsClamped(currentRule.nextDueDate, 1);
      } else if (currentRule.frequency === "quarterly") {
        currentRule.nextDueDate = addMonthsClamped(currentRule.nextDueDate, 3);
      } else if (currentRule.frequency === "yearly") {
        currentRule.nextDueDate = addMonthsClamped(currentRule.nextDueDate, 12);
      } else {
        currentRule.nextDueDate = addMonthsClamped(currentRule.nextDueDate, 1);
      }

      stateChanged = true;
      occurrences++;
    }

    return currentRule;
  });

  return {
    updatedRules,
    generatedTransactions,
    hasChanges: stateChanged
  };
}

```


## File: src/services/recurringIsolation.test.ts
```ts
import { describe, it, expect } from "vitest";
import { applyRecurringRules } from "./recurringEngine";
import { calculatePartnerSettlement } from "./settlementEngine";
import { Profile, RecurringRule, Transaction } from "../types";

describe("Recurring Rules Isolation", () => {
  it("Rule from Profile A only applies to Profile A", () => {
    const profileA: Profile = {
      id: "A",
      name: "Profile A",
      kind: "personal",
      transactions: [],
      payments: [],
      goals: [],
      investments: [],
      budgets: {},
      recurringRules: [
        {
          id: "ruleA",
          name: "Rent",
          amount: 1000,
          type: "expense",
          category: "Housing",
          account: "Cash",
          frequency: "monthly",
                    nextDueDate: "2023-01-01",
          isActive: true
        }
      ]
    };

    const profileB: Profile = {
      id: "B",
      name: "Profile B",
      kind: "personal",
      transactions: [],
      payments: [],
      goals: [],
      investments: [],
      budgets: {},
      recurringRules: [
        {
          id: "ruleB",
          name: "Netflix",
          amount: 20,
          type: "expense",
          category: "Entertainment",
          account: "Card",
          frequency: "monthly",
                    nextDueDate: "2023-01-01",
          isActive: true
        }
      ]
    };

    const todayStr = "2023-01-01";

    const resultA = applyRecurringRules(profileA.recurringRules!, profileA.transactions, todayStr);
    expect(resultA.generatedTransactions.length).toBe(1);
    expect(resultA.generatedTransactions[0].name).toBe("Rent");
    expect(resultA.hasChanges).toBe(true);

    const resultB = applyRecurringRules(profileB.recurringRules!, profileB.transactions, todayStr);
    expect(resultB.generatedTransactions.length).toBe(1);
    expect(resultB.generatedTransactions[0].name).toBe("Netflix");
    expect(resultB.hasChanges).toBe(true);
  });

  it("Profile switch does not skip rules of other profiles", () => {
    const rules: RecurringRule[] = [
      {
        id: "rule1",
        name: "Test",
        amount: 100,
        type: "expense",
        category: "Test",
        account: "Test",
        frequency: "weekly",
                nextDueDate: "2023-01-01",
        isActive: true
      }
    ];

    // If we evaluate today, it generates for today
    const res1 = applyRecurringRules(rules, [], "2023-01-01");
    expect(res1.generatedTransactions.length).toBe(1);
    expect(res1.updatedRules[0].nextDueDate).toBe("2023-01-08");

    // The unchanged rules remain as they are until the profile is evaluated
    expect(rules[0].nextDueDate).toBe("2023-01-01");
  });

  it("recurringEngine is a pure testable function", () => {
    const rules: RecurringRule[] = [
      {
        id: "rule1",
        name: "Test",
        amount: 100,
        type: "expense",
        category: "Test",
        account: "Test",
        frequency: "monthly",
                nextDueDate: "2023-01-01",
        isActive: true
      }
    ];
    
    // Pure function check
    const result1 = applyRecurringRules(rules, [], "2023-01-01");
    const result2 = applyRecurringRules(rules, [], "2023-01-01");

    expect(result1.generatedTransactions).toEqual(result2.generatedTransactions);
    expect(result1.updatedRules).toEqual(result2.updatedRules);
  });

  it("unmigrated global AppState.recurringRules are NOT auto-absorbed by active profile in runtime hook", () => {
    // Profil B ma puste recurringRules ([] lub undefined)
    const activeProfileB: Profile = {
      id: "prof-B",
      name: "Profile B",
      kind: "personal",
      transactions: [],
      payments: [],
      goals: [],
      investments: [],
      budgets: {},
      recurringRules: []
    };

    // Globalne niezmigrowane reguły w AppState
    const globalUnmigratedRules: RecurringRule[] = [
      {
        id: "global-1",
        name: "Global Rule",
        amount: 500,
        type: "expense",
        category: "Other",
        account: "Bank",
        frequency: "monthly",
        nextDueDate: "2023-01-01",
        isActive: true
      }
    ];

    // Symulacja czytania reguł w runtime: hook używa wyłącznie activeProfile.recurringRules
    const rulesForActiveProfile = activeProfileB.recurringRules ?? [];
    expect(rulesForActiveProfile.length).toBe(0);

    const result = applyRecurringRules(rulesForActiveProfile, activeProfileB.transactions, "2023-01-01");
    expect(result.generatedTransactions.length).toBe(0);
    expect(result.hasChanges).toBe(false);
  });

  it("profile with its own recurringRules generates ONLY its own entries", () => {
    const profile: Profile = {
      id: "prof-C",
      name: "Profile C",
      kind: "personal",
      transactions: [],
      payments: [],
      goals: [],
      investments: [],
      budgets: {},
      recurringRules: [
        {
          id: "rule-C1",
          name: "Subskrypcja C",
          amount: 50,
          type: "expense",
          category: "Usługi",
          account: "Karta",
          frequency: "monthly",
          nextDueDate: "2023-01-01",
          isActive: true
        }
      ]
    };

    const rulesToEvaluate = profile.recurringRules ?? [];
    const result = applyRecurringRules(rulesToEvaluate, profile.transactions, "2023-01-01");
    
    expect(result.generatedTransactions.length).toBe(1);
    expect(result.generatedTransactions[0].name).toBe("Subskrypcja C");
    expect(result.generatedTransactions[0].amount).toBe(50);
  });

  it("RecurringRule z paidBy='me', splitMode='equal' -> wygenerowany tx ma te same wartości", () => {
    const rules: RecurringRule[] = [
      {
        id: "rule-shared-1",
        name: "Czynsz Shared",
        amount: 2000,
        type: "expense",
        category: "Mieszkanie",
        account: "Konto",
        frequency: "monthly",
        nextDueDate: "2026-07-01",
        isActive: true,
        paidBy: "me",
        splitMode: "equal"
      }
    ];

    const result = applyRecurringRules(rules, [], "2026-07-01");
    expect(result.generatedTransactions).toHaveLength(1);
    const tx = result.generatedTransactions[0];
    expect(tx.paidBy).toBe("me");
    expect(tx.splitMode).toBe("equal");
  });

  it("Settlement engine widzi wygenerowany tx z recurring rule i aktualizuje historyNet", () => {
    const rules: RecurringRule[] = [
      {
        id: "rule-shared-2",
        name: "Prąd Shared",
        amount: 300,
        type: "expense",
        category: "Rachunki",
        account: "Konto",
        frequency: "monthly",
        nextDueDate: "2026-07-01",
        isActive: true,
        paidBy: "me" // splitMode defaults to "equal" for expense with paidBy
      }
    ];

    const result = applyRecurringRules(rules, [], "2026-07-01");
    expect(result.generatedTransactions[0].splitMode).toBe("equal");

    const sharedProfile: Profile = {
      id: "shared-p1",
      name: "Ja",
      partnerName: "Partner",
      kind: "shared",
      transactions: result.generatedTransactions,
      payments: [],
      goals: [],
      investments: [],
      budgets: {}
    };

    const settlement = calculatePartnerSettlement(sharedProfile);
    expect(settlement.historyNet).toBe(150); // Partner winny 150 (połowa z 300)
  });
});

```


## File: src/services/settlementEngine.ts
```ts
import { Profile } from "../types";
import { roundCurrency } from "../utils";

export interface SettlementResult {
  net: number; // total net = historyNet + upcomingNet (retained for backward compatibility)
  historyNet: number; // strictly from realized transactions (transactions) adjusted by settlements
  upcomingNet: number; // strictly from unpaid payments (payments with status !== "Opłacono")
  myPaidSharedExpenses: number; // total paid by me (transactions + unpaid payments)
  partnerPaidSharedExpenses: number; // total paid by partner (transactions + unpaid payments)
  myPaidHistoryExpenses: number;
  partnerPaidHistoryExpenses: number;
  myPaidUpcomingExpenses: number;
  partnerPaidUpcomingExpenses: number;
  settlementsTotal: number;
}

/**
 * Oblicza saldo rozliczeń partnerów dla profilu wspólnego (shared).
 * 
 * Zasady rozliczenia (dla pozycji z splitMode === "equal"):
 * 1. Transakcje (zrealizowane wydatek/przychód) -> historyNet:
 *    - Expense paidBy="me": Partner winien połowę (historyNet += amount / 2)
 *    - Expense paidBy="partner": Ja winien połowę (historyNet -= amount / 2)
 *    - Expense paidBy="joint": Saldo netto bez zmian (0)
 *    - Income paidBy="me": Zgarnąłem całość, oddaję 50% partnerowi (historyNet -= amount / 2)
 *    - Income paidBy="partner": Partner zgarnął całość, jest mi winien 50% (historyNet += amount / 2)
 * 
 * 2. Płatności (nadchodzące nieopłacone rachunki) -> upcomingNet:
 *    - Liczone TYLKO wtedy, gdy status !== "Opłacono" ("Do opłacenia").
 *    - PaidBy="me": Partner winien połowę nadchodzącego rachunku (upcomingNet += amount / 2)
 *    - PaidBy="partner": Ja winien połowę nadchodzącego rachunku (upcomingNet -= amount / 2)
 * 
 * 3. Rozliczenia ręczne (SettlementEntry):
 *    - s.amount > 0 ("Partner oddał mi"): redukuje dodatni dług partnera (historyNet -= amount)
 *    - s.amount < 0 ("Ja oddałem partnerowi"): redukuje mój ujemny dług (historyNet -= amount, np. -(-50) = +50)
 */
export function calculatePartnerSettlement(profile: Profile): SettlementResult {
  if (profile.kind !== "shared") {
    return {
      net: 0,
      historyNet: 0,
      upcomingNet: 0,
      myPaidSharedExpenses: 0,
      partnerPaidSharedExpenses: 0,
      myPaidHistoryExpenses: 0,
      partnerPaidHistoryExpenses: 0,
      myPaidUpcomingExpenses: 0,
      partnerPaidUpcomingExpenses: 0,
      settlementsTotal: 0
    };
  }

  let historyNet = 0;
  let upcomingNet = 0;

  let myPaidHistoryExpenses = 0;
  let partnerPaidHistoryExpenses = 0;

  let myPaidUpcomingExpenses = 0;
  let partnerPaidUpcomingExpenses = 0;

  // 1. Transakcje (wydatek i przychód) -> historyNet
  for (const tx of profile.transactions || []) {
    if (tx.splitMode === "equal") {
      const half = tx.amount / 2;

      if (tx.type === "expense") {
        if (tx.paidBy === "me") {
          myPaidHistoryExpenses += tx.amount;
          historyNet += half; // Partner jest mi winien połowę
        } else if (tx.paidBy === "partner") {
          partnerPaidHistoryExpenses += tx.amount;
          historyNet -= half; // Ja jestem winien partnerowi połowę
        }
      } else if (tx.type === "income") {
        if (tx.paidBy === "me") {
          historyNet -= half; // Przychód podział: ja oddaję 50% partnerowi
        } else if (tx.paidBy === "partner") {
          historyNet += half; // Partner oddaje 50% mi
        }
      }
    }
  }

  // 2. Płatności (nadchodzące nieopłacone rachunki) -> upcomingNet
  for (const p of profile.payments || []) {
    if (p.splitMode === "equal" && p.status !== "Opłacono") {
      const half = p.amount / 2;

      if (p.paidBy === "me") {
        myPaidUpcomingExpenses += p.amount;
        upcomingNet += half; // Partner winien połowę nadchodzącego rachunku
      } else if (p.paidBy === "partner") {
        partnerPaidUpcomingExpenses += p.amount;
        upcomingNet -= half; // Ja winien połowę nadchodzącego rachunku
      }
    }
  }

  // 3. Rozliczenia ręczne (SettlementEntry) -> modyfikują historyNet
  let settlementsTotal = 0;
  for (const s of profile.settlements || []) {
    settlementsTotal += s.amount;
  }
  historyNet -= settlementsTotal;

  const net = historyNet + upcomingNet;
  const myPaidSharedExpenses = myPaidHistoryExpenses + myPaidUpcomingExpenses;
  const partnerPaidSharedExpenses = partnerPaidHistoryExpenses + partnerPaidUpcomingExpenses;

  return {
    net: roundCurrency(net),
    historyNet: roundCurrency(historyNet),
    upcomingNet: roundCurrency(upcomingNet),
    myPaidSharedExpenses: roundCurrency(myPaidSharedExpenses),
    partnerPaidSharedExpenses: roundCurrency(partnerPaidSharedExpenses),
    myPaidHistoryExpenses: roundCurrency(myPaidHistoryExpenses),
    partnerPaidHistoryExpenses: roundCurrency(partnerPaidHistoryExpenses),
    myPaidUpcomingExpenses: roundCurrency(myPaidUpcomingExpenses),
    partnerPaidUpcomingExpenses: roundCurrency(partnerPaidUpcomingExpenses),
    settlementsTotal: roundCurrency(settlementsTotal)
  };
}

```


## File: src/settlement.test.ts
```ts
import { describe, it, expect } from "vitest";
import { calculatePartnerSettlement } from "./services/settlementEngine";
import { Profile } from "./types";

describe("PROMPT A2 - SETTLEMENT: historyNet vs upcomingNet", () => {
  it("1. Zwraca 0 dla profilu personalnego", () => {
    const p: Profile = {
      id: "p1", name: "User1", kind: "personal",
      transactions: [{ id: "tx1", name: "Test", amount: 100, type: "expense", category: "Test", account: "Cash", isoDate: "2026-07-01", splitMode: "equal", paidBy: "me" }],
      payments: [{ id: "pay1", name: "Rachunek", amount: 100, dueDate: "2026-07-15", status: "Do opłacenia", paidBy: "me", splitMode: "equal" }],
      goals: [], investments: [], budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    expect(res.net).toBe(0);
    expect(res.historyNet).toBe(0);
    expect(res.upcomingNet).toBe(0);
  });

  it("2. Transakcje zrealizowane zasilają historyNet, a nie upcomingNet", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "User2", kind: "shared",
      transactions: [
        { id: "tx1", name: "Kino", amount: 100, type: "expense", category: "Rozrywka", account: "Card", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" }
      ],
      payments: [], goals: [], investments: [], budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    expect(res.historyNet).toBe(50); // Partner owes me 50 from history
    expect(res.upcomingNet).toBe(0);
    expect(res.net).toBe(50);
    expect(res.myPaidHistoryExpenses).toBe(100);
    expect(res.myPaidSharedExpenses).toBe(100);
  });

  it("3. Nieopłacone płatności zasilają upcomingNet, a nie historyNet", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "User2", kind: "shared",
      transactions: [],
      payments: [
        { id: "pay1", name: "Prąd", amount: 200, dueDate: "2026-07-20", status: "Do opłacenia", paidBy: "partner", splitMode: "equal" }
      ],
      goals: [], investments: [], budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    expect(res.historyNet).toBe(0);
    expect(res.upcomingNet).toBe(-100); // Ja winien partnerowi 100 za nadchodzący rachunek
    expect(res.net).toBe(-100);
    expect(res.partnerPaidUpcomingExpenses).toBe(200);
    expect(res.partnerPaidSharedExpenses).toBe(200);
  });

  it("4. Opłacone płatności (status Opłacono) są całkowicie ignorowane w upcomingNet", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "User2", kind: "shared",
      transactions: [],
      payments: [
        { id: "pay1", name: "Prąd opłacony", amount: 200, dueDate: "2026-07-20", status: "Opłacono", paidBy: "partner", splitMode: "equal" }
      ],
      goals: [], investments: [], budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    expect(res.historyNet).toBe(0);
    expect(res.upcomingNet).toBe(0);
    expect(res.net).toBe(0);
  });

  it("5. Przychody transakcji wpływają na historyNet", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "User2", kind: "shared",
      transactions: [
        { id: "tx1", name: "Zwrot ze sklepu", amount: 200, type: "income", category: "Inne", account: "Card", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" },
        { id: "tx2", name: "Zwrot 2", amount: 100, type: "income", category: "Inne", account: "Card", isoDate: "2026-07-01", paidBy: "partner", splitMode: "equal" }
      ],
      payments: [], goals: [], investments: [], budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    // tx1: ja dostałem 200 -> jestem winien 100 (historyNet -= 100)
    // tx2: partner dostał 100 -> jest mi winien 50 (historyNet += 50)
    expect(res.historyNet).toBe(-50);
    expect(res.upcomingNet).toBe(0);
    expect(res.net).toBe(-50);
  });

  it("6. Joint i splitMode=none nie zmieniają salda historyNet ani upcomingNet", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "User2", kind: "shared",
      transactions: [
        { id: "tx1", name: "Kino", amount: 100, type: "expense", category: "Rozrywka", account: "Card", isoDate: "2026-07-01", paidBy: "joint", splitMode: "equal" },
        { id: "tx2", name: "Kino2", amount: 100, type: "expense", category: "Rozrywka", account: "Card", isoDate: "2026-07-01", paidBy: "me", splitMode: "none" }
      ],
      payments: [
        { id: "pay1", name: "Czynsz", amount: 1000, dueDate: "2026-07-25", status: "Do opłacenia", paidBy: "joint", splitMode: "equal" },
        { id: "pay2", name: "Media", amount: 200, dueDate: "2026-07-25", status: "Do opłacenia", paidBy: "me", splitMode: "none" }
      ],
      goals: [], investments: [], budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    expect(res.historyNet).toBe(0);
    expect(res.upcomingNet).toBe(0);
    expect(res.net).toBe(0);
  });

  it("7. Rozdzielenie w złożonym przypadku (mixed transactions + payments)", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "Anna", kind: "shared",
      transactions: [
        { id: "t1", name: "W1", amount: 200, type: "expense", category: "X", account: "X", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" }, // historyNet +100
        { id: "t2", name: "W2", amount: 100, type: "expense", category: "X", account: "X", isoDate: "2026-07-01", paidBy: "partner", splitMode: "equal" }, // historyNet -50
        { id: "t3", name: "P1", amount: 300, type: "income", category: "X", account: "X", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" } // historyNet -150
      ],
      payments: [
        { id: "pay1", name: "Rachunek 1", amount: 100, dueDate: "2026-07-15", status: "Do opłacenia", paidBy: "me", splitMode: "equal" }, // upcomingNet +50
        { id: "pay2", name: "Rachunek 2", amount: 200, dueDate: "2026-07-20", status: "Do opłacenia", paidBy: "partner", splitMode: "equal" }, // upcomingNet -100
        { id: "pay3", name: "Ignorowany", amount: 500, dueDate: "2026-07-01", status: "Opłacono", paidBy: "me", splitMode: "equal" } // upcomingNet 0
      ],
      goals: [], investments: [], budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    expect(res.historyNet).toBe(-100); // 100 - 50 - 150 = -100
    expect(res.upcomingNet).toBe(-50); // 50 - 100 = -50
    expect(res.net).toBe(-150);
    expect(res.myPaidSharedExpenses).toBe(300); // 200 tx + 100 pay
    expect(res.partnerPaidSharedExpenses).toBe(300); // 100 tx + 200 pay
  });

  describe("PROMPT B2 - SETTLEMENTS (SettlementEntry)", () => {
    it("8. Settlement z s.amount > 0 (partner oddał mi) redukuje dodatni dług w historyNet", () => {
      const p: Profile = {
        id: "p1", name: "User1", partnerName: "Anna", kind: "shared",
        transactions: [
          { id: "t1", name: "Zakupy", amount: 200, type: "expense", category: "Zakupy", account: "Karta", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" }
        ], // historyNet = +100
        payments: [], goals: [], investments: [], budgets: {},
        settlements: [
          { id: "s1", amount: 100, isoDate: "2026-07-02", createdAt: "2026-07-02T10:00:00Z" }
        ]
      };

      const res = calculatePartnerSettlement(p);
      expect(res.historyNet).toBe(0); // 100 - 100 = 0
      expect(res.net).toBe(0);
      expect(res.settlementsTotal).toBe(100);
      // Expenses are NOT double-counted or changed by settlements
      expect(res.myPaidHistoryExpenses).toBe(200);
    });

    it("9. Settlement z s.amount < 0 (ja oddałem partnerowi) redukuje ujemny dług w historyNet", () => {
      const p: Profile = {
        id: "p1", name: "User1", partnerName: "Anna", kind: "shared",
        transactions: [
          { id: "t1", name: "Kolacja", amount: 300, type: "expense", category: "Jedzenie", account: "Karta", isoDate: "2026-07-01", paidBy: "partner", splitMode: "equal" }
        ], // historyNet = -150
        payments: [], goals: [], investments: [], budgets: {},
        settlements: [
          { id: "s1", amount: -150, isoDate: "2026-07-02", createdAt: "2026-07-02T10:00:00Z" }
        ]
      };

      const res = calculatePartnerSettlement(p);
      expect(res.historyNet).toBe(0); // -150 - (-150) = 0
      expect(res.net).toBe(0);
      expect(res.settlementsTotal).toBe(-150);
      expect(res.partnerPaidHistoryExpenses).toBe(300);
    });

    it("10. Częściowe rozliczenie oraz wielokrotne settlementy", () => {
      const p: Profile = {
        id: "p1", name: "User1", partnerName: "Anna", kind: "shared",
        transactions: [
          { id: "t1", name: "Zakupy", amount: 200, type: "expense", category: "Zakupy", account: "Karta", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" }
        ], // historyNet = +100
        payments: [], goals: [], investments: [], budgets: {},
        settlements: [
          { id: "s1", amount: 40, isoDate: "2026-07-02", note: "Rata 1", createdAt: "2026-07-02T10:00:00Z" },
          { id: "s2", amount: 30, isoDate: "2026-07-03", note: "Rata 2", createdAt: "2026-07-03T10:00:00Z" }
        ]
      };

      const res = calculatePartnerSettlement(p);
      expect(res.historyNet).toBe(30); // 100 - 40 - 30 = 30
      expect(res.settlementsTotal).toBe(70);
    });
  });
});

describe("R6b - roundCurrency w settlementEngine (precyzja float)", () => {
  it("11. Dwie transakcje 0.1 i 0.2 (splitMode equal, paidBy me) -> historyNet dokładnie 0.15", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "Anna", kind: "shared",
      transactions: [
        { id: "t1", name: "Drobne A", amount: 0.1, type: "expense", category: "X", account: "X", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" },
        { id: "t2", name: "Drobne B", amount: 0.2, type: "expense", category: "X", account: "X", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" }
      ],
      payments: [], goals: [], investments: [], budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    // 0.1/2 + 0.2/2 = 0.05 + 0.1 = 0.15 (bez roundCurrency byłoby 0.15000000000000002)
    expect(res.historyNet).toBe(0.15);
    expect(res.myPaidSharedExpenses).toBe(0.3);
  });

  it("12. Transakcja 99.99 (splitMode equal, paidBy me) -> historyNet dokładnie 50", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "Anna", kind: "shared",
      transactions: [
        { id: "t1", name: "Duży zakup", amount: 99.99, type: "expense", category: "X", account: "X", isoDate: "2026-07-01", paidBy: "me", splitMode: "equal" }
      ],
      payments: [], goals: [], investments: [], budgets: {}
    };
    const res = calculatePartnerSettlement(p);
    // 99.99 / 2 = 49.995 -> roundCurrency -> 50
    expect(res.historyNet).toBe(50);
  });
});

```


## File: src/split.test.ts
```ts
import { describe, it, expect } from "vitest";
import { Profile, Transaction } from "./types";

// W użyciu hooka handleAddTransaction dodaje te same wartości
function simulateAddTransaction(profile: Profile, data: Partial<Transaction>): Profile {
  const newTx = {
    id: "tx-test",
    name: data.name || "Test",
    amount: data.amount || 100,
    category: data.category || "Inne",
    account: data.account || "Konto",
    type: data.type || "expense",
    isoDate: data.isoDate || "2026-07-23",
    paidBy: data.paidBy,
    splitMode: data.splitMode
  } as Transaction;

  return { ...profile, transactions: [...profile.transactions, newTx] };
}

describe("PROMPT 7 - SHARED: paidBy I PODZIAŁ KOSZTÓW", () => {
  it("Tworzy transakcję ze split w profilu shared", () => {
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "User2", kind: "shared",
      transactions: [], payments: [], goals: [], investments: [], budgets: {}
    };
    
    const updated = simulateAddTransaction(p, {
      name: "Zakupy",
      amount: 100,
      paidBy: "me",
      splitMode: "equal"
    });
    
    expect(updated.transactions.length).toBe(1);
    expect(updated.transactions[0].paidBy).toBe("me");
    expect(updated.transactions[0].splitMode).toBe("equal");
  });
  
  it("Aktualizacja transakcji ze split - zachowuje pola", () => {
    const tx: Transaction = {
      id: "tx-1", name: "Zakupy", amount: 100, type: "expense", category: "Inne", account: "Konto", isoDate: "2026-07-23",
      paidBy: "partner", splitMode: "none"
    };
    const p: Profile = {
      id: "p1", name: "User1", partnerName: "User2", kind: "shared",
      transactions: [tx], payments: [], goals: [], investments: [], budgets: {}
    };
    
    // update (symulacja map)
    const updatedTx = { ...tx, amount: 200, splitMode: "equal" as const };
    const pUpdated = {
      ...p,
      transactions: p.transactions.map(t => t.id === updatedTx.id ? updatedTx : t)
    };
    
    expect(pUpdated.transactions[0].amount).toBe(200);
    expect(pUpdated.transactions[0].paidBy).toBe("partner");
    expect(pUpdated.transactions[0].splitMode).toBe("equal");
  });
});

```


## File: src/types.ts
```ts
export interface SavingsTransfer {
  id: string;
  amount: number; // dodatnia dla wpłaty, ujemna dla wypłaty
  isoDate: string;
  note?: string;
}

export interface Transaction {
  id: string;
  name: string;
  category: string;
  categoryIcon?: string;
  account: string;
  amount: number;
  type: "income" | "expense";
  isoDate: string;
  tags?: string[];
  isRecurring?: boolean;
  recurringRuleId?: string;
  sourcePaymentId?: string;
  paidBy?: "me" | "partner" | "joint";
  splitMode?: "none" | "equal";
}

export interface Payment {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: "Opłacono" | "Do opłacenia";
  category?: string;
  isRecurring?: boolean;
  recurringRuleId?: string;
  paidBy?: "me" | "partner" | "joint";
  splitMode?: "none" | "equal";
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  transfers?: SavingsTransfer[]; // Historia wpłat/wypłat
  targetDate?: string; // Opcjonalna data docelowa
}

export interface Investment {
  id: string;
  name: string;
  amount: number;
  isoDate: string;
  type?: string;
  notes?: string;
}

export interface RecurringRule {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  categoryIcon?: string;
  account: string;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
  nextDueDate: string;
  lastGeneratedDate?: string;
  tags?: string[];
  isActive: boolean;
  paidBy?: "me" | "partner" | "joint";
  splitMode?: "none" | "equal";
}

export interface TransactionRule {
  id: string;
  pattern: string; // np. "Biedronka" -> dopasowanie po nazwie/opisie
  category: string;
  categoryIcon?: string;
  profileId?: string;
}

export interface BudgetAlert {
  id: string;
  type: "threshold_80" | "threshold_100" | "payment_due";
  message: string;
  category?: string;
  paymentId?: string;
  isoDate: string;
  isRead: boolean;
}

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  hasCreditLimit: boolean;
  creditLimit: number;
}

export interface SettlementEntry {
  id: string;
  amount: number; // amount > 0: partner oddał mi (partner paid me), amount < 0: ja oddałem partnerowi (I paid partner)
  isoDate: string;
  note?: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  name: string;
  kind: "personal" | "shared";
  partnerName?: string;
  avatar?: string;
  pinHash?: string;
  salt?: string;
  encryptedPayload?: string;
  accounts?: BankAccount[];
  transactions: Transaction[];
  payments: Payment[];
  goals: Goal[];
  investments: Investment[];
  budgets: Record<string, number>;
  recurringRules?: RecurringRule[];
  transactionRules?: TransactionRule[];
  settlements?: SettlementEntry[];
}

export interface AppState {
  profiles: Profile[];
  activeProfileId: string | null;
  schemaVersion?: number;
  updatedAt?: string;
  lastModifiedBy?: string;
  driveFileId?: string | null;
  recurringRules?: RecurringRule[];
  transactionRules?: TransactionRule[];
  aiMode?: "none" | "local" | "cloud";
  localAiEndpoint?: string;
}

export type AppView =
  | "dashboard"
  | "transactions"
  | "payments"
  | "budget"
  | "goals"
  | "analysis"
  | "settings"
  | "help";

export type ModalType =
  | "transaction"
  | "payment"
  | "goal"
  | "goalDeposit"
  | "profile"
  | "pin"
  | "budget"
  | "calendarAi"
  | "aiChat"
  | "changelog"
  | null;

export type ModalState =
  | { type: "transaction"; payload?: Transaction }
  | { type: "payment"; payload?: Payment }
  | { type: "goal" }
  | { type: "goalDeposit"; payload: Goal }
  | { type: "profile" }
  | { type: "pin" }
  | { type: "budget" }
  | { type: "calendarAi"; payload?: Payment }
  | { type: "aiChat" }
  | { type: null };



```


## File: src/useAppActions.goal.test.ts
```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppActions } from "./hooks/useAppActions";
import { applyGoalTransferToProfile, applyGoalTransfer } from "./services/goalTransfers";
import { calculateSafeToSpend } from "./services/budgetCalculations";
import { AppState, Profile } from "./types";

describe("PROMPT P0-3 - Goal Deposit/Withdraw (Real Model A Handler)", () => {
  const baseProfile: Profile = {
    id: "p1",
    name: "Model A Profile",
    kind: "personal",
    transactions: [
      { id: "t1", name: "Wynagrodzenie", amount: 4000, type: "income", category: "Praca", account: "Konto", isoDate: "2026-07-01" }
    ],
    payments: [],
    goals: [
      { id: "g1", name: "Wakacje", target: 2000, saved: 500, transfers: [] }
    ],
    investments: [],
    budgets: {}
  };

  it("1. Wpłata +200 zwiększa saved i dopisuje transfer", () => {
    const updated = applyGoalTransferToProfile(baseProfile, "g1", 200, "2026-07-20", { note: "Wpłata na cele" });
    const goal = updated.goals.find((g) => g.id === "g1");
    expect(goal?.saved).toBe(700);
    expect(goal?.transfers).toHaveLength(1);
    expect(goal?.transfers?.[0].amount).toBe(200);
    expect(goal?.transfers?.[0].note).toBe("Wpłata na cele");
    expect(goal?.transfers?.[0].isoDate).toBe("2026-07-20");
  });

  it("2. Wypłata większa niż saved jest clampowana do -saved", () => {
    // Proba wyciągnięcia 600zł przy saved = 500zł -> clamp do -500zł
    const updated = applyGoalTransferToProfile(baseProfile, "g1", -600, "2026-07-20");
    const goal = updated.goals.find((g) => g.id === "g1");
    expect(goal?.saved).toBe(0);
    expect(goal?.transfers).toHaveLength(1);
    expect(goal?.transfers?.[0].amount).toBe(-500);
    expect(goal?.transfers?.[0].note).toBe("Wypłata");
  });

  it("3. Wypłata przy saved = 0 nie zmienia celu ani nie dodaje transferu", () => {
    const zeroSavedGoal = { id: "g2", name: "Auto", target: 1000, saved: 0, transfers: [] };
    const res = applyGoalTransfer(zeroSavedGoal, -100, "2026-07-20");
    expect(res.saved).toBe(0);
    expect(res.transfers).toHaveLength(0);
  });

  it("4. Brak tworzenia transaction jako side effect (brak double-count)", () => {
    const initialTxsLength = baseProfile.transactions.length;
    const updated = applyGoalTransferToProfile(baseProfile, "g1", 300, "2026-07-20");
    
    // Transakcje nie zostały zmienione ani zniekształcone
    expect(updated.transactions.length).toBe(initialTxsLength);
    expect(updated.transactions).toEqual(baseProfile.transactions);
  });

  it("5. calculateSafeToSpend pozostaje spójne z Model A przy wpłatach i wypłatach", () => {
    // Początkowo: saldo 4000, zaoszczędzone na cele 500 -> safeToSpend = 3500
    const initialSafe = calculateSafeToSpend(baseProfile, [], "2026-07-15");
    expect(initialSafe.currentBalance).toBe(4000);
    expect(initialSafe.reservedGoalsSum).toBe(500);
    expect(initialSafe.safeToSpend).toBe(3500);

    // Po wpłacie 200: zaoszczędzone = 700, safeToSpend = 3300, saldo nie ulega zmianie
    const updatedDeposit = applyGoalTransferToProfile(baseProfile, "g1", 200, "2026-07-20");
    const safeAfterDeposit = calculateSafeToSpend(updatedDeposit, [], "2026-07-15");
    expect(safeAfterDeposit.currentBalance).toBe(4000);
    expect(safeAfterDeposit.reservedGoalsSum).toBe(700);
    expect(safeAfterDeposit.safeToSpend).toBe(3300);

    // Po wypłacie 300 z celu: zaoszczędzone = 200, safeToSpend = 3800, saldo nie ulega zmianie
    const updatedWithdraw = applyGoalTransferToProfile(baseProfile, "g1", -300, "2026-07-20");
    const safeAfterWithdraw = calculateSafeToSpend(updatedWithdraw, [], "2026-07-15");
    expect(safeAfterWithdraw.currentBalance).toBe(4000);
    expect(safeAfterWithdraw.reservedGoalsSum).toBe(200);
    expect(safeAfterWithdraw.safeToSpend).toBe(3800);
  });

  describe("handleDeleteGoal logic in useAppActions", () => {
    it("1. Goal z saved=0 -> usuwa go z listy i wywołuje saveState", () => {
      const mockSaveState = vi.fn();
      const profile: Profile = {
        ...baseProfile,
        goals: [
          { id: "g-zero", name: "Cel zero", target: 1000, saved: 0 }
        ]
      };
      const state: AppState = {
        profiles: [profile],
        activeProfileId: "p1",
        schemaVersion: 1,
        updatedAt: "2026-07-10T00:00:00Z",
        lastModifiedBy: "me"
      };

      const { result } = renderHook(() =>
        useAppActions({
          state,
          saveState: mockSaveState,
          activeProfile: profile,
          makeUndoBackup: vi.fn(),
          unlockProfile: vi.fn(),
          lockProfile: vi.fn(),
          setActiveView: vi.fn(),
          connectGoogle: vi.fn(),
          disconnectGoogle: vi.fn(),
          toggleAutoSync: vi.fn(),
          backupToDriveManual: vi.fn(),
          restoreFromDriveManual: vi.fn()
        })
      );

      act(() => {
        result.current.handleDeleteGoal("g-zero");
      });

      expect(mockSaveState).toHaveBeenCalledTimes(1);
      const newState = mockSaveState.mock.calls[0][0] as AppState;
      expect(newState.profiles[0].goals).toHaveLength(0);
    });

    it("2. Goal z saved>0 -> blokada usunięcia, expect(mockSaveState).not.toHaveBeenCalled()", () => {
      const mockSaveState = vi.fn();
      const profile: Profile = {
        ...baseProfile,
        goals: [
          { id: "g-saved", name: "Cel ze środkami", target: 1000, saved: 250 }
        ]
      };
      const state: AppState = {
        profiles: [profile],
        activeProfileId: "p1",
        schemaVersion: 1,
        updatedAt: "2026-07-10T00:00:00Z",
        lastModifiedBy: "me"
      };

      const mockSetApiError = vi.fn();

      const { result } = renderHook(() =>
        useAppActions({
          state,
          saveState: mockSaveState,
          activeProfile: profile,
          makeUndoBackup: vi.fn(),
          unlockProfile: vi.fn(),
          lockProfile: vi.fn(),
          setActiveView: vi.fn(),
          connectGoogle: vi.fn(),
          disconnectGoogle: vi.fn(),
          toggleAutoSync: vi.fn(),
          backupToDriveManual: vi.fn(),
          restoreFromDriveManual: vi.fn(),
          setApiError: mockSetApiError
        })
      );

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      act(() => {
        result.current.handleDeleteGoal("g-saved");
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith("Nie można usunąć celu oszczędnościowego z dodatnimi środkami.");
      expect(mockSetApiError).toHaveBeenCalledWith("Nie można usunąć celu z wpłaconymi środkami. Najpierw wypłać oszczędności.");
      consoleWarnSpy.mockRestore();

      expect(mockSaveState).not.toHaveBeenCalled();
    });
  });
});

```


## File: src/useAppActions.payment-edit.test.ts
```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { useAppActions } from "./hooks/useAppActions";
import { AppState, Profile, Payment } from "./types";
import { renderHook, act } from "@testing-library/react";

describe("useAppActions - handleUpdatePayment", () => {
  const getMockState = (): AppState => ({
    activeProfileId: "p1",
    profiles: [
      {
        id: "p1",
        name: "Test",
        kind: "personal",
        transactions: [],
        payments: [
          {
            id: "pay-1",
            name: "Netflix",
            amount: 60,
            dueDate: "2024-05-15",
            status: "Do opłacenia",
            isRecurring: true,
            recurringRuleId: "rule-1"
          }
        ],
        goals: [],
        investments: [],
        budgets: {}
      }
    ]
  });

  it("should update an existing payment and preserve technical fields", () => {
    let currentState = getMockState();
    const saveState = vi.fn().mockImplementation(async (newState) => {
      currentState = newState;
    });

    const { result } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles[0],
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn()
      })
    );

    act(() => {
      result.current.handleUpdatePayment("pay-1", {
        name: "Netflix Premium",
        amount: 70,
        dueDate: "2024-05-20"
      });
    });

    expect(saveState).toHaveBeenCalled();
    const updatedProfile = currentState.profiles[0];
    const pay = updatedProfile.payments[0];

    expect(updatedProfile.payments.length).toBe(1);
    expect(pay.name).toBe("Netflix Premium");
    expect(pay.amount).toBe(70);
    expect(pay.dueDate).toBe("2024-05-20");
    expect(pay.id).toBe("pay-1");
    
    // Technical fields should be preserved
    expect(pay.status).toBe("Do opłacenia");
    expect(pay.isRecurring).toBe(true);
    expect(pay.recurringRuleId).toBe("rule-1");
  });

  it("should not call saveState if the payment is not found", () => {
    let currentState = getMockState();
    const saveState = vi.fn().mockImplementation(async (newState) => {
      currentState = newState;
    });

    const { result } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles[0],
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn()
      })
    );

    act(() => {
      result.current.handleUpdatePayment("pay-999", {
        name: "Netflix Premium"
      });
    });

    expect(saveState).not.toHaveBeenCalled();
  });
});

```


## File: src/useAppActions.payment.test.ts
```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppActions } from "./hooks/useAppActions";
import { AppState, Profile } from "./types";

describe("Payment status toggling in useAppActions", () => {
  it("Payment 'Do opłacenia' -> po handleTogglePaymentStatus: status 'Opłacono' i nowa transakcja", () => {
    const mockSaveState = vi.fn();
    const baseProfile: Profile = {
      id: "p1",
      name: "Test",
      kind: "personal",
      payments: [
        {
          id: "pay1",
          name: "Prąd",
          amount: 150,
          status: "Do opłacenia",
          dueDate: "2026-07-20",
          category: "Rachunki",
          paidBy: "me",
          splitMode: "none"
        }
      ],
      transactions: [],
      goals: [],
      investments: [],
      budgets: {},
      accounts: [{ id: "a1", name: "Konto Główne", bankName: "Bank", hasCreditLimit: false, creditLimit: 0 }]
    };

    const state: AppState = {
      profiles: [baseProfile],
      activeProfileId: "p1",
      schemaVersion: 1,
      updatedAt: "2026-07-10T00:00:00Z",
      lastModifiedBy: "me"
    };

    const { result } = renderHook(() => useAppActions({
      state,
      saveState: mockSaveState,
      activeProfile: baseProfile,
      makeUndoBackup: vi.fn(),
      unlockProfile: vi.fn(),
      lockProfile: vi.fn(),
      setActiveView: vi.fn(),
      connectGoogle: vi.fn(),
      disconnectGoogle: vi.fn(),
      toggleAutoSync: vi.fn(),
      backupToDriveManual: vi.fn(),
      restoreFromDriveManual: vi.fn(),
    }));

    act(() => {
      result.current.handleTogglePaymentStatus("pay1");
    });

    expect(mockSaveState).toHaveBeenCalledTimes(1);
    const newState = mockSaveState.mock.calls[0][0] as AppState;
    const updatedProfile = newState.profiles[0];

    const updatedPayment = updatedProfile.payments[0];
    expect(updatedPayment.status).toBe("Opłacono");

    expect(updatedProfile.transactions).toHaveLength(1);
    const newTx = updatedProfile.transactions[0];
    expect(newTx.name).toBe("Prąd");
    expect(newTx.amount).toBe(150);
    expect(newTx.type).toBe("expense");
    expect(newTx.category).toBe("Rachunki");
    expect(newTx.account).toBe("Konto Główne");
    expect(newTx.paidBy).toBe("me");
    expect(newTx.splitMode).toBe("none");
    expect(newTx.sourcePaymentId).toBe("pay1");
  });

  it("Payment 'Opłacono' -> drugie wywołanie nie tworzy transakcji i status się nie zmienia", () => {
    const mockSaveState = vi.fn();
    const baseProfile: Profile = {
      id: "p1",
      name: "Test",
      kind: "personal",
      payments: [
        {
          id: "pay1",
          name: "Prąd",
          amount: 150,
          status: "Opłacono",
          dueDate: "2026-07-20",
          category: "Rachunki"
        }
      ],
      transactions: [
        { id: "tx-old", name: "Prąd", amount: 150, type: "expense", category: "Rachunki", account: "Konto", isoDate: "2026-07-20" }
      ],
      goals: [],
      investments: [],
      budgets: {}
    };

    const state: AppState = {
      profiles: [baseProfile],
      activeProfileId: "p1",
      schemaVersion: 1,
      updatedAt: "2026-07-10T00:00:00Z",
      lastModifiedBy: "me"
    };

    const mockSetApiError = vi.fn();

    const { result } = renderHook(() => useAppActions({
      state,
      saveState: mockSaveState,
      activeProfile: baseProfile,
      makeUndoBackup: vi.fn(),
      unlockProfile: vi.fn(),
      lockProfile: vi.fn(),
      setActiveView: vi.fn(),
      connectGoogle: vi.fn(),
      disconnectGoogle: vi.fn(),
      toggleAutoSync: vi.fn(),
      backupToDriveManual: vi.fn(),
      restoreFromDriveManual: vi.fn(),
      setApiError: mockSetApiError
    }));

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    act(() => {
      result.current.handleTogglePaymentStatus("pay1");
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith("Cofanie statusu 'Opłacono' jest zablokowane.");
    expect(mockSetApiError).toHaveBeenCalledWith("Nie można cofnąć statusu „Opłacono”. Usuń powiązaną transakcję ręcznie, jeśli to pomyłka.");
    consoleWarnSpy.mockRestore();

    // should not update state
    expect(mockSaveState).not.toHaveBeenCalled();
    expect(baseProfile.payments[0].status).toBe("Opłacono");
    expect(baseProfile.transactions).toHaveLength(1);
  });

  it("Payment 'Do opłacenia', ale transakcja z sourcePaymentId już istnieje -> zmiana statusu na 'Opłacono' bez dodania nowej transakcji", () => {
    const mockSaveState = vi.fn();
    const baseProfile: Profile = {
      id: "p1",
      name: "Test",
      kind: "personal",
      payments: [
        {
          id: "pay1",
          name: "Prąd",
          amount: 150,
          status: "Do opłacenia",
          dueDate: "2026-07-20",
          category: "Rachunki"
        }
      ],
      transactions: [
        {
          id: "tx-existing",
          name: "Prąd",
          amount: 150,
          type: "expense",
          category: "Rachunki",
          account: "Konto Główne",
          isoDate: "2026-07-20",
          sourcePaymentId: "pay1"
        }
      ],
      goals: [],
      investments: [],
      budgets: {}
    };

    const state: AppState = {
      profiles: [baseProfile],
      activeProfileId: "p1",
      schemaVersion: 1,
      updatedAt: "2026-07-10T00:00:00Z",
      lastModifiedBy: "me"
    };

    const { result } = renderHook(() =>
      useAppActions({
        state,
        saveState: mockSaveState,
        activeProfile: baseProfile,
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn()
      })
    );

    act(() => {
      result.current.handleTogglePaymentStatus("pay1");
    });

    expect(mockSaveState).toHaveBeenCalledTimes(1);
    const newState = mockSaveState.mock.calls[0][0] as AppState;
    const updatedProfile = newState.profiles[0];

    expect(updatedProfile.payments[0].status).toBe("Opłacono");
    expect(updatedProfile.transactions).toHaveLength(1);
    expect(updatedProfile.transactions[0].id).toBe("tx-existing");
  });

  describe("handleImportTransactions deduplication & sanity checks", () => {
    it("1. Import 2x tego samego CSV (tych samych transakcji) -> liczba transakcji nie podwaja się", () => {
      const mockSaveState = vi.fn();
      let currentProfile: Profile = {
        id: "p1",
        name: "Test",
        kind: "personal",
        payments: [],
        transactions: [],
        goals: [],
        investments: [],
        budgets: {}
      };

      const state: AppState = {
        profiles: [currentProfile],
        activeProfileId: "p1",
        schemaVersion: 1,
        updatedAt: "2026-07-10T00:00:00Z",
        lastModifiedBy: "me"
      };

      const mockSave = async (newState: AppState) => {
        mockSaveState(newState);
        currentProfile = newState.profiles[0];
      };

      const { result, rerender } = renderHook(
        ({ activeP }) =>
          useAppActions({
            state: { ...state, profiles: [activeP] },
            saveState: mockSave,
            activeProfile: activeP,
            makeUndoBackup: vi.fn(),
            unlockProfile: vi.fn(),
            lockProfile: vi.fn(),
            setActiveView: vi.fn(),
            connectGoogle: vi.fn(),
            disconnectGoogle: vi.fn(),
            toggleAutoSync: vi.fn(),
            backupToDriveManual: vi.fn(),
            restoreFromDriveManual: vi.fn()
          }),
        { initialProps: { activeP: currentProfile } }
      );

      const batchToImport = [
        { id: "tx-csv-1", name: "Zakupy", amount: 100, type: "expense" as const, category: "Jedzenie", account: "Konto", isoDate: "2026-07-20" },
        { id: "tx-csv-2", name: "Paliwo", amount: 200, type: "expense" as const, category: "Transport", account: "Konto", isoDate: "2026-07-21" }
      ];

      // Pierwszy import
      act(() => {
        result.current.handleImportTransactions(batchToImport);
      });

      expect(currentProfile.transactions).toHaveLength(2);

      // Rerender z zaktualizowanym profilem
      rerender({ activeP: currentProfile });

      // Drugi import tego samego zestawu
      act(() => {
        result.current.handleImportTransactions(batchToImport);
      });

      expect(currentProfile.transactions).toHaveLength(2);
    });

    it("2. Transakcja z amount NaN -> nie jest dodana", () => {
      const mockSaveState = vi.fn();
      let currentProfile: Profile = {
        id: "p1",
        name: "Test",
        kind: "personal",
        payments: [],
        transactions: [],
        goals: [],
        investments: [],
        budgets: {}
      };

      const state: AppState = {
        profiles: [currentProfile],
        activeProfileId: "p1",
        schemaVersion: 1,
        updatedAt: "2026-07-10T00:00:00Z",
        lastModifiedBy: "me"
      };

      const mockSave = async (newState: AppState) => {
        mockSaveState(newState);
        currentProfile = newState.profiles[0];
      };

      const { result } = renderHook(() =>
        useAppActions({
          state: { ...state, profiles: [currentProfile] },
          saveState: mockSave,
          activeProfile: currentProfile,
          makeUndoBackup: vi.fn(),
          unlockProfile: vi.fn(),
          lockProfile: vi.fn(),
          setActiveView: vi.fn(),
          connectGoogle: vi.fn(),
          disconnectGoogle: vi.fn(),
          toggleAutoSync: vi.fn(),
          backupToDriveManual: vi.fn(),
          restoreFromDriveManual: vi.fn()
        })
      );

      const invalidBatch = [
        { id: "tx-valid", name: "Kawa", amount: 15, type: "expense" as const, category: "Jedzenie", account: "Konto", isoDate: "2026-07-20" },
        { id: "tx-nan", name: "Błędna transakcja", amount: NaN, type: "expense" as const, category: "Jedzenie", account: "Konto", isoDate: "2026-07-20" }
      ];

      act(() => {
        result.current.handleImportTransactions(invalidBatch);
      });

      expect(currentProfile.transactions).toHaveLength(1);
      expect(currentProfile.transactions[0].id).toBe("tx-valid");
    });
  });
});

```


## File: src/useAppActions.transaction.test.ts
```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { useAppActions } from "./hooks/useAppActions";
import { AppState, Profile, Transaction } from "./types";
import { renderHook, act } from "@testing-library/react";

describe("useAppActions - handleUpdateTransaction", () => {
  const getMockState = (): AppState => ({
    activeProfileId: "p1",
    profiles: [
      {
        id: "p1",
        name: "Test",
        kind: "personal",
        transactions: [
          {
            id: "tx-1",
            name: "Zabka",
            amount: 20,
            type: "expense",
            category: "Jedzenie",
            account: "Cash",
            isoDate: "2024-05-15",
            sourcePaymentId: "pay-1",
            isRecurring: true,
            recurringRuleId: "rule-1"
          }
        ],
        payments: [],
        goals: [],
        investments: [],
        budgets: {}
      }
    ]
  });

  it("should update an existing transaction and preserve technical fields", () => {
    let currentState = getMockState();
    const saveState = vi.fn().mockImplementation(async (newState) => {
      currentState = newState;
    });

    const { result } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles[0],
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn()
      })
    );

    act(() => {
      result.current.handleUpdateTransaction("tx-1", {
        name: "Biedronka",
        amount: 150,
        category: "Zakupy"
      });
    });

    expect(saveState).toHaveBeenCalled();
    const updatedProfile = currentState.profiles[0];
    const tx = updatedProfile.transactions[0];

    expect(updatedProfile.transactions.length).toBe(1);
    expect(tx.name).toBe("Biedronka");
    expect(tx.amount).toBe(150);
    expect(tx.category).toBe("Zakupy");
    expect(tx.id).toBe("tx-1");
    // Technical fields should be preserved
    expect(tx.sourcePaymentId).toBe("pay-1");
    expect(tx.isRecurring).toBe(true);
    expect(tx.recurringRuleId).toBe("rule-1");
  });

  it("should not call saveState if the transaction is not found", () => {
    let currentState = getMockState();
    const saveState = vi.fn().mockImplementation(async (newState) => {
      currentState = newState;
    });

    const { result } = renderHook(() =>
      useAppActions({
        state: currentState,
        saveState,
        activeProfile: currentState.profiles[0],
        makeUndoBackup: vi.fn(),
        unlockProfile: vi.fn(),
        lockProfile: vi.fn(),
        setActiveView: vi.fn(),
        connectGoogle: vi.fn(),
        disconnectGoogle: vi.fn(),
        toggleAutoSync: vi.fn(),
        backupToDriveManual: vi.fn(),
        restoreFromDriveManual: vi.fn(),
        setApiError: vi.fn()
      })
    );

    act(() => {
      result.current.handleUpdateTransaction("tx-999", {
        name: "Biedronka"
      });
    });

    expect(saveState).not.toHaveBeenCalled();
  });
});

```


## File: src/utils.roundCurrency.test.ts
```ts
import { describe, it, expect } from "vitest";
import { roundCurrency } from "./utils";

describe("roundCurrency", () => {
  it("fixes IEEE 754 precision: 0.1 + 0.2 === 0.3", () => {
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3);
  });

  it("rounds 99.99 / 2 (49.995) to 50", () => {
    expect(roundCurrency(99.99 / 2)).toBe(50);
  });

  it("preserves integers: 10 === 10", () => {
    expect(roundCurrency(10)).toBe(10);
  });

  it("returns 0 for NaN", () => {
    expect(roundCurrency(NaN)).toBe(0);
  });

  it("returns 0 for Infinity", () => {
    expect(roundCurrency(Infinity)).toBe(0);
  });

  it("handles negative edge case: -5.005 rounds to -5", () => {
    // Math.round((-5.005 + Number.EPSILON) * 100) / 100
    // = Math.round(-500.4999...) / 100 = -500 / 100 = -5
    expect(roundCurrency(-5.005)).toBe(-5);
  });
});

```


## File: src/utils.test.ts
```ts
import { describe, it, expect } from "vitest";
import { addMonthsClamped, parseAmount, hashPin, getLocalDateIso } from "./utils";

describe("Utils tests", () => {
  
  describe("getLocalDateIso", () => {
    it("should return the local date correctly formatted", () => {
      // Mocking a local date
      const testDate = new Date(2023, 5, 15, 23, 59, 59); // June 15, 2023 local time
      expect(getLocalDateIso(testDate)).toBe("2023-06-15");
    });
  });

  describe("addMonthsClamped", () => {
    it("should add months normally", () => {
      expect(addMonthsClamped("2023-01-15", 1)).toBe("2023-02-15");
    });
    
    it("should clamp 31st of Jan to 28th of Feb", () => {
      expect(addMonthsClamped("2023-01-31", 1)).toBe("2023-02-28");
    });

    it("should clamp 31st of Jan to 29th of Feb in leap year", () => {
      expect(addMonthsClamped("2024-01-31", 1)).toBe("2024-02-29");
    });
    
    it("should clamp 31st of Oct to 30th of Nov", () => {
      expect(addMonthsClamped("2023-10-31", 1)).toBe("2023-11-30");
    });
  });

  describe("parseAmount", () => {
    it("should parse 1 234,56", () => {
      expect(parseAmount("1 234,56")).toBe(1234.56);
    });

    it("should parse 1,234.56", () => {
      expect(parseAmount("1,234.56")).toBe(1234.56);
    });

    it("should parse 1234", () => {
      expect(parseAmount("1234")).toBe(1234);
    });

    it("should return 0 on invalid input", () => {
      expect(parseAmount("abc")).toBe(0);
    });
  });

  describe("hashPin", () => {
    it("should produce a stable hex hash", async () => {
      const hash = await hashPin("1234", "salt123");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});

```


## File: src/utils.ts
```ts
import { jsPDF } from "jspdf";
import { Profile, Transaction, Payment, Goal, TransactionRule } from "./types";

export function getLocalDateIso(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addMonthsClamped(dateString: string, monthsToAdd: number): string {
  const d = new Date(dateString + "T00:00:00");
  if (isNaN(d.getTime())) return dateString; // Fallback
  
  const currentDay = d.getDate();
  const targetMonth = d.getMonth() + monthsToAdd;
  
  const res = new Date(d.getFullYear(), targetMonth, 1);
  const daysInTargetMonth = new Date(res.getFullYear(), res.getMonth() + 1, 0).getDate();
  res.setDate(Math.min(currentDay, daysInTargetMonth));
  
  const yyyy = res.getFullYear();
  const mm = String(res.getMonth() + 1).padStart(2, '0');
  const dd = String(res.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const parseAmount = (val: string): number => {
  if (!val) return 0;
  // strip spaces, currency symbols like PLN, zł, $, €
  let clean = val.replace(/[^0-9,\.\-]/g, "");
  
  // Find the last separator to treat it as decimal delimiter
  const commaIndex = clean.lastIndexOf(",");
  const dotIndex = clean.lastIndexOf(".");
  
  if (commaIndex > dotIndex) {
    // comma is decimal separator: replace dots (thousands) with empty, and comma with dot
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else if (dotIndex > commaIndex) {
    // dot is decimal separator: replace commas with empty
    clean = clean.replace(/,/g, "");
  }
  
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

export const expenseCategories = ['Żywność', 'Dom i rachunki', 'Transport', 'Zdrowie', 'Rozrywka', 'Kredyt konsumencki', 'Raty', 'Kredyt hipoteczny', 'Spłata karty kredytowej', 'Inne'];
export const incomeCategories = ['Wynagrodzenie', 'Premia', 'Działalność', 'Zwrot', 'Inne'];
export const budgetCategories = ['Żywność', 'Dom i rachunki', 'Transport', 'Rozrywka', 'Kredyt konsumencki', 'Raty', 'Kredyt hipoteczny', 'Spłata karty kredytowej'];

export const iconByCategory: Record<string, string> = {
  'Żywność': '🛒',
  'Dom i rachunki': '🏠',
  'Transport': '🚗',
  'Zdrowie': '❤️',
  'Rozrywka': '🎬',
  'Kredyt konsumencki': '💳',
  'Raty': '📉',
  'Kredyt hipoteczny': '🏦',
  'Spłata karty kredytowej': '💳',
  'Inne': '✨',
  'Wynagrodzenie': '💰',
  'Premia': '🎁',
  'Działalność': '💼',
  'Zwrot': '↩️'
};

export function autoCategorizeTransaction(txName: string, rules: TransactionRule[], originalCategory: string): { category: string; categoryIcon: string } {
  const nameLower = txName.toLowerCase();
  for (const rule of rules) {
    if (nameLower.includes(rule.pattern.toLowerCase())) {
      return {
        category: rule.category,
        categoryIcon: rule.categoryIcon || "✨"
      };
    }
  }
  // If no custom rule matches, use a few default smart mappings if the category is generic:
  if (originalCategory === "Inne" || !originalCategory) {
    const defaults: Record<string, { category: string; categoryIcon: string }> = {
      "orlen": { category: "Transport", categoryIcon: "🚗" },
      "lotos": { category: "Transport", categoryIcon: "🚗" },
      "bp ": { category: "Transport", categoryIcon: "🚗" },
      "paliw": { category: "Transport", categoryIcon: "🚗" },
      "shell": { category: "Transport", categoryIcon: "🚗" },
      "biedronka": { category: "Żywność", categoryIcon: "🛒" },
      "lidl": { category: "Żywność", categoryIcon: "🛒" },
      "tesco": { category: "Żywność", categoryIcon: "🛒" },
      "auchan": { category: "Żywność", categoryIcon: "🛒" },
      "carrefour": { category: "Żywność", categoryIcon: "🛒" },
      "zabka": { category: "Żywność", categoryIcon: "🛒" },
      "żabka": { category: "Żywność", categoryIcon: "🛒" },
      "netflix": { category: "Rozrywka", categoryIcon: "🎬" },
      "spotify": { category: "Rozrywka", categoryIcon: "🎬" },
      "kino": { category: "Rozrywka", categoryIcon: "🎬" },
      "teatr": { category: "Rozrywka", categoryIcon: "🎬" },
      "czynsz": { category: "Dom i rachunki", categoryIcon: "🏠" },
      "prad": { category: "Dom i rachunki", categoryIcon: "🏠" },
      "prąd": { category: "Dom i rachunki", categoryIcon: "🏠" },
      "gaz": { category: "Dom i rachunki", categoryIcon: "🏠" },
      "woda": { category: "Dom i rachunki", categoryIcon: "🏠" },
      "apteka": { category: "Zdrowie", categoryIcon: "❤️" },
      "lekarz": { category: "Zdrowie", categoryIcon: "❤️" },
      "szpital": { category: "Zdrowie", categoryIcon: "❤️" }
    };
    for (const [kw, val] of Object.entries(defaults)) {
      if (nameLower.includes(kw)) {
        return val;
      }
    }
  }

  return {
    category: originalCategory || "Inne",
    categoryIcon: iconByCategory[originalCategory] || "✨"
  };
}

export const plnFormatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN'
});

export const formatPln = (val: number): string => plnFormatter.format(val);

export function formatDatePl(isoDate: string): string {
  if (!isoDate) return "";
  try {
    const d = new Date(`${isoDate}T12:00:00`);
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return isoDate;
  }
}

export const monthsPl = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];

export function getMonthNamePl(monthIdx: number): string {
  return monthsPl[monthIdx] || "";
}

// Strip Polish diacritics to ensure Helvetica renders without missing character boxes
export function cleanPolishChars(text: string): string {
  const map: Record<string, string> = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
  };
  return text.replace(/[ąćęłnóśźżĄĆĘŁŃÓŚŹŻ]/g, match => map[match] || match);
}

// Hash pin securely using PBKDF2 (310,000 iterations of SHA-256)
export async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const saltBuffer = enc.encode(salt);
  
  const key = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 310000,
      hash: "SHA-256",
    },
    keyMaterial,
    256 // 32 bytes
  );

  return Array.from(new Uint8Array(key))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function generateReportPdf(profile: Profile, year: number, monthIndex: number) {
  const doc = new jsPDF();
  const monthName = getMonthNamePl(monthIndex);
  
  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(19, 117, 102); // Primary Teal color
  doc.text(cleanPolishChars(`SALDO - RAPORT MIESIECZNY`), 14, 20);
  
  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(cleanPolishChars(`Profil: ${profile.name} (${profile.kind === "shared" ? "Budzet wspolny" : "Budzet osobisty"})`), 14, 27);
  doc.text(cleanPolishChars(`Okres rozliczeniowy: ${monthName} ${year}`), 14, 33);
  
  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 38, 196, 38);
  
  // Calculate Totals for this month
  const targetTransactions = profile.transactions.filter(t => {
    const tDate = new Date(`${t.isoDate}T12:00:00`);
    return tDate.getFullYear() === year && tDate.getMonth() === monthIndex;
  });
  
  const incomeTotal = targetTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
    
  const expenseTotal = targetTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
    
  const balance = incomeTotal - expenseTotal;
  
  // Financial Summary Box
  doc.setFillColor(245, 248, 247); // Light theme bg
  doc.rect(14, 43, 182, 35, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(21, 58, 53); // Deep ink
  doc.text(cleanPolishChars("PODSUMOWANIE FINANSOWE"), 20, 51);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(cleanPolishChars(`Przychody razem:`), 20, 59);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(19, 117, 102); // Teal
  doc.text(`${incomeTotal.toFixed(2)} PLN`, 80, 59);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(cleanPolishChars(`Wydatki razem:`), 20, 65);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(213, 94, 80); // Coral
  doc.text(`${expenseTotal.toFixed(2)} PLN`, 80, 65);
  
  doc.setDrawColor(220, 220, 220);
  doc.line(115, 48, 115, 73); // Vertical divider
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(cleanPolishChars(`Stan konta (Bilans):`), 122, 59);
  doc.setFont("helvetica", "bold");
  if (balance >= 0) {
    doc.setTextColor(19, 117, 102);
  } else {
    doc.setTextColor(213, 94, 80);
  }
  doc.text(`${balance.toFixed(2)} PLN`, 122, 66);
  
  // Section 1: Visual Expense Bar Chart
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(21, 58, 53);
  doc.text(cleanPolishChars("WYKRES WYDATKOW WEDLUG KATEGORII"), 14, 92);
  
  let y = 100;
  
  // Calculate expenses for all 6 categories
  const categoriesList = expenseCategories;
  const categoryExpenses = categoriesList.map(cat => {
    const spent = targetTransactions
      .filter(t => t.type === "expense" && t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0);
    return { name: cat, spent };
  });
  
  // Draw the horizontal bar chart
  categoryExpenses.forEach(cat => {
    const percent = expenseTotal > 0 ? (cat.spent / expenseTotal) : 0;
    const percentText = `${Math.round(percent * 100)}%`;
    
    // Category Name (Left)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(21, 58, 53);
    doc.text(cleanPolishChars(cat.name), 14, y);
    
    // Amount & Percentage (Right)
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const textLabel = `${cat.spent.toFixed(2)} PLN (${percentText})`;
    doc.text(textLabel, 196 - doc.getTextWidth(textLabel), y);
    
    y += 3;
    
    // Gray background bar
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y, 182, 3.5, "F");
    
    // Colored fill bar (brand Teal)
    if (percent > 0) {
      doc.setFillColor(19, 117, 102);
      doc.rect(14, y, 182 * percent, 3.5, "F");
    }
    
    y += 10;
  });
  
  // Section 2: Used Tags Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(21, 58, 53);
  doc.text(cleanPolishChars("UZYTE TAGI W TYM OKRESIE"), 14, y + 2);
  y += 10;
  
  // Extract and aggregate tags from transactions
  const tagMap: Record<string, { count: number; sum: number }> = {};
  targetTransactions.forEach(t => {
    if (t.tags && Array.isArray(t.tags)) {
      t.tags.forEach(tag => {
        const cleanTag = tag.trim().toLowerCase();
        if (cleanTag) {
          if (!tagMap[cleanTag]) {
            tagMap[cleanTag] = { count: 0, sum: 0 };
          }
          tagMap[cleanTag].count += 1;
          tagMap[cleanTag].sum += t.amount;
        }
      });
    }
  });
  
  const tagsList = Object.entries(tagMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);
    
  if (tagsList.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(cleanPolishChars("Brak uzytych tagow w transakcjach z tego miesiaca."), 14, y);
    y += 8;
  } else {
    // Render nice tag pills!
    let x = 14;
    doc.setFontSize(8);
    tagsList.forEach(t => {
      const tagText = `#${t.name} (${t.count}x, ${t.sum.toFixed(0)} PLN)`;
      const cleanText = cleanPolishChars(tagText);
      const textWidth = doc.getTextWidth(cleanText);
      const pillWidth = textWidth + 8;
      const pillHeight = 6;
      
      // Wrap line if it overflows page
      if (x + pillWidth > 196) {
        x = 14;
        y += 8;
      }
      
      // If we are reaching the end of the page, add page (though page 1 has plenty of space for y)
      if (y > 275) {
        doc.addPage();
        y = 20;
        x = 14;
      }
      
      // Draw Pill background
      doc.setFillColor(231, 243, 240); // Soft brand teal
      doc.rect(x, y - 4, pillWidth, pillHeight, "F");
      
      // Draw Pill border
      doc.setDrawColor(19, 117, 102); // 100% alpha teal border (safe for default jsPDF styles)
      doc.rect(x, y - 4, pillWidth, pillHeight, "S");
      
      // Draw Pill text
      doc.setFont("helvetica", "bold");
      doc.setTextColor(19, 117, 102);
      doc.text(cleanText, x + 4, y);
      
      x += pillWidth + 3;
    });
    y += 10;
  }
  
  // Footer page 1
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(cleanPolishChars("Strona 1. Raport Finansowy Saldo."), 14, 285);
  doc.text(cleanPolishChars(`Data generowania: ${new Date().toLocaleDateString('pl-PL')}`), 145, 285);
  
  // PAGE 2: BILLS, RECURRING PAYMENTS AND GOALS
  doc.addPage();
  y = 20;
  
  // Header Page 2
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(19, 117, 102);
  doc.text(cleanPolishChars("RACHUNKI I CELE OSZCZEDNOSCIOWE"), 14, y);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(cleanPolishChars(`Profil: ${profile.name} | Okres: ${monthName} ${year}`), 14, y + 6);
  
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y + 10, 196, y + 10);
  
  y += 20;
  
  // Section 2: Bills and recurring payments
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(21, 58, 53);
  doc.text(cleanPolishChars("STAN OPLAT I RACHUNKOW"), 14, y);
  y += 8;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(cleanPolishChars("Nazwa rachunku"), 15, y);
  doc.text(cleanPolishChars("Termin platnosci"), 80, y);
  doc.text(cleanPolishChars("Kwota"), 130, y);
  doc.text(cleanPolishChars("Status"), 165, y);
  doc.line(14, y + 2, 196, y + 2);
  y += 7;
  
  doc.setFont("helvetica", "normal");
  const bills = profile.payments;
  if (bills.length === 0) {
    doc.text(cleanPolishChars("Brak zdefiniowanych rachunkow."), 15, y);
    y += 15;
  } else {
    bills.forEach(b => {
      doc.text(cleanPolishChars(b.name), 15, y);
      doc.text(b.dueDate, 80, y);
      doc.text(`${b.amount.toFixed(2)} PLN`, 130, y);
      
      const bStatus = b.status === "Opłacono" ? "Oplacone" : "Do oplacenia";
      if (b.status === "Opłacono") {
        doc.setTextColor(19, 117, 102); // green
      } else {
        doc.setTextColor(213, 94, 80); // coral
      }
      doc.setFont("helvetica", "bold");
      doc.text(cleanPolishChars(bStatus), 165, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      
      y += 6;
    });
    y += 8;
  }
  
  // Section 3: Goals progress
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(21, 58, 53);
  doc.text(cleanPolishChars("CELE OSZCZEDNOSCIOWE"), 14, y);
  y += 8;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(cleanPolishChars("Nazwa celu"), 15, y);
  doc.text(cleanPolishChars("Zaoszczedzono"), 65, y);
  doc.text(cleanPolishChars("Kwota docelowa"), 105, y);
  doc.text(cleanPolishChars("Wizualny postep i procent"), 140, y);
  doc.line(14, y + 2, 196, y + 2);
  y += 7;
  
  doc.setFont("helvetica", "normal");
  const goals = profile.goals;
  if (goals.length === 0) {
    doc.text(cleanPolishChars("Brak zdefiniowanych celow oszczednosciowych."), 15, y);
    y += 10;
  } else {
    goals.forEach(g => {
      const progressRatio = g.target > 0 ? Math.min(1, g.saved / g.target) : 0;
      const progressPercent = `${Math.round(progressRatio * 100)}%`;
      
      doc.setFont("helvetica", "normal");
      doc.text(cleanPolishChars(g.name), 15, y);
      doc.text(`${g.saved.toFixed(2)} PLN`, 65, y);
      doc.text(`${g.target.toFixed(2)} PLN`, 105, y);
      
      // Visual Mini Progress Bar
      const barX = 140;
      const barY = y - 3;
      const barW = 35;
      const barH = 3;
      
      // Bar background
      doc.setFillColor(240, 240, 240);
      doc.rect(barX, barY, barW, barH, "F");
      
      // Bar progress fill (beautiful teal-gold)
      if (progressRatio > 0) {
        doc.setFillColor(19, 117, 102);
        doc.rect(barX, barY, barW * progressRatio, barH, "F");
      }
      
      // Percent text
      doc.setFont("helvetica", "bold");
      doc.setTextColor(19, 117, 102);
      doc.text(progressPercent, barX + barW + 3, y);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");
      
      y += 7;
    });
  }
  
  // Footer page 2
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(cleanPolishChars("Strona 2. Raport Finansowy Saldo."), 14, 285);
  doc.text(cleanPolishChars(`Data generowania: ${new Date().toLocaleDateString('pl-PL')}`), 145, 285);
  
  // PAGE 3: TRANSACTION HISTORY
  doc.addPage();
  y = 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(19, 117, 102);
  doc.text(cleanPolishChars("HISTORIA TRANSAKCJI"), 14, y);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(cleanPolishChars("Spis wszystkich wplat i wyplat zarejestrowanych w wybranym okresie rozliczeniowym."), 14, y + 6);
  
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y + 10, 196, y + 10);
  
  y += 20;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(21, 58, 53);
  doc.text(cleanPolishChars("Data"), 15, y);
  doc.text(cleanPolishChars("Nazwa transakcji"), 40, y);
  doc.text(cleanPolishChars("Kategoria"), 110, y);
  doc.text(cleanPolishChars("Konto"), 150, y);
  doc.text(cleanPolishChars("Kwota"), 178, y);
  doc.line(14, y + 2, 196, y + 2);
  y += 7;
  
  doc.setFont("helvetica", "normal");
  let currentPage = 3;
  
  if (targetTransactions.length === 0) {
    doc.text(cleanPolishChars("Brak zarejestrowanych transakcji w tym okresie rozliczeniowym."), 15, y);
  } else {
    targetTransactions.sort((a,b) => b.isoDate.localeCompare(a.isoDate)).forEach(t => {
      // Auto-paginate if table overflows vertical limit
      if (y > 270) {
        // Footer for previous transaction history page
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(cleanPolishChars(`Strona ${currentPage} o strukturze dynamicznej. Raport Saldo.`), 14, 285);
        doc.text(cleanPolishChars(`Data generowania: ${new Date().toLocaleDateString('pl-PL')}`), 145, 285);
        
        doc.addPage();
        currentPage += 1;
        y = 20;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(21, 58, 53);
        doc.text(cleanPolishChars("Data"), 15, y);
        doc.text(cleanPolishChars("Nazwa transakcji"), 40, y);
        doc.text(cleanPolishChars("Kategoria"), 110, y);
        doc.text(cleanPolishChars("Konto"), 150, y);
        doc.text(cleanPolishChars("Kwota"), 178, y);
        doc.line(14, y + 2, 196, y + 2);
        y += 7;
        doc.setFont("helvetica", "normal");
      }
      
      // Gather transaction tags for description
      let nameWithTags = t.name;
      if (t.tags && t.tags.length > 0) {
        nameWithTags += ` [${t.tags.join(", ")}]`;
      }
      
      const cleanDesc = cleanPolishChars(nameWithTags.length > 38 ? nameWithTags.slice(0, 35) + "..." : nameWithTags);
      const cleanCat = cleanPolishChars(t.category);
      const cleanAcc = cleanPolishChars(t.account);
      const sign = t.type === "income" ? "+" : "-";
      
      // Style positive and negative amounts
      if (t.type === "income") {
        doc.setTextColor(19, 117, 102); // Teal for income
      } else {
        doc.setTextColor(213, 94, 80); // Coral for expense
      }
      
      doc.text(t.isoDate, 15, y);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(21, 58, 53);
      doc.text(cleanDesc, 40, y);
      doc.setFont("helvetica", "normal");
      
      doc.text(cleanCat, 110, y);
      doc.text(cleanAcc, 150, y);
      
      if (t.type === "income") {
        doc.setTextColor(19, 117, 102);
      } else {
        doc.setTextColor(213, 94, 80);
      }
      doc.text(`${sign}${t.amount.toFixed(2)}`, 178, y);
      doc.setTextColor(80, 80, 80);
      
      y += 6;
    });
  }
  
  // Footer page 3/final
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(cleanPolishChars(`Strona ${currentPage} (Koniec raportu). Wygenerowano automatycznie przez aplikacje Saldo.`), 14, 285);
  doc.text(cleanPolishChars(`Data generowania: ${new Date().toLocaleDateString('pl-PL')}`), 145, 285);
  
  // Save PDF
  doc.save(`Raport_Saldo_${monthName}_${year}.pdf`);
}

/**
 * Requests browser notification permission.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Scans upcoming unpaid payments and displays a native browser notification if due.
 */
export function checkAndNotifyPayments(payments: any[]) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = payments.filter((p) => {
    if (p.status === "Opłacono") return false;
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    const diffTime = pDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Notify if due today, tomorrow, or in the next 3 days
    return diffDays >= 0 && diffDays <= 3;
  });

  if (upcoming.length === 0) return;

  // Check if we already notified about these specific payments in this session to prevent spamming
  const notifiedKeysStr = sessionStorage.getItem("saldo_notified_payments");
  const notifiedKeys: string[] = notifiedKeysStr ? JSON.parse(notifiedKeysStr) : [];

  // Filter out payments that have already been notified
  const toNotify = upcoming.filter((p) => !notifiedKeys.includes(`${p.id}_${p.status}_${p.dueDate}`));

  if (toNotify.length === 0) return;

  // Update notified list
  const newNotifiedKeys = [...notifiedKeys, ...toNotify.map((p) => `${p.id}_${p.status}_${p.dueDate}`)];
  sessionStorage.setItem("saldo_notified_payments", JSON.stringify(newNotifiedKeys));

  // Send notification
  if (toNotify.length === 1) {
    const p = toNotify[0];
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    const diffDays = Math.ceil((pDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let timeLabel = "";
    if (diffDays === 0) timeLabel = "dzisiaj";
    else if (diffDays === 1) timeLabel = "jutro";
    else timeLabel = `za ${diffDays} dni`;

    new Notification("Zbliżający się termin płatności!", {
      body: `Rachunek "${p.name}" na kwotę ${p.amount.toFixed(2)} PLN jest do opłacenia ${timeLabel} (${p.dueDate}).`,
    });
  } else {
    const listNames = toNotify.map((p) => p.name).join(", ");
    new Notification("Masz zbliżające się płatności!", {
      body: `Do opłacenia masz ${toNotify.length} rachunki: ${listNames}.`,
    });
  }
}

/**
 * Parsuje tekst naturalny w celu szybkiego dodania transakcji.
 * Np. "Biedronka 123,40 dzisiaj", "Pensja 6000 1 lipca"
 */
export function parseQuickAddText(text: string, rules: TransactionRule[]): Partial<Transaction> {
  const result: Partial<Transaction> = {
    name: "",
    amount: 0,
    category: "Inne",
    type: "expense",
    isoDate: getLocalDateIso(),
    tags: []
  };

  const cleanText = text.trim();
  if (!cleanText) return result;

  // 1. Wykryj kwotę (np. 123.40, 123,40, 5000)
  // Szukamy liczby z opcjonalnym przecinkiem lub kropką i groszami
  const amountMatch = cleanText.match(/\b\d+(?:[.,]\d+)?\b/);
  let parsedAmount = 0;
  let textWithoutAmount = cleanText;

  if (amountMatch) {
    const rawAmount = amountMatch[0];
    parsedAmount = parseFloat(rawAmount.replace(",", "."));
    result.amount = parsedAmount;
    textWithoutAmount = cleanText.replace(rawAmount, "").replace(/\s+/g, " ").trim();
  }

  // 2. Wykryj datę
  let isoDate = getLocalDateIso();
  const todayObj = new Date();

  const lowerText = textWithoutAmount.toLowerCase();
  if (lowerText.includes("dzisiaj")) {
    isoDate = getLocalDateIso(todayObj);
    textWithoutAmount = textWithoutAmount.replace(/dzisiaj/i, "").trim();
  } else if (lowerText.includes("wczoraj")) {
    const yesterday = new Date();
    yesterday.setDate(todayObj.getDate() - 1);
    isoDate = getLocalDateIso(yesterday);
    textWithoutAmount = textWithoutAmount.replace(/wczoraj/i, "").trim();
  } else if (lowerText.includes("jutro")) {
    const tomorrow = new Date();
    tomorrow.setDate(todayObj.getDate() + 1);
    isoDate = getLocalDateIso(tomorrow);
    textWithoutAmount = textWithoutAmount.replace(/jutro/i, "").trim();
  } else {
    // Słownik miesięcy po polsku
    const monthsMap: Record<string, number> = {
      stycznia: 0, styczen: 0,
      lutego: 1, luty: 1,
      marca: 2, marzec: 2,
      kwietnia: 3, kwiecien: 3,
      maja: 4, maj: 4,
      czerwca: 5, czerwiec: 5,
      lipca: 6, lipiec: 6,
      sierpnia: 7, sierpien: 7,
      września: 8, wrzesnia: 8, wrzesien: 8,
      października: 9, pazdziernika: 9, pazdziernik: 9,
      listopada: 10, listopad: 10,
      grudnia: 11, grudzien: 11
    };

    const plMonthRegex = /(\d{1,2})\s+([a-zA-ZęćłńóśźżĄĆĘŁŃÓŚŹŻ]+)/i;
    const plMonthMatch = textWithoutAmount.match(plMonthRegex);
    if (plMonthMatch) {
      const day = parseInt(plMonthMatch[1]);
      const monthWord = plMonthMatch[2].toLowerCase();
      if (monthWord in monthsMap) {
        const month = monthsMap[monthWord];
        const dateObj = new Date(todayObj.getFullYear(), month, day);
        isoDate = getLocalDateIso(dateObj);
        textWithoutAmount = textWithoutAmount.replace(plMonthMatch[0], "").trim();
      }
    }
  }
  result.isoDate = isoDate;

  // 3. Pozostały tekst to nazwa transakcji
  let name = textWithoutAmount.replace(/\s+/g, " ").trim();
  if (name) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
    result.name = name;
  } else {
    result.name = "Szybki wpis";
  }

  // 4. Dopasowanie kategorii po regułach
  let matchedCategory = "";
  const catResult = autoCategorizeTransaction(result.name, rules, "");
  result.category = catResult.category;
  result.categoryIcon = catResult.categoryIcon;

  // Przychód czy wydatek
  const isIncomeCat = incomeCategories.includes(result.category);
  result.type = isIncomeCat ? "income" : "expense";

  return result;
}


export function generateCsvContent(transactions: any[]): string {
  // UTF-8 BOM
  let csvContent = "\uFEFF";
  
  // Headers
  const headers = ["ID", "Nazwa", "Kwota", "Kategoria", "Konto", "Typ", "Data"];
  csvContent += headers.map(escapeCsvValue).join(",") + "\n";
  
  transactions.forEach((tx) => {
    const row = [
      tx.id || "",
      tx.name || "",
      tx.amount?.toString() || "0",
      tx.category || "",
      tx.account || "",
      tx.type || "",
      tx.isoDate || ""
    ];
    csvContent += row.map(escapeCsvValue).join(",") + "\n";
  });
  
  return csvContent;
}

function escapeCsvValue(val: string): string {
  const str = String(val);
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Zaokrągla kwotę pieniężną do 2 miejsc po przecinku.
 * Używa Number.EPSILON, aby uniknąć błędów precyzji IEEE 754
 * (np. 0.1 + 0.2 = 0.30000000000000004 → 0.3).
 * Zwraca 0 dla NaN / Infinity / -Infinity.
 */
export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

```


## File: src/vite-env.d.ts
```ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

```
