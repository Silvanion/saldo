import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  LayoutDashboard,
  History,
  Clock,
  Wallet,
  Target,
  LineChart,
  Settings,
  ShieldCheck,
  Sparkles,
  MousePointer,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Download,
  Upload,
  Lock,
  Database,
  RefreshCw,
  FileSpreadsheet,
  HelpCircle,
  Zap,
  PieChart,
  Info,
  ShieldAlert,
  Calendar,
  Layers,
  BarChart3
} from "lucide-react";

interface StepHighlightProps {
  key?: React.Key;
  step: number;
  label: string;
  description: string;
}

function StepHighlight({ step, label, description }: StepHighlightProps) {
  return (
    <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#137566] text-white font-bold text-xs shrink-0 shadow-sm">
        {step}
      </div>
      <div>
        <h5 className="font-semibold text-gray-800 text-sm">{label}</h5>
        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

interface MockScreenShotProps {
  title: string;
  badge: string;
  children: React.ReactNode;
  steps: StepHighlightProps[];
}

function MockScreenShot({ title, badge, children, steps }: MockScreenShotProps) {
  return (
    <div className="my-5 border border-gray-200 rounded-2xl overflow-hidden bg-slate-900 shadow-lg text-white">
      {/* Mock Window Header */}
      <div className="bg-slate-800/90 px-4 py-2.5 border-b border-slate-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="text-xs font-mono text-slate-400 ml-2">{title}</span>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#137566]/30 text-emerald-300 border border-emerald-500/30 rounded-full">
          {badge}
        </span>
      </div>

      {/* Mock Visual Interface Body */}
      <div className="p-4 sm:p-5 bg-slate-950/60 font-sans">
        {children}
      </div>

      {/* Step by Step Action Markers */}
      {steps.length > 0 && (
        <div className="bg-slate-800/50 p-4 border-t border-slate-700/60 grid gap-2 sm:grid-cols-2">
          {steps.map((s) => (
            <StepHighlight key={s.step} step={s.step} label={s.label} description={s.description} />
          ))}
        </div>
      )}
    </div>
  );
}

interface HelpSectionProps {
  id: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function HelpSection({ title, category, icon, badge, defaultOpen = false, children }: HelpSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200/80 rounded-2xl overflow-hidden mb-4 bg-white shadow-sm hover:shadow-md transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left focus:outline-none hover:bg-slate-50/80 transition-colors"
      >
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-[#f0f9f6] text-[#137566] rounded-xl shadow-xs shrink-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800 text-base sm:text-lg">{title}</span>
              {badge && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-[#137566] px-2 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 font-medium">{category}</span>
          </div>
        </div>
        <div className="text-gray-400 p-1 rounded-lg hover:bg-gray-100 transition-colors">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>
      {isOpen && (
        <div className="p-5 pt-2 text-gray-600 border-t border-gray-100 leading-relaxed bg-[#fcfdfd]">
          {children}
        </div>
      )}
    </div>
  );
}

export function HelpView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Wszystko");

  const categories = [
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

  const filteredSections = useMemo(() => {
    return [
      { id: "quickstart", cat: "Szybki start", title: "Szybki start — Pierwsze kroki w aplikacji" },
      { id: "dashboard", cat: "Pulpit i Wskaźniki", title: "Pulpit główny i wskaźniki (Safe-to-Spend, Prognoza)" },
      { id: "transactions", cat: "Transakcje i CSV", title: "Transakcje, Import CSV z banku i deduplikacja" },
      { id: "payments", cat: "Rachunki i Kalendarz", title: "Płatności, Subskrypcje i Kalendarz Google" },
      { id: "budgets", cat: "Budżety i Limity", title: "Budżety kategorii i ostrzeżenia o przekroczeniu" },
      { id: "goals", cat: "Cele i Inwestycje", title: "Cele oszczędnościowe, Poduszka i IKE/IKZE" },
      { id: "profiles", cat: "Profile i PIN", title: "Profile (Osobisty / Wspólny), Szyfrowanie PIN-em" },
      { id: "backup", cat: "Kopia i Chmura", title: "Google Drive, Kopie zapasowe i Rozwiązywanie konfliktów" },
      { id: "ai", cat: "Lokalne AI", title: "Tryby pracy (None, Lokalne AI / Ollama) oraz Przyszłość" }
    ].filter((item) => {
      const matchCat = selectedCategory === "Wszystko" || item.cat === selectedCategory;
      const matchSearch =
        searchQuery.trim() === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.cat.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#137566] via-[#0f5c50] to-[#0a4239] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-emerald-200 border border-white/10">
            <Sparkles className="w-3.5 h-3.5" /> Complete User Guide & Knowledge Base
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-300" />
            Centrum Pomocy i Przewodnik Po Saldo
          </h2>
          <p className="text-[#c3ebe2] text-sm sm:text-base max-w-3xl leading-relaxed">
            Kompleksowy poradnik opisujący działanie każdej funkcji, zależności finansowe, ochronę kapitału oraz instrukcje krok po kroku ze wskaźnikami kliknięć.
          </p>

          {/* Interactive Search Bar */}
          <div className="pt-2 max-w-xl">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj funkcji (np. 'import CSV', 'Safe to spend', 'IKE', 'PIN')..."
                className="w-full pl-11 pr-4 py-3 bg-white text-gray-900 placeholder-gray-400 rounded-xl shadow-inner text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-64 h-64 bg-black/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-[#137566] text-white shadow-sm scale-105"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm">Prywatność i Szyfrowanie</h4>
            <p className="text-xs text-gray-600 mt-1">Swoje dane przechowujesz lokalnie lub na własnym koncie Google Drive z kodem PIN.</p>
          </div>
        </div>

        <div className="bg-teal-50/60 border border-teal-100 p-4 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-teal-600 text-white rounded-xl shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm">Wskaźnik Bezpieczeństwa</h4>
            <p className="text-xs text-gray-600 mt-1">Aplikacja sama przelicza rezerwy na rachunki i podpowiada ile możesz wydać.</p>
          </div>
        </div>

        <div className="bg-cyan-50/60 border border-cyan-100 p-4 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-cyan-600 text-white rounded-xl shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm">Bezpieczny Import CSV</h4>
            <p className="text-xs text-gray-600 mt-1">Automatyczne unikanie duplikatów i usuwanie uszkodzonych kwot (NaN).</p>
          </div>
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="space-y-4">
        {/* SECTION 1: QUICKSTART */}
        {filteredSections.some((s) => s.id === "quickstart") && (
          <HelpSection
            id="quickstart"
            category="Szybki start"
            title="Szybki start — Pierwsze 3 kroki do opanowania budżetu"
            icon={<Zap className="w-5 h-5" />}
            badge="Instrukcja wizualna"
            defaultOpen={true}
          >
            <p className="mb-4 text-sm text-gray-700 leading-relaxed">
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
                    <ShieldCheck className="w-4 h-4" /> Limit: 2,450 PLN
                  </div>
                </div>
              </div>
            </MockScreenShot>

            <div className="space-y-3 text-sm text-gray-700">
              <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Jak prawidłowo wdrożyć Saldo w 5 minut?
              </h4>
              <ol className="list-decimal pl-5 space-y-2">
                <li><strong>Wprowadź swoje stałe płatności:</strong> W zakładce <em>Płatności</em> dodaj czynsz, prąd, ubezpieczenia i subskrypcje. Dzięki temu wskaźnik <em>Safe-to-Spend</em> od razu rezerwuje na nie fundusze.</li>
                <li><strong>Zapisz oszczędności na czarną godzinę:</strong> W zakładce <em>Cele</em> stwórz poduszkę finansową. Zostanie ona wyłączona z kwoty do swobodnego wydania.</li>
                <li><strong>Importuj lub dodawaj transakcje:</strong> Zaciągnij historię z banku przez plik CSV lub rejestruj codzienne zakupy na bieżąco.</li>
              </ol>
            </div>
          </HelpSection>
        )}

        {/* SECTION 2: DASHBOARD */}
        {filteredSections.some((s) => s.id === "dashboard") && (
          <HelpSection
            id="dashboard"
            category="Pulpit i Wskaźniki"
            title="Pulpit główny i wskaźniki finansowe (Safe-to-Spend, Prognoza)"
            icon={<LayoutDashboard className="w-5 h-5" />}
          >
            <div className="space-y-4 text-sm text-gray-700">
              <p className="leading-relaxed">
                Pulpit główny (Dashboard) to Twój kokpit finansowy. Łączy w sobie wszystkie dane z całego profilu i w czasie rzeczywistym przelicza kluczowe wskaźniki matematyczne.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
                <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-2xs">
                  <h4 className="font-bold text-[#137566] flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4" /> Safe-to-Spend (Bezpieczny limit)
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Formuła: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">Przychody – Zaksięgowane Wydatki – Nadchodzące Rachunki – Wpłaty na Cele</code>.
                    Chroni Cię przed wydaniem pieniędzy, które za kilka dni będą potrzebne na opłacenie raty kredytu lub rachunku za prąd.
                  </p>
                </div>

                <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-2xs">
                  <h4 className="font-bold text-teal-700 flex items-center gap-2 mb-1">
                    <LineChart className="w-4 h-4" /> Prognoza na koniec miesiąca
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Analizuje średnie dzienne tempo wydatków w bieżącym miesiącu i prognozuje szacunkowe saldo na 30/31 dzień. Ostrzega, gdy przy obecnym tempie grozi Ci deficyt.
                  </p>
                </div>
              </div>

              <h4 className="font-bold text-gray-900 mt-4">Zależności z innymi modułami:</h4>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-600">
                <li>Dodanie nowej płatności w zakładce <strong>Płatności</strong> natychmiast pomniejsza <em>Safe-to-Spend</em>.</li>
                <li>Oznaczenie płatności jako "Opłacono" zamienia ją w transakcję i aktualizuje bilans przychodów/wydatków.</li>
                <li>Wpłata na <strong>Cel oszczędnościowy</strong> blokuje środki i wyklucza je z bieżącego portfela.</li>
              </ul>
            </div>
          </HelpSection>
        )}

        {/* SECTION 3: TRANSACTIONS & CSV */}
        {filteredSections.some((s) => s.id === "transactions") && (
          <HelpSection
            id="transactions"
            category="Transakcje i CSV"
            title="Transakcje, bezpieczny import CSV i automatyczna deduplikacja"
            icon={<History className="w-5 h-5" />}
            badge="Deduplikacja & NaN protection"
          >
            <div className="space-y-4 text-sm text-gray-700">
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
                  <div className="bg-slate-950 p-3 rounded-lg font-mono text-[11px] text-slate-400 border border-slate-800 space-y-1">
                    <div className="text-emerald-400">✓ [ID: tx-101] 2026-07-20 | Zakupy Spożywcze | 145.20 PLN (Zapisano)</div>
                    <div className="text-amber-400">⚠ [ID: tx-101] 2026-07-20 | Zakupy Spożywcze | 145.20 PLN (Pominięto — Duplikat)</div>
                    <div className="text-red-400">✕ [ID: tx-102] 2026-07-21 | Błędna Kwota | NaN (Odrzucono sanity-check)</div>
                  </div>
                </div>
              </MockScreenShot>

              <h4 className="font-bold text-gray-900">Mechanizm ochrony danych w imporcie CSV:</h4>
              <ul className="list-disc pl-5 space-y-2 text-xs text-gray-600">
                <li><strong>Ochrona przed podwójnym importem (Deduplikacja):</strong> Gdy importujesz ten sam plik CSV drugi raz, Saldo rozpoznaje istniejące Identyfikatory transakcji i nie dubluje wpisów.</li>
                <li><strong>Sprawdzanie poprawności numerycznej:</strong> Jeśli wyciąg zawiera uszkodzone lub nieczytelne kwoty (np. tekstowe znaki zapytania zamienione na NaN), transakcja zostaje bezpiecznie odrzucona.</li>
                <li><strong>Autokategoryzacja:</strong> Słowa kluczowe np. "Orlen", "Biedronka", "Uber" automatycznie przydzielają właściwą kategorię budżetową.</li>
              </ul>
            </div>
          </HelpSection>
        )}

        {/* SECTION 4: PAYMENTS & CALENDAR */}
        {filteredSections.some((s) => s.id === "payments") && (
          <HelpSection
            id="payments"
            category="Rachunki i Kalendarz"
            title="Płatności, Subskrypcje i integracja z Kalendarzem Google"
            icon={<Clock className="w-5 h-5" />}
          >
            <div className="space-y-4 text-sm text-gray-700">
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

              <h4 className="font-bold text-gray-900">Cykl życia Płatności:</h4>
              <div className="flex flex-col sm:flex-row items-center gap-2 text-xs text-gray-700 font-medium">
                <div className="p-2.5 bg-slate-100 rounded-lg border border-gray-200 text-center w-full">1. Utworzenie Rachunku (np. Czynsz 2000 PLN)</div>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0 hidden sm:block" />
                <div className="p-2.5 bg-amber-100 text-amber-900 rounded-lg border border-amber-200 text-center w-full">2. Rezerwacja w Safe-to-Spend</div>
                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0 hidden sm:block" />
                <div className="p-2.5 bg-emerald-100 text-emerald-900 rounded-lg border border-emerald-200 text-center w-full">3. Przycisk "Opłacono" ➔ Wydatek zrobiony</div>
              </div>
            </div>
          </HelpSection>
        )}

        {/* SECTION 5: BUDGETS */}
        {filteredSections.some((s) => s.id === "budgets") && (
          <HelpSection
            id="budgets"
            category="Budżety i Limity"
            title="Budżety kategorii, paski postępu i alerty ostrzegawcze"
            icon={<Wallet className="w-5 h-5" />}
          >
            <div className="space-y-4 text-sm text-gray-700">
              <p className="leading-relaxed">
                Budżety pozwalają nałożyć miesięczny limit na poszczególne kategorie wydatków (np. 1500 zł na Jedzenie, 500 zł na Rozrywkę).
              </p>

              <div className="space-y-2 my-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-700">
                    <span>Kategoria: Jedzenie i Spożywcze</span>
                    <span className="text-emerald-700">65% (975 / 1500 PLN)</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[65%]" />
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-xs font-semibold text-gray-700">
                    <span>Kategoria: Rozrywka i Wyjścia</span>
                    <span className="text-red-600 font-bold">115% (575 / 500 PLN — PRZEKROCZENIE!)</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full w-full" />
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-600">
                Gdy wydatek w danej kategorii przekroczy 80% lub 100% ustalonego limitu, na Pulpicie pojawia się specjalny widget <strong>Ostrzeżenia Budżetowe</strong> z propozycją korekty.
              </p>
            </div>
          </HelpSection>
        )}

        {/* SECTION 6: GOALS & INVESTMENTS */}
        {filteredSections.some((s) => s.id === "goals") && (
          <HelpSection
            id="goals"
            category="Cele i Inwestycje"
            title="Cele oszczędnościowe, Poduszka bezpieczeństwa oraz IKE / IKZE"
            icon={<Target className="w-5 h-5" />}
            badge="Ochrona Rezerw"
          >
            <div className="space-y-4 text-sm text-gray-700">
              <p className="leading-relaxed">
                Ta sekcja pomaga budować długoterminowy majątek. Dzieli oszczędności na trzy niezależne filary:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <h5 className="font-bold text-emerald-900 mb-1">1. Cele krótkoterminowe</h5>
                  <p className="text-emerald-800">Wakacje, nowy sprzęt, remont. Zbierasz określoną kwotę do konkretnej daty.</p>
                </div>

                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                  <h5 className="font-bold text-teal-900 mb-1">2. Poduszka Finansowa</h5>
                  <p className="text-teal-800">Środki na 3–6 miesięcy życia. Pokazywane osobno jako kapitał bezpieczeństwa.</p>
                </div>

                <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl">
                  <h5 className="font-bold text-cyan-900 mb-1">3. IKE / IKZE / Inwestycje</h5>
                  <p className="text-cyan-800">Konta emerytalne, lokaty, akcje, fundusze. Odłączone od codziennego portfela.</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-xs text-red-900 flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-sm text-red-950 font-bold mb-0.5">Zasada ochrony zgromadzonych rezerw (saved &gt; 0)</strong>
                  Aplikacja posiada blokadę chroniącą przed przypadkowym usunięciem celu, na który wpłacono już realne pieniądze. Aby usunąć taki cel, należy najpierw wycofać środki (zmniejszyć zgromadzoną kwotę do 0).
                </div>
              </div>
            </div>
          </HelpSection>
        )}

        {/* SECTION 7: PROFILES & PIN */}
        {filteredSections.some((s) => s.id === "profiles") && (
          <HelpSection
            id="profiles"
            category="Profile i PIN"
            title="Profile (Osobisty / Wspólny), Szyfrowanie i blokada PIN"
            icon={<Lock className="w-5 h-5" />}
          >
            <div className="space-y-4 text-sm text-gray-700">
              <p className="leading-relaxed">
                Saldo umożliwia posiadanie wielu odizolowanych profili finansowych w ramach jednej aplikacji (np. "Mój budżet prywatny" oraz "Wspólny budżet z partnerem").
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
                  <h5 className="font-bold text-gray-900 mb-1">Profil Wspólny i Podział Wydatków</h5>
                  <p className="text-gray-600">
                    W profilu typu Shared każda transakcja ma oznaczenie kto płacił (Ja / Partner) oraz tryb podziału (Równo 50/50 lub Tylko ja). Widget Rozliczeń automatycznie podlicza balans kto komu ile jest winien!
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
                  <h5 className="font-bold text-gray-900 mb-1">Blokada PIN dla prywatności</h5>
                  <p className="text-gray-600">
                    W Ustawieniach możesz włączyć 4-cyfrowy kod PIN dla dowolnego profilu. Po zablokowaniu, przełączenie na ten profil wymaga wpisania kodu.
                  </p>
                </div>
              </div>
            </div>
          </HelpSection>
        )}

        {/* SECTION 8: BACKUP & DRIVE */}
        {filteredSections.some((s) => s.id === "backup") && (
          <HelpSection
            id="backup"
            category="Kopia i Chmura"
            title="Kopie zapasowe na Google Drive, eksport JSON i obsługa konfliktów"
            icon={<Database className="w-5 h-5" />}
          >
            <div className="space-y-4 text-sm text-gray-700">
              <p className="leading-relaxed">
                Twoje dane finansowe należą wyłącznie do Ciebie. Saldo nie korzysta z własnych serwerów bazy danych — zamiast tego zapisuje stan w przeglądarce (IndexedDB) oraz na Twoim prywatnym koncie Google Drive.
              </p>

              <div className="space-y-2 text-xs text-gray-600">
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
                  Możesz w dowolnej chwili pobrać surowy plik danych <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800">.json</code> i przenieść go na dowolne urządzenie pendrive'em lub mailem.
                </div>
              </div>
            </div>
          </HelpSection>
        )}

        {/* SECTION 9: AI MODES */}
        {filteredSections.some((s) => s.id === "ai") && (
          <HelpSection
            id="ai"
            category="Lokalne AI"
            title="Tryby pracy AI (None, Lokalne Ollama, Gemini) oraz Przyszłość"
            icon={<Sparkles className="w-5 h-5" />}
          >
            <div className="space-y-4 text-sm text-gray-700">
              <p className="leading-relaxed">
                Saldo wspiera 3 elastyczne tryby sztucznej inteligencji dopasowane do Twoich wymagań odnośnie prywatności:
              </p>

              <ul className="list-disc pl-5 space-y-3 text-xs">
                <li>
                  <strong>Tryb podstawowy (None) – 100% Darmowy &amp; Domyślny:</strong><br />
                  Pełna funkcjonalność aplikacji bez użycia modeli AI. Wykorzystuje ultra-szybkie algorytmy deterministyczne do parsowania tekstów, autokategoryzacji i importu CSV. Brak połączeń sieciowych.
                </li>
                <li>
                  <strong>Lokalne AI (local / Ollama) – Pełna prywatność Power-Usera:</strong><br />
                  Łączy się z lokalnym modelem uruchomionym na Twoim komputerze za pomocą aplikacji Ollama (<code className="bg-gray-100 px-1 py-0.5 rounded">http://localhost:11434</code>).
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

              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs text-gray-700">
                <strong className="text-[#137566] block font-bold mb-1">Planowane funkcje w przyszłych wersjach:</strong>
                Chmurowe AI (Gemini OCR dla skanowania paragonów), automatyczna synchronizacja z bankami przez bezpieczny Open Banking (PSD2), obsługa wielu walut z przeliczaniem kursów NBP w czasie rzeczywistym oraz wieloosobowe budżetowanie live!
              </div>
            </div>
          </HelpSection>
        )}
      </div>

      {/* Interactive FAQ Box */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
          <HelpCircle className="w-6 h-6 text-[#137566]" />
          Najczęściej zadawane pytania (FAQ)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
            <h5 className="font-bold text-gray-900 text-sm">Czy moje dane trafiają na Wasze serwery?</h5>
            <p className="text-gray-600 leading-relaxed">
              Nie. Saldo działa w architekturze Local-First. Twoje finanse są zapisywane wyłącznie na Twoim urządzeniu w bezpiecznej pamięci przeglądarki lub na Twoim osobistym koncie Google Drive.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
            <h5 className="font-bold text-gray-900 text-sm">Co się stanie, gdy zgubię kod PIN?</h5>
            <p className="text-gray-600 leading-relaxed">
              Kod PIN zabezpiecza dostęp do wybranego profilu. Możesz zresetować zapomniany PIN w Ustawieniach lub przywrócić niezabezpieczoną kopię zapasową z pliku JSON lub Google Drive.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
            <h5 className="font-bold text-gray-900 text-sm">Dlaczego import CSV odrzucił niektóre wiersze?</h5>
            <p className="text-gray-600 leading-relaxed">
              System posiada wbudowaną walidację unikania duplikatów oraz filtr usuwający błędne wartości (np. puste kwoty lub zakodowany tekst NaN), chroniąc spójność wyliczeń.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
            <h5 className="font-bold text-gray-900 text-sm">Jak powiązać rachunek z Kalendarzem Google?</h5>
            <p className="text-gray-600 leading-relaxed">
              Przejdź do zakładki Płatności i kliknij ikonę kalendarza obok wybranej płatności. Zostanie przygotowane wydarzenie ze szczegółami kwoty i terminu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Terminal(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}
