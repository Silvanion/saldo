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
  Landmark,
  ListTodo
} from "lucide-react";

import {
  MockScreenShot,
  MockCurrencyVisual,
  MockSettlementVisual,
  MockLocalAiVisual,
  Screenshot
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

        <Screenshot
          title="Pulpit Główny — Saldo"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/02-dashboard.png"
          alt="Pulpit Saldo z widocznymi przychodami, wydatkami, bilansem oraz kondycją finansową"
          caption="Prawdziwy widok Pulpitu po dodaniu kilku transakcji: karty Przychody / Wydatki / Bilans, ocena Kondycji finansowej oraz prognoza na koniec miesiąca."
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
        />

        <Screenshot
          title="Dodaj transakcję"
          badge="Formularz"
          src="/assets/help/03-add-transaction-modal.png"
          alt="Formularz dodawania nowej transakcji z polami kwoty, opisu, kategorii i konta"
          caption="Ten formularz otwierasz przyciskiem 'Dodaj wpis' w górnym pasku lub skrótem klawiszowym z Palety Komend (⌘K)."
        />
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

        <Screenshot
          title="Paleta Komend"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/04-command-palette.png"
          alt="Otwarta Paleta Komend z listą dostępnych akcji i wyszukiwarką"
          caption="Zacznij pisać, aby przefiltrować akcje i widoki, albo od razu wpisz nazwę transakcji, by przejść do wyszukiwania."
        />

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

        <Screenshot
          title="Pulpit Finansowy i Wskaźniki Płynności"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/02-dashboard.png"
          alt="Pulpit Saldo z kartami Prognoza na koniec miesiąca, Bezpieczna Kwota do Wydania i Runway"
          caption="Karty 'Prognoza na koniec miesiąca', 'Bezpieczna Kwota do Wydania' i 'Runway (Poduszka Płynności)' aktualizują się automatycznie po każdej zmianie w transakcjach i rachunkach."
        />

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

        <Screenshot
          title="Analiza i Prognozy"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/11-analysis.png"
          alt="Widok Analizy z oceną Kondycji finansowej oraz skrótami do kalkulatora B2B, Planów Działania i Saldo Wrapped"
          caption="Górny pasek widoku Analiza daje dostęp do eksportu raportu PDF, Planów Działania (Claude Skills), Saldo Wrapped oraz Kalkulatora B2B i Podatków."
        />

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

        <Screenshot
          title="Kredyty i Hipoteka — Portfel zobowiązań"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/10-debts.png"
          alt="Widok Kredyty i Hipoteka z KPI portfela, paskiem postępu spłaty i sygnałami decyzyjnymi"
          caption="Górny pasek KPI (Łączne saldo, Miesięczna obsługa, Pozostałe odsetki, WACD) oraz cztery zakładki: Portfel zobowiązań, Scenariusze & Strategie, Oferty & Refinansowanie, Wiedza & Benchmarki."
        />
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

        <Screenshot
          title="Kredyty i Hipoteka — po dodaniu zobowiązania"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/10-debts.png"
          alt="Widok portfela zobowiązań z jednym dodanym kredytem hipotecznym i przyciskiem Dodaj zobowiązanie"
          caption="Przycisk '+ Dodaj zobowiązanie' w prawym górnym rogu otwiera formularz z polami Nazwa, Bank, Aktualne saldo, Rata i Oprocentowanie."
        />
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

        <Screenshot
          title="Pasek KPI portfela zobowiązań"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/10-debts.png"
          alt="Osiem kart KPI portfela zobowiązań: łączne saldo, miesięczna obsługa, pozostałe odsetki, WACD, najdroższy dług, najbliższa płatność, refi alert i potencjał nadpłaty"
          caption="Osiem kart w górnej części ekranu daje natychmiastowy przegląd kondycji całego portfela, bez wchodzenia w szczegóły pojedynczych kredytów."
        />
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

        <Screenshot
          title="Scenariusze & Strategie — Symulator portfela"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/14-debts-strategies.png"
          alt="Zakładka Scenariusze i Strategie z symulatorem strategii spłaty całego portfela oraz suwakiem dodatkowego budżetu na nadpłatę"
          caption="Zakładka 'Scenariusze & Strategie' pozwala ustawić dodatkowy budżet na nadpłatę i od razu zobaczyć wynik dla obu strategii."
        />
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

        <Screenshot
          title="Symulacja wariantowa (What-If)"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/14-debts-strategies.png"
          alt="Panel symulatora strategii spłaty portfela z opcjonalnym przełącznikiem Symulacja wariantowa (What-If)"
          caption="Przełącznik 'Symulacja wariantowa (What-If)' (oznaczony jako Opcjonalnie) znajduje się bezpośrednio pod suwakiem dodatkowego budżetu na nadpłatę."
        />
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

        <Screenshot
          title="Dodatkowy budżet na nadpłatę"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/14-debts-strategies.png"
          alt="Pole dodatkowego budżetu na nadpłatę z szybkimi przyciskami +0, +200, +500, +1000, +2000 zł"
          caption="Szybkie przyciski (+200 zł, +500 zł, +1000 zł...) i pole liczbowe pozwalają szybko przetestować różne kwoty jednorazowych lub cyklicznych nadpłat."
        />
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

        <Screenshot
          title="Postęp spłaty portfela i kamień milowy"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/10-debts.png"
          alt="Pasek postępu spłaty portfela zadłużenia oraz karta najbliższego kamienia milowego"
          caption="Pasek 'Postęp spłaty portfela zadłużenia' i karta 'Najbliższy kamień milowy' na ekranie Portfel zobowiązań dają szybki podgląd postępu — szczegółowy wykres DebtPayoffChart znajdziesz po wejściu w konkretne zobowiązanie."
        />
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

        <Screenshot
          title="Symulator strategii spłaty portfela"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/14-debts-strategies.png"
          alt="Symulator strategii spłaty całego portfela z podaną łączną miesięczną wpłatą"
          caption="Widok pokazuje symulator na poziomie całego portfela. Symulator nadpłaty dla pojedynczego kredytu znajdziesz po wejściu w jego szczegóły — działa na tej samej zasadzie."
        />
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

        <Screenshot
          title="Zapisane scenariusze"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/14-debts-strategies.png"
          alt="Sekcja Zapisane scenariusze (0/5) z przyciskami Porównaj scenariusze i Zapisz bieżący plan"
          caption="Przycisk 'Zapisz bieżący plan' zachowuje aktualne ustawienia symulatora. Możesz zapisać do 5 wariantów i porównać dowolne dwa z nich przyciskiem 'Porównaj scenariusze'."
        />
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

        <Screenshot
          title="Refi Alert"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/10-debts.png"
          alt="Karta Refi Alert na ekranie portfela zobowiązań sygnalizująca kandydata do weryfikacji ofert refinansowania"
          caption="Karta 'Refi Alert' w pasku KPI od razu sygnalizuje, które zobowiązanie warto zweryfikować pod kątem refinansowania — szczegóły znajdziesz w sekcji 'Struktura portfela i sygnały decyzyjne' poniżej."
        />
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

        <Screenshot
          title="Wiedza & Benchmarki"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/15-debts-knowledge.png"
          alt="Zakładka Wiedza i Benchmarki z orientacyjnymi danymi rynkowymi dla kredytów hipotecznych w Polsce"
          caption="Zakładka 'Wiedza & Benchmarki' zestawia Twój kredyt z orientacyjnymi danymi rynkowymi (LTV, marże) — to dobre miejsce, by sprawdzić założenia i ograniczenia kalkulacji."
        />
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

        <Screenshot
          title="Wybór waluty przy dodawaniu transakcji"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/03-add-transaction-modal.png"
          alt="Formularz dodawania transakcji z rozwijaną listą walut PLN, EUR, USD, GBP"
          caption="W formularzu 'Dodaj transakcję' rozwijana lista 'Waluta' pozwala wybrać PLN, EUR, USD lub GBP — kwota zostanie automatycznie przeliczona po kursie średnim NBP z dnia operacji."
        />

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

        <Screenshot
          title="Księga Transakcji"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/06-transactions.png"
          alt="Widok Historia transakcji z listą wpisów, filtrami i panelem raportowania po tagach"
          caption="Przyciski 'Importuj' i 'Eksportuj' znajdują się nad tabelą. Panel po prawej ('Wydatki według tagów') pozwala grupować i filtrować wydatki po własnych etykietach."
        />

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

        <Screenshot
          title="Rachunki i Subskrypcje"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/07-payments.png"
          alt="Widok Płatności z czterema kartami horyzontów czasowych i listą zaplanowanych opłat"
          caption="Cztery karty na górze (Zaległe, Na dzisiaj, Najbliższe 7 dni, Najbliższe 30 dni) filtrują listę poniżej. Przycisk '+ Dodaj nową opłatę' tworzy nowy cykliczny rachunek lub subskrypcję."
        />
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

        <Screenshot
          title="Budżety miesięczne"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/08-budget.png"
          alt="Widok Budżet z kartami kategorii Żywność, Dom i rachunki, Transport, Rozrywka oraz wykorzystaniem limitu"
          caption="Każda karta kategorii pokazuje kwotę wydaną w miesiącu, procent wykorzystania limitu oraz listę ostatnich transakcji z tej kategorii. Przycisk 'Modyfikuj limity' otwiera edycję wszystkich progów naraz."
        />
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

        <Screenshot
          title="Cele Finansowe i Inwestycje"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/09-goals.png"
          alt="Widok Cele i oszczędności z panelem Majątek Netto na górze oraz sekcją Cele oszczędnościowe poniżej"
          caption="Panel 'Majątek Netto' na górze rozbija Twój kapitał na środki płynne, inwestycje i zobowiązania. Sekcja 'Cele oszczędnościowe' poniżej — przycisk '+ Nowy cel' zakłada nową skarbonkę z kwotą docelową."
        />
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

        <Screenshot
          title="Ustawienia Saldo — Profile"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/12-settings.png"
          alt="Widok Ustawień z sekcją Profile i Blokada PIN w lewym menu oraz odznaką Bez PIN w nagłówku"
          caption="Odznaki w nagłówku Ustawień ('Budżet Domowy (PLN)', 'Local-First', 'Bez PIN') pokazują stan aktywnego profilu. Kliknij 'Profile & Blokada PIN' w menu po lewej, aby zarządzać profilami i kodem PIN."
        />

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

        <Screenshot
          title="Ustawienia Saldo — Centrum Usług Google"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/12-settings.png"
          alt="Widok Ustawień z Centrum Usług Google i informacją o architekturze Local-First"
          caption="Sekcja 'Centrum Usług Google' wyjaśnia model Local-First: Twoje finanse są Twoje, a połączenie z Google jedynie synchronizuje dane między urządzeniami przez Twój prywatny Dysk."
        />
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

        <Screenshot
          title="Doradca finansowy AI"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/05-ai-chat.png"
          alt="Otwarte okno Doradcy finansowego AI z polem do wpisania pytania oraz skrótami Skills"
          caption="Przycisk 'Doradca AI' w górnym pasku otwiera czat, który odpowiada na pytania o Twój budżet i może zaproponować konkretną akcję (np. dodanie transakcji) do Twojej akceptacji. Przyciski 'Skills' u dołu to gotowe podpowiedzi pytań."
        />

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

          <h5 className="font-bold text-text-main text-xs sm:text-sm flex items-center gap-2 mb-2 mt-4">
            <ShieldCheck className="w-4 h-4 text-brand" />
            Zewnętrzne modele AI (Gemini, Claude) i Bring Your Own Key
          </h5>
          <p className="text-xs text-text-muted leading-relaxed mb-3">
            Możesz podłączyć zaawansowane modele <strong>Google Gemini</strong> lub <strong>Anthropic Claude</strong>, podając własny klucz API w Ustawieniach. Klucz jest bezpiecznie szyfrowany na Twoim urządzeniu. Co ważne, z modelem wymieniane są jedynie zagregowane statystyki – aplikacja chroni Twoją prywatność i ukrywa historię transakcji, PESEL czy dokładne numery kont.
          </p>

          <MockScreenShot title="Lokalne AI — sugestia kategorii z wyciągu" badge="Ollama / API">
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
  },
  {
    id: "net-worth-wealthfolio",
    cat: "Analizy i Symulatory",
    title: "Majątek Netto (Wealthfolio) — Aktywa, Pasywa i Wskaźniki Płynności",
    icon: <Landmark className="w-5 h-5" />,
    badge: "Nowość v1.3",
    keywords: ["majątek", "net worth", "wealthfolio", "aktywa", "pasywa", "dti", "runway", "wartość netto", "kapitał"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Moduł <strong className="text-text-main">Majątku Netto (Wealthfolio)</strong> pozwala spojrzeć na Twoje finanse z lotu ptaka, precyzyjnie rozdzielając to, co posiadasz (aktywa), od tego, co jesteś winien instytucjom finansowym (pasywa).
        </p>

        <ul className="list-disc pl-5 space-y-2 text-xs">
          <li>
            <strong>Rozbicie Aktywów:</strong> płynna gotówka na kontach operacyjnych, środki w Skarbonkach (celach), wyceny nieruchomości oraz inwestycje kapitałowe.
          </li>
          <li>
            <strong>Rozbicie Pasywów:</strong> kredyty hipoteczne, pożyczki gotówkowe, karty kredytowe, limity w koncie oraz nieopłacone rachunki bieżącego miesiąca.
          </li>
          <li>
            <strong>Wskaźnik DTI (Debt-to-Assets):</strong> stosunek Twoich łącznych długów do zgromadzonych aktywów. Wartość poniżej 30% oznacza zdrowy profil bez nadmiernej dźwigni finansowej.
          </li>
          <li>
            <strong>Bufor Płynności (Liquid Runway):</strong> liczba miesięcy przetrwania w oparciu wyłącznie o gotówkę i płynne oszczędności, niezależnie od majątku trwałego.
          </li>
          <li>
            <strong>Oś Czasu (Timeline):</strong> śledzenie trajektorii wzrostu kapitału miesiąc do miesiąca z dynamiką procentową.
          </li>
        </ul>

        <Screenshot
          title="Majątek Netto (Net Worth)"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/09-goals.png"
          alt="Panel Majątek Netto z podziałem na środki płynne, kapitał inwestycyjny i zobowiązania ogółem"
          caption="Panel 'Majątek Netto' na górze widoku Cele i oszczędności pokazuje rozbicie na Środki płynne i cele, Kapitał inwestycyjny oraz Zobowiązania ogółem, wraz ze strukturą klas aktywów poniżej."
        />
      </div>
    )
  },
  {
    id: "financial-skills-plans",
    cat: "Automatyzacja lokalna",
    title: "Deterministyczne Plany Działania (Claude Skills) i Skarbonki",
    icon: <ListTodo className="w-5 h-5" />,
    badge: "Asystenci Finansowi",
    keywords: ["plany działania", "skills", "umiejętności", "lawina", "poduszka", "subskrypcje", "50/30/20", "checklist"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Zamiast ogólnych porad, Saldo oferuje deterministycznych asystentów taktycznych inspirowanych architekturą Claude Skills. Generują oni gotowe, skrojone pod Twój profil plany z konkretnymi krokami do odhaczenia:
        </p>

        <ul className="list-disc pl-5 space-y-2 text-xs">
          <li>
            <strong>Akcelerator Spłaty Długów:</strong> dobiera najkorzystniejszy plan nadpłat odsetkowych (metoda Lawiny) i szacuje zaoszczędzone odsetki.
          </li>
          <li>
            <strong>Architekt Poduszki Finansowej:</strong> 3-etapowy plan budowy rezerwy awaryjnej (1-miesięczna, 3-miesięczna i 6-miesięczna) z automatycznym wyliczeniem wymaganej kwoty.
          </li>
          <li>
            <strong>Audyt Kosztów Cyklicznych:</strong> identyfikacja i renegocjacja subskrypcji oraz przejście na rozliczenia roczne.
          </li>
          <li>
            <strong>Rebalansowanie Budżetu 50/30/20:</strong> zrównoważenie proporcji między potrzebami, zachciankami i inwestycjami.
          </li>
          <li>
            <strong>1-klikowe Tworzenie Celu:</strong> z poziomu wygenerowanego planu możesz jednym przyciskiem założyć powiązany cel w Skarbonkach.
          </li>
          <li>
            <strong>Śledzenie na Pulpicie:</strong> najbliższy krok z checklisty wyświetla się bezpośrednio na ekranie głównym z przyciskiem szybkiego odznaczenia.
          </li>
        </ul>

        <Screenshot
          title="Wejście do Planów Działania"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/11-analysis.png"
          alt="Przycisk Plany i Umiejętności (Claude Skills) w górnym pasku widoku Analiza"
          caption="Przycisk 'Plany i Umiejętności (Claude Skills)' w widoku Analiza otwiera centrum planów działania — możesz go też wywołać wpisując '+ Nowy plan' w Palecie Komend."
        />
      </div>
    )
  },
  {
    id: "saldo-wrapped-stories",
    cat: "Analizy i Symulatory",
    title: "Saldo Wrapped — Wizualne Karty Podsumowań (Stories) i Eksport PNG",
    icon: <Sparkles className="w-5 h-5" />,
    badge: "Format 9:16",
    keywords: ["saldo wrapped", "stories", "podsumowanie", "karty", "moneyprinterturbo", "social", "png", "grafika"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Zainspirowane popularnym formatem rocznych i miesięcznych podsumowań, <strong className="text-text-main">Saldo Wrapped</strong> przekształca surowe liczby w serię 6 dynamicznych kart narracyjnych:
        </p>

        <ul className="list-disc pl-5 space-y-2 text-xs">
          <li><strong>Intro & Bilans:</strong> syntetyczne podsumowanie wpływów, wydatków, bilansu netto i stopy oszczędności.</li>
          <li><strong>Anatomia Wydatków:</strong> 4 dominujące kategorie z porównaniem procentowym do poprzedniego miesiąca.</li>
          <li><strong>Rytm i Nawyki:</strong> najdroższy dzień tygodnia, największy jednorazowy wydatek oraz dzienny burn rate.</li>
          <li><strong>Majątek & Skarbonki:</strong> postęp realizacji celów i płynne rezerwy finansowe.</li>
          <li><strong>Health Score:</strong> syntetyczny scoring kondycji (0–100 pkt) z kluczowym atutem miesiąca.</li>
          <li><strong>Karta Lidera Saldo:</strong> estetyczna karta wykonawcza z podsumowaniem kluczowych liczb.</li>
          <li><strong>Natywny Eksport PNG:</strong> możliwość pobrania dowolnej karty jako pliku graficznego o wysokiej rozdzielczości (1080x1920) za pomocą jednego kliknięcia.</li>
        </ul>

        <Screenshot
          title="Wejście do Saldo Wrapped"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/11-analysis.png"
          alt="Przycisk Saldo Wrapped (Story) w górnym pasku widoku Analiza"
          caption="Przycisk 'Saldo Wrapped (Story)' w widoku Analiza generuje serię kart na podstawie danych z bieżącego miesiąca."
        />
      </div>
    )
  },
  {
    id: "doctor-saldo-auditor",
    cat: "Kopia i Chmura",
    title: "Doktor Saldo — Autonomiczny Audytor Bazy i Samonaprawa (Self-Healing)",
    icon: <Database className="w-5 h-5" />,
    badge: "Autoprotection & Undo",
    keywords: ["doktor saldo", "audytor", "spójność", "naprawa", "self-healing", "duplikaty", "błędy", "integralność"],
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          <strong className="text-text-main">Doktor Saldo</strong> to autonomiczny silnik diagnostyczny, który czuwa nad nieskazitelną spójnością Twoich danych. Automatycznie wykrywa i naprawia ukryte błędy bazy:
        </p>

        <ul className="list-disc pl-5 space-y-2 text-xs">
          <li><strong>Duplikaty Transakcji:</strong> wychwytuje transakcje o identycznej dacie, kwocie i opisie (np. po wielokrotnym imporcie wyciągów CSV).</li>
          <li><strong>Osierocone Transakcje:</strong> identyfikuje wpisy przypisane do usuniętych kont bankowych i przypisuje je do konta domyślnego.</li>
          <li><strong>Transakcje Bez Kategorii:</strong> wykrywa puste kategorie i uzupełnia je lub przypisuje do kategorii „Inne”.</li>
          <li><strong>Błędne Daty:</strong> koryguje niepoprawne, puste lub omyłkowo wybiegające w daleką przyszłość daty wpisów.</li>
          <li><strong>Rachunki bez Pokrycia:</strong> znajduje zapłacone rachunki, które nie wygenerowały odpowiadającej im transakcji rozchodowej.</li>
          <li><strong>Desynchronizacja Skarbonek:</strong> przelicza sumę wpłat na cele z historią transferów i koryguje zaokrąglenia.</li>
          <li><strong>Automatyczne Bezpieczeństwo (Undo):</strong> przed każdą naprawą tworzona jest migawka stanu, co pozwala natychmiast cofnąć operację skrótem <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-[11px] font-mono">Ctrl+Z</kbd> / <kbd className="px-1.5 py-0.5 bg-surface border border-border rounded text-[11px] font-mono">Cmd+Z</kbd>.</li>
        </ul>

        <Screenshot
          title="Kondycja finansowa na Pulpicie"
          badge="Zrzut ekranu aplikacji"
          src="/assets/help/02-dashboard.png"
          alt="Karta Kondycja finansowa na Pulpicie z wynikiem punktowym i odznaką jakości danych"
          caption="Karta 'Kondycja finansowa' na Pulpicie to punkt wejścia do Doktora Saldo — gdy wykryje anomalie w danych, pojawi się tu alert z przyciskiem uruchamiającym automatyczną diagnostykę i naprawę."
        />
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
  },
  {
    question: "Jak dokładnie obliczany jest Majątek Netto i wskaźnik DTI?",
    answer: "Majątek Netto to suma wszystkich Twoich aktywów (gotówka na kontach, oszczędności w celach, nieruchomości, inwestycje) minus suma wszystkich pasywów (kredyty hipoteczne, pożyczki, karty kredytowe, niezapłacone rachunki). Wskaźnik DTI (Debt-to-Assets) to stosunek łącznego długu do łącznych aktywów — wartość poniżej 30% oznacza bardzo bezpieczny poziom."
  },
  {
    question: "Czym są Plany Działania (Claude Skills) i jak powiązać je ze Skarbonkami?",
    answer: "Plany Działania to deterministyczne scenariusze krok-po-kroku (np. budowa poduszki finansowej lub eliminacja zbędnych subskrypcji). Każdy wygenerowany plan z kwotą docelową posiada przycisk 'Utwórz cel w Skarbonkach', który automatycznie zakłada cel oszczędnościowy w module Cele. Najbliższy krok planu możesz odznaczać bezpośrednio z Pulpitu."
  },
  {
    question: "Jak działa samonaprawa (Self-Healing) w Doktorze Saldo?",
    answer: "Doktor Saldo analizuje bazę pod kątem 6 typów anomalii (np. przypadkowe duplikaty po imporcie CSV czy desynchronizacja kwot celów). Kliknięcie przycisku 'Napraw wszystko automatycznie' koryguje znalezione problemy w ułamku sekundy, a system automatycznie zapisuje kopię cofania (Undo), dzięki czemu możesz odwrócić operację w dowolnym momencie."
  },
  {
    question: "Czy mogę używać modeli AI z chmury jak Gemini lub Claude (BYOK)?",
    answer: "Tak. Aplikacja wspiera najnowsze modele Google Gemini (w tym Gemini 3.8 Flash, 3.7 Flash, 3.5 Flash, 3.1 Pro, a także powszechnie dostępne 2.0 Flash i 1.5 Pro) oraz Anthropic Claude (Claude 3.5 Sonnet, 3.5 Haiku) poprzez integrację własnego klucza API (Bring Your Own Key). Twój klucz jest bezpiecznie szyfrowany w magazynie kluczy (macOS Keychain lub WebCrypto) i nigdy nie opuszcza urządzenia. AI otrzymuje jedynie zagregowane podsumowania bez historii transakcji, gwarantując maksymalną prywatność."
  },
  {
    question: "Dlaczego mój profil ma status Kondycji 'Brak wystarczających danych'?",
    answer: "Dla nowych profilów bez historii transakcji wskaźnik Kondycji Finansowej (Financial Health) zwraca specjalny status, aby uniknąć sugerowania sztucznych wyników. Wystarczy dodać pierwsze transakcje, a aplikacja od razu zacznie wyliczać odpowiedni wskaźnik zdrowia finansowego."
  }
];

