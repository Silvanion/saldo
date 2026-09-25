import { Profile, Transaction, Payment, Goal, BankAccount } from "../types";
import { checkDuplicate } from "./duplicateDetector";
import { findMatchingRule } from "./smartRules";
import { generateEntityId } from "../utils/id";

export type AuditIssueType =
  | "duplicate"
  | "orphaned_account"
  | "missing_category"
  | "date_anomaly"
  | "unlinked_payment"
  | "goal_desync";

export type AuditSeverity = "critical" | "warning" | "info";

export interface DataAuditIssue {
  id: string;
  type: AuditIssueType;
  severity: AuditSeverity;
  title: string;
  description: string;
  suggestedActionLabel: string;
  targetEntityId: string;
  metadata?: Record<string, any>;
}

export interface DataAuditReport {
  healthScore: number; // 0..100
  status: "perfect" | "good" | "needs_attention" | "critical";
  issues: DataAuditIssue[];
  issuesCount: number;
  scannedCounts: {
    transactions: number;
    payments: number;
    accounts: number;
    goals: number;
  };
}

export function runDataAudit(profile: Profile): DataAuditReport {
  const issues: DataAuditIssue[] = [];
  const transactions = profile.transactions || [];
  const payments = profile.payments || [];
  const accounts = profile.accounts || [];
  const goals = profile.goals || [];

  const knownAccountNames = new Set<string>();
  accounts.forEach((acc) => {
    if (acc.name) knownAccountNames.add(acc.name.trim().toLowerCase());
  });

  // 1. Audit Transactions: Duplicates, Orphaned Accounts, Missing Categories, Date Anomalies
  const seenTxIds = new Set<string>();
  const duplicatePairIds = new Set<string>();

  // Pre-index transactions by currency, type, and rounded amount to eliminate O(N^2) full-array scans
  interface IndexedTx {
    tx: Transaction;
    index: number;
  }
  const txCandidatesByBucket = new Map<string, IndexedTx[]>();
  for (let idx = 0; idx < transactions.length; idx++) {
    const t = transactions[idx];
    const amt = Math.round((Number(t.amount) || 0) * 100);
    const bucketKey = `${t.currency || "PLN"}_${t.type}_${amt}`;
    const list = txCandidatesByBucket.get(bucketKey);
    if (!list) {
      txCandidatesByBucket.set(bucketKey, [{ tx: t, index: idx }]);
    } else {
      list.push({ tx: t, index: idx });
    }
  }

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    seenTxIds.add(tx.id);

    // Duplicate check using O(1) bucket candidates
    if (!duplicatePairIds.has(tx.id)) {
      const amt = Math.round((Number(tx.amount) || 0) * 100);
      const bucketKey = `${tx.currency || "PLN"}_${tx.type}_${amt}`;
      const bucket = txCandidatesByBucket.get(bucketKey);

      if (bucket && bucket.length > 1) {
        const remaining = bucket.filter(item => item.index > i).map(item => item.tx);
        if (remaining.length > 0) {
          const dupResult = checkDuplicate(tx, remaining);
          if (dupResult.isLikelyDuplicate && dupResult.matchedTransactionId) {
            duplicatePairIds.add(dupResult.matchedTransactionId);
            issues.push({
              id: `dup-${tx.id}-${dupResult.matchedTransactionId}`,
              type: "duplicate",
              severity: "warning",
              title: `Prawdopodobny duplikat: ${tx.name}`,
              description: `Wykryto zdublowaną transakcję na kwotę ${tx.amount} ${tx.currency} (${tx.isoDate}). ${dupResult.reason || ""}`,
              suggestedActionLabel: "Usuń duplikat",
              targetEntityId: dupResult.matchedTransactionId,
              metadata: {
                originalTxId: tx.id,
                duplicateTxId: dupResult.matchedTransactionId,
                amount: tx.amount
              }
            });
          }
        }
      }
    }

    // Orphaned Account check
    const txAccount = tx.account?.trim() || "";
    if (!txAccount || (accounts.length > 0 && !knownAccountNames.has(txAccount.toLowerCase()))) {
      issues.push({
        id: `orphan-acc-${tx.id}`,
        type: "orphaned_account",
        severity: "warning",
        title: `Brakujące lub nieznane konto: ${tx.name}`,
        description: txAccount
          ? `Transakcja jest przypisana do nieistniejącego konta „${txAccount}”.`
          : `Transakcja nie posiada przypisanego żadnego konta bankowego.`,
        suggestedActionLabel: "Przypisz do konta głównego",
        targetEntityId: tx.id,
        metadata: {
          currentAccount: txAccount
        }
      });
    }

    // Missing Category check
    const cat = tx.category?.trim().toLowerCase() || "";
    if (!cat || cat === "brak" || cat === "inne" || cat === "bez kategorii") {
      issues.push({
        id: `cat-${tx.id}`,
        type: "missing_category",
        severity: "info",
        title: `Nieskategoryzowany wydatek: ${tx.name}`,
        description: `Transakcja nie posiada sprecyzowanej kategorii (${tx.category || "Pusta"}). Wpływa to na dokładność analizy 50/30/20.`,
        suggestedActionLabel: "Dopasuj kategorię automatycznie",
        targetEntityId: tx.id,
        metadata: {
          txName: tx.name
        }
      });
    }

    // Date Anomaly check
    if (!tx.isoDate) {
      issues.push({
        id: `date-empty-${tx.id}`,
        type: "date_anomaly",
        severity: "critical",
        title: `Brak daty w transakcji: ${tx.name}`,
        description: "Transakcja nie zawiera poprawnej daty ISO (YYYY-MM-DD).",
        suggestedActionLabel: "Ustaw dzisiejszą datę",
        targetEntityId: tx.id
      });
    } else {
      const year = new Date(`${tx.isoDate}T12:00:00`).getFullYear();
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 2000 || year > currentYear + 1) {
        issues.push({
          id: `date-invalid-${tx.id}`,
          type: "date_anomaly",
          severity: "warning",
          title: `Nietypowa data: ${tx.name} (${tx.isoDate})`,
          description: `Data transakcji (${tx.isoDate}) wykracza poza standardowy zakres operacyjny.`,
          suggestedActionLabel: "Popraw rok na bieżący",
          targetEntityId: tx.id,
          metadata: {
            invalidYear: year,
            isoDate: tx.isoDate
          }
        });
      }
    }
  }

  // 2. Audit Payments: Paid bills without matching expense transaction in that month
  for (const payment of payments) {
    if (payment.status === "Opłacono" && payment.dueDate) {
      const pYearMonth = payment.dueDate.slice(0, 7); // "YYYY-MM"
      const pAmount = Math.abs(Number(payment.amount)) || 0;

      const hasMatchingTx = transactions.some((tx) => {
        if (tx.type !== "expense") return false;
        if (!tx.isoDate || !tx.isoDate.startsWith(pYearMonth)) return false;
        const txAmt = Math.abs(Number(tx.amount)) || 0;
        return Math.abs(txAmt - pAmount) < 0.01;
      });

      if (!hasMatchingTx && pAmount > 0) {
        issues.push({
          id: `unlinked-pay-${payment.id}`,
          type: "unlinked_payment",
          severity: "info",
          title: `Opłacony rachunek bez transakcji: ${payment.name}`,
          description: `Rachunek „${payment.name}” (${pAmount} ${payment.currency}) jest oznaczony jako opłacony w ${payment.dueDate}, lecz brak odpowiadającej mu transakcji wydatkowej w historii.`,
          suggestedActionLabel: "Dodaj transakcję do historii",
          targetEntityId: payment.id,
          metadata: {
            paymentName: payment.name,
            amount: pAmount,
            dueDate: payment.dueDate,
            category: payment.category || "Rachunki"
          }
        });
      }
    }
  }

  // 3. Audit Goals: Desynchronized savings vs sum of transfers
  for (const goal of goals) {
    if (goal.transfers && goal.transfers.length > 0) {
      const transfersSum = goal.transfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const currentSaved = Number(goal.saved) || 0;
      if (Math.abs(transfersSum - currentSaved) > 0.01) {
        issues.push({
          id: `goal-desync-${goal.id}`,
          type: "goal_desync",
          severity: "info",
          title: `Niespójność kwoty w celu: ${goal.name}`,
          description: `Zadeklarowana kwota (${currentSaved} ${goal.currency || "PLN"}) różni się od sumy zarejestrowanych transferów (${transfersSum} ${goal.currency || "PLN"}).`,
          suggestedActionLabel: "Zsynchronizuj stan z transferami",
          targetEntityId: goal.id,
          metadata: {
            transfersSum,
            currentSaved
          }
        });
      }
    }
  }

  // Calculate Health Score
  // Base 100, critical -15, warning -5, info -2
  let penalty = 0;
  for (const issue of issues) {
    if (issue.severity === "critical") penalty += 15;
    else if (issue.severity === "warning") penalty += 5;
    else if (issue.severity === "info") penalty += 2;
  }

  const healthScore = Math.max(0, Math.min(100, 100 - penalty));

  let status: DataAuditReport["status"] = "perfect";
  if (healthScore >= 95) status = "perfect";
  else if (healthScore >= 80) status = "good";
  else if (healthScore >= 50) status = "needs_attention";
  else status = "critical";

  return {
    healthScore,
    status,
    issues,
    issuesCount: issues.length,
    scannedCounts: {
      transactions: transactions.length,
      payments: payments.length,
      accounts: accounts.length,
      goals: goals.length
    }
  };
}

