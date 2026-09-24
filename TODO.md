# TODO Lista Rozwoju Saldo v1.7+

> **Zasada:** Aplikacja ma być **local-first** z Ollama jako głównym AI. Wszelkie cloud API (Gemini, OpenAI, Anthropic) są **opcjonalne, jawnie oznaczone i wymagają zgody użytkownika** (BYOK - Bring Your Own Key przechowywany w SecurityVault).

---

## ✅ ZAKOŃCZONE (v1.6.1)
- [x] Refaktoryzacja typów (usunięcie duplikatów z AppState)
- [x] Centralne generowanie ID (`src/utils/id.ts`)
- [x] Centralna normalizacja tekstu (`src/utils/text.ts`)
- [x] Optymalizacja detekcji duplikatów (O(n²) → O(n))
- [x] Naprawa auto-updatera (duplikowanie, restart, startup check)
- [x] MCP serwery (filesystem + shell)
- [x] Hook `useExchangeRates`
- [x] Release v1.6.1 z artefaktami macOS

---

## 🎯 NOWE ZADANIA (v1.7.0) - Onboarding, Google Sync, UI Polish

### Onboarding Wizard v2.0 (Profesjonalny First-Run Experience)
- [ ] Nowy styl wizualny: gradientowe tło, animowane karty, micro-interactions
- [ ] Krok 1: Welcome z ilustracją Lottie/SVG, tagline, CTA
- [ ] Krok 2: Profil (nazwa, awatar, waluta, typ profilu) - lepszy UX
- [ ] Krok 3: Bezpieczeństwo - PIN (4-6 cyfr) LUB Hasło (min 8 znaków, strength meter)
- [ ] Krok 4: Biometria (opcjonalna) - upsell z wyjaśnieniem
- [ ] **Nowość:** Krok 5: Backup lokalny - eksport zaszyfrowany na dysk (AES-GCM, plik .saldo)
- [ ] **Nowość:** Krok 6: Google Sync - opcjonalne łączenie z Google Drive + Calendar
- [ ] **Nowość:** Krok 6b: Google Calendar - uprawnienia do wydarzeń/płatności
- [ ] Progress bar / stepper z animacją
- [ ] Dark/Light mode awareness w onboardingzie
- [ ] Testy E2E dla nowego flow

### Google Integration v2.0 (Optymalizacja & Naprawa)
- [ ] **Google Auth:** Lepsze obsługa popup blocking / redirect fallback
- [ ] **Token Management:** Automatyczne odświeżanie tokenów (refresh token rotation)
- [ ] **Google Drive:** Retry logic (exponential backoff), lepsze error handling
- [ ] **Google Calendar:** Pełna integracja - sync płatności jako wydarzeń, remindery
- [ ] **Conflict Resolution:** Lepszy UI konfliktów (diff viewer, merge options)
- [ ] **Offline Queue:** Kolejka operacji do Google Drive/Calendar przy braku sieci
- [ ] **Token Storage:** Bezpieczne przechowywanie refresh tokenów w SecurityVault
- [ ] **Multi-account:** Wsparcie dla wielu kont Google (osobiste/służbowe)

### UI/UX Polish (Ogólne Poprawki)
- [ ] Design System: spójne spacing, typografia, kolory, cienie
- [ ] Micro-interactions: hover/tap states, loading skeletons, transitions
- [ ] Dark mode: poprawne kontrasty, wsparcie system preferences
- [ ] Accessibility: ARIA labels, focus management, keyboard navigation
- [ ] Mobile-first: touch-friendly targets, swipe gestures, responsive breakpoints
- [ ] Performance: lazy loading, code splitting, memoization
- [ ] Error Boundaries: ładne error UI z retry
- [ ] Loading states: skeleton loaders, progress indicators
- [ ] Toast/Notification system: spójne, animowane, dostępne

### Testy i Jakość
- [ ] E2E Playwright: onboarding flow, google sync, conflict resolution
- [ ] Visual regression tests (Chromatic/Percy)
- [ ] Accessibility audit (axe-core)
- [ ] Performance budgets (Lighthouse CI)

---

## 📋 BACKLOG PRIORYTETOWY

### P0 — KRYTYCZNE (Fundamenty)

#### 1. External AI Providers (BYOK) — **CLOUD API** ⚠️
> **Oznaczenie:** ☁️ **CLOUD API** — wymaga klucza API użytkownika, przechowywanego w SecurityVault
- [x] Rozszerzenie `AiConfig` o `cloudProvider`, `cloudModel`, `cloudApiKeyRef`
- [x] Nowy provider `CloudProvider` (Gemini, OpenAI, Anthropic, Custom)
- [x] UI w Ustawieniach → AI: wybór providera + input klucza (zapis do SecurityVault)
- [x] Sanityzacja nagłówków (`SecurityVault.sanitizeHeaders`)
- [x] Testy jednostkowe i integracyjne

