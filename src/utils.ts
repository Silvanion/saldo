
import { Profile, Transaction, Payment, Goal, TransactionRule } from "./types";

export function getLocalDateIso(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addMonthsClamped(dateString: string, monthsToAdd: number): string {
  const d = new Date(dateString + "T00:00:00");
  if (isNaN(d.getTime())) return dateString; // Fallback
  
  const currentDay = d.getDate();
  const targetMonth = d.getMonth() + monthsToAdd;
  
  const res = new Date(d.getFullYear(), targetMonth, 1);
  const daysInTargetMonth = new Date(res.getFullYear(), res.getMonth() + 1, 0).getDate();
  res.setDate(Math.min(currentDay, daysInTargetMonth));
  
  const yyyy = res.getFullYear();
  const mm = String(res.getMonth() + 1).padStart(2, '0');
  const dd = String(res.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const parseAmount = (val: string): number => {
  if (!val) return 0;
  // strip spaces, currency symbols like PLN, zł, $, €
  let clean = val.replace(/[^0-9,\.\-]/g, "");
  
  // Find the last separator to treat it as decimal delimiter
  const commaIndex = clean.lastIndexOf(",");
  const dotIndex = clean.lastIndexOf(".");
  
  if (commaIndex > dotIndex) {
    // comma is decimal separator: replace dots (thousands) with empty, and comma with dot
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else if (dotIndex > commaIndex) {
    // dot is decimal separator: replace commas with empty
    clean = clean.replace(/,/g, "");
  }
  
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

export const expenseCategories = ['Żywność', 'Dom i rachunki', 'Transport', 'Zdrowie', 'Rozrywka', 'Kredyt konsumencki', 'Raty', 'Kredyt hipoteczny', 'Spłata karty kredytowej', 'Inne'];
export const incomeCategories = ['Wynagrodzenie', 'Premia', 'Działalność', 'Zwrot', 'Inne'];
export const budgetCategories = ['Żywność', 'Dom i rachunki', 'Transport', 'Rozrywka', 'Kredyt konsumencki', 'Raty', 'Kredyt hipoteczny', 'Spłata karty kredytowej'];

export const iconByCategory: Record<string, string> = {
  'Żywność': '🛒',
  'Dom i rachunki': '🏠',
  'Transport': '🚗',
  'Zdrowie': '❤️',
  'Rozrywka': '🎬',
  'Kredyt konsumencki': '💳',
  'Raty': '📉',
  'Kredyt hipoteczny': '🏦',
  'Spłata karty kredytowej': '💳',
  'Inne': '✨',
  'Wynagrodzenie': '💰',
  'Premia': '🎁',
  'Działalność': '💼',
  'Zwrot': '↩️'
};

export function autoCategorizeTransaction(txName: string, rules: TransactionRule[], originalCategory: string): { category: string; categoryIcon: string } {
  const nameLower = txName.toLowerCase();
  for (const rule of rules) {
    if (nameLower.includes(rule.pattern.toLowerCase())) {
      return {
        category: rule.category,
        categoryIcon: rule.categoryIcon || "✨"
      };
    }
  }
  // If no custom rule matches, use a few default smart mappings if the category is generic:
  if (originalCategory === "Inne" || !originalCategory) {
    const defaults: Record<string, { category: string; categoryIcon: string }> = {
      "orlen": { category: "Transport", categoryIcon: "🚗" },
      "lotos": { category: "Transport", categoryIcon: "🚗" },
      "bp ": { category: "Transport", categoryIcon: "🚗" },
      "paliw": { category: "Transport", categoryIcon: "🚗" },
      "shell": { category: "Transport", categoryIcon: "🚗" },
      "biedronka": { category: "Żywność", categoryIcon: "🛒" },
      "lidl": { category: "Żywność", categoryIcon: "🛒" },
      "tesco": { category: "Żywność", categoryIcon: "🛒" },
      "auchan": { category: "Żywność", categoryIcon: "🛒" },
      "carrefour": { category: "Żywność", categoryIcon: "🛒" },
      "zabka": { category: "Żywność", categoryIcon: "🛒" },
      "żabka": { category: "Żywność", categoryIcon: "🛒" },
      "netflix": { category: "Rozrywka", categoryIcon: "🎬" },
      "spotify": { category: "Rozrywka", categoryIcon: "🎬" },
      "kino": { category: "Rozrywka", categoryIcon: "🎬" },
      "teatr": { category: "Rozrywka", categoryIcon: "🎬" },
      "czynsz": { category: "Dom i rachunki", categoryIcon: "🏠" },
      "prad": { category: "Dom i rachunki", categoryIcon: "🏠" },
      "prąd": { category: "Dom i rachunki", categoryIcon: "🏠" },
      "gaz": { category: "Dom i rachunki", categoryIcon: "🏠" },
      "woda": { category: "Dom i rachunki", categoryIcon: "🏠" },
      "apteka": { category: "Zdrowie", categoryIcon: "❤️" },
      "lekarz": { category: "Zdrowie", categoryIcon: "❤️" },
      "szpital": { category: "Zdrowie", categoryIcon: "❤️" }
    };
    for (const [kw, val] of Object.entries(defaults)) {
      if (nameLower.includes(kw)) {
        return val;
      }
    }
  }

  return {
    category: originalCategory || "Inne",
    categoryIcon: iconByCategory[originalCategory] || "✨"
  };
}

export const plnFormatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN'
});

export const formatPln = (val: number): string => plnFormatter.format(val);

export function formatDatePl(isoDate: string): string {
  if (!isoDate) return "";
  try {
    const d = new Date(`${isoDate}T12:00:00`);
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return isoDate;
  }
}

export const monthsPl = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];

export function getMonthNamePl(monthIdx: number): string {
  return monthsPl[monthIdx] || "";
}

// Strip Polish diacritics to ensure Helvetica renders without missing character boxes
export function cleanPolishChars(text: string): string {
  const map: Record<string, string> = {
    'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
    'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
  };
  return text.replace(/[ąćęłnóśźżĄĆĘŁŃÓŚŹŻ]/g, match => map[match] || match);
}

// Hash pin securely using PBKDF2 (310,000 iterations of SHA-256)
export async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const saltBuffer = enc.encode(salt);
  
  const key = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 310000,
      hash: "SHA-256",
    },
    keyMaterial,
    256 // 32 bytes
  );

  return Array.from(new Uint8Array(key))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}


