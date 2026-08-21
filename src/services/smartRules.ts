import { Transaction, SmartRule, SmartRuleCondition, TransactionRule } from "../types";

export interface SmartRuleMatchPreview {
  transactionId: string;
  transactionName: string;
  transactionDate: string;
  amount: number;
  currentCategory: string;
  proposedCategory: string;
  ruleId: string;
  ruleName: string;
}

export interface SmartRulesPreviewResult {
  matchesCount: number;
  proposedChanges: SmartRuleMatchPreview[];
}

export function normalizeSmartRuleText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function evaluateRuleCondition(tx: Transaction, condition: SmartRuleCondition): boolean {
  if (!tx || !condition || !condition.field || !condition.operator) {
    return false;
  }

  const condValueNorm = normalizeSmartRuleText(condition.value);

  if (condition.field === "name" || condition.field === "description") {
    const txNameNorm = normalizeSmartRuleText(tx.name || "");
    if (!condValueNorm) return false;

    switch (condition.operator) {
      case "contains":
        return txNameNorm.includes(condValueNorm);
      case "equals":
        return txNameNorm === condValueNorm;
      case "startsWith":
        return txNameNorm.startsWith(condValueNorm);
      default:
        return false;
    }
  }

  if (condition.field === "account") {
    const txAccNorm = normalizeSmartRuleText(tx.account || "");
    if (!condValueNorm) return false;

    switch (condition.operator) {
      case "contains":
        return txAccNorm.includes(condValueNorm);
      case "equals":
        return txAccNorm === condValueNorm;
      case "startsWith":
        return txAccNorm.startsWith(condValueNorm);
      default:
        return false;
    }
  }

  if (condition.field === "amount") {
    const targetAmount = parseFloat(condition.value.replace(",", "."));
    if (isNaN(targetAmount)) return false;

    const txAmount = Math.abs(Number(tx.amount) || 0);

    switch (condition.operator) {
      case "greaterThan":
        return txAmount > targetAmount;
      case "lessThan":
        return txAmount < targetAmount;
      case "equals":
        return Math.abs(txAmount - targetAmount) < 0.01;
      default:
        return false;
    }
  }

  return false;
}

export function findMatchingRule(tx: Transaction, rules: SmartRule[] = []): SmartRule | null {
  if (!tx || !Array.isArray(rules) || rules.length === 0) {
    return null;
  }

  // Active rules sorted by priority (1 is highest priority)
  const activeRules = rules
    .filter((r) => r && r.enabled !== false && r.condition && r.action)
    .sort((a, b) => (Number(a.priority) || 999) - (Number(b.priority) || 999));

  for (const rule of activeRules) {
    if (evaluateRuleCondition(tx, rule.condition)) {
      return rule;
    }
  }

  return null;
}

export function previewSmartRules(
  transactions: Transaction[] = [],
  rules: SmartRule[] = []
): SmartRulesPreviewResult {
  const proposedChanges: SmartRuleMatchPreview[] = [];

  for (const tx of transactions) {
    const matchedRule = findMatchingRule(tx, rules);
    if (matchedRule && matchedRule.action.categoryId) {
      // Only include as proposed change if category is actually different
      if (tx.category !== matchedRule.action.categoryId) {
        proposedChanges.push({
          transactionId: tx.id,
          transactionName: tx.name,
          transactionDate: tx.isoDate,
          amount: tx.amount,
          currentCategory: tx.category || "Inne",
          proposedCategory: matchedRule.action.categoryId,
          ruleId: matchedRule.id,
          ruleName: matchedRule.name || `Reguła #${matchedRule.id.slice(0, 4)}`,
        });
      }
    }
  }

  return {
    matchesCount: proposedChanges.length,
    proposedChanges,
  };
}

export function applySmartRulesToTransactions(
  transactions: Transaction[] = [],
  rules: SmartRule[] = [],
  selectedTxIds?: string[]
): { updatedTransactions: Transaction[]; appliedCount: number } {
  let appliedCount = 0;
  const allowedSet = selectedTxIds ? new Set(selectedTxIds) : null;

  const updatedTransactions = transactions.map((tx) => {
    if (allowedSet && !allowedSet.has(tx.id)) {
      return tx;
    }

    const matchedRule = findMatchingRule(tx, rules);
    if (matchedRule && matchedRule.action.categoryId && tx.category !== matchedRule.action.categoryId) {
      appliedCount++;
      return {
        ...tx,
        category: matchedRule.action.categoryId,
      };
    }

    return tx;
  });

  return {
    updatedTransactions,
    appliedCount,
  };
}

