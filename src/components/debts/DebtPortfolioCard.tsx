import React, { useState } from "react";
import { DebtItem } from "../../types";
import { formatMoney } from "../../utils/format";
import {
  Home,
  CreditCard,
  Banknote,
  ShoppingBag,
  TrendingDown,
  ChevronRight,
  Sparkles,
  Percent,
  Pencil,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Landmark,
  Check
} from "lucide-react";
import { DebtDetailTab } from "./DebtDetailsModal";

export const DEBT_REPAYMENT_MILESTONES = [25, 50, 75, 100] as const;
export type DebtRepaymentMilestone = (typeof DEBT_REPAYMENT_MILESTONES)[number];

export interface DebtRepaymentProgress {
  referenceAmount: number;
  repaidAmount: number;
  repaidPercent: number;
  reachedMilestones: DebtRepaymentMilestone[];
  currentMilestone: DebtRepaymentMilestone | null;
  nextMilestone: DebtRepaymentMilestone | null;
  isComplete: boolean;
  hasUsableReferenceAmount: boolean;
}

export function calculateDebtRepaymentProgress(debt: DebtItem | null | undefined): DebtRepaymentProgress {
  if (!debt) {
    return {
      referenceAmount: 0,
      repaidAmount: 0,
      repaidPercent: 0,
      reachedMilestones: [],
      currentMilestone: null,
      nextMilestone: 25,
      isComplete: false,
      hasUsableReferenceAmount: false
    };
  }

  const referenceAmount =
    Number(debt.originalAmount) ||
    Number(debt.creditLimit) ||
    Number(debt.balance) ||
    0;

  if (referenceAmount <= 0) {
    return {
      referenceAmount: 0,
      repaidAmount: 0,
      repaidPercent: 0,
      reachedMilestones: [],
      currentMilestone: null,
      nextMilestone: 25,
      isComplete: false,
      hasUsableReferenceAmount: false
    };
  }

  const balance = Number(debt.balance) || 0;
  const rawRepaid = referenceAmount - balance;
  const rawPercent = (rawRepaid / referenceAmount) * 100;
  const repaidPercent = Math.max(0, Math.min(100, Math.round(rawPercent)));
  const repaidAmount = Math.max(0, Math.min(referenceAmount, rawRepaid));

  const reachedMilestones = DEBT_REPAYMENT_MILESTONES.filter((m) => repaidPercent >= m);
  const currentMilestone = reachedMilestones.length > 0 ? reachedMilestones[reachedMilestones.length - 1] : null;
  const nextMilestone = DEBT_REPAYMENT_MILESTONES.find((m) => repaidPercent < m) || null;
  const isComplete = repaidPercent >= 100;

  return {
    referenceAmount,
    repaidAmount,
    repaidPercent,
    reachedMilestones,
    currentMilestone,
    nextMilestone,
    isComplete,
    hasUsableReferenceAmount: Boolean(debt.originalAmount && debt.originalAmount > 0)
  };
}

export function getNewlyCrossedDebtMilestone(
  previousProgress: DebtRepaymentProgress,
  currentProgress: DebtRepaymentProgress
): DebtRepaymentMilestone | null {
  if (!previousProgress.hasUsableReferenceAmount || !currentProgress.hasUsableReferenceAmount) {
    return null;
  }
  const newlyCrossed = currentProgress.reachedMilestones.filter(
    (m) => !previousProgress.reachedMilestones.includes(m)
  );
  if (newlyCrossed.length === 0) return null;
  return newlyCrossed[newlyCrossed.length - 1];
}

export interface DebtMilestoneForecast {
  nextMilestone: DebtRepaymentMilestone;
  estimatedDate: string;
  estimatedMonthCount: number;
  monthlyRepaymentSignal: number;
  remainingAmountToMilestone: number;
}

