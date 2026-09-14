import { activeKeys, generateRandomSalt } from "../services/crypto";
import { useCallback } from "react";
import { AppState, Profile, Transaction, Payment, Goal, Investment, RecurringRule, TransactionRule, SmartRule, BankAccount, SettlementEntry, SupportedCurrency, DebtItem, DebtPayoffScenario, FinancialActionPlan } from "../types";
import { autoCategorizeTransaction, hashPin, getLocalDateIso } from "../utils";
import { applyGoalTransferToProfile } from "../services/goalTransfers";
import { applySmartRulesToTransactions } from "../services/smartRules";
import { useTransactionActions } from "./actions/useTransactionActions";
import { useDataSyncActions } from "./actions/useDataSyncActions";

interface UseAppActionsProps {
  state: AppState;
  saveState: (newState: AppState) => Promise<void>;
  activeProfile: Profile | null;
  makeUndoBackup: () => void;
  unlockProfile: (profileId: string) => void;
  lockProfile: () => void;
  setActiveView: (view: any) => void;
  connectGoogle: (mode?: "basic" | "drive" | "calendar") => Promise<any>;
  disconnectGoogle: () => Promise<void>;
  toggleAutoSync: (enabled: boolean) => void;
  backupToDriveManual: () => Promise<void>;
  restoreFromDriveManual: () => Promise<void>;
  setApiError?: (message: string | null) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  openModal: (type: "confirm", payload: import("../uiTypes").ConfirmPayload) => void;
}

