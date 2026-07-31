import { jsPDF } from "jspdf";
import { Profile, AppLanguage } from "../types";
import { getMonthName, cleanPolishChars, expenseCategories } from "../utils";
export function generateReportPdf(profile: Profile, year: number, monthIndex: number, currency: string = 'PLN', lang?: AppLanguage) {
  const doc = new jsPDF();
  const monthName = getMonthName(monthIndex);
  
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
  doc.text(`${incomeTotal.toFixed(2)} ${currency}`, 80, 59);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(cleanPolishChars(`Wydatki razem:`), 20, 65);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(213, 94, 80); // Coral
  doc.text(`${expenseTotal.toFixed(2)} ${currency}`, 80, 65);
  
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
  doc.text(`${balance.toFixed(2)} ${currency}`, 122, 66);
  
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
    const textLabel = `${cat.spent.toFixed(2)} ${currency} (${percentText})`;
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
      const tagText = `#${t.name} (${t.count}x, ${t.sum.toFixed(0)} ${currency})`;
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
  doc.text(cleanPolishChars(`Data generowania: ${new Date().toLocaleDateString("pl-PL")}`), 145, 285);
  
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
      doc.text(`${b.amount.toFixed(2)} ${currency}`, 130, y);
      
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
      doc.text(`${g.saved.toFixed(2)} ${currency}`, 65, y);
      doc.text(`${g.target.toFixed(2)} ${currency}`, 105, y);
      
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
  doc.text(cleanPolishChars(`Data generowania: ${new Date().toLocaleDateString("pl-PL")}`), 145, 285);
  
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
        doc.text(cleanPolishChars(`Data generowania: ${new Date().toLocaleDateString("pl-PL")}`), 145, 285);
        
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
  doc.text(cleanPolishChars(`Data generowania: ${new Date().toLocaleDateString("pl-PL")}`), 145, 285);
  
  // Save PDF
  doc.save(`Raport_Saldo_${monthName}_${year}.pdf`);
}
