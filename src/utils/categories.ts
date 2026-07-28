import { TransactionRule } from "../types";

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

export function autoCategorizeTransaction(txName: string, rules: TransactionRule[], originalCategory: string): { category: string; categoryIcon: string } {
  const nameLower = txName.toLowerCase();
  for (const rule of rules) {
    if (nameLower.includes(rule.pattern.toLowerCase())) {
      return {
        category: rule.category,
        categoryIcon: rule.categoryIcon || "✨"
      };
    }
  }
  // If no custom rule matches, use a few default smart mappings if the category is generic:
  if (originalCategory === "Inne" || !originalCategory) {
    const defaults: Record<string, { category: string; categoryIcon: string }> = {
      "orlen": { category: "Transport", categoryIcon: "🚗" },
      "lotos": { category: "Transport", categoryIcon: "🚗" },
      "bp ": { category: "Transport", categoryIcon: "🚗" },
      "paliw": { category: "Transport", categoryIcon: "🚗" },
      "shell": { category: "Transport", categoryIcon: "🚗" },
      "biedronka": { category: "Żywność", categoryIcon: "🛒" },
      "lidl": { category: "Żywność", categoryIcon: "🛒" },
      "tesco": { category: "Żywność", categoryIcon: "🛒" },
      "auchan": { category: "Żywność", categoryIcon: "🛒" },
      "carrefour": { category: "Żywność", categoryIcon: "🛒" },
      "zabka": { category: "Żywność", categoryIcon: "🛒" },
      "żabka": { category: "Żywność", categoryIcon: "🛒" },
      "netflix": { category: "Rozrywka", categoryIcon: "🎬" },
      "spotify": { category: "Rozrywka", categoryIcon: "🎬" },
      "kino": { category: "Rozrywka", categoryIcon: "🎬" },
      "teatr": { category: "Rozrywka", categoryIcon: "🎬" },
      "czynsz": { category: "Dom i rachunki", categoryIcon: "🏠" },
      "prad": { category: "Dom i rachunki", categoryIcon: "🏠" },
      "prąd": { category: "Dom i rachunki", categoryIcon: "🏠" },
      "gaz": { category: "Dom i rachunki", categoryIcon: "🏠" },
      "woda": { category: "Dom i rachunki", categoryIcon: "🏠" },
      "apteka": { category: "Zdrowie", categoryIcon: "❤️" },
      "lekarz": { category: "Zdrowie", categoryIcon: "❤️" },
      "szpital": { category: "Zdrowie", categoryIcon: "❤️" }
    };
    for (const [kw, val] of Object.entries(defaults)) {
      if (nameLower.includes(kw)) {
        return val;
      }
    }
  }

  return {
    category: originalCategory || "Inne",
    categoryIcon: iconByCategory[originalCategory] || "✨"
  };
}
