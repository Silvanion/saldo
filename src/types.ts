export interface SavingsTransfer {
  id: string;
  amount: number; // dodatnia dla wpłaty, ujemna dla wypłaty
  isoDate: string;
  note?: string;
}

export interface Transaction {
  id: string;
  name: string;
  category: string;
  categoryIcon?: string;
  account: string;
  amount: number;
  type: "income" | "expense";
  isoDate: string;
  tags?: string[];
  isRecurring?: boolean;
  recurringRuleId?: string;
  sourcePaymentId?: string;
  paidBy?: "me" | "partner" | "joint";
  splitMode?: "none" | "equal";
  currency?: SupportedCurrency;
}

export interface Payment {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: "Opłacono" | "Do opłacenia";
  category?: string;
  isRecurring?: boolean;
  recurringRuleId?: string;
  paidBy?: "me" | "partner" | "joint";
  splitMode?: "none" | "equal";
  currency?: SupportedCurrency;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  transfers?: SavingsTransfer[]; // Historia wpłat/wypłat
  targetDate?: string; // Opcjonalna data docelowa
}

export interface Investment {
  id: string;
  name: string;
  amount: number;
  isoDate: string;
  type?: string;
  notes?: string;
}

export interface RecurringRule {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  categoryIcon?: string;
  account: string;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
  nextDueDate: string;
  lastGeneratedDate?: string;
  tags?: string[];
  isActive: boolean;
  paidBy?: "me" | "partner" | "joint";
  splitMode?: "none" | "equal";
  currency?: SupportedCurrency;
}

export interface TransactionRule {
  id: string;
  pattern: string; // np. "Biedronka" -> dopasowanie po nazwie/opisie
  category: string;
  categoryIcon?: string;
  profileId?: string;
}

export interface BudgetAlert {
  id: string;
  type: "threshold_80" | "threshold_100" | "payment_due";
  message: string;
  category?: string;
  paymentId?: string;
  isoDate: string;
  isRead: boolean;
}

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  hasCreditLimit: boolean;
  creditLimit: number;
}

export interface SettlementEntry {
  id: string;
  amount: number; // amount > 0: partner oddał mi (partner paid me), amount < 0: ja oddałem partnerowi (I paid partner)
  isoDate: string;
  note?: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  name: string;
  kind: "personal" | "shared";
  partnerName?: string;
  avatar?: string;
  pinHash?: string;
  salt?: string;
  encryptedPayload?: string;
  accounts?: BankAccount[];
  transactions: Transaction[];
  payments: Payment[];
  goals: Goal[];
  investments: Investment[];
  budgets: Record<string, number>;
  recurringRules?: RecurringRule[];
  transactionRules?: TransactionRule[];
  settlements?: SettlementEntry[];
  currency: SupportedCurrency;
}

export interface AppState {
  profiles: Profile[];
  activeProfileId: string | null;
  schemaVersion?: number;
  updatedAt?: string;
  lastModifiedBy?: string;
  driveFileId?: string | null;
  recurringRules?: RecurringRule[];
  transactionRules?: TransactionRule[];
  aiMode?: "none" | "local" | "cloud";
  localAiEndpoint?: string;
}

export type AppLanguage = "pl" | "en";
export type SupportedCurrency = "PLN" | "EUR" | "USD" | "GBP";
