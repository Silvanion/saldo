# Changelog

Ten plik zawiera historię zmian (repo-level release history).
Wewnątrz aplikacji, treść "Co nowego" jest generowana z pliku `src/content/changelogData.tsx`.

Zasady bazują na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/).

## [v1.6.4] - Wrzesień 2026
### Optymalizacja Wydajności, Bezpieczna Warstwa AI (BYOK: Gemini & Claude) i Nowy Wskaźnik Kondycji Finansowej
- **Bezpieczna warstwa AI (Bring Your Own Key — BYOK)**:
  - Pełne wsparcie dla własnych kluczy API użytkownika dla modeli **Google Gemini** (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`) oraz **Anthropic Claude** (`claude-3-5-sonnet-latest`, `claude-3-5-haiku-latest`, `claude-3-opus-latest`).
  - Bezpieczny magazyn kluczy `SecurityVault`: natywna ochrona z użyciem **macOS Keychain** (`safeStorage` w wersji Electron desktop) oraz `WebCrypto AES-GCM-256` z `PBKDF2` (100 000 iteracji SHA-256) w wersji przeglądarkowej. Surowy klucz API nigdy nie jest zapisywany w postaci jawnej w `localStorage` ani przesyłany do zewnętrznych baz danych.
  - Natychmiastowe zerowanie buforów pamięci RAM (`zeroizeBuffer`) po wykonaniu operacji kryptograficznych.
  - Zabezpieczenie prywatności i minimalizacja danych (`FinancialSummaryContext`): do modeli AI przesyłane są wyłącznie zagregowane wskaźniki miesięczne i podsumowania top 5 kategorii. Żadne numery kont (IBAN), numery PESEL, adresy, nazwiska, tytuły przelewów ani pełna historia transakcji nie są udostępniane modelom.
  - Pełna kontrola nad mutacjami: AI posiada uprawnienia wyłącznie READ-ONLY. Wszelkie sugestie operacji (np. utworzenie reguły, dodanie transakcji) wymagają jawnej akceptacji użytkownika w interfejsie.
  - Lazy loading: kod AI oraz komponenty czatu zostały wydzielone do asynchronicznych chunków (brak narzutu na rozmiar początkowego pakietu aplikacji).
- **Zabezpieczenie Kondycji Finansowej (Financial Health)**:
  - Pusty lub nowo utworzony profil bez historii transakcji zwraca teraz deterministyczny status `INSUFFICIENT_DATA` z wartością `score: null` (wyświetlaną w UI jako neutralny znak `—` i etykieta „Brak wystarczających danych”) zamiast mylącego domyślnego wyniku 83/100.
  - Wyeliminowano fałszywy alert „Niski bufor gotówkowy +1” na profilach bez zarejestrowanych wpływów i wydatków.
  - Prawidłowa obsługa filtrowania i kalkulacji płynności we wszystkich widokach (Dashboard, Financial Story, analiza kondycji).
- **Optymalizacja wydajności i redukcja obciążenia CPU/RAM**:
  - `dataAuditor`: Wprowadzono indeksowanie kubełkowe $O(1)$ dla detekcji duplikatów (redukcja czasu audytu 50 000 transakcji z 5,8 s do 0,33 s — przyspieszenie o 94%).
  - `useDashboardMetrics`: Agregacja 6-miesięcznego wykresu zredukowana do pojedynczego przejścia $O(N)$ z mapą prefiksów oraz algorytm jednoprzebiegowy dla top-4 ostatnich transakcji zamiast pełnego klonowania i sortowania $O(N \log N)$.
  - `budgetCalculations`: Wyeliminowano setki tysięcy niepotrzebnych alokacji obiektów `new Date()` w pętlach kalkulacyjnych na rzecz natywnego dopasowywania prefiksów stringów ISO (`YYYY-MM`).
  - `MortgageProModal`: Dynamiczny import generatora raportów PDF (`lazy loading`), redukujący rozmiar głównego chunka aplikacji.

## [v1.6.3] - Wrzesień 2026
### Odporność parserów bankowych CSV/PDF, eliminacja anomalii i walidacja ciągłości salda
- **Krytyczne usprawnienia parsera CSV (mBank i inne formaty)**:
  - Inteligentne wykrywanie i pomijanie wieloliniowej preambuły bankowej (do 50 wierszy metadanych banku) — wyeliminowano powstawanie fałszywych transakcji z tekstu adresu banku (np. „Skrytka Pocztowa 2108”).
  - Rygorystyczna ochrona przed traktowaniem dat jako kwot (`DATE_AS_AMOUNT`, np. 20260904 jako 20 260 904,00 PLN) oraz odrzucanie numerów rachunków bankowych (NRB/IBAN) i identyfikatorów z pól kwotowych.
  - Precyzyjne wykrywanie separatorów dziesiętnych i tysięcy ze spacjami (`1 234,56 PLN`).
- **Uodpornienie parsera PDF**:
  - Prawidłowe ignorowanie zakresów dat w tytułach przelewów (np. świadczenia ZUS `01.10-04.11.2025` nie generują już fałszywych kwot 1,10 PLN).
  - Automatyczne rozpoznawanie układu tabeli transakcji i kolejności kolumn (Kwota vs Saldo).
  - Rozdzielenie walidacji poprawności transakcji (`VALID`) od ciągłości salda — nierozliczone transakcje kartowe bez salda po operacji (`-`) zachowują pełny status `VALID` zamiast błędnego `VALIDATION_ERROR`.
- **Audytor danych i bezpieczny reimport**:
  - Nowe narzędzia audytorskie (`corruptedDataAuditor`, `reimportAuditor`, `balanceValidator`) umożliwiające bezpieczną inspekcję, diagnostykę rozbieżności oraz podgląd reimportu (Dry-Run) ze źródeł wyciągowych.

## [v1.6.2] - Wrzesień 2026
### Stabilność desktopu (macOS), aktualizacje i poprawki audytu
- **Krytyczne: dane „znikały” po restarcie** — `electron/main.cjs` losował port serwera przy każdym starcie, a IndexedDB/localStorage są izolowane per origin (z portem). Port jest teraz utrwalany w `userData/server-port.json`; przy pierwszym starcie wybierany jest port największej istniejącej bazy (odzyskanie danych). Przy starcie czyszczone są pozostałe service workery/Cache Storage (nie dane).
- **Serwer desktopowy nasłuchuje na `127.0.0.1`** zamiast `0.0.0.0` (API niewidoczne w LAN, brak monitu zapory macOS).
- **Release macOS podpisywany ad-hoc**, gdy brak certyfikatu Developer ID (wcześniej całkowicie niepodpisany → „aplikacja jest uszkodzona” na Apple Silicon).
- **Aktualizacje**: wersja z `package.json` (`__APP_VERSION__`) zamiast `changelogData[0]` (v1.6.1 raportowała się jako 1.6.0); w Electronie pobieranie zawsze przez `electron-updater` (wcześniej .dmg trafiał do pamięci renderera, a instalacja nic nie robiła); `autoDownload` wyłączone, bez podwójnych okien; błędy pobierania przekazywane do UI; na niepodpisanym macOS otwierana jest strona wydania; plik `latest*.yml` nie jest już używany jako suma SHA-256; odpowiedź 304 pokazuje zapamiętane nowsze wydanie.
- **Czat AI**: wysyłany skrócony profil (`src/services/aiChatPayload.ts`), limit body dla `/chat` 150 KB — wcześniej profile >100 transakcji / >20 KB dawały 400/413.
- **CSP**: dodano `https://api.nbp.pl` (kursy walut były blokowane w produkcji).
- **Bezpieczeństwo okien**: `setWindowOpenHandler`/`will-navigate` sprawdzają sparsowany host zamiast podciągu URL; nieznane schematy są blokowane.
- **CI**: naprawiono 41 błędów `tsc` (pola legacy w `AppState` przywrócone jako `@deprecated` dla migracji, typ `onUpdateError`, ścieżka importu `SecurityVault`, test `App.test.tsx`).

## [v1.6.1] - Wrzesień 2026
### Refaktoryzacja i Optymalizacja Kodu (wersja stabilizująca)
- **Naprawiono duplikację pól w typach** — usunięto z `AppState` pola `recurringRules`, `transactionRules`, `smartRules`, `debts`, `debtPayoffScenarios` (pozostają tylko w `Profile`), eliminując ryzyko niespójności danych między profilami.
- **Nowe narzędzie generowania ID** (`src/utils/id.ts`) — funkcja `generateEntityId()` z predefiniowanymi prefiksami (`tx-`, `pay-`, `goal-`, `inv-`, `rule-`, `debt-`, `scenario-`, `set-`, `csv-`, `pdf-`, `heal-`). Wyeliminowano 10+ powtórzonych wzorców `Date.now() + Math.random()` w kodzie.
- **Centralna normalizacja tekstu** (`src/utils/text.ts`) — 3 ujednolicone funkcje: `normalizeText()` (dla deduplikacji, usuwa interpunkcję), `cleanPolishChars()` (dla wyświetlania, zamienia polskie znaki), `normalizeSmartRuleText()` (dla Smart Rules, zachowuje interpunkcję, obsługuje `ł`→`l`).
- **Optymalizacja detekcji duplikatów** — dodano pre-filtrowanie kandydatów (waluta, typ, kwota ±0.01, data ±1.1 dnia) przed kosztowną normalizacją tekstu, redukujące złożoność z O(n²) do O(n) przy dużych profilach.
- **Zaktualizowano 8 plików źródłowych** do używania nowych centralnych narzędzi: `useAppActions`, `useTransactionActions`, `parseCsv`, `parsePdf`, `dataAuditor`, `smartRules`, `duplicateDetector`, `pdfGenerator`.
- Wszystkie 1172 testy przechodzą, CI zielone.

## [v1.6.0] - Wrzesień 2026
### Refaktoryzacja i Optymalizacja Kodu
- **Usunięto duplikowane pola z AppState** — `recurringRules`, `transactionRules`, `smartRules`, `debts`, `debtPayoffScenarios` przeniesiono wyłącznie do `Profile`, eliminując ryzyko niespójności danych.
- **Centralne generowanie ID** (`src/utils/id.ts`) — wyeliminowano 10+ powtórzonych wzorców generowania identyfikatorów. Nowe API: `generateEntityId('transaction')` → `tx-...`, `generateEntityId('payment')` → `pay-...`, itd.
- **Centralna normalizacja tekstu** (`src/utils/text.ts`) — 3 ujednolicone funkcje: `normalizeText()` (dla deduplikacji), `cleanPolishChars()` (dla wyświetlania), `normalizeSmartRuleText()` (dla reguł Smart Rules, z obsługą `ł`→`l`).
- **Zoptymalizowano `duplicateDetector`** — dodano pre-filtrowanie kandydatów (waluta, typ, kwota ±0.01, data ±1.1 dnia) redukujące złożoność z O(n²) do O(n) przy dużych profilach.
- **Zaktualizowano 8 plików źródłowych** do używania nowych centralnych narzędzi: `useAppActions`, `useTransactionActions`, `parseCsv`, `parsePdf`, `dataAuditor`, `smartRules`, `duplicateDetector`, `pdfGenerator`.
- Wszystkie 1172 testy przechodzą.

## [v0.8.7] - Lipiec 2026
### Ochrona Rezerw i Bezpieczny Import Transakcji
- Blokada usuwania celów oszczędnościowych ze zgromadzonymi środkami (saved > 0) chroniąca rezerwy finansowe.
- Automatyczna detekcja duplikatów i deduplikacja podczas wielokrotnego importu plików CSV.
- Filtrowanie uszkodzonych wartości numerycznych (NaN) przy wprowadzaniu i imporcie transakcji.
- Ścisłe typowanie wskaźników oraz danych wykresów w panelu głównym (Dashboard Metrics).

## [v0.8.6] - Lipiec 2026
### Izolacja Profilowa i Bezpieczeństwo Danych
- Pełna izolacja reguł cyklicznych i reguł transakcji dla każdego profilu (osobistego i wspólnego).
- Gwarancja braku wycieków danych finansowych przy przełączaniu profili.
- Ścisła walidacja typów w czasie rzeczywistym (Type Guards) oraz ochrona przed uszkodzonymi danymi.
- Idempotentne i bezpieczne procedury migracji bazy danych i pamięci podręcznej.

## [v0.8.5] - Lipiec 2026
### Rozliczenia i Budżet Wspólny
- Automatyczne wyliczanie salda rozliczeń między partnerami (kto komu jest winien).
- Możliwość oznaczania, kto opłacił dany wydatek (Ja, Partner, Wspólne/50-50).
- Nowe filtry list transakcji i nadchodzących opłat według osoby płacącej.
- Wyraźne oznaczanie profili wspólnych w interfejsie aplikacji.

## [v0.8.4] - Lipiec 2026
### PWA i Bezpieczna Praca Offline
- Aplikacja jako PWA (Progresywna Aplikacja Internetowa) - możliwość instalacji na ekranie głównym.
- Pełne wsparcie dla trybu offline z lokalnym cache.
- Ostrzeżenia o braku połączenia sieciowego podczas zapisu.
- Zoptymalizowany manifest i service worker do przechowywania interfejsu (app shell).

## [v0.8.3] - Lipiec 2026
### Synchronizacja w Chmurze i Dysku
- Integracja z Firebase Firestore dla bezpiecznej synchronizacji profili.
- Kopie zapasowe na koncie Google Drive z separacją uprawnień OAuth.
- Zautomatyzowane konflikty zapisów pomiędzy urządzeniami.
- Zabezpieczenia przed błędami dostępu (401/403/404) z Google Drive.

## [v0.8.2] - Czerwiec 2026
### Profile Bezpieczne PIN i Detekcja Duplikatów
- Szyfrowanie profili kodem PIN za pomocą AES-GCM.
- Bezpieczny magazyn kluczy, zapobiegający wyciekom danych finansowych w przeglądarce.
- Inteligentna detekcja duplikatów dla cyklicznych oraz importowanych transakcji.
- Mechanizmy automatycznego czyszczenia pamięci po wylogowaniu.

## [v0.8.1] - Maj 2026
### Kategoryzacja AI i Zaawansowane Budżety
- Asystent AI analizujący płatności i sugerujący kategorie za pomocą modelu Gemini.
- Funkcja eksportu i importu z/do CSV do integracji z bankami.
- Rozbudowany podział wydatków i cele oszczędnościowe.
- Limitery i procentowe wskaźniki użycia budżetów.

## [v0.8.0] - Kwiecień 2026
### Pierwsze Wydanie
- Uruchomienie podstawowego silnika zarządzania transakcjami.
- Logowanie kontem Google.
- Główny dashboard ze wskaźnikami dziennymi.
