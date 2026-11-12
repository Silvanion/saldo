# Harmonogram wdrożenia audytu

Źródło: `RAPORT-AUDYTU.md` §10 i `BACKLOG.csv`. Sprinty dwutygodniowe (założenie: jedna osoba + agent). Status aktualizowany po każdej pozycji; zielone = zacommitowane, z testami.

Legenda: ✅ zrobione · 🟡 w toku / częściowo · ⏳ czeka na decyzję · ⬜ zaplanowane

## S0 — hotfix (wydanie 1.6.7) · 2026-11-12

| ID | Status | Commit / uwagi |
|---|---|---|
| SEC-01 + TEST-04 | ✅ | `3104027` — czerwony test → poprawka; zmieniony kontrakt starego testu |
| SEC-03 + TEST-01 | ✅ | `c81f006` — wspólny moduł CSP, test parytetu z `firebase.json`, e2e na buildzie produkcyjnym w CI (mutacja potwierdza, że test wykrywa błąd) |
| SEC-04 | ✅ | `fccc459` — usunięty nieistniejący `server-shell`, przypięty `filesystem@2.3.0` |
| SEC-08 | ✅ | `0e76e0c` — audit 44 → 19 (critical 4 → 0; prod: 0 high/critical). Zostaje łańcuch `firebase` (jedyna „poprawka” to downgrade do v9 — odrzucona) oraz moderate w `electron-builder`/`vite-plugin-pwa` (zmiana major) |
| LEGAL-01 | ✅ | AGPL-3.0-only: plik `LICENSE` (tekst SPDX), pole `license` w `package.json`, sekcja w README. Zależności sprawdzone pod kątem zgodności (brak niezgodnych) |

Uwaga operacyjna: lokalny npm 10.9.9 wywraca się na `npm update` (arborist); repo deklaruje npm 11.17.0 → używać `corepack npm …`.

## S1 — 2026-11-16 → 11-27 (wydanie 1.7.0-beta) — rozpoczęte 2026-11-12

| ID | Zadanie | Nakład | Status |
|---|---|---|---|
| PERF-01 | Dynamiczny import Firestore | S | ✅ `dynamic import` — start 424 → **243 kB gzip** (zmierzone) |
| A11Y-01 (+A11Y-02) | Kontrast tokenów | S | ✅ success/warning/faint ≥ 4,5:1 w obu motywach (policzone) |
| SEC-09 | Bramki w CI | S | ✅ `npm audit --omit=dev --audit-level=high`, Dependabot, CodeQL (tagi akcji, nie SHA) |
| SEC-05 | `lockSession()` | M | ✅ blokada szyfruje profil, kasuje klucz, podmienia stan; reset danych nietknięty |
| DOC-01 | Dokumentacja zgodna z kodem | S | ✅ usunięty martwy `secureStorageStrategy.ts`, sekcja „Znane ograniczenia” |
| AI-08 | Modele Anthropic | S | ✅ `18f64b2` — **potwierdzony błąd**: domyślny model był wycofany; testy z mockiem, brak żywego wywołania API |
| SEC-06 | Webowy vault | M | 🟡 uczciwy opis w UI i komentarzach. **Decyzja:** czy na web trzymać klucz tylko w sessionStorage (bezpieczniej, ale użytkownicy web tracą zapisane klucze)? |
| SEC-10 / PRIV-02 | Zgłoszenia i prywatność | M/S | 🟡 nota o danych w formularzu. **Decyzja:** zastąpić Firestore linkiem do GitHub Issues (zero infrastruktury i PII, ale bez zrzutów ekranu i zgłoszeń bez konta GitHub)? Pełny ekran „Dane i prywatność” czeka na tę decyzję |
| UX-01 | Automatyczna kopia lokalna | M | ⬜ wymaga IPC w `electron/main.cjs` — do zrobienia z testem w prawdziwym Electronie |
| SEC-02 | Projekt + spike KDF v2 | — | ⬜ wymaga decyzji projektowej (passphrase vs PIN; klucz odzyskiwania) |
| AI-11 | Lista modeli Gemini (nowe) | S | ⬜ |

## S2 — 2026-11-30 → 12-11
SEC-02 faza 1 (KDF v2 + DEK) · SEC-07 · ARCH-01 spike · AI-02/03/04 · SEC-12/13/14/15/18 · A11Y-02/03/04 · PERF-02/03 · TEST-02 · DATA-01 · UX-02/03 · PRIV-03

## S3–S5 — 12-14 → 2027-01-22 (przerwa świąteczna)
SEC-02 faza 2 · PRIV-01 · AI-01 · AI-05/06/07 · ARCH-01 (protocol handler) · DEVOPS-01/02 · SEC-11/16 · PERF-05 · PRIV-04

## S4+ / backlog
ARCH-02 · ARCH-03 · pozostałe P3

**Kamienie milowe:** M0 koniec S0 · M1 „uczciwe bezpieczeństwo” koniec S2 · M2 „realne zero-knowledge” koniec S5 · M3 „zrównoważona architektura”.
