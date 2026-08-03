import { useCallback } from "react";
import { Profile, Transaction, Payment } from "../../types";
import { autoCategorizeTransaction, getLocalDateIso } from "../../utils";

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
    }) => {
      if (!activeProfile) return;

      const rules = activeProfile.transactionRules || [];
      const categorized = autoCategorizeTransaction(data.name, rules, data.category);

      const newTx: Transaction = {
        id: "tx-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        ...data,
        category: categorized.category,
        categoryIcon: categorized.categoryIcon,
        currency: data.currency || activeProfile.currency || "PLN"
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
    (data: { name: string; amount: number; dueDate: string; paidBy?: "me" | "partner" | "joint"; splitMode?: "none" | "equal"; currency?: import("../../types").SupportedCurrency }) => {
      const newPayment: Payment = {
        id: "pay-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
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
          id: "tx-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
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
