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
  debtId?: string;
  paidBy?: "me" | "partner" | "joint";
  splitMode?: "none" | "equal";
  currency: SupportedCurrency;
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
  currency: SupportedCurrency;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  transfers?: SavingsTransfer[]; // Historia wpłat/wypłat
  targetDate?: string; // Opcjonalna data docelowa
  currency?: SupportedCurrency;
}

export interface Investment {
  id: string;
  name: string;
  amount: number;
  isoDate: string;
  type?: string;
  notes?: string;
  currency?: SupportedCurrency;
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
  currency: SupportedCurrency;
}

export interface TransactionRule {
  id: string;
  pattern: string; // np. "Biedronka" -> dopasowanie po nazwie/opisie
  category: string;
  categoryIcon?: string;
  profileId?: string;
}

export type SmartRuleField = "name" | "description" | "account" | "amount";
export type SmartRuleOperator = "contains" | "equals" | "startsWith" | "greaterThan" | "lessThan";

export interface SmartRuleCondition {
  field: SmartRuleField;
  operator: SmartRuleOperator;
  value: string;
}

export interface SmartRuleAction {
  type: "setCategory" | "suggestCategory";
  categoryId: string;
}

export interface SmartRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number; // niższa liczba = wyższy priorytet (1 > 2 > 3)
  condition: SmartRuleCondition;
  action: SmartRuleAction;
  createdAt: string;
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

export type DebtType = "mortgage" | "credit_card" | "cash_loan" | "revolving" | "bnpl" | "other";

export interface DebtItem {
  id: string;
  name: string;
  institution: string;
  type: DebtType;
  currency: SupportedCurrency;
  balance: number;
  originalAmount?: number;
  monthlyPayment: number;
  interestRate: number; // annual interest rate in % e.g. 6.85
  baseRate?: number;
  margin?: number;
  rateType?: "fixed" | "variable";
  startDate?: string;
  endDate?: string;
  remainingMonths?: number;
  fixedRateEndDate?: string;
  nextPaymentDate?: string;
  propertyValue?: number;
  creditLimit?: number;
  status: "active" | "closed";
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DebtPayoffScenario {
  id: string;
  name: string;
  strategy: "avalanche" | "snowball" | "baseline" | "custom";
  extraMonthlyPayment: number;
  oneTimeOverpayments?: { month: number; amount: number }[];
  customDebtOrder?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface FinancialActionPlanItem {
  id: string;
  title: string;
  description?: string;
  category: "cushion" | "debt" | "budget" | "investment" | "subscription" | "custom";
  targetAmount?: number;
  completed: boolean;
  completedAt?: string;
}

export interface FinancialActionPlan {
  id: string;
  skillId: string;
  title: string;
  description: string;
  status: "in_progress" | "completed" | "paused";
  createdAt: string;
  updatedAt?: string;
  targetDate?: string;
  estimatedSavings?: number;
  items: FinancialActionPlanItem[];
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
  smartRules?: SmartRule[];
  settlements?: SettlementEntry[];
  debts?: DebtItem[];
  debtPayoffScenarios?: DebtPayoffScenario[];
  financialPlans?: FinancialActionPlan[];
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
  smartRules?: SmartRule[];
  debts?: DebtItem[];
  debtPayoffScenarios?: DebtPayoffScenario[];
  aiMode?: "none" | "local";
  localAiEndpoint?: string;
  localAiModel?: string;
  autoLockMinutes?: number; // 1 | 5 | 15 | 30 | 0 (nigdy); domyślnie undefined → 5
}

export type AppLanguage = "pl" | "en";
export type SupportedCurrency = "PLN" | "EUR" | "USD" | "GBP";
