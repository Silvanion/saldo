# Dokumentacja Bezpieczeństwa, Uwierzytelniania i Prywatności (Saldo App)

Niniejszy dokument opisuje architekturę bezpieczeństwa, wdrożone moduły uwierzytelniania, polityki prywatności oraz procedury zgodności z RODO/GDPR w aplikacji **Saldo**.

---

## 1. Architektura Bezpieczeństwa i Model Danych

- **Model Hybrydowy Auth**: Obsługa logowania za pomocą poczty e-mail i hasła (`firebase/auth`) oraz kont Google (`GoogleAuthProvider`).
- **Szyfrowanie po stronie klienta (Client-Side Encryption)**: Profile zabezpieczone kodem PIN są szyfrowane lokalnie w przeglądarce algorytmem `AES-GCM` (256-bit) z derywacją klucza `PBKDF2` (100 000 iteracji, sól kryptograficzna) przed zapisem do IndexedDB lub synchronizacją z Firestore.
- **Zarządzanie Pamięcią Kluczy (`activeKeys`)**: Odszyfrowane klucze profilu znajdują się wyłącznie w ulotnej pamięci operacyjnej JavaScript (`in-memory map`). Nigdy nie są zapisywane w `localStorage` ani przesyłane w postaci jawnej do chmury.
- **Bezpieczeństwo Firestore (`firestore.rules`)**:
  - Dostęp typu *Owner-only*: Odczyt, modyfikacja i usunięcie dokumentu `users/{userId}` są dozwolone wyłącznie dla uwierzytelnionego użytkownika (`request.auth.uid == userId`).
  - Rygorystyczna walidacja schematu danych na poziomie reguł bazy (dozwolone wyłącznie określone klucze, limity rozmiarów tablic i ciągów znaków).

---

## 2. Przegląd Wdrożonych Modułów (Auth & Privacy Hardening)

### Etap 1: Rejestracja, Logowanie i Reset Hasła (`AuthScreen.tsx`, `firebase.ts`)
- **Reset hasła**: Samodzielny flow wysyłki wiadomości resetującej na adres email (`sendPasswordResetEmail`).
- **Walidacja siły hasła**: Wskaźnik siły hasła (min. 8 znaków, cyfra, znak specjalny) oraz pole powtórzenia hasła przy rejestracji.
- **Weryfikacja adresu email**: Wysyłka linku weryfikacyjnego po rejestracji (`sendEmailVerification`).

### Etap 2: Ochrona Przed Brute-Force i Auto-Lock (`useProfileSecurity.ts`, `useIdleLock.ts`)
- **Ogranicznik prób PIN**: Blokada wprowadzania PIN po 5 nieudanych próbach z odliczaniem czasu (30 sekund blokady).
- **Auto-lock po bezczynności (`useIdleLock`)**: Automatyczne blokowanie profilu i natychmiastowe usuwanie klucza deszyfrującego z `activeKeys` po zdefiniowanym w ustawieniach czasie (1, 5, 15, 30 min).

### Etap 3A: Zmiana Hasła w Ustawieniach (`SettingsView.tsx`, `firebase.ts`)
- Samodzielna zmiana hasła dla zalogowanych użytkowników z re-autentykacją (`reauthenticateWithCredential`).
- Wskaźnik siły dla nowego hasła oraz weryfikacja zgodności.
- Rozpoznawanie kont połączonych wyłącznie przez Google (wyświetlenie odpowiedniej informacji zamiast formularza hasłowego).

### Etap 3B: Zmiana Adresu Email (`SettingsView.tsx`, `firebase.ts`)
- Bezpieczna zmiana adresu email oparta o nowoczesny standard Firebase `verifyBeforeUpdateEmail`.
- Wymóg autoryzacji bieżącym hasłem przed wysłaniem linku potwierdzającego na nowy adres.

### Etap 3C.1: Czyszczenie Danych Lokalnych i Zarządzanie Urządzeniem (`SettingsView.tsx`, `localDb.ts`)
- **Wyloguj z chmury**: Zakończenie sesji Firebase na danym urządzeniu bez naruszania lokalnych stanów budżetu.
- **Zresetuj Saldo na tym urządzeniu**:
  - Pełne wyczyszczenie pamięci `IndexedDB` i `localStorage` (`clearState()`),
  - Wyczyszczenie aktywnych kluczy z pamięci (`activeKeys`),
  - Wylogowanie sesji i twarde przeładowanie aplikacji do stanu bezpiecznego baselinu.

### Etap 3C.2: Trwałe Usuwanie Konta i Danych (RODO / GDPR) (`SettingsView.tsx`, `firebase.ts`, `firestore.rules`)
- **Krytyczna kolejność usuwania**:
  1. Re-autentykacja tożsamości bieżącym hasłem,
  2. Trwałe usunięcie dokumentu użytkownika z Firestore (`deleteDoc(users/{uid})`),
  3. Trwałe usunięcie konta uwierzytelniania Firebase (`deleteUser`),
  4. Wyczyszczenie lokalnego stanu, pamięci kluczy i sesji.
- **Zabezpieczenie przed przypadkowym usunięciem**: Wymóg podania hasła oraz ręcznego wpisania dokładnej frazy potwierdzającej: `USUŃ KONTO`.

---

## 3. Checklist Przedpublikacyjna / Manual QA (Release Checklist)

Przed wdrożeniem produkcyjnym należy przeprowadzić weryfikację poniższych scenariuszy:

- [ ] **Logowanie i Rejestracja:**
  - [ ] Rejestracja nowego konta z hasłem słabym / poprawnym.
  - [ ] Walidacja pola "Powtórz hasło" przy błędnym wpisaniu.
  - [ ] Test formularza "Zapomniałem hasła" — odebranie maila z linkiem resetującym.
- [ ] **Zabezpieczenie Profilu PIN:**
  - [ ] Wprowadzenie błędnego PIN-u 5 razy $\rightarrow$ weryfikacja pojawienia się blokady czasowej.
  - [ ] Weryfikacja działania auto-locka po wybranym czasie bezczynności (klucze usunięte z pamięci).
- [ ] **Ustawienia Konta:**
  - [ ] Zmiana hasła z podaniem poprawnego i błędnego obecnego hasła.
  - [ ] Zmiana adresu email $\rightarrow$ weryfikacja linku wysłanego na nową skrzynkę.
- [ ] **Prywatność i Urządzenie:**
  - [ ] Kliknięcie "Wyloguj" $\rightarrow$ zakończenie sesji chmurowej bez utraty danych lokalnych.
  - [ ] Wykonanie "Zresetuj Saldo na tym urządzeniu" $\rightarrow$ potwierdzenie wyczyszczenia bazy IndexedDB i restart do stanu początkowego.
- [ ] **Usuwanie Konta (RODO):**
  - [ ] Próba zatwierdzenia bez wpisania frazy `USUŃ KONTO` $\rightarrow$ blokada przycisku.
  - [ ] Wpisanie poprawnego hasła i frazy `USUŃ KONTO` $\rightarrow$ usunięcie danych z chmury, skasowanie konta Auth, wylogowanie i wyzerowanie aplikacji.
  - [ ] Próba ponownego zalogowania danymi usuniętego konta $\rightarrow$ błąd braku użytkownika.
