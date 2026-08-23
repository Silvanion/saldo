import React, { useState, useMemo, useEffect } from "react";
import { DebtItem, DebtType, Profile, DebtPayoffScenario, Transaction } from "../../types";
import {
  calculatePortfolioDebtKpis,
  calculateDebtPortfolioAnalytics,
  calculatePortfolioPayoffStrategies,
  buildValidatedCustomOrder,
  DebtPayoffStrategyType
} from "../../services/debtCalculations";
import {
  DebtPortfolioCard,
  calculateDebtRepaymentProgress,
  getNewlyCrossedDebtMilestone,
  calculateNextDebtMilestoneForecast,
  formatMilestoneForecastDate
} from "./DebtPortfolioCard";
import {
  DebtDetailsModal,
  DebtDetailTab,
  DebtPaymentHistorySessionFilters,
  DEFAULT_DEBT_PAYMENT_HISTORY_FILTERS
} from "./DebtDetailsModal";
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
  Edit3,
  Copy,
  X
} from "lucide-react";

export interface DebtsViewProps {
  profile?: Profile;
  initialDebtId?: string;
  initialDebtTab?: DebtDetailTab;
  onClearInitialDebt?: () => void;
  onAddDebt?: (debt: Omit<DebtItem, "id" | "createdAt">) => void;
  onUpdateDebt?: (debtId: string, updates: Partial<DebtItem>) => void;
  onDeleteDebt?: (debtId: string) => void;
  onToggleDebtStatus?: (debtId: string) => void;
  onSavePayoffScenario?: (scenario: Omit<DebtPayoffScenario, "id" | "createdAt"> & { id?: string }) => void;
  onDeletePayoffScenario?: (scenarioId: string) => void;
  onUpdateTransaction?: (id: string, updates: Partial<Transaction>) => void;
  onOpenTxModal?: (tx: Transaction) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export interface PortfolioNearestMilestoneCandidate {
  debt: DebtItem;
  nextMilestone: number;
  estimatedMonthCount: number;
  estimatedDate: string;
  repaidPercent: number;
}

export function findPortfolioNearestMilestone(
  debts: DebtItem[] | undefined | null
): PortfolioNearestMilestoneCandidate | null {
  if (!debts || debts.length === 0) return null;

  const candidates: PortfolioNearestMilestoneCandidate[] = [];

  for (const debt of debts) {
    if (!debt || debt.status === "closed") continue;
    if (debt.type === "credit_card" || debt.type === "revolving") continue;

    const progress = calculateDebtRepaymentProgress(debt);
    if (!progress.hasUsableReferenceAmount || progress.isComplete) continue;

    const forecast = calculateNextDebtMilestoneForecast(debt);
    if (!forecast) continue;

    candidates.push({
      debt,
      nextMilestone: forecast.nextMilestone,
      estimatedMonthCount: forecast.estimatedMonthCount,
      estimatedDate: forecast.estimatedDate,
      repaidPercent: progress.repaidPercent
    });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    // 1. Smallest forecast distance (in months)
    if (a.estimatedMonthCount !== b.estimatedMonthCount) {
      return a.estimatedMonthCount - b.estimatedMonthCount;
    }
    // 2. Highest current progress percentage
    if (b.repaidPercent !== a.repaidPercent) {
      return b.repaidPercent - a.repaidPercent;
    }
    // 3. Deterministic debt identity/name
    return a.debt.name.localeCompare(b.debt.name);
  });

  return candidates[0];
}

export function formatMonthCountPlural(months: number): string {
  if (months === 1) return "za około 1 miesiąc";
  const mod10 = months % 10;
  const mod100 = months % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `za około ${months} miesiące`;
  }
  return `za około ${months} miesięcy`;
}

export function sortDebtsByNearestMilestone(debts: DebtItem[]): DebtItem[] {
  if (!debts || debts.length === 0) return [];
  const items = [...debts];

  const decorated = items.map((debt, index) => {
    const isClosed = debt.status === "closed";
    const isRevolving = debt.type === "credit_card" || debt.type === "revolving";
    const progress = calculateDebtRepaymentProgress(debt);
    const isEligible = !isClosed && !isRevolving && progress.hasUsableReferenceAmount && !progress.isComplete;
    const forecast = isEligible ? calculateNextDebtMilestoneForecast(debt) : null;

    return {
      debt,
      index,
      hasValidForecast: forecast !== null,
      estimatedMonthCount: forecast?.estimatedMonthCount ?? null,
      repaidPercent: progress.repaidPercent
    };
  });

  decorated.sort((a, b) => {
    // 1. Forecastable eligible debts come first
    if (a.hasValidForecast && !b.hasValidForecast) return -1;
    if (!a.hasValidForecast && b.hasValidForecast) return 1;

    // 2. Both forecastable
    if (a.hasValidForecast && b.hasValidForecast) {
      if (a.estimatedMonthCount !== b.estimatedMonthCount) {
        return (a.estimatedMonthCount ?? 0) - (b.estimatedMonthCount ?? 0);
      }
      if (b.repaidPercent !== a.repaidPercent) {
        return b.repaidPercent - a.repaidPercent;
      }
      const nameCompare = a.debt.name.localeCompare(b.debt.name);
      if (nameCompare !== 0) return nameCompare;
      return a.debt.id.localeCompare(b.debt.id);
    }

    // 3. Neither forecastable -> preserve original relative order
    return a.index - b.index;
  });

  return decorated.map((d) => d.debt);
}

