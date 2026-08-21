import { Transaction, Payment, Goal } from "./types";

export type AppView =
  | "dashboard"
  | "transactions"
  | "payments"
  | "budget"
  | "goals"
  | "debts"
  | "analysis"
  | "settings"
  | "help";

export interface ConfirmPayload {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "default";
  onConfirm: () => void | Promise<void>;
}

export type ModalType =
  | "transaction"
  | "payment"
  | "goal"
  | "goalDeposit"
  | "profile"
  | "pin"
  | "budget"
  | "calendarAi"
  | "aiChat"
  | "changelog"
  | "confirm"
  | "smartRulesManager"
  | null;

export type ModalState =
  | { type: "transaction"; payload?: Transaction }
  | { type: "payment"; payload?: Payment }
  | { type: "goal" }
  | { type: "goalDeposit"; payload: Goal }
  | { type: "profile" }
  | { type: "pin" }
  | { type: "budget" }
  | { type: "calendarAi"; payload?: Payment }
  | { type: "aiChat" }
  | { type: "changelog" }
  | { type: "confirm"; payload: ConfirmPayload }
  | { type: "smartRulesManager" }
  | { type: null };
