# Projekt: hasło główne i klucz odzyskiwania (SEC-02)

Decyzje właściciela (2026-11-12): **hasło główne dla wszystkiego**, **obowiązkowe** przy pierwszym uruchomieniu, **z kluczem odzyskiwania**.

## Stan
**Faza 1 — zrobiona:** `src/services/cryptoV2.ts` + 18 testów (czysty moduł, niepodpięty do aplikacji; format v1 bez zmian).
Faz 2–5 jeszcze nie ma. Dopóki nie są wdrożone, aplikacja nadal działa na PIN-ie (v1) z jego znanymi ograniczeniami.

## Hierarchia kluczy (faza 1)
```
DEK  — losowy AES-GCM-256, szyfruje dane wszystkich profili konta (IV na każdy zapis, AAD = id profilu)
 ├─ opakowany KEK z hasła:        PBKDF2-SHA256, 600 000 iteracji (w nagłówku, można podnosić; granice 100 k–10 M)
 └─ opakowany KEK z klucza odzysk.: HKDF-SHA256 nad 128 bitami losowości (26 znaków Crockford base32, grupy po 4)
```
* Zmiana hasła = ponowne opakowanie DEK, dane nie są szyfrowane od nowa.
* Hasło ≥ 12 znaków (≥ 5 różnych). Normalizacja NFKC.
* Odzyskany DEK jest nieeksportowalny (`extractable: false`).
* Keyring i payload mają pole `v: 2`; `detectPayloadVersion` odróżnia je od v1 (PIN).
* Ścieżka do Argon2id: nowa wartość `kdf.alg` w nagłówku (np. `hash-wasm`, MIT, ~1,8 MB nierozpakowane) — bez zmiany reszty.

Pomiar kosztu odblokowania (Chromium): 600 k iteracji ≈ 106 ms, 1 M ≈ 180 ms.

## Fazy
| Faza | Zakres | Ryzyko | Test, którego brakuje |
|---|---|---|---|
| 2. Przechowywanie i UI | `keyring` w `AppState` (+ `SYNCABLE_STATE_KEYS`, `firestore.rules`: nowy klucz i limit rozmiaru); hook sesji (DEK w pamięci zamiast `activeKeys` per profil); ekran odblokowania hasłem; kreator: obowiązkowe hasło + jednorazowy ekran klucza odzyskiwania z potwierdzeniem zapisu; Ustawienia: zmiana hasła, odzyskiwanie | wysokie (rdzeń UX) | e2e: onboarding → blokada → odblokowanie → odzyskiwanie |
| 3. Migracja v1 → v2 | Migawka kopii przed zmianą → odszyfrowanie profilu (PIN lub jawny) → szyfrowanie DEK → **weryfikacja odczytem zwrotnym przed nadpisaniem** → usunięcie `pinHash`. Użytkownicy bez PIN-u: jednorazowy, wymagany monit | najwyższe (utrata danych) | testy na realistycznych fixture'ach v1 (z PIN, bez PIN, wiele profili), przerwanie w połowie |
| 4. Szybkie odblokowanie lokalne | Desktop: DEK opakowany kluczem z Keychain/DPAPI (macOS: Touch ID); limit prób **egzekwowany w procesie głównym**, nie w stanie Reacta. Web: hasło przy każdej sesji | średnie | test w prawdziwym Electronie |
| 5. Chmura | Do Firestore/Drive trafiają wyłącznie payloady v2; profil bez hasła nie może być synchronizowany (zamyka PRIV-01) | niskie po fazie 3 | reguły w emulatorze |

## Zgodność wielu urządzeń
Stary klient, który zobaczy payload v2, ma pokazać „zaktualizuj aplikację” i **niczego nie nadpisywać**. Dlatego przed fazą 3 trzeba wydać wersję, która umie rozpoznać v2 i odmawia zapisu (`minClientVersion` w dokumencie).

## Otwarte pytania
* Czy hasło ma mieć miernik siły (zxcvbn dodaje ~400 kB; lekka alternatywa to sama polityka długości)?
* Czy zmiana hasła ma unieważniać klucz odzyskiwania (domyślnie: nie)?
* Ile razy dopuścić odblokowanie kluczem odzyskiwania bez dodatkowego potwierdzenia?
