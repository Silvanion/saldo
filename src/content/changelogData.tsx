import React from "react";
import { Sparkles, CheckCircle2, Cloud, Shield, Wallet, Smartphone, TrendingUp, BookOpen, Sliders, Globe, Landmark, Database } from "lucide-react";

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  icon: React.ReactNode;
  features: string[];
}

export const changelogData: ChangelogEntry[] = [
  {
    version: "v1.3.0",
    date: "Wrzesień 2026",
    title: "Majątek Netto (Wealthfolio), Plany Działania, Saldo Wrapped i Doktor Saldo",
    icon: <Database className="w-5 h-5 text-brand" />,
    features: [
      "[Majątek Netto — Wealthfolio] Pełny tracker aktywów i pasywów z podziałem na gotówkę, cele, nieruchomości, inwestycje oraz kredyty. Wyliczanie wskaźnika DTI (Debt-to-Assets), wskaźnika płynności (Runway) i historycznej trajektorii z dedykowanym widokiem i widgetem.",
      "[Deterministyczne Plany Działania (Claude Skills)] Zestaw deterministycznych asystentów: Akcelerator Lawiny Długów, 3-Etapowa Poduszka Bezpieczeństwa, Audyt Subskrypcji i Rebalansowanie Budżetu 50/30/20 z interaktywną checklistą i śledzeniem postępów.",
      "[Saldo Wrapped & Financial Stories] 6-slajdowe interaktywne podsumowanie miesiąca w stylu Stories z autoodtwarzaniem, analizą nawyków i bezpośrednim eksportem do grafiki PNG (format 9:16).",
      "[Doktor Saldo • Autonomiczny Audytor i Self-Healing] Inteligentne skanowanie bazy pod kątem 6 rodzajów anomalii (ukryte duplikaty, osierocone transakcje, desynchronizacja celów, brakujące kategorie) z automatyczną samonaprawą jednym kliknięciem i pełną historią cofania (Undo).",
      "[Centrum Raportów i Eksportu] Nowy panel pobierania zestawień w formatach PDF i CSV z opcją udostępniania Web Share oraz wyboru zakresu czasowego.",
      "[Modularyzacja Architektury] Podział monolitu Ustawień na izolowane, niezależne sekcje i optymalizacja ładowania modalów w asynchronicznych chunkach."
    ]
  },
  {
    version: "v1.2.0",
    date: "Sierpień 2026",
    title: "Kredyty i Hipoteka, Lokalne AI (Ollama) i Wzmocniona Jakość Danych",
    icon: <Landmark className="w-5 h-5 text-brand" />,
    features: [
      "[Kredyty i Hipoteka — nowy moduł] Portfel wszystkich zobowiązań (hipoteka, kredyty gotówkowe, karty kredytowe, limity odnawialne, raty 0%/BNPL) z wskaźnikami łącznego salda, miesięcznej obsługi, pozostałych odsetek i średniego ważonego kosztu długu (WACD).",
      "[Strategie Spłaty: Lawina vs. Kula Śnieżna] Porównanie side-by-side strategii Avalanche (najwyższe oprocentowanie najpierw) i Snowball (najmniejsze saldo najpierw) z rekomendacją dopasowaną do portfela.",
      "[Symulator Nadpłaty i Refinansowania] Sprawdź wpływ jednorazowej, miesięcznej lub rocznej nadpłaty na czas spłaty i sumę odsetek oraz porównaj do 3 ofert refinansowania jednocześnie.",
      "[Powiązane Transakcje] Rata spłacona z Księgi Transakcji może zostać połączona z konkretnym zobowiązaniem — historia płatności i postęp spłaty aktualizują się automatycznie.",
      "[Lokalne AI (Ollama), w pełni opcjonalne] Dodatkowa warstwa rozpoznawania tekstu wyciągów i sugestii kategorii oparta o model językowy uruchomiony lokalnie na Twoim komputerze — żadne dane nie opuszczają urządzenia. Zewnętrzne, chmurowe AI zostało z aplikacji całkowicie usunięte.",
      "[Karta Kondycji Finansowej na Pulpicie] Kompaktowy skrót wyniku zdrowia finansowego bezpośrednio na ekranie głównym, z odnośnikiem do pełnej analizy.",
      "[Zaawansowane Scenariusze i Wykresy (What-If)] Wprowadzono harmonogram wielokrotnych jednorazowych nadpłat, nową oś czasu spłaty oraz wykres porównawczy strategii spłaty w stosunku do planu bazowego.",
      "[Wzmocniona Jakość i Bezpieczeństwo Danych] Ujednolicona walidacja kwot odrzucająca błędne/nieskończone wartości we wszystkich formularzach i imporcie CSV, limit wierszy importu z czytelnym ostrzeżeniem zamiast cichego obcinania danych, wydajniejsze (mniejsze) szyfrowane kopie lokalne oraz naprawa rzadkiego przypadku utraty ochrony kodem PIN przy błyskawicznym odświeżeniu strony."
    ]
  },
  {
    version: "v1.1.0",
    date: "Sierpień 2026",
    title: "Centrum Pomocy 2.0, Żywe Makiety UI, Konta z Buforem i Globalny Polish",
    icon: <Sparkles className="w-5 h-5 text-brand" />,
    features: [
      "[Centrum Pomocy 2.0] Całkowicie przebudowana baza wiedzy z interaktywnymi makietami interfejsu (Live React UI), wzorami matematycznymi dla Safe-to-Spend i Runway oraz błyskawicznym wyszukiwaniem po słowach kluczowych.",
      "[Wzorce & Symulatory Finansowe] Szczegółowe przewodniki po regule 50/30/20, kalkulatorze poduszki finansowej (3/6/12M) oraz metodzie Kuli Śnieżnej (Debt Snowball) ze strategią uwalniania przepływów pieniężnych.",
      "[Zarządzanie Kontami Operacyjnymi] Wprowadzenie bufora bezpieczeństwa dla kont bankowych i gotówkowych — środki rezerwowe są ściśle odizolowane od kwoty wolnej do wydania (Safe-to-Spend).",
      "[Ujednolicenie Ustawień] Nowoczesny system zakładek, interaktywne kafelki motywu (Jasny / Ciemny / Systemowy), wektorowe akcje usuwania reguł (Trash2) oraz bezpieczny eksport danych i kopia zapasowa.",
      "[Precyzja Typograficzna tabular-nums] Konsekwentne zastosowanie cyfr o stałej szerokości we wszystkich kwotach, datach, tabelach i wskaźnikach procentowych w całej aplikacji.",
      "[Czysta Ikonografia i Semantyka] Zastąpienie surowych emoji profesjonalnymi ikonami wektorowymi Lucide oraz ujednolicenie stanów pustych (Dashed Empty States)."
    ]
  },
  {
    version: "v1.0.0",
    date: "Sierpień 2026",
    title: "Analytics & Insights v2, Majątek Netto (Net Worth v1) oraz Pełny UI Polish Pass",
    icon: <TrendingUp className="w-5 h-5 text-brand" />,
    features: [
      "[Analytics & Insights v2] Inteligentny silnik analityczny: średnie kroczące wydatków (3M / 6M), automatyczna identyfikacja sterowników kosztów (kategorie o największym wzroście i oszczędności) oraz podział 50/30/20.",
      "[Symulatory Strategiczne] Zintegrowany kalkulator poduszki bezpieczeństwa (3M, 6M, 12M w oparciu o miesięczny burn rate) oraz kaskada spłaty zadłużenia metodą Kuli Śnieżnej (Snowball) z symulacją przyspieszenia spłaty.",
      "[Majątek Netto (Net Worth v1)] Nadrzędna karta majątku netto w widoku Celów z podziałem na klasy aktywów i ścisłą separacją semantyczną od bieżącego budżetu operacyjnego.",
      "[Księga Transakcji Polish] Zunifikowany pasek narzędzi, natychmiastowe czyszczenie wyszukiwarki, przełączniki segmented controls, pigułki tagów i akcje wierszy z mikro-podpowiedziami DelayedTooltip.",
      "[Globalna Spójność UI] Ujednolicenie zaokrągleń, cieni (shadow-xs/shadow-sm), obramowań i typografii w widokach Ustawień, Pomocy, Pulpitu i Transakcji."
    ]
  },
  {
    version: "v0.9.5",
    date: "Sierpień 2026",
    title: "Wielowalutowość NBP, Paleta Komend ⌘K, Runway & 4 Filary Cashflow",
    icon: <Globe className="w-5 h-5 text-brand" />,
    features: [
      "[Wielowalutowość & CSV 2.0] Importer wyciągów dla 10 banków w Polsce (mBank, PKO BP, ING, Santander, Millennium, Pekao, Alior, BNP Paribas, Revolut, Generic) z auto-detekcją kolumn i walut oraz integracją z oficjalnymi kursami NBP.",
      "[Paleta Komend ⌘K] Globalna paleta komend i szybka wyszukiwarka (skrót Cmd+K / Ctrl+K lub /) — przeszukiwanie transakcji w czasie rzeczywistym, przełączanie profili i natychmiastowa nawigacja.",
      "[Analityka Płynności & Runway] Kafel poduszki finansowej informujący na ile miesięcy wystarczy płynnych środków przy obecnym tempie wydatków (ze statusem: Bezpieczny, Umiarkowany, Krytyczny).",
      "[Wskaźniki MoM & Reguła 50/30/20] Wskaźniki dynamiki miesiąc-do-miesiąca pod kartami przychodów i wydatków oraz interaktywny panel podziału budżetu 50/30/20 w module Analiz.",
      "[4 Filary Horyzontów Płatności] Kompleksowy pasek horyzontów (Zaległe, Dzisiaj, 7 Dni, 30 Dni) na Osi Czasu i w Płatnościach z harmonogramem kumulatywnym cashflow.",
      "[Hierarchia Pulpitu & Dark Polish] Zoptymalizowana kolejność widgetów od bilansu i poduszki po pilne terminy, usunięcie artefaktów wizualnych i neutralny grafitowy motyw ciemny."
    ]
  },
  {
    version: "v0.9.0",
    date: "Sierpień 2026",
    title: "Globalny Polish UX/UI i Nowe Etykiety Podpowiedzi",
    icon: <Sparkles className="w-5 h-5 text-brand" />,
    features: [
      "[UI Polish] Ujednolicone tła (surfaces), zaokrąglenia i kontrasty w jasnym i ciemnym motywie dla optymalnej czytelności.",
      "[Nawigacja] Interaktywne podpowiedzi (tooltipy) na urządzeniach mobilnych — przytrzymaj ikonę palcem, aby poznać jej funkcję.",
      "[Ekran Powitalny] Odświeżony widok logowania, powitania zależne od pory dnia oraz pełne wsparcie dla automatycznego motywu systemowego.",
      "[Centrum Pomocy] Zaktualizowana sekcja pomocy z lepszymi kontrastami i użyciem ustandaryzowanych kolorów aplikacji."
    ]
  },
  {
    version: "v0.8.9",
    date: "Sierpień 2026",
    title: "Priorytety, Statusy i Przejrzystość",
    icon: <Sparkles className="w-5 h-5 text-brand" />,
    features: [
      "[Płatności] Dodano filtry horyzontu czasowego (Dzisiaj, W tym tygodniu, W tym miesiącu) i mocniejsze oznaczenia zaległości.",
      "[Cele] Dodano czytelne odznaki postępu, statusy (W trakcie, Prawie u celu!, Osiągnięty 🎉) i estymacje czasu do osiągnięcia celu.",
      "[Analiza] Wprowadzono nową warstwę interpretacyjną dla budżetów (W normie, Uwaga, Przekroczony).",
      "[Pulpit] Przeprojektowano domyślną hierarchię, priorytetyzując oś czasu i pilne rachunki."
    ]
  },
  {
    version: "v0.8.8",
    date: "Lipiec 2026",
    title: "Rozszerzenia Osi Czasu i Spójność Interfejsu",
    icon: <Sparkles className="w-5 h-5 text-brand" />,
    features: [
      "[Oś Czasu] Filtr 'Zaległe' na osi czasu oraz karta z podsumowaniem kwot do zapłaty w bieżącym tygodniu.",
      "[Stany Aktywne] Subtelniejsze i bardziej spójne stany aktywne dla filtrów i tagów we wszystkich widokach list.",
      "[Optymalizacja] Wyeliminowano błąd kategoryzacji płatności na osi czasu związany ze zmianami czasu na letni/zimowy (DST)."
    ]
  },
  {
    version: "v0.8.7",
    date: "Lipiec 2026",
    title: "Ochrona Rezerw i Bezpieczny Import Transakcji",
    icon: <Shield className="w-5 h-5 text-brand" />,
    features: [
      "[Ochrona Celów] Blokada usuwania celów oszczędnościowych ze zgromadzonymi środkami (saved > 0) chroniąca rezerwy finansowe.",
      "[Deduplikacja CSV] Automatyczna detekcja duplikatów i deduplikacja podczas wielokrotnego importu plików CSV.",
      "[Sanityzacja Danych] Filtrowanie uszkodzonych wartości numerycznych (NaN) przy wprowadzaniu i imporcie transakcji.",
      "[Typowanie Metryk] Ścisłe typowanie wskaźników oraz danych wykresów w panelu głównym (Dashboard Metrics)."
    ]
  },
  {
    version: "v0.8.6",
    date: "Lipiec 2026",
    title: "Izolacja Profilowa i Bezpieczeństwo Danych",
    icon: <Shield className="w-5 h-5 text-brand" />,
    features: [
      "[Izolacja Profili] Pełna izolacja reguł cyklicznych i reguł transakcji dla każdego profilu (osobistego i wspólnego).",
      "[Prywatność] Gwarancja braku wycieków danych finansowych przy przełączaniu profili.",
      "[Type Guards] Ścisła walidacja typów w czasie rzeczywistym oraz ochrona przed uszkodzonymi danymi.",
      "[Migracje Bazy] Idempotentne i bezpieczne procedury migracji bazy danych i pamięci podręcznej."
    ]
  },
  {
    version: "v0.8.5",
    date: "Lipiec 2026",
    title: "Rozliczenia i Budżet Wspólny",
    icon: <Wallet className="w-5 h-5 text-brand" />,
    features: [
      "[Bilans Rozliczeń] Automatyczne wyliczanie salda rozliczeń między partnerami (kto komu jest winien).",
      "[Oznaczenie Płatnika] Możliwość oznaczania, kto opłacił dany wydatek (Ja, Partner, Wspólne/50-50).",
      "[Filtrowanie Płatników] Nowe filtry list transakcji i nadchodzących opłat według osoby płacącej.",
      "[Wyróżnienie Profilu] Wyraźne oznaczanie profili wspólnych w interfejsie aplikacji."
    ]
  },
  {
    version: "v0.8.4",
    date: "Lipiec 2026",
    title: "PWA i Bezpieczna Praca Offline",
    icon: <Smartphone className="w-5 h-5 text-brand" />,
    features: [
      "[Aplikacja PWA] Progresywna Aplikacja Internetowa z możliwością instalacji na ekranie głównym.",
      "[Tryb Offline] Pełne wsparcie dla pracy offline z lokalnym magazynem IndexedDB.",
      "[Stan Sieci] Ostrzeżenia o braku połączenia sieciowego podczas zapisu.",
      "[Service Worker] Zoptymalizowany manifest i cache aplikacji (App Shell)."
    ]
  },
  {
    version: "v0.8.3",
    date: "Lipiec 2026",
    title: "Synchronizacja w Chmurze i Dysk Google",
    icon: <Cloud className="w-5 h-5 text-brand" />,
    features: [
      "[Firestore] Integracja z Firebase Firestore dla bezpiecznej synchronizacji profili.",
      "[Google Drive] Kopie zapasowe na prywatnym Dysku Google z separacją uprawnień OAuth (drive.file).",
      "[Rozwiązywanie Konfliktów] Zautomatyzowana obsługa konfliktów zapisów pomiędzy urządzeniami.",
      "[Obsługa Błędów] Zabezpieczenia przed błędami dostępu (401/403/404) z Google Drive."
    ]
  },
  {
    version: "v0.8.2",
    date: "Czerwiec 2026",
    title: "Profile Zabezpieczone Kodem PIN i Detekcja Duplikatów",
    icon: <Shield className="w-5 h-5 text-brand" />,
    features: [
      "[Szyfrowanie PIN] Szyfrowanie profili kodem PIN za pomocą standardu AES-GCM.",
      "[Magazyn Kluczy] Bezpieczny magazyn kluczy, zapobiegający wyciekom danych finansowych w przeglądarce.",
      "[Detekcja Duplikatów] Inteligentna detekcja duplikatów dla cyklicznych oraz importowanych transakcji.",
      "[Higiena Pamięci] Mechanizmy automatycznego czyszczenia pamięci po wylogowaniu."
    ]
  },
  {
    version: "v0.8.1",
    date: "Maj 2026",
    title: "Kategoryzacja AI i Zaawansowane Budżety",
    icon: <Sparkles className="w-5 h-5 text-brand" />,
    features: [
      "[Asystent AI] Opcjonalna pomoc w analizowaniu płatności i sugerowaniu kategorii.",
      "[Eksport/Import] Funkcja eksportu i importu z/do CSV do integracji z bankami.",
      "[Podział Wydatków] Rozbudowany podział wydatków i cele oszczędnościowe.",
      "[Limity Budżetowe] Procentowe wskaźniki użycia limitów budżetowych."
    ]
  },
  {
    version: "v0.8.0",
    date: "Kwiecień 2026",
    title: "Pierwsze Wydanie Aplikacji Saldo",
    icon: <CheckCircle2 className="w-5 h-5 text-brand" />,
    features: [
      "[Silnik Finansowy] Uruchomienie podstawowego silnika zarządzania transakcjami i płatnościami.",
      "[Autoryzacja Google] Bezpieczne logowanie kontem Google.",
      "[Główny Pulpit] Panel dowodzenia z bilansami dziennymi i miesięcznymi."
    ]
  }
];
