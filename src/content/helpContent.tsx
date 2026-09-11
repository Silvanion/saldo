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
  CreditCard,
  Layers,
  Cpu,
  RefreshCw,
  Sliders,
  CheckCircle
} from "lucide-react";

import {
  MockScreenShot,
  MockDashboardVisual,
  MockAnalysisVisual,
  MockCurrencyVisual,
  MockSettlementVisual,
  MockCommandPaletteVisual
} from "../components/help/HelpVisuals";

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
    description: "Swoje dane przechowujesz lokalnie lub na własnym koncie Google Drive z 4-cyfrowym kodem PIN.",
    icon: <ShieldCheck className="w-5 h-5 text-brand" />,
    wrapperClass: "bg-surface border border-border p-4 rounded-2xl flex items-start gap-3 shadow-xs",
    iconClass: "p-2 bg-brand-subtle text-brand border border-brand/20 rounded-xl shrink-0"
  },
  {
    title: "Symulatory i Decyzje",
    description: "Kalkulatory poduszki finansowej (3/6/12M) oraz kaskada spłaty długu metodą Kuli Śnieżnej.",
    icon: <Zap className="w-5 h-5 text-brand" />,
    wrapperClass: "bg-surface border border-border p-4 rounded-2xl flex items-start gap-3 shadow-xs",
    iconClass: "p-2 bg-brand-subtle text-brand border border-brand/20 rounded-xl shrink-0"
  },
  {
    title: "10 Banków & Kursy NBP",
    description: "Automatyczny import wyciągów z 10 banków w Polsce z przeliczaniem walut po kursie średnim NBP.",
    icon: <FileSpreadsheet className="w-5 h-5 text-brand" />,
    wrapperClass: "bg-surface border border-border p-4 rounded-2xl flex items-start gap-3 shadow-xs",
    iconClass: "p-2 bg-brand-subtle text-brand border border-brand/20 rounded-xl shrink-0"
  }
];

