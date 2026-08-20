import { Profile, Payment, RecurringRule, SupportedCurrency } from "../types";
import { roundCurrency, getLocalDateIso } from "../utils";

export type FixedCostType = "subscription" | "fixed_bill" | "recurring_cost";

export interface FixedCostItem {
  id: string;
  name: string;
  amount: number;
  monthlyAmount: number;
  yearlyAmount: number;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
  nextDueDate: string;
  type: FixedCostType;
  category?: string;
  source: "recurring_rule" | "payment";
  isPaidInCurrentCycle: boolean;
  status: "active" | "due_soon" | "due_today" | "overdue" | "paid";
  paidBy?: "me" | "partner" | "joint";
  splitMode?: "none" | "equal";
  currency: SupportedCurrency;
}

export interface FixedCostSummary {
  monthlyTotal: number;
  yearlyTotal: number;
  activeCount: number;
  subscriptionsCount: number;
  billsCount: number;
  otherCount: number;
  nextUpcomingItem: FixedCostItem | null;
  items: FixedCostItem[];
}

const SUBSCRIPTION_KEYWORDS = [
  "netflix", "spotify", "hbo", "max", "disney", "apple", "google", "icloud",
  "youtube", "yt premium", "adobe", "subskrypcja", "abonament", "karnet",
  "gym", "siłownia", "fitness", "chatgpt", "openai", "github", "patronite",
  "prime", "amazon prime", "audioteka", "storytel", "canva", "hosting",
  "domena", "vpn", "nordvpn", "playstation", "ps plus", "xbox", "game pass",
  "deezer", "tidal", "duolingo", "medium", "cursor", "setapp"
];

const FIXED_BILL_KEYWORDS = [
  "czynsz", "prąd", "energia", "gaz", "pge", "tauron", "enea", "energa",
  "pgnig", "internet", "światłowód", "woda", "ścieki", "odpady", "śmieci",
  "kredyt", "hipoteka", "leasing", "ubezpieczenie", "oc", "ac", "rata",
  "podatek", "orange", "play", "plus", "t-mobile", "vectra", "upc",
  "toya", "netia", "multimedia", "czesne", "przedszkole", "żłobek"
];

export function classifyFixedCostType(name: string, category?: string): FixedCostType {
  const normName = (name || "").toLowerCase().trim();
  const normCat = (category || "").toLowerCase().trim();

  for (const kw of SUBSCRIPTION_KEYWORDS) {
    if (normName.includes(kw) || normCat.includes(kw)) {
      return "subscription";
    }
  }

  for (const kw of FIXED_BILL_KEYWORDS) {
    if (normName.includes(kw) || normCat.includes(kw)) {
      return "fixed_bill";
    }
  }

  if (normCat.includes("rachunk") || normCat.includes("opłat") || normCat.includes("dom") || normCat.includes("mieszkanie")) {
    return "fixed_bill";
  }

  return "recurring_cost";
}

function calculateNormalizedAmounts(amount: number, frequency: FixedCostItem["frequency"]) {
  const amt = Math.max(0, amount);
  switch (frequency) {
    case "weekly":
      return {
        monthlyAmount: roundCurrency((amt * 52) / 12),
        yearlyAmount: roundCurrency(amt * 52),
      };
    case "biweekly":
      return {
        monthlyAmount: roundCurrency((amt * 26) / 12),
        yearlyAmount: roundCurrency(amt * 26),
      };
    case "quarterly":
      return {
        monthlyAmount: roundCurrency(amt / 3),
        yearlyAmount: roundCurrency(amt * 4),
      };
    case "yearly":
      return {
        monthlyAmount: roundCurrency(amt / 12),
        yearlyAmount: roundCurrency(amt),
      };
    case "monthly":
    default:
      return {
        monthlyAmount: roundCurrency(amt),
        yearlyAmount: roundCurrency(amt * 12),
      };
  }
}

function getItemDueStatus(dueDateStr: string, isPaid: boolean, todayStr: string): FixedCostItem["status"] {
  if (isPaid) return "paid";
  if (!dueDateStr) return "active";

  const today = new Date(`${todayStr}T00:00:00`);
  const due = new Date(`${dueDateStr}T00:00:00`);
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "due_today";
  if (diffDays <= 3) return "due_soon";
  return "active";
}

