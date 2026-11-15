<div align="center">

<img src="public/pwa-512x512.png" alt="Saldo Logo" width="100" height="100">

# Saldo

**Prywatne finanse osobiste i domowe — w 100% lokalne, z aplikacją mobilną (Expo), silnikiem domenowym `@saldo/core` i doradcą AI pod Twoją kontrolą.**

[![Wydanie](https://img.shields.io/badge/wersja-v1.6.7-137566?style=for-the-badge&logo=github)](https://github.com/Silvanion/saldo/releases/latest)
[![CI Pipeline](https://img.shields.io/github/actions/workflow/status/Silvanion/saldo/ci.yml?branch=main&label=CI&style=for-the-badge&logo=githubactions)](https://github.com/Silvanion/saldo/actions/workflows/ci.yml)
[![Platformy](https://img.shields.io/badge/platformy-macOS%20%7C%20Windows%20%7C%20iOS%20%7C%20Android%20%7C%20Web-blue?style=for-the-badge)](https://github.com/Silvanion/saldo/releases/latest)
[![Prywatność](https://img.shields.io/badge/architektura-local--first%20%7C%20zero--cloud-green?style=for-the-badge)](SECURITY_AUTH_PRIVACY.md)

<br>

[Pobierz aplikację](#-pobierz-i-zainstaluj) · [Nowości w v1.6.7](#-nowości-w-wersji-167) · [Kluczowe funkcje](#-kluczowe-funkcje) · [Import z banków](#-import-wyciągów-bankowych) · [Architektura](#-architektura-i-deweloperzy)

<br>

<img src="public/assets/help/02-dashboard.png" alt="Pulpit Saldo — bilans miesiąca, kondycja finansowa i prognoza" width="950" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">

</div>

---

## 💡 Dlaczego Saldo?

Większość aplikacji finansowych wymaga połączenia z bankiem przez zewnętrznych pośredników, zakłada konta w chmurze i handluje zagregowanymi danymi użytkowników. **Saldo powstało w opozycji do tego modelu.**

| Filar | Jak to działa w Saldo? |
| :--- | :--- |
| 🛡️ **100% Local-First & Zero-Cloud** | Dane finansowe należą wyłącznie do Ciebie. Zapisywane są lokalnie w szyfrowanej bazie IndexedDB (desktop/web) oraz SQLite WAL (mobile). Żadne konto nie jest wymagane do startu. |
| 📱 **Ekosystem Mobile + Desktop** | Jedno spójne doświadczenie: natywna aplikacja desktopowa (macOS, Windows), PWA oraz nowoczesna aplikacja mobilna (iOS & Android via Expo) z natywną biometrią Face ID / Touch ID. |
| 🧠 **Współdzielony silnik domenowy** | Pakiet `@saldo/core` gwarantuje identyczne, deterministyczne wyliczenia hipoteki, podatków 2026 i budżetu na każdej platformie, bez zależności od środowiska wykonawczego. |
| 🤖 **Prywatne AI na Twoich warunkach** | Doradca finansowy AI działa w 100% lokalnie przez **Ollama** (żaden bajt nie opuszcza Twojego urządzenia) lub z Twoim własnym kluczem Gemini / Claude zapisanym w systemowym Keychain/Keystore. |
| 🇵🇱 **Polskie banki i Podatki B2B 2026** | Dedykowane parsery Alior Bank, Zen oraz uniwersalny parser CSV z detekcją przelewów wewnętrznych. Aktualny kalkulator rezerw podatkowych 2026 (ZUS, zdrowotna, ryczałt, liniowy, skala). |

---

## 🚀 Nowości w wersji 1.6.7

- 📱 **Monorepo i Saldo Mobile (Expo SDK 52 / React Native):**
  - Nowa aplikacja mobilna w `packages/mobile` z obsługą iOS, Android i podglądu Web.
  - Szybkie dodawanie wydatków (Quick Add) w 3 sekundy z haptyczną informacją zwrotną.
  - Zabezpieczenie biometryczne (Face ID / Touch ID / BiometricPrompt) oraz szyfrowany PIN w bezpiecznej enklawie (`SecureStore`).
  - Baza danych SQLite w trybie wysokiej wydajności WAL (`expo-sqlite`).
- 🧩 **Pakiet rdzenia domenowego (`@saldo/core`):**
  - Wyodrębnienie czystej logiki finansowej do `packages/core` — podatki 2026, algorytmy spłaty zadłużenia (Kula śnieżna, Lawina), MortgagePro LTV oraz parsery bankowe.
- 🇵🇱 **Aktualizacja stawek podatkowych 2026:**
  - Nowe oficjalne parametry ZUS i składki zdrowotnej GUS dla jednoosobowych działalności gospodarczych (JDG).
- ⚡ **Optymalizacje stabilności:**
  - Czas wykonania 138 plików testowych (1312 testów) zredukowany do ~50 sekund.

---

## 📸 Przegląd modułów aplikacji

<table width="100%">
<tr>
<td width="50%" valign="top">
  <h3>📊 Pulpit i Budżet 50/30/20</h3>
  <p>Kompleksowy przegląd kondycji finansowej, prognoza do końca miesiąca, bezpieczna kwota do wydania (Safe-to-Spend) oraz dynamiczny podział budżetu wg zasady 50/30/20 (Potrzeby / Zachcianki / Oszczędności).</p>
  <img src="public/assets/help/08-budget.png" alt="Budżet i limity" width="100%" style="border-radius: 8px;">
</td>
<td width="50%" valign="top">
  <h3>💳 Historia Transakcji & Szybkie Dodawanie</h3>
  <p>Błyskawiczne dodawanie wydatków za pomocą skrótów klawiszowych lub palety poleceń (<code>Cmd+K</code>). Normalizacja polskich znaków diakrytycznych, autokategoryzacja oraz filtry zaawansowane.</p>
  <img src="public/assets/help/06-transactions.png" alt="Transakcje" width="100%" style="border-radius: 8px;">
</td>
</tr>
<tr>
<td width="50%" valign="top">
  <h3>🏠 Kredyty i Hipoteka Pro</h3>
  <p>Symulator nadpłat, test warunków skrajnych KNF (+100 do +400 pb.), harmonogramy rat malejących i równych, symulacje wakacji kredytowych oraz bieżący monitoring wskaźnika LTV.</p>
  <img src="public/assets/help/10-debts.png" alt="Moduł Hipoteka Pro" width="100%" style="border-radius: 8px;">
</td>
<td width="50%" valign="top">
  <h3>⚡ Strategie Spłaty Zobowiązań</h3>
  <p>Wizualne porównanie strategii Kuli Śnieżnej (najmniejszy dług najpierw) oraz Lawiny (najwyższy procent najpierw). Oszczędność na odsetkach i symulacja przyspieszenia wolności finansowej.</p>
  <img src="public/assets/help/14-debts-strategies.png" alt="Strategie spłaty" width="100%" style="border-radius: 8px;">
</td>
</tr>
<tr>
<td width="50%" valign="top">
  <h3>🤖 Doradca Finansowy AI</h3>
  <p>Kontekstowy asystent finansowy oparty o rzeczywiste dane z Twojego budżetu. Wsparcie dla modeli lokalnych (Ollama) oraz chmurowych (Gemini / Claude). AI może przygotować i wdrożyć plan redukcji kosztów.</p>
  <img src="public/assets/help/05-ai-chat.png" alt="Doradca AI" width="100%" style="border-radius: 8px;">
</td>
<td width="50%" valign="top">
  <h3>📈 Analizy, Trendy i Majątek Netto</h3>
  <p>Struktura wydatków, trendy miesięczne i roczne, weryfikator płynności oraz monitorowanie majątku netto (aktywa płynne, nieruchomości, inwestycje vs. zobowiązania).</p>
  <img src="public/assets/help/11-analysis.png" alt="Analiza finansowa" width="100%" style="border-radius: 8px;">
</td>
</tr>
</table>

---

## 🏦 Import wyciągów bankowych

Saldo posiada wbudowany silnik inteligentnego przetwarzania wyciągów bankowych z automatyczną deduplikacją w czasie $O(n)$:

| Bank / Źródło | Obsługiwany format | Status parsera | Cechy specjalne |
| :--- | :--- | :---: | :--- |
| **Alior Bank** | CSV, PDF | Dedykowany | Identyczne sumy kontrolne dla CSV i PDF, obsługa kodowania Windows-1250 i UTF-8. |
| **Zen.com** | CSV, PDF | Dedykowany | Weryfikacja salda początkowego i końcowego, automatyczna detekcja walut. |
| **mBank / PKO / ING** | CSV | Uniwersalny | Interaktywny kreator mapowania kolumn z natychmiastowym podglądem. |
| **Inne banki** | PDF (tekstowy) | Eksperymentalny | Parsowanie lokalne przez bibliotekę PDF.js bez wysyłania plików na serwer. |

> [!NOTE]
> **Bezpieczeństwo importu:** Wyciągi bankowe są parsowane **wyłącznie w przeglądarce / procesie lokalnym**. Przed zatwierdzeniem transakcji użytkownik ma pełny wgląd w podgląd operacji oraz oznaczenia transferów wewnętrznych (np. spłata karty, zasilenie konta oszczędnościowego).

---

## 📦 Pobierz i zainstaluj

Wszystkie oficjalne paczki instalacyjne są dostępne w sekcji **[Releases](https://github.com/Silvanion/saldo/releases/latest)**:

| Platforma | Wariant | Plik instalacyjny |
| :--- | :--- | :--- |
| **macOS** | Apple Silicon (M1/M2/M3/M4/M5) | `Saldo-1.6.7-arm64.dmg` |
| **macOS** | Procesory Intel | `Saldo-1.6.7.dmg` |
| **Windows** | Instalator | `Saldo-Setup-1.6.7.exe` |
| **Windows** | Wersja Portable (bez instalacji) | `Saldo-1.6.7-portable.exe` |
| **Web / PWA** | Przeglądarka internetowa | Dostępna w trybie offline jako aplikacja PWA |
| **Mobile** | iOS & Android | Kod źródłowy w `packages/mobile` (Expo SDK 52) |

---

## 🛠️ Architektura i deweloperzy

Projekt jest zorganizowany jako wydajne monorepo:

```
saldo/
├── packages/
│   ├── core/            # @saldo/core: Czysta logika biznesowa, finanse, podatki, parsery (0 zależności UI)
│   └── mobile/          # Saldo Mobile: Expo SDK 52, React Native 0.76, Expo Router v4, SQLite WAL
├── src/                 # Aplikacja Desktop / Web: React 19, Vite, Tailwind CSS v4, Lucide
├── electron/            # Główny proces Electrona, tray, auto-updater, integracja z OS
└── server.ts            # Wbudowany lokalny serwer Express 5 dla środowiska desktopowego
```

### ⚡ Wymagania środowiskowe
- **Node.js:** `^22.0.0` (zalecany Node 22 LTS)
- **npm:** `^10.0.0`

### 💻 Szybki start deweloperski

1. **Sklonuj repozytorium i zainstaluj zależności:**
   ```bash
   git clone https://github.com/Silvanion/saldo.git
   cd saldo
   npm ci
   cp .env.example .env
   ```

2. **Uruchom wersję webową (Vite + Express):**
   ```bash
   npm run dev
   # Aplikacja dostępna pod adresem: http://localhost:3000
   ```

3. **Uruchom aplikację mobilną (Expo):**
   ```bash
   cd packages/mobile
   npm run web          # Podgląd w przeglądarce: http://localhost:8081
   # lub:
   npx expo start       # Kod QR do zeskanowania w aplikacji Expo Go
   ```

4. **Uruchom aplikację desktopową (Electron):**
   ```bash
   npm run dev:desktop
   ```

### 🧪 Testy i jakość kodu

Repozytorium utrzymuje 100% dyscyplinę testową:
```bash
npm run lint         # Sprawdzenie typów TypeScript we wszystkich modułach (0 błędów)
npm test -- --run    # 138 plików testowych Vitest (1312 testów jednostkowych/integracyjnych)
npm run test:e2e     # Kompleksowe testy E2E Playwright
npm run build        # Produkcyjny build aplikacji web i serwera
```

---

## 🔒 Bezpieczeństwo i prywatność

Szczegółowy opis polityki przetwarzania danych i architektury kryptograficznej znajdziesz w dokumencie:
📄 **[SECURITY_AUTH_PRIVACY.md](SECURITY_AUTH_PRIVACY.md)**

* **Brak telemetrii komercyjnej:** Zero trackerów Google Analytics, Meta Pixel czy zewnętrznych skryptów śledzących.
* **Szyfrowanie bazy danych:** Opcjonalny klucz AES-GCM derywowany z PIN-u za pomocą PBKDF2/Argon2.
* **Odporność na awarie zasilania:** Transakcyjny zapis bazy SQLite (WAL) na telefonie i atomowe aktualizacje profili na desktopie.

---

## 📄 Licencja & Autor

* **Autor:** Seweryn Pawłowski ([Silvanion](https://github.com/Silvanion))
* **Kod źródłowy:** Projekt o otwartym kodzie źródłowym.
* **Zgłaszanie uwag:** [GitHub Issues](https://github.com/Silvanion/saldo/issues) lub dedykowany formularz w aplikacji.