export function calculateNextDebtMilestoneForecast(
  debt: DebtItem | null | undefined,
  options?: {
    now?: Date;
    monthlyRepaymentSignalOverride?: number;
  }
): DebtMilestoneForecast | null {
  if (!debt || debt.status === "closed") {
    return null;
  }

  if (debt.type === "credit_card" || debt.type === "revolving") {
    return null;
  }

  const progress = calculateDebtRepaymentProgress(debt);
  if (!progress.hasUsableReferenceAmount || progress.isComplete || !progress.nextMilestone) {
    return null;
  }

  const monthlyRepaymentSignal =
    options?.monthlyRepaymentSignalOverride !== undefined
      ? options.monthlyRepaymentSignalOverride
      : Number(debt.monthlyPayment) || 0;

  if (monthlyRepaymentSignal <= 0 || !Number.isFinite(monthlyRepaymentSignal)) {
    return null;
  }

  const nextMilestone = progress.nextMilestone;
  const targetRepaidAmount = progress.referenceAmount * (nextMilestone / 100);
  const remainingAmountToMilestone = Math.max(0, targetRepaidAmount - progress.repaidAmount);

  if (remainingAmountToMilestone <= 0) {
    return null;
  }

  const estimatedMonthCount = Math.max(1, Math.ceil(remainingAmountToMilestone / monthlyRepaymentSignal));
  const baseDate = options?.now ? new Date(options.now) : new Date();

  const targetYear = baseDate.getFullYear() + Math.floor((baseDate.getMonth() + estimatedMonthCount) / 12);
  const targetMonth = ((baseDate.getMonth() + estimatedMonthCount) % 12) + 1;
  const estimatedDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;

  return {
    nextMilestone,
    estimatedDate,
    estimatedMonthCount,
    monthlyRepaymentSignal,
    remainingAmountToMilestone
  };
}

export function formatMilestoneForecastDate(isoYearMonth: string): string {
  try {
    const [yearStr, monthStr] = isoYearMonth.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (!year || !month) return isoYearMonth;
    const date = new Date(year, month - 1, 1);
    return new Intl.DateTimeFormat("pl-PL", { month: "short", year: "numeric" }).format(date);
  } catch {
    return isoYearMonth;
  }
}

export interface DebtMilestoneOverpaymentImpact {
  nextMilestone: DebtRepaymentMilestone;
  baselineEstimatedDate: string;
  adjustedEstimatedDate: string;
  baselineMonthCount: number;
  adjustedMonthCount: number;
  monthsAccelerated: number;
  hypotheticalOverpayment: number;
  isImmediateAchievement: boolean;
  isImmediateCompletion: boolean;
}

export function calculateDebtMilestoneOverpaymentImpact(
  debt: DebtItem | null | undefined,
  hypotheticalOverpayment: number,
  options?: {
    now?: Date;
    monthlyRepaymentSignalOverride?: number;
  }
): DebtMilestoneOverpaymentImpact | null {
  if (!debt || debt.status === "closed") {
    return null;
  }

  if (debt.type === "credit_card" || debt.type === "revolving") {
    return null;
  }

  if (!Number.isFinite(hypotheticalOverpayment) || hypotheticalOverpayment <= 0) {
    return null;
  }

  const baseline = calculateNextDebtMilestoneForecast(debt, options);
  if (!baseline) {
    return null;
  }

  const adjustedBalance = Math.max(0, debt.balance - hypotheticalOverpayment);
  const adjustedDebt: DebtItem = { ...debt, balance: adjustedBalance };
  const adjustedProgress = calculateDebtRepaymentProgress(adjustedDebt);

  const targetMilestone = baseline.nextMilestone;
  const targetRepaidAmount = adjustedProgress.referenceAmount * (targetMilestone / 100);
  const remainingToTarget = Math.max(0, targetRepaidAmount - adjustedProgress.repaidAmount);

  const baseDate = options?.now ? new Date(options.now) : new Date();
  const currentYear = baseDate.getFullYear();
  const currentMonth = baseDate.getMonth() + 1;
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  if (remainingToTarget <= 0) {
    const isImmediateCompletion = adjustedProgress.isComplete || adjustedBalance === 0;
    return {
      nextMilestone: targetMilestone,
      baselineEstimatedDate: baseline.estimatedDate,
      adjustedEstimatedDate: currentDateStr,
      baselineMonthCount: baseline.estimatedMonthCount,
      adjustedMonthCount: 0,
      monthsAccelerated: baseline.estimatedMonthCount,
      hypotheticalOverpayment,
      isImmediateAchievement: true,
      isImmediateCompletion
    };
  }

  const adjustedMonthCount = Math.max(1, Math.ceil(remainingToTarget / baseline.monthlyRepaymentSignal));
  const monthsAccelerated = Math.max(0, baseline.estimatedMonthCount - adjustedMonthCount);

  const targetYear = baseDate.getFullYear() + Math.floor((baseDate.getMonth() + adjustedMonthCount) / 12);
  const targetMonth = ((baseDate.getMonth() + adjustedMonthCount) % 12) + 1;
  const adjustedEstimatedDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;

  return {
    nextMilestone: targetMilestone,
    baselineEstimatedDate: baseline.estimatedDate,
    adjustedEstimatedDate,
    baselineMonthCount: baseline.estimatedMonthCount,
    adjustedMonthCount,
    monthsAccelerated,
    hypotheticalOverpayment,
    isImmediateAchievement: false,
    isImmediateCompletion: false
  };
}

