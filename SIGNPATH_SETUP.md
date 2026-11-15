# Instrukcja konfiguracji SignPath Foundation dla Saldo (Windows Code Signing)

SignPath Foundation oferuje darmowe certyfikaty i usługę podpisywania kodu dla zweryfikowanych projektów open-source.

---

## 1. Wymagania wstępne (Spełnione w repozytorium)
- [x] **Licencja Open Source:** W repozytorium znajduje się kanoniczny plik `LICENSE` (GNU AGPL v3.0) oraz pole `"license": "AGPL-3.0-only"` w `package.json`.
- [x] **Publisher Name:** W `package.json` (`build.win.publisherName`) ustawiono `"SignPath Foundation"`, co zapewnia zgodność weryfikacji aktualizacji przez `electron-updater`.
- [x] **Synchronizacja Manifestu:** Przygotowano skrypt `scripts/update-windows-manifest.mjs`, który automatycznie przelicza sumy SHA-512 i rozmiary plików po ich podpisaniu w chmurze SignPath.
- [x] **Workflow GitHub Actions:** Zaktualizowano `.github/workflows/release-desktop.yml` o automatyczną wysyłkę artefaktów `.exe` do podpisu.

---

## 2. Rejestracja projektu w SignPath Foundation

1. Przejdź na stronę: [https://signpath.org/](https://signpath.org/) i kliknij **Apply for free open source signing**.
2. Wypełnij formularz zgłoszeniowy:
   - **Project Name:** Saldo
   - **Repository URL:** `https://github.com/Silvanion/saldo`
   - **License:** GNU Affero General Public License v3.0 (AGPL-3.0-only)
   - **Description:** Nowoczesna aplikacja do zarządzania finansami osobistymi (Electron/React/TypeScript).
3. Po zaakceptowaniu wniosku przez SignPath Foundation zaloguj się na [https://signpath.io/](https://signpath.io/).

---

## 3. Konfiguracja w panelu SignPath.io

1. **GitHub App:** Zainstaluj SignPath GitHub App w repozytorium `Silvanion/saldo`.
2. **Project & Signing Policy:**
   - Utwórz projekt o identyfikatorze: `saldo`.
   - Dodaj Artifact Configuration dla instalatorów Windows (`.exe`).
   - Utwórz Signing Policy o nazwie: `release-signing`.
3. **API Token:**
   - Wygeneruj token API w sekcji *Settings > API Tokens*.

---

## 4. Konfiguracja GitHub Secrets

W ustawieniach repozytorium GitHub (**Settings > Secrets and variables > Actions**) dodaj następujące wpisy:

| Nazwa | Typ | Wartość |
| :--- | :--- | :--- |
| `SIGNPATH_API_TOKEN` | Repository Secret | Token API wygenerowany w panelu SignPath |
| `SIGNPATH_ORGANIZATION_ID` | Repository Secret / Variable | Identyfikator Twojej organizacji w SignPath |
| `SIGNPATH_PROJECT_SLUG` | *(Opcjonalnie)* Variable | `saldo` (wartość domyślna) |
| `SIGNPATH_SIGNING_POLICY_SLUG` | *(Opcjonalnie)* Variable | `release-signing` (wartość domyślna) |

---

## 5. Jak działa proces wydania

Przy wypchnięciu taga wersji (np. `git tag v1.6.7 && git push origin v1.6.7`):
1. GitHub Actions kompiluje instalator `.exe` oraz wersję `portable.exe`.
2. Jeśli `SIGNPATH_API_TOKEN` jest ustawiony:
   - Instalatory są przesyłane do SignPath.
   - SignPath podpisuje pliki certyfikatem SignPath Foundation.
   - Podpisane pliki trafiają z powrotem do runnera.
   - Skrypt `update-windows-manifest.mjs` aktualizuje sumy SHA-512 w `latest.yml`.
3. Gotowe, cyfrowo podpisane instalatory trafiają do sekcji Releases na GitHubie.
