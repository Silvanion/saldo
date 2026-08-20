# Release Checklist i QA — Saldo

## Cel dokumentu

Ten dokument porządkuje proces wydania aplikacji **Saldo** po ostatniej serii patchy dotyczących performance, E2E smoke coverage, resilience i accessibility. Projekt używa Vite 6, React 19, Playwright, Vitest oraz PWA, a standardowe skrypty w repo to `dev`, `build`, `start`, `clean`, `lint`, `test` i `test:e2e`.

Aktualny stan repo po ostatnich zmianach obejmuje m.in. commity dla wydajności (`faaf478`), rozszerzenia smoke testów (`8e1f02b`), hardeningu resilience (`13f2e1c`) oraz domknięcia a11y/UX consistency (`2059821`).

## Zakres wydania

To wydanie powinno być traktowane jako release stabilizujący jakość produktu, a nie release funkcjonalny. Główne obszary objęte zmianami to: optymalizacja initial bundle, lazy loading wtórnych widoków i modali, rozszerzenie smoke testów E2E, poprawa recovery states, oraz ujednolicenie async fallbacków i semantyki a11y.

Dodatkowo repo posiada osobną dokumentację bezpieczeństwa i prywatności w `SECURITY_AUTH_PRIVACY.md`, która już zawiera opis modelu auth, client-side encryption, PIN lock, auto-lock, resetu urządzenia i usuwania konta.

## Release checklist

### 1. Gate przed merge/release

- [ ] Branch release nie ma lokalnych zmian i `git status` jest czysty.
- [ ] Release jest oparty co najmniej o commit `3732bf7 fix(theme): improve dark mode contrast system tokens and native control integration`.
- [ ] Nie ma niezamierzonych zmian w `server.ts`, `firestore.rules`, auth flow ani persistence layer.
- [ ] Jeśli release zawiera zmiany security/privacy, porównano je z zakresem opisanym w `SECURITY_AUTH_PRIVACY.md`.

### 2. Walidacja automatyczna

Uruchom w repo root:

```bash
npx tsc --noEmit
npm run lint
npm test -- --run
npm run test:e2e
npm run build
```

Kryteria zaliczenia:
- [ ] Typecheck przechodzi bez błędów.
- [ ] Lint przechodzi bez błędów; w tym repo `lint` jest zmapowany na `tsc --noEmit`.
- [ ] Testy Vitest przechodzą w całości.
- [ ] Testy Playwright smoke przechodzą w całości; katalog `e2e/` zawiera `a11y.spec.ts`, `business.spec.ts`, `lazy-loading.spec.ts`, `security.spec.ts` i `smoke.spec.ts`.
- [ ] Build produkcyjny przechodzi i generuje bundle klienta oraz `dist/server.cjs`.

### 3. Smoke manualny po buildzie

Sprawdź ręcznie na desktopie i mobile:

- [ ] Aplikacja startuje poprawnie z ekranu wejścia.
- [ ] Tryb offline / lokalny jest osiągalny i nie blokuje podstawowej pracy.
- [ ] Da się utworzyć profil testowy i wejść do głównego shellu aplikacji.
- [ ] Nawigacja po kluczowych widokach działa: Dashboard, Transactions, Payments, Budget, Goals, Analysis, Settings, Help.
- [ ] Lazy-loaded komponenty otwierają się z widocznym fallbackiem i nie pokazują pustego ekranu.
- [ ] Komunikaty błędów i statusów są czytelne, nie duplikują się i mają sensowną akcję odzyskiwania tam, gdzie retry jest bezpieczny.

### 4. QA funkcjonalne

#### Transakcje i płatności

- [ ] Dodanie transakcji działa poprawnie.
- [ ] Edycja transakcji działa poprawnie.
- [ ] Dodanie płatności działa poprawnie.
- [ ] Zmiany pojawiają się w odpowiednich widokach i nie powodują oczywistych rozjazdów stanu.

#### Budżet i cele

- [ ] Zapis limitów budżetowych działa poprawnie.
- [ ] Widok Goals renderuje cele, stany puste i historię wpłat bez regresji wizualnej.
- [ ] Import CSV otwiera modal poprawnie i daje się bezpiecznie anulować.

#### Analysis i PDF

- [ ] Widok Analysis otwiera się poprawnie.
- [ ] Eksport PDF działa w warunkach nominalnych.
- [ ] Przy wymuszonej awarii eksportu użytkownik dostaje czytelny komunikat błędu zamiast cichego faila.

### 5. QA bezpieczeństwa i prywatności

Ta sekcja powinna być wykonywana z odwołaniem do istniejącej dokumentacji security. Aplikacja używa hybrydowego auth, szyfrowania po stronie klienta dla profili PIN, owner-only access w Firestore oraz procedur resetu urządzenia i usuwania konta opisanych w `SECURITY_AUTH_PRIVACY.md`.

