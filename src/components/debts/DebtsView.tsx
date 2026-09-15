import React, { useState, useMemo, useEffect } from "react";
import { DebtItem, DebtType, Profile, DebtPayoffScenario, Transaction } from "../../types";
import {
  calculatePortfolioDebtKpis,
  calculateDebtPortfolioAnalytics,
  DebtPayoffStrategyType
} from "../../services/debtCalculations";
import { useDebtStrategyAnalytics } from "../../hooks/useDebtStrategyAnalytics";
import { StatCard } from "../ui/StatCard";
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
import { MortgageProModal } from "./MortgageProModal";
import { DebtFormModal } from "./DebtFormModal";
import { DebtImportModal } from "./DebtImportModal";
import { DebtScenarioChooserModal } from "./DebtScenarioChooserModal";
import { DebtStrategyGuidanceCard } from "./DebtStrategyGuidanceCard";
import { DebtStrategyContextHint } from "./DebtStrategyContextHint";
import { DebtPayoffChart } from "./DebtPayoffChart";
import { DebtStrategyDecisionSummary } from "./DebtStrategyDecisionSummary";
import { DebtScenarioFallbackState } from "./DebtScenarioFallbackState";
import { DebtScenarioConfigSection } from "./DebtScenarioConfigSection";
import { DebtStrategyResultsSection } from "./DebtStrategyResultsSection";
import { DebtScenarioModalsOrchestrator } from "./DebtScenarioModalsOrchestrator";
import { PayoffStrategiesKnowledgeCenter } from "./PayoffStrategiesKnowledgeCenter";
import { KnowledgeAndBenchmarksTab } from "./KnowledgeAndBenchmarksTab";
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
  Percent,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Filter,
  ArrowUpDown,
  Search,
  Landmark,
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isChooserModalOpen, setIsChooserModalOpen] = useState(false);
  const [debtToEdit, setDebtToEdit] = useState<DebtItem | null>(null);
  const [selectedDebtForDetails, setSelectedDebtForDetails] = useState<DebtItem | null>(null);
  const [initialDetailsTab, setInitialDetailsTab] = useState<DebtDetailTab>("overview");
  const [selectedDebtForOverpayment, setSelectedDebtForOverpayment] = useState<DebtItem | null>(null);
  const [overpaymentInitialAmount, setOverpaymentInitialAmount] = useState<number | undefined>(undefined);
  const [selectedDebtForRefinance, setSelectedDebtForRefinance] = useState<DebtItem | null>(null);
  const [isMortgageProOpen, setIsMortgageProOpen] = useState<boolean>(false);
  const [mortgageProDebtId, setMortgageProDebtId] = useState<string | undefined>(undefined);

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
  const [oneTimeOverpayments, setOneTimeOverpayments] = useState<{ month: number; amount: number }[]>([]);
  const [previewStrategy, setPreviewStrategy] = useState<DebtPayoffStrategyType | null>(null);
  const [isWhatIfExpanded, setIsWhatIfExpanded] = useState<boolean>(false);

  // Analytics derivation hook
  const {
    activeDebts,
    validatedCustomOrder,
    payoffComparison,
    whatIfImpact,
    savedScenarioPreviews,
    selectedPayoffResult
  } = useDebtStrategyAnalytics({
    debts,
    selectedPayoffStrategy,
    extraMonthlyPayoff,
    customDebtOrder,
    oneTimeOverpayments,
    previewStrategy,
    savedScenarios
  });

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
    if (existingScenario && typeof existingScenario === "object" && "name" in existingScenario) {
      setEditingScenarioId(existingScenario.id);
      setScenarioNameInput(existingScenario.name || "");
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
        oneTimeOverpayments: oneTimeOverpayments,
        customDebtOrder: selectedPayoffStrategy === "custom" ? [...validatedCustomOrder] : undefined
      });
    }

    setIsSaveScenarioModalOpen(false);
    setScenarioNameInput("");
    setEditingScenarioId(null);
  };

  const handleLoadScenario = (scenarioToLoad: DebtPayoffScenario) => {
    setSelectedPayoffStrategy(scenarioToLoad.strategy);
    setExtraMonthlyPayoff(scenarioToLoad.extraMonthlyPayment || 0);
    setOneTimeOverpayments(scenarioToLoad.oneTimeOverpayments || []);
    
    if (scenarioToLoad.strategy === "custom" && scenarioToLoad.customDebtOrder) {
      setCustomDebtOrder(scenarioToLoad.customDebtOrder);
    } else {
      setCustomDebtOrder([]);
    }

    setPreviewStrategy(null);
    showToast?.(`Wczytano scenariusz: ${scenarioToLoad.name}`, "info");
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
      setIsChooserModalOpen(true);
    } else if (actionName === "import") {
      setIsImportModalOpen(true);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="debts-view-container">
      {/* 1. TOP HEADER & ACTION BUTTONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold text-text-faint uppercase tracking-wider mb-0.5">
            Zarządzanie zadłużeniem
          </p>
          <div className="flex items-center gap-2.5 mt-0.5">
            <h2 className="text-xl sm:text-2xl font-bold text-text-main">
              Kredyty i Hipoteka
            </h2>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Cały portfel zadłużenia w jednym miejscu • Analiza kosztów, symulator nadpłat i strategie spłaty
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0 w-full md:w-auto mt-3 md:mt-0 md:justify-end">
          <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleTopActionClick("import")}
              className="whitespace-nowrap shrink-0 bg-surface hover:bg-surface-2 border border-border text-text-muted hover:text-text-main font-bold py-2 px-3 rounded-xl active:scale-[0.98] transition-all shadow-xs text-xs flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring flex-1 sm:flex-none"
              id="btn-import-debts"
              title="Importuj dane z wyciągów lub BIK"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Importuj</span>
            </button>

            <button
              onClick={() => handleTopActionClick("offers")}
              className="whitespace-nowrap shrink-0 bg-surface hover:bg-surface-2 border border-border text-text-main font-bold py-2 px-3 rounded-xl active:scale-[0.98] transition-all shadow-xs text-xs flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring flex-1 sm:flex-none"
              id="btn-add-scenario"
            >
              <PlusCircle className="w-3.5 h-3.5 text-brand" />
              <span className="hidden sm:inline">Nowa oferta / scenariusz</span>
              <span className="sm:hidden">Oferta</span>
            </button>

            <button
              onClick={() => handleTopActionClick("strategies")}
              className="whitespace-nowrap shrink-0 bg-brand-subtle text-brand hover:bg-brand-subtle/80 border border-brand/20 font-bold py-2 px-3 rounded-xl active:scale-[0.98] transition-all shadow-xs text-xs flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring flex-1 sm:flex-none"
              id="btn-compare-strategies"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Porównaj strategie</span>
              <span className="sm:hidden">Strategie</span>
            </button>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto order-first sm:order-last bg-brand text-text-inverse font-bold py-2.5 sm:py-2 px-4 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-sm text-sm sm:text-xs flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            id="btn-add-debt"
          >
            <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span>Dodaj zobowiązanie</span>
          </button>
        </div>
      </div>

      {/* 2. PORTFOLIO KPI AREA (8 Real Indicators) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" id="portfolio-kpis-grid">
        <StatCard
          icon={<Landmark className="w-3.5 h-3.5" />}
          label="Łączne saldo"
          value={formatMoney(kpiData.totalBalance, currency)}
          caption={`${kpiData.activeCount} ${kpiData.activeCount === 1 ? "aktywne dług" : "aktywne długi"}${kpiData.closedCount > 0 ? ` (${kpiData.closedCount} spłaconych)` : ""}`}
        />

        <StatCard
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Miesięczna obsługa"
          value={formatMoney(kpiData.monthlyDebtService, currency)}
          caption="suma bieżących rat i spłat"
        />

        <StatCard
          icon={<TrendingDown className="w-3.5 h-3.5" />}
          tone="danger"
          label="Pozostałe odsetki"
          value={formatMoney(kpiData.remainingInterest, currency)}
          caption="szacowany koszt obsługi"
        />

        <StatCard
          icon={<Percent className="w-3.5 h-3.5" />}
          tone="brand"
          label="Śr. koszt długu (WACD)"
          value={`${kpiData.weightedInterestRate.toFixed(1)}%`}
          valueClassName="text-brand"
          caption="średnia ważona kapitałem"
        />

        <StatCard
          icon={<Flame className="w-3.5 h-3.5" />}
          tone={kpiData.mostExpensiveDebt ? "danger" : "neutral"}
          label="Najdroższy dług"
          value={kpiData.mostExpensiveDebt?.name || "Brak aktywnych"}
          valueTitle={kpiData.mostExpensiveDebt?.name || "Brak"}
          valueClassName="text-sm sm:text-base font-bold"
          caption={
            kpiData.mostExpensiveDebt ? (
              <span className="font-black text-danger">
                {`APR ${kpiData.mostExpensiveDebt.apr.toFixed(1)}%`}
              </span>
            ) : (
              <span className="font-black text-text-faint">Brak zobowiązań</span>
            )
          }
        />

        <StatCard
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Najbliższa płatność"
          value={kpiData.nearestPayment?.name || "Brak"}
          valueTitle={kpiData.nearestPayment?.name || "Brak"}
          valueClassName="text-sm sm:text-base font-bold"
          caption={
            kpiData.nearestPayment
              ? `${kpiData.nearestPayment.date} (${formatMoney(kpiData.nearestPayment.amount, currency)})`
              : "Brak terminów"
          }
        />

        <StatCard
          icon={<Sparkles className="w-3.5 h-3.5" />}
          tone="brand"
          label="Refi alert"
          value={analytics.refinanceCandidates.length > 0 ? "Warto sprawdzić oferty" : "Warunki stabilne"}
          valueClassName="text-sm sm:text-base font-bold"
          caption={
            analytics.refinanceCandidates.length > 0
              ? `${analytics.refinanceCandidates.length} kandydatów do weryfikacji`
              : "brak pilnych zmian"
          }
        />

        <StatCard
          icon={<Zap className="w-3.5 h-3.5" />}
          tone="brand"
          label="Potencjał nadpłaty"
          value={kpiData.totalBalance > 50000 ? "Oszczędność do kilkudziesięciu tys. zł" : "Szybka spłata możliwa"}
          valueClassName="text-sm sm:text-base font-bold text-brand"
          caption="sprawdź w symulatorze"
        />
      </div>

      {/* WRAPPER FOR PROGRESS AND MILESTONE TO RECLAIM VERTICAL SPACE ON DESKTOP */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* 2AA. SPRINT 13: PAYOFF PROGRESS SUMMARY */}
        {debts.length > 0 && portfolioProgress.totalOriginal > 0 && (
          <div className="flex-1 bg-surface border border-border/70 rounded-xl p-4 sm:p-5 shadow-xs space-y-3 flex flex-col justify-center" id="debt-payoff-progress-block">
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

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-y-3 gap-x-2 pt-1 text-xs text-text-muted">
            <div>
              <span className="text-text-faint text-xs block">Saldo początkowe:</span>
              <strong className="text-text-main font-bold tabular-nums">
                {formatMoney(portfolioProgress.totalOriginal, currency)}
              </strong>
            </div>
            <div>
              <span className="text-text-faint text-xs block">Aktualne saldo:</span>
              <strong className="text-brand font-bold tabular-nums">
                {formatMoney(portfolioProgress.totalCurrent, currency)}
              </strong>
            </div>
            <div>
              <span className="text-text-faint text-xs block">Czynne umowy:</span>
              <strong className="text-text-main font-bold">
                {kpiData.activeCount}
              </strong>
            </div>
            <div>
              <span className="text-text-faint text-xs block">Spłacone umowy:</span>
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
          className="flex-1 bg-surface border border-border/70 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          id="portfolio-nearest-milestone-card"
        >
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-text-faint block">
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
      </div>

      {/* 2B. SPRINT 2: COMPACT DEEP ANALYTICS & INSIGHT SIGNALS */}
      {debts.length > 0 && (
        <div className="bg-surface border border-border/70 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand" />
              <h3 className="text-sm font-bold text-text-main">
                Struktura portfela i sygnały decyzyjne
              </h3>
            </div>
            <button
              onClick={() => setShowAnalyticsDetails(!showAnalyticsDetails)}
              className="text-xs font-bold text-text-muted hover:text-text-main px-2.5 py-1 rounded-lg hover:bg-surface-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
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
                        <p className="text-xs text-text-muted leading-relaxed mt-0.5">{sig.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Debt Mix Breakdown Table / Bars */}
              {analytics.debtMix.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-faint block">
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
                          <div className="flex justify-between text-xs text-text-muted mb-1">
                            <span>Saldo ({mix.balanceSharePct}%):</span>
                            <span className="font-bold text-text-main tabular-nums">{formatMoney(mix.totalBalance, currency)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-offset rounded-full overflow-hidden">
                            <div className="h-full bg-brand rounded-full" style={{ width: `${mix.balanceSharePct}%` }} />
                          </div>
                        </div>

                        <div className="flex justify-between text-xs text-text-muted pt-1 border-t border-border/40">
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
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
            activeMainTab === "portfolio"
              ? "bg-brand text-text-inverse shadow-xs"
              : "text-text-muted hover:text-text-main hover:bg-surface-2"
          }`}
          id="tab-btn-portfolio"
        >
          <Layers className="w-4 h-4" />
          <span>Portfel zobowiązań</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
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
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
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
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
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
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3 sm:p-4 rounded-xl border border-border/70 shadow-xs">
            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
                  selectedFilter === "all"
                    ? "bg-brand-subtle text-brand border border-brand/20 shadow-xs"
                    : "border border-transparent text-text-muted hover:text-text-main hover:bg-surface-2 hover:border-border/70"
                }`}
              >
                Wszystkie ({debts.length})
              </button>

              <button
                onClick={() => setSelectedFilter("mortgage")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
                  selectedFilter === "mortgage"
                    ? "bg-brand-subtle text-brand border border-brand/20 shadow-xs"
                    : "border border-transparent text-text-muted hover:text-text-main hover:bg-surface-2 hover:border-border/70"
                }`}
              >
                Hipoteka ({debts.filter((d) => d.type === "mortgage" && d.status !== "closed").length})
              </button>

              <button
                onClick={() => setSelectedFilter("cash_loan")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
                  selectedFilter === "cash_loan"
                    ? "bg-brand-subtle text-brand border border-brand/20 shadow-xs"
                    : "border border-transparent text-text-muted hover:text-text-main hover:bg-surface-2 hover:border-border/70"
                }`}
              >
                Kredyty gotówkowe ({debts.filter((d) => d.type === "cash_loan" && d.status !== "closed").length})
              </button>

              <button
                onClick={() => setSelectedFilter("cards_and_limits")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
                  selectedFilter === "cards_and_limits"
                    ? "bg-brand-subtle text-brand border border-brand/20 shadow-xs"
                    : "border border-transparent text-text-muted hover:text-text-main hover:bg-surface-2 hover:border-border/70"
                }`}
              >
                Karty i limity ({debts.filter((d) => (d.type === "credit_card" || d.type === "revolving") && d.status !== "closed").length})
              </button>

              <button
                onClick={() => setSelectedFilter("bnpl")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
                  selectedFilter === "bnpl"
                    ? "bg-brand-subtle text-brand border border-brand/20 shadow-xs"
                    : "border border-transparent text-text-muted hover:text-text-main hover:bg-surface-2 hover:border-border/70"
                }`}
              >
                Ratalne ({debts.filter((d) => d.type === "bnpl" && d.status !== "closed").length})
              </button>

              <button
                onClick={() => setSelectedFilter("other")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
                  selectedFilter === "other"
                    ? "bg-brand-subtle text-brand border border-brand/20 shadow-xs"
                    : "border border-transparent text-text-muted hover:text-text-main hover:bg-surface-2 hover:border-border/70"
                }`}
              >
                Inne ({debts.filter((d) => d.type === "other" && d.status !== "closed").length})
              </button>

              {kpiData.closedCount > 0 && (
                <button
                  onClick={() => setSelectedFilter("closed")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
                    selectedFilter === "closed"
                      ? "bg-brand-subtle text-brand border border-brand/20 shadow-xs"
                      : "border border-transparent text-text-muted hover:text-text-main hover:bg-surface-2 hover:border-border/70"
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
                className="bg-surface-2 border border-border/70 text-xs font-bold text-text-main rounded-lg px-2.5 py-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none cursor-pointer"
              >
                <option value="apr">Najwyższy APR / Koszt</option>
                <option value="nearest_milestone">Najbliżej kolejnego kamienia milowego</option>
                <option value="payment">Wysokość raty</option>
                <option value="balance">Wielkość salda</option>
                <option value="payoff_date">Termin spłaty</option>
              </select>
            </div>
          </div>

          {/* Mortgage Pro Center Action Banner */}
          {debts.some((d) => d.type === "mortgage" && d.status !== "closed") && (
            <div
              className="bg-surface border border-brand/30 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              id="mortgage-pro-banner"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-2xs">
                  <Sparkles className="w-5 h-5 text-brand" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-text-main tracking-tight">
                      Centrum Hipoteczne Mortgage Pro
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-brand-subtle text-brand text-[10px] font-bold border border-brand/20">
                      PRO
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Stress-test stóp KNF (+300 pb), kalkulator wakacji kredytowych z dźwignią nadpłaty, porównanie rat malejących i monitor LTV.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  const firstMortgage = debts.find((d) => d.type === "mortgage" && d.status !== "closed");
                  setMortgageProDebtId(firstMortgage?.id);
                  setIsMortgageProOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-text-inverse hover:bg-brand/90 active:scale-[0.98] transition-all text-xs font-bold cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring shrink-0"
                id="btn-open-mortgage-pro-hub"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Uruchom Mortgage Pro</span>
              </button>
            </div>
          )}

          {/* Cards Grid / Empty State */}
          {filteredDebts.length === 0 ? (
            debts.length === 0 ? (
              <div className="text-center py-12 px-6 bg-surface rounded-xl border border-dashed border-border/70 shadow-xs flex flex-col items-center justify-center space-y-4" id="debts-empty-state">
                <div className="w-16 h-16 rounded-xl bg-brand-subtle flex items-center justify-center border border-brand/20 shadow-xs text-brand">
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
                      className="px-2.5 py-1 rounded-lg bg-surface-2 border border-border/70 text-xs font-semibold text-text-muted"
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
              <div className="text-center py-12 px-6 bg-surface rounded-xl border border-dashed border-border/70 shadow-xs flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center border border-border/70 text-text-muted">
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
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand bg-brand-subtle hover:bg-brand hover:text-text-inverse border border-brand/20 px-3.5 py-2 rounded-xl transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] shadow-xs"
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
              <DebtScenarioFallbackState type="all_paid" />
            ) : (
              <DebtScenarioFallbackState
                type="no_debts"
                onAddDebt={handleOpenAddModal}
                onOpenKnowledgeCenter={() => setActiveMainTab("knowledge")}
              />
            )
          ) : (
            <>
              {/* Extra Payment Budget Config, What-If & Saved Scenarios */}
              <DebtScenarioConfigSection
                monthlyDebtService={kpiData.monthlyDebtService}
                extraMonthlyPayoff={extraMonthlyPayoff}
                onExtraMonthlyPayoffChange={setExtraMonthlyPayoff}
                currency={currency}
                selectedPayoffStrategy={selectedPayoffStrategy}
                oneTimeOverpayments={oneTimeOverpayments}
                onOneTimeOverpaymentsChange={setOneTimeOverpayments}
                previewStrategy={previewStrategy}
                onPreviewStrategyChange={setPreviewStrategy}
                isWhatIfExpanded={isWhatIfExpanded}
                onToggleWhatIfExpanded={() => setIsWhatIfExpanded(!isWhatIfExpanded)}
                onResetWhatIf={() => {
                  setOneTimeOverpayments([]);
                  setPreviewStrategy(null);
                }}
                whatIfImpact={whatIfImpact}
                savedScenarios={savedScenarios}
                savedScenarioPreviews={savedScenarioPreviews}
                validSelectedScenarioIds={validSelectedScenarioIds}
                onToggleSelectScenario={handleToggleSelectScenario}
                onOpenCompareScenarios={() => setIsCompareScenariosModalOpen(true)}
                onOpenSaveScenario={() => handleOpenSaveScenarioModal()}
                onLoadScenario={handleLoadScenario}
                onOpenRenameScenario={handleOpenRenameModal}
                onOpenDuplicateScenario={handleOpenDuplicateModal}
                onDeleteScenario={onDeletePayoffScenario}
              />

              {/* Sprint 15: Debt Payoff Chart */}
              <DebtPayoffChart 
                comparison={payoffComparison} 
                activeStrategy={previewStrategy || selectedPayoffStrategy} 
              />

              {/* Strategy Guidance Card */}
              <DebtStrategyGuidanceCard
                selectedStrategy={selectedPayoffStrategy}
                onSelectStrategy={(strat) => setSelectedPayoffStrategy(strat)}
              />

              {/* Strategy Context Hint */}
              <DebtStrategyContextHint
                selectedStrategy={selectedPayoffStrategy}
                onOpenKnowledgeCenter={() => setActiveMainTab("knowledge")}
              />

              {/* Strategy Decision Summary (Sprint 71) */}
              <DebtStrategyDecisionSummary
                selectedStrategy={selectedPayoffStrategy}
                payoffResult={selectedPayoffResult}
                currency={currency}
              />

              {/* Reset Custom Order Action */}
              {selectedPayoffStrategy === "custom" && customDebtOrder.length > 0 && (
                <div className="flex justify-end pt-2 pb-1">
                  <button
                    type="button"
                    onClick={() => setCustomDebtOrder([])}
                    aria-label="Resetuj kolejność spłaty do domyślnej"
                    className="text-xs font-bold text-text-muted hover:text-text-main flex items-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-focus-ring rounded-lg px-3 py-2 bg-surface hover:bg-surface-hover border border-transparent hover:border-border cursor-pointer shadow-none active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Resetuj kolejność</span>
                  </button>
                </div>
              )}

              {/* Payoff Strategy Results: Comparison Cards, Milestone Card, Knowledge Center, Custom Reorder & Roadmap */}
              <DebtStrategyResultsSection
                payoffComparison={payoffComparison}
                selectedPayoffStrategy={selectedPayoffStrategy}
                onSelectStrategy={(strategy) => setSelectedPayoffStrategy(strategy)}
                currency={currency}
                activeDebts={activeDebts}
                validatedCustomOrder={validatedCustomOrder}
                onMoveDebtUp={handleMoveDebtUp}
                onMoveDebtDown={handleMoveDebtDown}
              />
            </>
          )}
        </div>
      )}

      {/* 6. TAB CONTENT 3: OFFERS & REFINANCING */}
      {activeMainTab === "offers" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-surface p-5 sm:p-6 rounded-xl border border-border/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                  <div key={cand.debt.id} className="p-4 bg-surface rounded-xl border border-border/70 hover:border-brand/40 shadow-xs flex flex-col justify-between transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-text-main">{cand.debt.name}</span>
                        <span className="text-xs font-black text-brand tabular-nums">{cand.debt.interestRate.toFixed(2)}%</span>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed mb-3">{cand.reason}</p>
                    </div>
                    <button
                      onClick={() => setSelectedDebtForRefinance(cand.debt)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-hover cursor-pointer px-2 py-1 rounded-lg hover:bg-brand-subtle/30 transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
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
          <KnowledgeAndBenchmarksTab 
            activeDebts={activeDebts}
            onNavigateToTools={(target) => {
              if (target === "debt-details" && activeDebts.length > 0) {
                 handleOpenDetails(activeDebts.find(d => d.type === "mortgage") || activeDebts[0]);
              } else if (target === "scenario-editor") {
                 setActiveMainTab("scenarios");
              } else if (target === "overpayment-calculator") {
                 setActiveMainTab("scenarios");
              }
            }}
          />
          <div className="pt-4 border-t border-border/60">
            <h3 className="text-base font-bold text-text-main mb-4">Wiedza o strategiach spłaty (Salda)</h3>
            <PayoffStrategiesKnowledgeCenter
              selectedStrategy={selectedPayoffStrategy}
              recommendedStrategy={payoffComparison.recommendedStrategy}
              defaultOpen={true}
              onSelectStrategy={(strat) => {
                setSelectedPayoffStrategy(strat);
                setActiveMainTab("scenarios");
              }}
            />
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
          onOpenMortgagePro={(id) => {
            setMortgageProDebtId(id);
            setIsMortgageProOpen(true);
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

      <DebtScenarioModalsOrchestrator
          currency={currency}
          isSaveScenarioModalOpen={isSaveScenarioModalOpen}
          scenarioNameInput={scenarioNameInput}
          onScenarioNameChange={setScenarioNameInput}
          onSaveScenarioSubmit={handleSaveScenarioSubmit}
          onCloseSaveScenario={() => setIsSaveScenarioModalOpen(false)}
          selectedPayoffStrategy={selectedPayoffStrategy}
          extraMonthlyPayoff={extraMonthlyPayoff}
          validatedCustomOrder={validatedCustomOrder}
          isCompareScenariosModalOpen={isCompareScenariosModalOpen}
          savedScenarios={savedScenarios}
          validSelectedScenarioIds={validSelectedScenarioIds}
          activeDebts={activeDebts}
          onLoadScenario={handleLoadScenario}
          onCloseCompareScenarios={() => setIsCompareScenariosModalOpen(false)}
          renameModalScenario={renameModalScenario}
          renameScenarioInput={renameScenarioInput}
          onRenameScenarioInputChange={setRenameScenarioInput}
          onRenameSubmit={handleRenameSubmit}
          onCloseRenameScenario={() => setRenameModalScenario(null)}
          duplicateModalScenario={duplicateModalScenario}
          duplicateScenarioInput={duplicateScenarioInput}
          onDuplicateScenarioInputChange={setDuplicateScenarioInput}
          onDuplicateSubmit={handleDuplicateSubmit}
          onCloseDuplicateScenario={() => setDuplicateModalScenario(null)}
          isChooserModalOpen={isChooserModalOpen}
          onCloseChooserModal={() => setIsChooserModalOpen(false)}
          onSelectOffer={() => {
            setActiveMainTab("offers");
            const candidate = analytics.refinanceCandidates[0]?.debt || debts.find(d => d.type === "mortgage") || debts[0];
            if (candidate) {
              setSelectedDebtForRefinance(candidate);
            }
          }}
          onSelectScenario={() => {
            setActiveMainTab("scenarios");
          }}
        />

      {/* MODAL 9: CSV DEBT IMPORT */}
      {isImportModalOpen && (
        <DebtImportModal
          isOpen={true}
          onClose={() => setIsImportModalOpen(false)}
          currency={currency}
          showToast={showToast}
          onImport={(newDebts) => {
            newDebts.forEach((debt) => onAddDebt?.(debt));
          }}
        />
      )}

      {/* MODAL 10: MORTGAGE PRO */}
      <MortgageProModal
        isOpen={isMortgageProOpen}
        onClose={() => setIsMortgageProOpen(false)}
        debts={debts}
        initialDebtId={mortgageProDebtId}
        onUpdateDebt={onUpdateDebt}
      />
    </div>
  );
}
export default DebtsView;
