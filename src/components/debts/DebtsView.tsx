import React, { useState, useMemo } from "react";
import { DebtItem, DebtType, Profile, DebtPayoffScenario } from "../../types";
import {
  calculatePortfolioDebtKpis,
  calculateDebtPortfolioAnalytics,
  calculatePortfolioPayoffStrategies,
  buildValidatedCustomOrder,
  DebtPayoffStrategyType
} from "../../services/debtCalculations";
import { DebtPortfolioCard } from "./DebtPortfolioCard";
import { DebtDetailsModal, DebtDetailTab } from "./DebtDetailsModal";
import { OverpaymentSimulatorModal } from "./OverpaymentSimulatorModal";
import { RefinanceComparisonModal } from "./RefinanceComparisonModal";
import { DebtFormModal } from "./DebtFormModal";
import { PayoffStrategiesKnowledgeCenter } from "./PayoffStrategiesKnowledgeCenter";
import { PayoffScenarioComparisonModal } from "./PayoffScenarioComparisonModal";
import { MOCK_KNOWLEDGE_ARTICLES } from "./mockData";
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
  ArrowUp,
  ArrowDown,
  Filter,
  ArrowUpDown,
  Search,
  Landmark,
  ShieldCheck,
  Zap,
  Flame,
  Clock,
  RotateCcw,
  PieChart,
  Activity,
  ArrowUpRight,
  Info,
  Bookmark,
  Trash2,
  Save,
  X
} from "lucide-react";