type MainTab = "portfolio" | "scenarios" | "offers" | "knowledge";
type FilterType = "all" | "mortgage" | "cash_loan" | "cards_and_limits" | "bnpl" | "other" | "closed";
export type SortOption = "apr" | "payment" | "cost" | "payoff_date" | "balance" | "nearest_milestone";

export function DebtsView({
  profile,
  initialDebtId,
  initialDebtTab,
  onClearInitialDebt,
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
  onToggleDebtStatus,
  onSavePayoffScenario,
  onDeletePayoffScenario,
  onUpdateTransaction,
  onOpenTxModal,
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
  const [overpaymentInitialAmount, setOverpaymentInitialAmount] = useState<number | undefined>(undefined);
  const [selectedDebtForRefinance, setSelectedDebtForRefinance] = useState<DebtItem | null>(null);

  // SPRINT 39: Per-debt in-memory payment history filter preset / session persistence
  const [historySessionFiltersByDebt, setHistorySessionFiltersByDebt] = useState<
    Record<string, DebtPaymentHistorySessionFilters>
  >({});

  // SPRINT 36: Deep-link context router to auto-open debt details
  useEffect(() => {
    if (!initialDebtId || !profile?.debts) return;
    const targetDebt = profile.debts.find((d) => d.id === initialDebtId);
    if (targetDebt) {
      setSelectedDebtForDetails(targetDebt);
      if (initialDebtTab) {
        setInitialDetailsTab(initialDebtTab);
      }
    } else if (showToast) {
      showToast("Nie znaleziono powiązanego zobowiązania.", "info");
    }
    onClearInitialDebt?.();
  }, [initialDebtId, initialDebtTab, profile?.debts, onClearInitialDebt, showToast]);

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

  // Sprint 10: Scenario Rename & Duplicate state
  const [renameModalScenario, setRenameModalScenario] = useState<DebtPayoffScenario | null>(null);
  const [renameScenarioInput, setRenameScenarioInput] = useState("");

  const [duplicateModalScenario, setDuplicateModalScenario] = useState<DebtPayoffScenario | null>(null);
  const [duplicateScenarioInput, setDuplicateScenarioInput] = useState("");

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

  // Sprint 13: Calculate portfolio payoff progress
  const portfolioProgress = useMemo(() => {
    let totalOriginal = 0;
    let totalCurrent = 0;
    debts.forEach((d) => {
      const orig = Number(d.originalAmount) || Number(d.creditLimit) || Number(d.balance) || 0;
      totalOriginal += orig;
      totalCurrent += Number(d.balance) || 0;
    });
    const paidPct =
      totalOriginal > 0
        ? Math.max(0, Math.min(100, ((totalOriginal - totalCurrent) / totalOriginal) * 100))
        : 0;
    return {
      totalOriginal,
      totalCurrent,
      paidPct
    };
  }, [debts]);

  // SPRINT 45: Portfolio Nearest Milestone Hero Card Candidate
  const nearestMilestoneCandidate = useMemo(() => {
    return findPortfolioNearestMilestone(debts);
  }, [debts]);

  // Sprint 4 & 5: Portfolio Payoff Strategy Simulator (including Custom Order)
  const [extraMonthlyPayoff, setExtraMonthlyPayoff] = useState<number>(500);
  const [selectedPayoffStrategy, setSelectedPayoffStrategy] = useState<DebtPayoffStrategyType>("avalanche");
  const [customDebtOrder, setCustomDebtOrder] = useState<string[]>([]);

  // Sprint 14: What-If simulation parameters (Transient local state)
  const [oneTimeOverpayment, setOneTimeOverpayment] = useState<number>(0);
  const [previewStrategy, setPreviewStrategy] = useState<DebtPayoffStrategyType | null>(null);
  const [isWhatIfExpanded, setIsWhatIfExpanded] = useState<boolean>(false);

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
    setOneTimeOverpayment(0);
    setPreviewStrategy(null);
    setCustomDebtOrder(
      scenario.strategy === "custom" && scenario.customDebtOrder?.length
        ? scenario.customDebtOrder
        : []
    );

    showToast?.(`Wczytano scenariusz: ${scenario.name}`, "info");
  };

  const handleOpenRenameModal = (scenario: DebtPayoffScenario) => {
    setRenameModalScenario(scenario);
    setRenameScenarioInput(scenario.name);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = renameScenarioInput.trim();
    if (!trimmed || trimmed.length < 2 || !renameModalScenario) return;

    if (onSavePayoffScenario) {
      onSavePayoffScenario({
        ...renameModalScenario,
        name: trimmed
      });
    }

    setRenameModalScenario(null);
    setRenameScenarioInput("");
  };

  const handleOpenDuplicateModal = (scenario: DebtPayoffScenario) => {
    if (savedScenarios.length >= 5) {
      showToast?.("Osiągnięto limit 5 zapisanych scenariuszy", "error");
      return;
    }
    setDuplicateModalScenario(scenario);
    setDuplicateScenarioInput(`${scenario.name} — kopia`);
  };

  const handleDuplicateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = duplicateScenarioInput.trim();
    if (!trimmed || trimmed.length < 2 || !duplicateModalScenario) return;

    if (savedScenarios.length >= 5) {
      showToast?.("Osiągnięto limit 5 zapisanych scenariuszy", "error");
      setDuplicateModalScenario(null);
      return;
    }

    if (onSavePayoffScenario) {
      onSavePayoffScenario({
        name: trimmed,
        strategy: duplicateModalScenario.strategy,
        extraMonthlyPayment: duplicateModalScenario.extraMonthlyPayment,
        customDebtOrder: duplicateModalScenario.customDebtOrder
      });
    }

    setDuplicateModalScenario(null);
    setDuplicateScenarioInput("");
  };

  const payoffComparison = useMemo(() => {
    return calculatePortfolioPayoffStrategies(
      debts,
      extraMonthlyPayoff,
      undefined,
      validatedCustomOrder,
      oneTimeOverpayment
    );
  }, [debts, extraMonthlyPayoff, validatedCustomOrder, oneTimeOverpayment]);

  const basePayoffComparison = useMemo(() => {
    return calculatePortfolioPayoffStrategies(
      debts,
      extraMonthlyPayoff,
      undefined,
      validatedCustomOrder,
      0
    );
  }, [debts, extraMonthlyPayoff, validatedCustomOrder]);

  // Filter and sort debts
  const filteredDebts = useMemo(() => {
    let list = [...debts];

    if (selectedFilter === "closed") {
      list = list.filter((d) => d.status === "closed");
    } else if (selectedFilter === "mortgage") {
      list = list.filter((d) => d.type === "mortgage" && d.status !== "closed");
    } else if (selectedFilter === "cash_loan") {
      list = list.filter((d) => d.type === "cash_loan" && d.status !== "closed");
    } else if (selectedFilter === "cards_and_limits") {
      list = list.filter((d) => (d.type === "credit_card" || d.type === "revolving") && d.status !== "closed");
    } else if (selectedFilter === "bnpl") {
      list = list.filter((d) => d.type === "bnpl" && d.status !== "closed");
    } else if (selectedFilter === "other") {
      list = list.filter((d) => d.type === "other" && d.status !== "closed");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.institution.toLowerCase().includes(q)
      );
    }

    if (sortBy === "nearest_milestone") {
      return sortDebtsByNearestMilestone(list);
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
      const prevProgress = calculateDebtRepaymentProgress(debtToEdit);
      const updatedDebt: DebtItem = { ...debtToEdit, ...data };
      const newProgress = calculateDebtRepaymentProgress(updatedDebt);
      const milestone = getNewlyCrossedDebtMilestone(prevProgress, newProgress);

      onUpdateDebt?.(debtToEdit.id, data);
      setIsFormModalOpen(false);
      setDebtToEdit(null);

      if (milestone) {
        if (milestone === 100) {
          showToast?.("Dług spłacony — gratulacje!", "success");
        } else {
          showToast?.(`Osiągnięto ${milestone}% spłaty długu.`, "success");
        }
      }
    } else {
      onAddDebt?.(data);
      setIsFormModalOpen(false);
    }
  };

  const handleToggleDebtStatus = (debtId: string) => {
    const debt = profile?.debts?.find((d) => d.id === debtId);
    if (debt) {
      const prevProgress = calculateDebtRepaymentProgress(debt);
      const nextStatus = debt.status === "active" ? "closed" : "active";
      const updatedDebt: DebtItem = {
        ...debt,
        status: nextStatus,
        balance: nextStatus === "closed" ? 0 : debt.balance
      };
      const newProgress = calculateDebtRepaymentProgress(updatedDebt);
      const milestone = getNewlyCrossedDebtMilestone(prevProgress, newProgress);

      onToggleDebtStatus?.(debtId);

      if (milestone) {
        if (milestone === 100) {
          showToast?.("Dług spłacony — gratulacje!", "success");
        } else {
          showToast?.(`Osiągnięto ${milestone}% spłaty długu.`, "success");
        }
      }
    } else {
      onToggleDebtStatus?.(debtId);
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

      {/* 2AA. SPRINT 13: PAYOFF PROGRESS SUMMARY */}
      {debts.length > 0 && portfolioProgress.totalOriginal > 0 && (
        <div className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3" id="debt-payoff-progress-block">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-brand" />
              <h3 className="text-sm font-bold text-text-main">
                Postęp spłaty portfela zadłużenia
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
              <span>Spłacono:</span>
              <span className="text-brand font-black text-sm tabular-nums">
                {portfolioProgress.paidPct.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="w-full h-2.5 bg-surface-2 rounded-full overflow-hidden border border-border/50">
            <div
              className="h-full bg-brand transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, portfolioProgress.paidPct))}%` }}
              role="progressbar"
              aria-valuenow={Math.round(portfolioProgress.paidPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Procent spłaconego zadłużenia"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs text-text-muted">
            <div>
              <span className="text-text-faint text-[11px] block">Saldo początkowe:</span>
              <strong className="text-text-main font-bold tabular-nums">
                {formatMoney(portfolioProgress.totalOriginal, currency)}
              </strong>
            </div>
            <div>
              <span className="text-text-faint text-[11px] block">Aktualne saldo:</span>
              <strong className="text-brand font-bold tabular-nums">
                {formatMoney(portfolioProgress.totalCurrent, currency)}
              </strong>
            </div>
            <div>
              <span className="text-text-faint text-[11px] block">Czynne umowy:</span>
              <strong className="text-text-main font-bold">
                {kpiData.activeCount}
              </strong>
            </div>
            <div>
              <span className="text-text-faint text-[11px] block">Spłacone umowy:</span>
              <strong className="text-success font-bold">
                {kpiData.closedCount}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* 2AB. SPRINT 45: PORTFOLIO NEAREST MILESTONE HERO CARD */}
      {nearestMilestoneCandidate && (
        <div
          className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          id="portfolio-nearest-milestone-card"
        >
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block">
                Najbliższy kamień milowy
              </span>
              <h4 className="text-sm sm:text-base font-bold text-text-main truncate mt-0.5" title={nearestMilestoneCandidate.debt.name}>
                {nearestMilestoneCandidate.debt.name}
              </h4>
              <p className="text-xs text-text-muted mt-0.5">
                Osiągnie <strong className="text-text-main">{nearestMilestoneCandidate.nextMilestone}%</strong> spłaty {formatMonthCountPlural(nearestMilestoneCandidate.estimatedMonthCount)} (szac. {formatMilestoneForecastDate(nearestMilestoneCandidate.estimatedDate)})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-brand-subtle text-brand border border-brand/20">
              Cel: {nearestMilestoneCandidate.nextMilestone}%
            </span>
          </div>
        </div>
      )}

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
                onClick={() => setSelectedFilter("mortgage")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedFilter === "mortgage"
                    ? "bg-brand-subtle text-brand border border-brand/20"
                    : "text-text-muted hover:text-text-main hover:bg-surface-2"
                }`}
              >
                Hipoteka ({debts.filter((d) => d.type === "mortgage" && d.status !== "closed").length})
              </button>

              <button
                onClick={() => setSelectedFilter("cash_loan")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedFilter === "cash_loan"
                    ? "bg-brand-subtle text-brand border border-brand/20"
                    : "text-text-muted hover:text-text-main hover:bg-surface-2"
                }`}
              >
                Kredyty gotówkowe ({debts.filter((d) => d.type === "cash_loan" && d.status !== "closed").length})
              </button>

              <button
                onClick={() => setSelectedFilter("cards_and_limits")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedFilter === "cards_and_limits"
                    ? "bg-brand-subtle text-brand border border-brand/20"
                    : "text-text-muted hover:text-text-main hover:bg-surface-2"
                }`}
              >
                Karty i limity ({debts.filter((d) => (d.type === "credit_card" || d.type === "revolving") && d.status !== "closed").length})
              </button>

              <button
                onClick={() => setSelectedFilter("bnpl")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedFilter === "bnpl"
                    ? "bg-brand-subtle text-brand border border-brand/20"
                    : "text-text-muted hover:text-text-main hover:bg-surface-2"
                }`}
              >
                Ratalne ({debts.filter((d) => d.type === "bnpl" && d.status !== "closed").length})
              </button>

              <button
                onClick={() => setSelectedFilter("other")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedFilter === "other"
                    ? "bg-brand-subtle text-brand border border-brand/20"
                    : "text-text-muted hover:text-text-main hover:bg-surface-2"
                }`}
              >
                Inne ({debts.filter((d) => d.type === "other" && d.status !== "closed").length})
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
                aria-label="Sortuj zobowiązania"
                className="bg-surface-2 border border-border text-xs font-bold text-text-main rounded-xl px-2.5 py-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
              >
                <option value="apr">Najwyższy APR / Koszt</option>
                <option value="nearest_milestone">Najbliżej kolejnego kamienia milowego</option>
                <option value="payment">Wysokość raty</option>
                <option value="balance">Wielkość salda</option>
                <option value="payoff_date">Termin spłaty</option>
              </select>
            </div>
          </div>

          {/* Cards Grid / Empty State */}
          {filteredDebts.length === 0 ? (
            debts.length === 0 ? (
              <div className="text-center py-12 px-6 bg-surface rounded-2xl border border-dashed border-border flex flex-col items-center justify-center space-y-4" id="debts-empty-state">
                <div className="w-16 h-16 rounded-2xl bg-brand-subtle flex items-center justify-center border border-brand/20 shadow-xs text-brand">
                  <Landmark className="w-8 h-8" />
                </div>
                <div className="max-w-md space-y-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-text-main">
                    Zarządzaj całym portfelem zadłużenia w jednym miejscu
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Dodaj swoje kredyty, karty i pożyczki, aby analizować łączne saldo, kontrolować miesięczne raty, symulować strategie spłaty i oszczędności na odsetkach.
                  </p>
                </div>

                {/* Supported Category Badges Preview */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  {[
                    "Kredyt hipoteczny",
                    "Kredyt gotówkowy",
                    "Karty i limity",
                    "Raty 0% / BNPL",
                    "Inne pożyczki"
                  ].map((badge) => (
                    <span
                      key={badge}
                      className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-[11px] font-semibold text-text-muted"
                    >
                      {badge}
                    </span>
                  ))}
                </div>

                <button
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center gap-2 text-xs font-bold text-text-inverse bg-brand hover:bg-brand-hover px-4 py-2.5 rounded-xl active:scale-[0.98] transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                  id="btn-empty-add-debt"
                >
                  <Plus className="w-4 h-4" />
                  <span>Dodaj pierwsze zobowiązanie</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-12 px-6 bg-surface rounded-2xl border border-dashed border-border flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center border border-border text-text-muted">
                  <Landmark className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-text-main">
                  Brak wyników dla wybranych filtrów
                </h3>
                <p className="text-xs text-text-muted max-w-md leading-relaxed">
                  Zmień kryteria filtrowania lub wyszukiwania, aby zobaczyć zobowiązania.
                </p>
                <button
                  onClick={() => {
                    setSelectedFilter("all");
                    setSearchQuery("");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand bg-brand-subtle hover:bg-brand hover:text-text-inverse border border-brand/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                >
                  <span>Wyczyść filtry</span>
                </button>
              </div>
            )
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
                  onToggleStatus={handleToggleDebtStatus}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB CONTENT 2: SCENARIOS & STRATEGIES (Sprint 4 Real Engine) */}
      {activeMainTab === "scenarios" && (
        <div className="space-y-6 animate-fade-in" id="payoff-strategies-container">
          {debts.filter((d) => d.status !== "closed" && d.balance > 0).length === 0 ? (
            debts.length > 0 ? (
              <div className="bg-surface p-8 sm:p-12 rounded-2xl border border-border text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-subtle flex items-center justify-center mb-3.5 border border-brand/20 shadow-xs">
                  <CheckCircle2 className="w-7 h-7 text-brand" />
                </div>
                <h3 className="text-base font-bold text-text-main">
                  Wszystkie zobowiązania zostały już spłacone
                </h3>
                <p className="text-xs text-text-muted max-w-md mt-1.5 mb-5 leading-relaxed">
                  Brak pozostałej kwoty do zasymulowania. Według bieżących danych zobowiązania nie mają już aktywnego salda.
                </p>
              </div>
            ) : (
              <div className="bg-surface p-8 sm:p-12 rounded-2xl border border-dashed border-border text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-subtle flex items-center justify-center mb-3.5 border border-brand/20 shadow-xs">
                  <GitCompare className="w-7 h-7 text-brand" />
                </div>
                <h3 className="text-base font-bold text-text-main">
                  Brak czynnych zobowiązań do symulacji spłaty
                </h3>
                <p className="text-xs text-text-muted max-w-md mt-1.5 mb-5 leading-relaxed">
                  Dodaj zobowiązanie, aby porównać strategie spłaty. Po dodaniu danych będzie można wyświetlić modelową kolejność i terminy spłaty.
                </p>
                <button
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-text-inverse bg-brand hover:bg-brand-hover px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Dodaj zobowiązanie</span>
                </button>
              </div>
            )
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
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label htmlFor="extra-monthly-payoff-input" className="block text-xs font-bold text-text-faint uppercase tracking-wider">
                      Dodatkowy budżet na nadpłatę (ponad minimalne raty)
                    </label>
                    {extraMonthlyPayoff > 0 && (
                      <button
                        type="button"
                        onClick={() => setExtraMonthlyPayoff(0)}
                        className="text-xs font-bold text-text-muted hover:text-brand transition cursor-pointer"
                      >
                        Wyzeruj (0 zł)
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative w-40">
                      <input
                        id="extra-monthly-payoff-input"
                        type="number"
                        min="0"
                        step="50"
                        value={extraMonthlyPayoff === 0 ? "" : extraMonthlyPayoff}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setExtraMonthlyPayoff(isNaN(val) || val < 0 ? 0 : val);
                        }}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-12"
                        placeholder="0"
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

                  {extraMonthlyPayoff === 0 && (
                    <div className="mt-3 p-3 bg-surface-2/60 border border-border/80 rounded-xl text-xs text-text-muted">
                      <p>
                        Przy nadpłacie 0 zł symulacja nie dodaje dodatkowego budżetu do spłaty. Wyniki strategii mogą być takie same lub bardzo zbliżone do planu bazowego.
                      </p>
                    </div>
                  )}
                </div>

                {/* SPRINT 14: WHAT-IF PLANNING PANEL */}
                <div className="pt-3 border-t border-border/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      id="btn-toggle-what-if"
                      onClick={() => setIsWhatIfExpanded(!isWhatIfExpanded)}
                      aria-expanded={isWhatIfExpanded}
                      aria-controls="what-if-planning-panel"
                      className="flex items-center gap-2 text-xs font-bold text-text-main hover:text-brand transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-brand" />
                      <span>Symulacja wariantowa (What-If)</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-subtle text-brand border border-brand/20">
                        {oneTimeOverpayment > 0 || previewStrategy ? "Aktywna symulacja" : "Opcjonalnie"}
                      </span>
                    </button>

                    {(oneTimeOverpayment > 0 || previewStrategy) && (
                      <button
                        type="button"
                        onClick={() => {
                          setOneTimeOverpayment(0);
                          setPreviewStrategy(null);
                        }}
                        className="text-xs font-bold text-text-muted hover:text-danger transition cursor-pointer"
                        aria-label="Zresetuj parametry symulacji What-If"
                      >
                        Zresetuj symulację
                      </button>
                    )}
                  </div>

                  {isWhatIfExpanded && (
                    <div
                      id="what-if-planning-panel"
                      className="p-4 bg-surface-2/50 rounded-xl border border-border space-y-3.5 animate-fade-in text-xs"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* 1. One-time overpayment input */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label
                              htmlFor="one-time-overpayment-input"
                              className="font-bold text-text-faint uppercase text-[10px] tracking-wider"
                            >
                              Jednorazowa nadpłata
                            </label>
                            {oneTimeOverpayment > 0 && (
                              <button
                                type="button"
                                onClick={() => setOneTimeOverpayment(0)}
                                className="text-[11px] font-bold text-text-muted hover:text-brand transition cursor-pointer"
                                aria-label="Wyzeruj jednorazową nadpłatę"
                              >
                                Wyzeruj (0 zł)
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              id="one-time-overpayment-input"
                              type="number"
                              min="0"
                              step="500"
                              value={oneTimeOverpayment === 0 ? "" : oneTimeOverpayment}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setOneTimeOverpayment(isNaN(val) || val < 0 ? 0 : val);
                              }}
                              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-12"
                              placeholder="0"
                            />
                            <span className="absolute right-3 top-2 text-xs text-text-muted font-bold pointer-events-none">
                              {currency}
                            </span>
                          </div>
                          <p className="text-[10px] text-text-faint mt-1">
                            Symulowany jednorazowy zastrzyk gotówki w 1. miesiącu planu.
                          </p>
                        </div>

                        {/* 2. Strategy What-If Switch */}
                        <div>
                          <span className="font-bold text-text-faint uppercase text-[10px] tracking-wider block mb-1.5">
                            Podgląd alternatywnej strategii
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: "avalanche" as const, label: "Lawina" },
                              { id: "snowball" as const, label: "Kula Śnieżna" },
                              { id: "custom" as const, label: "Własna" },
                              { id: "baseline" as const, label: "Status Quo" }
                            ].map((st) => {
                              const isCurrentMain = selectedPayoffStrategy === st.id;
                              const isPreviewActive = previewStrategy === st.id;

                              return (
                                <button
                                  key={st.id}
                                  type="button"
                                  onClick={() => {
                                    if (isPreviewActive) {
                                      setPreviewStrategy(null);
                                    } else {
                                      setPreviewStrategy(st.id);
                                    }
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg font-bold text-xs border transition cursor-pointer text-center ${
                                    isPreviewActive
                                      ? "bg-brand text-text-inverse border-brand shadow-xs"
                                      : isCurrentMain
                                      ? "bg-surface border-brand/50 text-brand ring-1 ring-brand/30"
                                      : "bg-surface text-text-muted hover:text-text-main border-border"
                                  }`}
                                >
                                  {st.label} {isCurrentMain && !isPreviewActive ? "(Bieżąca)" : ""}
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-text-faint mt-1">
                            Kliknij, aby tymczasowo podejrzeć wynik innej metody.
                          </p>
                        </div>
                      </div>

                      {/* 3. Action-oriented What-if Result Summary */}
                      {(oneTimeOverpayment > 0 || previewStrategy) && (
                        <div className="p-3 bg-surface rounded-xl border border-brand/30 space-y-1.5 animate-fade-in" id="what-if-result-summary-box">
                          <div className="flex items-center gap-1.5 font-bold text-text-main text-xs">
                            <Info className="w-3.5 h-3.5 text-brand" />
                            <span>Wpływ symulacji na plan spłaty:</span>
                          </div>
                          <ul className="space-y-1 pl-5 list-disc text-text-muted text-[11px] leading-relaxed">
                            {(() => {
                              const activeBaseRes =
                                selectedPayoffStrategy === "avalanche"
                                  ? basePayoffComparison.avalanche
                                  : selectedPayoffStrategy === "snowball"
                                  ? basePayoffComparison.snowball
                                  : selectedPayoffStrategy === "custom"
                                  ? basePayoffComparison.custom
                                  : basePayoffComparison.baseline;

                              const currentSimRes =
                                (previewStrategy || selectedPayoffStrategy) === "avalanche"
                                  ? payoffComparison.avalanche
                                  : (previewStrategy || selectedPayoffStrategy) === "snowball"
                                  ? payoffComparison.snowball
                                  : (previewStrategy || selectedPayoffStrategy) === "custom"
                                  ? payoffComparison.custom
                                  : payoffComparison.baseline;

                              const durDiff = activeBaseRes.totalMonths - currentSimRes.totalMonths;
                              const intDiff = activeBaseRes.totalInterestPaid - currentSimRes.totalInterestPaid;

                              return (
                                <>
                                  <li>
                                    {durDiff > 0
                                      ? `Wariant symulacyjny skraca orientacyjny czas spłaty o ${durDiff} ${
                                          durDiff === 1 ? "miesiąc" : durDiff < 5 ? "miesiące" : "miesięcy"
                                        }.`
                                      : durDiff < 0
                                      ? `Wariant symulacyjny wydłuża orientacyjny czas spłaty o ${Math.abs(durDiff)} ${
                                          Math.abs(durDiff) === 1 ? "miesiąc" : Math.abs(durDiff) < 5 ? "miesiące" : "miesięcy"
                                        }.`
                                      : "Termin spłaty pozostaje orientacyjnie taki sam."}
                                  </li>
                                  {intDiff !== 0 && (
                                    <li>
                                      {intDiff > 0
                                        ? `Szacowany koszt odsetek jest niższy o około ${formatMoney(intDiff, currency)}.`
                                        : `Szacowany koszt odsetek jest wyższy o około ${formatMoney(Math.abs(intDiff), currency)}.`}
                                    </li>
                                  )}
                                  <li>
                                    Szacowany termin spłaty: <strong className="text-text-main font-bold">{currentSimRes.debtFreeDate}</strong>.
                                  </li>
                                </>
                              );
                            })()}
                          </ul>
                          <p className="text-[10px] text-text-faint pt-1 border-t border-border/40">
                            Szacunek na podstawie podanych danych. Parametr tymczasowej symulacji — nie modyfikuje zapisanych scenariuszy.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
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

                        const scOrder =
                          sc.strategy === "custom"
                            ? buildValidatedCustomOrder(activeDebts, sc.customDebtOrder)
                            : undefined;
                        const scSim = calculatePortfolioPayoffStrategies(
                          activeDebts,
                          sc.extraMonthlyPayment || 0,
                          undefined,
                          scOrder
                        );
                        const scRes =
                          sc.strategy === "avalanche"
                            ? scSim.avalanche
                            : sc.strategy === "snowball"
                            ? scSim.snowball
                            : sc.strategy === "custom"
                            ? scSim.custom
                            : scSim.baseline;

                        return (
                          <div
                            key={sc.id}
                            className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition shadow-2xs ${
                              isSelected
                                ? "bg-brand-subtle/20 border-brand ring-1 ring-brand/30"
                                : "bg-surface border-border hover:border-brand/30"
                            }`}
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!isSelected && validSelectedScenarioIds.length >= 2}
                                onChange={() => handleToggleSelectScenario(sc.id)}
                                aria-label={`Wybierz scenariusz ${sc.name} do porównania`}
                                className="w-4 h-4 rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed mt-0.5"
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
                                <div className="text-[11px] text-text-muted space-y-0.5">
                                  <div>
                                    Nadpłata: <strong className="text-brand font-bold tabular-nums">+{formatMoney(sc.extraMonthlyPayment, currency)} / mc</strong>
                                  </div>
                                  {scRes && (
                                    <div className="flex items-center gap-2 text-[10px] text-text-faint pt-0.5">
                                      <span>Termin: <strong className="text-text-main font-semibold">{scRes.debtFreeDate}</strong></span>
                                      <span>•</span>
                                      <span>Odsetki: <strong className="text-text-main font-semibold tabular-nums">{formatMoney(scRes.totalInterestPaid, currency)}</strong></span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-1 shrink-0 pt-2 border-t border-border/40">
                              <button
                                type="button"
                                onClick={() => handleLoadScenario(sc)}
                                aria-label={`Wczytaj scenariusz ${sc.name}`}
                                className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-brand hover:text-text-inverse text-text-main text-[11px] font-bold border border-border hover:border-brand transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                              >
                                Wczytaj
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRenameModal(sc)}
                                aria-label={`Zmień nazwę scenariusza ${sc.name}`}
                                className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                                title="Zmień nazwę"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDuplicateModal(sc)}
                                disabled={savedScenarios.length >= 5}
                                aria-label={`Duplikuj scenariusz ${sc.name}`}
                                className="p-1.5 rounded-lg text-text-muted hover:text-brand hover:bg-brand-subtle transition disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                                title={
                                  savedScenarios.length >= 5
                                    ? "Osiągnięto limit 5 zapisanych scenariuszy"
                                    : "Duplikuj scenariusz"
                                }
                              >
                                <Copy className="w-3.5 h-3.5" />
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

              {/* SPRINT 13: DEBT-FREE MILESTONE CARD */}
              {selectedPayoffStrategy && (
                (() => {
                  const currentRes =
                    selectedPayoffStrategy === "avalanche"
                      ? payoffComparison.avalanche
                      : selectedPayoffStrategy === "snowball"
                      ? payoffComparison.snowball
                      : selectedPayoffStrategy === "custom"
                      ? payoffComparison.custom
                      : payoffComparison.baseline;

                  return (
                    <div className="bg-surface-2/60 border border-brand/30 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 animate-fade-in" id="debt-free-milestone-card">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand flex items-center justify-center shrink-0 border border-brand/20">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-text-main">
                              Kamień milowy spłaty zadłużenia
                            </h4>
                            <p className="text-[11px] text-text-muted">
                              Szacunek dla wybranej metody:{" "}
                              <strong className="text-text-main">{currentRes.strategyLabel}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[11px] text-text-faint block">Szacowany termin spłaty:</span>
                          <span className="text-sm sm:text-base font-black text-brand tabular-nums">
                            {currentRes.debtFreeDate}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-surface rounded-xl border border-border/80 space-y-0.5">
                          <span className="text-[11px] text-text-faint block">Orientacyjny czas do końca:</span>
                          <strong className="text-sm font-bold text-text-main tabular-nums">
                            {currentRes.totalMonths} mies.
                            {currentRes.totalMonths > 0 && (
                              <span className="text-xs font-normal text-text-muted ml-1">
                                (~{Math.round((currentRes.totalMonths / 12) * 10) / 10} lat)
                              </span>
                            )}
                          </strong>
                        </div>

                        <div className="p-3 bg-surface rounded-xl border border-border/80 space-y-0.5">
                          <span className="text-[11px] text-text-faint block">Szacowany koszt odsetek:</span>
                          <strong className="text-sm font-bold text-text-main tabular-nums">
                            {formatMoney(currentRes.totalInterestPaid, currency)}
                          </strong>
                        </div>

                        <div className="p-3 bg-surface rounded-xl border border-border/80 space-y-0.5">
                          <span className="text-[11px] text-text-faint block">Różnica względem wariantu bazowego:</span>
                          {currentRes.interestSavedVsBaseline > 0 ? (
                            <div>
                              <strong className="text-sm font-bold text-brand tabular-nums block">
                                +{formatMoney(currentRes.interestSavedVsBaseline, currency)} oszczędności
                              </strong>
                              <span className="text-[10px] text-text-faint block">
                                Modelowa różnica względem planu bazowego (Status Quo). Wynik symulacji zależny od przyjętych danych i założeń.
                              </span>
                            </div>
                          ) : selectedPayoffStrategy === "baseline" ? (
                            <span className="text-xs text-text-muted font-medium block">
                              Plan odniesienia (Status Quo) — punkt odniesienia bez dodatkowej nadpłaty.
                            </span>
                          ) : (
                            <span className="text-xs text-text-muted font-medium block">
                              W tym scenariuszu model nie pokazuje różnicy względem planu bazowego. Wynik zależy od aktualnych danych, rat, oprocentowania i dodatkowego budżetu.
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-[10px] text-text-muted leading-relaxed">
                        Na podstawie podanych danych. Wynik jest orientacyjną symulacją matematyczną i zakłada terminowe opłacanie minimalnych rat oraz stałą miesięczną nadpłatę.
                      </p>
                    </div>
                  );
                })()
              )}

              {/* Sprint 8 / Sprint 31: Payoff Strategies Knowledge Center (Explainer Hub with Contextual Guidance) */}
              <PayoffStrategiesKnowledgeCenter selectedStrategy={selectedPayoffStrategy} />

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
          key={selectedDebtForDetails.id}
          isOpen={true}
          debt={selectedDebtForDetails}
          transactions={profile?.transactions}
          initialTab={initialDetailsTab}
          initialHistoryFilters={
            selectedDebtForDetails
              ? historySessionFiltersByDebt[selectedDebtForDetails.id] || DEFAULT_DEBT_PAYMENT_HISTORY_FILTERS
              : DEFAULT_DEBT_PAYMENT_HISTORY_FILTERS
          }
          onSaveHistoryFilters={(debtId, filters) => {
            setHistorySessionFiltersByDebt((prev) => ({
              ...prev,
              [debtId]: filters
            }));
          }}
          onClose={() => setSelectedDebtForDetails(null)}
          onUpdateTransaction={onUpdateTransaction}
          onOpenTxModal={onOpenTxModal}
          showToast={showToast}
          onOpenOverpaymentModal={(d, amount) => {
            setSelectedDebtForDetails(null);
            setOverpaymentInitialAmount(amount);
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
          initialAmount={overpaymentInitialAmount}
          onClose={() => {
            setSelectedDebtForOverpayment(null);
            setOverpaymentInitialAmount(undefined);
          }}
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
                <label htmlFor="save-scenario-name-input" className="block text-xs font-bold text-text-muted mb-1.5">
                  Nazwa scenariusza
                </label>
                <input
                  id="save-scenario-name-input"
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

      {/* MODAL 7: RENAME SCENARIO */}
      {renameModalScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="bg-surface border border-border rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-scenario-modal-title"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 id="rename-scenario-modal-title" className="text-base font-bold text-text-main">
                  Zmień nazwę scenariusza
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRenameModalScenario(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                aria-label="Zamknij"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <div>
                <label htmlFor="rename-scenario-name-input" className="block text-xs font-bold text-text-muted mb-1.5">
                  Nowa nazwa scenariusza
                </label>
                <input
                  id="rename-scenario-name-input"
                  type="text"
                  required
                  maxLength={50}
                  value={renameScenarioInput}
                  onChange={(e) => setRenameScenarioInput(e.target.value)}
                  placeholder="np. Nowy wariant planu"
                  className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setRenameModalScenario(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text-main hover:bg-surface-2 transition cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={renameScenarioInput.trim().length < 2}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand text-text-inverse hover:bg-brand-hover transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  Zapisz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: DUPLICATE SCENARIO */}
      {duplicateModalScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="bg-surface border border-border rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="duplicate-scenario-modal-title"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand flex items-center justify-center">
                  <Copy className="w-4 h-4" />
                </div>
                <h3 id="duplicate-scenario-modal-title" className="text-base font-bold text-text-main">
                  Duplikuj scenariusz spłaty
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDuplicateModalScenario(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                aria-label="Zamknij"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDuplicateSubmit} className="space-y-4">
              <div>
                <label htmlFor="duplicate-scenario-name-input" className="block text-xs font-bold text-text-muted mb-1.5">
                  Nazwa kopii scenariusza
                </label>
                <input
                  id="duplicate-scenario-name-input"
                  type="text"
                  required
                  maxLength={50}
                  value={duplicateScenarioInput}
                  onChange={(e) => setDuplicateScenarioInput(e.target.value)}
                  placeholder="np. Wariant bazowy — kopia"
                  className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring"
                  autoFocus
                />
              </div>

              <div className="p-3 bg-surface-2/60 rounded-xl border border-border/80 text-xs space-y-1.5 text-text-muted">
                <div className="flex justify-between">
                  <span>Kopiowana metoda:</span>
                  <strong className="text-text-main">
                    {duplicateModalScenario.strategy === "avalanche"
                      ? "Metoda Lawiny"
                      : duplicateModalScenario.strategy === "snowball"
                      ? "Metoda Kuli Śnieżnej"
                      : duplicateModalScenario.strategy === "custom"
                      ? "Własna kolejność"
                      : "Status Quo"}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Miesięczna nadpłata:</span>
                  <strong className="text-brand font-bold tabular-nums">
                    +{formatMoney(duplicateModalScenario.extraMonthlyPayment, currency)} / mc
                  </strong>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setDuplicateModalScenario(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text-main hover:bg-surface-2 transition cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={duplicateScenarioInput.trim().length < 2}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand text-text-inverse hover:bg-brand-hover transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  Utwórz kopię
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
