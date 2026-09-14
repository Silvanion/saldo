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
  | "exportReports"
  | "netWorth"
  | "financialSkills"
  | "financialStory"
  | "dataAuditor"
  | null;

export type ModalState =
  // payload z "id" oznacza edycję; payload bez "id" to wypełnienie wstępne nowego wpisu.
  | { type: "transaction"; payload?: Transaction | Partial<Transaction> }
  | { type: "payment"; payload?: Payment | Partial<Payment> }
  | { type: "goal" }
  | { type: "goalDeposit"; payload: Goal }
  | { type: "profile" }
  | { type: "pin" }
  | { type: "budget" }
  | { type: "calendarAi"; payload?: Payment | Partial<Payment> }
  | { type: "aiChat" }
  | { type: "changelog" }
  | { type: "confirm"; payload: ConfirmPayload }
  | { type: "smartRulesManager" }
  | { type: "exportReports"; payload?: { initialTab?: "pdf" | "csv" | "backup" } }
  | { type: "netWorth" }
  | { type: "financialSkills" }
  | { type: "financialStory"; payload?: { year?: number; monthIdx?: number } }
  | { type: "dataAuditor" }
  | { type: null };