export interface DebtsViewProps {
  profile?: Profile;
  onAddDebt?: (debt: Omit<DebtItem, "id" | "createdAt">) => void;
  onUpdateDebt?: (debtId: string, updates: Partial<DebtItem>) => void;
  onDeleteDebt?: (debtId: string) => void;
  onToggleDebtStatus?: (debtId: string) => void;
  onSavePayoffScenario?: (scenario: Omit<DebtPayoffScenario, "id" | "createdAt"> & { id?: string }) => void;
  onDeletePayoffScenario?: (scenarioId: string) => void;
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
  onSavePayoffScenario,
  onDeletePayoffScenario,
  showToast
}: DebtsViewProps) {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("portfolio");
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortOption>("apr");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAnalyticsDetails, setShowAnalyticsDetails] = useState(true);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [debtToEdit, setDebtToEdit] = useState<DebtItem | null>(null);
  const [selectedDebtForDetails, setSelectedDebtForDetails] = useState<DebtItem | null>(null);
  const [initialDetailsTab, setInitialDetailsTab] = useState<DebtDetailTab>("overview");
  const [selectedDebtForOverpayment, setSelectedDebtForOverpayment] = useState<DebtItem | null>(null);
  const [selectedDebtForRefinance, setSelectedDebtForRefinance] = useState<DebtItem | null>(null);

  // Sprint 7 & 9: Saved Payoff Scenarios & Comparison state
  const savedScenarios = useMemo(() => {
    return profile?.debtPayoffScenarios || [];
  }, [profile?.debtPayoffScenarios]);

  const [isSaveScenarioModalOpen, setIsSaveScenarioModalOpen] = useState(false);
  const [scenarioNameInput, setScenarioNameInput] = useState("");
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);

  // Sprint 9: Scenario Comparison state
  const [selectedScenarioIdsForCompare, setSelectedScenarioIdsForCompare] = useState<string[]>([]);
  const [isCompareScenariosModalOpen, setIsCompareScenariosModalOpen] = useState(false);

  const validSelectedScenarioIds = useMemo(() => {
    const existingIds = new Set(savedScenarios.map((s) => s.id));
    return selectedScenarioIdsForCompare.filter((id) => existingIds.has(id));
  }, [selectedScenarioIdsForCompare, savedScenarios]);

  const handleToggleSelectScenario = (scenarioId: string) => {
    setSelectedScenarioIdsForCompare((prev) => {
      const existing = prev.filter((id) => savedScenarios.some((s) => s.id === id));
      if (existing.includes(scenarioId)) {
        return existing.filter((id) => id !== scenarioId);
      }
      if (existing.length >= 2) {
        return existing; // Maximum 2 scenarios
      }
      return [...existing, scenarioId];
    });
  };

  const debts = useMemo(() => {
    return profile?.debts || [];
  }, [profile?.debts]);

  const currency = profile?.currency || "PLN";

  // Calculate real portfolio KPIs and deep analytics
  const kpiData = useMemo(() => {
    return calculatePortfolioDebtKpis(debts);
  }, [debts]);

  const analytics = useMemo(() => {
    return calculateDebtPortfolioAnalytics(debts);
  }, [debts]);

  // Sprint 4 & 5: Portfolio Payoff Strategy Simulator (including Custom Order)
  const [extraMonthlyPayoff, setExtraMonthlyPayoff] = useState<number>(500);
  const [selectedPayoffStrategy, setSelectedPayoffStrategy] = useState<DebtPayoffStrategyType>("avalanche");
  const [customDebtOrder, setCustomDebtOrder] = useState<string[]>([]);

  const activeDebts = useMemo(() => {
    return debts.filter((d) => d && d.status !== "closed" && (Number(d.balance) || 0) > 0);
  }, [debts]);

  const validatedCustomOrder = useMemo(() => {
    return buildValidatedCustomOrder(activeDebts, customDebtOrder);
  }, [activeDebts, customDebtOrder]);

  const handleMoveDebtUp = (debtId: string) => {
    const current = [...validatedCustomOrder];
    const idx = current.indexOf(debtId);
    if (idx > 0) {
      const temp = current[idx];
      current[idx] = current[idx - 1];
      current[idx - 1] = temp;
      setCustomDebtOrder(current);
    }
  };

  const handleMoveDebtDown = (debtId: string) => {
    const current = [...validatedCustomOrder];
    const idx = current.indexOf(debtId);
    if (idx !== -1 && idx < current.length - 1) {
      const temp = current[idx];
      current[idx] = current[idx + 1];
      current[idx + 1] = temp;
      setCustomDebtOrder(current);
    }
  };

  const handleOpenSaveScenarioModal = (existingScenario?: DebtPayoffScenario) => {
    if (existingScenario) {
      setEditingScenarioId(existingScenario.id);
      setScenarioNameInput(existingScenario.name);
    } else {
      setEditingScenarioId(null);
      const strategyLabel =
        selectedPayoffStrategy === "avalanche"
          ? "Lawina"
          : selectedPayoffStrategy === "snowball"
          ? "Kula Śnieżna"
          : selectedPayoffStrategy === "custom"
          ? "Własna kolejność"
          : "Status Quo";
      setScenarioNameInput(`Plan ${strategyLabel} (+${formatMoney(extraMonthlyPayoff, currency)})`);
    }
    setIsSaveScenarioModalOpen(true);
  };

  const handleSaveScenarioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = scenarioNameInput.trim();
    if (trimmed.length < 2) return;

    if (onSavePayoffScenario) {
      onSavePayoffScenario({
        id: editingScenarioId || undefined,
        name: trimmed,
        strategy: selectedPayoffStrategy,
        extraMonthlyPayment: extraMonthlyPayoff,
        customDebtOrder: selectedPayoffStrategy === "custom" ? validatedCustomOrder : undefined
      });
    }

    setIsSaveScenarioModalOpen(false);
    setScenarioNameInput("");
    setEditingScenarioId(null);
  };

  const handleLoadScenario = (scenario: DebtPayoffScenario) => {
    setSelectedPayoffStrategy(scenario.strategy);
    setExtraMonthlyPayoff(scenario.extraMonthlyPayment);
    setCustomDebtOrder(
      scenario.strategy === "custom" && scenario.customDebtOrder?.length
        ? scenario.customDebtOrder
        : []
    );

    showToast?.(`Wczytano scenariusz: ${scenario.name}`, "info");
  };

  const payoffComparison = useMemo(() => {
    return calculatePortfolioPayoffStrategies(debts, extraMonthlyPayoff, undefined, validatedCustomOrder);
  }, [debts, extraMonthlyPayoff, validatedCustomOrder]);

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
              {analytics.refinanceCandidates.length > 0 ? "Warto sprawdzić oferty" : "Warunki stabilne"}
            </span>
          </div>
          <span className="text-[11px] text-text-muted">
            {analytics.refinanceCandidates.length > 0
              ? `${analytics.refinanceCandidates.length} kandydatów do weryfikacji`
              : "brak pilnych zmian"}
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

      {/* 2B. SPRINT 2: COMPACT DEEP ANALYTICS & INSIGHT SIGNALS */}
      {debts.length > 0 && (
        <div className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand" />
              <h3 className="text-sm font-bold text-text-main">
                Struktura portfela i sygnały decyzyjne
              </h3>
            </div>
            <button
              onClick={() => setShowAnalyticsDetails(!showAnalyticsDetails)}
              className="text-xs font-bold text-text-muted hover:text-text-main transition cursor-pointer"
            >
              {showAnalyticsDetails ? "Zwiń" : "Rozwiń"}
            </button>
          </div>

          {showAnalyticsDetails && (
            <div className="space-y-4 animate-fade-in">
              {/* Insight Signals Row */}
              {analytics.insightSignals.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analytics.insightSignals.map((sig) => (
                    <div
                      key={sig.id}
                      className="p-3.5 rounded-xl border bg-surface-2/50 border-border flex items-start gap-2.5"
                    >
                      <Sparkles className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-text-main block">{sig.title}</span>
                        <p className="text-[11px] text-text-muted leading-relaxed mt-0.5">{sig.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Debt Mix Breakdown Table / Bars */}
              {analytics.debtMix.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block">
                    Rozkład kapitału i miesięcznego obciążenia wg typu
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {analytics.debtMix.map((mix) => (
                      <div key={mix.type} className="p-3 bg-surface-2/40 border border-border/60 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-text-main">{mix.typeLabel}</span>
                          <span className="font-bold text-text-muted">{mix.count} szt.</span>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] text-text-muted mb-1">
                            <span>Saldo ({mix.balanceSharePct}%):</span>
                            <span className="font-bold text-text-main tabular-nums">{formatMoney(mix.totalBalance, currency)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-offset rounded-full overflow-hidden">
                            <div className="h-full bg-brand rounded-full" style={{ width: `${mix.balanceSharePct}%` }} />
                          </div>
                        </div>

                        <div className="flex justify-between text-[11px] text-text-muted pt-1 border-t border-border/40">
                          <span>Miesięczna rata:</span>
                          <span className="font-semibold text-text-main tabular-nums">{formatMoney(mix.monthlyBurden, currency)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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

      {/* 5. TAB CONTENT 2: SCENARIOS & STRATEGIES (Sprint 4 Real Engine) */}
      {activeMainTab === "scenarios" && (
        <div className="space-y-6 animate-fade-in" id="payoff-strategies-container">
          {debts.filter((d) => d.status !== "closed").length === 0 ? (
            <div className="bg-surface p-8 sm:p-12 rounded-2xl border border-dashed border-border text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-subtle flex items-center justify-center mb-3.5 border border-brand/20 shadow-xs">
                <GitCompare className="w-7 h-7 text-brand" />
              </div>
              <h3 className="text-base font-bold text-text-main">
                Brak czynnych zobowiązań do symulacji spłaty
              </h3>
              <p className="text-xs text-text-muted max-w-md mt-1.5 mb-5 leading-relaxed">
                Dodaj swoje kredyty w zakładce „Portfel kredytowy”, aby uruchomić symulator metody Lawiny (Avalanche) i Kuli Śnieżnej (Snowball).
              </p>
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-text-inverse bg-brand hover:bg-brand-hover px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Dodaj zobowiązanie</span>
              </button>
            </div>
          ) : (
            <>
              {/* Extra Payment Budget Config Panel */}
              <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-text-main flex items-center gap-2">
                      <GitCompare className="w-5 h-5 text-brand" />
                      Symulator strategii spłaty całego portfela
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      Porównaj spłatę metodą Lawiny (Avalanche) i Kuli Śnieżnej (Snowball) z mechanizmem kaskadowego przenoszenia rat.
                    </p>
                  </div>

                  <div className="bg-surface-2 px-3.5 py-2 rounded-xl border border-border flex items-center gap-3">
                    <span className="text-xs text-text-faint font-semibold">Łączna miesięczna wpłata:</span>
                    <span className="text-sm font-black text-text-main tabular-nums">
                      {formatMoney(kpiData.monthlyDebtService + extraMonthlyPayoff, currency)} / mc
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-2">
                    Dodatkowy budżet na nadpłatę (ponad minimalne raty)
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative w-40">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={extraMonthlyPayoff}
                        onChange={(e) => setExtraMonthlyPayoff(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-12"
                        placeholder="500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-text-muted font-bold pointer-events-none">
                        {currency}
                      </span>
                    </div>

                    {/* Preset buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[0, 200, 500, 1000, 2000].map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setExtraMonthlyPayoff(amount)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                            extraMonthlyPayoff === amount
                              ? "bg-brand text-text-inverse border-brand shadow-xs"
                              : "bg-surface-2 text-text-muted hover:text-text-main border-border"
                          }`}
                        >
                          +{formatMoney(amount, currency)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Saved Scenarios Sub-section */}
                <div className="pt-3 border-t border-border/60 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-brand shrink-0" />
                      <span className="text-xs font-bold text-text-main">
                        Zapisane scenariusze ({savedScenarios.length} / 5)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                      <button
                        type="button"
                        id="btn-compare-scenarios"
                        onClick={() => setIsCompareScenariosModalOpen(true)}
                        disabled={savedScenarios.length < 2 || validSelectedScenarioIds.length < 2}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface text-text-main text-xs font-bold hover:bg-surface-hover hover:border-brand/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shadow-2xs"
                        aria-label={`Porównaj scenariusze (wybrano ${validSelectedScenarioIds.length} z 2)`}
                        title={
                          savedScenarios.length < 2
                            ? "Wymaga co najmniej 2 zapisanych scenariuszy"
                            : validSelectedScenarioIds.length < 2
                            ? "Zaznacz 2 scenariusze do porównania"
                            : "Otwórz porównanie wybranych 2 scenariuszy"
                        }
                      >
                        <GitCompare className="w-3.5 h-3.5 text-brand" />
                        <span>Porównaj scenariusze ({validSelectedScenarioIds.length} / 2)</span>
                      </button>

                      <button
                        type="button"
                        id="btn-save-scenario"
                        onClick={() => handleOpenSaveScenarioModal()}
                        disabled={savedScenarios.length >= 5}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand/30 bg-brand-subtle text-brand text-xs font-bold hover:bg-brand hover:text-text-inverse transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shadow-2xs"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Zapisz bieżący plan</span>
                      </button>
                    </div>
                  </div>

                  {savedScenarios.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                      {savedScenarios.map((sc) => {
                        const isSelected = validSelectedScenarioIds.includes(sc.id);
                        const strategyLabel =
                          sc.strategy === "avalanche"
                            ? "Lawina"
                            : sc.strategy === "snowball"
                            ? "Kula Śnieżna"
                            : sc.strategy === "custom"
                            ? "Własna kolejność"
                            : "Status Quo";

                        return (
                          <div
                            key={sc.id}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition shadow-2xs ${
                              isSelected
                                ? "bg-brand-subtle/20 border-brand ring-1 ring-brand/30"
                                : "bg-surface border-border hover:border-brand/30"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!isSelected && validSelectedScenarioIds.length >= 2}
                                onChange={() => handleToggleSelectScenario(sc.id)}
                                aria-label={`Wybierz scenariusz ${sc.name} do porównania`}
                                className="w-4 h-4 rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                                title={
                                  !isSelected && validSelectedScenarioIds.length >= 2
                                    ? "Możesz wybrać maksymalnie 2 scenariusze"
                                    : undefined
                                }
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-xs font-bold text-text-main truncate" title={sc.name}>
                                    {sc.name}
                                  </span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-2 text-text-muted border border-border shrink-0">
                                    {strategyLabel}
                                  </span>
                                </div>
                                <div className="text-[11px] text-text-muted">
                                  Nadpłata: <strong className="text-brand font-bold tabular-nums">+{formatMoney(sc.extraMonthlyPayment, currency)} / mc</strong>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleLoadScenario(sc)}
                                aria-label={`Wczytaj scenariusz ${sc.name}`}
                                className="px-2.5 py-1.5 rounded-lg bg-surface-2 hover:bg-brand hover:text-text-inverse text-text-main text-[11px] font-bold border border-border hover:border-brand transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                              >
                                Wczytaj
                              </button>
                              {onDeletePayoffScenario && (
                                <button
                                  type="button"
                                  onClick={() => onDeletePayoffScenario(sc.id)}
                                  aria-label={`Usuń scenariusz ${sc.name}`}
                                  className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-subtle transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                                  title="Usuń scenariusz"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-text-muted">
                      Brak zapisanych scenariuszy. Możesz zapisać do 5 wariantów nadpłat i strategii, aby łatwo je odtwarzać.
                    </p>
                  )}
                </div>
              </div>

              {/* 4 Strategy Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Avalanche */}
                <div
                  onClick={() => setSelectedPayoffStrategy("avalanche")}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all cursor-pointer ${
                    selectedPayoffStrategy === "avalanche"
                      ? "bg-brand-subtle/50 border-brand shadow-md ring-2 ring-brand/20"
                      : "bg-surface border-border hover:border-brand/40"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-surface text-text-main border border-border">
                        {payoffComparison.avalanche.strategyBadge}
                      </span>
                      {payoffComparison.recommendedStrategy === "avalanche" && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-brand text-text-inverse">
                          Rekomendacja
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-text-main mt-2 mb-1">
                      {payoffComparison.avalanche.strategyLabel}
                    </h4>
                    <p className="text-xs text-text-muted mb-4 leading-relaxed">
                      {payoffComparison.avalanche.strategyDescription}
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-border/50 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-faint">Wolność od długu:</span>
                      <span className="font-bold text-text-main">{payoffComparison.avalanche.debtFreeDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-faint">Zaoszczędzone odsetki:</span>
                      <span className="font-bold text-brand">
                        +{formatMoney(payoffComparison.avalanche.interestSavedVsBaseline, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-faint">Zaoszczędzony czas:</span>
                      <span className="font-bold text-success">
                        {payoffComparison.avalanche.monthsSavedVsBaseline > 0
                          ? `-${payoffComparison.avalanche.monthsSavedVsBaseline} mies. (~${Math.round((payoffComparison.avalanche.monthsSavedVsBaseline / 12) * 10) / 10} lat)`
                          : "0 mies."}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Snowball */}
                <div
                  onClick={() => setSelectedPayoffStrategy("snowball")}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all cursor-pointer ${
                    selectedPayoffStrategy === "snowball"
                      ? "bg-brand-subtle/50 border-brand shadow-md ring-2 ring-brand/20"
                      : "bg-surface border-border hover:border-brand/40"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-surface text-text-main border border-border">
                        {payoffComparison.snowball.strategyBadge}
                      </span>
                      {payoffComparison.recommendedStrategy === "snowball" && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-brand text-text-inverse">
                          Rekomendacja
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-text-main mt-2 mb-1">
                      {payoffComparison.snowball.strategyLabel}
                    </h4>
                    <p className="text-xs text-text-muted mb-4 leading-relaxed">
                      {payoffComparison.snowball.strategyDescription}
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-border/50 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-faint">Wolność od długu:</span>
                      <span className="font-bold text-text-main">{payoffComparison.snowball.debtFreeDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-faint">Zaoszczędzone odsetki:</span>
                      <span className="font-bold text-brand">
                        +{formatMoney(payoffComparison.snowball.interestSavedVsBaseline, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-faint">Zaoszczędzony czas:</span>
                      <span className="font-bold text-success">
                        {payoffComparison.snowball.monthsSavedVsBaseline > 0
                          ? `-${payoffComparison.snowball.monthsSavedVsBaseline} mies. (~${Math.round((payoffComparison.snowball.monthsSavedVsBaseline / 12) * 10) / 10} lat)`
                          : "0 mies."}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Custom */}
                {payoffComparison.custom && (
                  <div
                    onClick={() => setSelectedPayoffStrategy("custom")}
                    className={`p-5 rounded-2xl border flex flex-col justify-between transition-all cursor-pointer ${
                      selectedPayoffStrategy === "custom"
                        ? "bg-brand-subtle/50 border-brand shadow-md ring-2 ring-brand/20"
                        : "bg-surface border-border hover:border-brand/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-surface text-text-main border border-border">
                          {payoffComparison.custom.strategyBadge}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-text-main mt-2 mb-1">
                        {payoffComparison.custom.strategyLabel}
                      </h4>
                      <p className="text-xs text-text-muted mb-4 leading-relaxed">
                        Elastyczna — samodzielnie ustalasz priorytety spłaty. Cała nadwyżka budżetowa trafia na cel nr 1, a po jego zamknięciu uwolniona rata zasila kolejne pozycje.
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-border/50 text-xs">
                      <div className="flex justify-between">
                        <span className="text-text-faint">Wolność od długu:</span>
                        <span className="font-bold text-text-main">{payoffComparison.custom.debtFreeDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-faint">Zaoszczędzone odsetki:</span>
                        <span className="font-bold text-brand">
                          +{formatMoney(payoffComparison.custom.interestSavedVsBaseline, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-faint">Zaoszczędzony czas:</span>
                        <span className="font-bold text-success">
                          {payoffComparison.custom.monthsSavedVsBaseline > 0
                            ? `-${payoffComparison.custom.monthsSavedVsBaseline} mies. (~${Math.round((payoffComparison.custom.monthsSavedVsBaseline / 12) * 10) / 10} lat)`
                            : "0 mies."}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Baseline */}
                <div
                  onClick={() => setSelectedPayoffStrategy("baseline")}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all cursor-pointer ${
                    selectedPayoffStrategy === "baseline"
                      ? "bg-brand-subtle/50 border-brand shadow-md ring-2 ring-brand/20"
                      : "bg-surface border-border hover:border-brand/40"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-surface text-text-main border border-border">
                        {payoffComparison.baseline.strategyBadge}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-text-main mt-2 mb-1">
                      {payoffComparison.baseline.strategyLabel}
                    </h4>
                    <p className="text-xs text-text-muted mb-4 leading-relaxed">
                      {payoffComparison.baseline.strategyDescription}
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-border/50 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-faint">Wolność od długu:</span>
                      <span className="font-bold text-text-main">{payoffComparison.baseline.debtFreeDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-faint">Łączny koszt odsetek:</span>
                      <span className="font-bold text-text-muted">
                        {formatMoney(payoffComparison.baseline.totalInterestPaid, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-faint">Oszczędność:</span>
                      <span className="font-medium text-text-muted">0 zł (brak nadpłat)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sprint 8: Payoff Strategies Knowledge Center (Explainer Hub) */}
              <PayoffStrategiesKnowledgeCenter />

              {/* Custom Order Reorder Panel */}
              {selectedPayoffStrategy === "custom" && activeDebts.length > 0 && (
                <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-text-main flex items-center gap-2">
                        <span>Ustal kolejność spłaty</span>
                        <span className="text-[11px] font-normal text-text-muted">
                          (priorytetyzacja nadpłat)
                        </span>
                      </h4>
                      <p className="text-xs text-text-muted mt-0.5">
                        Ustaw kolejność, w jakiej nadwyżka budżetowa będzie likwidować poszczególne zobowiązania. Zmiana pozycji natychmiast aktualizuje poniższy harmonogram.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-text-faint whitespace-nowrap">
                      Liczba aktywnych celów: {activeDebts.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {validatedCustomOrder.map((id, index) => {
                      const debtItem = activeDebts.find((d) => d.id === id);
                      if (!debtItem) return null;
                      const isFirst = index === 0;
                      const isLast = index === validatedCustomOrder.length - 1;
                      const totalCount = validatedCustomOrder.length;

                      return (
                        <div
                          key={id}
                          className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isFirst
                              ? "bg-brand-subtle/30 border-brand/40 shadow-xs ring-1 ring-brand/20"
                              : "bg-surface-2/40 border-border/80 hover:border-border"
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                            <div
                              className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center shrink-0 ${
                                isFirst
                                  ? "bg-brand text-text-inverse shadow-2xs"
                                  : "bg-surface border border-border text-text-muted"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center flex-wrap gap-2 mb-0.5">
                                <span className="text-xs font-bold text-text-main truncate">
                                  {debtItem.name}
                                </span>
                                <span className="text-[11px] text-text-muted shrink-0">
                                  ({debtItem.institution})
                                </span>
                                {isFirst && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-brand text-text-inverse shrink-0 shadow-2xs">
                                    Cel priorytetowy #1
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-text-muted flex items-center flex-wrap gap-x-2.5 gap-y-0.5 mt-1">
                                <span>Saldo: <strong className="text-text-main font-semibold tabular-nums">{formatMoney(debtItem.balance, currency)}</strong></span>
                                <span>•</span>
                                <span>Oprocentowanie: <strong className="text-brand font-bold tabular-nums">{debtItem.interestRate.toFixed(2)}% APR</strong></span>
                                <span>•</span>
                                <span>Rata: <strong className="text-text-main font-semibold tabular-nums">{formatMoney(debtItem.monthlyPayment, currency)}</strong></span>
                              </div>
                              {isFirst && (
                                <p className="text-[10px] text-brand font-medium mt-1">
                                  To zobowiązanie otrzymuje całą nadwyżkę nadpłaty do czasu pełnej spłaty.
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Move Up / Down Buttons with WCAG Touch Target */}
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto justify-end">
                            <button
                              type="button"
                              onClick={() => handleMoveDebtUp(id)}
                              disabled={isFirst}
                              aria-label={`Przenieś zobowiązanie ${debtItem.name} wyżej (obecnie pozycja ${index + 1} z ${totalCount})`}
                              className="p-2 sm:px-3 sm:py-2 min-h-[40px] min-w-[40px] rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-hidden disabled:opacity-25 disabled:cursor-not-allowed disabled:pointer-events-none disabled:bg-surface-2 bg-surface hover:bg-surface-hover hover:border-brand/40 text-text-main active:scale-95 cursor-pointer shadow-2xs"
                              title="Przenieś wyżej"
                            >
                              <ArrowUp className="w-4 h-4" />
                              <span className="hidden sm:inline text-[11px]">Przenieś wyżej</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveDebtDown(id)}
                              disabled={isLast}
                              aria-label={`Przenieś zobowiązanie ${debtItem.name} niżej (obecnie pozycja ${index + 1} z ${totalCount})`}
                              className="p-2 sm:px-3 sm:py-2 min-h-[40px] min-w-[40px] rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-hidden disabled:opacity-25 disabled:cursor-not-allowed disabled:pointer-events-none disabled:bg-surface-2 bg-surface hover:bg-surface-hover hover:border-brand/40 text-text-main active:scale-95 cursor-pointer shadow-2xs"
                              title="Przenieś niżej"
                            >
                              <ArrowDown className="w-4 h-4" />
                              <span className="hidden sm:inline text-[11px]">Przenieś niżej</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[11px] text-text-muted bg-surface-2/60 p-3.5 rounded-xl border border-border/60 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Zasada działania:</strong> Nadwyżka budżetowa (oraz raty ze spłaconych wcześniej kredytów) trafia w 100% na cel priorytetowy z pozycji nr 1. Po jego całkowitej spłacie uwolnione środki automatycznie przechodzą na kolejne zobowiązanie.
                    </p>
                  </div>
                </div>
              )}

              {/* Selected Strategy Payoff Timeline & Roadmap */}
              {(() => {
                const activePlan = (selectedPayoffStrategy === "custom" && payoffComparison.custom)
                  ? payoffComparison.custom
                  : payoffComparison[selectedPayoffStrategy] || payoffComparison.baseline;
                return (
                  <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-text-main">
                            Plan i kolejność spłaty: {activePlan.strategyLabel}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-subtle text-brand border border-brand/30">
                            {activePlan.strategyBadge}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          Harmonogram zamknięcia poszczególnych zobowiązań przy zadeklarowanym budżecie {formatMoney(activePlan.totalMonthlyCommitment, currency)} / mc.
                        </p>
                      </div>
                    </div>

                    {/* 3 Summary KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 bg-surface-2/60 rounded-xl border border-border">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                          Data spłaty całego długu
                        </span>
                        <span className="text-lg sm:text-xl font-black text-text-main tabular-nums block">
                          {activePlan.debtFreeDate}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {activePlan.totalMonths} miesięcy do pełnej wolności
                        </span>
                      </div>

                      <div className="p-4 bg-surface-2/60 rounded-xl border border-border">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                          Zaoszczędzone odsetki
                        </span>
                        <span className="text-lg sm:text-xl font-black text-brand tabular-nums block">
                          +{formatMoney(activePlan.interestSavedVsBaseline, currency)}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          w porównaniu ze spłatą tylko minimalnych rat
                        </span>
                      </div>

                      <div className="p-4 bg-surface-2/60 rounded-xl border border-border">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                          Skrócony czas spłaty
                        </span>
                        <span className="text-lg sm:text-xl font-black text-success tabular-nums block">
                          {activePlan.monthsSavedVsBaseline > 0
                            ? `-${activePlan.monthsSavedVsBaseline} mies.`
                            : "0 mies."}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {activePlan.monthsSavedVsBaseline > 0
                            ? `o ${Math.round((activePlan.monthsSavedVsBaseline / 12) * 10) / 10} lat szybciej bez długu`
                            : "standardowy harmonogram"}
                        </span>
                      </div>
                    </div>

                    {/* Step-by-Step Roadmap Queue */}
                    <div className="space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-text-faint block">
                        Kolejność likwidacji kredytów ({activePlan.payoffQueue.length})
                      </span>

                      <div className="space-y-3">
                        {activePlan.payoffQueue.map((item, idx) => (
                          <div
                            key={item.debtId}
                            className="p-4 bg-surface-2/30 rounded-xl border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-brand text-text-inverse text-xs font-black flex items-center justify-center shrink-0">
                                {idx + 1}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-text-main">{item.debtName}</span>
                                  <span className="text-[10px] text-text-muted">({item.institution})</span>
                                </div>
                                <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
                                  <span>Saldo początkowe: {formatMoney(item.initialBalance, currency)}</span>
                                  <span>•</span>
                                  <span className="font-bold text-brand tabular-nums">{item.interestRate.toFixed(2)}% APR</span>
                                  <span>•</span>
                                  <span>Rata: {formatMoney(item.monthlyPayment, currency)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50">
                              <span className="text-xs font-black text-text-main block">
                                Spłata: {item.payoffDate}
                              </span>
                              <span className="text-[10px] text-text-muted">
                                ({item.payoffMonth}. miesiąc • odsetki: {formatMoney(item.totalInterestPaid, currency)})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {activePlan.strategy !== "baseline" && activePlan.payoffQueue.length > 1 && (
                        <div className="p-3.5 bg-brand-subtle/30 rounded-xl border border-brand/20 text-xs text-text-main leading-relaxed flex items-start gap-2.5">
                          <Sparkles className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                          <p>
                            <strong>Efekt kaskadowy (Roll):</strong> Po spłaceniu każdego kredytu z listy, cała kwota jego dotychczasowej raty nie wraca do konsumpcji, lecz automatycznie zasila nadpłatę kolejnego zobowiązania, wykładniczo przyspieszając kolejne spłaty.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Disclaimer */}
              <div className="text-xs text-text-muted flex items-start gap-2 bg-surface p-3.5 rounded-xl border border-border">
                <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <p>
                  <strong>Zastrzeżenie:</strong> Symulacja zakłada stałość stóp procentowych, regularne dokonywanie minimalnych spłat oraz przeznaczanie zadeklarowanej nadpłaty w każdym miesiącu na priorytetowe zobowiązanie. Nie uwzględnia zaciągania nowego zadłużenia w trakcie trwania planu.
                </p>
              </div>
            </>
          )}
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
                Porównaj swoje obecne kredyty z ofertami innych banków i sprawdź punkt zwrotu kosztów przejścia.
              </p>
            </div>
            {debts.length > 0 && (
              <button
                onClick={() => {
                  const candidate = analytics.refinanceCandidates[0]?.debt || debts.find(d => d.type === "mortgage") || debts[0];
                  setSelectedDebtForRefinance(candidate);
                }}
                className="px-4 py-2.5 bg-brand text-text-inverse text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-[0.98] transition cursor-pointer self-start sm:self-auto shrink-0 shadow-xs flex items-center gap-1.5"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Uruchom kalkulator porównawczy</span>
              </button>
            )}
          </div>

          {/* Refinance Candidates List */}
          {analytics.refinanceCandidates.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-text-faint block">
                Zidentyfikowani kandydaci do weryfikacji refinansowania ({analytics.refinanceCandidates.length})
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analytics.refinanceCandidates.map((cand) => (
                  <div key={cand.debt.id} className="p-4 bg-surface rounded-2xl border border-brand/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-text-main">{cand.debt.name}</span>
                        <span className="text-xs font-black text-brand tabular-nums">{cand.debt.interestRate.toFixed(2)}%</span>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed mb-3">{cand.reason}</p>
                    </div>
                    <button
                      onClick={() => setSelectedDebtForRefinance(cand.debt)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-hover cursor-pointer"
                    >
                      <span>Przelicz refinansowanie</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          debt={selectedDebtForRefinance}
          onClose={() => setSelectedDebtForRefinance(null)}
        />
      )}

      {/* MODAL 5: SAVE SCENARIO */}
      {isSaveScenarioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="bg-surface border border-border rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-scenario-modal-title"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand flex items-center justify-center">
                  <Bookmark className="w-4 h-4" />
                </div>
                <h3 id="save-scenario-modal-title" className="text-base font-bold text-text-main">
                  Zapisz scenariusz spłaty
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveScenarioModalOpen(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 transition cursor-pointer"
                aria-label="Zamknij"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveScenarioSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5">
                  Nazwa scenariusza
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={scenarioNameInput}
                  onChange={(e) => setScenarioNameInput(e.target.value)}
                  placeholder="np. Wariant optymistyczny 750 zł"
                  className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring"
                  autoFocus
                />
              </div>

              {/* Summary of current parameters */}
              <div className="p-3 bg-surface-2/60 rounded-xl border border-border/80 text-xs space-y-1.5 text-text-muted">
                <div className="flex justify-between">
                  <span>Wybrana metoda:</span>
                  <strong className="text-text-main">
                    {selectedPayoffStrategy === "avalanche"
                      ? "Metoda Lawiny"
                      : selectedPayoffStrategy === "snowball"
                      ? "Metoda Kuli Śnieżnej"
                      : selectedPayoffStrategy === "custom"
                      ? "Własna kolejność"
                      : "Status Quo"}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Miesięczna nadpłata:</span>
                  <strong className="text-brand font-bold tabular-nums">
                    +{formatMoney(extraMonthlyPayoff, currency)} / mc
                  </strong>
                </div>
                {selectedPayoffStrategy === "custom" && (
                  <div className="flex justify-between">
                    <span>Liczba celów w kolejce:</span>
                    <strong className="text-text-main">{validatedCustomOrder.length}</strong>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveScenarioModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text-main hover:bg-surface-2 transition cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={scenarioNameInput.trim().length < 2}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand text-text-inverse hover:bg-brand-hover transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  Zapisz scenariusz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: COMPARE SCENARIOS */}
      <PayoffScenarioComparisonModal
        isOpen={isCompareScenariosModalOpen}
        onClose={() => setIsCompareScenariosModalOpen(false)}
        scenarios={savedScenarios.filter((s) => validSelectedScenarioIds.includes(s.id))}
        activeDebts={activeDebts}
        currency={currency}
        onLoadScenario={handleLoadScenario}
      />
    </div>
  );
}
