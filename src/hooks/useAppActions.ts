import { activeKeys, generateRandomSalt } from "../services/crypto";
import { useCallback } from "react";
import { AppState, Profile, Transaction, Payment, Goal, Investment, RecurringRule, TransactionRule, BankAccount, SettlementEntry } from "../types";
import { autoCategorizeTransaction, hashPin, getLocalDateIso } from "../utils";
import { applyGoalTransferToProfile } from "../services/goalTransfers";
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
  setApiError
}: UseAppActionsProps) {
  
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
        saveState({ ...state, profiles: updatedProfiles });
      }
    },
    [activeProfile, state, saveState]
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

  const handleSaveTransactionRules = useCallback(
    (newRules: TransactionRule[]) => {
      updateActiveProfile(() => ({ transactionRules: newRules }));
    },
    [updateActiveProfile]
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

  // === PROFILES ===
  const handleSelectProfile = useCallback(
    (profileId: string) => {
      const nextProfile = state.profiles.find((p) => p.id === profileId);
      if (nextProfile) {
        saveState({ ...state, activeProfileId: profileId });
        if (!nextProfile.pinHash) {
          unlockProfile(profileId);
        }
        setActiveView("dashboard");
      }
    },
    [state, saveState, unlockProfile, setActiveView]
  );

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
      saveState(updatedState);
      
      if (activeKeys[profileId]) {
         delete activeKeys[profileId];
      }
      
      if (nextActiveId) {
         setActiveView("dashboard");
      }
    },
    [state, saveState, makeUndoBackup, setActiveView]
  );

  const handleUpdateProfile = useCallback(
    async (profileId: string, data: { name: string; kind: "personal" | "shared"; partnerName: string; avatar: string }) => {
      const profileIndex = state.profiles.findIndex((p) => p.id === profileId);
      if (profileIndex === -1) return;

      const updatedProfile = { ...state.profiles[profileIndex] };
      updatedProfile.name = data.name;
      updatedProfile.kind = data.kind;
      updatedProfile.partnerName = data.partnerName;
      updatedProfile.avatar = data.avatar;

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
        currency: state.currencyPreference || "PLN",
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
      saveState(updatedState);
      unlockProfile(newId);
      setActiveView("dashboard");
    },
    [state, saveState, unlockProfile, setActiveView]
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
    restoreFromDriveManual
  });

  const handleSaveAppLanguagePreference = useCallback(
    (pref: AppState["languagePreference"]) => {
      saveState({ ...state, languagePreference: pref });
    },
    [state, saveState]
  );

  const handleSaveAppCurrencyPreference = useCallback(
    (pref: AppState["currencyPreference"]) => {
      saveState({ ...state, currencyPreference: pref });
    },
    [state, saveState]
  );

  return {
    ...txActions,
    ...syncActions,
    handleSaveAppLanguagePreference,
    handleSaveAppCurrencyPreference,
    handleAddGoal,
    handleDeleteGoal,
    handleAddGoalDeposit,
    handleAddInvestment,
    handleSaveBudgets,
    handleSaveAccounts,
    handleSaveRecurringRules,
    handleSaveTransactionRules,
    handleAddSettlement,
    handleDeleteSettlement,
    handleSelectProfile,
    handleAddProfile,
    handleUpdateProfile,
    handleDeleteProfile,
  };
}