#### 2. End-to-End Encryption (E2EE) dla Sync
- [ ] Klucz szyfrowania z PIN-u (PBKDF2 100k, AES-GCM)
- [ ] Szyfrowanie przed wyjściem z urządzenia
- [ ] Migracja istniejących danych przy pierwszej synchronizacji
- [ ] Testy penetracyjne / audyt krypto

#### 3. Passkeys / WebAuthn (FIDO2)
- [ ] Rejestracja poświadczenia (Touch ID, Windows Hello, Face ID)
- [ ] Logowanie bez PIN-u
- [ ] Fallback na PIN
- [ ] Integracja z `SecurityVault` i `BiometricService`

#### 4. CRDT / Automerge dla Sync (Conflict-Free)
- [ ] Integracja Yjs lub Automerge
- [ ] Automatyczne scalanie konfliktów
- [ ] Historia zmian + undo/redo
- [ ] Offline queue z retry

---

### P1 — WAŻNE (Wartość Dodana)

#### 5. AI Budget Insights (Local-First z Ollama) 🦙
- [ ] Automatyczne kategoryzowanie 50/30/20 (deterministyczne + Ollama)
- [ ] Prognoza cashflow 30/60/90 dni
- [ ] Alerty: "Za 3 dni kończy się budżet na Transport"
- [ ] Wszystkie obliczenia lokalne, Ollama opcjonalnie dla "wyjaśnień"

#### 6. Open Banking / PSD2 (Polska) 🏦
- [ ] Integracja KIR / BlueMedia / Enable Banking
- [ ] OAuth2 z PKCE
- [ ] Automatyczny import co 24h / na żądanie
- [ ] Kategoryzacja AI + reguły użytkownika

#### 7. PWA + Background Sync + Push Notifications 🔔
- [ ] Service Worker (cache-first, stale-while-revalidate)
- [ ] Background Sync API
- [ ] Web Push (VAPID) + natywne w Electron
- [ ] Powiadomienia: terminy, cele, wydatki partnera

---

### P2 — ROZSZERZENIA

#### 8. Multi-user / Household Sharing 👥
- [ ] Zaproszenia e-mail / link do profilu `kind: "shared"`
- [ ] Role: Owner / Editor / Viewer
- [ ] Podział wydatków: ja / partner / wspólne (%)
- [ ] Rozliczenia + historia spłat

#### 9. Eksport do Excel / PDF z Szablonami 📊
- [ ] Szablony: PIT-36/37, VAT, KPiR, raport miesięczny
- [ ] Własne szablony (Handlebars)
- [ ] Podpis cyfrowy / kod QR

#### 10. E2E Tests + CI/CD Hardening 🧪
- [ ] Playwright scenariusze: onboarding → PIN → biometria → wydatki → sync → import → AI chat
- [ ] Testy macOS (ARM/Intel) + Windows w GitHub Actions
- [ ] Contract testing (Zod schemas)
- [ ] SBOM dla release'ów

---

## 🏷️ LEGENDA OZNACZEŃ

| Symbol | Znaczenie |
|--------|-----------|
| 🦙 | **LOCAL-FIRST** — działa w pełni offline z Ollama |
| ☁️ | **CLOUD API** — wymaga klucza API, przechowywanego w SecurityVault |
| 🔐 | **SECURITY** — funkcja bezpieczeństwa/kryptografia |
| 🔄 | **SYNC** — dotyczy synchronizacji danych |
| 🧪 | **TESTING** — testy / jakość kodu |

---

## 📝 NOTATKI IMPLEMENTACYJNE

### SecurityVault — klucze dla AI:
```
ai_ollama_endpoint    # lokalny endpoint (nie секрет)
ai_cloud_provider     # "gemini" | "openai" | "anthropic" | "custom"
ai_cloud_model        # nazwa modelu
ai_cloud_apikey_ref   # referencja do klucza w Vault (np. "ai_gemini_key")
```

### CloudProvider Interface:
```typescript
interface CloudProviderConfig {
  provider: "gemini" | "openai" | "anthropic" | "custom";
  model: string;
  apiKey: string;  // pobierany z Vaultu w momencie requestu
  baseUrl?: string; // dla custom
}
```

### Zasady Cloud API:
1. Klucz **nigdy** nie trafia do localStorage / state / logów
2. Pobierany z Vaultu **tylko w momencie requestu** przez `executeWithSecret()`
3. Użytkownik widzi: "Twój klucz API jest przechowywany bezpiecznie w systemowym magazynie kluczy (Keychain/DPAPI)"
4. Możliwość usunięcia klucza w dowolnym momencie
5. Domyślnie: **wyłączone** (tryb `none` lub `local` z Ollama)

---

## 🚀 ROZPOCZĘCIE PRACY

**Następny krok:** Implementacja **P1 — External AI Providers (BYOK)**

Zaczynamy od:
1. Rozszerzenia typów (`AiConfig`, `CloudProviderConfig`)
2. Aktualizacji `SecurityVault` o metody dla kluczy AI
3. Tworzenia `CloudProvider` w backendzie
4. UI w Ustawieniach → AI
5. Testów