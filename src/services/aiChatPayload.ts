import type { Profile } from "../types";

// Server-side ChatInput schema (src/server/routes/ai.ts) caps these arrays and
// the /chat body size (aiPayloadLimiter). Sending the whole profile made chat
// fail with 400/413 for anyone with more than ~100 transactions.
export const CHAT_MAX_TRANSACTIONS = 100;
export const CHAT_MAX_PAYMENTS = 50;
export const CHAT_MAX_ITEMS = 50;
export const CHAT_MAX_RECURRING_RULES = 100;

export function buildChatProfileData(profile: Profile) {
  const recentTransactions = [...(profile.transactions || [])]
    .sort((a, b) => (b.isoDate || "").localeCompare(a.isoDate || ""))
    .slice(0, CHAT_MAX_TRANSACTIONS)
    .map(({ id, name, amount, category, type, isoDate }) => ({ id, name, amount, category, type, isoDate }));

  const payments = (profile.payments || [])
    .slice(0, CHAT_MAX_PAYMENTS)
    .map(({ id, name, amount, dueDate, status }) => ({ id, name, amount, dueDate, status }));

  return {
    activeProfileId: profile.id,
    profiles: [
      {
        id: profile.id,
        name: profile.name,
        kind: profile.kind,
        currency: profile.currency,
        budgets: profile.budgets,
        transactions: recentTransactions,
        payments,
        debts: (profile.debts || []).slice(0, CHAT_MAX_ITEMS),
        goals: (profile.goals || []).slice(0, CHAT_MAX_ITEMS),
        investments: (profile.investments || []).slice(0, CHAT_MAX_ITEMS),
        recurringRules: (profile.recurringRules || []).slice(0, CHAT_MAX_RECURRING_RULES)
      }
    ]
  };
}
