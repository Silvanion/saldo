import { Transaction, Profile, DebtItem } from "../types";
import { expenseCategories } from "./categories";
import { getMonthName } from "./date";

export function generateCsvContent(transactions: Transaction[]): string {
  // UTF-8 BOM
  let csvContent = "\uFEFF";
  
  // Headers
  const headers = ["ID", "Nazwa", "Kwota", "Waluta", "Kategoria", "Konto", "Typ", "Data", "Tagi"];
  csvContent += headers.map(escapeCsvValue).join(",") + "\n";
  
  transactions.forEach((tx) => {
    const tagsStr = tx.tags && tx.tags.length > 0 ? tx.tags.join("; ") : "";
    const row = [
      tx.id || "",
      tx.name || "",
      tx.amount?.toString() || "0",
      tx.currency || "PLN",
      tx.category || "",
      tx.account || "",
      tx.type || "",
      tx.isoDate || "",
      tagsStr
    ];
    csvContent += row.map(escapeCsvValue).join(",") + "\n";
  });
  
  return csvContent;
}

export function generateBudgetCsvContent(
  profile: Profile,
  year: number,
  monthIndex: number
): string {
  let csvContent = "\uFEFF";
  const monthName = getMonthName(monthIndex);

  // Headers
  const headers = [
    "Kategoria",
    "Miesięczny Limit",
    "Rzeczywiste Wydatki",
    "Pozostało / Przekroczenie",
    "Procent Realizacji (%)",
    "Status",
    "Okres",
    "Profil"
  ];
  csvContent += headers.map(escapeCsvValue).join(",") + "\n";

  // Calculate expenses for target month
  const targetTxs = (profile.transactions || []).filter((t) => {
    if (!t.isoDate || t.type !== "expense") return false;
    const d = new Date(`${t.isoDate}T12:00:00`);
    return d.getFullYear() === year && d.getMonth() === monthIndex;
  });

  const allCategories = Array.from(
    new Set([
      ...expenseCategories,
      ...Object.keys(profile.budgets || {}),
      ...targetTxs.map((t) => t.category).filter(Boolean)
    ])
  );

  allCategories.forEach((cat) => {
    const limit = profile.budgets?.[cat] || 0;
    const spent = targetTxs
      .filter((t) => t.category === cat)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const diff = limit > 0 ? limit - spent : -spent;
    const pct = limit > 0 ? Math.round((spent / limit) * 100) : (spent > 0 ? 100 : 0);
    const status =
      limit === 0
        ? "Brak limitu"
        : spent > limit
        ? "Przekroczony"
        : "W normie";

    const row = [
      cat,
      limit.toFixed(2),
      spent.toFixed(2),
      diff.toFixed(2),
      `${pct}%`,
      status,
      `${monthName} ${year}`,
      profile.name
    ];
    csvContent += row.map(escapeCsvValue).join(",") + "\n";
  });

  return csvContent;
}

export function generateDebtsCsvContent(
  debts: DebtItem[],
  currency: string = "PLN"
): string {
  let csvContent = "\uFEFF";

  const headers = [
    "ID",
    "Nazwa Zobowiązania",
    "Instytucja",
    "Typ Zobowiązania",
    "Saldo Bieżące",
    "Waluta",
    "Oprocentowanie APR (%)",
    "Miesięczna Rata",
    "Pozostało Miesięcy",
    "Status",
    "Notatki"
  ];
  csvContent += headers.map(escapeCsvValue).join(",") + "\n";

  debts.forEach((debt) => {
    const typeLabel =
      debt.type === "mortgage"
        ? "Hipoteka"
        : debt.type === "credit_card"
        ? "Karta kredytowa"
        : debt.type === "cash_loan"
        ? "Kredyt gotówkowy"
        : debt.type === "revolving"
        ? "Limit odnawialny"
        : debt.type === "bnpl"
        ? "BNPL (Kup teraz)"
        : "Inne";

    const row = [
      debt.id || "",
      debt.name || "",
      debt.institution || "",
      typeLabel,
      (debt.balance || 0).toFixed(2),
      debt.currency || currency,
      (debt.interestRate || 0).toFixed(2),
      (debt.monthlyPayment || 0).toFixed(2),
      debt.remainingMonths ? debt.remainingMonths.toString() : "-",
      debt.status === "active" ? "Aktywny" : "Spłacony",
      debt.notes || ""
    ];
    csvContent += row.map(escapeCsvValue).join(",") + "\n";
  });

  return csvContent;
}

function escapeCsvValue(val: string): string {
  const str = String(val);
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadFile(content: string, filename: string, type: string) {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function shareOrDownloadBlob(
  blob: Blob,
  filename: string,
  title: string
): Promise<{ shared: boolean }> {
  if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text: title
        });
        return { shared: true };
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return { shared: false };
      }
    }
  }

  // Fallback to standard download if in browser
  if (typeof document !== "undefined") {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  return { shared: false };
}
