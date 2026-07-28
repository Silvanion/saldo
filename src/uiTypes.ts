import { Transaction, Payment, Goal } from "./types";

export type AppView =
  | "dashboard"
  | "transactions"
  | "payments"
  | "budget"
  | "goals"
  | "analysis"
  | "settings"
  | "help";

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
  | { type: null };
