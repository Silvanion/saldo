import { TransactionRule } from "../types";
import { autoCategorizeDetailed } from "../services/autoCategorizer";

export const expenseCategories = ['Żywność', 'Dom i rachunki', 'Transport', 'Zdrowie', 'Rozrywka', 'Kredyt konsumencki', 'Raty', 'Kredyt hipoteczny', 'Spłata karty kredytowej', 'Inne'];
export const incomeCategories = ['Wynagrodzenie', 'Premia', 'Działalność', 'Zwrot', 'Inne'];
export const budgetCategories = ['Żywność', 'Dom i rachunki', 'Transport', 'Rozrywka', 'Kredyt konsumencki', 'Raty', 'Kredyt hipoteczny', 'Spłata karty kredytowej'];

export const iconByCategory: Record<string, string> = {
  'Żywność': '🛒',
  'Dom i rachunki': '🏠',
  'Transport': '🚗',
  'Zdrowie': '❤️',
  'Rozrywka': '🎬',
  'Kredyt konsumencki': '💳',
  'Raty': '📉',
  'Kredyt hipoteczny': '🏦',
  'Spłata karty kredytowej': '💳',
  'Inne': '✨',
  'Wynagrodzenie': '💰',
  'Premia': '🎁',
  'Działalność': '💼',
  'Zwrot': '↩️'
};

export function autoCategorizeTransaction(
  txName: string,
  rules: TransactionRule[],
  originalCategory: string
): { category: string; categoryIcon: string } {
  const result = autoCategorizeDetailed(txName, {
    rules,
    originalCategory,
    fallback: originalCategory || "Inne"
  });
  return {
    category: result.category,
    categoryIcon: result.categoryIcon
  };
}