/**
 * Requests browser notification permission.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Scans upcoming unpaid payments and displays a native browser notification if due.
 */
export function checkAndNotifyPayments(payments: Payment[]) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = payments.filter((p) => {
    if (p.status === "Opłacono") return false;
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    const diffTime = pDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Notify if due today, tomorrow, or in the next 3 days
    return diffDays >= 0 && diffDays <= 3;
  });

  if (upcoming.length === 0) return;

  // Check if we already notified about these specific payments in this session to prevent spamming
  const notifiedKeysStr = sessionStorage.getItem("saldo_notified_payments");
  const notifiedKeys: string[] = notifiedKeysStr ? JSON.parse(notifiedKeysStr) : [];

  // Filter out payments that have already been notified
  const toNotify = upcoming.filter((p) => !notifiedKeys.includes(`${p.id}_${p.status}_${p.dueDate}`));

  if (toNotify.length === 0) return;

  // Update notified list
  const newNotifiedKeys = [...notifiedKeys, ...toNotify.map((p) => `${p.id}_${p.status}_${p.dueDate}`)];
  sessionStorage.setItem("saldo_notified_payments", JSON.stringify(newNotifiedKeys));

  // Send notification
  if (toNotify.length === 1) {
    const p = toNotify[0];
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    const diffDays = Math.ceil((pDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let timeLabel = "";
    if (diffDays === 0) timeLabel = "dzisiaj";
    else if (diffDays === 1) timeLabel = "jutro";
    else timeLabel = `za ${diffDays} dni`;

    new Notification("Zbliżający się termin płatności!", {
      body: `Rachunek "${p.name}" na kwotę ${p.amount.toFixed(2)} PLN jest do opłacenia ${timeLabel} (${p.dueDate}).`,
    });
  } else {
    const listNames = toNotify.map((p) => p.name).join(", ");
    new Notification("Masz zbliżające się płatności!", {
      body: `Do opłacenia masz ${toNotify.length} rachunki: ${listNames}.`,
    });
  }
}

/**
 * Parsuje tekst naturalny w celu szybkiego dodania transakcji.
 * Np. "Biedronka 123,40 dzisiaj", "Pensja 6000 1 lipca"
 */
export function parseQuickAddText(text: string, rules: TransactionRule[]): Partial<Transaction> {
  const result: Partial<Transaction> = {
    name: "",
    amount: 0,
    category: "Inne",
    type: "expense",
    isoDate: getLocalDateIso(),
    tags: []
  };

  const cleanText = text.trim();
  if (!cleanText) return result;

  // 1. Wykryj kwotę (np. 123.40, 123,40, 5000)
  // Szukamy liczby z opcjonalnym przecinkiem lub kropką i groszami
  const amountMatch = cleanText.match(/\b\d+(?:[.,]\d+)?\b/);
  let parsedAmount = 0;
  let textWithoutAmount = cleanText;

  if (amountMatch) {
    const rawAmount = amountMatch[0];
    parsedAmount = parseFloat(rawAmount.replace(",", "."));
    result.amount = parsedAmount;
    textWithoutAmount = cleanText.replace(rawAmount, "").replace(/\s+/g, " ").trim();
  }

  // 2. Wykryj datę
  let isoDate = getLocalDateIso();
  const todayObj = new Date();

  const lowerText = textWithoutAmount.toLowerCase();
  if (lowerText.includes("dzisiaj")) {
    isoDate = getLocalDateIso(todayObj);
    textWithoutAmount = textWithoutAmount.replace(/dzisiaj/i, "").trim();
  } else if (lowerText.includes("wczoraj")) {
    const yesterday = new Date();
    yesterday.setDate(todayObj.getDate() - 1);
    isoDate = getLocalDateIso(yesterday);
    textWithoutAmount = textWithoutAmount.replace(/wczoraj/i, "").trim();
  } else if (lowerText.includes("jutro")) {
    const tomorrow = new Date();
    tomorrow.setDate(todayObj.getDate() + 1);
    isoDate = getLocalDateIso(tomorrow);
    textWithoutAmount = textWithoutAmount.replace(/jutro/i, "").trim();
  } else {
    // Słownik miesięcy po polsku
    const monthsMap: Record<string, number> = {
      stycznia: 0, styczen: 0,
      lutego: 1, luty: 1,
      marca: 2, marzec: 2,
      kwietnia: 3, kwiecien: 3,
      maja: 4, maj: 4,
      czerwca: 5, czerwiec: 5,
      lipca: 6, lipiec: 6,
      sierpnia: 7, sierpien: 7,
      września: 8, wrzesnia: 8, wrzesien: 8,
      października: 9, pazdziernika: 9, pazdziernik: 9,
      listopada: 10, listopad: 10,
      grudnia: 11, grudzien: 11
    };

    const plMonthRegex = /(\d{1,2})\s+([a-zA-ZęćłńóśźżĄĆĘŁŃÓŚŹŻ]+)/i;
    const plMonthMatch = textWithoutAmount.match(plMonthRegex);
    if (plMonthMatch) {
      const day = parseInt(plMonthMatch[1]);
      const monthWord = plMonthMatch[2].toLowerCase();
      if (monthWord in monthsMap) {
        const month = monthsMap[monthWord];
        const dateObj = new Date(todayObj.getFullYear(), month, day);
        isoDate = getLocalDateIso(dateObj);
        textWithoutAmount = textWithoutAmount.replace(plMonthMatch[0], "").trim();
      }
    }
  }
  result.isoDate = isoDate;

  // 3. Pozostały tekst to nazwa transakcji
  let name = textWithoutAmount.replace(/\s+/g, " ").trim();
  if (name) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
    result.name = name;
  } else {
    result.name = "Szybki wpis";
  }

  // 4. Dopasowanie kategorii po regułach
  let matchedCategory = "";
  const catResult = autoCategorizeTransaction(result.name, rules, "");
  result.category = catResult.category;
  result.categoryIcon = catResult.categoryIcon;

  // Przychód czy wydatek
  const isIncomeCat = incomeCategories.includes(result.category);
  result.type = isIncomeCat ? "income" : "expense";

  return result;
}


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

/**
 * Zaokrągla kwotę pieniężną do 2 miejsc po przecinku.
 * Używa Number.EPSILON, aby uniknąć błędów precyzji IEEE 754
 * (np. 0.1 + 0.2 = 0.30000000000000004 → 0.3).
 * Zwraca 0 dla NaN / Infinity / -Infinity.
 */
export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
