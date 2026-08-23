import { useMemo } from "react";
import { DebtItem, DebtPayoffScenario } from "../types";
import {
  DebtPayoffStrategyType,
  DebtPayoffStrategyResult,
  PortfolioPayoffComparison,
  calculatePortfolioPayoffStrategies,
  buildValidatedCustomOrder
} from "../services/debtCalculations";
import {
  WhatIfImpactSummary,
  SavedScenarioPreview
} from "../components/debts/DebtScenarioConfigSection";

export interface UseDebtStrategyAnalyticsParams {
  debts: DebtItem[];
  selectedPayoffStrategy: DebtPayoffStrategyType;
  extraMonthlyPayoff: number;
  customDebtOrder: string[];
  oneTimeOverpayment?: number;
  previewStrategy?: DebtPayoffStrategyType | null;
  savedScenarios?: DebtPayoffScenario[];
}

export interface UseDebtStrategyAnalyticsResult {
  activeDebts: DebtItem[];
  validatedCustomOrder: string[];
  payoffComparison: PortfolioPayoffComparison;
  basePayoffComparison: PortfolioPayoffComparison;
  selectedPayoffResult: DebtPayoffStrategyResult | null;
  whatIfImpact: WhatIfImpactSummary | null;
  savedScenarioPreviews: Record<string, SavedScenarioPreview>;
}

export function useDebtStrategyAnalytics({
  debts,
  selectedPayoffStrategy,
  extraMonthlyPayoff,
  customDebtOrder,
  oneTimeOverpayment = 0,
  previewStrategy = null,
  savedScenarios = []
}: UseDebtStrategyAnalyticsParams): UseDebtStrategyAnalyticsResult {
  const activeDebts = useMemo(() => {
    return debts.filter((d) => d && d.status !== "closed" && (Number(d.balance) || 0) > 0);
  }, [debts]);

  const validatedCustomOrder = useMemo(() => {
    return buildValidatedCustomOrder(activeDebts, customDebtOrder);
  }, [activeDebts, customDebtOrder]);

  const payoffComparison = useMemo(() => {
    return calculatePortfolioPayoffStrategies(
      debts,
      extraMonthlyPayoff,
      undefined,
      validatedCustomOrder,
      oneTimeOverpayment
    );
  }, [debts, extraMonthlyPayoff, validatedCustomOrder, oneTimeOverpayment]);

  const basePayoffComparison = useMemo(() => {
    return calculatePortfolioPayoffStrategies(
      debts,
      extraMonthlyPayoff,
      undefined,
      validatedCustomOrder,
      0
    );
  }, [debts, extraMonthlyPayoff, validatedCustomOrder]);

  const selectedPayoffResult = useMemo(() => {
    if (selectedPayoffStrategy === "custom") {
      return payoffComparison.custom || null;
    }
    return payoffComparison[selectedPayoffStrategy] || payoffComparison.baseline || null;
  }, [selectedPayoffStrategy, payoffComparison]);

  const whatIfImpact = useMemo(() => {
    if (oneTimeOverpayment <= 0 && !previewStrategy) return null;
    const activeBaseRes =
      selectedPayoffStrategy === "avalanche"
        ? basePayoffComparison.avalanche
        : selectedPayoffStrategy === "snowball"
        ? basePayoffComparison.snowball
        : selectedPayoffStrategy === "custom"
        ? basePayoffComparison.custom
        : basePayoffComparison.baseline;

    const currentSimRes =
      (previewStrategy || selectedPayoffStrategy) === "avalanche"
        ? payoffComparison.avalanche
        : (previewStrategy || selectedPayoffStrategy) === "snowball"
        ? payoffComparison.snowball
        : (previewStrategy || selectedPayoffStrategy) === "custom"
        ? payoffComparison.custom
        : payoffComparison.baseline;

    if (!activeBaseRes || !currentSimRes) return null;

    return {
      durDiff: (activeBaseRes.totalMonths || 0) - (currentSimRes.totalMonths || 0),
      intDiff: (activeBaseRes.totalInterestPaid || 0) - (currentSimRes.totalInterestPaid || 0),
      debtFreeDate: currentSimRes.debtFreeDate || ""
    };
  }, [oneTimeOverpayment, previewStrategy, selectedPayoffStrategy, basePayoffComparison, payoffComparison]);

  const savedScenarioPreviews = useMemo(() => {
    const previews: Record<string, SavedScenarioPreview> = {};
    savedScenarios.forEach((sc) => {
      const scOrder =
        sc.strategy === "custom"
          ? buildValidatedCustomOrder(activeDebts, sc.customDebtOrder)
          : undefined;
      const scSim = calculatePortfolioPayoffStrategies(
        activeDebts,
        sc.extraMonthlyPayment || 0,
        undefined,
        scOrder
      );
      const scRes =
        sc.strategy === "avalanche"
          ? scSim.avalanche
          : sc.strategy === "snowball"
          ? scSim.snowball
          : sc.strategy === "custom"
          ? scSim.custom
          : scSim.baseline;
      if (scRes) {
        previews[sc.id] = {
          debtFreeDate: scRes.debtFreeDate,
          totalInterestPaid: scRes.totalInterestPaid
        };
      }
    });
    return previews;
  }, [savedScenarios, activeDebts]);

  return {
    activeDebts,
    validatedCustomOrder,
    payoffComparison,
    basePayoffComparison,
    selectedPayoffResult,
    whatIfImpact,
    savedScenarioPreviews
  };
}
