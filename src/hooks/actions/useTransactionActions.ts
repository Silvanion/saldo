import { useCallback } from "react";
import { Profile, Transaction, Payment } from "../../types";
import { autoCategorizeTransaction, getLocalDateIso } from "../../utils";
import { calculateDebtPaymentBreakdown, calculateDebtPaymentReversal } from "../../services/debtCalculations";
import { generateEntityId } from "../../utils/id";
import { computeTransactionFingerprint } from "../../services/duplicateDetector";

interface UseTransactionActionsProps {
  activeProfile: Profile | null;
  updateActiveProfile: (updater: (profile: Profile) => Partial<Profile>) => void;
  setApiError?: (message: string | null) => void;
}

export function useTransactionActions({
  activeProfile,
  updateActiveProfile,
  setApiError
}: UseTransactionActionsProps) {
  
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
      currency?: import("../../types").SupportedCurrency;
      debtId?: string;
      tags?: string[];
    }) => {
      if (!activeProfile) return;

      const rules = activeProfile.transactionRules || [];
      const categorized = autoCategorizeTransaction(data.name, rules, data.category);

      const newTx: Transaction = {
        id: generateEntityId('transaction'),
        ...data,
        category: categorized.category,
        categoryIcon: categorized.categoryIcon,
        currency: data.currency || activeProfile.currency || "PLN"
      };

      updateActiveProfile((p) => {
        const patch: Partial<Profile> = {
          transactions: [newTx, ...p.transactions]
        };

        if (newTx.debtId && newTx.type === "expense" && newTx.amount > 0 && Array.isArray(p.debts)) {
          const debt = p.debts.find((d) => d.id === newTx.debtId);
          if (debt && debt.status !== "closed") {
            const breakdown = calculateDebtPaymentBreakdown(debt, newTx.amount);
            patch.debts = p.debts.map((d) =>
              d.id === debt.id
                ? {
                    ...d,
                    balance: breakdown.closingBalance,
                    updatedAt: new Date().toISOString()
                  }
                : d
            );
          }
        }

        return patch;
      });
    },
    [activeProfile, updateActiveProfile]
  );

  const handleUpdateTransaction = useCallback(
    (txId: string, data: Partial<Transaction>) => {
      updateActiveProfile((p) => {
        const index = p.transactions.findIndex((t) => t.id === txId);
        if (index === -1) return {};

        const existing = p.transactions[index];
        const updated: Transaction = { ...existing, ...data };

        // Keep technical fields intact
        updated.id = existing.id;
        updated.isRecurring = existing.isRecurring;
        updated.recurringRuleId = existing.recurringRuleId;
        updated.sourcePaymentId = existing.sourcePaymentId;

        const newTransactions = [...p.transactions];
        newTransactions[index] = updated;

        const patch: Partial<Profile> = { transactions: newTransactions };

        if (Array.isArray(p.debts) && p.debts.length > 0) {
          let debts = [...p.debts];

          // 1. Reverse previous debt impact if old transaction was linked expense
          if (existing.debtId && existing.type === "expense" && existing.amount > 0) {
            const oldDebt = debts.find((d) => d.id === existing.debtId);
            if (oldDebt) {
              const restoredBalance = calculateDebtPaymentReversal(oldDebt, existing.amount);
              debts = debts.map((d) =>
                d.id === oldDebt.id
                  ? { ...d, balance: restoredBalance, updatedAt: new Date().toISOString() }
                  : d
              );
            }
          }

          // 2. Apply new debt impact if updated transaction is linked expense
          if (updated.debtId && updated.type === "expense" && updated.amount > 0) {
            const newDebt = debts.find((d) => d.id === updated.debtId);
            if (newDebt && newDebt.status !== "closed") {
              const breakdown = calculateDebtPaymentBreakdown(newDebt, updated.amount);
              debts = debts.map((d) =>
                d.id === newDebt.id
                  ? { ...d, balance: breakdown.closingBalance, updatedAt: new Date().toISOString() }
                  : d
              );
            }
          }

          patch.debts = debts;
        }

        return patch;
      });
    },
    [updateActiveProfile]
  );

  const handleImportTransactions = useCallback(
    (newTransactions: Transaction[]) => {
      updateActiveProfile((p) => {
        const existingIds = new Set(p.transactions.map((t) => t.id));
        const existingFingerprints = new Set(p.transactions.map(computeTransactionFingerprint));
        const validAndUnique: Transaction[] = [];

        for (const tx of newTransactions) {
          if (!tx || !tx.id || existingIds.has(tx.id)) {
            continue;
          }
          const numAmount = Number(tx.amount);
          if (!Number.isFinite(numAmount)) {
            continue;
          }

          const fp = computeTransactionFingerprint(tx);
          if (existingFingerprints.has(fp)) {
            // Idempotencja: transakcja o identycznych danych już istnieje w profilu
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
          existingFingerprints.add(fp);
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
      updateActiveProfile((p) => {
        const existingTx = p.transactions.find((t) => t.id === txId);
        const patch: Partial<Profile> = {
          transactions: p.transactions.filter((t) => t.id !== txId)
        };

        if (
          existingTx &&
          existingTx.debtId &&
          existingTx.type === "expense" &&
          existingTx.amount > 0 &&
          Array.isArray(p.debts)
        ) {
          const debt = p.debts.find((d) => d.id === existingTx.debtId);
          if (debt) {
            const restoredBalance = calculateDebtPaymentReversal(debt, existingTx.amount);
            patch.debts = p.debts.map((d) =>
              d.id === debt.id
                ? { ...d, balance: restoredBalance, updatedAt: new Date().toISOString() }
                : d
            );
          }
        }

        return patch;
      });
    },
    [updateActiveProfile]
  );

  // === PAYMENTS ===
  const handleAddPayment = useCallback(
    (data: { name: string; amount: number; dueDate: string; paidBy?: "me" | "partner" | "joint"; splitMode?: "none" | "equal"; currency?: import("../../types").SupportedCurrency }) => {
      const newPayment: Payment = {
        id: generateEntityId('payment'),
        name: data.name,
        amount: data.amount,
        dueDate: data.dueDate,
        status: "Do opłacenia",
        paidBy: data.paidBy,
        splitMode: data.splitMode,
        currency: data.currency || activeProfile?.currency || "PLN"
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
          id: generateEntityId('transaction'),
          name: payment.name,
          amount: payment.amount,
          category: payment.category || "Rachunki",
          account: p.accounts?.[0]?.name || "Konto Główne",
          type: "expense",
          isoDate: getLocalDateIso(),
          sourcePaymentId: payment.id,
          paidBy: payment.paidBy,
          splitMode: payment.splitMode,
          currency: payment.currency
        };

        return { 
          payments: updatedPayments,
          transactions: [newTx, ...(p.transactions || [])]
        };
      });
    },
    [updateActiveProfile, setApiError]
  );

  return {
    handleAddTransaction,
    handleUpdateTransaction,
    handleImportTransactions,
    handleDeleteTransaction,
    handleAddPayment,
    handleUpdatePayment,
    handleDeletePayment,
    handleTogglePaymentStatus
  };
}