export interface HelpSectionData {
  id: string;
  cat: string;
  title: string;
  icon: React.ReactNode;
  badge?: string;
  keywords?: string[];
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
    keywords: ["start", "kroki", "początek", "instrukcja", "pierwsze kroki", "safe-to-spend", "csv"],
    defaultOpen: true,
    content: (
      <>
        <p className="mb-4 text-sm text-text-muted leading-relaxed">
          Witamy w Saldo! Aplikacja została zaprojektowana w modelu <strong className="text-text-main">Local-First</strong> z myślą o maksymalnej przejrzystości i ochronie Twojej płynności finansowej. Poniżej znajduje się zestaw pierwszych kroków:
        </p>

        <MockScreenShot
          title="Aplikacja Saldo — Wskazówki nawigacji"
          badge="Interfejs użytkownika"
          steps={[
            {
              step: 1,
              label: "Wprowadź stałe dochody i rachunki",
              description: "Dodaj w sekcji Płatności comiesięczne opłaty (czynsz, media, abonamenty) oraz termin wypłaty wynagrodzenia."
            },
            {
              step: 2,
              label: "Zaimportuj wyciąg bankowy CSV",
              description: "Kliknij 'Importuj CSV' w zakładce Transakcje i przeciągnij plik z mBanku, PKO, ING, Millennium lub innego banku."
            },
            {
              step: 3,
              label: "Sprawdź Safe-to-Spend i Runway",
              description: "Zobacz swój bilans na Pulpicie — aplikacja od razu wyliczy ile możesz bezpiecznie wydać po odliczeniu opłat."
            }
          ]}
        >
          <MockDashboardVisual />
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
    keywords: ["komendy", "skróty", "command", "palette", "cmdk", "ctrlk", "slash", "wyszukiwanie", "szukaj"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Paleta Komend umożliwia błyskawiczne sterowanie aplikacją Saldo bez odrywania rąk od klawiatury. Otworzysz ją z dowolnego miejsca za pomocą skrótu <strong>Cmd+K</strong> (Mac), <strong>Ctrl+K</strong> (Windows/Linux) lub naciskając klawisz <strong>/</strong> (slash).
        </p>

        <MockScreenShot title="Wyszukiwarka transakcji i nawigacja" badge="Paleta ⌘K">
          <MockCommandPaletteVisual />
        </MockScreenShot>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1 shadow-xs">
            <span className="font-bold text-text-main block">🔍 Szybkie szukanie transakcji</span>
            <p className="text-text-muted">Wpisz nazwę sklepu (np. "Biedronka", "Orlen"), kwotę lub kategorię, a lista wyników pojawi się natychmiastowo.</p>
          </div>
          <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1 shadow-xs">
            <span className="font-bold text-text-main block">⚡ Błyskawiczne akcje</span>
            <p className="text-text-muted">Wpisz nazwę widoku ("Płatności", "Analizy", "Cele") lub polecenie "+ Nowa transakcja", aby od razu wywołać właściwy formularz.</p>
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
    keywords: ["safe-to-spend", "runway", "pulpit", "bilans", "płynność", "wskaźniki", "poduszka", "kalkulacja", "wzór"],
    defaultOpen: true,
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Pulpit Główny w Saldo to Twoje centrum dowodzenia. Każdy wskaźnik pełni ściśle określoną rolę chroniącą Cię przed wpadnięciem w dołek finansowy:
        </p>

        <MockScreenShot title="Pulpit Finansowy i Wskaźniki Płynności" badge="Algorytmy Saldo">
          <MockDashboardVisual />
        </MockScreenShot>

        <div className="space-y-3">
          <div className="p-4 bg-surface rounded-xl border border-border shadow-xs space-y-2">
            <h5 className="font-bold text-text-main text-xs sm:text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand" />
              Wzór kalkulacji Safe-to-Spend (Kwota Bezpieczna)
            </h5>
            <div className="p-3 bg-surface-2 rounded-lg font-mono text-xs text-text-main border border-border overflow-x-auto">
              Safe-to-Spend = Saldo Kont Operacyjnych - Zaplanowane Rachunki - Miesięczne Cele - Bufor Awaryjny
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              W przeciwieństwie do zwykłego stanu konta, <strong>Safe-to-Spend</strong> uwzględnia wszystkie nadchodzące obciążenia do końca bieżącego miesiąca.
            </p>
          </div>

          <div className="p-4 bg-surface rounded-xl border border-border shadow-xs space-y-2">
            <h5 className="font-bold text-text-main text-xs sm:text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              Wskaźnik Runway (Poduszka w miesiącach)
            </h5>
            <div className="p-3 bg-surface-2 rounded-lg font-mono text-xs text-text-main border border-border overflow-x-auto">
              Runway (mies.) = Dostępne Płynne Środki / Średni Miesięczny Koszt Życia (Burn Rate 3-6M)
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Informuje na ile miesięcy wystarczy płynnych rezerw w razie nagłej utraty dochodów. Wartość powyżej 6 miesięcy oznacza pełną stabilność finansową.
            </p>
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
    badge: "Wzorce Finansowe",
    keywords: ["50/30/20", "kula śnieżna", "snowball", "poduszka", "symulator", "burn rate", "oszczędności", "dług", "analizy", "trendy", "spłata długu", "savings rate"],
    defaultOpen: true,
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Moduł analityczny w Saldo łączy analizę historyczną z symulatorami strategicznymi (50/30/20, Poduszka 3/6/12M oraz Kaskada Kuli Śnieżnej):
        </p>

        <MockScreenShot title="Wzorce finansowe i symulatory strategiczne" badge="Analizy Finansowe">
          <MockAnalysisVisual />
        </MockScreenShot>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1 shadow-xs">
            <span className="font-bold text-brand block">⚖️ Wzorzec Budżetowy 50 / 30 / 20</span>
            <p className="text-text-muted">
              Dzieli wydatki na: <strong>50% Potrzeby</strong> (rachunki, jedzenie, transport), <strong>30% Styl życia</strong> (rozrywka, hobby) oraz <strong>20% Oszczędności</strong>.
            </p>
          </div>
          <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1 shadow-xs">
            <span className="font-bold text-brand block">🛡️ Symulator Poduszki (3 / 6 / 12M)</span>
            <p className="text-text-muted">
              Wylicza wymagany kapitał bezpieczeństwa w oparciu o realny <em>burn rate</em> i estymuje liczbę miesięcy do celu przy obecnej nadwyżce operacyjnej.
            </p>
          </div>
          <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1 shadow-xs">
            <span className="font-bold text-danger block">💳 Kaskada Spłaty Długu (Kula Śnieżna)</span>
            <p className="text-text-muted">
              Szereguje zobowiązania od najmniejszego salda, aby jak najszybciej uwalniać miesięczne raty na nadpłacanie kolejnych pozycji.
            </p>
          </div>
          <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1 shadow-xs">
            <span className="font-bold text-text-main block">📈 Średnie Kroczące &amp; Drivers</span>
            <p className="text-text-muted">
              Wylicza średnie z ostatnich 3-6 miesięcy i wskazuje kategorie o najwyższej dynamice wzrostu kosztów lub największych redukcjach.
            </p>
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
    keywords: ["waluty", "nbp", "kursy", "tabela a", "eur", "usd", "gbp", "chf", "przelicznik", "offline"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Saldo posiada wbudowaną obsługę wielu walut z automatycznym pobieraniem oficjalnych tabel kursów średnich Narodowego Banku Polskiego (NBP):
        </p>

        <MockScreenShot title="Przelicznik walutowy NBP w Saldo" badge="Kursy oficjalne">
          <MockCurrencyVisual />
        </MockScreenShot>

        <ul className="list-disc pl-5 space-y-2 text-xs">
          <li><strong>Waluta bazowa profilu:</strong> PLN, EUR, USD, GBP lub CHF z dedykowanym formatowaniem kwot.</li>
          <li><strong>Automatyczne przeliczanie:</strong> Importując transakcję w EUR na profilu PLN, system przeliczy kwotę według średniego kursu NBP z dnia operacji.</li>
          <li><strong>Pełna praca offline:</strong> Pobierane tabele kursów są archiwizowane w lokalnym cache pamięci urządzenia.</li>
        </ul>
      </div>
    )
  },
  {
    id: "transactions-csv",
    cat: "Transakcje i Banki CSV",
    title: "Księga Transakcji i Inteligentny Importer CSV (10 Banków)",
    icon: <History className="w-5 h-5" />,
    keywords: ["transakcje", "csv", "import", "wyciąg", "bank", "mbank", "pko", "ing", "santander", "millennium", "revolut"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Księga transakcji gromadzi całą historię wpływów i wydatków. Wyciągi bankowe możesz importować w formacie CSV jednym ruchem:
        </p>

        <div className="p-4 bg-surface border border-border rounded-xl text-xs space-y-2 shadow-xs">
          <span className="font-bold text-text-main block">Dedykowane presety bankowe w Polsce:</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {["mBank", "PKO BP (iPKO)", "ING Bank Śląski", "Santander", "Bank Millennium", "Bank Pekao", "Alior Bank", "BNP Paribas", "Revolut", "Generic CSV"].map((bank) => (
              <div key={bank} className="p-2 bg-surface-2 border border-border rounded-lg text-center font-bold text-text-main">
                {bank}
              </div>
            ))}
          </div>
          <p className="text-text-muted text-[11px] mt-2">
            Aplikacja automatycznie wykrywa kodowanie znaków (UTF-8 / Windows-1250) oraz separator kolumn (przecinek / średnik).
          </p>
        </div>
      </div>
    )
  },
  {
    id: "payments-timeline",
    cat: "Rachunki i Timeline",
    title: "4 Filary Horyzontów Płatności i Oś Czasu Cashflow",
    icon: <Clock className="w-5 h-5" />,
    keywords: ["rachunki", "timeline", "horyzonty", "płatności", "zaległe", "dzisiaj", "cashflow", "opłaty", "czynsz"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Oś czasu w Saldo porządkuje nadchodzące i cykliczne płatności w 4 czytelnych horyzontach czasowych:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-center">
          <div className="p-3 bg-danger-subtle text-danger border border-danger/20 rounded-xl font-bold shadow-xs">1. Zaległe</div>
          <div className="p-3 bg-brand-subtle text-brand border border-brand/20 rounded-xl font-bold shadow-xs">2. Dzisiaj</div>
          <div className="p-3 bg-surface-2 text-text-main border border-border rounded-xl font-bold shadow-xs">3. 7 Dni</div>
          <div className="p-3 bg-surface-2 text-text-muted border border-border rounded-xl font-bold shadow-xs">4. 30 Dni</div>
        </div>

        <p className="text-xs text-text-muted leading-relaxed">
          Oznaczając rachunek jako <strong>opłacony</strong>, aplikacja automatycznie tworzy powiązaną transakcję wyjściową w Księdze Transakcji, oszczędzając Twój czas.
        </p>
      </div>
    )
  },
  {
    id: "budgets",
    cat: "Budżety i Limity",
    title: "Budżety miesięczne i wskaźniki ostrzeżeń",
    icon: <Wallet className="w-5 h-5" />,
    keywords: ["budżet", "limity", "ostrzeżenia", "kategorie", "przekroczenie", "wydatki"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Budżety pozwalają nałożyć miesięczny limit na poszczególne kategorie wydatków (np. 1500 zł na Jedzenie, 500 zł na Rozrywkę).
        </p>

        <div className="p-3.5 bg-surface border border-border rounded-xl text-xs space-y-1.5 shadow-xs">
          <span className="font-bold text-text-main block">Poziomy ostrzeżeń:</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span><strong>80% limitu:</strong> Żółty wskaźnik zbliżania się do granicy budżetu.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger" />
            <span><strong>100%+ limitu:</strong> Czerwone ostrzeżenie i propozycja korekty na Pulpicie.</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "goals",
    cat: "Cele i Inwestycje",
    title: "Majątek Netto (Net Worth) i Cele Oszczędnościowe",
    icon: <Target className="w-5 h-5" />,
    badge: "Poza budżetem",
    keywords: ["cele", "inwestycje", "majątek", "net worth", "oszczędności", "aktywa", "pasywa"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Moduł celów i inwestycji pozwala monitorować majątek netto oraz postępy w gromadzeniu oszczędności:
        </p>

        <div className="bg-brand-subtle border border-brand/20 p-4 rounded-xl text-xs sm:text-sm text-brand flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-sm font-bold mb-1">Czystość semantyczna Net Worth</strong>
            Wpisy w sekcji inwestycji i celów mają charakter wyłącznie ewidencyjny. Nie powiększają kwoty <em>Safe-to-Spend</em> ani nie zniekształcają miesięcznego bilansu operacyjnego.
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
    keywords: ["profile", "pin", "wspólny", "shared", "partner", "rozliczenia", "settlement", "hasło", "blokada", "bezpieczeństwo"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Saldo umożliwia posiadanie wielu odizolowanych profili finansowych w ramach jednej aplikacji (np. "Mój budżet prywatny" oraz "Wspólny budżet z partnerem"):
        </p>

        <MockScreenShot title="Rozliczenia w Profilu Wspólnym" badge="Split 50/50">
          <MockSettlementVisual />
        </MockScreenShot>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1 shadow-xs">
            <span className="font-bold text-text-main block">👫 Profil Wspólny (Shared)</span>
            <p className="text-text-muted">Oznaczaj kto płacił (Ja / Partner) i jak dzielić koszt (50/50, Tylko Ja, Tylko Partner). Widget na pulpicie sam wylicza bilans zwrotów.</p>
          </div>
          <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1 shadow-xs">
            <span className="font-bold text-text-main block">🔒 4-cyfrowy kod PIN</span>
            <p className="text-text-muted">Zabezpiecz wybrany profil prywatnym kodem PIN. Przełączenie na ten profil będzie wymagać poprawnej autoryzacji.</p>
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
    keywords: ["kopia", "backup", "dysk", "google", "drive", "chmura", "auto-sync", "json", "pdf", "eksport", "import"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Twoje dane finansowe należą wyłącznie do Ciebie. Saldo nie korzysta z własnych zewnętrznych serwerów bazy danych — zamiast tego zapisuje stan w przeglądarce (IndexedDB) oraz na Twoim prywatnym Dysku Google:
        </p>

        <ul className="list-disc pl-5 space-y-2 text-xs">
          <li><strong>Lokalny plik JSON:</strong> Pobierz zaszyfrowaną lub jawną kopię zapasową w dowolnym momencie.</li>
          <li><strong>Google Drive Auto-Sync:</strong> Bezpieczna synchronizacja z plikiem <code className="bg-surface px-1 py-0.5 rounded border border-border">saldo_budget.json</code> w prywatnym katalogu Twojego Dysku Google.</li>
          <li><strong>Raporty PDF i CSV:</strong> Eksportuj comiesięczne estetyczne zestawienia gotowe do druku lub analizy w Excelu.</li>
        </ul>
      </div>
    )
  },
  {
    id: "ai",
    cat: "Lokalne AI",
    title: "Tryby pracy AI (None, Lokalne Ollama, Gemini)",
    icon: <Sparkles className="w-5 h-5" />,
    keywords: ["ai", "sztuczna inteligencja", "ollama", "lokalne", "gemini", "modele", "prywatność", "none"],
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
            Łączy się z lokalnym modelem uruchomionym na Twoim komputerze za pomocą aplikacji Ollama (<code className="bg-surface px-1 py-0.5 rounded border border-border">http://localhost:11434</code>).
          </li>
        </ul>
        <div className="p-4 bg-surface border border-border rounded-xl space-y-3 text-xs">
          <strong className="text-text-main block">Import wyciągów PDF</strong>
          <p>
            Tekstowy PDF jest odczytywany lokalnie w przeglądarce. Aplikacja rozpoznaje daty, opisy i kwoty, sprawdza niepoprawne wiersze oraz duplikaty, a przed zapisem pokazuje podgląd.
          </p>
          <p>
            Skanowany PDF bez warstwy tekstowej jest zamieniany na obrazy stron i analizowany przez model multimodalny. W ustawieniach taki model ma oznaczenie <strong>(obrazy)</strong> i capability <strong>vision</strong>.
          </p>
          <p>
            Model tekstowy, np. <code className="bg-surface-2 px-1 rounded border border-border">qwen3:4b</code>, obsługuje tekst i tekstowe PDF-y, ale nie skany. Do skanów wybierz zainstalowany model multimodalny, np. <code className="bg-surface-2 px-1 rounded border border-border">gemma3:4b</code>.
          </p>
          <p className="font-semibold text-text-main">
            Żadne transakcje nie są zapisywane automatycznie: zawsze zatwierdzasz poprawne pozycje na ekranie podglądu.
          </p>
        </div>
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
    question: "Jak dokładnie wyliczana jest kwota Safe-to-Spend?",
    answer: "Safe-to-Spend = (Bieżące saldo kont operacyjnych) - (Planowane rachunki do końca miesiąca) - (Cele oszczędnościowe) - (Bufor awaryjny). Dzięki temu wiesz dokładnie ile możesz bezpiecznie wydać, nie ryzykując braku środków na rachunki."
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
    question: "Czy moje dane trafiają na serwery twórców aplikacji?",
    answer: "Nie. Saldo działa w architekturze Local-First. Twoje finanse są zapisywane wyłącznie na Twoim urządzeniu w bezpiecznej pamięci przeglądarki lub na Twoim osobistym koncie Google Drive."
  },
  {
    question: "Jak działa rozliczanie wydatków z partnerem w profilu wspólnym?",
    answer: "W profilu wspólnym każda transakcja ma oznaczonego płatnika (Ja / Partner) oraz regułę podziału (50/50 lub 100%). Algorytm na bieżąco kompensuje wzajemne płatności i pokazuje w widgecie jedną sumę wyrównawczą."
  },
  {
    question: "Co się stanie, gdy zapomnę kodu PIN?",
    answer: "Kod PIN zabezpiecza dostęp do wybranego profilu. Możesz zresetować zapomniany PIN w Ustawieniach lub przywrócić niezabezpieczoną kopię zapasową z pliku JSON lub Google Drive."
  }
];
