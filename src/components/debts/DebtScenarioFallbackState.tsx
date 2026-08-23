import React from "react";
import { AlertCircle, Plus, RefreshCw, Compass, ArrowRight, CheckCircle2 } from "lucide-react";

export interface DebtScenarioFallbackStateProps {
  type: "no_debts" | "all_paid" | "custom_order_incomplete" | "calculation_unavailable";
  title?: string;
  message?: string;
  onAddDebt?: () => void;
  onSelectStrategy?: (strategy: "avalanche" | "snowball") => void;
  onOpenKnowledgeCenter?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export function DebtScenarioFallbackState({
  type,
  title,
  message,
  onAddDebt,
  onSelectStrategy,
  onOpenKnowledgeCenter,
  actionLabel,
  onAction
}: DebtScenarioFallbackStateProps) {
  const containerAnimationClass = "motion-safe:animate-fade-in motion-reduce:animate-none";

  if (type === "no_debts") {
    return (
      <div
        id="debt-scenarios-empty-no-debts"
        className={`bg-surface p-8 sm:p-12 rounded-2xl border border-dashed border-border text-center flex flex-col items-center justify-center space-y-3 ${containerAnimationClass}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-brand-subtle flex items-center justify-center border border-brand/20 shadow-xs text-brand">
          <Compass className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-text-main">
          {title || "Brak czynnych zobowiązań do symulacji spłaty"}
        </h3>
        <p className="text-sm text-text-muted max-w-md leading-relaxed">
          {message ||
            "Dodaj co najmniej jedno zobowiązanie, aby zobaczyć możliwe strategie spłaty. Po wprowadzeniu danych moduł obliczy optymalne harmonogramy i potencjalne oszczędności."}
        </p>
        <div className="pt-2 flex items-center gap-2 flex-wrap justify-center">
          {onAddDebt && (
            <button
              type="button"
              onClick={onAddDebt}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-text-inverse bg-brand hover:bg-brand-hover px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <Plus className="w-4 h-4" />
              <span>Dodaj zobowiązanie</span>
            </button>
          )}
          {onOpenKnowledgeCenter && (
            <button
              type="button"
              onClick={onOpenKnowledgeCenter}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-text-main bg-surface hover:bg-surface-2 border border-border px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <span>Zobacz jak działają strategie</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (type === "all_paid") {
    return (
      <div
        id="debt-scenarios-empty-all-paid"
        className={`bg-surface p-8 sm:p-12 rounded-2xl border border-border text-center flex flex-col items-center justify-center space-y-3 ${containerAnimationClass}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-brand-subtle flex items-center justify-center border border-brand/20 shadow-xs text-brand">
          <CheckCircle2 className="w-7 h-7 text-brand" />
        </div>
        <h3 className="text-base font-bold text-text-main">
          {title || "Wszystkie zobowiązania zostały już spłacone"}
        </h3>
        <p className="text-sm text-text-muted max-w-md leading-relaxed">
          {message ||
            "Brak pozostałej kwoty do zasymulowania. Według bieżących danych zobowiązania w Twoim portfelu nie mają już aktywnego salda."}
        </p>
      </div>
    );
  }

  if (type === "custom_order_incomplete") {
    return (
      <div
        id="debt-scenarios-custom-order-fallback"
        className={`p-5 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-2xs ${containerAnimationClass}`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand flex items-center justify-center shrink-0 mt-0.5 border border-brand/20">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-text-main text-sm">
              {title || "Własna kolejność nie jest jeszcze gotowa do porównania"}
            </h4>
            <p className="text-sm text-text-muted leading-relaxed">
              {message ||
                "Uzupełnij kolejność zobowiązań na liście poniżej albo wybierz Lawinę lub Kulę Śnieżną."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {onSelectStrategy && (
            <>
              <button
                type="button"
                onClick={() => onSelectStrategy("avalanche")}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-brand text-text-inverse hover:bg-brand-hover transition shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Wybierz Lawinę
              </button>
              <button
                type="button"
                onClick={() => onSelectStrategy("snowball")}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-surface hover:bg-surface-2 border border-border text-text-main transition shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Wybierz Kulę Śnieżną
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (type === "calculation_unavailable") {
    return (
      <div
        id="debt-scenarios-calculation-unavailable"
        className={`p-4 sm:p-5 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs ${containerAnimationClass}`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-surface-2 text-text-muted flex items-center justify-center shrink-0 border border-border">
            <RefreshCw className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="font-bold text-text-main text-xs sm:text-sm">
              {title || "Prognoza chwilowo niedostępna"}
            </h4>
            <p className="text-sm text-text-muted leading-relaxed">
              {message ||
                "Nie możemy teraz wiarygodnie wyliczyć tej prognozy na podstawie aktualnych danych."}
            </p>
          </div>
        </div>

        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-surface hover:bg-surface-2 border border-border text-text-main transition shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shrink-0 self-start sm:self-auto"
          >
            {actionLabel}
          </button>
        )}
      </div>
    );
  }

  return null;
}
