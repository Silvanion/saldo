import { Transaction } from "../types";

export function generateCsvContent(transactions: Transaction[]): string {
  // UTF-8 BOM
  let csvContent = "\uFEFF";
  
  // Headers
  const headers = ["ID", "Nazwa", "Kwota", "Kategoria", "Konto", "Typ", "Data"];
  csvContent += headers.map(escapeCsvValue).join(",") + "\n";
  
  transactions.forEach((tx) => {
    const row = [
      tx.id || "",
      tx.name || "",
      tx.amount?.toString() || "0",
      tx.category || "",
      tx.account || "",
      tx.type || "",
      tx.isoDate || ""
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
