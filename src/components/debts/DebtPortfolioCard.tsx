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
  Landmark
} from "lucide-react";
import { DebtDetailTab } from "./DebtDetailsModal";

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

  const paidRatio =
    debt.originalAmount && debt.originalAmount > 0
      ? Math.max(0, Math.min(100, Math.round(((debt.originalAmount - debt.balance) / debt.originalAmount) * 100)))
      : 0;

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
        {debt.originalAmount && debt.originalAmount > 0 && debt.type !== "credit_card" && debt.type !== "revolving" && (
          <div className="mt-3 mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-text-faint font-medium">Postęp spłaty kapitału</span>
              <span className="font-bold text-text-main">{paidRatio}% spłacone</span>
            </div>
            <div className="w-full h-2 bg-surface-offset rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-all duration-500"
                style={{ width: `${paidRatio}%` }}
              />
            </div>
          </div>
        )}

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
