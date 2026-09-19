# Changelog

Ten plik zawiera historię zmian (repo-level release history).
Wewnątrz aplikacji, treść "Co nowego" jest generowana z pliku `src/content/changelogData.tsx`.

Zasady bazują na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/).

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
