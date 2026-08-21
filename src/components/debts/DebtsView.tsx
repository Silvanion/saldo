import React, { useState, useMemo } from "react";
import { DebtItem, DebtType, Profile } from "../../types";
import { calculatePortfolioDebtKpis } from "../../services/debtCalculations";
import { DebtPortfolioCard } from "./DebtPortfolioCard";
import { DebtDetailsModal, DebtDetailTab } from "./DebtDetailsModal";
import { OverpaymentSimulatorModal } from "./OverpaymentSimulatorModal";
import { RefinanceComparisonModal } from "./RefinanceComparisonModal";
import { DebtFormModal } from "./DebtFormModal";
import { MOCK_STRATEGIES, MOCK_KNOWLEDGE_ARTICLES } from "./mockData";
import { formatMoney } from "../../utils/format";
import {
  Plus,
  PlusCircle,
  FileSpreadsheet,
  GitCompare,
  TrendingDown,
  Layers,
  Sparkles,
  AlertTriangle,
  Scale,
  Calendar,
  Percent,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Filter,
  ArrowUpDown,
  Search,
  Landmark,
  ShieldCheck,
  Zap,
  Flame,
  Clock,
  RotateCcw
} from "lucide-react";

export interface DebtsViewProps {
  profile?: Profile;
  onAddDebt?: (debt: Omit<DebtItem, "id" | "createdAt">) => void;
  onUpdateDebt?: (debtId: string, updates: Partial<DebtItem>) => void;
  onDeleteDebt?: (debtId: string) => void;
  onToggleDebtStatus?: (debtId: string) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

type MainTab = "portfolio" | "scenarios" | "offers" | "knowledge";
type FilterType = "all" | "active" | "closed" | DebtType;
type SortOption = "apr" | "payment" | "cost" | "payoff_date" | "balance";

export function DebtsView({
  profile,
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
  onToggleDebtStatus,
  showToast
}: DebtsViewProps) {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("portfolio");
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortOption>("apr");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [debtToEdit, setDebtToEdit] = useState<DebtItem | null>(null);
  const [selectedDebtForDetails, setSelectedDebtForDetails] = useState<DebtItem | null>(null);
  const [initialDetailsTab, setInitialDetailsTab] = useState<DebtDetailTab>("overview");
  const [selectedDebtForOverpayment, setSelectedDebtForOverpayment] = useState<DebtItem | null>(null);
  const [selectedDebtForRefinance, setSelectedDebtForRefinance] = useState<DebtItem | null>(null);

  const debts = useMemo(() => {
    return profile?.debts || [];
  }, [profile?.debts]);

  const currency = profile?.currency || "PLN";

  // Calculate real portfolio KPIs
  const kpiData = useMemo(() => {
    return calculatePortfolioDebtKpis(debts);
  }, [debts]);

  // Filter and sort debts
  const filteredDebts = useMemo(() => {
    let list = [...debts];

    if (selectedFilter === "active") {
      list = list.filter((d) => d.status !== "closed");
    } else if (selectedFilter === "closed") {
      list = list.filter((d) => d.status === "closed");
    } else if (selectedFilter !== "all") {
      list = list.filter((d) => d.type === selectedFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.institution.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "apr":
          return (b.interestRate || 0) - (a.interestRate || 0);
        case "payment":
          return (b.monthlyPayment || 0) - (a.monthlyPayment || 0);
        case "balance":
          return (b.balance || 0) - (a.balance || 0);
        case "cost":
          return (b.balance * b.interestRate) - (a.balance * a.interestRate);
        case "payoff_date":
        default:
          return (a.remainingMonths || 999) - (b.remainingMonths || 999);
      }
    });

    return list;
  }, [debts, selectedFilter, sortBy, searchQuery]);

