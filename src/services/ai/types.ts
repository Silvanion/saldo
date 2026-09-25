/**
 * Unified AI Architecture Types for Saldo App
 * Clean provider-agnostic abstractions for BYOK (Bring Your Own Key),
 * test connection, zero-retention security, and financial advisor chat.
 */

export type AIProviderType = "gemini" | "anthropic";

export type AIConnectionStatus =
  | "SUCCESS"
  | "INVALID_API_KEY"
  | "MODEL_NOT_AVAILABLE"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "PROVIDER_ERROR";

export interface TestConnectionResult {
  status: AIConnectionStatus;
  message: string;
  latencyMs?: number;
}

export interface AIModelDefinition {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
}

export interface AIUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface AIResponse {
  text: string;
  model: string;
  provider: AIProviderType;
  usage?: AIUsage;
}

export class AIError extends Error {
  readonly status: AIConnectionStatus;
  readonly provider: AIProviderType;
  readonly statusCode?: number;

  constructor(message: string, status: AIConnectionStatus, provider: AIProviderType, statusCode?: number) {
    super(message);
    this.name = "AIError";
    this.status = status;
    this.provider = provider;
    this.statusCode = statusCode;
  }
}

export interface StructuredCategorySpending {
  category: string;
  amount: number;
  percentage: number;
}

export interface StructuredFinancialContext {
  period: string;
  currency: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRatePercent: number | null;
  runwayMonths: number | null;
  topExpenseCategories: StructuredCategorySpending[];
  activeGoalsCount: number;
  budgetWarningsCount: number;
  unpaidPaymentsCount: number;
  formattedSummary: string;
}

export type ActionCategory = "READ_ONLY" | "MUTATING";

export interface AIActionProposal {
  type: "addTransaction" | "addPayment" | "addGoal" | "createFinancialPlan";
  payload: any;
  category: ActionCategory;
  isMutating: boolean; // true for actions that change user data
  requiresConfirmation: boolean; // true: user must explicitly review and submit
  description: string;
}

export interface AIProviderAdapter {
  readonly name: AIProviderType;
  readonly displayName: string;
  readonly defaultModel: string;
  readonly availableModels: AIModelDefinition[];
  testConnection(apiKey: string, model?: string): Promise<TestConnectionResult>;
  generate(request: AIRequest, apiKey: string): Promise<AIResponse>;
}

export interface StoredAiKeyMetadata {
  hasKey: boolean;
  maskedKey: string;
  provider: AIProviderType;
  model: string;
  lastTestedAt?: string;
  lastConnectionStatus?: AIConnectionStatus;
}