export function useAppActions({
  state,
  saveState,
  activeProfile,
  makeUndoBackup,
  unlockProfile,
  lockProfile,
  setActiveView,
  connectGoogle,
  disconnectGoogle,
  toggleAutoSync,
  backupToDriveManual,
  restoreFromDriveManual,
  setApiError,
  showToast,
  openModal
}: UseAppActionsProps) {
  const persistState = useCallback(
    (nextState: AppState) => {
      try {
        void Promise.resolve(saveState(nextState)).catch((err) => {
          console.error("Failed to save application state:", err);
          setApiError?.("Nie udało się zapisać zmian na urządzeniu.");
        });
      } catch (err) {
        console.error("Failed to save application state:", err);
        setApiError?.("Nie udało się zapisać zmian na urządzeniu.");
      }
    },
    [saveState, setApiError]
  );

  // Helper to update active profile safely
  const updateActiveProfile = useCallback(
    (updater: (profile: Profile) => Partial<Profile>) => {
      if (!activeProfile) return;
      let hasChanges = false;
      const updatedProfiles = state.profiles.map((p) => {
        if (p.id === activeProfile.id) {
          const patch = updater(p);
          const keys = Object.keys(patch) as (keyof Profile)[];
          if (keys.length === 0) {
            return p;
          }
          let isChanged = false;
          for (const key of keys) {
            if (p[key] !== patch[key]) {
              isChanged = true;
              break;
            }
          }
          if (isChanged) {
            hasChanges = true;
            return { ...p, ...patch };
          }
          return p;
        }
        return p;
      });

      if (hasChanges) {
        persistState({ ...state, profiles: updatedProfiles });
      }
    },
    [activeProfile, state, persistState]
  );



  // === GOALS & INVESTMENTS ===
  const handleAddGoal = useCallback(
    (data: { name: string; target: number }) => {
      const newGoal: Goal = {
        id: "goal-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        name: data.name,
        target: data.target,
        saved: 0
      };
      updateActiveProfile((p) => ({ goals: [...p.goals, newGoal] }));
    },
    [updateActiveProfile]
  );

  const handleDeleteGoal = useCallback(
    (goalId: string) => {
      updateActiveProfile((p) => {
        const targetGoal = p.goals.find((g) => g.id === goalId);
        if (targetGoal && (Number(targetGoal.saved) || 0) > 0) {
          console.warn("Nie można usunąć celu oszczędnościowego z dodatnimi środkami.");
          setApiError?.("Nie można usunąć celu z wpłaconymi środkami. Najpierw wypłać oszczędności.");
          return {};
        }
        return { goals: p.goals.filter((g) => g.id !== goalId) };
      });
    },
    [updateActiveProfile, setApiError]
  );

  const handleAddGoalDeposit = useCallback(
    (activeGoalForDeposit: Goal | null, amount: number, note?: string) => {
      if (!activeGoalForDeposit) return;
      const isoDate = getLocalDateIso();

      updateActiveProfile((p) =>
        applyGoalTransferToProfile(p, activeGoalForDeposit.id, amount, isoDate, { note })
      );
    },
    [updateActiveProfile]
  );

  const handleAddInvestment = useCallback(
    (name: string, amount: number, type?: string, notes?: string) => {
      const newInv: Investment = {
        id: "inv-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        name,
        amount,
        isoDate: getLocalDateIso(),
        type,
        notes
      };
      updateActiveProfile((p) => ({ investments: [newInv, ...p.investments] }));
    },
    [updateActiveProfile]
  );

  // === BUDGETS & RULES ===
  const handleSaveBudgets = useCallback(
    (budgets: Record<string, number>) => {
      updateActiveProfile(() => ({ budgets }));
    },
    [updateActiveProfile]
  );

  const handleSaveAccounts = useCallback(
    (accounts: BankAccount[]) => {
      updateActiveProfile(() => ({ accounts }));
    },
    [updateActiveProfile]
  );

  const handleSaveRecurringRules = useCallback(
    (newRules: RecurringRule[]) => {
      updateActiveProfile(() => ({ recurringRules: newRules }));
    },
    [updateActiveProfile]
  );

  const handleSaveSmartRules = useCallback(
    (newRules: SmartRule[]) => {
      updateActiveProfile(() => ({ smartRules: newRules }));
    },
    [updateActiveProfile]
  );

  const handleAddSmartRule = useCallback(
    (ruleData: Omit<SmartRule, "id" | "createdAt">) => {
      const newRule: SmartRule = {
        ...ruleData,
        id: "rule-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        createdAt: new Date().toISOString()
      };
      updateActiveProfile((p) => ({
        smartRules: [...(p.smartRules || []), newRule]
      }));
    },
    [updateActiveProfile]
  );

  const handleDeleteSmartRule = useCallback(
    (ruleId: string) => {
      updateActiveProfile((p) => ({
        smartRules: (p.smartRules || []).filter((r) => r.id !== ruleId)
      }));
    },
    [updateActiveProfile]
  );

  const handleToggleSmartRule = useCallback(
    (ruleId: string) => {
      updateActiveProfile((p) => ({
        smartRules: (p.smartRules || []).map((r) =>
          r.id === ruleId ? { ...r, enabled: !r.enabled } : r
        )
      }));
    },
    [updateActiveProfile]
  );

  const handleApplySmartRulesBulk = useCallback(
    (selectedTxIds?: string[]): { appliedCount: number } => {
      let appliedCount = 0;
      updateActiveProfile((p) => {
        const rules = p.smartRules || [];
        const result = applySmartRulesToTransactions(p.transactions || [], rules, selectedTxIds);
        appliedCount = result.appliedCount;
        return {
          transactions: result.updatedTransactions
        };
      });
      return { appliedCount };
    },
    [updateActiveProfile]
  );

  const handleSaveTransactionRules = useCallback(
    (newRules: TransactionRule[]) => {
      updateActiveProfile(() => ({ transactionRules: newRules }));
    },
    [updateActiveProfile]
  );

  // === DEBT PORTFOLIO ACTIONS ===
  const handleAddDebt = useCallback(
    (debtData: Omit<DebtItem, "id" | "createdAt">) => {
      const newDebt: DebtItem = {
        ...debtData,
        id: "debt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        createdAt: new Date().toISOString()
      };
      updateActiveProfile((p) => ({
        debts: [newDebt, ...(p.debts || [])]
      }));
      showToast("Dodano nowe zobowiązanie do portfela", "success");
    },
    [updateActiveProfile, showToast]
  );

  const handleUpdateDebt = useCallback(
    (debtId: string, updates: Partial<DebtItem>) => {
      updateActiveProfile((p) => ({
        debts: (p.debts || []).map((d) =>
          d.id === debtId ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
        )
      }));
      showToast("Zaktualizowano dane zobowiązania", "success");
    },
    [updateActiveProfile, showToast]
  );

  const handleDeleteDebt = useCallback(
    (debtId: string) => {
      updateActiveProfile((p) => ({
        debts: (p.debts || []).filter((d) => d.id !== debtId)
      }));
      showToast("Usunięto zobowiązanie z portfela", "info");
    },
    [updateActiveProfile, showToast]
  );

  const handleToggleDebtStatus = useCallback(
    (debtId: string) => {
      let isNowClosed = false;
      updateActiveProfile((p) => ({
        debts: (p.debts || []).map((d) => {
          if (d.id === debtId) {
            const nextStatus = d.status === "closed" ? "active" : "closed";
            isNowClosed = nextStatus === "closed";
            return { ...d, status: nextStatus, updatedAt: new Date().toISOString() };
          }
          return d;
        })
      }));
      showToast(isNowClosed ? "Oznaczono jako spłacone / zamknięte" : "Przywrócono zobowiązanie jako aktywne", "info");
    },
    [updateActiveProfile, showToast]
  );

  const handleSavePayoffScenario = useCallback(
    (scenarioData: Omit<DebtPayoffScenario, "id" | "createdAt"> & { id?: string }) => {
      let isUpdate = false;
      let limitReached = false;

      updateActiveProfile((p) => {
        const existingScenarios = p.debtPayoffScenarios || [];
        if (scenarioData.id) {
          // Update existing
          isUpdate = true;
          return {
            debtPayoffScenarios: existingScenarios.map((s) =>
              s.id === scenarioData.id
                ? {
                    ...s,
                    ...scenarioData,
                    updatedAt: new Date().toISOString()
                  }
                : s
            )
          };
        }

        // New scenario: enforce max 5 limit
        if (existingScenarios.length >= 5) {
          limitReached = true;
          return {};
        }

        const newScenario: DebtPayoffScenario = {
          ...scenarioData,
          id: "scenario-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
          createdAt: new Date().toISOString()
        };

        return {
          debtPayoffScenarios: [newScenario, ...existingScenarios]
        };
      });

      if (limitReached) {
        showToast("Osiągnięto limit 5 zapisanych scenariuszy. Usuń jeden przed dodaniem nowego.", "error");
      } else if (isUpdate) {
        showToast("Zaktualizowano scenariusz spłaty", "success");
      } else {
        showToast("Zapisano nowy scenariusz spłaty", "success");
      }
    },
    [updateActiveProfile, showToast]
  );

  const handleDeletePayoffScenario = useCallback(
    (scenarioId: string) => {
      updateActiveProfile((p) => ({
        debtPayoffScenarios: (p.debtPayoffScenarios || []).filter((s) => s.id !== scenarioId)
      }));
      showToast("Usunięto scenariusz spłaty", "info");
    },
    [updateActiveProfile, showToast]
  );

  const handleAddSettlement = useCallback(
    (entry: { amount: number; isoDate: string; note?: string }) => {
      const newSettlement: SettlementEntry = {
        id: "set-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        amount: entry.amount,
        isoDate: entry.isoDate,
        note: entry.note,
        createdAt: new Date().toISOString()
      };
      updateActiveProfile((p) => ({
        settlements: [newSettlement, ...(p.settlements || [])]
      }));
    },
    [updateActiveProfile]
  );

  const handleDeleteSettlement = useCallback(
    (settlementId: string) => {
      updateActiveProfile((p) => ({
        settlements: (p.settlements || []).filter((s) => s.id !== settlementId)
      }));
    },
    [updateActiveProfile]
  );

  const handleSaveFinancialPlan = useCallback(
    (plan: FinancialActionPlan) => {
      updateActiveProfile((p) => {
        const existing = p.financialPlans || [];
        const index = existing.findIndex((pl) => pl.id === plan.id);
        const updatedPlans =
          index >= 0
            ? existing.map((pl) => (pl.id === plan.id ? plan : pl))
            : [plan, ...existing];
        return { financialPlans: updatedPlans };
      });
      showToast?.("Zapisano plan działania.", "success");
    },
    [updateActiveProfile, showToast]
  );

  const handleTogglePlanItem = useCallback(
    (planId: string, itemId: string) => {
      updateActiveProfile((p) => {
        const plans = (p.financialPlans || []).map((plan) => {
          if (plan.id !== planId) return plan;
          const updatedItems = plan.items.map((it) => {
            if (it.id !== itemId) return it;
            const completed = !it.completed;
            return {
              ...it,
              completed,
              completedAt: completed ? new Date().toISOString() : undefined,
            };
          });
          const allCompleted = updatedItems.length > 0 && updatedItems.every((it) => it.completed);
          return {
            ...plan,
            items: updatedItems,
            status: allCompleted ? ("completed" as const) : ("in_progress" as const),
            updatedAt: new Date().toISOString(),
          };
        });
        return { financialPlans: plans };
      });
    },
    [updateActiveProfile]
  );

  const handleDeleteFinancialPlan = useCallback(
    (planId: string) => {
      updateActiveProfile((p) => ({
        financialPlans: (p.financialPlans || []).filter((pl) => pl.id !== planId),
      }));
      showToast?.("Usunięto plan działania.", "info");
    },
    [updateActiveProfile, showToast]
  );

  const handleUpdateFinancialPlanStatus = useCallback(
    (planId: string, status: "in_progress" | "completed" | "paused") => {
      updateActiveProfile((p) => ({
        financialPlans: (p.financialPlans || []).map((pl) =>
          pl.id === planId ? { ...pl, status, updatedAt: new Date().toISOString() } : pl
        ),
      }));
    },
    [updateActiveProfile]
  );

  const handleSelectProfile = useCallback(
    (profileId: string) => {
      const nextProfile = state.profiles.find((p) => p.id === profileId);
      if (nextProfile) {
        persistState({ ...state, activeProfileId: profileId });
        if (!nextProfile.pinHash) {
          unlockProfile(profileId);
        }
        setActiveView("dashboard");
      }
    },
    [state, persistState, unlockProfile, setActiveView]
  );

  const handleSwitchProfile = useCallback(() => {
    persistState({ ...state, activeProfileId: null });
    setActiveView("dashboard");
  }, [state, persistState, setActiveView]);

  const handleDeleteProfile = useCallback(
    (profileId: string) => {

      const remainingProfiles = state.profiles.filter((p) => p.id !== profileId);
      
      let nextActiveId = state.activeProfileId;
      if (nextActiveId === profileId) {
        nextActiveId = remainingProfiles.length > 0 ? remainingProfiles[0].id : null;
      }

      const updatedState = {
        ...state,
        profiles: remainingProfiles,
        activeProfileId: nextActiveId
      };
      
      makeUndoBackup();
      persistState(updatedState);
      
      if (activeKeys[profileId]) {
         delete activeKeys[profileId];
      }
      
      if (nextActiveId) {
         setActiveView("dashboard");
      }
    },
    [state, persistState, makeUndoBackup, setActiveView]
  );

  const handleUpdateProfile = useCallback(
    async (profileId: string, data: { name: string; kind: "personal" | "shared"; partnerName: string; avatar: string; currency: SupportedCurrency }) => {
      const profileIndex = state.profiles.findIndex((p) => p.id === profileId);
      if (profileIndex === -1) return;

      const updatedProfile = { ...state.profiles[profileIndex] };
      updatedProfile.name = data.name;
      updatedProfile.kind = data.kind;
      updatedProfile.partnerName = data.partnerName;
      updatedProfile.avatar = data.avatar;
      updatedProfile.currency = data.currency;

      const updatedProfiles = [...state.profiles];
      updatedProfiles[profileIndex] = updatedProfile;

      const updatedState = { ...state, profiles: updatedProfiles };
      await saveState(updatedState);
    },
    [state, saveState]
  );

  const handleAddProfile = useCallback(
    async (data: { name: string; kind: "personal" | "shared"; partnerName: string; pin: string; avatar: string }) => {
      const newId = "profile-" + Date.now();
      const newSalt = generateRandomSalt();
      const newProfile: Profile = {
        id: newId,
        name: data.name,
        kind: data.kind,
        partnerName: data.partnerName,
        avatar: data.avatar,
        pinHash: "",
        salt: newSalt,
        transactions: [],
        payments: [],
        goals: [],
        investments: [],
        currency: "PLN",
        budgets: {
          "Żywność": 0,
          "Dom i rachunki": 0,
          "Transport": 0,
          "Rozrywka": 0
        }
      };

      if (data.pin) {
        newProfile.pinHash = await hashPin(data.pin, newSalt);
      }

      const updatedState: AppState = {
        ...state,
        profiles: [...state.profiles, newProfile],
        activeProfileId: newId
      };
      try {
        await saveState(updatedState);
        unlockProfile(newId);
        setActiveView("dashboard");
      } catch (err) {
        console.error("Failed to save new profile:", err);
        setApiError?.("Nie udało się zapisać nowego profilu.");
      }
    },
    [state, saveState, unlockProfile, setActiveView, setApiError]
  );

  const txActions = useTransactionActions({
    activeProfile,
    updateActiveProfile,
    setApiError
  });

  const syncActions = useDataSyncActions({
    state,
    saveState,
    makeUndoBackup,
    lockProfile,
    setActiveView,
    connectGoogle,
    disconnectGoogle,
    toggleAutoSync,
    backupToDriveManual,
    restoreFromDriveManual,
    showToast,
    openModal
  });

  return {
    ...txActions,
    ...syncActions,
    handleAddGoal,
    handleDeleteGoal,
    handleAddGoalDeposit,
    handleAddInvestment,
    handleSaveBudgets,
    handleSaveAccounts,
    handleSaveRecurringRules,
    handleSaveTransactionRules,
    handleSaveSmartRules,
    handleAddSmartRule,
    handleDeleteSmartRule,
    handleToggleSmartRule,
    handleApplySmartRulesBulk,
    handleAddSettlement,
    handleDeleteSettlement,
    handleAddDebt,
    handleUpdateDebt,
    handleDeleteDebt,
    handleToggleDebtStatus,
    handleSavePayoffScenario,
    handleDeletePayoffScenario,
    handleSelectProfile,
    handleSwitchProfile,
    handleAddProfile,
    handleUpdateProfile,
    handleDeleteProfile,
    handleSaveFinancialPlan,
    handleTogglePlanItem,
    handleDeleteFinancialPlan,
    handleUpdateFinancialPlanStatus,
  };
}
