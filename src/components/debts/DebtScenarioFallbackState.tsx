import React from "react";
import {
  AlertCircle,
  Plus,
  RefreshCw,
  Compass,
  ArrowRight,
  CheckCircle2,
  Layers,
  HelpCircle
} from "lucide-react";

export type DebtScenarioFallbackType =
  | "no_debts"
  | "no-debts"
  | "all_paid"
  | "no_active_debts"
  | "no-active-debts"
  | "custom_order_incomplete"
  | "invalid-custom-order"
  | "calculation_unavailable"
  | "missing_data"
  | "missing-data"
  | "no_results"
  | "no-results"
  | "no_saved_scenarios"
  | "no-saved-scenarios"
  | "error";

export interface DebtScenarioFallbackStateProps {
  /** The specific empty or fallback scenario variant to render */
  type: DebtScenarioFallbackType;
  /** Optional custom title override */
  title?: string;
  /** Optional custom description message override */
  message?: string;
  /** Optional callback to open the Add Debt form */
  onAddDebt?: () => void;
  /** Optional callback to switch to standard strategies (Avalanche / Snowball) */
  onSelectStrategy?: (strategy: "avalanche" | "snowball") => void;
  /** Optional callback to navigate to the Knowledge Center */
  onOpenKnowledgeCenter?: () => void;
  /** Optional custom action button label */
  actionLabel?: string;
  /** Optional custom action button handler */
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

  // 1. NO DEBTS IN PORTFOLIO
  if (type === "no_debts" || type === "no-debts") {
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
              className="inline-flex items-center gap-1.5 text-xs font-bold text-text-inverse bg-brand hover:bg-brand-hover px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Dodaj zobowiązanie</span>
            </button>
          )}
          {onOpenKnowledgeCenter && (
            <button
              type="button"
              onClick={onOpenKnowledgeCenter}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-text-main bg-surface hover:bg-surface-2 border border-border px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring min-h-[44px]"
            >
              <span>Zobacz jak działają strategie</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. ALL DEBTS CLOSED OR ZERO BALANCE
  if (type === "all_paid" || type === "no_active_debts" || type === "no-active-debts") {
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
        {onOpenKnowledgeCenter && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenKnowledgeCenter}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-text-main bg-surface hover:bg-surface-2 border border-border px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring min-h-[44px]"
            >
              <span>Zobacz jak działają strategie</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // 3. CUSTOM ORDER INCOMPLETE OR INVALID
  if (type === "custom_order_incomplete" || type === "invalid-custom-order") {
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
                className="px-3 py-2 rounded-xl text-xs font-bold bg-brand text-text-inverse hover:bg-brand-hover transition shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring min-h-[44px] flex items-center justify-center"
              >
                Wybierz Lawinę
              </button>
              <button
                type="button"
                onClick={() => onSelectStrategy("snowball")}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-surface hover:bg-surface-2 border border-border text-text-main transition shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring min-h-[44px] flex items-center justify-center"
              >
                Wybierz Kulę Śnieżną
              </button>
            </>
          )}
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-brand text-text-inverse hover:bg-brand-hover transition shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring min-h-[44px] flex items-center justify-center"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  // 4. NO SAVED SCENARIOS
  if (type === "no_saved_scenarios" || type === "no-saved-scenarios") {
    return (
      <div
        id="debt-scenarios-empty-saved-scenarios"
        className={`p-6 sm:p-8 rounded-2xl bg-surface border border-border text-center flex flex-col items-center justify-center space-y-3 ${containerAnimationClass}`}
      >
        <div className="w-12 h-12 rounded-2xl bg-brand-subtle text-brand flex items-center justify-center border border-brand/20 shadow-xs">
          <Layers className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-text-main text-sm">
          {title || "Brak zapisanych scenariuszy spłaty"}
        </h4>
        <p className="text-xs text-text-muted max-w-sm leading-relaxed">
          {message ||
            "Zapisz bieżącą symulację spłaty, aby móc łatwo do niej powrócić lub porównać ją z innymi wariantami nadpłat."}
        </p>
        {actionLabel && onAction && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onAction}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-brand text-text-inverse hover:bg-brand-hover transition shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring min-h-[44px] inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{actionLabel}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // 5. NO SIMULATION RESULTS OR MISSING DATA
  if (
    type === "no_results" ||
    type === "no-results" ||
    type === "missing_data" ||
    type === "missing-data"
  ) {
    return (
      <div
        id="debt-scenarios-no-results"
        className={`p-5 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-2xs ${containerAnimationClass}`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-surface-2 text-text-muted flex items-center justify-center shrink-0 mt-0.5 border border-border">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-text-main text-sm">
              {title || "Brak wyników symulacji"}
            </h4>
            <p className="text-sm text-text-muted leading-relaxed">
              {message ||
                "Wprowadź poprawne parametry spłaty lub uzupełnij dane zobowiązań, aby wygenerować harmonogram."}
            </p>
          </div>
        </div>

        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-surface hover:bg-surface-2 border border-border text-text-main transition shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring min-h-[44px] shrink-0"
          >
            {actionLabel}
          </button>
        )}
      </div>
    );
  }

  // 6. CALCULATION UNAVAILABLE OR GENERIC ERROR
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
          className="px-3 py-2 rounded-xl text-xs font-bold bg-surface hover:bg-surface-2 border border-border text-text-main transition shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shrink-0 self-start sm:self-auto min-h-[44px] flex items-center justify-center"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
