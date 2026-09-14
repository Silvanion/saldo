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
  CheckCircle,
  Landmark
} from "lucide-react";

import {
  MockScreenShot,
  MockDashboardVisual,
  MockAnalysisVisual,
  MockCurrencyVisual,
  MockSettlementVisual,
  MockCommandPaletteVisual,
  MockDebtsVisual,
  MockLocalAiVisual
} from "../components/help/HelpVisuals";

export const helpCategories = [
  "Wszystko",
  "Szybki start",
  "Paleta komend (⌘K)",
  "Pulpit i Wskaźniki",
  "Analizy i Symulatory",
  "Kredyty i Hipoteka",
  "Wielowalutowość & NBP",
  "Transakcje i Banki CSV",
  "Rachunki i Timeline",
  "Budżety i Limity",
  "Cele i Inwestycje",
  "Profile i PIN",
  "Kopia i Chmura",
  "Automatyzacja lokalna"
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
    wrapperClass: "bg-surface border border-border/70 p-4 rounded-xl flex items-start gap-3 shadow-xs",
    iconClass: "p-2 bg-brand-subtle text-brand border border-brand/20 rounded-xl shrink-0"
  },
  {
    title: "Symulatory i Decyzje",
    description: "Kalkulatory poduszki finansowej (3/6/12M) oraz kaskada spłaty długu metodą Kuli Śnieżnej.",
    icon: <Zap className="w-5 h-5 text-brand" />,
    wrapperClass: "bg-surface border border-border/70 p-4 rounded-xl flex items-start gap-3 shadow-xs",
    iconClass: "p-2 bg-brand-subtle text-brand border border-brand/20 rounded-xl shrink-0"
  },
  {
    title: "10 Banków & Kursy NBP",
    description: "Automatyczny import wyciągów z 10 banków w Polsce z przeliczaniem walut po kursie średnim NBP.",
    icon: <FileSpreadsheet className="w-5 h-5 text-brand" />,
    wrapperClass: "bg-surface border border-border/70 p-4 rounded-xl flex items-start gap-3 shadow-xs",
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
          <div className="p-3.5 bg-surface border border-border/70 rounded-xl space-y-1 shadow-xs">
            <span className="font-semibold text-text-main block">Szybkie szukanie transakcji</span>
            <p className="text-text-muted">Wpisz nazwę sklepu (np. "Biedronka", "Orlen"), kwotę lub kategorię, a lista wyników pojawi się natychmiastowo.</p>
          </div>
          <div className="p-3.5 bg-surface border border-border/70 rounded-xl space-y-1 shadow-xs">
            <span className="font-semibold text-text-main block">Błyskawiczne akcje</span>
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
          <div className="p-3.5 bg-surface border border-border/70 rounded-xl space-y-1 shadow-xs">
            <span className="font-semibold text-brand block">Wzorzec Budżetowy 50 / 30 / 20</span>
            <p className="text-text-muted">
              Dzieli wydatki na: <strong>50% Potrzeby</strong> (rachunki, jedzenie, transport), <strong>30% Styl życia</strong> (rozrywka, hobby) oraz <strong>20% Oszczędności</strong>.
            </p>
          </div>
          <div className="p-3.5 bg-surface border border-border/70 rounded-xl space-y-1 shadow-xs">
            <span className="font-semibold text-brand block">Symulator Poduszki (3 / 6 / 12M)</span>
            <p className="text-text-muted">
              Wylicza wymagany kapitał bezpieczeństwa w oparciu o realny <em>burn rate</em> i estymuje liczbę miesięcy do celu przy obecnej nadwyżce operacyjnej.
            </p>
          </div>
          <div className="p-3.5 bg-surface border border-border/70 rounded-xl space-y-1 shadow-xs">
            <span className="font-semibold text-danger block">Kaskada Spłaty Długu (Kula Śnieżna)</span>
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
    id: "debts-overview",
    cat: "Kredyty i Hipoteka",
    title: "Co mogę zrobić w module Kredyty i Hipoteka?",
    icon: <Landmark className="w-5 h-5 text-brand" />,
    badge: "Przegląd modułu",
    keywords: ["kredyt", "hipoteka", "dług", "zadłużenie", "rata", "wstęp", "co to jest"],
    defaultOpen: true,
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Moduł <strong>Kredyty i Hipoteka</strong> służy do monitorowania wszystkich Twoich zobowiązań w jednym miejscu i zarządzania portfelem zadłużenia.
        </p>
        <p className="leading-relaxed">
          Możesz w nim śledzić całkowite saldo, koszty obsługi oraz badać wpływ potencjalnych nadpłat (scenariusze What-If) i refinansowania na czas trwania długu oraz sumę zapłaconych odsetek.
        </p>
        <div className="p-3.5 bg-surface border border-border/70 rounded-xl space-y-1 shadow-xs">
          <span className="font-semibold text-text-main block">Od czego zacząć?</span>
          <p className="text-text-muted">Zacznij od dodania wszystkich swoich kredytów za pomocą przycisku "Dodaj zobowiązanie".</p>
        </div>
      </div>
    )
  },
  {
    id: "debts-adding",
    cat: "Kredyty i Hipoteka",
    title: "Jak dodać kredyt lub inne zobowiązanie?",
    icon: <Landmark className="w-5 h-5" />,
    keywords: ["dodaj", "nowy", "kredyt", "jak dodać"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Aby dodać nowe zobowiązanie, użyj przycisku <strong>+ Dodaj zobowiązanie</strong>. Wypełnij najważniejsze pola, z których najważniejsze to:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Bieżące saldo:</strong> Ile kapitału zostało do spłaty (bez przyszłych odsetek).</li>
          <li><strong>Miesięczna rata:</strong> Twoja obecna, pełna rata (kapitał + odsetki).</li>
          <li><strong>Oprocentowanie:</strong> Skala w % w skali roku (np. 7.5).</li>
        </ul>
        <p className="leading-relaxed">
          Zwróć uwagę, by odróżnić obecne saldo od całkowitej kwoty, na którą opiewał kredyt. Prawidłowe i aktualne dane pozwalają na wyliczenie dokładniejszego harmonogramu (np. daty spłaty) i trafniejsze symulacje.
        </p>
        <div className="p-3.5 bg-brand-subtle/20 border border-brand/30 rounded-xl space-y-1">
          <span className="font-semibold text-text-main block">Ważne: Brakujące dane</span>
          <p className="text-text-muted">Jeśli nie podasz np. raty i oprocentowania, system nie wyliczy harmonogramu ani daty końcowej, a zobowiązanie będzie traktowane jak zwykła kwota do zapłaty bez prognozowania odsetek.</p>
        </div>
      </div>
    )
  },
  {
    id: "debts-portfolio",
    cat: "Kredyty i Hipoteka",
    title: "Jak czytać podsumowanie portfela?",
    icon: <TrendingUp className="w-5 h-5" />,
    keywords: ["portfolio", "portfel", "podsumowanie", "kpi", "wacd", "odsetki", "saldo"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          W górnej części zakładki Portfel zobowiązań znajduje się pasek z najważniejszymi wskaźnikami:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Łączne saldo:</strong> Całkowity pozostały kapitał do spłaty.</li>
          <li><strong>Miesięczna obsługa:</strong> Suma minimalnych rat wszystkich kredytów.</li>
          <li><strong>Średni ważony koszt (WACD):</strong> Średnie oprocentowanie całego portfela.</li>
          <li><strong>Pozostałe odsetki:</strong> Estymowana kwota samych odsetek do końca trwania długów.</li>
        </ul>
        <div className="p-3.5 bg-brand-subtle/20 border border-brand/30 rounded-xl space-y-1 mt-2">
          <span className="font-semibold text-text-main block">Ważne: Wskaźniki to szacunki</span>
          <p className="text-text-muted">KPI są wyliczane na bieżąco na podstawie dostarczonych danych lokalnych. Część wartości to modele analityczne (szacunki oparte o stałą kwotę raty), a braki danych wpłyną na ich precyzję.</p>
        </div>
      </div>
    )
  },
  {
    id: "debts-strategies",
    cat: "Kredyty i Hipoteka",
    title: "Jak działają strategie spłaty (Lawina vs Kula Śnieżna)?",
    icon: <Layers className="w-5 h-5" />,
    keywords: ["lawina", "avalanche", "kula śnieżna", "snowball", "strategia", "custom"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Moduł oferuje trzy podejścia do szeregowania nadpłat w symulacjach i planowaniu:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Lawina (Avalanche):</strong> Priorytetyzuje długi z największym oprocentowaniem. Minimalizuje to łączną sumę odsetek i daje największe oszczędności matematyczne.</li>
          <li><strong>Kula Śnieżna (Snowball):</strong> Skupia się na długach z najmniejszym saldem. Pozwala to na szybkie zamykanie małych pożyczek, uwalniając ich raty do spłacania kolejnych (szybki efekt psychologiczny).</li>
          <li><strong>Własna kolejność (Custom):</strong> Pozwala ręcznie ułożyć pozycje na liście priorytetów według własnych potrzeb.</li>
        </ul>
        <p className="leading-relaxed">
          Nie istnieje jedna uniwersalnie "najlepsza" strategia – wybór to często kompromis pomiędzy matematyczną optymalizacją (Lawina) a motywacją z widocznych postępów (Kula Śnieżna).
        </p>
      </div>
    )
  },
  {
    id: "debts-what-if",
    cat: "Kredyty i Hipoteka",
    title: "Do czego służą scenariusze What-If?",
    icon: <Sparkles className="w-5 h-5" />,
    keywords: ["what-if", "scenariusz", "symulacja", "zapisz", "porównaj"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          <strong>Scenariusz What-If (Co by było, gdyby...)</strong> pozwala sprawdzić, jak zmieni się czas spłaty i całkowity koszt kredytów, jeśli zmienisz pewne parametry – np. przeznaczysz dodatkowe 1000 zł miesięcznie na nadpłaty.
        </p>
        <p className="leading-relaxed">
          Scenariusz nie modyfikuje rzeczywistego salda w Twoim portfelu. W panelu bocznym możesz testować strategie, wpisywać nadpłaty i obserwować na bieżąco nowe szacunki. Stworzoną symulację możesz zapisać, aby później łatwo ją porównać z innymi (np. w zakładce Oferty & Refinansowanie).
        </p>
        <div className="p-3.5 bg-brand-subtle/20 border border-brand/30 rounded-xl space-y-1">
          <span className="font-semibold text-text-main block">Ważne: To tylko symulacje</span>
          <p className="text-text-muted">Wyniki What-If są wyłącznie szacunkami matematycznymi i narzędziem do eksploracji wariantów, a nie gwarancją konkretnych kwot w wybranym banku.</p>
        </div>
      </div>
    )
  },
  {
    id: "debts-multiple-overpayments",
    cat: "Kredyty i Hipoteka",
    title: "Jak działa harmonogram jednorazowych nadpłat?",
    icon: <Calendar className="w-5 h-5" />,
    keywords: ["harmonogram", "wielokrotne", "nadpłaty", "jednorazowe", "kalendarz", "bonus"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          W module What-If możesz zaplanować <strong>więcej niż jedną nadpłatę</strong> na przestrzeni czasu. Każda pozycja w harmonogramie określa kwotę oraz miesiąc, w którym wystąpi (gdzie miesiąc 1 to najbliższy planowany moment zasilenia).
        </p>
        <p className="leading-relaxed">
          To doskonałe narzędzie do modelowania np. przyszłych bonusów rocznych, zwrotu podatku, czy spieniężenia lokaty. 
        </p>
        <div className="p-3.5 bg-surface border border-border rounded-xl space-y-1 shadow-xs">
          <span className="font-bold text-text-main block">Przykład:</span>
          <ul className="list-disc pl-5 text-text-muted">
            <li><strong>5 000 zł</strong> w miesiącu 3 (zwrot podatku)</li>
            <li><strong>10 000 zł</strong> w miesiącu 12 (premia roczna)</li>
            <li><strong>3 000 zł</strong> w miesiącu 24 (zapadająca lokata)</li>
          </ul>
        </div>
        <div className="p-3.5 bg-brand-subtle/20 border border-brand/30 rounded-xl space-y-1">
          <span className="font-semibold text-text-main block">Ważne: Limity danych</span>
          <p className="text-text-muted">Wartości ujemne nie są akceptowane, a wpłaty zaplanowane po zredukowaniu całego zadłużenia do zera nie wpływają już na wyniki kalkulacji.</p>
        </div>
      </div>
    )
  },
  {
    id: "debts-timeline",
    cat: "Kredyty i Hipoteka",
    title: "Jak czytać wykres spadku zadłużenia?",
    icon: <LineChart className="w-5 h-5" />,
    keywords: ["wykres", "timeline", "oś czasu", "spadek", "baseline", "status quo"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Wykres w module symulacyjnym (DebtPayoffChart) obrazuje, jak szybko będzie malało saldo wszystkich Twoich zobowiązań.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Oś pozioma:</strong> Kolejne miesiące symulacji.</li>
          <li><strong>Oś pionowa:</strong> Łączny pozostający do spłaty kapitał (saldo).</li>
          <li><strong>Szara linia przerywana (Status Quo):</strong> Plan bazowy, czyli przebieg spłat bez żadnych nadpłat (płacenie samych minimalnych rat).</li>
          <li><strong>Kolorowa linia (Strategia):</strong> Oś czasu (timeline) dla modyfikowanego scenariusza (np. z nadpłatami i kaskadą), wizualizująca szybsze zejście salda do zera.</li>
        </ul>
        <div className="p-3.5 bg-brand-subtle/20 border border-brand/30 rounded-xl space-y-1 mt-2">
          <span className="font-semibold text-text-main block">Ważne: Wykres to projekcja</span>
          <p className="text-text-muted">Zastrzegamy, że wykres nie przewiduje przyszłych zmian stóp procentowych ani opłat i prowizji bankowych. Jest to matematyczna projekcja estymująca tempo redukcji długu.</p>
        </div>
      </div>
    )
  },
  {
    id: "debts-simulator",
    cat: "Kredyty i Hipoteka",
    title: "Co pokazuje symulator pojedynczej nadpłaty?",
    icon: <Target className="w-5 h-5" />,
    keywords: ["symulator", "pojedyncza", "detale", "skrócenie", "nadpłata"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Wchodząc w szczegóły konkretnego zobowiązania, zyskujesz dostęp do wbudowanego <strong>Symulatora Nadpłaty</strong> dedykowanego tylko temu kredytowi.
        </p>
        <p className="leading-relaxed">
          Obsługuje on zarówno nadpłaty comiesięczne jak i jednorazowe, symulując <strong>skrócenie okresu kredytowania</strong> przy zachowaniu obecnej raty. Dowiesz się dzięki temu, ile miesięcy szybciej spłacisz zobowiązanie i jak duże oszczędności odsetkowe wygenerujesz. Oszczędności zawsze zależą od kwoty kredytu, odsetek, obecnej raty i pozostałego czasu.
        </p>
        <div className="p-3.5 bg-brand-subtle/20 border border-brand/30 rounded-xl space-y-1 mt-2">
          <span className="font-semibold text-text-main block">Ważne: Narzędzie edukacyjne</span>
          <p className="text-text-muted">Pamiętaj, że symulator stanowi narzędzie edukacyjne, a nie oficjalną poradę finansową. Banki mogą stosować inne mechanizmy zaliczania wpłat.</p>
        </div>
      </div>
    )
  },
  {
    id: "debts-saved-scenarios",
    cat: "Kredyty i Hipoteka",
    title: "Jak zapisywać i porównywać scenariusze?",
    icon: <Database className="w-5 h-5" />,
    keywords: ["zapisz", "scenariusz", "porównanie", "oferty"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Wypracowaną strategię z nałożonym harmonogramem nadpłat możesz łatwo zapisać klikając odpowiedni przycisk. Dzięki temu staje się ona Twoim zapisanym scenariuszem, który nie zniknie.
        </p>
        <p className="leading-relaxed">
          W zakładce <strong>Oferty & Refinansowanie</strong> możesz zestawić ze sobą kilka zapisanych scenariuszy (lub ofert z innego banku), by czytelnie porównać całkowite koszty i oszczędności czasu. Wyniki bazują zawsze na profilu danych obecnym w momencie uruchomienia porównania.
        </p>
      </div>
    )
  },
  {
    id: "debts-refinancing",
    cat: "Kredyty i Hipoteka",
    title: "Czy opłaca się refinansować kredyt?",
    icon: <ArrowRight className="w-5 h-5" />,
    keywords: ["refinansowanie", "przeniesienie", "inny bank", "nowa oferta"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Aplikacja pozwala na eksploracyjne sprawdzanie wariantów refinansowania poprzez moduł <strong>Oferty & Refinansowanie</strong>, gdzie możesz ująć np. niższe oprocentowanie, zmianę okresu oraz ewentualne prowizje (doliczone do nowego salda).
        </p>
        <p className="leading-relaxed">
          Kluczem jest porównywanie <strong>całkowitego kosztu odsetek i ewentualnych prowizji</strong>, a nie tylko samej raty miesięcznej (wydłużenie okresu kredytu zmniejszy ratę, ale zwiększy sumę odsetek).
        </p>
        <div className="p-3.5 bg-brand-subtle/20 border border-brand/30 rounded-xl space-y-1">
          <span className="font-semibold text-text-main block">Ważne</span>
          <p className="text-text-muted">Kalkulacje mają charakter pomocniczy. Aplikacja nie dysponuje aktualnymi stawkami z rynku i nie składa zapytań do banków; wszystkie parametry wprowadzasz ręcznie.</p>
        </div>
      </div>
    )
  },
  {
    id: "debts-limitations",
    cat: "Kredyty i Hipoteka",
    title: "Jakość danych i ograniczenia kalkulacji",
    icon: <ShieldAlert className="w-5 h-5" />,
    keywords: ["ograniczenia", "błędy", "jakość", "szacunki", "dane", "kalkulator"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Silnik Saldo korzysta z klasycznych wzorów matematyki finansowej dla kredytów (raty równe, model odsetkowy od salda). Aby zapewnić rzetelne estymacje, miej na uwadze kilka zasad technicznych:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Brak oprocentowania lub pozostałego terminu/raty blokuje silnik przed przewidywaniem przyszłości. Takie wpisy są traktowane statycznie.</li>
          <li>Założenie o braku zmian WIBOR/WIRON: symulacje są "sztywne", co znaczy, że wyliczają harmonogram zakładając stałość wpisanego przez Ciebie oprocentowania na przestrzeni całego badanego okresu.</li>
          <li>Karty kredytowe z reguły nie są uwzględniane w algorytmach spłat (Avalanche/Snowball) z uwagi na brak stałego oprocentowania i planu amortyzacji - spłacaj je priorytetowo poza główną ścieżką.</li>
          <li>Dane mogą podlegać standardowym zaokrągleniom rachunkowym (co do grosza).</li>
        </ul>
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
    cat: "Automatyzacja lokalna",
    title: "Jak działa rozpoznawanie tekstu, szybkie dodawanie i opcjonalne lokalne AI",
    icon: <Sparkles className="w-5 h-5" />,
    badge: "Zero danych w chmurze",
    keywords: ["parser", "automatyzacja", "lokalne", "prywatność", "szybki wpis", "wklej tekst", "wyciąg", "ollama", "ai", "sztuczna inteligencja", "kategoryzacja"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Podstawowe rozpoznawanie kwot, dat i kategorii działa w całości na Twoim urządzeniu — bez modeli AI i bez połączeń sieciowych. Opcjonalne lokalne AI (Ollama) działa na Twoim komputerze. Jeśli używasz trybu chmurowego na własnym wdrożeniu, dane są wysyłane do skonfigurowanego dostawcy AI — przed użyciem sprawdź ustawienia prywatności.
        </p>

        <ul className="list-disc pl-5 space-y-3 text-xs">
          <li>
            <strong>Wklej tekst wyciągu:</strong><br />
            W imporcie transakcji możesz wkleić historię skopiowaną z banku — separator, daty i znak kwoty są wykrywane automatycznie, a kategorie przypisywane na podstawie nazwy transakcji.
          </li>
          <li>
            <strong>Szybki wpis w palecie poleceń (⌘K):</strong><br />
            Zdanie w rodzaju „prąd 340 zł za 3 dni” zamienia się w gotowy rachunek — bez otwierania osobnego formularza.
          </li>
          <li>
            <strong>Import PDF i OCR:</strong><br />
            Tekstowy PDF jest parsowany lokalnie. Skanowany PDF wymaga włączonego AI i modelu multimodalnego z obsługą obrazów. Aplikacja analizuje maksymalnie 10 pierwszych stron, odrzuca niepełne rekordy i zawsze pokazuje podgląd przed zapisaniem.
          </li>
        </ul>

        <div className="pt-1">
          <h5 className="font-bold text-text-main text-xs sm:text-sm flex items-center gap-2 mb-2">
            <Cpu className="w-4 h-4 text-brand" />
            Lokalne AI (Ollama) — opcjonalne wsparcie dla trudniejszych przypadków
          </h5>
          <p className="text-xs text-text-muted leading-relaxed mb-3">
            Gdy wbudowany parser nie poradzi sobie z nietypowym formatem wyciągu, możesz włączyć w Ustawieniach dodatkową warstwę rozpoznawania opartą o model językowy uruchomiony lokalnie na Twoim komputerze przez <a href="https://ollama.com/" target="_blank" rel="noopener noreferrer" className="text-brand underline font-medium">Ollama</a>. Przeglądarka łączy się bezpośrednio z <code className="bg-surface-2 px-1 py-0.5 rounded border border-border text-brand">localhost</code> — nic nie opuszcza urządzenia.
          </p>

          <MockScreenShot title="Lokalne AI — sugestia kategorii z wyciągu" badge="Ollama · Offline">
            <MockLocalAiVisual />
          </MockScreenShot>

          <ul className="list-disc pl-5 space-y-2 text-xs mt-3">
            <li><strong>Sugestie kategorii:</strong> dla transakcji, których nie rozpoznały Twoje reguły, model zaproponuje kategorię na podstawie opisu.</li>
            <li><strong>Odczyt wklejonego tekstu:</strong> gdy deterministyczny parser nie wyodrębni poprawnie kwot lub dat z nietypowego formatu wyciągu, lokalne AI spróbuje je odczytać.</li>
            <li><strong>Skanowane PDF-y:</strong> wybierz model vision (np. gemma4:12b-mlx), ponieważ zwykły model tekstowy nie odczyta obrazu. Dla każdego skanu sprawdź kwoty, daty i opisy w podglądzie — OCR może wymagać ręcznej korekty.</li>
            <li><strong>Skanowanie faktur:</strong> w formularzu płatności możesz wybrać obraz faktury (JPG, PNG lub WebP do 3 MB). Ta funkcja korzysta z lokalnego modelu wizyjnego (Ollama vision), działa w pełni na Twoim urządzeniu i wstępnie wypełnia formularz — zapis następuje dopiero po Twoim zatwierdzeniu.</li>
            <li><strong>Zawsze do akceptacji:</strong> każda sugestia trafia do podglądu przed importem — nic nie zapisuje się automatycznie bez Twojej zgody.</li>
            <li><strong>Wyłączone domyślnie:</strong> włączasz to ręcznie w Ustawieniach → Automatyzacja, w każdej chwili możesz wyłączyć.</li>
          </ul>
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
  },
  {
    question: "Czym różni się strategia Lawina od Kuli Śnieżnej przy spłacie długów?",
    answer: "Lawina (Avalanche) spłaca najpierw zobowiązanie z najwyższym oprocentowaniem, co minimalizuje sumę zapłaconych odsetek. Kula Śnieżna (Snowball) spłaca najpierw najmniejsze saldo, dając szybsze psychologiczne zwycięstwa i szybciej uwalniając miesięczną ratę na kolejne zobowiązania. Moduł Kredyty i Hipoteka pozwala porównać obie strategie side-by-side dla Twojego portfela."
  },
  {
    question: "Jak działa symulator nadpłaty kredytu lub hipoteki?",
    answer: "W szczegółach zobowiązania możesz wskazać kwotę nadpłaty (jednorazową, miesięczną lub roczną) i strategię (skrócenie okresu spłaty lub zmniejszenie raty). Symulator natychmiast pokazuje realne porównanie: nową ratę, nowy czas spłaty i sumę zaoszczędzonych odsetek."
  },
  {
    question: "Czy lokalne AI (Ollama) wysyła moje dane finansowe do internetu?",
    answer: "Nie. Lokalne AI to opcjonalna funkcja wymagająca zainstalowanej aplikacji Ollama na Twoim komputerze — model językowy działa wyłącznie lokalnie, a przeglądarka łączy się bezpośrednio z localhost. Żadne dane nie są wysyłane na żaden serwer, także nie do twórców Saldo. Funkcja jest domyślnie wyłączona i włączasz ją ręcznie w Ustawieniach."
  },
  {
    question: "Czy transakcja spłaty raty może zostać automatycznie powiązana z kredytem?",
    answer: "Tak. W module Kredyty i Hipoteka możesz połączyć istniejącą transakcję wydatku z konkretnym zobowiązaniem. Historia powiązanych płatności, postęp spłaty i kamienie milowe aktualizują się automatycznie na podstawie tych powiązań."
  }
];
