import { Transaction } from "../types";

export interface MonthlyDigestResult {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number | null;
  topExpenseCategory: string | null;
  topExpenseCategoryAmount: number;
  momExpenseChangePercent: number | null;
  transactionCount: number;
  summaryText: string;
}

const MONTH_NAMES_LOCATIVE = [
  "styczniu", "lutym", "marcu", "kwietniu", "maju", "czerwcu",
  "lipcu", "sierpniu", "wrześniu", "październiku", "listopadzie", "grudniu"
];

export function generateMonthlyDigest(
  transactions: Transaction[],
  year: number,
  monthIdx: number
): MonthlyDigestResult {
  let prevMonthIdx = monthIdx - 1;
  let prevYear = year;
  if (prevMonthIdx < 0) {
    prevMonthIdx = 11;
    prevYear -= 1;
  }

  let totalIncome = 0;
  let totalExpenses = 0;
  let transactionCount = 0;
  const categoryExpenses: Record<string, number> = {};

  let prevTotalExpenses = 0;
  let hasPrevMonthData = false;

  for (const tx of transactions) {
    if (!tx.isoDate) continue;
    const d = new Date(`${tx.isoDate}T12:00:00`);
    const txYear = d.getFullYear();
    const txMonth = d.getMonth();
    
    if (txYear === year && txMonth === monthIdx) {
      transactionCount++;
      const amount = Number(tx.amount) || 0;
      if (tx.type === "income") {
        totalIncome += amount;
      } else if (tx.type === "expense") {
        totalExpenses += amount;
        categoryExpenses[tx.category] = (categoryExpenses[tx.category] || 0) + amount;
      }
    } else if (txYear === prevYear && txMonth === prevMonthIdx) {
      hasPrevMonthData = true;
      if (tx.type === "expense") {
        prevTotalExpenses += (Number(tx.amount) || 0);
      }
    }
  }

  const balance = totalIncome - totalExpenses;
  let savingsRate: number | null = null;
  if (totalIncome > 0) {
    savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
  }

  let topExpenseCategory: string | null = null;
  let topExpenseCategoryAmount = 0;
  for (const cat in categoryExpenses) {
    if (categoryExpenses[cat] > topExpenseCategoryAmount) {
      topExpenseCategoryAmount = categoryExpenses[cat];
      topExpenseCategory = cat;
    }
  }

  let momExpenseChangePercent: number | null = null;
  if (hasPrevMonthData && prevTotalExpenses > 0) {
    momExpenseChangePercent = ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100;
  } else if (hasPrevMonthData && prevTotalExpenses === 0 && totalExpenses > 0) {
    momExpenseChangePercent = 100; 
  } else if (hasPrevMonthData && prevTotalExpenses === 0 && totalExpenses === 0) {
    momExpenseChangePercent = 0;
  }

  const sentences: string[] = [];
  const monthName = MONTH_NAMES_LOCATIVE[monthIdx];
  const prevMonthName = MONTH_NAMES_LOCATIVE[prevMonthIdx];
  
  if (hasPrevMonthData) {
    if (totalExpenses < prevTotalExpenses) {
      sentences.push(`W ${monthName} wydałeś mniej niż w ${prevMonthName}.`);
    } else if (totalExpenses > prevTotalExpenses) {
      sentences.push(`W ${monthName} wydałeś więcej niż w ${prevMonthName}.`);
    } else {
      sentences.push(`W ${monthName} wydałeś tyle samo co w ${prevMonthName}.`);
    }
  }

  if (topExpenseCategory) {
    sentences.push(`Najwięcej środków przeznaczyłeś na kategorię: ${topExpenseCategory}.`);
  }

  if (totalIncome > 0 || totalExpenses > 0) {
    if (balance > 0) {
      sentences.push("Bilans miesiąca był dodatni.");
    } else if (balance < 0) {
      sentences.push("Bilans miesiąca był ujemny.");
    } else {
      sentences.push("Bilans miesiąca wyszedł na zero.");
    }
  } else {
    sentences.push("Brak danych finansowych w tym miesiącu.");
  }

  const summaryText = sentences.slice(0, 3).join(" ");

  return {
    totalIncome,
    totalExpenses,
    balance,
    savingsRate,
    topExpenseCategory,
    topExpenseCategoryAmount,
    momExpenseChangePercent,
    transactionCount,
    summaryText
  };
}
