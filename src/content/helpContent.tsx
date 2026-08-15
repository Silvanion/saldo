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
  Scale
} from "lucide-react";

import { MockScreenShot, Terminal } from "../components/help/HelpVisuals";

export const helpCategories = [
  "Wszystko",
  "Szybki start",
  "Paleta komend (⌘K)",
  "Pulpit i Wskaźniki",
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
    title: "Wskaźnik Bezpieczeństwa & Runway",
    description: "Aplikacja sama przelicza rezerwy na rachunki i podpowiada na ile miesięcy wystarczy środków.",
    icon: <Zap className="w-5 h-5" />,
    wrapperClass: "bg-surface border border-border p-4 rounded-2xl flex items-start gap-3",
    iconClass: "p-2 bg-surface-2 text-text-muted border border-border/50 rounded-xl shrink-0"
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
            { step: 1, label: "Panel nawigacji", description: "Przełączaj się między Pulpitem, Transakcjami, Budżetami i Inwestycjami w lewym menu." },
            { step: 2, label: "Paleta komend (⌘K)", description: "Naciśnij Cmd+K / Ctrl+K lub '/', aby błyskawicznie przeszukać transakcje lub wykonać akcję." },
            { step: 3, label: "Wskaźnik Runway & Safe-to-Spend", description: "Sprawdzaj górne karty — pokazują poduszkę finansową w miesiącach i wolne środki." },
            { step: 4, label: "Wybór Profilu", description: "W prawym górnym rogu przełączaj profil z Osobistego na Wspólny z partnerem." }
          ]}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-surface border border-border/50 p-3 rounded-xl relative overflow-hidden">
              <div className="absolute top-2 right-2 bg-surface-2 text-text-muted font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center border border-border/50">1</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">Nawigacja</div>
              <div className="font-semibold text-text-main flex items-center gap-1.5 text-sm">
                <LayoutDashboard className="w-4 h-4 text-text-muted" /> Pulpit & Transakcje
              </div>
            </div>

            <div className="bg-surface border border-border/50 p-3 rounded-xl relative overflow-hidden">
              <div className="absolute top-2 right-2 bg-surface-2 text-text-muted font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center border border-border/50">2</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">Szybkie szukanie</div>
              <div className="font-semibold text-text-main flex items-center gap-1.5 text-sm">
                <Command className="w-4 h-4 text-text-muted" /> Paleta Cmd+K
              </div>
            </div>

            <div className="bg-surface border border-border/50 p-3 rounded-xl relative overflow-hidden">
              <div className="absolute top-2 right-2 bg-surface-2 text-text-muted font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center border border-border/50">3</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">Poduszka finansowa</div>
              <div className="font-semibold text-text-main flex items-center gap-1.5 text-sm">
                <ShieldCheck className="w-4 h-4 text-text-muted" /> Runway: 8.5 mies.
              </div>
            </div>
          </div>
        </MockScreenShot>

        <div className="space-y-3 text-sm text-text-muted">
          <h4 className="font-bold text-text-main text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand" /> Jak prawidłowo wdrożyć Saldo w 5 minut?
          </h4>
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Wprowadź swoje stałe płatności:</strong> W zakładce <em>Płatności</em> dodaj czynsz, prąd, ubezpieczenia i subskrypcje. Dzięki temu wskaźnik <em>Safe-to-Spend</em> i 4 filary horyzontów od razu rezerwują na nie fundusze.</li>
            <li><strong>Zapisz oszczędności na czarną godzinę:</strong> W zakładce <em>Cele</em> stwórz poduszkę finansową. Zostanie ona uwzględniona w kalkulacji wskaźnika <em>Runway</em>.</li>
            <li><strong>Importuj wyciągi z banku:</strong> Użyj importera CSV — wspiera 10 największych banków w Polsce i automatycznie przelicza waluty obce według tabel NBP.</li>
          </ol>
        </div>
      </>
    )
  },
  {
    id: "command-palette",
    cat: "Paleta komend (⌘K)",
    title: "Globalna Paleta Komend (⌘K / Ctrl+K) i szybka nawigacja",
    icon: <Command className="w-5 h-5" />,
    badge: "Power UX",
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          W dowolnym miejscu aplikacji możesz nacisnąć <code className="bg-surface-2 border border-border px-1.5 py-0.5 rounded text-text-main font-bold">⌘K</code> (macOS), <code className="bg-surface-2 border border-border px-1.5 py-0.5 rounded text-text-main font-bold">Ctrl+K</code> (Windows/Linux) lub klawisz <code className="bg-surface-2 border border-border px-1.5 py-0.5 rounded text-text-main font-bold">/</code>, aby otworzyć globalną paletę komend.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 bg-surface border border-border/50 rounded-xl space-y-1">
            <h5 className="font-semibold text-text-main flex items-center gap-1.5">
              <span>🔍</span> Wyszukiwanie transakcji
            </h5>
            <p className="text-xs text-text-muted">Wpisz nazwę odbiorcy, kategorię lub kwotę, by błyskawicznie odnaleźć transakcję w historii.</p>
          </div>

          <div className="p-4 bg-surface border border-border/50 rounded-xl space-y-1">
            <h5 className="font-semibold text-text-main flex items-center gap-1.5">
              <span>⚡</span> Szybkie akcje
            </h5>
            <p className="text-xs text-text-muted">Dodawaj transakcje, twórz rachunki, uruchamiaj import CSV i generuj raporty PDF jednym klawiszem.</p>
          </div>

          <div className="p-4 bg-surface border border-border/50 rounded-xl space-y-1">
            <h5 className="font-semibold text-text-main flex items-center gap-1.5">
              <span>🔄</span> Przełączanie profili
            </h5>
            <p className="text-xs text-text-muted">Błyskawicznie przełączaj się między profilem osobistym a wspólnym bez sięgania po myszkę.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "dashboard",
    cat: "Pulpit i Wskaźniki",
    title: "Pulpit główny, wskaźnik Runway i Reguła 50/30/20",
    icon: <LayoutDashboard className="w-5 h-5" />,
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Pulpit główny to kokpit finansowy, który łączy dane z całego profilu i w czasie rzeczywistym przelicza wskaźniki płynności i bezpieczeństwa.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-2">
          <div className="p-4 bg-surface border border-border/50 rounded-xl">
            <h4 className="font-semibold text-text-main flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-brand" /> Runway (Poduszka Płynności)
            </h4>
            <p className="text-xs text-text-muted leading-relaxed">
              Szacuje na ile miesięcy wystarczy zgromadzonych płynnych aktywów przy średnim miesięcznym tempie wydatków. Wskazuje status: Bezpieczny (≥6 mies.), Umiarkowany (3-6 mies.) lub Krytyczny (&lt;3 mies.).
            </p>
          </div>

          <div className="p-4 bg-surface border border-border/50 rounded-xl">
            <h4 className="font-semibold text-text-main flex items-center gap-2 mb-2">
              <LineChart className="w-4 h-4 text-brand" /> Dynamika MoM (Miesiąc do Miesiąca)
            </h4>
            <p className="text-xs text-text-muted leading-relaxed">
              Karty przychodów i wydatków pokazują procentową zmianę w stosunku do poprzedniego miesiąca, pozwalając na szybką ocenę trendów finansowych.
            </p>
          </div>

          <div className="p-4 bg-surface border border-border/50 rounded-xl">
            <h4 className="font-semibold text-text-main flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4 text-brand" /> Reguła 50 / 30 / 20
            </h4>
            <p className="text-xs text-text-muted leading-relaxed">
              W module Analiz znajdziesz klasyfikację wydatków na Potrzeby (50%), Zachcianki (30%) i Oszczędności (20%) według uznanego standardu budżetowego.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "multicurrency",
    cat: "Wielowalutowość & NBP",
    title: "Wielowalutowość i automatyczne kursy walut NBP",
    icon: <Globe className="w-5 h-5" />,
    badge: "Oficjalne tabele A NBP",
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Saldo wspiera konta, transakcje, płatności i cele w walutach obcych (np. EUR, USD, GBP, CHF, NOK, SEK).
        </p>

        <div className="bg-surface border border-border/50 p-4 rounded-xl space-y-2">
          <h4 className="font-semibold text-text-main flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand" /> Jak działa serwis walutowy NBP?
          </h4>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-text-muted">
            <li>Aplikacja automatycznie pobiera oficjalną tabelę A kursów średnich Narodowego Banku Polskiego.</li>
            <li>Pobrane kursy są bezpiecznie cachowane lokalnie, dzięki czemu aplikacja działa w 100% offline bez opóźnień.</li>
            <li>W przypadku braku sieci lub awarii stosowane są bezpieczne wartości fallback z gwarancją braku błędów NaN.</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: "transactions",
    cat: "Transakcje i Banki CSV",
    title: "Transakcje, obsługa 10 banków w Polsce i deduplikacja",
    icon: <History className="w-5 h-5" />,
    badge: "10 Banków & Deduplikacja",
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Moduł Transakcji oferuje inteligentne dopasowywanie kategorii, obsługę tagów oraz wbudowany bezpłatny importer wyciągów z 10 banków w Polsce.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 my-2 text-center text-xs font-bold text-text-main">
          <div className="p-2.5 bg-surface border border-border/50 rounded-xl">mBank</div>
          <div className="p-2.5 bg-surface border border-border/50 rounded-xl">PKO BP</div>
          <div className="p-2.5 bg-surface border border-border/50 rounded-xl">ING Śląski</div>
          <div className="p-2.5 bg-surface border border-border/50 rounded-xl">Santander</div>
          <div className="p-2.5 bg-surface border border-border/50 rounded-xl">Millennium</div>
          <div className="p-2.5 bg-surface border border-border/50 rounded-xl">Bank Pekao</div>
          <div className="p-2.5 bg-surface border border-border/50 rounded-xl">Alior Bank</div>
          <div className="p-2.5 bg-surface border border-border/50 rounded-xl">BNP Paribas</div>
          <div className="p-2.5 bg-surface border border-border/50 rounded-xl">Revolut</div>
          <div className="p-2.5 bg-surface border border-border/50 rounded-xl">Format ogólny</div>
        </div>

        <h4 className="font-bold text-text-main">Mechanizm ochrony danych w imporcie CSV:</h4>
        <ul className="list-disc pl-5 space-y-2 text-xs text-text-faint">
          <li><strong>Automatyczna detekcja kolumn i separatorów:</strong> Parser rozpoznaje przecinki, średniki oraz formaty kwot z kropką lub przecinkiem dziesiętnym.</li>
          <li><strong>Ochrona przed duplikatami:</strong> System porównuje ID i kwoty, uniemożliwiając powtórne zaksięgowanie tej samej operacji.</li>
          <li><strong>Wielowalutowy import:</strong> Wyciągi w walutach obcych są automatycznie oznaczane właściwym kodem walutowym.</li>
        </ul>
      </div>
    )
  },
  {
    id: "payments",
    cat: "Rachunki i Timeline",
    title: "4 Filary Horyzontów Zobowiązań i Harmonogram Cashflow",
    icon: <Clock className="w-5 h-5" />,
    badge: "Cashflow Horizon",
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Nigdy więcej nie zapomnisz o terminie zapłaty za czynsz, internet czy ratę kredytu. Rachunki są prezentowane w podziale na 4 horyzonty czasowe:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-medium">
          <div className="p-3 bg-danger-subtle text-danger border border-danger/20 rounded-xl">
            <span className="font-bold block mb-1">🔴 Zaległe</span>
            Opłaty po terminie wymagające natychmiastowej spłaty.
          </div>
          <div className="p-3 bg-warning-subtle text-warning border border-warning/20 rounded-xl">
            <span className="font-bold block mb-1">🟡 Na dzisiaj</span>
            Płatności przypadające dokładnie na dzień dzisiejszy.
          </div>
          <div className="p-3 bg-brand-subtle text-brand border border-brand/20 rounded-xl">
            <span className="font-bold block mb-1">🟢 Najbliższe 7 dni</span>
            Łączne zobowiązania bieżącego tygodnia.
          </div>
          <div className="p-3 bg-surface-2 text-text-main border border-border rounded-xl">
            <span className="font-bold block mb-1">🔵 Najbliższe 30 dni</span>
            Miesięczna perspektywa obciążeń budżetowych.
          </div>
        </div>

        <div className="bg-surface border border-border/50 p-4 rounded-xl text-xs space-y-1.5">
          <strong className="text-text-main block text-sm font-semibold">Harmonogram kumulatywny cashflow:</strong>
          <p className="leading-relaxed">
            W widoku osi czasu możesz podejrzeć narastającą sumę płatności dzień po dniu, co pozwala dokładnie zaplanować stan konta i uniknąć chwilowego braku płynności.
          </p>
        </div>
      </div>
    )
  },
  {
    id: "budgets",
    cat: "Budżety i Limity",
    title: "Budżety kategorii, paski postępu i alerty ostrzegawcze",
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
    title: "Moduł informacyjny: rezerwy i inwestycje długoterminowe",
    icon: <Target className="w-5 h-5" />,
    badge: "Poza budżetem",
    content: (
      <div className="space-y-4 text-sm text-text-muted">
        <p className="leading-relaxed">
          Osobny moduł informacyjny służący do monitorowania majątku długoterminowego. Zgromadzone tu środki nie powiększają wyniku bieżącego miesiąca ani budżetu operacyjnego.
        </p>

        <div className="bg-brand-subtle border border-brand/20 p-4 rounded-xl text-xs sm:text-sm text-brand flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-sm font-bold mb-1">Zasada ochrony zgromadzonych rezerw</strong>
            Aplikacja posiada blokadę chroniącą przed przypadkowym usunięciem celu, na który wpłacono już realne pieniądze. Aby usunąć taki cel, należy najpierw wycofać środki (zmniejszyć zgromadzoną kwotę do 0).
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
          <div className="p-4 bg-surface border border-border/50 rounded-xl">
            <h5 className="font-semibold text-text-main mb-1.5">Profil Wspólny i Podział Wydatków</h5>
            <p className="text-text-muted text-xs sm:text-sm leading-relaxed">
              W profilu typu Shared każda transakcja ma oznaczenie kto płacił (Ja / Partner) oraz tryb podziału (Równo 50/50 lub Tylko ja). Widget Rozliczeń automatycznie podlicza balans kto komu ile jest winien!
            </p>
          </div>

          <div className="p-4 bg-surface border border-border/50 rounded-xl">
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
    title: "Kopie zapasowe na Google Drive, eksport JSON i obsługa konfliktów",
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
    answer: "Runway to szacunkowa liczba miesięcy, przez które utrzymasz obecny standard życia wyłącznie z płynnych oszczędności (konto, cele, obligacje/poduszka), jeśli utracisz bieżące dochody. Wartość ≥ 6 miesięcy oznacza zdrowy, bezpieczny bufor."
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
