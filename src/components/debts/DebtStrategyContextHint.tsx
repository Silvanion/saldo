import React from "react";
import { Info, ArrowRight, BookOpen } from "lucide-react";
import { DebtPayoffStrategyType } from "../../services/debtCalculations";

export interface DebtStrategyContextHintProps {
  selectedStrategy: DebtPayoffStrategyType;
  onOpenKnowledgeCenter?: () => void;
}

export function DebtStrategyContextHint({
  selectedStrategy,
  onOpenKnowledgeCenter
}: DebtStrategyContextHintProps) {
  const getHintContent = () => {
    switch (selectedStrategy) {
      case "avalanche":
        return {
          strategyName: "Metoda Lawiny (Avalanche)",
          tradeOff: "Najniższy łączny koszt odsetek i optymalny matematycznie plan spłaty.",
          decisionNote: "Jeśli zależy Ci na szybszych sukcesach psychologicznych i redukcji liczby rat, sprawdź Kulę Śnieżną."
        };
      case "snowball":
        return {
          strategyName: "Metoda Kuli Śnieżnej (Snowball)",
          tradeOff: "Szybkie zamykanie najmniejszych długów i wysoka motywacja kosztem nieco wyższych łącznych odsetek.",
          decisionNote: "Jeśli Twoim priorytetem jest zaoszczędzenie jak największej kwoty na odsetkach, przełącz na Lawinę."
        };
      case "custom":
        return {
          strategyName: "Własna kolejność (Custom)",
          tradeOff: "Pełna kontrola nad kolejnością spłat według Twoich osobistych priorytetów.",
          decisionNote: "Porównaj ten wariant z Lawiną, aby sprawdzić koszt wybranej kolejności."
        };
      case "baseline":
      default:
        return {
          strategyName: "Plan bazowy (Status Quo)",
          tradeOff: "Spłata wyłącznie minimalnych rat bez mechanizmu kaskadowego.",
          decisionNote: "Wybierz Lawinę lub Kulę Śnieżną, aby przyspieszyć spłatę i zaoszczędzić na odsetkach."
        };
    }
  };

  const hint = getHintContent();

  return (
    <div
      id="debt-strategy-context-hint"
      className="p-3.5 sm:p-4 rounded-xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="w-5 h-5 rounded-lg bg-brand-subtle text-brand flex items-center justify-center shrink-0 mt-0.5 border border-brand/20">
          <Info className="w-3.5 h-3.5" />
        </span>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-text-main">
              Aktywny wybór: {hint.strategyName}
            </span>
            <span className="text-text-muted">•</span>
            <span className="text-text-muted">{hint.tradeOff}</span>
          </div>
          <p className="text-[11px] text-text-faint">
            <strong className="font-semibold text-text-muted">Wskazówka:</strong> {hint.decisionNote}
          </p>
        </div>
      </div>

      {onOpenKnowledgeCenter && (
        <button
          type="button"
          onClick={onOpenKnowledgeCenter}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:text-brand-hover shrink-0 self-start sm:self-auto cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring rounded-lg px-1.5 py-0.5"
          aria-label="Otwórz centrum wiedzy o strategiach spłaty"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Centrum wiedzy</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
