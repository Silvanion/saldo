import React from "react";
import {
  LayoutDashboard,
  History,
  Clock,
  Wallet,
  Target,
  LineChart,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Lock,
  Database,
  Zap,
  ShieldAlert,
  Calendar,
  FileSpreadsheet,
  Command,
  Globe,
  Scale,
  TrendingUp,
  CreditCard
} from "lucide-react";

import { MockScreenShot, Terminal } from "../components/help/HelpVisuals";

export const helpCategories = [
  "Wszystko",
  "Szybki start",
  "Paleta komend (⌘K)",
  "Pulpit i Wskaźniki",
  "Analizy i Symulatory",
  "Wielowalutowość & NBP",
  "Transakcje i Banki CSV",
  "Rachunki i Timeline",
  "Budżety i Limity",
  "Cele i Inwestycje",
  "Profile i PIN",
  "Kopia i Chmura",
  "Lokalne AI"
];

export interface QuickSummaryCardData {
  title: string;
  description: string;
  icon: React.ReactNode;
  wrapperClass: string;
  iconClass: string;
}

export const quickSummaryCards: QuickSummaryCardData[] = [
  {
    title: "Prywatność i Szyfrowanie",
    description: "Swoje dane przechowujesz lokalnie lub na własnym koncie Google Drive z kodem PIN.",
    icon: <ShieldCheck className="w-5 h-5" />,
    wrapperClass: "bg-surface border border-border p-4 rounded-2xl flex items-start gap-3",
    iconClass: "p-2 bg-surface-2 text-text-muted border border-border/50 rounded-xl shrink-0"
  },
  {
    title: "Symulatory i Decyzje",
    description: "Kalkulatory poduszki bezpieczeństwa (3/6/12M) oraz kaskada spłaty długu metodą Kuli Śnieżnej.",
    icon: <Zap className="w-5 h-5 text-brand" />,
    wrapperClass: "bg-surface border border-border p-4 rounded-2xl flex items-start gap-3",
    iconClass: "p-2 bg-brand-subtle text-brand border border-brand/20 rounded-xl shrink-0"
  },
  {
    title: "10 Banków & Kursy NBP",
    description: "Automatyczny import wyciągów z 10 banków w Polsce z przeliczaniem walut po kursie średnim NBP.",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    wrapperClass: "bg-surface border border-border p-4 rounded-2xl flex items-start gap-3",
    iconClass: "p-2 bg-surface-2 text-text-muted border border-border/50 rounded-xl shrink-0"
  }
];

export interface HelpSectionData {
  id: string;
  cat: string;
  title: string;
  icon: React.ReactNode;
  badge?: string;
  defaultOpen?: boolean;
  content: React.ReactNode;
}

