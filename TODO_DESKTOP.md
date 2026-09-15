# Saldo - Lista zadań dla wersji Desktop (Electron)

## 🔴 Krytyczne — blokują "prawdziwe" wydanie
- [x] 1. Auto-aktualizacja (`electron-updater`, `latest-mac.yml`).
- [x] 2. Podpisywanie kodu i notaryzacja na macOS (hardenedRuntime, entitlements, notarize) - *wymaga konta Apple Developer*.
- [x] 3. Podpisywanie kodu na Windows (certyfikat code-signing).
- [x] 4. Blokada pojedynczej instancji (`app.requestSingleInstanceLock()`).
- [x] 5. Ikona okna (odkomentowana w `main.cjs`).

## 🟠 Ważne — poczucie "natywnej" aplikacji
- [x] 6. Menu Preferencje/Plik (dostosowane dla macOS i Windows).
- [x] 7. Zapamiętywanie ostatniego rozmiaru i pozycji okna (`electron-window-state`).
- [x] 8. Eksport/import kopii zapasowej JSON przez natywne okna (`dialog.showSaveDialog`/`showOpenDialog`).
- [x] 9. Natywne powiadomienia systemowe o zbliżających się terminach płatności.
- [x] 10. Windows: dodanie `app.setAppUserModelId(...)` dla poprawnych powiadomień.
- [x] 11. macOS: odznaka (dock badge) z liczbą zaległych rachunków.

## 🔐 Bezpieczeństwo specyficzne dla desktopu
- [x] 12. Touch ID (macOS) / Windows Hello dla odblokowywania profilu.
- [x] 13. Reakcja na blokadę ekranu/usypianie (`powerMonitor`) dla natychmiastowego blokowania profilu.

## ✨ Miłe dodatki
- [x] 14. Ikona w tray/pasku menu z szybką akcją "dodaj wydatek" + globalny skrót klawiszowy.
- [x] 15. Uruchamianie z systemem (`app.setLoginItemSettings`).
- [x] 16. Universal build na macOS (dodanie architektury `x64` obok `arm64`).
- [x] 17. Windows 11: target `portable` obok `nsis`, plus `setProgressBar`/`setOverlayIcon`.
- [x] 18. CI/CD: rozszerzenie `.github/workflows/ci.yml` o automatyczny build i publikację na GitHub Releases.
- [x] 19. Logi do pliku (`electron-log`).

## 🔧 Doprecyzowania po audycie (2026-09-15)

Wpisy powyżej były technicznie zaimplementowane, ale nie w pełni podłączone/spójne. Naprawione:
- **#11**: odznaka na Windows (`setOverlayIcon`) faktycznie nigdy nie była zaimplementowana mimo `[x]` przy #17 — dodano (bez liczby, bo Windows nie renderuje tekstu na nakładce jak macOS dock).
- **#12**: ekran wyboru profilu (`ProfileSelectionScreen.tsx`) sprawdzał martwe pola `profile.hasBiometrics`/`passkeyCredentialId`, których prawdziwy proces rejestracji (`BiometricService`) nigdy nie ustawia — przycisk biometrii tam był permanentnie dead. Przełączono na `BiometricService.checkHardwareStatus`/`promptUnlock`, ten sam mechanizm co w Ustawieniach.
- Kreator pierwszego uruchomienia (`OnboardingWizard.tsx`) dostał opcjonalny krok włączenia Touch ID/Windows Hello od razu po ustawieniu PIN-u.

**Znana, świadomie nienaprawiona luka**: na Windows `biometrics-prompt-unlock` nie pokazuje realnego promptu Windows Hello (Electron nie ma na to publicznego API jak `systemPreferences.promptTouchID` na macOS) — odszyfrowanie PIN-u opiera się wyłącznie o DPAPI (czyli w praktyce o to, że użytkownik jest zalogowany na konto Windows). Naprawa wymagałaby natywnego modułu (np. `node-windows-hello`) i testów na realnym sprzęcie z Windows Hello, którego nie ma w tym środowisku.
