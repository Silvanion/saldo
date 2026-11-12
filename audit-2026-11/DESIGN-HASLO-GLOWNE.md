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
| 5. Chmura | Osobny dokument `vault/v2` (patrz wymóg wyżej); do chmury trafiają wyłącznie payloady v2, profil bez hasła nie jest synchronizowany (zamyka PRIV-01) | średnie | reguły w emulatorze; test, że stary klient nie niszczy v2 |

## Zgodność wielu urządzeń — WYMÓG TWARDY (zweryfikowane w kodzie)
Obecne wersje zapisują `users/{uid}` przez `setDoc(docRef, pickSyncableState(state), { merge: false })` — cały dokument jest **zastępowany** wyłącznie polami z listy `SYNCABLE_STATE_KEYS`. Konsekwencje:
* `keyring` dodany do tego dokumentu zostałby **skasowany** przez pierwszy zapis starego klienta → dane v2 nieodzyskiwalne.
* Reguły Firestore (`hasOnly([...])`) odrzucają nieznane pola, więc starych klientów nie da się „nauczyć” ich zachowywać.

Dlatego:
1. Dane v2 (keyring + zaszyfrowane profile) trafiają do **osobnego dokumentu**, np. `users/{uid}/vault/v2`, z własną regułą (tylko właściciel, walidacja rozmiaru). Stare wersje go nie czytają ani nie zapisują.
2. Dokument `users/{uid}` po migracji zostaje jako **znacznik** (np. jeden pusty profil o nazwie „Zmigrowano do nowej wersji Saldo — zaktualizuj aplikację”), nie z kopią danych. Stary klient, który go zapisze, niczego nie zniszczy.
3. Migracja zachowuje poprzednie dane v1 w dokumencie kopii (`users/{uid}/vault/v1-backup`) przez okres karencji, a lokalnie w migawce (DATA-01), aż użytkownik potwierdzi poprawność.
4. Nowy klient, który zobaczy, że `vault/v2` istnieje, nigdy nie zapisuje już do `users/{uid}` poza znacznikiem.
5. Lokalnie (IndexedDB): profil z payloadem v2 w klientach bez obsługi v2 byłby traktowany jak profil bez PIN-u i mógłby zostać nadpisany. Wydanie „rozpoznające v2” (faza 2a) musi traktować taki profil jako tylko do odczytu z komunikatem „zaktualizuj aplikację”.

## Otwarte pytania
* Czy hasło ma mieć miernik siły (zxcvbn dodaje ~400 kB; lekka alternatywa to sama polityka długości)?
* Czy zmiana hasła ma unieważniać klucz odzyskiwania (domyślnie: nie)?
* Ile razy dopuścić odblokowanie kluczem odzyskiwania bez dodatkowego potwierdzenia?
