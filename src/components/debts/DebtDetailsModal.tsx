import React, { useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Home,
  CreditCard,
  Banknote,
  Percent,
  Sparkles,
  Layers,
  Scale,
  Calendar,
  Clock,
  ArrowRight,
  Info,
  CheckCircle2,
  FileText,
  RotateCcw,
  Plus,
  Trash2,
  Columns,
  Link2,
  Unlink,
  Search,
  Download,
  Check,
  Pencil
} from "lucide-react";
import { DebtItem, Transaction } from "../../types";
import { formatMoney } from "../../utils/format";
import { downloadFile } from "../../utils/csv";
import {
  DEBT_REPAYMENT_MILESTONES,
  calculateDebtRepaymentProgress,
  calculateNextDebtMilestoneForecast,
  formatMilestoneForecastDate,
  calculateDebtMilestoneOverpaymentImpact
} from "./DebtPortfolioCard";
import {
  calculateAmortizationSchedule,
  calculateDebtAmortizationSchedule,
  calculateDebtOverpaymentScenario,
  calculateDebtOverpaymentVariants,
  DebtOverpaymentVariantInput,
  DebtPaymentActivityItem,
  calculateDebtPaymentActivity,
  calculateDebtPaymentInsights,
  calculateDebtPaymentInsightsFromItems,
  calculateDebtPaymentTrendSnapshot,
  calculateDebtPaymentComparisonSnapshot,
  calculateDebtPaymentCoverageSnapshot,
  filterDebtPaymentActivity,
  filterDebtPaymentActivityByPeriod,
  DebtPaymentHistoryStatusFilter,
  DebtPaymentHistoryPrincipalFilter,
  DebtPaymentHistoryOrder,
  DebtPaymentSummaryScope,
  DebtPaymentHistoryPeriodPreset,
  calculateOverpayment,
  calculateRefinanceComparison
} from "../../services/debtCalculations";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export type DebtDetailTab = "overview" | "history" | "schedule" | "overpayment" | "refinance" | "terms";

export interface DebtPaymentHistorySessionFilters {
  status: DebtPaymentHistoryStatusFilter;
  principal: DebtPaymentHistoryPrincipalFilter;
  order: DebtPaymentHistoryOrder;
  periodPreset: DebtPaymentHistoryPeriodPreset;
  summaryScope: DebtPaymentSummaryScope;
}

export const DEFAULT_DEBT_PAYMENT_HISTORY_FILTERS: DebtPaymentHistorySessionFilters = {
  status: "all",
  principal: "all",
  order: "newest",
  periodPreset: "all",
  summaryScope: "all"
};

interface DebtDetailsModalProps {
  key?: React.Key;
  isOpen: boolean;
  onClose: () => void;
  debt: DebtItem | null;
  transactions?: Transaction[];
  initialTab?: DebtDetailTab;
  initialHistoryFilters?: DebtPaymentHistorySessionFilters;
  onOpenOverpaymentModal?: (debt: DebtItem, initialAmount?: number) => void;
  onOpenRefinanceModal?: (debt: DebtItem) => void;
  onUpdateTransaction?: (id: string, updates: Partial<Transaction>) => void;
  onOpenTxModal?: (tx: Transaction) => void;
  onSaveHistoryFilters?: (debtId: string, filters: DebtPaymentHistorySessionFilters) => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export function DebtDetailsModal({
  isOpen,
  onClose,
  debt,
  transactions,
  initialTab = "overview",
  initialHistoryFilters,
  onOpenOverpaymentModal,
  onOpenRefinanceModal,
  onUpdateTransaction,
  onOpenTxModal,
  onSaveHistoryFilters,
  showToast
}: DebtDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const [activeTab, setActiveTab] = useState<DebtDetailTab>(initialTab);
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [simMonthlyOverpayment, setSimMonthlyOverpayment] = useState<string>("");
  const [simOneTimeOverpayment, setSimOneTimeOverpayment] = useState<string>("");
  const [showFullOverpaymentSchedule, setShowFullOverpaymentSchedule] = useState<boolean>(false);

  // SPRINT 18: Overpayment variants comparison state
  const [isComparingVariants, setIsComparingVariants] = useState<boolean>(false);
  const [comparisonVariants, setComparisonVariants] = useState<DebtOverpaymentVariantInput[]>([
    { id: "var-1", name: "Nadpłata miesięczna", monthlyOverpayment: 500, oneTimeOverpayment: 0 },
    { id: "var-2", name: "Nadpłata jednorazowa", monthlyOverpayment: 0, oneTimeOverpayment: 10000 }
  ]);

  // SPRINT 34: Debt ↔ Transaction manual linking state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [selectedTxToLink, setSelectedTxToLink] = useState<Transaction | null>(null);
  const [txToUnlink, setTxToUnlink] = useState<DebtPaymentActivityItem | null>(null);

  // SPRINT 37: Lookup map for related transactions in payment audit trail
  const transactionsMap = useMemo(() => {
    const map = new Map<string, Transaction>();
    if (transactions) {
      for (const t of transactions) {
        if (t && t.id) {
          map.set(t.id, t);
        }
      }
    }
    return map;
  }, [transactions]);

  // SPRINT 77: Read-only linked transaction history
  const linkedTransactions = useMemo(() => {
    if (!transactions || !debt) return [];
    return transactions
      .filter((t) => t.debtId === debt.id)
      .sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());
  }, [transactions, debt]);

  // SPRINT 38: CSV & JSON Export of visible payment history timeline
  const handleExportCsv = () => {
    if (!debt || filteredActivityItems.length === 0) {
      showToast?.("Brak danych historii spłat do eksportu.", "info");
      return;
    }

    const headers = [
      "Data",
      "Nazwa transakcji",
      "Kwota wpłaty",
      "Kapitał",
      "Odsetki",
      "Saldo po wpłacie",
      "Status",
      "ID transakcji",
      "Powiązanie transakcji"
    ];

    const escapeCsv = (val: any): string => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    let csvContent = "\uFEFF";
    csvContent += headers.map(escapeCsv).join(",") + "\n";

    filteredActivityItems.forEach((item) => {
      const statusLabel =
        item.isFinalPayment || item.paymentStatus === "paid_off"
          ? "Spłacono"
          : item.paymentStatus === "interest_only"
          ? "Tylko odsetki"
          : item.paymentStatus === "insufficient_payment"
          ? "Częściowa"
          : "Rata";

      const auditStatus = item.transactionId
        ? transactionsMap.has(item.transactionId)
          ? "linked"
          : "missing"
        : "none";

      const row = [
        item.date,
        item.transactionName || "Spłata długu",
        item.paymentAmount,
        item.principalAmount,
        item.interestAmount,
        item.closingBalance,
        statusLabel,
        item.transactionId || "",
        auditStatus
      ];

      csvContent += row.map(escapeCsv).join(",") + "\n";
    });

    const slug = (debt.name || "dlug").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "dlug";
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `historia-splat-${slug}-${dateStr}.csv`;

    downloadFile(csvContent, filename, "text/csv;charset=utf-8;");
    showToast?.("Wyeksportowano historię spłat do CSV.", "success");
  };

  const handleExportJson = () => {
    if (!debt || filteredActivityItems.length === 0) {
      showToast?.("Brak danych historii spłat do eksportu.", "info");
      return;
    }

    const payload = {
      debtName: debt.name,
      debtId: debt.id,
      exportedAt: new Date().toISOString(),
      currency,
      scope: "filtered-visible-history",
      itemCount: filteredActivityItems.length,
      items: filteredActivityItems.map((item) => {
        const auditStatus = item.transactionId
          ? transactionsMap.has(item.transactionId)
            ? "linked"
            : "missing"
          : "none";

        return {
          date: item.date,
          transactionName: item.transactionName || "Spłata długu",
          paymentAmount: item.paymentAmount,
          principalAmount: item.principalAmount,
          interestAmount: item.interestAmount,
          closingBalance: item.closingBalance,
          status: item.paymentStatus || "normal",
          transactionId: item.transactionId || null,
          transactionAuditStatus: auditStatus
        };
      })
    };

    const jsonContent = JSON.stringify(payload, null, 2);
    const slug = (debt.name || "dlug").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "dlug";
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `historia-splat-${slug}-${dateStr}.json`;

    downloadFile(jsonContent, filename, "application/json;charset=utf-8;");
    showToast?.("Wyeksportowano historię spłat do JSON.", "success");
  };

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const amortization = useMemo(() => {
    return calculateDebtAmortizationSchedule(debt);
  }, [debt]);

  const activity = useMemo(() => {
    return calculateDebtPaymentActivity(debt, transactions);
  }, [debt, transactions]);

  const [summaryScope, setSummaryScope] = useState<DebtPaymentSummaryScope>(
    initialHistoryFilters?.summaryScope || "all"
  );
  const [historyPeriodPreset, setHistoryPeriodPreset] = useState<DebtPaymentHistoryPeriodPreset>(
    initialHistoryFilters?.periodPreset || "all"
  );
  const [historyStatusFilter, setHistoryStatusFilter] = useState<DebtPaymentHistoryStatusFilter>(
    initialHistoryFilters?.status || "all"
  );
  const [historyPrincipalFilter, setHistoryPrincipalFilter] = useState<DebtPaymentHistoryPrincipalFilter>(
    initialHistoryFilters?.principal || "all"
  );
  const [historyOrder, setHistoryOrder] = useState<DebtPaymentHistoryOrder>(
    initialHistoryFilters?.order || "newest"
  );
  const [hypotheticalOverpayment, setHypotheticalOverpayment] = useState<string>("");

  // SPRINT 39: Save history filter state to parent in-memory session store
  const onSaveHistoryFiltersRef = useRef(onSaveHistoryFilters);
  React.useEffect(() => {
    onSaveHistoryFiltersRef.current = onSaveHistoryFilters;
  });

  React.useEffect(() => {
    if (debt?.id) {
      onSaveHistoryFiltersRef.current?.(debt.id, {
        status: historyStatusFilter,
        principal: historyPrincipalFilter,
        order: historyOrder,
        periodPreset: historyPeriodPreset,
        summaryScope
      });
    }
  }, [debt?.id, historyStatusFilter, historyPrincipalFilter, historyOrder, historyPeriodPreset, summaryScope]);

  const handleResetHistoryFilters = () => {
    setHistoryStatusFilter("all");
    setHistoryPrincipalFilter("all");
    setHistoryOrder("newest");
  };

  const periodActivityItems = useMemo(() => {
    return filterDebtPaymentActivityByPeriod(activity.items, historyPeriodPreset);
  }, [activity.items, historyPeriodPreset]);

  const filteredActivityItems = useMemo(() => {
    return filterDebtPaymentActivity(periodActivityItems, {
      status: historyStatusFilter,
      principal: historyPrincipalFilter,
      order: historyOrder
    });
  }, [periodActivityItems, historyStatusFilter, historyPrincipalFilter, historyOrder]);

  const fullPaymentInsights = useMemo(() => {
    return calculateDebtPaymentInsightsFromItems(periodActivityItems);
  }, [periodActivityItems]);

  const filteredPaymentInsights = useMemo(() => {
    return calculateDebtPaymentInsightsFromItems(filteredActivityItems);
  }, [filteredActivityItems]);

  const activeInsights = summaryScope === "all" ? fullPaymentInsights : filteredPaymentInsights;

