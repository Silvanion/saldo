# Saldo

[![Najnowsze wydanie](https://img.shields.io/github/v/release/Silvanion/saldo?label=wydanie)](https://github.com/Silvanion/saldo/releases/latest)
[![CI](https://github.com/Silvanion/saldo/actions/workflows/ci.yml/badge.svg)](https://github.com/Silvanion/saldo/actions/workflows/ci.yml)
![Platformy](https://img.shields.io/badge/platformy-macOS%20%7C%20Windows%20%7C%20Web-137566)

Lokalna, prywatna aplikacja do zarządzania finansami osobistymi i domowymi — budżet, płatności cykliczne, cele oszczędnościowe, portfel długów (w tym Kredyt Hipoteczny Pro) i doradca AI działający lokalnie (Ollama). Startuje w 100% offline, bez wymuszania logowania Google/e-mail — synchronizacja w chmurze jest w pełni opcjonalna. Dostępna jako aplikacja webowa (PWA) oraz natywna aplikacja desktopowa na macOS i Windows.

![Pulpit Saldo](public/assets/help/02-dashboard.png)

## Pobierz

Najnowsza wersja: **[GitHub Releases → Latest](https://github.com/Silvanion/saldo/releases/latest)**

| System | Plik |
| --- | --- |
| macOS — Apple Silicon (M1–M4) | `Saldo-<wersja>-arm64.dmg` |
| macOS — Intel | `Saldo-<wersja>.dmg` |
| Windows — instalator | `Saldo.Setup.<wersja>.exe` |
| Windows — wersja przenośna | `Saldo.<wersja>.exe` |

### Pierwsze uruchomienie na macOS

Wydania nie są jeszcze notaryzowane przez Apple (podpis ad-hoc), dlatego przy pierwszym otwarciu macOS pokaże ostrzeżenie. Otwórz **Ustawienia systemowe → Prywatność i ochrona**, w sekcji *Ochrona* kliknij **„Otwórz mimo to”** przy Saldo — wystarczy raz. Z tego samego powodu aktualizacje na macOS instaluje się ręcznie: aplikacja informuje o nowej wersji i otwiera stronę wydania. Na Windows aktualizacje instalują się automatycznie.

## Funkcje

- **Local-First od pierwszego uruchomienia** — kreator onboardingu tworzy lokalny profil (nazwa, wektorowy awatar, waluta, opcjonalny PIN) bez konta Google czy e-maila; logowanie w chmurze jest dostępne później, wyłącznie w Ustawieniach, jako opcja.
- **Pulpit** — bieżący bilans, trendy wydatków, skrócony przegląd nadchodzących płatności i celów.
- **Transakcje i budżet** — kategorie z limitami, import wyciągów (CSV/PDF, w tym mBank), wykrywanie duplikatów.
- **Płatności cykliczne** — przypomnienia o terminach, natywne powiadomienia systemowe.
- **Cele oszczędnościowe** — śledzenie postępu, scenariusze dojścia do celu.
- **Portfel długów** — strategie spłaty (lawina/kula śnieżna), Kredyt Hipoteczny Pro (test warunków skrajnych KNF, wakacje kredytowe, raty malejące, monitoring LTV).
- **Doradca AI (lokalny, Ollama)** — czat uziemiony w deterministycznym silniku finansowym aplikacji, może zaproponować i zapisać konkretny plan działania.
- **Synchronizacja** — kopia zapasowa i synchronizacja przez Google Drive, eksport/import JSON.
- **Bezpieczeństwo** — szyfrowanie profilu kluczem z PIN-u, prawdziwe odblokowanie Touch ID / Windows Hello (Keychain/DPAPI) na desktopie — dostępne od razu w kreatorze onboardingu i w ekranie wyboru profilu, automatyczna blokada po zablokowaniu ekranu.

### Aplikacja desktopowa (Electron)

- Aktualizacje przez `electron-updater` — powiadomienie w aplikacji, pobranie dopiero po potwierdzeniu, ręczne sprawdzanie z menu i z widoku "Historia Zmian". Na macOS bez notaryzacji — przekierowanie do strony wydania.
- Podpisywanie kodu w CI: Developer ID + notaryzacja (macOS) i code-signing (Windows) po dodaniu sekretów; bez nich build macOS jest podpisywany ad-hoc.
- Ikona w tray z szybkim dodawaniem wydatku, dock badge, natywne powiadomienia, autostart z systemem.
- Zapamiętywanie rozmiaru/pozycji okna, natywne okna dialogowe zapisu/odczytu kopii zapasowej.
- Natywne menu kontekstowe (Wytnij/Kopiuj/Wklej, podpowiedzi pisowni) na każdym polu tekstowym, branded panel "O Programie".
- Przeciąganie wyciągu (CSV/PDF) z Findera/Eksploratora bezpośrednio na okno lub ikonę Docka/paska zadań — automatycznie otwiera import, nawet gdy aplikacja jeszcze go nie pokazuje.

Pełna lista i status wdrożenia: [TODO_DESKTOP.md](TODO_DESKTOP.md).

### Architektura desktopu

Aplikacja Electron uruchamia wbudowany serwer Express (`dist/server.cjs`) wyłącznie na `127.0.0.1` i ładuje interfejs z `http://localhost:<port>`. Dane użytkownika trzymane są w IndexedDB/localStorage, które są izolowane per origin — dlatego port jest wybierany raz i zapisywany w `userData/server-port.json` (macOS: `~/Library/Application Support/saldo-app/`), aby origin, a więc i dane, był stały między uruchomieniami. Logi: `~/Library/Logs/saldo-app/main.log` (macOS), `%APPDATA%\saldo-app\logs` (Windows).

## Stos technologiczny

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts
- **Backend**: Express 5, uruchamiany zarówno jako serwer webowy, jak i embedded w aplikacji Electron
- **Dane**: Firebase (Auth, Firestore) + lokalny cache offline
- **Desktop**: Electron, electron-builder, electron-updater
- **Testy**: Vitest (testy jednostkowe/integracyjne), Playwright (E2E)

## Szybki start

### Wymagania
- Node.js ≥ 22 (rekomendowane: 22 LTS)
- npm ≥ 10

```bash
# opcjonalnie przez nvm
nvm install
nvm use

npm ci
cp .env.example .env   # uzupełnij własnymi kluczami/konfiguracją
```

### Uruchomienie w trybie deweloperskim

```bash
npm run dev              # aplikacja webowa (Vite + Express) pod http://localhost
npm run dev:desktop      # to samo, opakowane w okno Electron
```

## Skrypty npm

| Skrypt | Opis |
| --- | --- |
| `npm run dev` | Serwer deweloperski (web) |
| `npm run build` | Build produkcyjny (frontend + embedded server) |
| `npm run start` | Uruchomienie zbudowanej wersji produkcyjnej |
| `npm run lint` | Sprawdzenie typów (`tsc --noEmit`) |
| `npm run test` | Testy jednostkowe/integracyjne (Vitest) |
| `npm run test:e2e` | Testy E2E (Playwright) |
| `npm run dev:desktop` | Aplikacja desktopowa w trybie deweloperskim |
| `npm run build:desktop` | Pakowanie aplikacji desktopowej na bieżącą platformę |
| `npm run build:desktop:all` | Pakowanie na macOS i Windows |
| `npm run release:desktop` | Build + publikacja wydania (GitHub Releases) |

## Wydanie aplikacji desktopowej

1. Podbij wersję (`npm version <x.y.z> --no-git-tag-version`) i dodaj wpis w [CHANGELOG.md](CHANGELOG.md) oraz `src/content/changelogData.tsx` (widok "Co nowego" w aplikacji). Wersję widoczną w aplikacji wyznacza `package.json`.
2. Po scaleniu do `main` wypchnij tag `v*` (np. `git tag -a v1.6.2 -m "Saldo v1.6.2" && git push origin v1.6.2`).
3. [.github/workflows/release-desktop.yml](.github/workflows/release-desktop.yml) buduje macOS (arm64 + x64) i Windows, tworzy **szkic** wydania i dołącza artefakty wraz z `latest*.yml` dla auto-aktualizacji.
4. Uzupełnij opis i opublikuj szkic — dopiero opublikowane wydanie widzą aplikacje sprawdzające aktualizacje.

Podpisywanie: z sekretami `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` build macOS jest podpisywany Developer ID i notaryzowany (pełne auto-aktualizacje, brak ostrzeżeń Gatekeepera); bez nich — podpis ad-hoc. Windows: `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`.

## Dokumentacja

- [Design.md](Design.md) — system projektowy i decyzje UI
- [SECURITY_AUTH_PRIVACY.md](SECURITY_AUTH_PRIVACY.md) — model bezpieczeństwa, autoryzacja, prywatność
- [PERFORMANCE.md](PERFORMANCE.md) — uwagi o wydajności
- [RELEASE_QA_CHECKLIST.md](RELEASE_QA_CHECKLIST.md) — lista kontrolna przed wydaniem
- [CHANGELOG.md](CHANGELOG.md) — historia zmian
- [TODO_DESKTOP.md](TODO_DESKTOP.md) — status funkcji specyficznych dla desktopu

## Status

Projekt rozwijany prywatnie, kod publicznie dostępny. Zgłoszenia błędów: [Issues](https://github.com/Silvanion/saldo/issues) lub formularz "Zgłoś błąd" w aplikacji.
