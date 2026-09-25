import { Profile, RecurringRule, Payment } from "../types";
import { getLocalDateIso, addMonthsClamped, roundCurrency } from "../utils";

export interface CashflowEvent {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  category?: string;
  source: "payment" | "recurring" | "runrate";
}

export interface DailyCashflowPoint {
  date: string;
  dayOffset: number;
  incomes: number;
  expenses: number;
  netChange: number;
  projectedBalance: number;
  isRiskDip: boolean;
  events: CashflowEvent[];
}

export interface CashflowHorizonSummary {
  horizonDays: 30 | 60 | 90;
  targetDate: string;
  projectedBalance: number;
  netChange: number;
  totalIncomes: number;
  totalExpenses: number;
  totalBills: number;
  totalVariableSpend: number;
  riskDaysCount: number;
  lowestPoint: {
    amount: number;
    date: string;
    dayOffset: number;
  };
  highestPoint: {
    amount: number;
    date: string;
    dayOffset: number;
  };
}

export interface CashflowForecastResult {
  currentBalance: number;
  todayIso: string;
  safetyBuffer: number;
  dailyBurnRate: number;
  monthlyPlannedBudget: number;
  timeline: DailyCashflowPoint[];
  upcomingEvents: CashflowEvent[];
  summary30: CashflowHorizonSummary;
  summary60: CashflowHorizonSummary;
  summary90: CashflowHorizonSummary;
  hasRiskDip: boolean;
}

export interface CashflowForecastOptions {
  todayIsoStr?: string;
  safetyBuffer?: number;
  includeDailyRunRate?: boolean;
}

function buildExistingRecurringInstances(profile: Profile): Set<string> {
  const instances = new Set<string>();
  const transactions = Array.isArray(profile.transactions) ? profile.transactions : [];
  for (const tx of transactions) {
    if (tx.recurringRuleId && tx.isoDate) {
      instances.add(`${tx.recurringRuleId}_${tx.isoDate}`);
    }
  }
  const payments = Array.isArray(profile.payments) ? profile.payments : [];
  for (const p of payments) {
    if (p.recurringRuleId && p.dueDate) {
      instances.add(`${p.recurringRuleId}_${p.dueDate}`);
    }
  }
  return instances;
}

