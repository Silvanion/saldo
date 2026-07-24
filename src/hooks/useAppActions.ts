import { activeKeys, generateRandomSalt } from "../services/crypto";
import { useCallback } from "react";
import { AppState, Profile, Transaction, Payment, Goal, Investment, RecurringRule, TransactionRule, BankAccount, SettlementEntry } from "../types";
import { autoCategorizeTransaction, hashPin, getLocalDateIso } from "../utils";
import { validateAndMigrateState } from "./useBudgetState";
import { applyGoalTransferToProfile } from "../services/goalTransfers";

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

  // === TRANSACTIONS ===
  const handleAddTransaction = useCallback(
    (data: {
      name: string;
      amount: number;
      category: string;
      categoryIcon?: string;
      account: string;
      type: "income" | "expense";
      isoDate: string;
      paidBy?: "me" | "partner" | "joint";
      splitMode?: "none" | "equal";
    }) => {
      if (!activeProfile) return;

      const rules = activeProfile.transactionRules || [];
      const categorized = autoCategorizeTransaction(data.name, rules, data.category);

      const newTx: Transaction = {
        id: "tx-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        ...data,
        category: categorized.category,
        categoryIcon: categorized.categoryIcon
      };

      updateActiveProfile((p) => ({ transactions: [newTx, ...p.transactions] }));
    },
    [activeProfile, updateActiveProfile]
  );

  const handleUpdateTransaction = useCallback(
    (txId: string, data: Partial<Transaction>) => {
      updateActiveProfile((p) => {
        const index = p.transactions.findIndex((t) => t.id === txId);
        if (index === -1) return {};

        const existing = p.transactions[index];
        const updated = { ...existing, ...data };

        // Keep technical fields intact
        updated.id = existing.id;
        updated.isRecurring = existing.isRecurring;
        updated.recurringRuleId = existing.recurringRuleId;
        updated.sourcePaymentId = existing.sourcePaymentId;

        const newTransactions = [...p.transactions];
        newTransactions[index] = updated;

        return { transactions: newTransactions };
      });
    },
    [updateActiveProfile]
  );

  const handleImportTransactions = useCallback(
    (newTransactions: Transaction[]) => {
      updateActiveProfile((p) => {
        const existingIds = new Set(p.transactions.map((t) => t.id));
        const validAndUnique: Transaction[] = [];

        for (const tx of newTransactions) {
          if (!tx || !tx.id || existingIds.has(tx.id)) {
            continue;
          }
          const numAmount = Number(tx.amount);
          if (!Number.isFinite(numAmount)) {
            continue;
          }

          let enrichedTx = tx;
          if (p.kind === "shared" && !tx.paidBy) {
            enrichedTx = {
              ...tx,
              paidBy: "me",
              splitMode: tx.type === "expense" ? "equal" : "none"
            };
          }

          existingIds.add(tx.id);
          validAndUnique.push(enrichedTx);
        }

        if (validAndUnique.length === 0) {
          return {};
        }

        return { transactions: [...validAndUnique, ...p.transactions] };
      });
    },
    [updateActiveProfile]
  );

  const handleDeleteTransaction = useCallback(
    (txId: string) => {
      updateActiveProfile((p) => ({ transactions: p.transactions.filter((t) => t.id !== txId) }));
    },
    [updateActiveProfile]
  );

  // === PAYMENTS ===
  const handleAddPayment = useCallback(
    (data: { name: string; amount: number; dueDate: string; paidBy?: "me" | "partner" | "joint"; splitMode?: "none" | "equal" }) => {
      const newPayment: Payment = {
        id: "pay-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        name: data.name,
        amount: data.amount,
        dueDate: data.dueDate,
        status: "Do opłacenia",
        paidBy: data.paidBy,
        splitMode: data.splitMode
      };
      updateActiveProfile((p) => ({ payments: [...p.payments, newPayment] }));
    },
    [updateActiveProfile]
  );

  const handleUpdatePayment = useCallback(
    (paymentId: string, data: Partial<Payment>) => {
      updateActiveProfile((p) => {
        const index = p.payments.findIndex((pay) => pay.id === paymentId);
        if (index === -1) return {};

        const existing = p.payments[index];
        const updated = { ...existing, ...data };

        // Keep technical fields intact
        updated.id = existing.id;
        updated.status = existing.status;
        updated.isRecurring = existing.isRecurring;
        updated.recurringRuleId = existing.recurringRuleId;

        const newPayments = [...p.payments];
        newPayments[index] = updated;

        return { payments: newPayments };
      });
    },
    [updateActiveProfile]
  );

  const handleDeletePayment = useCallback(
    (payId: string, mode: "payment-only" | "payment-and-linked-transaction" = "payment-only") => {
      updateActiveProfile((p) => {
        const index = p.payments.findIndex((pay) => pay.id === payId);
        if (index === -1) return {};

        const newPayments = p.payments.filter((pay) => pay.id !== payId);

        if (mode === "payment-and-linked-transaction") {
          const newTransactions = p.transactions.filter((tx) => tx.sourcePaymentId !== payId);
          return { payments: newPayments, transactions: newTransactions };
        }

        return { payments: newPayments };
      });
    },
    [updateActiveProfile]
  );

  const handleTogglePaymentStatus = useCallback(
    (paymentId: string) => {
      updateActiveProfile((p) => {
        const payment = p.payments.find((pay) => pay.id === paymentId);
        if (!payment) return {};
        if (payment.status === "Opłacono") {
          console.warn("Cofanie statusu 'Opłacono' jest zablokowane.");
          setApiError?.("Nie można cofnąć statusu „Opłacono”. Usuń powiązaną transakcję ręcznie, jeśli to pomyłka.");
          return {};
        }

        const updatedPayments = p.payments.map((pay) => {
          if (pay.id === paymentId) {
            return {
              ...pay,
              status: "Opłacono" as const
            };
          }
          return pay;
        });

        const existingTx = (p.transactions || []).find((tx) => tx.sourcePaymentId === paymentId);
        if (existingTx) {
          return {
            payments: updatedPayments
          };
        }

        const newTx: Transaction = {
          id: "tx-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
          name: payment.name,
          amount: payment.amount,
          category: payment.category || "Rachunki",
          account: p.accounts?.[0]?.name || "Konto Główne",
          type: "expense",
          isoDate: getLocalDateIso(),
          sourcePaymentId: payment.id,
          paidBy: payment.paidBy,
          splitMode: payment.splitMode
        };

        return { 
          payments: updatedPayments,
          transactions: [newTx, ...(p.transactions || [])]
        };
      });
    },
    [updateActiveProfile, setApiError]
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

  // === DATA & GOOGLE INTEGRATION ===
  const handleExportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saldo-kopia-zapasowa-${getLocalDateIso()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state]);

  const handleResetData = useCallback(async () => {
    // TODO: replace with app modal/toast system
    const confirmed = window.confirm(
      "OSTRZEŻENIE: Ta operacja usunie wszystkie dane profilów (transakcje, płatności, cele, budżety). Jesteś pewien?"
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/state/reset", { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        makeUndoBackup();
        saveState(result.data);
        lockProfile();
        setActiveView("dashboard");
        alert("Baza danych została zresetowana do ustawień początkowych.");
      }
    } catch (err) {
      console.error("Failed to reset data:", err);
      alert("Nie udało się zresetować bazy danych.");
    }
  }, [makeUndoBackup, saveState, lockProfile, setActiveView]);

  const handleImportLocalData = useCallback(
    (importedState: AppState) => {
      if (!importedState || !Array.isArray(importedState.profiles)) {
        alert("Błędna struktura pliku JSON. Import przerwany.");
        return;
      }
      const validated = validateAndMigrateState(importedState);
      // TODO: replace with app modal/toast system
      const confirmed = window.confirm(
        "Czy chcesz zastąpić obecne dane danymi z pliku lokalnego? W razie potrzeby możesz cofnąć tę zmianę."
      );
      if (!confirmed) return;

      makeUndoBackup();
      saveState(validated);
      alert("Kopia lokalna została pomyślnie wczytana!");
    },
    [makeUndoBackup, saveState]
  );

  const handleConnectGoogle = useCallback(async () => {
    try {
      await connectGoogle("drive");
    } catch (e) {
      console.error("Google connect error", e);
    }
  }, [connectGoogle]);

  const handleDisconnectGoogle = useCallback(async () => {
    await disconnectGoogle();
    toggleAutoSync(false);
  }, [disconnectGoogle, toggleAutoSync]);

  const handleSyncToDrive = useCallback(
    async (silent = false) => {
      try {
        await backupToDriveManual();
        if (!silent) {
          alert("Baza budżetu została pomyślnie zapisana na Dysku Google!");
        }
      } catch (err: any) {
        if (!silent) {
          alert(err.message || "Błąd zapisu na Dysku Google. Spróbuj ponownie później.");
        }
      }
    },
    [backupToDriveManual]
  );

  const handleLoadFromDrive = useCallback(async () => {
    // TODO: replace with app modal/toast system
    const confirmed = window.confirm(
      "Czy na pewno chcesz pobrać plik 'saldo_budget.json' z Dysku Google i zastąpić całą lokalną bazę danych? Obecne lokalne dane zostaną trwale nadpisane."
    );
    if (!confirmed) return;

    try {
      await restoreFromDriveManual();
      alert("Baza danych została pomyślnie przywrócona z Dysku Google!");
    } catch (err: any) {
      alert(err.message || "Nie udało się pobrać danych z Dysku Google.");
    }
  }, [restoreFromDriveManual]);

  return {
    handleAddTransaction,
    handleUpdateTransaction,
    handleImportTransactions,
    handleDeleteTransaction,
    handleAddPayment,
    handleUpdatePayment,
    handleDeletePayment,
    handleTogglePaymentStatus,
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
    handleResetData,
    handleExportData,
    handleImportLocalData,
    handleConnectGoogle,
    handleDisconnectGoogle,
    handleSyncToDrive,
    handleLoadFromDrive,
  };
}