  const handleOpenAddModal = () => {
    setDebtToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (debt: DebtItem) => {
    setDebtToEdit(debt);
    setIsFormModalOpen(true);
  };

  const handleSaveForm = (data: Omit<DebtItem, "id" | "createdAt">) => {
    if (debtToEdit) {
      onUpdateDebt?.(debtToEdit.id, data);
    } else {
      onAddDebt?.(data);
    }
  };

  const handleOpenDetails = (debt: DebtItem, tab: DebtDetailTab = "overview") => {
    setInitialDetailsTab(tab);
    setSelectedDebtForDetails(debt);
  };

  const handleTopActionClick = (actionName: string) => {
    if (actionName === "strategies") {
      setActiveMainTab("scenarios");
    } else if (actionName === "offers") {
      setActiveMainTab("offers");
    } else if (actionName === "import") {
      showToast?.("Import zadłużenia z BIK/CSV będzie dostępny w kolejnym sprincie.", "info");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="debts-view-container">
      {/* 1. TOP HEADER & ACTION BUTTONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-brand-subtle text-brand border border-brand/20 shadow-2xs">
              <Landmark className="w-4 h-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-text-main tracking-tight">
              Kredyty i Hipoteka
            </h1>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Cały portfel zadłużenia w jednym miejscu • Analiza kosztów, symulator nadpłat i strategie spłaty
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenAddModal}
            className="bg-brand text-text-inverse font-bold py-2.5 px-3.5 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-xs text-xs flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            id="btn-add-debt"
          >
            <Plus className="w-4 h-4" />
            <span>Dodaj zobowiązanie</span>
          </button>

          <button
            onClick={() => handleTopActionClick("offers")}
            className="bg-surface hover:bg-surface-2 border border-border text-text-main font-bold py-2.5 px-3 rounded-xl active:scale-[0.98] transition-all shadow-2xs text-xs flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            id="btn-add-scenario"
          >
            <PlusCircle className="w-3.5 h-3.5 text-brand" />
            <span className="hidden sm:inline">Nowa oferta / scenariusz</span>
            <span className="sm:hidden">Oferta</span>
          </button>

          <button
            onClick={() => handleTopActionClick("import")}
            className="bg-surface hover:bg-surface-2 border border-border text-text-muted hover:text-text-main font-bold py-2.5 px-3 rounded-xl active:scale-[0.98] transition-all shadow-2xs text-xs flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            id="btn-import-debts"
            title="Importuj dane z wyciągów lub BIK"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Importuj</span>
          </button>

          <button
            onClick={() => handleTopActionClick("strategies")}
            className="bg-brand-subtle text-brand hover:bg-brand-subtle/80 border border-brand/20 font-bold py-2.5 px-3 rounded-xl active:scale-[0.98] transition-all shadow-2xs text-xs flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            id="btn-compare-strategies"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Porównaj strategie</span>
          </button>
        </div>
      </div>

      {/* 2. PORTFOLIO KPI AREA (8 Real Indicators) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" id="portfolio-kpis-grid">
        {/* KPI 1: Łączne saldo */}
        <div className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block">
            Łączne saldo
          </span>
          <div className="my-1">
            <span className="text-xl sm:text-2xl font-black text-text-main tabular-nums">
              {formatMoney(kpiData.totalBalance, currency)}
            </span>
          </div>
          <span className="text-[11px] text-text-muted">
            {kpiData.activeCount} {kpiData.activeCount === 1 ? "aktywne dług" : "aktywne długi"}
            {kpiData.closedCount > 0 ? ` (${kpiData.closedCount} spłaconych)` : ""}
          </span>
        </div>

        {/* KPI 2: Miesięczna obsługa */}
        <div className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block">
            Miesięczna obsługa
          </span>
          <div className="my-1">
            <span className="text-xl sm:text-2xl font-black text-text-main tabular-nums">
              {formatMoney(kpiData.monthlyDebtService, currency)}
            </span>
          </div>
          <span className="text-[11px] text-text-muted">suma bieżących rat i spłat</span>
        </div>

        {/* KPI 3: Pozostałe odsetki */}
        <div className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block">
            Pozostałe odsetki
          </span>
          <div className="my-1">
            <span className="text-xl sm:text-2xl font-black text-text-main tabular-nums">
              {formatMoney(kpiData.remainingInterest, currency)}
            </span>
          </div>
          <span className="text-[11px] text-danger font-medium">szacowany koszt obsługi</span>
        </div>

        {/* KPI 4: Śr. koszt długu */}
        <div className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block">
            Śr. koszt długu (WACD)
          </span>
          <div className="my-1">
            <span className="text-xl sm:text-2xl font-black text-brand tabular-nums">
              {kpiData.weightedInterestRate.toFixed(1)}%
            </span>
          </div>
          <span className="text-[11px] text-text-muted">średnia ważona kapitałem</span>
        </div>

        {/* KPI 5: Najdroższy dług */}
        <div className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-danger flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" />
            Najdroższy dług
          </span>
          <div className="my-1">
            <span
              className="text-sm sm:text-base font-bold text-text-main truncate block"
              title={kpiData.mostExpensiveDebt?.name || "Brak"}
            >
              {kpiData.mostExpensiveDebt?.name || "Brak aktywnych"}
            </span>
          </div>
          <span className="text-xs font-black text-danger tabular-nums">
            {kpiData.mostExpensiveDebt ? `APR ${kpiData.mostExpensiveDebt.apr.toFixed(1)}%` : "0.0%"}
          </span>
        </div>

        {/* KPI 6: Najbliższa płatność */}
        <div className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block">
            Najbliższa płatność
          </span>
          <div className="my-1">
            <span
              className="text-sm sm:text-base font-bold text-text-main truncate block"
              title={kpiData.nearestPayment?.name || "Brak"}
            >
              {kpiData.nearestPayment?.name || "Brak"}
            </span>
          </div>
          <span className="text-xs text-text-muted font-bold">
            {kpiData.nearestPayment
              ? `${kpiData.nearestPayment.date} (${formatMoney(kpiData.nearestPayment.amount, currency)})`
              : "Brak terminów"}
          </span>
        </div>

        {/* KPI 7: Refi alert */}
        <div className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Refi alert
          </span>
          <div className="my-1">
            <span className="text-sm sm:text-base font-bold text-text-main truncate block">
              {kpiData.weightedInterestRate > 6.5 ? "Warto sprawdzić oferty" : "Warunki stabilne"}
            </span>
          </div>
          <span className="text-[11px] text-text-muted">
            {kpiData.weightedInterestRate > 6.5 ? "potencjał optymalizacji stawek" : "brak pilnych zmian"}
          </span>
        </div>

        {/* KPI 8: Potencjał nadpłaty */}
        <div className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            Potencjał nadpłaty
          </span>
          <div className="my-1">
            <span className="text-sm sm:text-base font-bold text-brand truncate block">
              {kpiData.totalBalance > 50000 ? "Oszczędność do kilkudziesięciu tys. zł" : "Szybka spłata możliwa"}
            </span>
          </div>
          <span className="text-[11px] text-text-muted">sprawdź w symulatorze</span>
        </div>
      </div>

      {/* 3. PRIMARY TABS: [Portfel] [Scenariusze] [Oferty] [Wiedza] */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveMainTab("portfolio")}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeMainTab === "portfolio"
              ? "bg-brand text-text-inverse shadow-xs"
              : "text-text-muted hover:text-text-main hover:bg-surface-2"
          }`}
          id="tab-btn-portfolio"
        >
          <Layers className="w-4 h-4" />
          <span>Portfel zobowiązań</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeMainTab === "portfolio"
                ? "bg-text-inverse/20 text-text-inverse"
                : "bg-surface-2 text-text-muted"
            }`}
          >
            {debts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab("scenarios")}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeMainTab === "scenarios"
              ? "bg-brand text-text-inverse shadow-xs"
              : "text-text-muted hover:text-text-main hover:bg-surface-2"
          }`}
          id="tab-btn-scenarios"
        >
          <GitCompare className="w-4 h-4" />
          <span>Scenariusze & Strategie</span>
        </button>

        <button
          onClick={() => setActiveMainTab("offers")}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeMainTab === "offers"
              ? "bg-brand text-text-inverse shadow-xs"
              : "text-text-muted hover:text-text-main hover:bg-surface-2"
          }`}
          id="tab-btn-offers"
        >
          <Scale className="w-4 h-4" />
          <span>Oferty & Refinansowanie</span>
        </button>

        <button
          onClick={() => setActiveMainTab("knowledge")}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeMainTab === "knowledge"
              ? "bg-brand text-text-inverse shadow-xs"
              : "text-text-muted hover:text-text-main hover:bg-surface-2"
          }`}
          id="tab-btn-knowledge"
        >
          <BookOpen className="w-4 h-4" />
          <span>Wiedza & Benchmarki</span>
        </button>
      </div>

      {/* 4. TAB CONTENT 1: PORTFOLIO LIST */}
      {activeMainTab === "portfolio" && (
        <div className="space-y-4 animate-fade-in">
          {/* Controls Bar: Filters & Sort */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3 sm:p-4 rounded-2xl border border-border/80">
            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedFilter === "all"
                    ? "bg-brand-subtle text-brand border border-brand/20"
                    : "text-text-muted hover:text-text-main hover:bg-surface-2"
                }`}
              >
                Wszystkie ({debts.length})
              </button>

              <button
                onClick={() => setSelectedFilter("active")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedFilter === "active"
                    ? "bg-brand-subtle text-brand border border-brand/20"
                    : "text-text-muted hover:text-text-main hover:bg-surface-2"
                }`}
              >
                Aktywne ({kpiData.activeCount})
              </button>

              <button
                onClick={() => setSelectedFilter("mortgage")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedFilter === "mortgage"
                    ? "bg-brand-subtle text-brand border border-brand/20"
                    : "text-text-muted hover:text-text-main hover:bg-surface-2"
                }`}
              >
                Hipoteki
              </button>

              <button
                onClick={() => setSelectedFilter("credit_card")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedFilter === "credit_card"
                    ? "bg-brand-subtle text-brand border border-brand/20"
                    : "text-text-muted hover:text-text-main hover:bg-surface-2"
                }`}
              >
                Karty
              </button>

              <button
                onClick={() => setSelectedFilter("cash_loan")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedFilter === "cash_loan"
                    ? "bg-brand-subtle text-brand border border-brand/20"
                    : "text-text-muted hover:text-text-main hover:bg-surface-2"
                }`}
              >
                Gotówkowe
              </button>

              <button
                onClick={() => setSelectedFilter("bnpl")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedFilter === "bnpl"
                    ? "bg-brand-subtle text-brand border border-brand/20"
                    : "text-text-muted hover:text-text-main hover:bg-surface-2"
                }`}
              >
                BNPL
              </button>

              {kpiData.closedCount > 0 && (
                <button
                  onClick={() => setSelectedFilter("closed")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedFilter === "closed"
                      ? "bg-brand-subtle text-brand border border-brand/20"
                      : "text-text-muted hover:text-text-main hover:bg-surface-2"
                  }`}
                >
                  Zamknięte ({kpiData.closedCount})
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-text-faint flex items-center gap-1 font-semibold">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Sortuj:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-surface-2 border border-border text-xs font-bold text-text-main rounded-xl px-2.5 py-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
              >
                <option value="apr">Najwyższy APR / Koszt</option>
                <option value="payment">Wysokość raty</option>
                <option value="balance">Wielkość salda</option>
                <option value="payoff_date">Termin spłaty</option>
              </select>
            </div>
          </div>

          {/* Cards Grid / Empty State */}
          {filteredDebts.length === 0 ? (
            <div className="text-center py-12 px-6 bg-surface rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-subtle flex items-center justify-center mb-3.5 border border-brand/20 shadow-xs">
                <Landmark className="w-7 h-7 text-brand" />
              </div>
              <h3 className="text-base font-bold text-text-main">
                {debts.length === 0 ? "Nie dodałeś jeszcze żadnych zobowiązań" : "Brak wyników dla wybranych filtrów"}
              </h3>
              <p className="text-xs text-text-muted max-w-md mt-1.5 mb-5 leading-relaxed">
                {debts.length === 0
                  ? "Zarządzaj całym portfelem zadłużenia (hipoteki, pożyczki, karty kredytowe) w jednym miejscu. Śledź koszty, raty i licz oszczędności z nadpłat."
                  : "Zmień kryteria filtrowania lub wyszukiwania, aby zobaczyć zobowiązania."}
              </p>
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-text-inverse bg-brand hover:bg-brand-hover px-4 py-2.5 rounded-xl active:scale-[0.98] transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Dodaj pierwsze zobowiązanie</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4" id="debt-cards-list">
              {filteredDebts.map((debt) => (
                <DebtPortfolioCard
                  key={debt.id}
                  debt={debt}
                  onOpenDetails={handleOpenDetails}
                  onOpenOverpayment={(d) => setSelectedDebtForOverpayment(d)}
                  onOpenRefinance={(d) => setSelectedDebtForRefinance(d)}
                  onEdit={handleOpenEditModal}
                  onDelete={(id) => onDeleteDebt?.(id)}
                  onToggleStatus={(id) => onToggleDebtStatus?.(id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB CONTENT 2: SCENARIOS & STRATEGIES */}
      {activeMainTab === "scenarios" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border">
            <h3 className="text-base font-bold text-text-main mb-1">
              Porównanie strategii spłaty całego portfela
            </h3>
            <p className="text-xs text-text-muted mb-6">
              Wybierz model optymalizacji spłaty zadłużenia dostosowany do Twoich celów.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {MOCK_STRATEGIES.map((strategy) => (
                <div
                  key={strategy.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                    strategy.recommended
                      ? "bg-brand-subtle/50 border-brand shadow-sm"
                      : "bg-surface-2/60 border-border"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-surface text-text-main border border-border">
                        {strategy.badge}
                      </span>
                      {strategy.recommended && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-brand text-text-inverse">
                          Rekomendacja
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-text-main mt-2 mb-1.5">
                      {strategy.name}
                    </h4>
                    <p className="text-xs text-text-muted mb-4 leading-relaxed">
                      {strategy.description}
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-border/50 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-faint">Horyzont:</span>
                      <span className="font-bold text-text-main">{strategy.timeframe}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-faint">Oszczędność:</span>
                      <span className="font-bold text-brand">{strategy.interestSavings}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-faint">Wpływ na płynność:</span>
                      <span className="font-medium text-text-muted">{strategy.liquidityImpact}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT 3: OFFERS & REFINANCING */}
      {activeMainTab === "offers" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-text-main mb-1">
                Kalkulator ofert i refinansowania
              </h3>
              <p className="text-xs text-text-muted">
                Porównaj swoje obecne kredyty z ofertami innych banków (moduł ofertowy).
              </p>
            </div>
            {debts.length > 0 && (
              <button
                onClick={() => setSelectedDebtForRefinance(debts[0])}
                className="px-4 py-2.5 bg-brand text-text-inverse text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-[0.98] transition cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
              >
                Uruchom kalkulator porównawczy
              </button>
            )}
          </div>
        </div>
      )}

      {/* 7. TAB CONTENT 4: KNOWLEDGE & BENCHMARKS */}
      {activeMainTab === "knowledge" && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MOCK_KNOWLEDGE_ARTICLES.map((art) => (
              <div
                key={art.id}
                className="p-5 bg-surface border border-border rounded-2xl flex flex-col justify-between hover:border-brand/40 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand px-2 py-0.5 bg-brand-subtle rounded-md">
                      {art.category}
                    </span>
                    <span className="text-xs text-text-faint">{art.readTime}</span>
                  </div>
                  <h4 className="text-sm font-bold text-text-main mb-2">{art.title}</h4>
                  <p className="text-xs text-text-muted leading-relaxed">{art.summary}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-bold text-brand">
                  <span>Przewodnik edukacyjny</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT DEBT */}
      {isFormModalOpen && (
        <DebtFormModal
          isOpen={true}
          onClose={() => setIsFormModalOpen(false)}
          onSave={handleSaveForm}
          initialData={debtToEdit}
          currency={currency}
        />
      )}

      {/* MODAL 2: DEBT DETAILS */}
      {selectedDebtForDetails && (
        <DebtDetailsModal
          isOpen={true}
          debt={selectedDebtForDetails}
          initialTab={initialDetailsTab}
          onClose={() => setSelectedDebtForDetails(null)}
          onOpenOverpaymentModal={(d) => {
            setSelectedDebtForDetails(null);
            setSelectedDebtForOverpayment(d);
          }}
          onOpenRefinanceModal={(d) => {
            setSelectedDebtForDetails(null);
            setSelectedDebtForRefinance(d);
          }}
        />
      )}

      {/* MODAL 3: OVERPAYMENT SIMULATOR */}
      {selectedDebtForOverpayment && (
        <OverpaymentSimulatorModal
          isOpen={true}
          debt={selectedDebtForOverpayment}
          onClose={() => setSelectedDebtForOverpayment(null)}
        />
      )}

      {/* MODAL 4: REFINANCE COMPARISON */}
      {selectedDebtForRefinance && (
        <RefinanceComparisonModal
          isOpen={true}
          debt={selectedDebtForRefinance as any}
          onClose={() => setSelectedDebtForRefinance(null)}
        />
      )}
    </div>
  );
}
