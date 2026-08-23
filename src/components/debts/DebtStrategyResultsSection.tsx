import React from "react";
import { ShieldCheck } from "lucide-react";
import {
  DebtItem,
  SupportedCurrency
} from "../../types";
import {
  DebtPayoffStrategyType,
  PortfolioPayoffComparison
} from "../../services/debtCalculations";
import { DebtStrategySummaryCard } from "./DebtStrategySummaryCard";
import { DebtPayoffRoadmap } from "./DebtPayoffRoadmap";

export interface DebtStrategyResultsSectionProps {
  payoffComparison: PortfolioPayoffComparison;
  selectedPayoffStrategy: DebtPayoffStrategyType;
  onSelectStrategy: (strategy: DebtPayoffStrategyType) => void;
  currency: SupportedCurrency;
  activeDebts: DebtItem[];
  validatedCustomOrder: string[];
  onMoveDebtUp?: (debtId: string) => void;
  onMoveDebtDown?: (debtId: string) => void;
}

export function DebtStrategyResultsSection({
  payoffComparison,
  selectedPayoffStrategy,
  onSelectStrategy,
  currency,
  activeDebts,
  validatedCustomOrder,
  onMoveDebtUp,
  onMoveDebtDown
}: DebtStrategyResultsSectionProps) {
  const activePlan =
    selectedPayoffStrategy === "custom"
      ? payoffComparison.custom || null
      : payoffComparison[selectedPayoffStrategy] || payoffComparison.baseline || null;

  return (
    <>
      {/* 4 Strategy Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Avalanche */}
        <DebtStrategySummaryCard
          strategy="avalanche"
          result={payoffComparison.avalanche}
          isSelected={selectedPayoffStrategy === "avalanche"}
          isRecommended={payoffComparison.recommendedStrategy === "avalanche"}
          currency={currency}
          onSelect={onSelectStrategy}
        />

        {/* 2. Snowball */}
        <DebtStrategySummaryCard
          strategy="snowball"
          result={payoffComparison.snowball}
          isSelected={selectedPayoffStrategy === "snowball"}
          isRecommended={payoffComparison.recommendedStrategy === "snowball"}
          currency={currency}
          onSelect={onSelectStrategy}
        />

        {/* 3. Custom */}
        {payoffComparison.custom && (
          <DebtStrategySummaryCard
            strategy="custom"
            result={payoffComparison.custom}
            isSelected={selectedPayoffStrategy === "custom"}
            currency={currency}
            onSelect={onSelectStrategy}
          />
        )}

        {/* 4. Baseline */}
        <DebtStrategySummaryCard
          strategy="baseline"
          result={payoffComparison.baseline}
          isSelected={selectedPayoffStrategy === "baseline"}
          currency={currency}
          onSelect={onSelectStrategy}
        />
      </div>


      {/* Payoff Roadmap: Milestone Card, Custom Reorder Controls & Step-by-Step Queue */}
      <DebtPayoffRoadmap
        activePlan={activePlan}
        activeStrategy={selectedPayoffStrategy}
        currency={currency}
        activeDebts={activeDebts}
        validatedCustomOrder={validatedCustomOrder}
        onSelectStrategy={onSelectStrategy}
        onMoveDebtUp={onMoveDebtUp}
        onMoveDebtDown={onMoveDebtDown}
      />

      {/* Disclaimer */}
      <div className="text-xs text-text-muted flex items-start gap-2 bg-surface p-3.5 rounded-xl border border-border">
        <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
        <p>
          <strong>Zastrzeżenie:</strong> Symulacja zakłada stałość stóp procentowych, regularne dokonywanie minimalnych spłat oraz przeznaczanie zadeklarowanej nadpłaty w każdym miesiącu na priorytetowe zobowiązanie. Nie uwzględnia zaciągania nowego zadłużenia w trakcie trwania planu.
        </p>
      </div>
    </>
  );
}
