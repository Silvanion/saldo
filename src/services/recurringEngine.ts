import { RecurringRule, Transaction } from "../types";
import { addMonthsClamped, getLocalDateIso } from "../utils";

export interface RecurringEngineResult {
  updatedRules: RecurringRule[];
  generatedTransactions: Transaction[];
  hasChanges: boolean;
}

export function applyRecurringRules(
  rules: RecurringRule[],
  existingTransactions: Transaction[],
  todayStr: string
): RecurringEngineResult {
  if (!rules || rules.length === 0) {
    return { updatedRules: [], generatedTransactions: [], hasChanges: false };
  }

  let stateChanged = false;
  const generatedTransactions: Transaction[] = [];
  const existingTxIds = new Set(existingTransactions.map((tx) => tx.id));

  const updatedRules = rules.map((rule) => {
    if (!rule.isActive) return rule;

    const currentRule = { ...rule };
    let occurrences = 0;
    const MAX_OCCURRENCES = 365; // Safeguard against infinite loops

    while (currentRule.nextDueDate <= todayStr && occurrences < MAX_OCCURRENCES) {
      // Deterministic ID generation based on rule ID and date
      const generatedId = `tx-rec-${currentRule.id}-${currentRule.nextDueDate}`;

      // Prevent duplicate insertion if it somehow already exists
      if (!existingTxIds.has(generatedId)) {
        const splitMode = currentRule.splitMode ?? (currentRule.type === "expense" && currentRule.paidBy ? "equal" : undefined);
        const newTx: Transaction = {
          id: generatedId,
          name: currentRule.name,
          amount: currentRule.amount,
          category: currentRule.category,
          categoryIcon: currentRule.categoryIcon || "✨",
          account: currentRule.account || "Konto główne",
          type: currentRule.type,
          isoDate: currentRule.nextDueDate,
          tags: currentRule.tags && currentRule.tags.length > 0 ? currentRule.tags : ["cykliczna"],
          isRecurring: true,
          recurringRuleId: currentRule.id,
          paidBy: currentRule.paidBy,
          splitMode: splitMode
        };
        generatedTransactions.push(newTx);
      }

      currentRule.lastGeneratedDate = currentRule.nextDueDate;

      if (currentRule.frequency === "weekly") {
        const nextDate = new Date(currentRule.nextDueDate + "T00:00:00");
        nextDate.setDate(nextDate.getDate() + 7);
        currentRule.nextDueDate = getLocalDateIso(nextDate);
      } else if (currentRule.frequency === "biweekly") {
        const nextDate = new Date(currentRule.nextDueDate + "T00:00:00");
        nextDate.setDate(nextDate.getDate() + 14);
        currentRule.nextDueDate = getLocalDateIso(nextDate);
      } else if (currentRule.frequency === "monthly") {
        currentRule.nextDueDate = addMonthsClamped(currentRule.nextDueDate, 1);
      } else if (currentRule.frequency === "quarterly") {
        currentRule.nextDueDate = addMonthsClamped(currentRule.nextDueDate, 3);
      } else if (currentRule.frequency === "yearly") {
        currentRule.nextDueDate = addMonthsClamped(currentRule.nextDueDate, 12);
      } else {
        currentRule.nextDueDate = addMonthsClamped(currentRule.nextDueDate, 1);
      }

      stateChanged = true;
      occurrences++;
    }

    return currentRule;
  });

  return {
    updatedRules,
    generatedTransactions,
    hasChanges: stateChanged
  };
}
