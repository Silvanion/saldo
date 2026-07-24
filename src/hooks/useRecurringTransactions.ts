import { getLocalDateIso } from "../utils";
import { useEffect, useRef } from "react";
import { AppState, Profile } from "../types";
import { applyRecurringRules } from "../services/recurringEngine";

interface UseRecurringTransactionsProps {
  state: AppState;
  activeProfile: Profile | null;
  saveState: (newState: AppState) => Promise<void> | void;
}

export function useRecurringTransactions({
  state,
  activeProfile,
  saveState
}: UseRecurringTransactionsProps) {
  const isProcessing = useRef(false);

  useEffect(() => {
    if (!activeProfile || isProcessing.current) {
      return;
    }
    
    // Read rules strictly from activeProfile
    const rules = activeProfile.recurringRules ?? [];
    if (rules.length === 0) {
      return;
    }

    const todayStr = getLocalDateIso();

    const { updatedRules, generatedTransactions, hasChanges } = applyRecurringRules(
      rules,
      activeProfile.transactions,
      todayStr
    );

    if (hasChanges) {
      isProcessing.current = true;

      const updatedProfiles = state.profiles.map((p) => {
        if (p.id === activeProfile.id) {
          return {
            ...p,
            transactions: [...generatedTransactions, ...p.transactions],
            recurringRules: updatedRules
          };
        }
        return p;
      });

      Promise.resolve(
        saveState({
          ...state,
          profiles: updatedProfiles
        })
      ).finally(() => {
        isProcessing.current = false;
      });
    }
  }, [state, activeProfile, saveState]);
}
