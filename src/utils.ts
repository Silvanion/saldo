import { jsPDF } from "jspdf";
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

export function generateReportPdf(profile: Profile, year: number, monthIndex: number) {
  const doc = new jsPDF();
  const monthName = getMonthNamePl(monthIndex);
  
  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(19, 117, 102); // Primary Teal color
  doc.text(cleanPolishChars(`SALDO - RAPORT MIESIECZNY`), 14, 20);
  
  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(cleanPolishChars(`Profil: ${profile.name} (${profile.kind === "shared" ? "Budzet wspolny" : "Budzet osobisty"})`), 14, 27);
  doc.text(cleanPolishChars(`Okres rozliczeniowy: ${monthName} ${year}`), 14, 33);
  
  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 38, 196, 38);
  
  // Calculate Totals for this month
  const targetTransactions = profile.transactions.filter(t => {
    const tDate = new Date(`${t.isoDate}T12:00:00`);
    return tDate.getFullYear() === year && tDate.getMonth() === monthIndex;
  });
  
  const incomeTotal = targetTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
    
  const expenseTotal = targetTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
    
  const balance = incomeTotal - expenseTotal;
  
  // Financial Summary Box
  doc.setFillColor(245, 248, 247); // Light theme bg
  doc.rect(14, 43, 182, 35, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(21, 58, 53); // Deep ink
  doc.text(cleanPolishChars("PODSUMOWANIE FINANSOWE"), 20, 51);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(cleanPolishChars(`Przychody razem:`), 20, 59);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(19, 117, 102); // Teal
  doc.text(`${incomeTotal.toFixed(2)} PLN`, 80, 59);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(cleanPolishChars(`Wydatki razem:`), 20, 65);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(213, 94, 80); // Coral
  doc.text(`${expenseTotal.toFixed(2)} PLN`, 80, 65);
  
  doc.setDrawColor(220, 220, 220);
  doc.line(115, 48, 115, 73); // Vertical divider
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(cleanPolishChars(`Stan konta (Bilans):`), 122, 59);
  doc.setFont("helvetica", "bold");
  if (balance >= 0) {
    doc.setTextColor(19, 117, 102);
  } else {
    doc.setTextColor(213, 94, 80);
  }
  doc.text(`${balance.toFixed(2)} PLN`, 122, 66);
  
  // Section 1: Visual Expense Bar Chart
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(21, 58, 53);
  doc.text(cleanPolishChars("WYKRES WYDATKOW WEDLUG KATEGORII"), 14, 92);
  
  let y = 100;
  
  // Calculate expenses for all 6 categories
  const categoriesList = expenseCategories;
  const categoryExpenses = categoriesList.map(cat => {
    const spent = targetTransactions
      .filter(t => t.type === "expense" && t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0);
    return { name: cat, spent };
  });
  
  // Draw the horizontal bar chart
  categoryExpenses.forEach(cat => {
    const percent = expenseTotal > 0 ? (cat.spent / expenseTotal) : 0;
    const percentText = `${Math.round(percent * 100)}%`;
    
    // Category Name (Left)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(21, 58, 53);
    doc.text(cleanPolishChars(cat.name), 14, y);
    
    // Amount & Percentage (Right)
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const textLabel = `${cat.spent.toFixed(2)} PLN (${percentText})`;
    doc.text(textLabel, 196 - doc.getTextWidth(textLabel), y);
    
    y += 3;
    
    // Gray background bar
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y, 182, 3.5, "F");
    
    // Colored fill bar (brand Teal)
    if (percent > 0) {
      doc.setFillColor(19, 117, 102);
      doc.rect(14, y, 182 * percent, 3.5, "F");
    }
    
    y += 10;
  });
  
  // Section 2: Used Tags Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(21, 58, 53);
  doc.text(cleanPolishChars("UZYTE TAGI W TYM OKRESIE"), 14, y + 2);
  y += 10;
  
  // Extract and aggregate tags from transactions
  const tagMap: Record<string, { count: number; sum: number }> = {};
  targetTransactions.forEach(t => {
    if (t.tags && Array.isArray(t.tags)) {
      t.tags.forEach(tag => {
        const cleanTag = tag.trim().toLowerCase();
        if (cleanTag) {
          if (!tagMap[cleanTag]) {
            tagMap[cleanTag] = { count: 0, sum: 0 };
          }
          tagMap[cleanTag].count += 1;
          tagMap[cleanTag].sum += t.amount;
        }
      });
    }
  });
  
  const tagsList = Object.entries(tagMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);
    
  if (tagsList.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(cleanPolishChars("Brak uzytych tagow w transakcjach z tego miesiaca."), 14, y);
    y += 8;
  } else {
    // Render nice tag pills!
    let x = 14;
    doc.setFontSize(8);
    tagsList.forEach(t => {
      const tagText = `#${t.name} (${t.count}x, ${t.sum.toFixed(0)} PLN)`;
      const cleanText = cleanPolishChars(tagText);
      const textWidth = doc.getTextWidth(cleanText);
      const pillWidth = textWidth + 8;
      const pillHeight = 6;
      
      // Wrap line if it overflows page
      if (x + pillWidth > 196) {
        x = 14;
        y += 8;
      }
      
      // If we are reaching the end of the page, add page (though page 1 has plenty of space for y)
      if (y > 275) {
        doc.addPage();
        y = 20;
        x = 14;
      }
      
      // Draw Pill background
      doc.setFillColor(231, 243, 240); // Soft brand teal
      doc.rect(x, y - 4, pillWidth, pillHeight, "F");
      
      // Draw Pill border
      doc.setDrawColor(19, 117, 102); // 100% alpha teal border (safe for default jsPDF styles)
      doc.rect(x, y - 4, pillWidth, pillHeight, "S");
      
      // Draw Pill text
      doc.setFont("helvetica", "bold");
      doc.setTextColor(19, 117, 102);
      doc.text(cleanText, x + 4, y);
      
      x += pillWidth + 3;
    });
    y += 10;
  }
  
  // Footer page 1
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(cleanPolishChars("Strona 1. Raport Finansowy Saldo."), 14, 285);
  doc.text(cleanPolishChars(`Data generowania: ${new Date().toLocaleDateString('pl-PL')}`), 145, 285);
  
  // PAGE 2: BILLS, RECURRING PAYMENTS AND GOALS
  doc.addPage();
  y = 20;
  
  // Header Page 2
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(19, 117, 102);
  doc.text(cleanPolishChars("RACHUNKI I CELE OSZCZEDNOSCIOWE"), 14, y);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(cleanPolishChars(`Profil: ${profile.name} | Okres: ${monthName} ${year}`), 14, y + 6);
  
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y + 10, 196, y + 10);
  
  y += 20;
  
  // Section 2: Bills and recurring payments
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(21, 58, 53);
  doc.text(cleanPolishChars("STAN OPLAT I RACHUNKOW"), 14, y);
  y += 8;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(cleanPolishChars("Nazwa rachunku"), 15, y);
  doc.text(cleanPolishChars("Termin platnosci"), 80, y);
  doc.text(cleanPolishChars("Kwota"), 130, y);
  doc.text(cleanPolishChars("Status"), 165, y);
  doc.line(14, y + 2, 196, y + 2);
  y += 7;
  
  doc.setFont("helvetica", "normal");
  const bills = profile.payments;
  if (bills.length === 0) {
    doc.text(cleanPolishChars("Brak zdefiniowanych rachunkow."), 15, y);
    y += 15;
  } else {
    bills.forEach(b => {
      doc.text(cleanPolishChars(b.name), 15, y);
      doc.text(b.dueDate, 80, y);
      doc.text(`${b.amount.toFixed(2)} PLN`, 130, y);
      
      const bStatus = b.status === "Opłacono" ? "Oplacone" : "Do oplacenia";
      if (b.status === "Opłacono") {
        doc.setTextColor(19, 117, 102); // green
      } else {
        doc.setTextColor(213, 94, 80); // coral
      }
      doc.setFont("helvetica", "bold");
      doc.text(cleanPolishChars(bStatus), 165, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      
      y += 6;
    });
    y += 8;
  }
  
  // Section 3: Goals progress
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(21, 58, 53);
  doc.text(cleanPolishChars("CELE OSZCZEDNOSCIOWE"), 14, y);
  y += 8;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(cleanPolishChars("Nazwa celu"), 15, y);
  doc.text(cleanPolishChars("Zaoszczedzono"), 65, y);
  doc.text(cleanPolishChars("Kwota docelowa"), 105, y);
  doc.text(cleanPolishChars("Wizualny postep i procent"), 140, y);
  doc.line(14, y + 2, 196, y + 2);
  y += 7;
  
  doc.setFont("helvetica", "normal");
  const goals = profile.goals;
  if (goals.length === 0) {
    doc.text(cleanPolishChars("Brak zdefiniowanych celow oszczednosciowych."), 15, y);
    y += 10;
  } else {
    goals.forEach(g => {
      const progressRatio = g.target > 0 ? Math.min(1, g.saved / g.target) : 0;
      const progressPercent = `${Math.round(progressRatio * 100)}%`;
      
      doc.setFont("helvetica", "normal");
      doc.text(cleanPolishChars(g.name), 15, y);
      doc.text(`${g.saved.toFixed(2)} PLN`, 65, y);
      doc.text(`${g.target.toFixed(2)} PLN`, 105, y);
      
      // Visual Mini Progress Bar
      const barX = 140;
      const barY = y - 3;
      const barW = 35;
      const barH = 3;
      
      // Bar background
      doc.setFillColor(240, 240, 240);
      doc.rect(barX, barY, barW, barH, "F");
      
      // Bar progress fill (beautiful teal-gold)
      if (progressRatio > 0) {
        doc.setFillColor(19, 117, 102);
        doc.rect(barX, barY, barW * progressRatio, barH, "F");
      }
      
      // Percent text
      doc.setFont("helvetica", "bold");
      doc.setTextColor(19, 117, 102);
      doc.text(progressPercent, barX + barW + 3, y);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "normal");
      
      y += 7;
    });
  }
  
  // Footer page 2
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(cleanPolishChars("Strona 2. Raport Finansowy Saldo."), 14, 285);
  doc.text(cleanPolishChars(`Data generowania: ${new Date().toLocaleDateString('pl-PL')}`), 145, 285);
  
  // PAGE 3: TRANSACTION HISTORY
  doc.addPage();
  y = 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(19, 117, 102);
  doc.text(cleanPolishChars("HISTORIA TRANSAKCJI"), 14, y);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(cleanPolishChars("Spis wszystkich wplat i wyplat zarejestrowanych w wybranym okresie rozliczeniowym."), 14, y + 6);
  
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y + 10, 196, y + 10);
  
  y += 20;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(21, 58, 53);
  doc.text(cleanPolishChars("Data"), 15, y);
  doc.text(cleanPolishChars("Nazwa transakcji"), 40, y);
  doc.text(cleanPolishChars("Kategoria"), 110, y);
  doc.text(cleanPolishChars("Konto"), 150, y);
  doc.text(cleanPolishChars("Kwota"), 178, y);
  doc.line(14, y + 2, 196, y + 2);
  y += 7;
  
  doc.setFont("helvetica", "normal");
  let currentPage = 3;
  
  if (targetTransactions.length === 0) {
    doc.text(cleanPolishChars("Brak zarejestrowanych transakcji w tym okresie rozliczeniowym."), 15, y);
  } else {
    targetTransactions.sort((a,b) => b.isoDate.localeCompare(a.isoDate)).forEach(t => {
      // Auto-paginate if table overflows vertical limit
      if (y > 270) {
        // Footer for previous transaction history page
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(cleanPolishChars(`Strona ${currentPage} o strukturze dynamicznej. Raport Saldo.`), 14, 285);
        doc.text(cleanPolishChars(`Data generowania: ${new Date().toLocaleDateString('pl-PL')}`), 145, 285);
        
        doc.addPage();
        currentPage += 1;
        y = 20;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(21, 58, 53);
        doc.text(cleanPolishChars("Data"), 15, y);
        doc.text(cleanPolishChars("Nazwa transakcji"), 40, y);
        doc.text(cleanPolishChars("Kategoria"), 110, y);
        doc.text(cleanPolishChars("Konto"), 150, y);
        doc.text(cleanPolishChars("Kwota"), 178, y);
        doc.line(14, y + 2, 196, y + 2);
        y += 7;
        doc.setFont("helvetica", "normal");
      }
      
      // Gather transaction tags for description
      let nameWithTags = t.name;
      if (t.tags && t.tags.length > 0) {
        nameWithTags += ` [${t.tags.join(", ")}]`;
      }
      
      const cleanDesc = cleanPolishChars(nameWithTags.length > 38 ? nameWithTags.slice(0, 35) + "..." : nameWithTags);
      const cleanCat = cleanPolishChars(t.category);
      const cleanAcc = cleanPolishChars(t.account);
      const sign = t.type === "income" ? "+" : "-";
      
      // Style positive and negative amounts
      if (t.type === "income") {
        doc.setTextColor(19, 117, 102); // Teal for income
      } else {
        doc.setTextColor(213, 94, 80); // Coral for expense
      }
      
      doc.text(t.isoDate, 15, y);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(21, 58, 53);
      doc.text(cleanDesc, 40, y);
      doc.setFont("helvetica", "normal");
      
      doc.text(cleanCat, 110, y);
      doc.text(cleanAcc, 150, y);
      
      if (t.type === "income") {
        doc.setTextColor(19, 117, 102);
      } else {
        doc.setTextColor(213, 94, 80);
      }
      doc.text(`${sign}${t.amount.toFixed(2)}`, 178, y);
      doc.setTextColor(80, 80, 80);
      
      y += 6;
    });
  }
  
  // Footer page 3/final
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(cleanPolishChars(`Strona ${currentPage} (Koniec raportu). Wygenerowano automatycznie przez aplikacje Saldo.`), 14, 285);
  doc.text(cleanPolishChars(`Data generowania: ${new Date().toLocaleDateString('pl-PL')}`), 145, 285);
  
  // Save PDF
  doc.save(`Raport_Saldo_${monthName}_${year}.pdf`);
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
export function checkAndNotifyPayments(payments: any[]) {
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


export function generateCsvContent(transactions: any[]): string {
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
