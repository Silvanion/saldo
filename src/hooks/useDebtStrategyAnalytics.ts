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

/**
 * Parameters for the strategy analytics derivation hook.
 */
export interface UseDebtStrategyAnalyticsParams {
  /** All debts from the active profile (active, closed, or zero balance) */
  debts: DebtItem[];
  /** Currently selected payoff strategy ("avalanche" | "snowball" | "custom" | "baseline") */
  selectedPayoffStrategy: DebtPayoffStrategyType;
  /** Extra monthly payment dedicated to debt acceleration (PLN/currency units) */
  extraMonthlyPayoff: number;
  /** User-defined order of debt IDs for custom payoff priority */
  customDebtOrder: string[];
  /** Optional array of overpayments for What-If simulation (default: []) */
  oneTimeOverpayments?: { month: number; amount: number }[];
  /** Optional transient preview strategy for What-If simulation (default: null) */
  previewStrategy?: DebtPayoffStrategyType | null;
  /** Saved user payoff scenarios for preview calculations (default: []) */
  savedScenarios?: DebtPayoffScenario[];
}

/**
 * Derived analytical outputs for debt payoff strategy visualization and configuration.
 */
export interface UseDebtStrategyAnalyticsResult {
  /** Filtered non-closed debts with balance > 0 */
  activeDebts: DebtItem[];
  /** Validated custom order guaranteed to contain all active debt IDs without duplicates or stale IDs */
  validatedCustomOrder: string[];
  /** Full portfolio payoff comparison across all strategies with current overpayment settings */
  payoffComparison: PortfolioPayoffComparison;
  /** Baseline portfolio payoff comparison (without one-time overpayment) used for What-If delta calculations */
  basePayoffComparison: PortfolioPayoffComparison;
  /** Payoff result matching the currently selected strategy (or baseline if not found) */
  selectedPayoffResult: DebtPayoffStrategyResult | null;
  /** Calculated duration/interest savings impact when What-If simulation is active, otherwise null */
  whatIfImpact: WhatIfImpactSummary | null;
  /** Map of saved scenario ID to its calculated payoff preview (debtFreeDate and totalInterestPaid) */
  savedScenarioPreviews: Record<string, SavedScenarioPreview>;
}

// Stable empty constants to avoid avoidable re-renders when data is empty
const EMPTY_ACTIVE_DEBTS: DebtItem[] = [];
const EMPTY_CUSTOM_ORDER: string[] = [];
const EMPTY_PREVIEWS: Record<string, SavedScenarioPreview> = {};

/**
 * Encapsulates analytical derivation and calculation preparation for portfolio payoff strategies.
 * Pure orchestration layer calling existing calculation services without UI state or side-effects.
 */
export function useDebtStrategyAnalytics({
  debts,
  selectedPayoffStrategy,
  extraMonthlyPayoff,
  customDebtOrder,
  oneTimeOverpayments = [],
  previewStrategy = null,
  savedScenarios = []
}: UseDebtStrategyAnalyticsParams): UseDebtStrategyAnalyticsResult {
  // 1. Active debts filtering (non-closed with balance > 0)
  const activeDebts = useMemo(() => {
    if (!debts || debts.length === 0) return EMPTY_ACTIVE_DEBTS;
    const filtered = debts.filter((d) => d && d.status !== "closed" && (Number(d.balance) || 0) > 0);
    return filtered.length === 0 ? EMPTY_ACTIVE_DEBTS : filtered;
  }, [debts]);

  // 2. Custom order validation against active debts
  const validatedCustomOrder = useMemo(() => {
    if (activeDebts.length === 0) return EMPTY_CUSTOM_ORDER;
    return buildValidatedCustomOrder(activeDebts, customDebtOrder);
  }, [activeDebts, customDebtOrder]);

  // 3. Simulated payoff comparison across strategies (with extra payment and one-time overpayment)
  const payoffComparison = useMemo(() => {
    return calculatePortfolioPayoffStrategies(
      activeDebts,
      extraMonthlyPayoff,
      undefined,
      validatedCustomOrder,
      oneTimeOverpayments
    );
  }, [activeDebts, extraMonthlyPayoff, validatedCustomOrder, oneTimeOverpayments]);

  // 4. Baseline payoff comparison (zero one-time overpayment) for What-If delta comparisons
  const basePayoffComparison = useMemo(() => {
    return calculatePortfolioPayoffStrategies(
      activeDebts,
      extraMonthlyPayoff,
      undefined,
      validatedCustomOrder,
      []
    );
  }, [activeDebts, extraMonthlyPayoff, validatedCustomOrder]);

  // 5. Currently active strategy result
  const selectedPayoffResult = useMemo(() => {
    if (selectedPayoffStrategy === "custom") {
      return payoffComparison.custom || null;
    }
    return payoffComparison[selectedPayoffStrategy] || payoffComparison.baseline || null;
  }, [selectedPayoffStrategy, payoffComparison]);

  // 6. What-If delta calculation (duration and interest difference)
  const whatIfImpact = useMemo(() => {
    if (oneTimeOverpayments.length === 0 && !previewStrategy) return null;
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
  }, [oneTimeOverpayments, previewStrategy, selectedPayoffStrategy, basePayoffComparison, payoffComparison]);

  // 7. Scenario previews derivation for all saved scenarios
  const savedScenarioPreviews = useMemo(() => {
    if (!savedScenarios || savedScenarios.length === 0) return EMPTY_PREVIEWS;
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
        scOrder,
        sc.oneTimeOverpayments ?? []
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
