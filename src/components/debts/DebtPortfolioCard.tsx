import React from "react";
import { MockDebtItem } from "./mockData";
import { formatMoney } from "../../utils/format";
import {
  Home,
  CreditCard,
  Banknote,
  ShoppingBag,
  TrendingDown,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Percent
} from "lucide-react";

export interface DebtPortfolioCardProps {
  key?: React.Key;
  debt: MockDebtItem;
  onOpenDetails: (debt: MockDebtItem, initialTab?: "overview" | "schedule" | "overpayment" | "refinance" | "terms") => void;
  onOpenOverpayment: (debt: MockDebtItem) => void;
  onOpenRefinance: (debt: MockDebtItem) => void;
}

export function DebtPortfolioCard({
  debt,
  onOpenDetails,
  onOpenOverpayment,
  onOpenRefinance
}: DebtPortfolioCardProps) {
  const getIcon = () => {
    switch (debt.type) {
      case "mortgage":
        return <Home className="w-5 h-5" />;
      case "credit_card":
        return <CreditCard className="w-5 h-5" />;
      case "cash_loan":
        return <Banknote className="w-5 h-5" />;
      case "bnpl":
        return <ShoppingBag className="w-5 h-5" />;
      default:
        return <Percent className="w-5 h-5" />;
    }
  };

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

  const paidRatio = debt.originalAmount > 0 
    ? Math.max(0, Math.min(100, Math.round(((debt.originalAmount - debt.balance) / debt.originalAmount) * 100)))
    : 0;

  return (
    <div className="bg-surface border border-border/80 hover:border-brand/40 rounded-2xl p-5 sm:p-6 transition-all shadow-xs hover:shadow-md flex flex-col justify-between group relative overflow-hidden">
      {/* Top Meta */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              {getIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-text-main truncate group-hover:text-brand transition-colors">
                  {debt.name}
                </h3>
              </div>
              <p className="text-xs text-text-muted truncate">
                {debt.institution} • <span className="font-semibold text-text-faint">{debt.typeLabel}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
            {debt.badges.map((b, idx) => (
              <span
                key={idx}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${getBadgeClass(b.tone)} whitespace-nowrap`}
              >
                {b.label}
              </span>
            ))}
          </div>
        </div>

        {/* Financial Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 my-2 border-y border-border/50 bg-surface-2/40 rounded-xl px-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block">
              Aktualne saldo
            </span>
            <span className="text-sm sm:text-base font-black text-text-main tabular-nums">
              {formatMoney(debt.balance, "PLN")}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block">
              Miesięczna rata
            </span>
            <span className="text-sm sm:text-base font-black text-text-main tabular-nums">
              {formatMoney(debt.monthlyPayment, "PLN")}
              <span className="text-[10px] text-text-muted font-normal"> /mc</span>
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block">
              Oprocentowanie / APR
            </span>
            <span className={`text-sm sm:text-base font-black tabular-nums ${debt.interestRate > 15 ? 'text-danger' : 'text-text-main'}`}>
              {debt.interestRate.toFixed(2)}%
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block">
              Horyzont spłaty
            </span>
            <span className="text-sm sm:text-base font-bold text-text-main truncate block" title={debt.endDate}>
              {debt.endDate}
            </span>
          </div>
        </div>

        {/* Progress Bar (if applicable) */}
        {debt.type !== "credit_card" && debt.type !== "revolving" ? (
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
        ) : (
          <div className="mt-3 mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-text-faint font-medium">Wykorzystanie limitu ({formatMoney(debt.creditLimit || 0, "PLN")})</span>
              <span className="font-bold text-text-main">
                {debt.creditLimit ? Math.round((debt.balance / debt.creditLimit) * 100) : 0}% limitu
              </span>
            </div>
            <div className="w-full h-2 bg-surface-offset rounded-full overflow-hidden">
              <div
                className="h-full bg-danger rounded-full transition-all duration-500"
                style={{ width: `${debt.creditLimit ? Math.min(100, Math.round((debt.balance / debt.creditLimit) * 100)) : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Contextual Smart Insight */}
        {debt.insight && (
          <div className="mt-3 flex items-start gap-2 bg-brand-subtle/40 border border-brand/10 p-2.5 rounded-xl text-xs text-text-muted">
            <Sparkles className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <p className="leading-snug">{debt.insight}</p>
          </div>
        )}
      </div>

      {/* Action Buttons Row */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {debt.type === "mortgage" && (
            <>
              <button
                onClick={() => onOpenOverpayment(debt)}
                className="px-3 py-1.5 bg-brand-subtle hover:bg-brand-subtle/80 text-brand text-xs font-bold rounded-lg border border-brand/20 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Symulator nadpłaty
              </button>
              <button
                onClick={() => onOpenRefinance(debt)}
                className="px-3 py-1.5 bg-surface hover:bg-surface-hover text-text-muted hover:text-text-main text-xs font-bold rounded-lg border border-border transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Refinansowanie
              </button>
            </>
          )}

          {debt.type === "credit_card" && (
            <button
              onClick={() => onOpenDetails(debt, "overpayment")}
              className="px-3 py-1.5 bg-danger-subtle hover:bg-danger-subtle/80 text-danger text-xs font-bold rounded-lg border border-danger/20 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Plan szybkiej spłaty (Lawina)
            </button>
          )}

          {debt.type === "cash_loan" && (
            <button
              onClick={() => onOpenDetails(debt, "schedule")}
              className="px-3 py-1.5 bg-surface hover:bg-surface-hover text-text-muted hover:text-text-main text-xs font-bold rounded-lg border border-border transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Harmonogram
            </button>
          )}
        </div>

        <button
          onClick={() => onOpenDetails(debt, "overview")}
          className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-hover p-1.5 transition-colors cursor-pointer group/btn"
        >
          <span>Szczegóły</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