export const helpSectionsData: HelpSectionData[] = [
  {
    id: "quickstart",
    cat: "Szybki start",
    title: "Szybki start — Pierwsze 3 kroki do opanowania budżetu",
    icon: <Zap className="w-5 h-5" />,
    badge: "Instrukcja wizualna",
    defaultOpen: true,
    content: (
      <>
        <p className="mb-4 text-sm text-text-muted leading-relaxed">
          Witamy w Saldo! Aplikacja została zaprojektowana z myślą o maksymalnej przejrzystości i ochronie Twoich środków. Poniżej znajduje się wizualna instrukcja wykonania najważniejszych pierwszych kroków.
        </p>

        <MockScreenShot
          title="Aplikacja Saldo — Wskazówki nawigacji"
          badge="Interfejs użytkownika"
          steps={[
            {
              step: 1,
              label: "Wprowadź stałe dochody i rachunki",
              description: "Dodaj w sekcji Płatności comiesięczne opłaty (czynsz, prąd, abonamenty) oraz termin wypłaty wynagrodzenia."
            },
            {
              step: 2,
              label: "Zaimportuj wyciąg bankowy CSV",
              description: "Kliknij 'Importuj CSV' w zakładce Transakcje i przeciągnij plik z mBanku, PKO, ING lub innego banku."
            },
            {
              step: 3,
              label: "Sprawdź Safe-to-Spend i Runway",
              description: "Zobacz swój bilans na Pulpicie — aplikacja od razu wyliczy ile możesz bezpiecznie wydać po potrąceniu opłat."
            }
          ]}
        >
          <div className="p-4 bg-surface-2 rounded-xl border border-border text-center text-xs text-text-muted">
            <span className="font-bold text-text-main">Pulpit Finansowy</span> — Twoje centrum dowodzenia i wskaźniki płynności w czasie rzeczywistym.
          </div>
        </MockScreenShot>
      </>
    )
  },
  {
    id: "command-palette",
    cat: "Paleta komend (⌘K)",
    title: "Paleta Komend (⌘K / /) — Błyskawiczna nawigacja i wyszukiwanie",
    icon: <Command className="w-5 h-5 text-brand" />,
    badge: "Skróty klawiszowe",
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Paleta Komend umożliwia błyskawiczne sterowanie aplikacją Saldo bez odrywania rąk od klawiatury. Otworzysz ją z dowolnego miejsca za pomocą skrótu <strong>Cmd+K</strong> (Mac), <strong>Ctrl+K</strong> (Windows/Linux) lub naciskając pojedynczy klawisz <strong>/</strong> (slash).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1">
            <span className="font-bold text-text-main block">🔍 Szybkie szukanie transakcji</span>
            <p className="text-text-muted">Wpisz nazwę sklepu (np. "Biedronka", "Orlen"), kwotę lub kategorię, a lista wyników pojawi się natychmiastowo.</p>
          </div>
          <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1">
            <span className="font-bold text-text-main block">⚡ Nawigacja i Akcje</span>
            <p className="text-text-muted">Wpisz nazwę widoku ("Płatności", "Analizy", "Cele") lub polecenie "+ Nowa transakcja", "+ Dodaj płatność", aby natychmiast otworzyć odpowiedni formularz.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "dashboard",
    cat: "Pulpit i Wskaźniki",
    title: "Pulpit Główny — Safe-to-Spend, Runway i Bilans Płynności",
    icon: <LayoutDashboard className="w-5 h-5" />,
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Pulpit Główny w Saldo to centrum dowodzenia Twoimi finansami. Każdy wskaźnik pełni ściśle określoną rolę chroniącą Cię przed wpadnięciem w dołek finansowy.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1">
            <span className="font-bold text-brand block">Safe-to-Spend (Bezpieczna kwota)</span>
            <p className="text-text-muted">Środki wolne do wydania po potrąceniu zaplanowanych rachunków, rat kredytowych i celów oszczędnościowych.</p>
          </div>
          <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1">
            <span className="font-bold text-text-main block">Wskaźnik Runway (Poduszka w miesiącach)</span>
            <p className="text-text-muted">Informuje na ile miesięcy wystarczy płynnych oszczędności w razie utraty dochodu przy obecnym tempie kosztów.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "analytics-simulators",
    cat: "Analizy i Symulatory",
    title: "Inteligentne Analizy, Trendy Wielomiesięczne i Symulatory Decyzyjne",
    icon: <TrendingUp className="w-5 h-5 text-brand" />,
    badge: "Nowość w v1.0",
    defaultOpen: true,
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Moduł analityczny w Saldo łączy analizę historyczną z symulatorami strategicznymi, które pomagają podejmować optymalne decyzje o budowie poduszki i redukcji długu:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1">
            <span className="font-bold text-brand block">📈 Średnie Kroczące (3M / 6M) & Sterowniki</span>
            <p className="text-text-muted">Aplikacja wylicza średni miesięczny koszt życia z ostatnich miesięcy i wskazuje kategorie o największym wzroście oraz największej oszczędności.</p>
          </div>
          <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1">
            <span className="font-bold text-brand block">🛡️ Symulator Poduszki Finansowej (3/6/12M)</span>
            <p className="text-text-muted">Przelicza wymagany kapitał rezerwy bezpieczeństwa i podaje szacowany czas w miesiącach do osiągnięcia celu przy obecnej nadwyżce.</p>
          </div>
          <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1">
            <span className="font-bold text-danger block">💳 Kaskada Spłaty Długu (Kula Śnieżna)</span>
            <p className="text-text-muted">Szereguje aktywne zobowiązania od najmniejszych sald dla szybkiego uwalniania przepływów i symuluje zysk czasowy przy dodatkowej nadpłacie.</p>
          </div>
          <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1">
            <span className="font-bold text-text-main block">⚖️ Wzorzec Budżetowy 50 / 30 / 20</span>
            <p className="text-text-muted">Weryfikuje strukturę wydatków względem złotego standardu: 50% Potrzeby bazowe, 30% Zachcianki, 20% Oszczędności i inwestycje.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "multicurrency",
    cat: "Wielowalutowość & NBP",
    title: "Obsługa Walut Obcych i Kursy Średnie NBP",
    icon: <Globe className="w-5 h-5 text-brand" />,
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Saldo obsługuje wielowalutowość z automatycznym pobieraniem oficjalnych tabel kursów średnich Narodowego Banku Polskiego (NBP):
        </p>

        <ul className="list-disc pl-5 space-y-2 text-xs">
          <li><strong>Waluta bazowa profilu:</strong> PLN, EUR, USD, GBP lub CHF z precyzyjnym formatowaniem.</li>
          <li><strong>Transakcje wielowalutowe:</strong> Jeśli zaimportujesz płatność w EUR na profilu PLN, aplikacja automatycznie przeliczy ją po kursie NBP z dnia transakcji.</li>
          <li><strong>Praca offline:</strong> Pobrane kursy są przechowywane w lokalnej pamięci podręcznej, co gwarantuje pełną funkcjonalność bez internetu.</li>
        </ul>
      </div>
    )
  },
  {
    id: "transactions-csv",
    cat: "Transakcje i Banki CSV",
    title: "Księga Transakcji i Inteligentny Importer CSV (10 Banków)",
    icon: <History className="w-5 h-5" />,
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Możesz błyskawicznie zasilić aplikację transakcjami z wyciągów bankowych w formacie CSV:
        </p>

        <div className="p-3.5 bg-surface border border-border rounded-xl text-xs space-y-1.5">
          <span className="font-bold text-text-main block">Dedykowane presety dla banków w Polsce:</span>
          <p className="text-text-muted">mBank, PKO BP (iPKO), ING Bank Śląski, Santander Bank Polska, Bank Millennium, Bank Pekao (Pekao24), Alior Bank, BNP Paribas, Revolut oraz inteligentny parser Generic.</p>
        </div>
      </div>
    )
  },
  {
    id: "payments-timeline",
    cat: "Rachunki i Timeline",
    title: "4 Filary Horyzontów Płatności i Oś Czasu Cashflow",
    icon: <Clock className="w-5 h-5" />,
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Oś czasu w Saldo porządkuje nadchodzące i cykliczne płatności w 4 czytelnych horyzontach czasowych:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-center">
          <div className="p-2.5 bg-danger-subtle text-danger border border-danger/20 rounded-xl font-bold">1. Zaległe</div>
          <div className="p-2.5 bg-brand-subtle text-brand border border-brand/20 rounded-xl font-bold">2. Dzisiaj</div>
          <div className="p-2.5 bg-surface-2 text-text-main border border-border rounded-xl font-bold">3. 7 Dni</div>
          <div className="p-2.5 bg-surface-2 text-text-muted border border-border rounded-xl font-bold">4. 30 Dni</div>
        </div>
      </div>
    )
  },
  {
    id: "budgets",
    cat: "Budżety i Limity",
    title: "Budżety miesięczne i wskaźniki ostrzeżeń",
    icon: <Wallet className="w-5 h-5" />,
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Budżety pozwalają nałożyć miesięczny limit na poszczególne kategorie wydatków (np. 1500 zł na Jedzenie, 500 zł na Rozrywkę).
        </p>

        <p className="text-xs text-text-faint">
          Gdy wydatek w danej kategorii przekroczy 80% lub 100% ustalonego limitu, na Pulpicie pojawia się specjalny widget <strong>Ostrzeżenia Budżetowe</strong> z propozycją korekty.
        </p>
      </div>
    )
  },
  {
    id: "goals",
    cat: "Cele i Inwestycje",
    title: "Majątek Netto (Net Worth v1) i Cele Oszczędnościowe",
    icon: <Target className="w-5 h-5" />,
    badge: "Poza budżetem",
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Osobny moduł informacyjny służący do monitorowania majątku netto oraz postępów w celach oszczędnościowych:
        </p>

        <div className="bg-brand-subtle border border-brand/20 p-4 rounded-xl text-xs sm:text-sm text-brand flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-sm font-bold mb-1">Czystość semantyczna Net Worth</strong>
            Wpisy w sekcji inwestycji i celów mają charakter wyłącznie ewidencyjny. Nie powiększają kwoty Safe-to-Spend ani nie zniekształcają miesięcznego bilansu operacyjnego.
          </div>
        </div>
      </div>
    )
  },
  {
    id: "profiles",
    cat: "Profile i PIN",
    title: "Profile (Osobisty / Wspólny), Szyfrowanie i blokada PIN",
    icon: <Lock className="w-5 h-5" />,
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Saldo umożliwia posiadanie wielu odizolowanych profili finansowych w ramach jednej aplikacji (np. "Mój budżet prywatny" oraz "Wspólny budżet z partnerem").
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="p-4 bg-surface border border-border rounded-xl">
            <h5 className="font-semibold text-text-main mb-1.5">Profil Wspólny i Podział Wydatków</h5>
            <p className="text-text-muted text-xs sm:text-sm leading-relaxed">
              W profilu typu Shared każda transakcja ma oznaczenie kto płacił (Ja / Partner) oraz tryb podziału (Równo 50/50 lub Tylko ja). Widget Rozliczeń automatycznie podlicza balans kto komu ile jest winien!
            </p>
          </div>

          <div className="p-4 bg-surface border border-border rounded-xl">
            <h5 className="font-semibold text-text-main mb-1.5">Blokada PIN dla prywatności</h5>
            <p className="text-text-muted text-xs sm:text-sm leading-relaxed">
              W Ustawieniach możesz włączyć 4-cyfrowy kod PIN dla dowolnego profilu. Po zablokowaniu, przełączenie na ten profil wymaga wpisania kodu.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "backup",
    cat: "Kopia i Chmura",
    title: "Lokalne kopie bezpieczeństwa i integracja z Dyskiem Google",
    icon: <Database className="w-5 h-5" />,
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Twoje dane finansowe należą wyłącznie do Ciebie. Saldo nie korzysta z własnych serwerów bazy danych — zamiast tego zapisuje stan w przeglądarce (IndexedDB) oraz na Twoim prywatnym koncie Google Drive.
        </p>
      </div>
    )
  },
  {
    id: "ai",
    cat: "Lokalne AI",
    title: "Tryby pracy AI (None, Lokalne Ollama, Gemini)",
    icon: <Sparkles className="w-5 h-5" />,
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Saldo wspiera elastyczne tryby sztucznej inteligencji dopasowane do Twoich wymagań odnośnie prywatności:
        </p>

        <ul className="list-disc pl-5 space-y-3 text-xs">
          <li>
            <strong>Tryb podstawowy (None) – 100% Darmowy &amp; Domyślny:</strong><br />
            Pełna funkcjonalność aplikacji bez użycia modeli AI. Wykorzystuje ultra-szybkie algorytmy deterministyczne do parsowania tekstów, automatyzacji kategorii i importu CSV. Brak połączeń sieciowych.
          </li>
          <li>
            <strong>Lokalne AI (local / Ollama) – Pełna prywatność Power-Usera:</strong><br />
            Łączy się z lokalnym modelem uruchomionym na Twoim komputerze za pomocą aplikacji Ollama (<code className="bg-surface px-1 py-0.5 rounded">http://localhost:11434</code>).
          </li>
        </ul>
      </div>
    )
  }
];

