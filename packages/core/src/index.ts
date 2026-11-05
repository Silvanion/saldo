// Typy bazowe i modele
export * from "../../../src/types";

// Silnik Podatkowy B2B / JDG (2026)
export {
  calculateSocialZus,
  calculateHealthInsurance,
  calculateSingleTaxForm,
  compareAllTaxForms,
  calculateCurrentMonthTaxBuffer,
  TAX_CONSTANTS_PL
} from "../../../src/services/taxCalculations";
export type {
  ZusTier,
  RyczaltRate,
  TaxForm,
  TaxCalculationInput,
  TaxCalculationResult,
  TaxComparisonSummary
} from "../../../src/services/taxCalculations";

// Silnik Hipoteczny (MortgagePro)
export {
  calculateLtvMetrics,
  calculateAnnuityInstallment,
  calculateInterestRateStressTest,
  calculateCreditVacationImpact,
  compareAnnuityVsDecreasing
} from "../../../src/services/mortgageCalculations";
export type {
  LtvMetrics,
  StressTestScenario,
  StressTestResult,
  CreditVacationResult,
  DecreasingVsEqualComparison
} from "../../../src/services/mortgageCalculations";

// Silnik Spłaty Długów i Nadpłat (Snowball / Avalanche)
export {
  calculatePortfolioDebtKpis,
  calculateDebtAmortizationSchedule,
  calculateDebtOverpaymentVariants,
  calculateDebtPaymentInsights,
  calculatePortfolioPayoffStrategies
} from "../../../src/services/debtCalculations";
export type {
  PortfolioDebtKpis,
  DebtAmortizationScheduleResult,
  DebtOverpaymentVariantsComparisonResult,
  DebtPaymentInsightsResult,
  DebtPayoffStrategyType,
  PortfolioPayoffComparison
} from "../../../src/services/debtCalculations";

// Majątek Netto (Net Worth)
export {
  calculateAssetBreakdown,
  calculateLiabilityBreakdown,
  generateNetWorthTimeline,
  calculateNetWorthSummary
} from "../../../src/services/netWorthCalculations";
export type {
  AssetBreakdown,
  LiabilityBreakdown,
  NetWorthTimelinePoint,
  NetWorthSummary
} from "../../../src/services/netWorthCalculations";

// Budżet i Reguła 50/30/20
export {
  calculate503020,
  calculateEndOfMonthForecast,
  calculateSafeToSpend,
  calculateMonthlyTotals,
  calculateRunway,
  calculateNetWorth
} from "../../../src/services/budgetCalculations";
export type {
  Breakdown503020,
  SafeToSpendBreakdown,
  ForecastBreakdown,
  MonthlyTotals,
  RunwayCalculation,
  NetWorthBreakdown
} from "../../../src/services/budgetCalculations";

// Prognoza Cashflow
export {
  calculateCashflowForecast
} from "../../../src/services/cashflowForecast";

// Kondycja Finansowa
export {
  getFinancialHealthSummary
} from "../../../src/services/financialHealth";
export type {
  FinancialHealthResult,
  HealthScoreStatus,
  HealthGrade,
  HealthPillar,
  FinancialAlert
} from "../../../src/services/financialHealth";

// Detektor Kierunku Transakcji (Wpływ vs Wydatek)
export {
  detectDirection
} from "../../../src/services/directionDetector";
export type {
  DirectionDecision,
  ImportDirectionInfo
} from "../../../src/services/directionDetector";

// Deduplikator Transakcji O(n)
export {
  checkDuplicate,
  computeTransactionFingerprint
} from "../../../src/services/duplicateDetector";

// Parsery Wyciągów (CSV, Alior, Zen)
export {
  BANK_PRESETS,
  decodeCsvBytes,
  cleanCsvBomAndEncoding,
  detectCsvSeparator,
  parseCsvDate,
  parseCsvAmount,
  autoDetectBankColumns,
  parseAndMapCsv
} from "../../../src/services/parseCsv";
export {
  detectAliorLayout,
  aliorName,
  aliorImportHint,
  parseAliorPdfText
} from "../../../src/services/aliorImport";
export {
  detectZenLayout,
  zenName,
  zenImportHint,
  parseZenPdfText
} from "../../../src/services/zenImport";

// Narzędzia Pomocnicze
export {
  parseAmountInput,
  roundCurrency,
  resolveCurrency,
  formatMoney
} from "../../../src/utils/format";
export {
  generateId,
  generateEntityId,
  ID_PREFIXES
} from "../../../src/utils/id";
export {
  normalizeText,
  cleanPolishChars,
  normalizeSmartRuleText
} from "../../../src/utils/text";
export {
  getLocalDateIso,
  addMonthsClamped,
  formatDate,
  getMonthName,
  monthsPl
} from "../../../src/utils/date";
export {
  expenseCategories,
  incomeCategories,
  budgetCategories,
  iconByCategory,
  autoCategorizeTransaction
} from "../../../src/utils/categories";