export function convertLegacyRulesToSmartRules(legacyRules: TransactionRule[] = []): SmartRule[] {
  if (!Array.isArray(legacyRules)) return [];

  return legacyRules
    .filter((lr) => lr && lr.pattern && lr.category)
    .map((lr, idx) => ({
      id: lr.id || `legacy-rule-${idx}`,
      name: `Dopasowanie: ${lr.pattern}`,
      enabled: true,
      priority: idx + 1,
      condition: {
        field: "name",
        operator: "contains",
        value: lr.pattern,
      },
      action: {
        type: "setCategory",
        categoryId: lr.category,
      },
      createdAt: new Date().toISOString(),
    }));
}

export interface SmartRuleSuggestion {
  keyword: string;
  rule: Omit<SmartRule, "id" | "createdAt">;
}

export function extractSmartRuleKeyword(rawName: string): string {
  if (!rawName || typeof rawName !== "string") return "";

  // Strip leading/trailing noise, common merchant suffixes, transaction IDs, store numbers, *Trip, #123
  const cleaned = rawName
    .replace(/[*#]\s*\w+/g, " ")
    .replace(/\b(sp\.?\s*z\s*o\.?o\.?|s\.a\.|\.pl|\.com|nr\s*\d+)\b/gi, " ")
    .replace(/[#*_\-\/\\:;,.!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If after cleaning it has fewer than 3 characters, return empty string
  if (cleaned.length < 3) return "";

  // If it's purely numbers, return empty string
  if (/^\d+$/.test(cleaned)) return "";

  // Filter out pure number tokens and single-character tokens
  const tokens = cleaned
    .split(" ")
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t));
  if (tokens.length === 0) return "";

  // Filter generic words like "zakupy", "platnosc", "przelew", "sklep", "stacja", "paliw" if a more specific token exists
  const genericPrefixes = new Set(["zakupy", "platnosc", "przelew", "sklep", "stacja", "karta", "blik", "paliw", "paliwo"]);
  const nonGenericTokens = tokens.filter((t) => !genericPrefixes.has(normalizeSmartRuleText(t)));

  if (nonGenericTokens.length > 0) {
    const candidate = nonGenericTokens.slice(0, 2).join(" ");
    if (candidate.length >= 3) {
      return candidate;
    }
  }

  return tokens.slice(0, 2).join(" ");
}

export function isRuleCoveringTransaction(
  tx: { name: string; account?: string; amount?: number },
  category: string,
  existingRules: SmartRule[] = [],
  legacyRules: TransactionRule[] = []
): boolean {
  if (!tx || !tx.name || !category) return false;

  // 1. Check if an active SmartRule already matches this transaction and assigns this category
  const activeSmartRules = existingRules.filter((r) => r && r.enabled !== false && r.action && r.condition);
  for (const rule of activeSmartRules) {
    if (rule.action.categoryId === category && evaluateRuleCondition(tx as Transaction, rule.condition)) {
      return true;
    }
  }

  // 2. Check if legacy rules already cover it
  const txNorm = normalizeSmartRuleText(tx.name);
  for (const leg of legacyRules) {
    if (leg && leg.category === category && leg.pattern) {
      const patNorm = normalizeSmartRuleText(leg.pattern);
      if (patNorm && txNorm.includes(patNorm)) {
        return true;
      }
    }
  }

  return false;
}

export function generateSmartRuleSuggestion(
  params: {
    name: string;
    category: string;
    initialCategory?: string;
    isEditing?: boolean;
  },
  existingRules: SmartRule[] = [],
  legacyRules: TransactionRule[] = []
): SmartRuleSuggestion | null {
  const { name, category, initialCategory, isEditing } = params;

  if (!name || !category) return null;

  // In edit mode: only suggest when category meaningfully changed
  if (isEditing && initialCategory && initialCategory === category) {
    return null;
  }

  const keyword = extractSmartRuleKeyword(name);
  if (!keyword || keyword.length < 3) return null;

  // Check if an existing rule already covers this transaction & category
  if (isRuleCoveringTransaction({ name }, category, existingRules, legacyRules)) {
    return null;
  }

  // Check if an existing rule has the exact same keyword condition and category
  const keywordNorm = normalizeSmartRuleText(keyword);
  const duplicateRule = existingRules.find(
    (r) =>
      r &&
      r.enabled !== false &&
      r.condition &&
      r.condition.field === "name" &&
      r.condition.operator === "contains" &&
      normalizeSmartRuleText(r.condition.value) === keywordNorm &&
      r.action?.categoryId === category
  );
  if (duplicateRule) return null;

  const nextPriority =
    existingRules.length > 0 ? Math.max(...existingRules.map((r) => Number(r.priority) || 1)) + 1 : 1;

  return {
    keyword,
    rule: {
      name: `Auto: ${keyword} → ${category}`,
      enabled: true,
      priority: nextPriority,
      condition: {
        field: "name",
        operator: "contains",
        value: keyword,
      },
      action: {
        type: "setCategory",
        categoryId: category,
      },
    },
  };
}

