# Dokumentacja Projektowa - Saldo

Aplikacja **Saldo** to nowoczesna, w pełni responsywna i bezpieczna aplikacja webowa do kompleksowego zarządzania budżetem domowym i finansami osobistymi.

---

## 1. Cel Aplikacji
Głównym zadaniem aplikacji **Saldo** jest pomoc użytkownikom w kontrolowaniu ich miesięcznych finansów osobistych oraz rodzinnych. Aplikacja pozwala na:
- Rejestrowanie przychodów i wydatków.
- Kategoryzację transakcji oraz określanie ich szczegółów (kwota, kategoria, data, opis, tagi).
- Ustalanie miesięcznych budżetów i limitów wydatkowych dla poszczególnych kategorii z wizualnym ostrzeganiem o przekroczeniach.
- Śledzenie celów oszczędnościowych oraz planowanych płatności (rachunków).
- Pracę w trybie z wieloma profilami (np. osobisty i wspólny domowy) chronionymi kodem PIN.
- Dostęp do prostych oraz zaawansowanych raportów oraz eksportu danych.
- Bezpieczne przechowywanie danych w chmurze **Firebase Firestore** z pełną izolacją prywatności użytkowników oraz opcją zapasowej synchronizacji z **Dyskiem Google (Google Drive)**.

---

## 2. Architektura i Integracje

Aplikacja została zbudowana w architekturze full-stack (React + Express + Firebase).

### Backend i Baza danych:
1. **Lokalny zapis przeglądarkowy**: W trybie lokalnym stan aplikacji jest przechowywany w IndexedDB, z kopią zapasową w `localStorage`. Dane nie są wysyłane na serwer.
2. **Firebase Auth**: Umożliwia bezpieczne logowanie za pomocą konta Google.
3. **Firebase Firestore (Główny trwale zapisywany stan)**: Po zalogowaniu dane użytkownika są w pełni prywatne i bezpiecznie zapisywane bezpośrednio w chmurze Google Firestore pod dokumentem odpowiadającym unikalnemu identyfikatorowi użytkownika (`uid`).
4. **Google Drive Sync**: Zapewnia opcjonalną możliwość bezpośredniego zapisu/odczytu kopii zapasowej w formacie pliku `.json` na prywatnym Dysku Google zalogowanego użytkownika.
5. **Express**: Serwuje aplikację Vite w trybie deweloperskim i zbudowany frontend w produkcji oraz udostępnia endpointy zdrowia, resetu stanu i funkcje AI. Nie jest bazą danych użytkowników.

---

## 3. Struktura Ekranów (Widoków)

Aplikacja jest podzielona na dedykowane i zoptymalizowane ekrany:

### A. Dashboard (Panel Główny)
- **Aktualne saldo miesiąca**: Bilans wyliczany w czasie rzeczywistym na podstawie przychodów i wydatków.
- **Suma przychodów i wydatków**: Czytelne kafelki z podsumowaniem finansów dla bieżącego okresu.
- **Wykres wydatków**: Interaktywna wizualizacja rozkładu kosztów według kategorii.
- **Ostatnie transakcje**: Lista 5 najnowszych operacji finansowych.
- **Szybkie skróty**: Sekcja ułatwiająca szybkie dodawanie wydatku lub przychodu.

### B. Transakcje
- **Formularz dodawania**: Obsługuje pola: typ (przychód/wydatek), kwota, kategoria, data, opis oraz tagi.
- **Zarządzanie transakcjami**: Możliwość edycji dowolnej istniejącej transakcji oraz jej usunięcia.
- **Filtrowanie i wyszukiwanie**: Szybkie zawężanie listy po typie (wszystkie, przychód, wydatek), kategorii oraz wyszukiwanie po nazwie.
- **Stany pustej listy**: Przyjazna grafika informująca o braku wpisów dla wybranego filtra.

