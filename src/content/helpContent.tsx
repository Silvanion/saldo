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
  FileSpreadsheet
} from "lucide-react";

import { MockScreenShot, Terminal } from "../components/help/HelpVisuals";

export const helpCategories = [
  "Wszystko",
  "Szybki start",
  "Pulpit i Wskaźniki",
  "Transakcje i CSV",
  "Rachunki i Kalendarz",
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
    wrapperClass: "bg-slate-50/80 border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800/50 p-4 rounded-2xl flex items-start gap-3",
    iconClass: "p-2 bg-emerald-600 text-white rounded-xl shrink-0"
  },
  {
    title: "Wskaźnik Bezpieczeństwa",
    description: "Aplikacja sama przelicza rezerwy na rachunki i podpowiada ile możesz wydać.",
    icon: <Zap className="w-5 h-5" />,
    wrapperClass: "bg-slate-50/80 border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800/50 p-4 rounded-2xl flex items-start gap-3",
    iconClass: "p-2 bg-teal-600 text-white rounded-xl shrink-0"
  },
  {
    title: "Bezpieczny Import CSV",
    description: "Automatyczne unikanie duplikatów i usuwanie uszkodzonych kwot (NaN).",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    wrapperClass: "bg-slate-50/80 border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800/50 p-4 rounded-2xl flex items-start gap-3",
    iconClass: "p-2 bg-cyan-600 text-white rounded-xl shrink-0"
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
        <p className="mb-4 text-sm text-slate-700 leading-relaxed">
          Witamy w Saldo! Aplikacja została zaprojektowana z myślą o maksymalnej przejrzystości i ochronie Twoich środków. Poniżej znajduje się wizualna instrukcja wykonania najważniejszych pierwszych kroków.
        </p>

        <MockScreenShot
          title="Aplikacja Saldo — Wskazówki nawigacji"
          badge="Interfejs użytkownika"
          steps={[
            { step: 1, label: "Panel nawigacji", description: "Przełączaj się między Pulpitem, Transakcjami, Budżetami i Inwestycjami w lewym menu." },
            { step: 2, label: "Przycisk dodawania", description: "Użyj zielonego przycisku '+ Nowa transakcja', aby ręcznie zapisać wydatek lub przychód." },
            { step: 3, label: "Bezpieczny limit (Safe-to-Spend)", description: "Sprawdzaj górną kartę — pokazuje kwotę wolną od zobowiązań w tym miesiącu." },
            { step: 4, label: "Wybór Profilu", description: "W prawym górnym rogu przełączaj profil z Osobistego na Wspólny z partnerem." }
          ]}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-emerald-500/30 p-3 rounded-xl relative overflow-hidden">
              <div className="absolute top-2 right-2 bg-emerald-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center">1</div>
              <div className="text-xs text-slate-400">Nawigacja głównego menu</div>
              <div className="font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <LayoutDashboard className="w-4 h-4" /> Pulpit & Transakcje
              </div>
            </div>

            <div className="bg-slate-900 border border-amber-500/30 p-3 rounded-xl relative overflow-hidden">
              <div className="absolute top-2 right-2 bg-amber-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center">2</div>
              <div className="text-xs text-slate-400">Szybkie wprowadzanie</div>
              <div className="font-bold text-amber-300 mt-1 flex items-center gap-1">
                <History className="w-4 h-4" /> + Dodaj transakcję
              </div>
            </div>

            <div className="bg-slate-900 border border-cyan-500/30 p-3 rounded-xl relative overflow-hidden">
              <div className="absolute top-2 right-2 bg-cyan-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center">3</div>
              <div className="text-xs text-slate-400">Stan bezpieczny</div>
              <div className="font-bold text-cyan-300 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Limit: 2,450 (waluta domyślna)
              </div>
            </div>
          </div>
        </MockScreenShot>

        <div className="space-y-3 text-sm text-slate-700">
          <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Jak prawidłowo wdrożyć Saldo w 5 minut?
          </h4>
          <ol className="list-decimal pl-5 space-y-2">
            <li><strong>Wprowadź swoje stałe płatności:</strong> W zakładce <em>Płatności</em> dodaj czynsz, prąd, ubezpieczenia i subskrypcje. Dzięki temu wskaźnik <em>Safe-to-Spend</em> od razu rezerwuje na nie fundusze.</li>
            <li><strong>Zapisz oszczędności na czarną godzinę:</strong> W zakładce <em>Cele</em> stwórz poduszkę finansową. Zostanie ona wyłączona z kwoty do swobodnego wydania.</li>
            <li><strong>Importuj lub dodawaj transakcje:</strong> Zaciągnij historię z banku przez plik CSV lub rejestruj codzienne zakupy na bieżąco.</li>
          </ol>
        </div>
      </>
    )
  },
  {
    id: "dashboard",
    cat: "Pulpit i Wskaźniki",
    title: "Pulpit główny i wskaźniki finansowe (Safe-to-Spend, Prognoza)",
    icon: <LayoutDashboard className="w-5 h-5" />,
    content: (
      <div className="space-y-4 text-sm text-slate-700">
        <p className="leading-relaxed">
          Pulpit główny (Dashboard) to Twój kokpit finansowy. Łączy w sobie wszystkie dane z całego profilu i w czasie rzeczywistym przelicza kluczowe wskaźniki matematyczne.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <h4 className="font-bold text-[#137566] flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4" /> Safe-to-Spend (Bezpieczny limit)
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Formuła: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">Przychody – Zaksięgowane Wydatki – Nadchodzące Rachunki – Wpłaty na Cele</code>.
              Chroni Cię przed wydaniem pieniędzy, które za kilka dni będą potrzebne na opłacenie raty kredytu lub rachunku za prąd.
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <h4 className="font-bold text-teal-700 flex items-center gap-2 mb-1">
              <LineChart className="w-4 h-4" /> Prognoza na koniec miesiąca
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Analizuje średnie dzienne tempo wydatków w bieżącym miesiącu i prognozuje szacunkowe saldo na 30/31 dzień. Ostrzega, gdy przy obecnym tempie grozi Ci deficyt.
            </p>
          </div>
        </div>

        <h4 className="font-bold text-slate-900 mt-4">Zależności z innymi modułami:</h4>
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
          <li>Dodanie nowej płatności w zakładce <strong>Płatności</strong> natychmiast pomniejsza <em>Safe-to-Spend</em>.</li>
          <li>Oznaczenie płatności jako "Opłacono" zamienia ją w transakcję i aktualizuje bilans przychodów/wydatków.</li>
          <li>Wpłata na <strong>Cel oszczędnościowy</strong> blokuje środki i wyklucza je z bieżącego portfela.</li>
        </ul>
      </div>
    )
  },
  {
    id: "transactions",
    cat: "Transakcje i CSV",
    title: "Transakcje, bezpieczny import CSV i automatyczna deduplikacja",
    icon: <History className="w-5 h-5" />,
    badge: "Deduplikacja & NaN protection",
    content: (
      <div className="space-y-4 text-sm text-slate-700">
        <p className="leading-relaxed">
          Moduł Transakcji odpowiada za śledzenie każdego przepływu pieniężnego. Oferuje inteligentne dopasowywanie kategorii, obsługę tagów oraz wbudowany bezpłatny importer wyciągów z banku.
        </p>

        <MockScreenShot
          title="Procedura importu wyciągu CSV z banku"
          badge="Proces importu"
          steps={[
            { step: 1, label: "Przycisk Importu", description: "Kliknij 'Importuj CSV' na liście transakcji." },
            { step: 2, label: "Wybór/Wklejenie", description: "Upuść plik CSV lub wklej treść wyciągu." },
            { step: 3, label: "Automatyczny Dedupe", description: "System porównuje ID i pomija transakcje już wcześniej wczytane." },
            { step: 4, label: "Sanity Check (NaN)", description: "Niepoprawne kwoty numeryczne są automatycznie odrzucane." }
          ]}
        >
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold text-emerald-400">Wyciąg_Bankowy_2026.csv</span>
              <span className="text-slate-500">Wyryto 12 transakcji</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl font-mono text-[11px] text-slate-400 border border-slate-800 space-y-1">
              <div className="text-emerald-400">✓ [ID: tx-101] 2026-07-20 | Zakupy Spożywcze | 145.20 {WALUTA} (Zapisano)</div>
              <div className="text-amber-400">⚠ [ID: tx-101] 2026-07-20 | Zakupy Spożywcze | 145.20 {WALUTA} (Pominięto — Duplikat)</div>
              <div className="text-red-400">✕ [ID: tx-102] 2026-07-21 | Błędna Kwota | NaN (Odrzucono sanity-check)</div>
            </div>
          </div>
        </MockScreenShot>

        <h4 className="font-bold text-slate-900">Mechanizm ochrony danych w imporcie CSV:</h4>
        <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600">
          <li><strong>Ochrona przed podwójnym importem (Deduplikacja):</strong> Gdy importujesz ten sam plik CSV drugi raz, Saldo rozpoznaje istniejące Identyfikatory transakcji i nie dubluje wpisów.</li>
          <li><strong>Sprawdzanie poprawności numerycznej:</strong> Jeśli wyciąg zawiera uszkodzone lub nieczytelne kwoty (np. tekstowe znaki zapytania zamienione na NaN), transakcja zostaje bezpiecznie odrzucona.</li>
          <li><strong>Szybka automatyzacja:</strong> Zdefiniowane słowa kluczowe (np. "Orlen", "Biedronka") przypiszą transakcje do właściwych kategorii w tle, oszczędzając czas.</li>
        </ul>
      </div>
    )
  },
  {
    id: "payments",
    cat: "Rachunki i Kalendarz",
    title: "Płatności, Subskrypcje i integracja z Kalendarzem Google",
    icon: <Clock className="w-5 h-5" />,
    content: (
      <div className="space-y-4 text-sm text-slate-700">
        <p className="leading-relaxed">
          Nigdy więcej nie zapomnisz o terminie zapłaty za czynsz, internet czy ratę kredytu. Rachunki są prezentowane na osi czasu z wyraźnym oznaczeniem dni pozostałych do terminu wymagalności.
        </p>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 space-y-2">
          <div className="font-bold flex items-center gap-1.5 text-sm text-amber-900">
            <Calendar className="w-4 h-4 text-amber-700" /> Integracja z Kalendarzem Google
          </div>
          <p>
            Przy każdej płatności znajduje się przycisk <strong>Dodaj do Kalendarza</strong>. Kliknięcie otwiera formularz dodawania wydarzenia w Google Calendar z przygotowanym tytułem, kwotą i przypomnieniem w dniu płatności!
          </p>
        </div>

        <MockScreenShot
          title="Filtrowanie horyzontu czasowego i podsumowanie tygodnia"
          badge="Zarządzanie Osią Czasu"
          steps={[
            { step: 1, label: "Filtry czasu", description: "Użyj filtrów (np. 'Ten tydzień'), by skupić się na najpilniejszych zobowiązaniach." },
            { step: 2, label: "Podsumowanie 'Do zapłaty w tym tygodniu'", description: "Widżet automatycznie podlicza kwotę wymagalną w przeciągu najbliższych 7 dni." }
          ]}
        >
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
             <div className="flex gap-2 flex-wrap">
                <span className="bg-white text-slate-800 border border-slate-200 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm">Wszystkie</span>
                <span className="bg-slate-100 text-slate-500 border border-transparent px-3 py-1 rounded-full text-[10px] font-bold">Dzisiaj/Zaległe</span>
                <span className="bg-slate-100 text-slate-500 border border-transparent px-3 py-1 rounded-full text-[10px] font-bold">Ten tydzień</span>
                <span className="bg-slate-100 text-slate-500 border border-transparent px-3 py-1 rounded-full text-[10px] font-bold">Ten miesiąc</span>
             </div>
             <div className="bg-[#137566]/5 border border-[#137566]/20 p-3 rounded-xl flex justify-between items-center shadow-sm">
               <span className="text-[#137566] font-bold text-xs flex items-center gap-1.5"><Clock className="w-4 h-4 text-[#137566]" /> Do zapłaty w tym tygodniu</span>
               <span className="text-[#137566] font-black text-sm">450,00 {WALUTA}</span>
             </div>
          </div>
        </MockScreenShot>

        <h4 className="font-bold text-slate-900 mt-6">Cykl życia Płatności:</h4>
        <div className="flex flex-col sm:flex-row items-center gap-2 text-xs text-slate-700 font-medium">
          <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-center w-full">1. Utworzenie Rachunku (np. Czynsz 2000 {WALUTA})</div>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
          <div className="p-2.5 bg-amber-100 text-amber-900 rounded-xl border border-amber-200 text-center w-full">2. Rezerwacja w Safe-to-Spend</div>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
          <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-xl border border-emerald-200 text-center w-full">3. Przycisk "Opłacono" ➔ Wydatek zrobiony</div>
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
      <div className="space-y-4 text-sm text-slate-700">
        <p className="leading-relaxed">
          Budżety pozwalają nałożyć miesięczny limit na poszczególne kategorie wydatków (np. 1500 zł na Jedzenie, 500 zł na Rozrywkę).
        </p>

        <div className="space-y-2 my-2 bg-slate-50 border border-slate-200 p-4 rounded-xl">
          <div className="space-y-2">
            <div className="flex justify-between items-end text-xs font-bold text-slate-700 mb-1">
              <div className="flex items-center gap-2">
                 <span>Jedzenie i Spożywcze</span>
                 <span className="text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border-emerald-200">
                   W normie
                 </span>
              </div>
              <span className="text-emerald-700">975 z 1500 {WALUTA}</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-[65%]" />
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-end text-xs font-bold text-slate-700 mb-1">
              <div className="flex items-center gap-2">
                 <span>Transport i Paliwo</span>
                 <span className="text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border-amber-200">
                   Uwaga
                 </span>
              </div>
              <span className="text-amber-700">420 z 500 {WALUTA}</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full w-[84%]" />
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-end text-xs font-bold text-slate-700 mb-1">
              <div className="flex items-center gap-2">
                 <span>Rozrywka i Wyjścia</span>
                 <span className="text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border-rose-200">
                   Przekroczony
                 </span>
              </div>
              <span className="text-rose-600 font-bold">575 z 500 {WALUTA}</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full w-[100%]" />
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600">
          Gdy wydatek w danej kategorii przekroczy 80% lub 100% ustalonego limitu, na Pulpicie pojawia się specjalny widget <strong>Ostrzeżenia Budżetowe</strong> z propozycją korekty.
        </p>
      </div>
    )
  },
  {
    id: "goals",
    cat: "Kapitał i Rezerwy",
    title: "Moduł informacyjny: rezerwy i inwestycje długoterminowe",
    icon: <Target className="w-5 h-5" />,
    badge: "Poza budżetem",
    content: (
      <div className="space-y-4 text-sm text-slate-700">
        <p className="leading-relaxed">
          Osobny moduł informacyjny służący do monitorowania majątku długoterminowego. Zgromadzone tu środki nie powiększają wyniku bieżącego miesiąca ani budżetu operacyjnego. Moduł dzieli odkładany kapitał na trzy filary:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <h5 className="font-bold text-emerald-900 mb-1">1. Cele terminowe</h5>
            <p className="text-emerald-800">Odizolowane pule środków (np. na remont, sprzęt) z konkretną kwotą docelową i horyzontem czasowym.</p>
          </div>

          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
            <h5 className="font-bold text-teal-900 mb-1">2. Rezerwa Bezpieczeństwa</h5>
            <p className="text-teal-800">Fundusz na nieprzewidziane zdarzenia. Fundament stabilności chroniony przed bieżącą konsumpcją.</p>
          </div>

          <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl">
            <h5 className="font-bold text-cyan-900 mb-1">3. Kapitał Inwestycyjny</h5>
            <p className="text-cyan-800">IKE/IKZE, akcje, fundusze. Środki pracujące długoterminowo, całkowicie odłączone od portfela.</p>
          </div>
        </div>

        <MockScreenShot
          title="Odznaki postępu i statusy celów"
          badge="Śledzenie Postępów"
          steps={[
            { step: 1, label: "Status i odznaka", description: "Otrzymujesz czytelną odznakę (np. 'W trakcie', 'Prawie u celu!', 'Osiągnięty 🎉')." },
            { step: 2, label: "Wizualizacja paska", description: "Pasek postępu wypełnia się kolorem, a obok wyświetla się procent realizacji." }
          ]}
        >
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
             <div className="flex justify-between items-center">
               <span className="font-bold text-slate-800">Nowy Mac</span>
               <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border bg-blue-50 text-blue-700 border-blue-200">
                 W trakcie
               </span>
             </div>
             <div className="flex justify-between text-xs text-slate-500 mb-1">
               <span>Zgromadzono: 2 400 z 8 000 {WALUTA}</span>
               <span className="font-bold text-blue-600">30%</span>
             </div>
             <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
               <div className="bg-blue-500 h-full rounded-full w-[30%]" />
             </div>
          </div>
        </MockScreenShot>

        <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-xs text-red-900 flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-sm text-red-950 font-bold mb-0.5">Zasada ochrony zgromadzonych rezerw (saved &gt; 0)</strong>
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
      <div className="space-y-4 text-sm text-slate-700">
        <p className="leading-relaxed">
          Saldo umożliwia posiadanie wielu odizolowanych profili finansowych w ramach jednej aplikacji (np. "Mój budżet prywatny" oraz "Wspólny budżet z partnerem").
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <h5 className="font-bold text-slate-900 mb-1">Profil Wspólny i Podział Wydatków</h5>
            <p className="text-slate-600">
              W profilu typu Shared każda transakcja ma oznaczenie kto płacił (Ja / Partner) oraz tryb podziału (Równo 50/50 lub Tylko ja). Widget Rozliczeń automatycznie podlicza balans kto komu ile jest winien!
            </p>
          </div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <h5 className="font-bold text-slate-900 mb-1">Blokada PIN dla prywatności</h5>
            <p className="text-slate-600">
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
      <div className="space-y-4 text-sm text-slate-700">
        <p className="leading-relaxed">
          Twoje dane finansowe należą wyłącznie do Ciebie. Saldo nie korzysta z własnych serwerów bazy danych — zamiast tego zapisuje stan w przeglądarce (IndexedDB) oraz na Twoim prywatnym koncie Google Drive.
        </p>

        <div className="space-y-2 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <strong className="text-slate-900 block mb-1 font-bold">1. Synchronizacja z Google Drive:</strong>
            W Ustawieniach połącz się ze swoim kontem Google. Aplikacja utworzy ukryty plik kopii zapasowej w dedykowanym folderze aplikacji na Twoim własnym Dysku.
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <strong className="text-slate-900 block mb-1 font-bold">2. Rozwiązywanie Konfliktów Synchronizacji:</strong>
            Jeśli edytujesz dane na dwóch urządzeniach (np. na telefonie i komputerze), system wykryje różnicę wersji i wyświetli interaktywne okno <strong>Konflikt kopii zapasowej</strong>, pozwalając Ci wybrać najnowszą wersję.
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <strong className="text-slate-900 block mb-1 font-bold">3. Eksport/Import pliku JSON (Offline):</strong>
            Możesz w dowolnej chwili pobrać surowy plik danych <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">.json</code> i przenieść go na dowolne urządzenie pendrive'em lub mailem.
          </div>
        </div>
      </div>
    )
  },
  {
    id: "ai",
    cat: "Lokalne AI",
    title: "Tryby pracy AI (None, Lokalne Ollama, Gemini) oraz Przyszłość",
    icon: <Sparkles className="w-5 h-5" />,
    content: (
      <div className="space-y-4 text-sm text-slate-700">
        <p className="leading-relaxed">
          Saldo wspiera 3 elastyczne tryby sztucznej inteligencji dopasowane do Twoich wymagań odnośnie prywatności:
        </p>

        <ul className="list-disc pl-5 space-y-3 text-xs">
          <li>
            <strong>Tryb podstawowy (None) – 100% Darmowy &amp; Domyślny:</strong><br />
            Pełna funkcjonalność aplikacji bez użycia modeli AI. Wykorzystuje ultra-szybkie algorytmy deterministyczne do parsowania tekstów, automatyzacji kategorii i importu CSV. Brak połączeń sieciowych.
          </li>
          <li>
            <strong>Lokalne AI (local / Ollama) – Pełna prywatność Power-Usera:</strong><br />
            Łączy się z lokalnym modelem uruchomionym na Twoim komputerze za pomocą aplikacji Ollama (<code className="bg-slate-100 px-1 py-0.5 rounded">http://localhost:11434</code>).
          </li>
        </ul>

        {/* Step-by-step setup guide for Ollama */}
        <div className="bg-slate-900 text-slate-100 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4 text-xs font-sans">
          <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
            <Terminal className="w-4 h-4" /> Instrukcja konfiguracji Lokalnego AI (Ollama) krok po kroku
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-white block text-xs">🍎 macOS (Apple Silicon & Intel)</span>
              <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                <li>Pobierz Ollama z <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">ollama.com</a>.</li>
                <li>Otwórz Terminal (<code className="text-emerald-300">Cmd + Spacja</code> ➔ Terminal).</li>
                <li>Uruchom z obsługą CORS:<br />
                  <code className="bg-slate-800 text-emerald-300 px-2 py-0.5 rounded font-mono text-[11px] inline-block mt-1">OLLAMA_ORIGINS="*" ollama serve</code>
                </li>
                <li>W nowym oknie wpisz: <code className="bg-slate-800 text-emerald-300 px-2 py-0.5 rounded font-mono text-[11px]">ollama run llama3</code>.</li>
              </ol>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-white block text-xs">🪟 Windows (PowerShell / CMD)</span>
              <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                <li>Zainstaluj Ollama dla Windows.</li>
                <li>Otwórz PowerShell i ustaw zmienną CORS:<br />
                  <code className="bg-slate-800 text-emerald-300 px-2 py-0.5 rounded font-mono text-[11px] inline-block mt-1">$env:OLLAMA_ORIGINS="*"</code>
                </li>
                <li>Uruchom model:<br />
                  <code className="bg-slate-800 text-emerald-300 px-2 py-0.5 rounded font-mono text-[11px] inline-block mt-1">ollama run llama3</code>
                </li>
              </ol>
            </div>
          </div>
        </div>

        <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs text-slate-700">
          <strong className="text-[#137566] block font-bold mb-1">Planowane funkcje w przyszłych wersjach:</strong>
          Chmurowe AI (Gemini OCR dla skanowania paragonów), automatyczna synchronizacja z bankami przez bezpieczny Open Banking (PSD2), obsługa wielu walut z przeliczaniem kursów NBP w czasie rzeczywistym oraz wieloosobowe budżetowanie live!
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
    question: "Czy moje dane trafiają na Wasze serwery?",
    answer: "Nie. Saldo działa w architekturze Local-First. Twoje finanse są zapisywane wyłącznie na Twoim urządzeniu w bezpiecznej pamięci przeglądarki lub na Twoim osobistym koncie Google Drive."
  },
  {
    question: "Co się stanie, gdy zgubię kod PIN?",
    answer: "Kod PIN zabezpiecza dostęp do wybranego profilu. Możesz zresetować zapomniany PIN w Ustawieniach lub przywrócić niezabezpieczoną kopię zapasową z pliku JSON lub Google Drive."
  },
  {
    question: "Dlaczego import CSV odrzucił niektóre wiersze?",
    answer: "System posiada wbudowaną walidację unikania duplikatów oraz filtr usuwający błędne wartości (np. puste kwoty lub zakodowany tekst NaN), chroniąc spójność wyliczeń."
  },
  {
    question: "Jak powiązać rachunek z Kalendarzem Google?",
    answer: "Przejdź do zakładki Płatności i kliknij ikonę kalendarza obok wybranej płatności. Zostanie przygotowane wydarzenie ze szczegółami kwoty i terminu."
  }
];