export function detectFixedCostItems(
  profile: Profile | null,
  recurringRules: RecurringRule[] = [],
  todayIsoStr?: string
): FixedCostItem[] {
  if (!profile) return [];

  const todayStr = todayIsoStr || getLocalDateIso();
  const profileCurrency = profile.currency || "PLN";
  const items: FixedCostItem[] = [];
  const processedRuleIds = new Set<string>();
  const processedNames = new Set<string>();

  // 1. Ingest active expense recurring rules (Strongest explicit signal)
  const activeRules = Array.isArray(recurringRules) && recurringRules.length > 0
    ? recurringRules
    : (Array.isArray(profile.recurringRules) ? profile.recurringRules : []);

  for (const rule of activeRules) {
    if (!rule || rule.isActive === false || rule.type !== "expense") continue;
    const amount = Number(rule.amount) || 0;
    if (amount <= 0) continue;

    processedRuleIds.add(rule.id);
    const normName = (rule.name || "").toLowerCase().trim();
    if (normName) processedNames.add(normName);

    const freq = rule.frequency || "monthly";
    const { monthlyAmount, yearlyAmount } = calculateNormalizedAmounts(amount, freq);
    const nextDueDate = rule.nextDueDate || todayStr;
    const type = classifyFixedCostType(rule.name, rule.category);

    items.push({
      id: `rule_${rule.id}`,
      name: rule.name || "Koszt cykliczny",
      amount: roundCurrency(amount),
      monthlyAmount,
      yearlyAmount,
      frequency: freq,
      nextDueDate,
      type,
      category: rule.category,
      source: "recurring_rule",
      isPaidInCurrentCycle: false,
      status: getItemDueStatus(nextDueDate, false, todayStr),
      paidBy: rule.paidBy,
      splitMode: rule.splitMode,
      currency: rule.currency || profileCurrency,
    });
  }

  // 2. Ingest recurring or fixed-pattern payments
  const payments = Array.isArray(profile.payments) ? profile.payments : [];
  for (const p of payments) {
    if (!p) continue;
    const amount = Number(p.amount) || 0;
    if (amount <= 0) continue;

    // Skip if already represented by an ingested recurring rule
    if (p.recurringRuleId && processedRuleIds.has(p.recurringRuleId)) {
      continue;
    }

    const normName = (p.name || "").toLowerCase().trim();
    const isExplicitRecurring = p.isRecurring === true || Boolean(p.recurringRuleId);
    const classifiedType = classifyFixedCostType(p.name, p.category);
    const isKeywordCandidate = classifiedType === "subscription" || classifiedType === "fixed_bill";

    // Only include if explicitly marked recurring OR matches conservative fixed cost keywords
    if (!isExplicitRecurring && !isKeywordCandidate) {
      continue;
    }

    // Deduplicate if we already have an item with the same name and amount
    const duplicateKey = `${normName}_${roundCurrency(amount)}`;
    if (processedNames.has(duplicateKey)) {
      continue;
    }
    processedNames.add(duplicateKey);

    const freq: FixedCostItem["frequency"] = "monthly";
    const { monthlyAmount, yearlyAmount } = calculateNormalizedAmounts(amount, freq);
    const nextDueDate = p.dueDate || todayStr;
    const isPaid = p.status === "Opłacono";

    items.push({
      id: `payment_${p.id}`,
      name: p.name || "Płatność stała",
      amount: roundCurrency(amount),
      monthlyAmount,
      yearlyAmount,
      frequency: freq,
      nextDueDate,
      type: classifiedType,
      category: p.category,
      source: "payment",
      isPaidInCurrentCycle: isPaid,
      status: getItemDueStatus(nextDueDate, isPaid, todayStr),
      paidBy: p.paidBy,
      splitMode: p.splitMode,
      currency: p.currency || profileCurrency,
    });
  }

  // Sort: Overdue/Due soon first, then by nextDueDate ascending
  return items.sort((a, b) => {
    if (a.status !== b.status) {
      const priority = { overdue: 1, due_today: 2, due_soon: 3, active: 4, paid: 5 };
      return (priority[a.status] || 99) - (priority[b.status] || 99);
    }
    return (a.nextDueDate || "").localeCompare(b.nextDueDate || "");
  });
}

export function summarizeFixedCosts(items: FixedCostItem[]): FixedCostSummary {
  let monthlyTotal = 0;
  let yearlyTotal = 0;
  let subscriptionsCount = 0;
  let billsCount = 0;
  let otherCount = 0;

  for (const item of items) {
    monthlyTotal += item.monthlyAmount;
    yearlyTotal += item.yearlyAmount;
    if (item.type === "subscription") {
      subscriptionsCount++;
    } else if (item.type === "fixed_bill") {
      billsCount++;
    } else {
      otherCount++;
    }
  }

  // Find nearest upcoming unpaid item
  const unpaidItems = items.filter(i => i.status !== "paid" && i.nextDueDate);
  const nextUpcomingItem = unpaidItems.length > 0 ? unpaidItems[0] : null;

  return {
    monthlyTotal: roundCurrency(monthlyTotal),
    yearlyTotal: roundCurrency(yearlyTotal),
    activeCount: items.length,
    subscriptionsCount,
    billsCount,
    otherCount,
    nextUpcomingItem,
    items,
  };
}

export function getFixedCostHubData(
  profile: Profile | null,
  recurringRules: RecurringRule[] = [],
  todayIsoStr?: string
): FixedCostSummary {
  const items = detectFixedCostItems(profile, recurringRules, todayIsoStr);
  return summarizeFixedCosts(items);
}
