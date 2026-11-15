# Saldo Mobile 📱

Natywna, bezpieczna i działająca w 100% offline aplikacja finansowa dla systemów **iOS** oraz **Android**, zbudowana w oparciu o **Expo SDK 52**, **Expo Router v4** oraz **React Native 0.76+**, współdzieląca silnik domenowy `@saldo/core`.

---

## 🌟 Kluczowe Możliwości

- **100% Local-First & Zero-Cloud**: Pełna baza SQLite w trybie transakcyjnym WAL (`expo-sqlite`) działająca lokalnie na urządzeniu. Brak jakichkolwiek serwerów zewnętrznych czy trackerów.
- **Biometria i Bezpieczeństwo**: Wsparcie dla Face ID, Touch ID oraz Android BiometricPrompt (`expo-local-authentication`) oraz bezpieczny magazyn danych wrażliwych (`expo-secure-store`).
- **Szybki Wydatek (Quick Add)**: Wprowadzanie paragonów i wydatków w 3 sekundy z fizyczną informacją zwrotną (haptyka z `expo-haptics`) oraz autokategoryzacją.
- **Kalkulator Podatków B2B 2026**: Podręczny podgląd rezerwy podatkowej (ZUS, składka zdrowotna, ryczałt, skala, liniowy) z silnika `@saldo/core`.
- **Budżet 50/30/20 & Majątek Netto**: Monitor limitów wydatków oraz wskaźnika LTV kredytu hipotecznego.

---

## 🚀 Jak uruchomić i przetestować na telefonie?

### Metoda 1: Natychmiastowe testowanie przez Expo Go (Zalecane — bez kompilacji)

Nie potrzebujesz kont deweloperskich ani instalowania Android Studio / Xcode, aby przetestować aplikację na swoim telefonie:

1. **Zainstaluj darmową aplikację Expo Go**:
   - **iOS**: Pobierz z [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - **Android**: Pobierz z [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Uruchom serwer developerski**:
   ```bash
   cd packages/mobile
   npm start
   ```
   *Wskazówka:* Jeśli Twój telefon i komputer są w różnych sieciach Wi-Fi (lub korzystasz z danych komórkowych), uruchom tryb tunelowania:
   ```bash
   npm run start:tunnel
   ```

3. **Zeskanuj kod QR**:
   - Na **Androidzie**: Otwórz aplikację Expo Go i kliknij *Scan QR code*.
   - Na **iOS**: Otwórz systemową aplikację Aparat i skieruj obiektyw na kod QR w terminalu.

---

## 📦 Jak udostępnić aplikację użytkownikom?

### 🤖 1. Android: Samodzielny plik instalacyjny APK (Najszybsza dystrybucja)

Możesz wygenerować gotowy plik `.apk`, który można pobrać bezpośrednio z GitHuba, przesłać mailem lub zainstalować na dowolnym telefonie z Androidem bez publikacji w sklepie Google:

1. Zaloguj się jednorazowo do darmowego konta Expo (jeśli jeszcze go nie masz, zarejestruj się na [expo.dev](https://expo.dev)):
   ```bash
   npx eas-cli login
   ```
2. Skonfiguruj projekt w chmurze EAS (jednorazowo):
   ```bash
   npx eas-cli project:init
   ```
3. Zbuduj paczkę APK w darmowej chmurze EAS:
   ```bash
   npm run build:apk
   ```
   *Wynik:* Otrzymasz bezpośredni link do pobrania pliku `.apk`, który możesz dodać do wydań na GitHub Releases!

---

### 🍏 2. iOS: TestFlight i App Store

Dystrybucja na systemie iOS wymaga konta **Apple Developer Program** (99 USD / rok):

1. **TestFlight (Wersje testowe dla maksymalnie 10 000 osób)**:
   - Zbuduj wersję produkcyjną:
     ```bash
     npm run build:ios
     ```
   - Po zakończeniu budowania w chmurze EAS, wyślij paczkę do App Store Connect:
     ```bash
     npx eas-cli submit -p ios
     ```
   - W panelu App Store Connect dodaj adresy e-mail testerów — otrzymają oni natychmiast zaproszenie do aplikacji TestFlight.

2. **Lokalna instalacja na własnym iPhone (bez płatnego konta)**:
   - Podłącz iPhone kablem do Maca.
   - Uruchom:
     ```bash
     npm run ios -- --device
     ```
   - Aplikacja zostanie skompilowana przez Xcode z darmowym podpisem osobistym Apple ID (ważnym przez 7 dni).

---

### 🏪 3. Sklep Google Play (Android Production)

1. Wygeneruj pakiet produkcyjny Android App Bundle (`.aab`):
   ```bash
   npm run build:android
   ```
2. Wyślij do Google Play Console:
   ```bash
   npx eas-cli submit -p android
   ```
   *(Wymaga jednorazowej opłaty rejestracyjnej Google Play Console: 25 USD).*

---

## 🛠️ Polecenia deweloperskie

W katalogu `packages/mobile`:

| Polecenie | Opis |
| :--- | :--- |
| `npm start` | Uruchamia serwer developerski Metro z kodem QR dla Expo Go |
| `npm run start:tunnel` | Uruchamia serwer w trybie tunelu ngrok (dostęp poza siecią lokalną) |
| `npm run web` | Uruchamia podgląd aplikacji w przeglądarce (`http://localhost:8081`) |
| `npm run doctor` | Uruchamia diagnostykę spójności bibliotek Expo (`expo-doctor`) |
| `npm run lint` | Sprawdza poprawność typów TypeScript (`tsc --noEmit`) |
| `npm test` | Uruchamia zestaw testów jednostkowych biometrii i logiki mobilnej |
| `npm run build:apk` | Kompiluje instalator `.apk` dla Androida (profil preview) |
| `npm run build:android` | Kompiluje paczkę `.aab` dla Google Play Store |
| `npm run build:ios` | Kompiluje paczkę `.ipa` dla Apple TestFlight / App Store |
