import { z } from "zod";

/**
 * Shared contract for every action the AI chat (Doradca AI) can propose.
 * Imported both server-side (src/server/routes/ai.ts, to validate the model's
 * raw JSON output) and client-side (src/components/AiChatModal.tsx, to
 * dispatch a validated action to the right pre-filled form).
 *
 * IMPORTANT: every action here only opens a form pre-filled with the AI's
 * suggestion — nothing is ever saved to the user's data without an explicit,
 * manual submit. This is a security boundary against prompt injection via
 * the user's own financial data (which is embedded in the chat prompt) and
 * must be preserved by every dispatch handler.
 */

export const AddTransactionActionPayload = z.object({
  name: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  type: z.enum(["income", "expense"]).optional(),
  category: z.string().max(100).optional(),
  isoDate: z.string().optional()
});

export const AddPaymentActionPayload = z.object({
  name: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  dueDate: z.string().optional(),
  category: z.string().max(100).optional()
});

export const AddGoalActionPayload = z.object({
  name: z.string().min(1).max(200).optional(),
  target: z.number().positive().optional()
});

// Mirrors FinancialActionPlan / FinancialActionPlanItem (src/types.ts). Unlike
// the other actions, this payload is never produced by the LLM itself — it's
// computed deterministically server-side by src/services/financialSkills.ts
// and only echoed through this contract (see localProvider.ts::chat()), so the
// numbers a user sees always come from real math, never a model guess.
const FinancialActionPlanItemPayload = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.enum(["cushion", "debt", "budget", "investment", "subscription", "custom"]),
  targetAmount: z.number().optional(),
  completed: z.boolean(),
  completedAt: z.string().optional()
});

export const CreateFinancialPlanActionPayload = z.object({
  id: z.string(),
  skillId: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(["in_progress", "completed", "paused"]),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  targetDate: z.string().optional(),
  targetAmount: z.number().optional(),
  estimatedSavings: z.number().optional(),
  items: z.array(FinancialActionPlanItemPayload)
});

export const AiChatAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("addTransaction"), payload: AddTransactionActionPayload }),
  z.object({ type: z.literal("addPayment"), payload: AddPaymentActionPayload }),
  z.object({ type: z.literal("addGoal"), payload: AddGoalActionPayload }),
  z.object({ type: z.literal("createFinancialPlan"), payload: CreateFinancialPlanActionPayload })
]);

export type AiChatActionType = z.infer<typeof AiChatAction>;