export interface DebtPortfolioCardProps {
  key?: React.Key;
  debt: DebtItem;
  onOpenDetails: (debt: DebtItem, initialTab?: DebtDetailTab) => void;
  onOpenOverpayment: (debt: DebtItem) => void;
  onOpenRefinance: (debt: DebtItem) => void;
  onEdit: (debt: DebtItem) => void;
  onDelete: (debtId: string) => void;
  onToggleStatus: (debtId: string) => void;
}

export function DebtPortfolioCard({
  debt,
  onOpenDetails,
  onOpenOverpayment,
  onOpenRefinance,
  onEdit,
  onDelete,
  onToggleStatus
}: DebtPortfolioCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getIcon = () => {
    switch (debt.type) {
      case "mortgage":
        return <Home className="w-5 h-5" />;
      case "credit_card":
        return <CreditCard className="w-5 h-5" />;
      case "cash_loan":
        return <Banknote className="w-5 h-5" />;
      case "revolving":
        return <RotateCcw className="w-5 h-5" />;
      case "bnpl":
        return <ShoppingBag className="w-5 h-5" />;
      case "other":
      default:
        return <Landmark className="w-5 h-5" />;
    }
  };

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
      case "other":
      default:
        return "Inne zobowiązanie";
    }
  };

  const isClosed = debt.status === "closed";
  const currency = debt.currency || "PLN";

  // Dynamic badges
  const badges: Array<{ label: string; tone: "brand" | "danger" | "warning" | "neutral" }> = [];

  if (isClosed) {
    badges.push({ label: "Zamknięte / Spłacone", tone: "neutral" });
  } else {
    if (debt.type === "mortgage" && debt.fixedRateEndDate) {
      badges.push({ label: `Stała stopa do ${debt.fixedRateEndDate}`, tone: "brand" });
    }
    if (debt.interestRate >= 15) {
      badges.push({ label: `Wysoki APR (${debt.interestRate}%)`, tone: "danger" });
    } else if (debt.interestRate === 0) {
      badges.push({ label: "0% RRSO", tone: "neutral" });
    }
    if (debt.type === "mortgage") {
      badges.push({ label: "Refi candidate", tone: "warning" });
    }
  }

  const getBadgeClass = (tone: "brand" | "danger" | "warning" | "neutral") => {
    switch (tone) {
      case "danger":
        return "bg-danger-subtle text-danger border-danger/20";
      case "warning":
        return "bg-warning-subtle text-warning border-warning/20";
      case "brand":
        return "bg-brand-subtle text-brand border-brand/20";
      case "neutral":
      default:
        return "bg-surface-2 text-text-muted border-border";
    }
  };

  const repaymentProgress = calculateDebtRepaymentProgress(debt);
  const paidRatio = repaymentProgress.repaidPercent;

  return (
    <div
      className={`bg-surface border rounded-2xl p-5 sm:p-6 transition-all shadow-xs hover:shadow-md flex flex-col justify-between group relative overflow-hidden ${
        isClosed ? "opacity-75 border-border/50 bg-surface/60" : "border-border/80 hover:border-brand/40"
      }`}
    >
      {/* Top Meta */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform ${
                isClosed
                  ? "bg-surface-2 text-text-muted border border-border"
                  : "bg-brand-subtle text-brand border border-brand/20"
              }`}
            >
              {getIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-text-main truncate group-hover:text-brand transition-colors">
                  {debt.name}
                </h3>
              </div>
              <p className="text-xs text-text-muted truncate">
                {debt.institution} • <span className="font-semibold text-text-faint">{getTypeLabel()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
            {badges.map((b, idx) => (
              <span
                key={idx}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${getBadgeClass(b.tone)} whitespace-nowrap`}
              >
                {b.label}
              </span>
            ))}

            {/* Quick action buttons */}
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={() => onEdit(debt)}
                className="p-1.5 text-text-muted hover:text-text-main hover:bg-surface-2 rounded-lg transition cursor-pointer"
                title="Edytuj zobowiązanie"
                aria-label="Edytuj zobowiązanie"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 text-text-muted hover:text-danger hover:bg-danger-subtle rounded-lg transition cursor-pointer"
                title="Usuń zobowiązanie"
                aria-label="Usuń zobowiązanie"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Delete Inline Confirmation */}
        {showDeleteConfirm && (
          <div className="my-3 p-3 bg-danger-subtle border border-danger/30 rounded-xl text-xs flex items-center justify-between gap-3 animate-fade-in">
            <span className="text-danger font-bold">Czy na pewno chcesz usunąć to zobowiązanie?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2.5 py-1 text-text-muted hover:text-text-main bg-surface rounded-lg font-bold border border-border cursor-pointer"
              >
                Anuluj
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete(debt.id);
                }}
                className="px-2.5 py-1 bg-danger text-text-inverse rounded-lg font-bold hover:bg-danger/90 cursor-pointer shadow-xs"
              >
                Usuń
              </button>
            </div>
          </div>
        )}

        {/* Financial Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 my-2 border-y border-border/50 bg-surface-2/40 rounded-xl px-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block">
              Aktualne saldo
            </span>
            <span className="text-sm sm:text-base font-black text-text-main tabular-nums">
              {formatMoney(debt.balance, currency)}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block">
              Miesięczna rata
            </span>
            <span className="text-sm sm:text-base font-black text-text-main tabular-nums">
              {formatMoney(debt.monthlyPayment, currency)}
              <span className="text-[10px] text-text-muted font-normal"> /mc</span>
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block">
              Oprocentowanie / APR
            </span>
            <span
              className={`text-sm sm:text-base font-black tabular-nums ${
                debt.interestRate > 15 ? "text-danger" : "text-text-main"
              }`}
            >
              {debt.interestRate.toFixed(2)}%
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block">
              Horyzont spłaty
            </span>
            <span className="text-sm sm:text-base font-bold text-text-main truncate block" title={debt.endDate || "Brak"}>
              {debt.endDate || (debt.remainingMonths ? `${debt.remainingMonths} mies.` : "Nie określono")}
            </span>
          </div>
        </div>

        {/* Progress Bar (if originalAmount / creditLimit is defined) */}
        {debt.originalAmount && debt.originalAmount > 0 && debt.type !== "credit_card" && debt.type !== "revolving" && (() => {
          const forecast = calculateNextDebtMilestoneForecast(debt);
          return (
            <div
              className="mt-3 mb-2"
              aria-label={`Postęp spłaty długu: ${paidRatio}%. ${
                repaymentProgress.isComplete
                  ? "Dług spłacony."
                  : repaymentProgress.currentMilestone
                  ? `Osiągnięto: ${repaymentProgress.currentMilestone}%. Następny kamień: ${repaymentProgress.nextMilestone}%.`
                  : `Następny kamień: ${repaymentProgress.nextMilestone}%.`
              }${forecast ? ` Szacowane osiągnięcie progu ${forecast.nextMilestone}%: ${formatMilestoneForecastDate(forecast.estimatedDate)}.` : ""}`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-faint font-medium">Postęp spłaty kapitału</span>
                <span className="font-bold text-text-main tabular-nums">{paidRatio}% spłacone</span>
              </div>
              <div className="w-full h-2 bg-surface-offset rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-500"
                  style={{ width: `${paidRatio}%` }}
                />
              </div>
              {/* SPRINT 40: Milestone Indicators */}
              <div className="flex items-center justify-between mt-1.5" role="group" aria-label="Kamienie milowe spłaty">
                {DEBT_REPAYMENT_MILESTONES.map((milestone) => {
                  const isReached = repaymentProgress.reachedMilestones.includes(milestone);
                  return (
                    <span
                      key={milestone}
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                        isReached
                          ? "bg-brand-subtle text-brand border-brand/20"
                          : "bg-surface-2/40 text-text-faint border-border/40"
                      }`}
                      title={`Kamień milowy ${milestone}%: ${isReached ? "Osiągnięty" : "Do osiągnięcia"}`}
                      aria-label={`Kamień milowy ${milestone}%: ${isReached ? "osiągnięty" : "nieosiągnięty"}`}
                    >
                      {isReached && <Check className="w-2.5 h-2.5" />}
                      <span>{milestone}%</span>
                    </span>
                  );
                })}
              </div>
              {/* SPRINT 42: Next Milestone Forecast */}
              {forecast && (
                <div className="mt-1.5 text-[10px] text-text-muted flex items-center justify-between">
                  <span>Kolejny próg: <strong className="text-text-main">{forecast.nextMilestone}%</strong></span>
                  <span className="font-medium text-text-faint">szac. {formatMilestoneForecastDate(forecast.estimatedDate)}</span>
                </div>
              )}
            </div>
          );
        })()}

        {(debt.type === "credit_card" || debt.type === "revolving") && debt.creditLimit && debt.creditLimit > 0 && (
          <div className="mt-3 mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-text-faint font-medium">
                Wykorzystanie limitu ({formatMoney(debt.creditLimit, currency)})
              </span>
              <span className="font-bold text-text-main">
                {Math.round((debt.balance / debt.creditLimit) * 100)}% limitu
              </span>
            </div>
            <div className="w-full h-2 bg-surface-offset rounded-full overflow-hidden">
              <div
                className="h-full bg-danger rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((debt.balance / debt.creditLimit) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* Notes or Insight */}
        {debt.notes && (
          <div className="mt-3 text-xs text-text-muted bg-surface-2 p-2.5 rounded-xl border border-border/60">
            {debt.notes}
          </div>
        )}
      </div>

      {/* Action Buttons Row */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Overpayment Simulator CTA */}
          {(debt.type === "mortgage" || debt.type === "cash_loan") && !isClosed && (
            <button
              onClick={() => onOpenOverpayment(debt)}
              className="px-3 py-1.5 bg-brand-subtle hover:bg-brand-subtle/80 text-brand text-xs font-bold rounded-lg border border-brand/20 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Symulator nadpłaty
            </button>
          )}

          {/* Refinance CTA */}
          {debt.type === "mortgage" && !isClosed && (
            <button
              onClick={() => onOpenRefinance(debt)}
              className="px-3 py-1.5 bg-surface hover:bg-surface-hover text-text-muted hover:text-text-main text-xs font-bold rounded-lg border border-border transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Refinansowanie
            </button>
          )}

          {/* Close/Reopen Toggle Button */}
          <button
            onClick={() => onToggleStatus(debt.id)}
            className="px-2.5 py-1.5 text-text-muted hover:text-text-main hover:bg-surface-2 text-xs font-semibold rounded-lg border border-border/60 transition cursor-pointer flex items-center gap-1"
          >
            {isClosed ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Przywróć</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                <span>Oznacz jako spłacone</span>
              </>
            )}
          </button>
        </div>

        <button
          onClick={() => onOpenDetails(debt, "overview")}
          className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-hover p-1.5 transition-colors cursor-pointer group/btn ml-auto"
        >
          <span>Szczegóły</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