- [ ] Rejestracja i logowanie email/hasło działają poprawnie.
- [ ] Flow „Zapomniałem hasła” działa poprawnie.
- [ ] Weryfikacja email po rejestracji działa poprawnie, jeśli środowisko release to obejmuje.
- [ ] PIN lock działa poprawnie dla profilu zabezpieczonego PIN-em.
- [ ] Po 5 błędnych próbach działa czasowa blokada PIN.
- [ ] Auto-lock działa zgodnie z konfiguracją czasu bezczynności.
- [ ] Zmiana hasła działa poprawnie dla kont hasłowych.
- [ ] Zmiana adresu email działa poprawnie z flow potwierdzenia.
- [ ] „Wyloguj z chmury” nie usuwa lokalnych danych budżetu/profili, jeśli taki jest oczekiwany scenariusz.
- [ ] „Zresetuj Saldo na tym urządzeniu” wykonuje wyłącznie lokalny wipe i wymaga świadomego potwierdzenia.
- [ ] Trwałe usunięcie konta jest testowane wyłącznie w dedykowanym, świadomie uruchamianym scenariuszu live; nie należy wykonywać go jako zwykłego smoke testu.

### 6. QA dostępności i UX

- [ ] Skip link działa z klawiatury.
- [ ] Krytyczne modale zachowują focus trap i zamykają się `Escape`, jeśli nie są destrukcyjnym wyjątkiem.
- [ ] Wszystkie icon-only buttons mają zrozumiałe polskie `aria-label`.
- [ ] Formularze mają poprawne powiązania `label` ↔ `input/select`.
- [ ] Stany ładowania używają widocznych fallbacków zamiast `fallback={null}`.
- [ ] Błędy krytyczne są anonsowane jako alerty, a stany informacyjne jako statusy.
- [ ] Widoki są używalne na 375px i 390px bez obciętych kluczowych CTA.

### 7. QA resilience i recovery

- [ ] Render/lazy-load failure nie kończy aplikacji białym ekranem; fallback `ErrorBoundary` jest widoczny i zrozumiały.
- [ ] Retry jest dostępny tylko tam, gdzie jest bezpieczny dla odczytu.
- [ ] Operacje zapisu nie retryują się automatycznie w sposób mogący zdublować dane.
- [ ] Banery błędów API/sync mają sensowny komunikat i nie blokują całej aplikacji bardziej niż to konieczne.
- [ ] Toasty nie stackują identycznych komunikatów błędów.

## Macierz QA

| Obszar | Co sprawdzić | Typ | Status |
|---|---|---|---|
| Build pipeline | `tsc`, `lint`, `test`, `test:e2e`, `build` | Auto | [ ] |
| App bootstrap | Start app, offline entry, profile bootstrap | Manual + E2E | [ ] |
| Navigation | 8 głównych widoków | Manual + E2E | [ ] |
| Core business | Add/edit transaction, add payment | Manual + E2E | [ ] |
| Budget/Goals | Budget planning, goals, CSV import cancel | Manual + E2E | [ ] |
| Analysis | PDF export success/failure UX | Manual + unit | [ ] |
| Security | Login, PIN, auto-lock, password/email change | Manual + unit | [ ] |
| Privacy | Cloud logout, local reset confirm, account deletion live | Manual | [ ] |
| Accessibility | Keyboard, dialogs, labels, status/alert roles | Manual + E2E | [ ] |
| Resilience | ErrorBoundary, retry, offline/error states | Manual + unit + E2E | [ ] |

## Minimalny scenariusz QA przed release

Jeśli potrzeba szybkiego go/no-go, minimalny pakiet powinien obejmować:

1. `npx tsc --noEmit`
2. `npm test -- --run`
3. `npm run test:e2e`
4. `npm run build`
5. Manualny smoke: bootstrap profilu, add transaction, add payment, Budget, Goals, Analysis/PDF, Settings/Security, Help.

To minimum jest uzasadnione tym, że repo ma obecnie rozbudowany zestaw testów: 64 pliki testowe i około 483 dopasowań `it/test/describe`, co wskazuje na szerokie pokrycie automatyczne, ale nie zastępuje manualnego smoke dla release candidate.

## Kryteria Go / No-Go

### Go

- wszystkie komendy walidacyjne przechodzą,
- smoke E2E jest zielony,
- build produkcyjny jest zielony,
- nie ma krytycznych regresji w auth, PIN, offline/local mode, transakcjach, płatnościach, budżecie i PDF,
- manualny smoke nie ujawnia blokera UX lub danych.

### No-Go

- biały ekran, crash lub broken lazy-load bez recovery,
- nieprzechodzący `npm run build`, `npm test`, `npm run test:e2e` lub typecheck,
- regresja w loginie, PIN, local reset albo flow transakcji/płatności,
- ryzyko duplikacji zapisów po retry,
- niejasne lub mylące komunikaty błędów przy operacjach krytycznych.

## Rekomendowana struktura artefaktów release

- `README.md` — onboarding techniczny projektu.
- `SECURITY_AUTH_PRIVACY.md` — referencyjna dokumentacja security/privacy.
- `RELEASE_QA_CHECKLIST.md` — ten dokument.