function addDaysToIso(baseIso: string, days: number): string {
  const d = new Date(baseIso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return getLocalDateIso(d);
}

export function calculateCashflowForecast(
  profile: Profile | null,
  recurringRules: RecurringRule[] = [],
  options: CashflowForecastOptions = {}
): CashflowForecastResult {
  const todayStr = options.todayIsoStr || getLocalDateIso();
  const safetyBuffer = typeof options.safetyBuffer === "number" ? Math.max(0, options.safetyBuffer) : 500;
  const includeDailyRunRate = options.includeDailyRunRate !== false;

  if (!profile) {
    const emptySummary = (days: 30 | 60 | 90): CashflowHorizonSummary => ({
      horizonDays: days,
      targetDate: addDaysToIso(todayStr, days),
      projectedBalance: 0,
      netChange: 0,
      totalIncomes: 0,
      totalExpenses: 0,
      totalBills: 0,
      totalVariableSpend: 0,
      riskDaysCount: 0,
      lowestPoint: { amount: 0, date: todayStr, dayOffset: 0 },
      highestPoint: { amount: 0, date: todayStr, dayOffset: 0 }
    });

    return {
      currentBalance: 0,
      todayIso: todayStr,
      safetyBuffer,
      dailyBurnRate: 0,
      monthlyPlannedBudget: 0,
      timeline: [],
      upcomingEvents: [],
      summary30: emptySummary(30),
      summary60: emptySummary(60),
      summary90: emptySummary(90),
      hasRiskDip: false
    };
  }

  // 1. Initial starting balance from all transactions
  const transactions = Array.isArray(profile.transactions) ? profile.transactions : [];
  const currentBalance = roundCurrency(
    transactions.reduce((sum, tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === "income") return sum + amt;
      if (tx.type === "expense") return sum - amt;
      return sum;
    }, 0)
  );

  // 2. Compute daily variable burn-rate from active monthly budgets
  const budgets = profile.budgets || {};
  let monthlyPlannedBudget = 0;
  for (const cat of Object.keys(budgets)) {
    const limit = Number(budgets[cat]) || 0;
    if (limit > 0) {
      monthlyPlannedBudget += limit;
    }
  }
  const dailyBurnRate = includeDailyRunRate && monthlyPlannedBudget > 0
    ? roundCurrency(monthlyPlannedBudget / 30)
    : 0;

  // 3. Map future discrete events (90 days horizon)
  const maxDays = 90;
  const endDateStr = addDaysToIso(todayStr, maxDays);
  const eventsByDate = new Map<string, CashflowEvent[]>();

  const addEvent = (event: CashflowEvent) => {
    if (!eventsByDate.has(event.date)) {
      eventsByDate.set(event.date, []);
    }
    eventsByDate.get(event.date)!.push(event);
  };

  // A. Unpaid single or recurring payments within horizon
  const payments = Array.isArray(profile.payments) ? profile.payments : [];
  for (const p of payments) {
    if (!p || p.status === "Opłacono") continue;
    const dueDate = p.dueDate;
    const amount = Number(p.amount) || 0;
    if (amount <= 0 || !dueDate) continue;

    if (dueDate >= todayStr && dueDate <= endDateStr) {
      addEvent({
        id: `payment_${p.id}`,
        name: p.name || "Rachunek",
        amount: roundCurrency(amount),
        type: "expense",
        date: dueDate,
        category: p.category,
        source: "payment"
      });
    }
  }

  // B. Recurring rules instances within horizon (incomes & expenses)
  const existingInstances = buildExistingRecurringInstances(profile);
  const activeRules = Array.isArray(recurringRules) && recurringRules.length > 0
    ? recurringRules
    : (Array.isArray(profile.recurringRules) ? profile.recurringRules : []);

  for (const rule of activeRules) {
    if (!rule || rule.isActive === false) continue;
    const ruleAmount = Number(rule.amount) || 0;
    if (ruleAmount <= 0) continue;

    let currDate = rule.nextDueDate;
    let occurrences = 0;
    const MAX_OCCURRENCES = 120;

    while (currDate && currDate <= endDateStr && occurrences < MAX_OCCURRENCES) {
      if (currDate >= todayStr) {
        const instanceKey = `${rule.id}_${currDate}`;
        if (!existingInstances.has(instanceKey)) {
          addEvent({
            id: `rule_${rule.id}_${currDate}`,
            name: rule.name || (rule.type === "income" ? "Przychód cykliczny" : "Wydatek cykliczny"),
            amount: roundCurrency(ruleAmount),
            type: rule.type,
            date: currDate,
            category: rule.category,
            source: "recurring"
          });
        }
      }

      const prevDate = currDate;
      if (rule.frequency === "weekly") {
        const nextD = new Date(currDate + "T00:00:00");
        nextD.setDate(nextD.getDate() + 7);
        currDate = getLocalDateIso(nextD);
      } else if (rule.frequency === "biweekly") {
        const nextD = new Date(currDate + "T00:00:00");
        nextD.setDate(nextD.getDate() + 14);
        currDate = getLocalDateIso(nextD);
      } else if (rule.frequency === "monthly") {
        currDate = addMonthsClamped(currDate, 1);
      } else if (rule.frequency === "quarterly") {
        currDate = addMonthsClamped(currDate, 3);
      } else if (rule.frequency === "yearly") {
        currDate = addMonthsClamped(currDate, 12);
      } else {
        currDate = addMonthsClamped(currDate, 1);
      }

      if (currDate <= prevDate) break;
      occurrences++;
    }
  }

  // 4. Construct Day-by-Day timeline (Day 1 to 90)
  const timeline: DailyCashflowPoint[] = [];
  let runningBalance = currentBalance;
  const allDiscreteEvents: CashflowEvent[] = [];

  const hasAnyActivity = transactions.length > 0 || eventsByDate.size > 0 || dailyBurnRate > 0;

  for (let day = 1; day <= maxDays; day++) {
    const dateStr = addDaysToIso(todayStr, day);
    const dayEvents = eventsByDate.get(dateStr) || [];

    let dayIncomes = 0;
    let dayDiscreteExpenses = 0;

    for (const ev of dayEvents) {
      allDiscreteEvents.push(ev);
      if (ev.type === "income") {
        dayIncomes += ev.amount;
      } else {
        dayDiscreteExpenses += ev.amount;
      }
    }

    const totalDayExpenses = roundCurrency(dayDiscreteExpenses + dailyBurnRate);
    const netChange = roundCurrency(dayIncomes - totalDayExpenses);
    runningBalance = roundCurrency(runningBalance + netChange);

    timeline.push({
      date: dateStr,
      dayOffset: day,
      incomes: roundCurrency(dayIncomes),
      expenses: totalDayExpenses,
      netChange,
      projectedBalance: runningBalance,
      isRiskDip: hasAnyActivity && runningBalance < safetyBuffer,
      events: dayEvents
    });
  }

  // 5. Build summary metrics for 30, 60, 90 days
  const computeSummary = (days: 30 | 60 | 90): CashflowHorizonSummary => {
    const slice = timeline.slice(0, days);
    const targetDate = addDaysToIso(todayStr, days);
    const projectedBalance = slice.length > 0 ? slice[slice.length - 1].projectedBalance : currentBalance;
    const netChange = roundCurrency(projectedBalance - currentBalance);

    let totalIncomes = 0;
    let totalExpenses = 0;
    let totalBills = 0;
    let riskDaysCount = 0;

    let lowestPoint = {
      amount: currentBalance,
      date: todayStr,
      dayOffset: 0
    };
    let highestPoint = {
      amount: currentBalance,
      date: todayStr,
      dayOffset: 0
    };

    slice.forEach((pt, idx) => {
      totalIncomes += pt.incomes;
      totalExpenses += pt.expenses;
      if (pt.isRiskDip) {
        riskDaysCount++;
      }

      pt.events.forEach((ev) => {
        if (ev.type === "expense") {
          totalBills += ev.amount;
        }
      });

      if (idx === 0 || pt.projectedBalance < lowestPoint.amount) {
        lowestPoint = {
          amount: pt.projectedBalance,
          date: pt.date,
          dayOffset: pt.dayOffset
        };
      }

      if (idx === 0 || pt.projectedBalance > highestPoint.amount) {
        highestPoint = {
          amount: pt.projectedBalance,
          date: pt.date,
          dayOffset: pt.dayOffset
        };
      }
    });

    const totalVariableSpend = roundCurrency(dailyBurnRate * days);

    return {
      horizonDays: days,
      targetDate,
      projectedBalance,
      netChange,
      totalIncomes: roundCurrency(totalIncomes),
      totalExpenses: roundCurrency(totalExpenses),
      totalBills: roundCurrency(totalBills),
      totalVariableSpend,
      riskDaysCount,
      lowestPoint,
      highestPoint
    };
  };

  const summary30 = computeSummary(30);
  const summary60 = computeSummary(60);
  const summary90 = computeSummary(90);

  const hasRiskDip = summary90.riskDaysCount > 0;

  // Sort upcoming discrete events by date
  allDiscreteEvents.sort((a, b) => a.date.localeCompare(b.date));

  return {
    currentBalance,
    todayIso: todayStr,
    safetyBuffer,
    dailyBurnRate,
    monthlyPlannedBudget: roundCurrency(monthlyPlannedBudget),
    timeline,
    upcomingEvents: allDiscreteEvents,
    summary30,
    summary60,
    summary90,
    hasRiskDip
  };
}