export interface FaqEntry {
  question: string;
  answer: string;
}

export const faqData: FaqEntry[] = [
  {
    question: "Jak otworzyć Paletę Komend (Command Palette)?",
    answer: "Naciśnij kombinację klawiszy Cmd+K (na komputerach Mac) lub Ctrl+K (na Windows/Linux), albo wciśnij klawisz slash '/'. Możesz też kliknąć przycisk ⌘K w górnym pasku aplikacji."
  },
  {
    question: "Co oznacza wskaźnik Runway (Poduszka Płynności)?",
    answer: "Runway to szacunkowa liczba miesięcy, przez które utrzymasz obecny standard życia wyłącznie z płynnych oszczędności, jeśli utracisz bieżące dochody. Wartość ≥ 6 miesięcy oznacza zdrowy bufor."
  },
  {
    question: "Jak działa Symulator Poduszki Finansowej (3/6/12M)?",
    answer: "Symulator przelicza wymagany kapitał w oparciu o Twoje realne średnie miesięczne wydatki z ostatnich 3-6 miesięcy (burn rate). Następnie porównuje je z dostępnymi płynnymi rezerwami i podaje dokładny czas w miesiącach do osiągnięcia celu przy bieżącym tempie oszczędzania."
  },
  {
    question: "Na czym polega metoda Kuli Śnieżnej (Snowball) w spłacie długu?",
    answer: "Metoda Kuli Śnieżnej szereguje zobowiązania od najmniejszego salda do największego. Spłacenie najmniejszego długu najpierw daje natychmiastowe zwycięstwo psychologiczne i uwalnia miesięczną ratę, którą w całości przeznaczasz na nadpłacanie kolejnej pozycji."
  },
  {
    question: "Czym różni się Majątek Netto (Net Worth) od kwoty Safe-to-Spend?",
    answer: "Net Worth to nadrzędna ewidencja całego zgromadzonego majątku (aktywa minus pasywa), podczas gdy Safe-to-Spend to bieżące środki operacyjne na koncie wolne do wydania po potrąceniu rachunków."
  },
  {
    question: "Skąd aplikacja pobiera kursy walut?",
    answer: "Kursy są pobierane bezpośrednio z oficjalnego API Narodowego Banku Polskiego (Tabela A kursów średnich) i bezpiecznie zapisywane w pamięci lokalnej do pracy offline."
  },
  {
    question: "Jakie banki obsługuje importer CSV 2.0?",
    answer: "Importer posiada dedykowane presety dla 10 banków: mBank, PKO BP, ING, Santander, Bank Millennium, Bank Pekao, Alior Bank, BNP Paribas, Revolut oraz inteligentny profil Generic dopasowujący dowolny standardowy plik CSV."
  },
  {
    question: "Czy moje dane trafiają na Wasze serwery?",
    answer: "Nie. Saldo działa w architekturze Local-First. Twoje finanse są zapisywane wyłącznie na Twoim urządzeniu w bezpiecznej pamięci przeglądarki lub na Twoim osobistym koncie Google Drive."
  },
  {
    question: "Co się stanie, gdy zgubię kod PIN?",
    answer: "Kod PIN zabezpiecza dostęp do wybranego profilu. Możesz zresetować zapomniany PIN w Ustawieniach lub przywrócić niezabezpieczoną kopię zapasową z pliku JSON lub Google Drive."
  }
];