  const trendSnapshot = useMemo(() => {
    const itemsForTrend = summaryScope === "all" ? periodActivityItems : filteredActivityItems;
    return calculateDebtPaymentTrendSnapshot(itemsForTrend);
  }, [summaryScope, periodActivityItems, filteredActivityItems]);

  const comparisonSnapshot = useMemo(() => {
    let itemsForComparison = activity.items;
    if (summaryScope === "filtered") {
      itemsForComparison = filterDebtPaymentActivity(activity.items, {
        status: historyStatusFilter,
        principal: historyPrincipalFilter,
        order: "oldest"
      });
    }
    return calculateDebtPaymentComparisonSnapshot(
      itemsForComparison,
      historyPeriodPreset,
      activity.items
    );
  }, [summaryScope, historyPeriodPreset, activity.items, historyStatusFilter, historyPrincipalFilter]);

  const coverageSnapshot = useMemo(() => {
    let itemsForCoverage = activity.items;
    if (summaryScope === "filtered") {
      itemsForCoverage = filterDebtPaymentActivity(activity.items, {
        status: historyStatusFilter,
        principal: historyPrincipalFilter,
        order: "oldest"
      });
    }
    return calculateDebtPaymentCoverageSnapshot(
      itemsForCoverage,
      historyPeriodPreset,
      activity.items
    );
  }, [summaryScope, historyPeriodPreset, activity.items, historyStatusFilter, historyPrincipalFilter]);

  const numMonthlyOverpayment = Math.max(0, parseFloat(simMonthlyOverpayment) || 0);
  const numOneTimeOverpayment = Math.max(0, parseFloat(simOneTimeOverpayment) || 0);

  const overpaymentScenario = useMemo(() => {
    return calculateDebtOverpaymentScenario(debt, numMonthlyOverpayment, numOneTimeOverpayment);
  }, [debt, numMonthlyOverpayment, numOneTimeOverpayment]);

  const variantsComparison = useMemo(() => {
    if (!isComparingVariants) return null;
    return calculateDebtOverpaymentVariants(debt, comparisonVariants);
  }, [debt, isComparingVariants, comparisonVariants]);

  const overpaymentQuickA = useMemo(() => {
    if (!debt) return null;
    return calculateOverpayment({
      balance: debt.balance,
      annualRatePct: debt.interestRate,
      monthlyPayment: debt.monthlyPayment,
      overpaymentAmount: 500,
      frequency: "monthly",
      targetStrategy: "reduce_term"
    });
  }, [debt]);

  const overpaymentQuickB = useMemo(() => {
    if (!debt) return null;
    return calculateOverpayment({
      balance: debt.balance,
      annualRatePct: debt.interestRate,
      monthlyPayment: debt.monthlyPayment,
      overpaymentAmount: 1000,
      frequency: "monthly",
      targetStrategy: "reduce_term"
    });
  }, [debt]);

  const refinancePreview = useMemo(() => {
    if (!debt || debt.type !== "mortgage") return null;
    const targetRate = Math.max(1, Math.round((debt.interestRate - 1.0) * 100) / 100);
    return calculateRefinanceComparison({
      balance: debt.balance,
      currentRate: debt.interestRate,
      currentMonthlyPayment: debt.monthlyPayment,
      currentRemainingMonths: debt.remainingMonths,
      newRate: targetRate,
      closingCosts: 4500
    });
  }, [debt]);

  if (!isOpen || !debt || typeof document === "undefined") return null;

  const currency = debt.currency || "PLN";

  // First month split
  const monthlyRate = (debt.interestRate / 100) / 12;
  const currentInterestPortion = Math.min(debt.monthlyPayment, Math.round(debt.balance * monthlyRate * 100) / 100);
  const currentPrincipalPortion = Math.max(0, Math.round((debt.monthlyPayment - currentInterestPortion) * 100) / 100);
  const interestPct = debt.monthlyPayment > 0 ? Math.round((currentInterestPortion / debt.monthlyPayment) * 100) : 0;
  const principalPct = Math.max(0, 100 - interestPct);

  // Derived LTV
  const ltv =
    debt.propertyValue && debt.propertyValue > 0
      ? Math.round((debt.balance / debt.propertyValue) * 100)
      : null;