### C. Budżety
- **Miesięczne limity**: Łatwe ustawianie i modyfikowanie limitów finansowych dla poszczególnych kategorii.
- **Wykorzystanie budżetu**: Prezentacja paska postępu oraz procentowego wskaźnika wykorzystania środków.
- **Wskaźniki ostrzegawcze**: Wizualne wyróżnienie (kolor żółty i czerwony) w przypadku zbliżania się lub przekroczenia zdefiniowanego limitu budżetowego.

### D. Rachunki i Płatności (Payments)
- **Śledzenie opłat cyklicznych**: Lista nadchodzących rachunków (np. prąd, internet, czynsz) wraz z terminami płatności i statusem.
- **Powiadomienia**: Informowanie o zbliżającym się terminie zapłaty za pomocą alertów i odznak.

### E. Cele oszczędnościowe (Goals)
- **Koperty oszczędnościowe**: Możliwość tworzenia celów finansowych (np. wkład własny, wakacje).
- **Zarządzanie oszczędnościami**: Funkcja wpłacania (depozytu) i wypłacania środków z poszczególnych celów.

### F. Analiza AI i Raporty (Analysis)
- **Generowanie raportów PDF**: Tworzenie profesjonalnych wykazów w formacie PDF (zabezpieczonych przed błędami kodowania polskich znaków diakrytycznych).
- **Prognozy i trendy**: Wyświetlanie statystyk i analityki budżetowej przygotowanej pod dalsze rozszerzenia o sztuczną inteligencję (AI).

### G. Ustawienia
- **Waluta**: Domyślnie ustawiona na PLN z precyzyjnym formatowaniem.
- **Wybór motywu**: Możliwość zmiany motywu graficznego (Jasny, Ciemny, Systemowy).
- **Zarządzanie profilami**: Konfiguracja profili osobistych i wspólnych z hashem PIN dla zwiększonej prywatności lokalnej.
- **Zarządzanie chmurą**: Opcje podłączenia konta Google, włączenia automatycznej synchronizacji z Dyskiem Google, pobrania kopii lub wylogowania.
- **Eksport i Import**: Sekcja pobierania danych w formacie CSV oraz importu wyciągów bankowych (CSV).

---

## 4. Architektura Plików w Projekcie

Aplikacja jest zaimplementowana w przejrzystej i modularnej strukturze plików:

```
├── Design.md                       # Niniejszy opis funkcjonalny i architektury
├── firebase-blueprint.json         # Definicja schematu bazy danych Firestore
├── firestore.rules                 # Reguły bezpieczeństwa dla bazy Firestore
├── package.json                    # Konfiguracja pakietów NPM i zależności
├── server.ts                       # Serwer Express dla frontendu, resetu stanu i endpointów AI
├── index.html                      # Główny punkt wejściowy HTML
├── src
│   ├── main.tsx                    # Główny plik wejściowy React
│   ├── App.tsx                     # Centralny menedżer stanu i nawigacji UI
│   ├── index.css                   # Definicje stylów Tailwind CSS
│   ├── firebase.ts                 # Integracja i konfiguracja Firebase Auth & Firestore
│   ├── googleDrive.ts              # Integracja z Google Drive API
│   ├── types.ts                    # Współdzielone interfejsy i typy TypeScript
│   ├── utils.ts                    # Funkcje pomocnicze, PDF, formatowanie waluty
│   └── components
│       ├── DashboardView.tsx       # Widok Panelu Głównego
│       ├── TransactionsView.tsx    # Widok zarządzania i filtrowania transakcji
│       ├── BudgetView.tsx          # Widok zarządzania budżetami kategorii
│       ├── PaymentsView.tsx        # Widok rachunków i płatności
│       ├── GoalsView.tsx           # Widok celów oszczędnościowych
│       ├── AnalysisView.tsx        # Widok analityki i raportów PDF
│       ├── SettingsView.tsx        # Widok ustawień profili, motywu i chmury
│       ├── CSVImportModal.tsx      # Komponent do importu plików CSV i mapowania pól
│       └── Modals.tsx              # Wszystkie modalne formularze dodawania/edycji
```
