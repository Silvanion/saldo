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

## 📋 BACKLOG PRIORYTETOWY

### P0 — KRYTYCZNE (Fundamenty)

#### 1. External AI Providers (BYOK) — **CLOUD API** ⚠️
> **Oznaczenie:** ☁️ **CLOUD API** — wymaga klucza API użytkownika, przechowywanego w SecurityVault
- [ ] Rozszerzenie `AiConfig` o `cloudProvider`, `cloudModel`, `cloudApiKeyRef`
- [ ] Nowy provider `CloudProvider` (Gemini, OpenAI, Anthropic, Custom)
- [ ] UI w Ustawieniach → AI: wybór providera + input klucza (zapis do SecurityVault)
- [ ] Sanityzacja nagłówków (`SecurityVault.sanitizeHeaders`)
- [ ] Testy jednostkowe i integracyjne

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