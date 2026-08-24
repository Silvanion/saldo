import React from "react";
import { DebtPayoffStrategyType, DebtPayoffStrategyResult } from "../../services/debtCalculations";
import { SupportedCurrency } from "../../types";
import { formatMoney } from "../../utils/format";
import { CheckCircle2, Info } from "lucide-react";

export interface DebtStrategyDecisionSummaryProps {
  selectedStrategy: DebtPayoffStrategyType;
  payoffResult: DebtPayoffStrategyResult | null;
  currency: SupportedCurrency;
}

export function DebtStrategyDecisionSummary({
  selectedStrategy,
  payoffResult,
  currency
}: DebtStrategyDecisionSummaryProps) {
  if (!payoffResult) return null;

  const isBaseline = selectedStrategy === "baseline";

  // Tradeoff mappings without overpromising
  const getTradeoffCopy = () => {
    switch (selectedStrategy) {
      case "avalanche":
        return "Skupia się na redukcji odsetek, jednak pierwsze raty zwalniają się zazwyczaj najpóźniej.";
      case "snowball":
        return "Priorytetyzuje motywację poprzez szybkie uwalnianie rat, kosztem potencjalnie wyższych odsetek.";
      case "custom":
        return "Realizuje wyłącznie układ nadany ręcznie w tej symulacji.";
      case "baseline":
      default:
        return "Zobrazowanie spłaty wyłącznie w trybie minimalnych rat, brak mechanizmu kaskadowego.";
    }
  };

  return (
    <section className="bg-surface border border-border p-4 rounded-xl mb-4 text-sm shadow-xs animate-fade-in" aria-labelledby="decision-summary-title">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        
        {/* Left column: Summary texts */}
        <div className="flex-1 space-y-2.5">
          <h4 id="decision-summary-title" className="font-bold text-text-main flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-brand" />
            Decyzja: {payoffResult.strategyLabel}
          </h4>
          
          <p className="text-text-muted text-xs leading-relaxed">
            <strong className="text-text-main">Cecha strategii:</strong> {getTradeoffCopy()}
          </p>

          <div className="flex items-start gap-1.5 text-[11px] text-text-faint bg-surface-hover p-2 rounded-lg border border-border/50">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <p>
              Wynik symulacji zależy od przyjętych danych i założeń (np. stałości stóp). Oszczędność odsetek jest szacunkiem, a nie gwarantowanym wynikiem.
            </p>
          </div>
        </div>

        {/* Right column: Baseline comparison metrics */}
        <div className="sm:w-64 shrink-0 bg-surface-hover p-3 rounded-xl border border-border/50 space-y-3">
          <div className="text-xs font-semibold text-text-main border-b border-border/50 pb-2 mb-2 text-center sm:text-left">
            Porównanie względem scenariusza bazowego
          </div>
          
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-faint">Czas:</span>
              <span className="font-bold text-text-main">
                {isBaseline ? (
                  <span className="text-text-muted font-medium">Punkt odniesienia</span>
                ) : (
                  <span className={payoffResult.monthsSavedVsBaseline > 0 ? "text-success" : "text-text-muted"}>
                    {payoffResult.monthsSavedVsBaseline > 0 ? `-${payoffResult.monthsSavedVsBaseline} mies.` : "0 mies."}
                  </span>
                )}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-text-faint">Odsetki:</span>
              <span className="font-bold text-text-main">
                {isBaseline ? (
                  <span className="text-text-muted font-medium">Punkt odniesienia</span>
                ) : (
                  <span className={payoffResult.interestSavedVsBaseline > 0 ? "text-brand" : "text-text-muted"}>
                    {payoffResult.interestSavedVsBaseline > 0 ? `+${formatMoney(payoffResult.interestSavedVsBaseline, currency)}` : "0 zł"}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
