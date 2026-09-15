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