  const getTypeLabel = () => {
    switch (debt.type) {
      case "mortgage":
        return "Kredyt hipoteczny";
      case "credit_card":
        return "Karta kredytowa";
      case "cash_loan":
        return "Kredyt gotówkowy";
      case "revolving":
        return "Limit odnawialny";
      case "bnpl":
        return "Raty 0% / BNPL";
      default:
        return "Zobowiązanie";
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15 }}
          className="bg-surface border border-border w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="debt-details-modal-title"
        >
          {/* Top Header */}
          <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between shrink-0 bg-surface-2/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
                <Home className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="debt-details-modal-title" className="text-lg sm:text-xl font-bold text-text-main truncate">
                    {debt.name}
                  </h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-brand-subtle text-brand border border-brand/20">
                    {getTypeLabel()}
                  </span>
                  {debt.status === "closed" && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-surface-2 text-text-muted border border-border">
                      Zamknięte
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted truncate">
                  {debt.institution} • Saldo: {formatMoney(debt.balance, currency)} • Rata:{" "}
                  {formatMoney(debt.monthlyPayment, currency)}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-full transition cursor-pointer"
              aria-label="Zamknij szczegóły"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Internal Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 px-5 sm:px-6 border-b border-border bg-surface-2/20 overflow-x-auto custom-scrollbar shrink-0">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "overview"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              Przegląd
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              <span>Historia płatności</span>
              {activity.items.length > 0 && (
                <span className="text-[10px] bg-brand-subtle text-brand px-1.5 py-0.5 rounded-full font-bold">
                  {activity.items.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("schedule")}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "schedule"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              Harmonogram spłat
            </button>

            {(debt.type === "mortgage" || debt.type === "cash_loan" || debt.type === "bnpl" || debt.type === "other") && (
              <button
                onClick={() => setActiveTab("overpayment")}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === "overpayment"
                    ? "border-brand text-brand"
                    : "border-transparent text-text-muted hover:text-text-main"
                }`}
              >
                Symulacja nadpłaty
              </button>
            )}

            {debt.type === "mortgage" && (
              <button
                onClick={() => setActiveTab("refinance")}
                className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === "refinance"
                    ? "border-brand text-brand"
                    : "border-transparent text-text-muted hover:text-text-main"
                }`}
              >
                Refinansowanie (Podgląd)
              </button>
            )}

            <button
              onClick={() => setActiveTab("terms")}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "terms"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              Warunki i parametry
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6 animate-fade-in">
                {/* KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-surface-2/60 border border-border">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                      Pozostały kapitał
                    </span>
                    <span className="text-lg sm:text-xl font-black text-text-main tabular-nums">
                      {formatMoney(debt.balance, currency)}
                    </span>
                    {debt.originalAmount && (
                      <span className="text-[10px] text-text-muted block mt-0.5">
                        z {formatMoney(debt.originalAmount, currency)}
                      </span>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-2/60 border border-border">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                      Bieżąca rata
                    </span>
                    <span className="text-lg sm:text-xl font-black text-text-main tabular-nums">
                      {formatMoney(debt.monthlyPayment, currency)}
                    </span>
                    <span className="text-[10px] text-text-muted block mt-0.5">miesięcznie</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-2/60 border border-border">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                      Oprocentowanie / APR
                    </span>
                    <span className="text-lg sm:text-xl font-black text-brand tabular-nums">
                      {debt.interestRate.toFixed(2)}%
                    </span>
                    <span className="text-[10px] text-text-muted block mt-0.5">
                      {debt.rateType === "fixed" ? "Stała stopa" : "Stawka zmienna"}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-2/60 border border-border">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                      Wskaźnik LTV
                    </span>
                    <span className="text-lg sm:text-xl font-black text-text-main tabular-nums">
                      {ltv !== null ? `${ltv}%` : "—"}
                    </span>
                    <span className="text-[10px] text-text-muted block mt-0.5">
                      {debt.propertyValue ? `Wartość: ${formatMoney(debt.propertyValue, currency)}` : "Brak wyceny"}
                    </span>
                  </div>
                </div>

                {/* SPRINT 40 & 42: Repayment Progress & Milestone Strip with Forecast */}
                {debt.originalAmount && debt.originalAmount > 0 && debt.type !== "credit_card" && debt.type !== "revolving" && (() => {
                  const repaymentProgress = calculateDebtRepaymentProgress(debt);
                  const paidRatio = repaymentProgress.repaidPercent;
                  const forecast = calculateNextDebtMilestoneForecast(debt);
                  return (
                    <div
                      className="p-5 bg-surface border border-border rounded-2xl"
                      aria-label={`Postęp spłaty kapitału: ${paidRatio}%. ${
                        repaymentProgress.isComplete
                          ? "Dług spłacony."
                          : repaymentProgress.currentMilestone
                          ? `Osiągnięto: ${repaymentProgress.currentMilestone}%. Następny kamień: ${repaymentProgress.nextMilestone}%.`
                          : `Następny kamień: ${repaymentProgress.nextMilestone}%.`
                      }${forecast ? ` Szacowane osiągnięcie progu ${forecast.nextMilestone}%: ${formatMilestoneForecastDate(forecast.estimatedDate)}.` : ""}`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold mb-2 flex-wrap gap-2">
                        <span className="text-text-faint uppercase tracking-wider text-[11px]">
                          Postęp spłaty kapitału
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {repaymentProgress.isComplete ? (
                            <span className="text-[11px] font-bold text-success bg-success-subtle px-2 py-0.5 rounded-md border border-success/20">
                              Dług spłacony
                            </span>
                          ) : forecast ? (
                            <span className="text-[11px] font-medium text-text-muted">
                              Kolejny próg: <strong className="text-text-main">{forecast.nextMilestone}%</strong> (szac. {formatMilestoneForecastDate(forecast.estimatedDate)})
                            </span>
                          ) : repaymentProgress.nextMilestone ? (
                            <span className="text-[11px] font-medium text-text-muted">
                              Następny kamień: <strong className="text-text-main">{repaymentProgress.nextMilestone}%</strong>
                            </span>
                          ) : null}
                          <span className="text-brand font-bold text-sm tabular-nums">{paidRatio}% spłacone</span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-surface-offset rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full transition-all duration-500"
                          style={{ width: `${paidRatio}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2.5" role="group" aria-label="Kamienie milowe spłaty">
                        {DEBT_REPAYMENT_MILESTONES.map((milestone) => {
                          const isReached = repaymentProgress.reachedMilestones.includes(milestone);
                          return (
                            <span
                              key={milestone}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-colors ${
                                isReached
                                  ? "bg-brand-subtle text-brand border-brand/20"
                                  : "bg-surface-2/60 text-text-faint border-border/50"
                              }`}
                              title={`Kamień milowy ${milestone}%: ${isReached ? "Osiągnięty" : "Do osiągnięcia"}`}
                              aria-label={`Kamień milowy ${milestone}%: ${isReached ? "osiągnięty" : "nieosiągnięty"}`}
                            >
                              {isReached && <Check className="w-3 h-3" />}
                              <span>{milestone}%</span>
                            </span>
                          );
                        })}
                      </div>

                      {/* SPRINT 43: Overpayment Impact Preview */}
                      {forecast && (
                        <div className="mt-4 pt-3 border-t border-border/50">
                          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                            <span className="text-[11px] font-bold text-text-muted">
                              Wpływ nadpłaty na kolejny próg ({forecast.nextMilestone}%):
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {[250, 500, 1000].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setHypotheticalOverpayment(String(preset))}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer border ${
                                    hypotheticalOverpayment === String(preset)
                                      ? "bg-brand text-white border-brand shadow-xs"
                                      : "bg-surface-2/60 text-text-muted hover:text-text-main border-border/60 hover:border-brand/40"
                                  }`}
                                >
                                  +{preset} {currency}
                                </button>
                              ))}
                              <div className="relative inline-flex items-center">
                                <input
                                  type="number"
                                  min="1"
                                  step="50"
                                  placeholder="Własna kwota"
                                  value={hypotheticalOverpayment}
                                  onChange={(e) => setHypotheticalOverpayment(e.target.value)}
                                  className="w-24 px-2 py-0.5 text-[10px] rounded border border-border/60 bg-surface-2/40 text-text-main placeholder:text-text-faint focus:outline-none focus:border-brand"
                                  aria-label="Własna kwota hipotetycznej nadpłaty"
                                />
                                {hypotheticalOverpayment && (
                                  <button
                                    type="button"
                                    onClick={() => setHypotheticalOverpayment("")}
                                    className="ml-1 text-[10px] text-text-faint hover:text-text-main cursor-pointer"
                                    aria-label="Wyczyść kwotę nadpłaty"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          {(() => {
                            const overpaymentVal = parseFloat(hypotheticalOverpayment);
                            if (!overpaymentVal || overpaymentVal <= 0) return null;
                            const impact = calculateDebtMilestoneOverpaymentImpact(debt, overpaymentVal);
                            if (!impact) return null;

                            return (
                              <div className="space-y-2 mt-2">
                                {impact.isImmediateCompletion ? (
                                  <div className="text-[11px] font-medium text-success bg-success-subtle/50 px-2.5 py-1.5 rounded-lg border border-success/20">
                                    Nadpłata <strong>{formatMoney(overpaymentVal, currency)}</strong> pozwoli całkowicie spłacić dług już teraz!
                                  </div>
                                ) : impact.isImmediateAchievement ? (
                                  <div className="text-[11px] font-medium text-brand bg-brand-subtle/50 px-2.5 py-1.5 rounded-lg border border-brand/20">
                                    Nadpłata <strong>{formatMoney(overpaymentVal, currency)}</strong> pozwoli osiągnąć próg <strong>{impact.nextMilestone}%</strong> od razu.
                                  </div>
                                ) : impact.monthsAccelerated > 0 ? (
                                  <div className="text-[11px] font-medium text-text-main bg-surface-2/60 px-2.5 py-1.5 rounded-lg border border-border/60">
                                    Nadpłata <strong>{formatMoney(overpaymentVal, currency)}</strong> przyspieszy próg <strong>{impact.nextMilestone}%</strong> o <strong>{impact.monthsAccelerated} mies.</strong> (szac. <strong>{formatMilestoneForecastDate(impact.adjustedEstimatedDate)}</strong> zamiast {formatMilestoneForecastDate(impact.baselineEstimatedDate)}).
                                  </div>
                                ) : (
                                  <div className="text-[11px] font-medium text-text-faint bg-surface-2/40 px-2.5 py-1.5 rounded-lg border border-border/40">
                                    Ta nadpłata nie zmienia szacowanego terminu kolejnego progu.
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                                  <span className="text-[10px] text-text-faint">
                                    Przejdź do pełnej symulacji tej nadpłaty:
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onOpenOverpaymentModal?.(debt, overpaymentVal)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-brand text-white hover:bg-brand-hover transition cursor-pointer shadow-xs"
                                    aria-label={`Otwórz pełny symulator nadpłaty dla kwoty ${overpaymentVal} ${currency}`}
                                  >
                                    <span>Otwórz pełny symulator</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Capital vs Interest breakdown */}
                {debt.monthlyPayment > 0 && debt.interestRate > 0 && (
                  <div className="p-5 bg-surface border border-border rounded-2xl">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-faint mb-3">
                      Struktura najbliższej raty: Kapitał vs Odsetki
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-text-muted">Część odsetkowa ({interestPct}%)</span>
                          <span className="text-danger">{formatMoney(currentInterestPortion, currency)}</span>
                        </div>
                        <div className="w-full h-3 bg-surface-offset rounded-full overflow-hidden">
                          <div
                            className="h-full bg-danger/80 rounded-full transition-all"
                            style={{ width: `${interestPct}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-text-muted">Część kapitałowa ({principalPct}%)</span>
                          <span className="text-brand">{formatMoney(currentPrincipalPortion, currency)}</span>
                        </div>
                        <div className="w-full h-3 bg-surface-offset rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand rounded-full transition-all"
                            style={{ width: `${principalPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes or Key Insights */}
                {debt.notes && (
                  <div className="p-4 bg-surface-2 border border-border rounded-2xl text-xs text-text-muted">
                    <span className="font-bold text-text-main block mb-1">Notatki do umowy:</span>
                    <p>{debt.notes}</p>
                  </div>
                )}

                {/* SPRINT 77: Linked Transactions History */}
                <div className="p-5 bg-surface border border-border rounded-2xl">
                  <h4 className="text-sm font-bold text-text-main mb-1">
                    Powiązane transakcje
                  </h4>
                  <p className="text-xs text-text-muted mb-4">
                    To historia transakcji ręcznie powiązanych z tym zobowiązaniem. Nie aktualizuje automatycznie jego salda ani harmonogramu spłaty.
                  </p>
                  
                  {linkedTransactions.length === 0 ? (
                    <div className="p-4 bg-surface-2 border border-border rounded-xl text-center">
                      <p className="text-xs text-text-main font-medium">Brak transakcji powiązanych z tym zobowiązaniem.</p>
                      <p className="text-[11px] text-text-muted mt-1">
                        Możesz powiązać wydatek z tym długiem podczas dodawania lub edycji transakcji.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {linkedTransactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-3 bg-surface-2 border border-border rounded-xl hover:bg-surface-hover transition-colors">
                          <div className="min-w-0 flex-1 pr-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-text-main truncate">
                                {tx.name || "Transakcja bez opisu"}
                              </span>
                              {tx.category && (
                                <span className="text-[10px] bg-surface border border-border px-1.5 py-0.5 rounded-md text-text-muted truncate">
                                  {tx.category}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-text-faint">
                              {tx.isoDate}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-sm font-bold text-text-main tabular-nums block">
                                {formatMoney(tx.amount, tx.currency || debt.currency || "PLN")}
                              </span>
                            </div>
                            
                            {onOpenTxModal && (
                              <button
                                onClick={() => onOpenTxModal(tx)}
                                className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface rounded-lg transition-colors border border-transparent hover:border-border cursor-pointer"
                                aria-label={`Edytuj transakcję ${tx.name || "bez opisu"}`}
                                title="Edytuj transakcję"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: PAYMENT HISTORY */}
            {activeTab === "history" && (
              <div className="space-y-6 animate-fade-in">
                {activity.items.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-3xl bg-surface-2/40 border border-border flex flex-col items-center justify-center max-w-lg mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-surface-3 flex items-center justify-center text-text-muted mb-3">
                      <Clock className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-text-main mb-1">
                      Brak powiązanych płatności
                    </h4>
                    <p className="text-xs text-text-muted text-center max-w-sm mb-4 leading-relaxed">
                      Brak powiązanej transakcji z tym długiem. Płatności przypisane do tego długu pojawią się tutaj. Możesz połączyć istniejącą transakcję z księgowości.
                    </p>
                    {onUpdateTransaction && (
                      <button
                        type="button"
                        id="btn-link-transaction-empty"
                        onClick={() => {
                          setSelectedTxToLink(null);
                          setLinkSearchQuery("");
                          setIsLinkModalOpen(true);
                        }}
                        className="px-4 py-2 bg-brand text-text-inverse rounded-xl font-bold text-xs hover:bg-brand-hover transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Połącz z istniejącą transakcją</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Header with Title & Scope Toggle */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
                      <div>
                        <h3 className="text-sm font-bold text-text-main">Podsumowanie płatności</h3>
                        <p className="text-xs text-text-muted">
                          {summaryScope === "all"
                            ? (historyPeriodPreset === "all"
                                ? "Podsumowanie całej zarejestrowanej historii"
                                : `Podsumowanie ostatnich ${historyPeriodPreset === "last_3_months" ? "3" : historyPeriodPreset === "last_6_months" ? "6" : "12"} miesięcy`)
                            : (historyPeriodPreset === "all"
                                ? "Podsumowanie widocznych płatności"
                                : `Podsumowanie widocznych płatności z ostatnich ${historyPeriodPreset === "last_3_months" ? "3" : historyPeriodPreset === "last_6_months" ? "6" : "12"} miesięcy`)}
                        </p>
                      </div>

                      {/* Scope Toggle Control */}
                      <div className="inline-flex p-0.5 rounded-xl bg-surface-2 border border-border shrink-0 text-xs font-bold" role="group" aria-label="Zakres podsumowania">
                        <button
                          type="button"
                          onClick={() => setSummaryScope("all")}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            summaryScope === "all"
                              ? "bg-surface shadow-xs text-brand font-bold"
                              : "text-text-muted hover:text-text-main"
                          }`}
                        >
                          Cała historia
                        </button>
                        <button
                          type="button"
                          onClick={() => setSummaryScope("filtered")}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            summaryScope === "filtered"
                              ? "bg-surface shadow-xs text-brand font-bold"
                              : "text-text-muted hover:text-text-main"
                          }`}
                        >
                          Widoczne po filtrach
                        </button>
                      </div>
                    </div>

                    {/* Summary Cards or Empty Scoped Summary */}
                    {summaryScope === "filtered" && !activeInsights.hasData ? (
                      <div className="p-6 bg-surface-2/40 border border-border rounded-2xl text-center space-y-2">
                        <p className="text-xs font-bold text-text-main">
                          Brak widocznych płatności do podsumowania.
                        </p>
                        <p className="text-[11px] text-text-muted">
                          Zmień lub wyczyść filtry, aby zobaczyć podsumowanie widocznych wpłat.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                          <div className="p-3 rounded-xl bg-surface-2/60 border border-border">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                              Liczba wpłat
                            </span>
                            <span className="text-sm sm:text-base font-black text-text-main tabular-nums">
                              {activeInsights.paymentCount}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-surface-2/60 border border-border">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                              Suma wpłat
                            </span>
                            <span className="text-sm sm:text-base font-black text-text-main tabular-nums">
                              {formatMoney(activeInsights.totalPaid, currency)}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-surface-2/60 border border-border">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                              Średnia wpłata
                            </span>
                            <span className="text-sm sm:text-base font-black text-text-main tabular-nums">
                              {formatMoney(activeInsights.averagePayment, currency)}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-surface-2/60 border border-border">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                              Spłacony kapitał
                            </span>
                            <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatMoney(activeInsights.totalPrincipal, currency)}
                            </span>
                            <span className="text-[10px] text-text-muted block mt-0.5">
                              {activeInsights.principalSharePct}% sumy wpłat
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-surface-2/60 border border-border">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                              Część odsetkowa
                            </span>
                            <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 tabular-nums">
                              {formatMoney(activeInsights.totalInterest, currency)}
                            </span>
                            <span className="text-[10px] text-text-muted block mt-0.5">
                              {activeInsights.interestSharePct}% sumy wpłat
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-surface-2/60 border border-border">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                              {summaryScope === "all" ? "Ostatnia wpłata" : "Najnowsza widoczna wpłata"}
                            </span>
                            <span className="text-sm sm:text-base font-black text-brand tabular-nums">
                              {activeInsights.latestPayment ? formatMoney(activeInsights.latestPayment.paymentAmount, currency) : "—"}
                            </span>
                            {activeInsights.latestPayment && (
                              <span className="text-[10px] text-text-muted block mt-0.5 font-mono">
                                {activeInsights.latestPayment.date}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Factual Insights Callouts */}
                        <div className="p-3.5 bg-surface-2/40 border border-border rounded-xl space-y-1.5 text-xs text-text-muted">
                          {activeInsights.hasPrincipalReduction && (
                            <p className="flex items-center gap-1.5 text-text-main font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>W {summaryScope === "all" ? "zarejestrowanej historii" : "widocznych płatnościach"} część kapitałowa wynosi <strong>{activeInsights.principalSharePct}%</strong> wpłat ({activeInsights.principalReductionCount} z {activeInsights.paymentCount} płatności pomniejszyło kapitał).</span>
                            </p>
                          )}
                          {activeInsights.latestPaymentCoveredInterestOnly && (
                            <p className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                              <Info className="w-3.5 h-3.5 shrink-0" />
                              <span>{summaryScope === "all" ? "Ostatnia zarejestrowana płatność" : "Najnowsza widoczna płatność"} pokryła wyłącznie odsetki.</span>
                            </p>
                          )}
                          {activeInsights.historyCompleteness === "partial" && (
                            <p className="text-[11px] text-text-faint italic">
                              Podsumowanie jest oparte na dostępnych transakcjach powiązanych z tym długiem. Niektóre dane historyczne mogą być niepełne.
                            </p>
                          )}
                          <p className="text-[11px] text-text-faint flex items-center gap-1">
                            <Info className="w-3 h-3 text-text-muted shrink-0" />
                            <span>Analiza dotyczy {summaryScope === "all" ? "zarejestrowanych transakcji" : "aktualnie widocznych transakcji"} powiązanych z tym długiem. Bieżące saldo pochodzi z danych długu: <strong>{formatMoney(debt.balance, currency)}</strong>.</span>
                          </p>
                        </div>
                      </>
                    )}

                    {/* SECTION: TREND SNAPSHOT */}
                    {trendSnapshot.hasData ? (
                      <div className="space-y-3 p-4 bg-surface-2/40 border border-border rounded-2xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-border">
                          <div>
                            <h4 className="text-xs font-bold text-text-main">
                              Rozkład zarejestrowanych płatności
                            </h4>
                            <p className="text-[11px] text-text-muted">
                              {summaryScope === "all"
                                ? (historyPeriodPreset === "all"
                                    ? "Rozkład miesięczny całej zarejestrowanej historii"
                                    : `Rozkład miesięczny (ostatnie ${historyPeriodPreset === "last_3_months" ? "3" : historyPeriodPreset === "last_6_months" ? "6" : "12"} miesiące)`)
                                : (historyPeriodPreset === "all"
                                    ? "Rozkład miesięczny widocznych płatności"
                                    : `Rozkład miesięczny widocznych płatności (ostatnie ${historyPeriodPreset === "last_3_months" ? "3" : historyPeriodPreset === "last_6_months" ? "6" : "12"} miesiące)`)}
                            </p>
                          </div>
                          <span className="text-[11px] font-medium text-text-muted">
                            Okresy: {trendSnapshot.periodCount} ({trendSnapshot.periods[0]?.label} – {trendSnapshot.periods[trendSnapshot.periods.length - 1]?.label})
                          </span>
                        </div>

                        {/* List of Periods */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {trendSnapshot.periods.map((period) => (
                            <div
                              key={period.periodKey}
                              className="p-3 bg-surface border border-border rounded-xl space-y-2 shadow-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-text-main">
                                  {period.label}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-surface-3 text-text-muted border border-border">
                                  {period.paymentCount === 1 ? "1 wpłata" : `${period.paymentCount} wpłaty`}
                                </span>
                              </div>

                              <div className="text-sm font-black text-text-main tabular-nums">
                                {formatMoney(period.totalPaid, currency)}
                              </div>

                              {/* Breakdown bars & values */}
                              <div className="space-y-1">
                                <div
                                  className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden flex"
                                  role="progressbar"
                                  aria-label={`Rozkład wpłat w ${period.label}: kapitał ${period.principalSharePct}%, odsetki ${period.interestSharePct}%`}
                                  aria-valuenow={period.principalSharePct}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                >
                                  <div
                                    className="bg-emerald-500 h-full transition-all"
                                    style={{ width: `${period.principalSharePct}%` }}
                                  />
                                  <div
                                    className="bg-amber-500 h-full transition-all"
                                    style={{ width: `${period.interestSharePct}%` }}
                                  />
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-text-muted tabular-nums">
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    Kapitał: {formatMoney(period.totalPrincipal, currency)} ({period.principalSharePct}%)
                                  </span>
                                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                                    Odsetki: {formatMoney(period.totalInterest, currency)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {trendSnapshot.historyCompleteness === "partial" && (
                          <p className="text-[10px] text-text-faint italic">
                            Trend opiera się na dostępnych datach zarejestrowanych płatności.
                          </p>
                        )}
                      </div>
                    ) : summaryScope === "filtered" ? (
                      <div className="p-4 bg-surface-2/40 border border-border rounded-xl text-center">
                        <p className="text-xs text-text-muted">
                          Brak widocznych płatności do przedstawienia na osi czasu.
                        </p>
                      </div>
                    ) : null}

                    {/* SECTION: PERIOD COMPARISON */}
                    {historyPeriodPreset === "all" ? (
                      <div className="p-3 bg-surface-2/30 border border-border/80 rounded-xl text-center space-y-1">
                        <p className="text-xs font-semibold text-text-main">
                          Pokrycie danych porównawczych
                        </p>
                        <p className="text-xs text-text-muted">
                          Wybierz okres 3, 6 lub 12 miesięcy, aby ocenić dostępność danych porównawczych i zobaczyć porównanie z poprzednim okresem.
                        </p>
                      </div>
                    ) : comparisonSnapshot.available ? (
                      <div className="space-y-3 p-4 bg-surface-2/40 border border-border rounded-2xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-border">
                          <div>
                            <h4 className="text-xs font-bold text-text-main">
                              Porównanie z poprzednim okresem
                            </h4>
                            <p className="text-[11px] text-text-muted">
                              {summaryScope === "all"
                                ? "Bieżący okres vs poprzednie okno o tej samej długości"
                                : "Porównanie widocznych płatności w dwóch kolejnych okresach"}
                            </p>
                          </div>
                          <span className="text-[11px] font-medium text-text-muted">
                            {comparisonSnapshot.currentPeriodLabel} vs {comparisonSnapshot.previousPeriodLabel}
                          </span>
                        </div>

                        {/* Comparison Metric Cards / Badges */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          {/* Payment count */}
                          <div className="p-3 bg-surface border border-border rounded-xl space-y-1 shadow-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block">
                              Liczba wpłat
                            </span>
                            <div className="text-sm font-black text-text-main tabular-nums">
                              {comparisonSnapshot.currentPaymentCount} vs {comparisonSnapshot.previousPaymentCount}
                            </div>
                            <div className="text-[11px] font-semibold text-text-muted flex items-center gap-1">
                              <span>
                                różnica: {comparisonSnapshot.paymentCount.delta >= 0 ? `+${comparisonSnapshot.paymentCount.delta}` : comparisonSnapshot.paymentCount.delta}
                              </span>
                              {comparisonSnapshot.paymentCount.deltaPct !== null && (
                                <span className="text-text-faint">
                                  ({comparisonSnapshot.paymentCount.deltaPct >= 0 ? `+${comparisonSnapshot.paymentCount.deltaPct}` : comparisonSnapshot.paymentCount.deltaPct}%)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Total paid */}
                          <div className="p-3 bg-surface border border-border rounded-xl space-y-1 shadow-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block">
                              Suma wpłat
                            </span>
                            <div className="text-sm font-black text-text-main tabular-nums">
                              {formatMoney(comparisonSnapshot.currentTotalPaid, currency)}
                            </div>
                            <div className="text-[11px] font-semibold text-text-muted flex items-center gap-1">
                              <span>
                                vs {formatMoney(comparisonSnapshot.previousTotalPaid, currency)} · {comparisonSnapshot.totalPaid.delta >= 0 ? `+${formatMoney(comparisonSnapshot.totalPaid.delta, currency)}` : formatMoney(comparisonSnapshot.totalPaid.delta, currency)}
                              </span>
                              {comparisonSnapshot.totalPaid.deltaPct !== null && (
                                <span className="text-text-faint">
                                  ({comparisonSnapshot.totalPaid.deltaPct >= 0 ? `+${comparisonSnapshot.totalPaid.deltaPct}` : comparisonSnapshot.totalPaid.deltaPct}%)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Principal */}
                          <div className="p-3 bg-surface border border-border rounded-xl space-y-1 shadow-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block">
                              Spłacony kapitał
                            </span>
                            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                              {formatMoney(comparisonSnapshot.currentTotalPrincipal, currency)}
                            </div>
                            <div className="text-[11px] font-semibold text-text-muted flex items-center gap-1">
                              <span>
                                vs {formatMoney(comparisonSnapshot.previousTotalPrincipal, currency)} · {comparisonSnapshot.totalPrincipal.delta >= 0 ? `+${formatMoney(comparisonSnapshot.totalPrincipal.delta, currency)}` : formatMoney(comparisonSnapshot.totalPrincipal.delta, currency)}
                              </span>
                            </div>
                          </div>

                          {/* Interest & Principal share */}
                          <div className="p-3 bg-surface border border-border rounded-xl space-y-1 shadow-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block">
                              Udział kapitału
                            </span>
                            <div className="text-sm font-black text-brand tabular-nums">
                              {comparisonSnapshot.currentPrincipalSharePct !== null ? `${comparisonSnapshot.currentPrincipalSharePct}%` : "—"}
                            </div>
                            <div className="text-[11px] font-semibold text-text-muted">
                              {comparisonSnapshot.previousPrincipalSharePct !== null ? (
                                <span>
                                  vs {comparisonSnapshot.previousPrincipalSharePct}% · różnica {comparisonSnapshot.principalShareDeltaPctPoints !== null && comparisonSnapshot.principalShareDeltaPctPoints >= 0 ? `+${comparisonSnapshot.principalShareDeltaPctPoints}` : comparisonSnapshot.principalShareDeltaPctPoints} pp
                                </span>
                              ) : (
                                <span>Brak danych z poprzedniego okresu</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Coverage Hint */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-surface rounded-xl border border-border text-xs text-text-muted">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-text-main">Pokrycie danych:</span>
                            <span>{coverageSnapshot.note}</span>
                          </div>
                          {coverageSnapshot.status === "available" && (
                            <span className="text-[11px] text-text-faint shrink-0">
                              Bieżący: {coverageSnapshot.currentRegisteredPaymentCount} wpłat ({coverageSnapshot.currentRegisteredMonthCount}/{coverageSnapshot.currentExpectedMonthCount} mies.) · Poprzedni: {coverageSnapshot.previousRegisteredPaymentCount} wpłat ({coverageSnapshot.previousRegisteredMonthCount}/{coverageSnapshot.previousExpectedMonthCount} mies.)
                            </span>
                          )}
                        </div>

                        {comparisonSnapshot.previousPaymentCount === 0 && comparisonSnapshot.currentPaymentCount > 0 && (
                          <p className="text-[10px] text-text-faint italic">
                            Brak zarejestrowanych płatności w poprzednim okresie — zmiana procentowa niedostępna.
                          </p>
                        )}
                        {comparisonSnapshot.historyCompleteness === "partial" && comparisonSnapshot.previousPaymentCount > 0 && (
                          <p className="text-[10px] text-text-faint italic">
                            Porównanie dotyczy wyłącznie zarejestrowanych płatności.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-surface-2/40 border border-border rounded-xl text-center">
                        <p className="text-xs text-text-muted">
                          Brak widocznych płatności do porównania.
                        </p>
                      </div>
                    )}

                    {/* Timeline Filter Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface-2/60 border border-border rounded-xl">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Period Preset Filter */}
                        <div className="flex items-center gap-1.5">
                          <label htmlFor="history-period-filter" className="text-[11px] font-bold text-text-muted">
                            Okres:
                          </label>
                          <select
                            id="history-period-filter"
                            value={historyPeriodPreset}
                            onChange={(e) => setHistoryPeriodPreset(e.target.value as DebtPaymentHistoryPeriodPreset)}
                            className="bg-surface border border-border rounded-lg text-xs font-semibold text-text-main py-1 px-2.5 focus:ring-1 focus:ring-brand focus:border-brand cursor-pointer"
                          >
                            <option value="all">Cała historia</option>
                            <option value="last_3_months">Ostatnie 3 miesiące</option>
                            <option value="last_6_months">Ostatnie 6 miesięcy</option>
                            <option value="last_12_months">Ostatnie 12 miesięcy</option>
                          </select>
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-1.5">
                          <label htmlFor="history-status-filter" className="text-[11px] font-bold text-text-muted">
                            Status:
                          </label>
                          <select
                            id="history-status-filter"
                            value={historyStatusFilter}
                            onChange={(e) => setHistoryStatusFilter(e.target.value as DebtPaymentHistoryStatusFilter)}
                            className="bg-surface border border-border rounded-lg text-xs font-semibold text-text-main py-1 px-2.5 focus:ring-1 focus:ring-brand focus:border-brand cursor-pointer"
                          >
                            <option value="all">Wszystkie</option>
                            <option value="normal">Rata</option>
                            <option value="insufficient_payment">Częściowa</option>
                            <option value="interest_only">Tylko odsetki</option>
                            <option value="paid_off">Spłacono</option>
                          </select>
                        </div>

                        {/* Principal Filter */}
                        <div className="flex items-center gap-1.5">
                          <label htmlFor="history-principal-filter" className="text-[11px] font-bold text-text-muted">
                            Kapitał:
                          </label>
                          <select
                            id="history-principal-filter"
                            value={historyPrincipalFilter}
                            onChange={(e) => setHistoryPrincipalFilter(e.target.value as DebtPaymentHistoryPrincipalFilter)}
                            className="bg-surface border border-border rounded-lg text-xs font-semibold text-text-main py-1 px-2.5 focus:ring-1 focus:ring-brand focus:border-brand cursor-pointer"
                          >
                            <option value="all">Wszystkie</option>
                            <option value="with_principal">Z kapitałem</option>
                            <option value="without_principal">Bez kapitału</option>
                          </select>
                        </div>

                        {/* Order Selector */}
                        <div className="flex items-center gap-1.5">
                          <label htmlFor="history-order-filter" className="text-[11px] font-bold text-text-muted">
                            Kolejność:
                          </label>
                          <select
                            id="history-order-filter"
                            value={historyOrder}
                            onChange={(e) => setHistoryOrder(e.target.value as DebtPaymentHistoryOrder)}
                            className="bg-surface border border-border rounded-lg text-xs font-semibold text-text-main py-1 px-2.5 focus:ring-1 focus:ring-brand focus:border-brand cursor-pointer"
                          >
                            <option value="newest">Najnowsze</option>
                            <option value="oldest">Najstarsze</option>
                          </select>
                        </div>

                        {/* Reset Filter Button */}
                        {(historyStatusFilter !== "all" || historyPrincipalFilter !== "all" || historyOrder !== "newest") && (
                          <button
                            type="button"
                            onClick={handleResetHistoryFilters}
                            className="text-xs font-bold text-brand hover:underline px-1.5 py-1 cursor-pointer"
                          >
                            Wyczyść filtry
                          </button>
                        )}
                      </div>

                      {/* Action & Count Indicator */}
                      <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap justify-between sm:justify-end w-full sm:w-auto">
                        <div className="text-[11px] font-medium text-text-muted shrink-0">
                          {filteredActivityItems.length === periodActivityItems.length
                            ? (historyPeriodPreset === "all"
                                ? `Wyświetlane: ${periodActivityItems.length} płatności`
                                : `W wybranym okresie: ${periodActivityItems.length} płatności`)
                            : `Wyświetlane: ${filteredActivityItems.length} z ${periodActivityItems.length} płatności`}
                        </div>

                        {filteredActivityItems.length > 0 && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              id="btn-export-history-csv"
                              onClick={handleExportCsv}
                              className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-surface-2 text-text-main hover:bg-surface-3 border border-border transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring"
                              aria-label="Eksport CSV"
                              title="Eksportuj widoczną historię do CSV"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>CSV</span>
                            </button>
                            <button
                              type="button"
                              id="btn-export-history-json"
                              onClick={handleExportJson}
                              className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-surface-2 text-text-main hover:bg-surface-3 border border-border transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring"
                              aria-label="Eksport JSON"
                              title="Eksportuj widoczną historię do JSON"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>JSON</span>
                            </button>
                          </div>
                        )}

                        {onUpdateTransaction && (
                          <button
                            type="button"
                            id="btn-link-transaction"
                            onClick={() => {
                              setSelectedTxToLink(null);
                              setLinkSearchQuery("");
                              setIsLinkModalOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-brand text-text-inverse hover:bg-brand-hover transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Połącz z istniejącą transakcją</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Table of Payments or Filtered/Period Empty State */}
                    {periodActivityItems.length === 0 ? (
                      <div className="p-8 bg-surface-2/40 border border-border rounded-2xl text-center space-y-3">
                        <p className="text-xs font-bold text-text-main">
                          Brak zarejestrowanych płatności w wybranym okresie.
                        </p>
                        <button
                          type="button"
                          onClick={() => setHistoryPeriodPreset("all")}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-surface-3 hover:bg-surface-hover text-text-main border border-border transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          Pokaż całą historię
                        </button>
                      </div>
                    ) : filteredActivityItems.length === 0 ? (
                      <div className="p-8 bg-surface-2/40 border border-border rounded-2xl text-center space-y-3">
                        <p className="text-xs font-bold text-text-main">
                          Brak płatności spełniających wybrane filtry.
                        </p>
                        <button
                          type="button"
                          onClick={handleResetHistoryFilters}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-surface-3 hover:bg-surface-hover text-text-main border border-border transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          Wyczyść filtry
                        </button>
                      </div>
                    ) : (
                      <div className="border border-border rounded-2xl overflow-hidden bg-surface shadow-xs">
                        <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-border bg-surface-2/80 text-[10px] font-bold uppercase tracking-wider text-text-faint">
                                <th className="py-3 px-3.5">Data</th>
                                <th className="py-3 px-3.5">Opis</th>
                                <th className="py-3 px-3.5 text-right">Kwota wpłaty</th>
                                <th className="py-3 px-3.5 text-right">Kapitał</th>
                                <th className="py-3 px-3.5 text-right">Odsetki</th>
                                <th className="py-3 px-3.5 text-right">Saldo po wpłacie</th>
                                <th className="py-3 px-3.5 text-center">Status</th>
                                <th className="py-3 px-3.5 text-center">Powiązanie</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border font-medium text-text-main">
                              {filteredActivityItems.map((item) => (
                                <tr key={item.transactionId} className="hover:bg-surface-2/40 transition-colors">
                                  <td className="py-2.5 px-3.5 text-text-muted font-mono whitespace-nowrap">
                                    {item.date}
                                  </td>
                                  <td className="py-2.5 px-3.5 max-w-[160px] sm:max-w-xs truncate font-semibold">
                                    {item.transactionName || "Spłata długu"}
                                  </td>
                                  <td className="py-2.5 px-3.5 text-right font-bold tabular-nums whitespace-nowrap">
                                    {formatMoney(item.paymentAmount, currency)}
                                  </td>
                                  <td className="py-2.5 px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                                    {formatMoney(item.principalAmount, currency)}
                                  </td>
                                  <td className="py-2.5 px-3.5 text-right text-text-muted tabular-nums whitespace-nowrap">
                                    {formatMoney(item.interestAmount, currency)}
                                  </td>
                                  <td className="py-2.5 px-3.5 text-right font-bold tabular-nums whitespace-nowrap">
                                    {formatMoney(item.closingBalance, currency)}
                                  </td>
                                  <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                                    {item.isFinalPayment || item.paymentStatus === "paid_off" ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        Spłacono
                                      </span>
                                    ) : item.paymentStatus === "interest_only" ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                        Tylko odsetki
                                      </span>
                                    ) : item.paymentStatus === "insufficient_payment" ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                        Częściowa
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-3 text-text-muted border border-border">
                                        Rata
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {(() => {
                                        if (!item.transactionId) {
                                          return null;
                                        }
                                        const matchedTx = transactionsMap.get(item.transactionId);
                                        if (matchedTx) {
                                          return onOpenTxModal ? (
                                            <button
                                              type="button"
                                              onClick={() => onOpenTxModal(matchedTx)}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-subtle text-brand border border-brand/20 hover:bg-brand-subtle/80 hover:border-brand/40 active:scale-[0.98] transition-all cursor-pointer"
                                              aria-label={matchedTx.name ? `Zobacz szczegóły transakcji: ${matchedTx.name}` : "Zobacz szczegóły transakcji"}
                                              title={`Źródło transakcji: ${matchedTx.name || item.transactionName || "Transakcja"}`}
                                            >
                                              <Link2 className="w-3 h-3" />
                                              <span>Powiązana transakcja</span>
                                            </button>
                                          ) : (
                                            <span
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-subtle text-brand border border-brand/20"
                                              title={`Źródło transakcji: ${matchedTx.name || item.transactionName || "Transakcja"}`}
                                            >
                                              <Link2 className="w-3 h-3" />
                                              <span>Powiązana transakcja</span>
                                            </span>
                                          );
                                        }
                                        return (
                                          <span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-2 text-text-muted border border-border"
                                            title="Powiązana transakcja niedostępna"
                                          >
                                            <Link2 className="w-3 h-3 text-text-faint" />
                                            <span>Powiązana transakcja niedostępna</span>
                                          </span>
                                        );
                                      })()}

                                      {onUpdateTransaction && item.transactionId && (
                                        <button
                                          type="button"
                                          onClick={() => setTxToUnlink(item)}
                                          aria-label={`Odłącz transakcję ${item.transactionName || "płatność"}`}
                                          title="Odłącz transakcję"
                                          className="p-1 rounded-lg text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                                        >
                                          <Unlink className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SCHEDULE */}
            {activeTab === "schedule" && (
              <div className="space-y-4 animate-fade-in">
                {!amortization.isEligible ? (
                  <div className="p-6 bg-surface-2/60 border border-border rounded-2xl text-center flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center border border-border text-text-muted">
                      <Info className="w-6 h-6" />
                    </div>
                    <div className="max-w-md space-y-1">
                      <h4 className="text-sm font-bold text-text-main">
                        Harmonogram niedostępny
                      </h4>
                      <p className="text-xs text-text-muted leading-relaxed">
                        {amortization.errorMessage || "Brak wystarczających parametrów do wygenerowania harmonogramu spłat."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Header & Mode info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
                      <div>
                        <h3 className="text-sm font-bold text-text-main">Harmonogram spłat i analiza kosztu</h3>
                        <p className="text-xs text-text-muted">Szacunek na podstawie podanych danych — orientacyjny plan amortyzacji</p>
                      </div>

                      {amortization.rows.length > 24 && (
                        <button
                          type="button"
                          onClick={() => setShowFullSchedule(!showFullSchedule)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer bg-surface-2 hover:bg-surface-hover text-text-main border border-border shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring"
                        >
                          {showFullSchedule
                            ? "Pokaż 24 miesiące"
                            : `Pokaż pełny harmonogram (${amortization.rows.length} rat)`}
                        </button>
                      )}
                    </div>

                    {/* Summary KPI Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      <div className="p-3 rounded-xl bg-surface-2/50 border border-border">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                          Szacowana rata
                        </span>
                        <span className="text-sm font-black text-text-main tabular-nums">
                          {formatMoney(amortization.estimatedMonthlyPayment, currency)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-2/50 border border-border">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                          Kapitał (1. rata)
                        </span>
                        <span className="text-sm font-black text-brand tabular-nums">
                          {formatMoney(amortization.firstMonthPrincipal, currency)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-2/50 border border-border">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                          Odsetki (1. rata)
                        </span>
                        <span className="text-sm font-black text-danger tabular-nums">
                          {formatMoney(amortization.firstMonthInterest, currency)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-2/50 border border-border">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                          Odsetki łącznie
                        </span>
                        <span className="text-sm font-black text-text-main tabular-nums">
                          {formatMoney(amortization.estimatedTotalInterest, currency)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-2/50 border border-border">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                          Spłata końcowa
                        </span>
                        <span className="text-sm font-black text-text-main tabular-nums">
                          {formatMoney(amortization.estimatedTotalRepayment, currency)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-surface-2/50 border border-border">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-0.5">
                          Pozostały okres
                        </span>
                        <span className="text-sm font-black text-text-main tabular-nums">
                          {amortization.estimatedMonths} mc.
                        </span>
                      </div>
                    </div>

                    {/* Schedule Table */}
                    <div className="overflow-x-auto border border-border rounded-xl">
                      <table className="w-full text-left text-xs" aria-label="Tabela harmonogramu spłat">
                        <thead className="bg-surface-2 text-text-faint font-bold border-b border-border uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Miesiąc</th>
                            <th className="py-2.5 px-3 text-right">Rata</th>
                            <th className="py-2.5 px-3 text-right">Kapitał</th>
                            <th className="py-2.5 px-3 text-right">Odsetki</th>
                            <th className="py-2.5 px-3 text-right">Pozostałe saldo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 font-medium">
                          {(showFullSchedule ? amortization.rows : amortization.rows.slice(0, 24)).map((row) => (
                            <tr key={row.monthIndex} className="hover:bg-surface-hover transition-colors">
                              <td className="py-2.5 px-3 font-bold text-text-main">Miesiąc {row.monthIndex}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-text-main tabular-nums">
                                {formatMoney(row.installment, currency)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-brand font-bold tabular-nums">
                                {formatMoney(row.principal, currency)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-text-muted tabular-nums">
                                {formatMoney(row.interest, currency)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-text-main tabular-nums">
                                {formatMoney(row.balance, currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <p className="text-[11px] text-text-faint text-center leading-relaxed">
                      {showFullSchedule
                        ? `Wyświetlono pełny harmonogram (${amortization.rows.length} rat).`
                        : `Wyświetlono pierwsze ${Math.min(24, amortization.rows.length)} z ${amortization.rows.length} rat.`}{" "}
                      Szacunek na podstawie podanych danych — rzeczywiste wartości mogą różnić się od symulacji.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: OVERPAYMENT */}
            {activeTab === "overpayment" && (
              <div className="space-y-6 animate-fade-in">
                {!overpaymentScenario.isEligible ? (
                  <div className="p-6 bg-surface-2/60 border border-border rounded-2xl text-center flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-surface-2 flex items-center justify-center border border-border text-text-muted">
                      <Info className="w-6 h-6" />
                    </div>
                    <div className="max-w-md space-y-1">
                      <h4 className="text-sm font-bold text-text-main">
                        Symulacja nadpłaty niedostępna
                      </h4>
                      <p className="text-xs text-text-muted leading-relaxed">
                        {overpaymentScenario.errorMessage || "Brak wystarczających parametrów do wygenerowania symulacji nadpłat."}
                      </p>
                    </div>
                  </div>
                ) : isComparingVariants && variantsComparison ? (
                  /* SPRINT 18: OVERPAYMENT VARIANTS COMPARISON VIEW */
                  <div className="space-y-6">
                    {/* Header & Mode Switch */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
                      <div>
                        <h3 className="text-sm font-bold text-text-main">Porównanie wariantów nadpłat</h3>
                        <p className="text-xs text-text-muted">
                          Zestawienie wariantu bazowego z maksymalnie 2 niezależnymi wariantami nadpłat
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                        {comparisonVariants.length < 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              setComparisonVariants((prev) => [
                                ...prev,
                                {
                                  id: `var-${Date.now()}`,
                                  name: "Wariant 2",
                                  monthlyOverpayment: 300,
                                  oneTimeOverpayment: 5000
                                }
                              ]);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand bg-brand-subtle hover:bg-brand hover:text-text-inverse border border-brand/20 rounded-xl transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Dodaj drugi wariant</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setComparisonVariants([
                              { id: "var-1", name: "Nadpłata miesięczna", monthlyOverpayment: 500, oneTimeOverpayment: 0 },
                              { id: "var-2", name: "Nadpłata jednorazowa", monthlyOverpayment: 0, oneTimeOverpayment: 10000 }
                            ]);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-text-muted hover:text-text-main bg-surface-2 hover:bg-surface-hover border border-border rounded-xl transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Wyzeruj warianty</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsComparingVariants(false)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer border bg-surface hover:bg-surface-2 text-text-main border-border"
                        >
                          <Columns className="w-3.5 h-3.5" />
                          <span>Pojedyncza symulacja</span>
                        </button>
                      </div>
                    </div>

                    {/* Variant Configuration Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {comparisonVariants.map((v, index) => (
                        <div key={v.id} className="p-4 bg-surface-2/40 border border-border rounded-2xl space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-subtle text-brand border border-brand/20 shrink-0">
                                Wariant {index + 1}
                              </span>
                              <input
                                type="text"
                                value={v.name}
                                onChange={(e) => {
                                  const newName = e.target.value;
                                  setComparisonVariants((prev) =>
                                    prev.map((item) => (item.id === v.id ? { ...item, name: newName } : item))
                                  );
                                }}
                                className="w-full bg-surface border border-border rounded-lg px-2.5 py-1 text-xs font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring"
                                aria-label={`Nazwa wariantu ${index + 1}`}
                                placeholder={`Wariant ${index + 1}`}
                              />
                            </div>

                            {comparisonVariants.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setComparisonVariants((prev) => prev.filter((item) => item.id !== v.id));
                                }}
                                className="p-1.5 text-text-muted hover:text-danger hover:bg-danger-subtle rounded-lg transition cursor-pointer shrink-0"
                                aria-label={`Usuń wariant ${v.name}`}
                                title="Usuń ten wariant"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <label className="block text-[11px] font-semibold text-text-muted">
                                Miesięcznie ({currency})
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="50"
                                value={v.monthlyOverpayment || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const num = Math.max(0, parseFloat(val) || 0);
                                  setComparisonVariants((prev) =>
                                    prev.map((item) => (item.id === v.id ? { ...item, monthlyOverpayment: num } : item))
                                  );
                                }}
                                className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring"
                                aria-label={`Nadpłata miesięczna dla ${v.name}`}
                                placeholder="0"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[11px] font-semibold text-text-muted">
                                Jednorazowo (1. mc)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="500"
                                value={v.oneTimeOverpayment || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const num = Math.max(0, parseFloat(val) || 0);
                                  setComparisonVariants((prev) =>
                                    prev.map((item) => (item.id === v.id ? { ...item, oneTimeOverpayment: num } : item))
                                  );
                                }}
                                className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring"
                                aria-label={`Jednorazowa nadpłata dla ${v.name}`}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Comparison Matrix Table */}
                    <div className="overflow-x-auto border border-border rounded-2xl bg-surface">
                      <table className="w-full text-left text-xs" aria-label="Tabela porównania wariantów nadpłat">
                        <thead className="bg-surface-2 text-text-faint font-bold border-b border-border uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-3 px-4 min-w-[180px]">Parametr</th>
                            <th className="py-3 px-4 min-w-[150px] bg-surface-2/60">
                              <div className="flex items-center gap-1.5">
                                <span>Wariant bazowy</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface border border-border text-text-muted">
                                  Bez zmian
                                </span>
                              </div>
                            </th>
                            {variantsComparison.variants.map((v, index) => (
                              <th key={v.id} className="py-3 px-4 min-w-[170px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate">{v.name || `Wariant ${index + 1}`}</span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-border/60 font-medium">
                          {/* Row 1: Nadpłata miesięczna */}
                          <tr className="hover:bg-surface-hover transition-colors">
                            <td className="py-2.5 px-4 font-bold text-text-main">Nadpłata miesięczna</td>
                            <td className="py-2.5 px-4 tabular-nums text-text-muted bg-surface-2/30">
                              0 {currency}/mc
                            </td>
                            {variantsComparison.variants.map((v) => (
                              <td key={v.id} className="py-2.5 px-4 tabular-nums font-bold text-text-main">
                                {formatMoney(v.input.monthlyOverpayment, currency)}/mc
                              </td>
                            ))}
                          </tr>

                          {/* Row 2: Nadpłata jednorazowa */}
                          <tr className="hover:bg-surface-hover transition-colors">
                            <td className="py-2.5 px-4 font-bold text-text-main">Nadpłata jednorazowa</td>
                            <td className="py-2.5 px-4 tabular-nums text-text-muted bg-surface-2/30">
                              0 {currency}
                            </td>
                            {variantsComparison.variants.map((v) => (
                              <td key={v.id} className="py-2.5 px-4 tabular-nums font-bold text-text-main">
                                {formatMoney(v.input.oneTimeOverpayment, currency)}
                              </td>
                            ))}
                          </tr>

                          {/* Row 3: Szacowany okres spłaty */}
                          <tr className="hover:bg-surface-hover transition-colors">
                            <td className="py-2.5 px-4 font-bold text-text-main">Szacowany okres spłaty</td>
                            <td className="py-2.5 px-4 tabular-nums font-bold text-text-main bg-surface-2/30">
                              {variantsComparison.baseline.baselineMonths} mc.
                            </td>
                            {variantsComparison.variants.map((v) => (
                              <td key={v.id} className="py-2.5 px-4 tabular-nums font-bold text-text-main">
                                {v.isValid && v.metrics ? `${v.metrics.estimatedMonths} mc.` : "—"}
                              </td>
                            ))}
                          </tr>

                          {/* Row 4: Skrócenie okresu względem bazowego */}
                          <tr className="hover:bg-surface-hover transition-colors">
                            <td className="py-2.5 px-4 font-bold text-text-main">Skrócenie okresu względem bazowego</td>
                            <td className="py-2.5 px-4 text-text-muted bg-surface-2/30">—</td>
                            {variantsComparison.variants.map((v) => (
                              <td key={v.id} className="py-2.5 px-4 tabular-nums font-bold text-brand">
                                {v.isValid && v.metrics && v.metrics.monthsSaved > 0
                                  ? `-${v.metrics.monthsSaved} mc. (~${Math.round((v.metrics.monthsSaved / 12) * 10) / 10} lat)`
                                  : "0 mc."}
                              </td>
                            ))}
                          </tr>

                          {/* Row 5: Szacowane odsetki łącznie */}
                          <tr className="hover:bg-surface-hover transition-colors">
                            <td className="py-2.5 px-4 font-bold text-text-main">Szacowane odsetki łącznie</td>
                            <td className="py-2.5 px-4 tabular-nums font-bold text-text-main bg-surface-2/30">
                              {formatMoney(variantsComparison.baseline.baselineTotalInterest, currency)}
                            </td>
                            {variantsComparison.variants.map((v) => (
                              <td key={v.id} className="py-2.5 px-4 tabular-nums font-bold text-text-main">
                                {v.isValid && v.metrics
                                  ? formatMoney(v.metrics.estimatedTotalInterest, currency)
                                  : "—"}
                              </td>
                            ))}
                          </tr>

                          {/* Row 6: Szacowana oszczędność odsetek */}
                          <tr className="hover:bg-surface-hover transition-colors bg-brand-subtle/10">
                            <td className="py-2.5 px-4 font-bold text-text-main">Szacowana oszczędność odsetek</td>
                            <td className="py-2.5 px-4 text-text-muted bg-surface-2/30">—</td>
                            {variantsComparison.variants.map((v) => (
                              <td key={v.id} className="py-2.5 px-4 tabular-nums font-black text-brand">
                                {v.isValid && v.metrics && v.metrics.interestSavings > 0
                                  ? formatMoney(v.metrics.interestSavings, currency)
                                  : "0 zł"}
                              </td>
                            ))}
                          </tr>

                          {/* Row 7: Szacowana całkowita spłata */}
                          <tr className="hover:bg-surface-hover transition-colors">
                            <td className="py-2.5 px-4 font-bold text-text-main">Szacowana całkowita spłata</td>
                            <td className="py-2.5 px-4 tabular-nums font-bold text-text-main bg-surface-2/30">
                              {formatMoney(variantsComparison.baseline.baselineTotalRepayment, currency)}
                            </td>
                            {variantsComparison.variants.map((v) => (
                              <td key={v.id} className="py-2.5 px-4 tabular-nums font-bold text-text-main">
                                {v.isValid && v.metrics
                                  ? formatMoney(v.metrics.estimatedTotalRepayment, currency)
                                  : "—"}
                              </td>
                            ))}
                          </tr>

                          {/* Row 8: Różnica całkowitej spłaty */}
                          <tr className="hover:bg-surface-hover transition-colors">
                            <td className="py-2.5 px-4 font-bold text-text-main">Różnica całkowitej spłaty</td>
                            <td className="py-2.5 px-4 text-text-muted bg-surface-2/30">—</td>
                            {variantsComparison.variants.map((v) => (
                              <td key={v.id} className="py-2.5 px-4 tabular-nums font-bold text-brand">
                                {v.isValid && v.metrics && v.metrics.repaymentDifference > 0
                                  ? `-${formatMoney(v.metrics.repaymentDifference, currency)}`
                                  : "0 zł"}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p className="text-[11px] text-text-faint text-center leading-relaxed">
                      Szacunek na podstawie podanych danych — orientacyjne porównanie wariantów nadpłat. Rzeczywiste wartości mogą różnić się w zależności od regulaminu i dat księgowania w banku.
                    </p>
                  </div>
                ) : (
                  /* SINGLE DEBT OVERPAYMENT SIMULATOR VIEW (Sprint 17) */
                  <div className="space-y-6">
                    {/* Header & Description */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
                      <div>
                        <h3 className="text-sm font-bold text-text-main">Symulacja wpływu nadpłaty</h3>
                        <p className="text-xs text-text-muted">
                          Orientacyjny wpływ nadpłaty miesięcznej lub jednorazowej na czas trwania umowy i całkowity koszt odsetek
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setIsComparingVariants(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer border bg-surface hover:bg-surface-2 text-text-main border-border shadow-2xs"
                        >
                          <Columns className="w-3.5 h-3.5 text-brand" />
                          <span>Porównaj warianty nadpłat</span>
                        </button>

                        {(simMonthlyOverpayment || simOneTimeOverpayment) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSimMonthlyOverpayment("");
                              setSimOneTimeOverpayment("");
                              setShowFullOverpaymentSchedule(false);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand bg-brand-subtle hover:bg-brand hover:text-text-inverse border border-brand/20 rounded-xl transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Wyzeruj symulację</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Simulation Input Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-5 bg-surface-2/40 border border-border rounded-2xl">
                      {/* Monthly Overpayment Input */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-text-main">
                          Dodatkowa kwota miesięcznie ({currency})
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="50"
                            placeholder="np. 300"
                            value={simMonthlyOverpayment}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || parseFloat(val) >= 0) {
                                setSimMonthlyOverpayment(val);
                              }
                            }}
                            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring"
                            aria-label="Dodatkowa kwota miesięcznie"
                          />
                          <span className="absolute right-3 top-2 text-xs font-bold text-text-faint pointer-events-none">
                            {currency}/mc
                          </span>
                        </div>
                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {[200, 500, 1000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setSimMonthlyOverpayment(String(preset))}
                              className="px-2 py-1 bg-surface hover:bg-surface-hover border border-border rounded-lg text-[11px] font-bold text-text-muted hover:text-text-main transition cursor-pointer"
                            >
                              +{preset} zł
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* One-Time Overpayment Input */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-text-main">
                          Jednorazowa nadpłata w 1. miesiącu ({currency})
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="500"
                            placeholder="np. 5000"
                            value={simOneTimeOverpayment}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || parseFloat(val) >= 0) {
                                setSimOneTimeOverpayment(val);
                              }
                            }}
                            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring"
                            aria-label="Jednorazowa nadpłata w pierwszym miesiącu"
                          />
                          <span className="absolute right-3 top-2 text-xs font-bold text-text-faint pointer-events-none">
                            {currency}
                          </span>
                        </div>
                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {[2000, 5000, 10000].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setSimOneTimeOverpayment(String(preset))}
                              className="px-2 py-1 bg-surface hover:bg-surface-hover border border-border rounded-lg text-[11px] font-bold text-text-muted hover:text-text-main transition cursor-pointer"
                            >
                              +{formatMoney(preset, currency)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Comparison Summary KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {/* 1. Okres spłaty */}
                      <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                            Okres spłaty
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-text-main tabular-nums">
                              {overpaymentScenario.simulatedMonths} mc.
                            </span>
                            {overpaymentScenario.monthsSaved > 0 && (
                              <span className="text-xs font-bold text-brand tabular-nums">
                                (-{overpaymentScenario.monthsSaved} mc.)
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-text-muted mt-2 pt-2 border-t border-border/60">
                          Plan bazowy: <span className="font-bold text-text-main">{overpaymentScenario.baselineMonths} mc.</span>
                          {overpaymentScenario.monthsSaved > 0 && (
                            <span> • Skrócenie o ok. <strong>{Math.round((overpaymentScenario.monthsSaved / 12) * 10) / 10} lat</strong></span>
                          )}
                        </p>
                      </div>

                      {/* 2. Szacowane odsetki */}
                      <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                            Szacowane odsetki łącznie
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-text-main tabular-nums">
                              {formatMoney(overpaymentScenario.simulatedTotalInterest, currency)}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-text-muted mt-2 pt-2 border-t border-border/60">
                          {overpaymentScenario.interestSavings > 0 ? (
                            <>
                              Oszczędność: <strong className="text-brand tabular-nums">{formatMoney(overpaymentScenario.interestSavings, currency)}</strong>
                            </>
                          ) : (
                            <>Plan bazowy: <span className="font-bold text-text-main">{formatMoney(overpaymentScenario.baselineTotalInterest, currency)}</span></>
                          )}
                        </p>
                      </div>

                      {/* 3. Całkowity szacowany koszt spłaty */}
                      <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                            Szacowana całkowita spłata
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-black text-text-main tabular-nums">
                              {formatMoney(overpaymentScenario.simulatedTotalRepayment, currency)}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-text-muted mt-2 pt-2 border-t border-border/60">
                          Plan bazowy: <span className="font-bold text-text-main">{formatMoney(overpaymentScenario.baselineTotalRepayment, currency)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Updated Amortization Schedule Preview */}
                    {(numMonthlyOverpayment > 0 || numOneTimeOverpayment > 0) && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-text-faint">
                            Zaktualizowany harmonogram spłaty po nadpłatach
                          </h4>

                          {overpaymentScenario.rows.length > 24 && (
                            <button
                              type="button"
                              onClick={() => setShowFullOverpaymentSchedule(!showFullOverpaymentSchedule)}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer bg-surface-2 hover:bg-surface-hover text-text-main border border-border focus-visible:ring-2 focus-visible:ring-focus-ring"
                            >
                              {showFullOverpaymentSchedule
                                ? "Pokaż 24 miesiące"
                                : `Pokaż pełny harmonogram (${overpaymentScenario.rows.length} rat)`}
                            </button>
                          )}
                        </div>

                        <div className="overflow-x-auto border border-border rounded-xl">
                          <table className="w-full text-left text-xs" aria-label="Tabela zaktualizowanego harmonogramu po nadpłatach">
                            <thead className="bg-surface-2 text-text-faint font-bold border-b border-border uppercase tracking-wider text-[10px]">
                              <tr>
                                <th className="py-2.5 px-3">Miesiąc</th>
                                <th className="py-2.5 px-3 text-right">Rata z nadpłatą</th>
                                <th className="py-2.5 px-3 text-right">Kapitał</th>
                                <th className="py-2.5 px-3 text-right">Odsetki</th>
                                <th className="py-2.5 px-3 text-right">Pozostałe saldo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 font-medium">
                              {(showFullOverpaymentSchedule ? overpaymentScenario.rows : overpaymentScenario.rows.slice(0, 24)).map((row) => (
                                <tr key={row.monthIndex} className="hover:bg-surface-hover transition-colors">
                                  <td className="py-2.5 px-3 font-bold text-text-main">Miesiąc {row.monthIndex}</td>
                                  <td className="py-2.5 px-3 text-right font-bold text-text-main tabular-nums">
                                    {formatMoney(row.installment, currency)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-brand font-bold tabular-nums">
                                    {formatMoney(row.principal, currency)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-text-muted tabular-nums">
                                    {formatMoney(row.interest, currency)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-text-main tabular-nums">
                                    {formatMoney(row.balance, currency)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-text-faint text-center leading-relaxed">
                      Szacunek na podstawie podanych danych — rzeczywiste wartości mogą różnić się od symulacji w zależności od terminów księgowania nadpłat w banku.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: REFINANCE */}
            {activeTab === "refinance" && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-surface-2/60 border border-border p-5 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-sm font-bold text-text-main">Analiza opłacalności refinansowania</h3>
                    <p className="text-xs text-text-muted">
                      Obecna stawka: {debt.interestRate.toFixed(2)}% • Symulacja przy obniżeniu o 1.0 p.p.
                    </p>
                  </div>
                  {onOpenRefinanceModal && (
                    <button
                      onClick={() => onOpenRefinanceModal(debt)}
                      className="px-4 py-2 bg-brand text-text-inverse text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-[0.98] transition cursor-pointer"
                    >
                      Otwórz kalkulator refinansowania
                    </button>
                  )}
                </div>

                {refinancePreview && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-surface border border-border rounded-xl">
                      <span className="text-xs font-bold text-text-faint uppercase block mb-1">
                        Szacowany czas zwrotu
                      </span>
                      <span className="text-xl font-black text-text-main block mb-1">
                        {refinancePreview.comparison.breakEvenMonths !== null
                          ? `${refinancePreview.comparison.breakEvenMonths} mies.`
                          : "Brak zwrotu"}
                      </span>
                      <span className="text-[11px] text-text-muted">
                        przy kosztach wejścia {formatMoney(4500, currency)}
                      </span>
                    </div>

                    <div className="p-4 bg-surface border border-border rounded-xl">
                      <span className="text-xs font-bold text-text-faint uppercase block mb-1">
                        Miesięczna ulga w racie
                      </span>
                      <span className="text-xl font-black text-success block mb-1">
                        -{formatMoney(refinancePreview.comparison.monthlyDifference, currency)}
                      </span>
                      <span className="text-[11px] text-text-muted">co miesiąc w budżecie</span>
                    </div>

                    <div className="p-4 bg-surface border border-brand/30 rounded-xl">
                      <span className="text-xs font-bold text-brand uppercase block mb-1">
                        Oszczędność netto
                      </span>
                      <span className="text-xl font-black text-brand block mb-1">
                        +{formatMoney(refinancePreview.comparison.netLifetimeSavings, currency)}
                      </span>
                      <span className="text-[11px] text-text-muted">w całym okresie po kosztach</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: TERMS */}
            {activeTab === "terms" && (
              <div className="space-y-4 animate-fade-in text-xs">
                <h3 className="text-sm font-bold text-text-main">Parametry i warunki umowy kredytowej</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-surface-2/60 rounded-xl border border-border">
                    <span className="text-text-faint font-bold block uppercase tracking-wider text-[10px]">
                      Rodzaj oprocentowania
                    </span>
                    <span className="font-bold text-text-main">
                      {debt.rateType === "fixed"
                        ? `Stałe ${debt.interestRate}% ${debt.fixedRateEndDate ? `(do ${debt.fixedRateEndDate})` : ""}`
                        : `Zmienne ${debt.interestRate}%`}
                    </span>
                  </div>

                  <div className="p-3 bg-surface-2/60 rounded-xl border border-border">
                    <span className="text-text-faint font-bold block uppercase tracking-wider text-[10px]">
                      Horyzont spłaty
                    </span>
                    <span className="font-bold text-text-main">{debt.endDate || "Nie określono"}</span>
                  </div>

                  <div className="p-3 bg-surface-2/60 rounded-xl border border-border">
                    <span className="text-text-faint font-bold block uppercase tracking-wider text-[10px]">
                      Najbliższa płatność
                    </span>
                    <span className="font-bold text-text-main">{debt.nextPaymentDate || "Bieżący miesiąc"}</span>
                  </div>

                  <div className="p-3 bg-surface-2/60 rounded-xl border border-border">
                    <span className="text-text-faint font-bold block uppercase tracking-wider text-[10px]">
                      Instytucja finansowa
                    </span>
                    <span className="font-bold text-text-main">{debt.institution}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-border flex items-center justify-between gap-3 bg-surface-2/20 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main rounded-xl hover:bg-surface-2 transition cursor-pointer"
            >
              Zamknij
            </button>

            {(debt.type === "mortgage" || debt.type === "cash_loan") && (
              <button
                onClick={() => onOpenOverpaymentModal?.(debt)}
                className="px-4 py-2 bg-brand-subtle text-brand hover:bg-brand-subtle/80 text-xs font-bold rounded-xl border border-brand/20 transition cursor-pointer"
              >
                Przelicz nadpłatę
              </button>
            )}
          </div>
        </motion.div>

        {/* SPRINT 34: LINK TRANSACTION MODAL */}
        {isLinkModalOpen && (
          <div
            className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="link-tx-modal-title"
          >
            <div className="bg-surface rounded-2xl border border-border p-5 max-w-lg w-full space-y-4 shadow-xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand flex items-center justify-center border border-brand/20">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 id="link-tx-modal-title" className="text-sm font-bold text-text-main">
                      Połącz z istniejącą transakcją
                    </h4>
                    <p className="text-[11px] text-text-muted">
                      Wybierz zarejestrowaną transakcję z księgowości, aby powiązać ją z tym długiem.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 transition cursor-pointer"
                  aria-label="Zamknij"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={linkSearchQuery}
                  onChange={(e) => setLinkSearchQuery(e.target.value)}
                  placeholder="Szukaj transakcji po nazwie, kategorii, koncie..."
                  className="w-full bg-surface-2 border border-border rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
              </div>

              {/* Candidate List */}
              <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {(() => {
                  const candidateTransactions = (transactions || [])
                    .filter((tx) => {
                      if (!tx || typeof tx !== "object") return false;
                      if (tx.type !== "expense") return false;
                      const amt = Number(tx.amount);
                      if (!Number.isFinite(amt) || amt <= 0) return false;
                      if (tx.debtId === debt.id) return false;
                      if (linkSearchQuery.trim()) {
                        const q = linkSearchQuery.toLowerCase();
                        const matchName = (tx.name || "").toLowerCase().includes(q);
                        const matchCat = (tx.category || "").toLowerCase().includes(q);
                        const matchAccount = (tx.account || "").toLowerCase().includes(q);
                        const matchAmt = String(tx.amount).includes(q);
                        return matchName || matchCat || matchAccount || matchAmt;
                      }
                      return true;
                    })
                    .sort((a, b) => (b.isoDate || "").localeCompare(a.isoDate || ""));

                  if (candidateTransactions.length === 0) {
                    return (
                      <div className="p-6 bg-surface-2/40 border border-border rounded-xl text-center">
                        <p className="text-xs text-text-muted">
                          {linkSearchQuery.trim()
                            ? "Brak transakcji pasujących do wyszukiwania."
                            : "Brak dostępnych transakcji do powiązania."}
                        </p>
                      </div>
                    );
                  }

                  return candidateTransactions.map((tx) => {
                    const isSelected = selectedTxToLink?.id === tx.id;
                    const isAlreadyLinked = Boolean(tx.debtId && tx.debtId !== debt.id);
                    return (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => setSelectedTxToLink(tx)}
                        className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          isSelected
                            ? "bg-brand-subtle/20 border-brand ring-1 ring-brand/40"
                            : "bg-surface-2/40 border-border/80 hover:bg-surface-2 hover:border-border"
                        }`}
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-text-main truncate">
                              {tx.name || "Transakcja"}
                            </span>
                            {isAlreadyLinked && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                Powiązana z inną płatnością
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-text-muted flex items-center gap-2">
                            <span className="font-mono">{tx.isoDate}</span>
                            <span>•</span>
                            <span>{tx.category || "Kategoria"}</span>
                            {tx.account && (
                              <>
                                <span>•</span>
                                <span>{tx.account}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs sm:text-sm font-black text-text-main tabular-nums block">
                            {formatMoney(tx.amount, currency)}
                          </span>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>

              {/* Selected Transaction Confirmation & Disclaimer */}
              {selectedTxToLink && (
                <div className="p-3 bg-surface-2/60 border border-border rounded-xl space-y-1.5 text-xs text-text-muted">
                  {selectedTxToLink.debtId && selectedTxToLink.debtId !== debt.id && (
                    <p className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>Ta transakcja jest już powiązana z inną płatnością.</span>
                    </p>
                  )}
                  <p className="text-[11px] text-text-faint">
                    Powiązanie jest ręczne. Nie zmieni kwoty transakcji, salda długu ani obliczeń spłaty.
                  </p>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-text-muted hover:text-text-main rounded-xl hover:bg-surface-2 transition cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  disabled={!selectedTxToLink}
                  onClick={() => {
                    if (selectedTxToLink && debt) {
                      onUpdateTransaction?.(selectedTxToLink.id, { debtId: debt.id });
                      setIsLinkModalOpen(false);
                      setSelectedTxToLink(null);
                    }
                  }}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    selectedTxToLink
                      ? "bg-brand text-text-inverse hover:bg-brand-hover"
                      : "bg-surface-3 text-text-faint cursor-not-allowed border border-border"
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Połącz transakcję</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SPRINT 34: UNLINK TRANSACTION CONFIRMATION MODAL */}
        {txToUnlink && (
          <div
            className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unlink-tx-modal-title"
          >
            <div className="bg-surface rounded-2xl border border-border p-5 max-w-md w-full space-y-4 shadow-xl animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-2 text-text-main">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <Unlink className="w-4 h-4" />
                </div>
                <h4 id="unlink-tx-modal-title" className="text-sm font-bold">
                  Odłącz transakcję
                </h4>
              </div>

              <p className="text-xs text-text-muted leading-relaxed">
                Odłączyć tę transakcję od płatności długu? Transakcja pozostanie w księgowości.
              </p>

              <div className="p-3 bg-surface-2/60 border border-border rounded-xl space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text-main">{txToUnlink.transactionName || "Spłata długu"}</span>
                  <span className="font-black tabular-nums">{formatMoney(txToUnlink.paymentAmount, currency)}</span>
                </div>
                <div className="text-[11px] text-text-muted font-mono">{txToUnlink.date}</div>
              </div>

              <p className="text-[11px] text-text-faint">
                To ręczne powiązanie — nie zmieni kwoty, salda ani obliczeń.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setTxToUnlink(null)}
                  className="px-3.5 py-2 text-xs font-bold text-text-muted hover:text-text-main rounded-xl hover:bg-surface-2 transition cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (txToUnlink) {
                      onUpdateTransaction?.(txToUnlink.transactionId, { debtId: undefined });
                      setTxToUnlink(null);
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-text-inverse hover:bg-rose-700 transition-all shadow-xs cursor-pointer"
                >
                  Odłącz
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>,
    document.body
  );
}