/**
 * Naprawia pojedynczą wykrytą anomalię w profilu.
 */
export function repairAuditIssue(profile: Profile, issueId: string): Profile {
  const report = runDataAudit(profile);
  const issue = report.issues.find((i) => i.id === issueId);
  if (!issue) return profile;

  let newTransactions = [...(profile.transactions || [])];
  let newPayments = [...(profile.payments || [])];
  let newGoals = [...(profile.goals || [])];
  let newAccounts = [...(profile.accounts || [])];

  const defaultAccountName =
    newAccounts[0]?.name || "Główne";

  if (issue.type === "duplicate") {
    // Target is duplicateTxId to delete
    newTransactions = newTransactions.filter((t) => t.id !== issue.targetEntityId);
  } else if (issue.type === "orphaned_account") {
    // If user has 0 accounts, create a default one
    if (newAccounts.length === 0) {
      newAccounts = [
        {
          id: "acc-default",
          name: "Główne",
          bankName: "Konto Główne",
          hasCreditLimit: false,
          creditLimit: 0
        }
      ];
    }
    newTransactions = newTransactions.map((t) => {
      if (t.id === issue.targetEntityId) {
        return { ...t, account: defaultAccountName };
      }
      return t;
    });
  } else if (issue.type === "missing_category") {
    // Smart categorize using rules or heuristics
    newTransactions = newTransactions.map((t) => {
      if (t.id === issue.targetEntityId) {
        let smartCat: string | null = null;
        if (profile.smartRules && profile.smartRules.length > 0) {
          const matched = findMatchingRule(t, profile.smartRules);
          if (matched?.action?.categoryId) {
            smartCat = matched.action.categoryId;
          }
        }
        if (!smartCat && profile.transactionRules && profile.transactionRules.length > 0) {
          const tLower = (t.name || "").toLowerCase();
          const matched = profile.transactionRules.find((r) =>
            r.pattern && tLower.includes(r.pattern.toLowerCase())
          );
          if (matched?.category) {
            smartCat = matched.category;
          }
        }

        let fallbackCat = "Różne";
        const nLower = (t.name || "").toLowerCase();
        if (nLower.includes("biedronka") || nLower.includes("lidl") || nLower.includes("auchan") || nLower.includes("żabka") || nLower.includes("sklep")) {
          fallbackCat = "Spożywcze";
        } else if (nLower.includes("uber") || nLower.includes("bolt") || nLower.includes("paliwo") || nLower.includes("orlen") || nLower.includes("bilet")) {
          fallbackCat = "Transport";
        } else if (nLower.includes("netflix") || nLower.includes("spotify") || nLower.includes("kino") || nLower.includes("steam")) {
          fallbackCat = "Rozrywka";
        } else if (nLower.includes("apteka") || nLower.includes("lekarz") || nLower.includes("dentysta")) {
          fallbackCat = "Zdrowie";
        } else if (nLower.includes("czynsz") || nLower.includes("prąd") || nLower.includes("gaz") || nLower.includes("woda")) {
          fallbackCat = "Dom i rachunki";
        }
        return { ...t, category: smartCat || fallbackCat };
      }
      return t;
    });
  } else if (issue.type === "date_anomaly") {
    const today = new Date().toISOString().slice(0, 10);
    newTransactions = newTransactions.map((t) => {
      if (t.id === issue.targetEntityId) {
        if (!t.isoDate) return { ...t, isoDate: today };
        const parts = t.isoDate.split("-");
        const curYear = new Date().getFullYear();
        if (parts.length === 3) {
          return { ...t, isoDate: `${curYear}-${parts[1]}-${parts[2]}` };
        }
        return { ...t, isoDate: today };
      }
      return t;
    });
  } else if (issue.type === "unlinked_payment") {
    const payment = newPayments.find((p) => p.id === issue.targetEntityId);
    if (payment) {
      const newTx: Transaction = {
        id: generateEntityId('heal'),
        name: `Opłata: ${payment.name}`,
        amount: Math.abs(Number(payment.amount)) || 0,
        type: "expense",
        category: payment.category || "Dom i rachunki",
        isoDate: payment.dueDate || new Date().toISOString().slice(0, 10),
        account: defaultAccountName,
        currency: payment.currency || profile.currency || "PLN",
        sourcePaymentId: payment.id
      };
      newTransactions.push(newTx);
    }
  } else if (issue.type === "goal_desync") {
    const goal = newGoals.find((g) => g.id === issue.targetEntityId);
    if (goal && goal.transfers) {
      const sum = goal.transfers.reduce((s, t) => s + (Number(t.amount) || 0), 0);
      newGoals = newGoals.map((g) => {
        if (g.id === goal.id) {
          return { ...g, saved: sum };
        }
        return g;
      });
    }
  }

  return {
    ...profile,
    transactions: newTransactions,
    payments: newPayments,
    goals: newGoals,
    accounts: newAccounts
  };
}

/**
 * Wykonuje masową, automatyczną samonaprawę (Self-Healing) wszystkich wykrytych problemów.
 */
export function autoRepairAllIssues(profile: Profile): {
  updatedProfile: Profile;
  repairedCount: number;
  messages: string[];
} {
  let currentProfile = { ...profile };
  const report = runDataAudit(currentProfile);

  if (report.issues.length === 0) {
    return {
      updatedProfile: currentProfile,
      repairedCount: 0,
      messages: ["Baza danych jest w idealnym stanie (100% spójności)."]
    };
  }

  const messages: string[] = [];
  let repairedCount = 0;

  for (const issue of report.issues) {
    currentProfile = repairAuditIssue(currentProfile, issue.id);
    repairedCount++;
    messages.push(`Naprawiono: ${issue.title}`);
  }

  return {
    updatedProfile: currentProfile,
    repairedCount,
    messages
  };
}
