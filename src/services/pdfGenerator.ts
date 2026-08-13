import { jsPDF } from "jspdf";
import { Profile } from "../types";
import { getMonthName, cleanPolishChars, expenseCategories, iconByCategory } from "../utils";
import { formatMoney } from "../utils/format";

/**
 * Generuje elegancki, spójny wizualnie raport PDF dla aplikacji Saldo.
 */
export function generateReportPdf(
  profile: Profile,
  year: number,
  monthIndex: number,
  currency: string = "PLN"
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const monthName = getMonthName(monthIndex);
  const cleanStr = (text: string) => cleanPolishChars(text || "");

  // Paleta kolorów Saldo (spójna z UI aplikacji)
  const colors = {
    brandTeal: [19, 117, 102] as [number, number, number],
    brandDarkTeal: [15, 92, 80] as [number, number, number],
    darkInk: [15, 23, 42] as [number, number, number],
    bodyText: [51, 65, 85] as [number, number, number],
    mutedText: [100, 116, 139] as [number, number, number],
    surfaceLight: [248, 250, 252] as [number, number, number],
    borderLight: [226, 232, 240] as [number, number, number],
    incomeGreen: [16, 185, 129] as [number, number, number],
    incomeBg: [236, 253, 245] as [number, number, number],
    expenseCoral: [244, 63, 94] as [number, number, number],
    expenseBg: [254, 242, 242] as [number, number, number],
    tealSubtleBg: [230, 244, 241] as [number, number, number]
  };

  let y = 14;

  // --- TOP ACCENT BAR ---
  doc.setFillColor(...colors.brandTeal);
  doc.rect(0, 0, 210, 4, "F");

  // --- HEADER SECTION ---
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...colors.brandTeal);
  doc.text("SALDO", 14, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...colors.mutedText);
  doc.text(cleanStr("MIESIĘCZNY RAPORT FINANSOWY"), 14, y + 11);

  // Prawy blok informacyjny (Profil i Okres)
  const profileKindText = profile.kind === "shared" ? "Budżet wspólny" : "Budżet osobisty";
  const profileLabel = cleanStr(`Profil: ${profile.name} (${profileKindText})`);
  const periodLabel = cleanStr(`Okres: ${monthName} ${year}`);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...colors.darkInk);
  doc.text(profileLabel, 196 - doc.getTextWidth(profileLabel), y + 6);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colors.mutedText);
  doc.text(periodLabel, 196 - doc.getTextWidth(periodLabel), y + 11);

  y += 16;
  doc.setDrawColor(...colors.borderLight);
  doc.line(14, y, 196, y);
  y += 6;

  // --- KALKULACJE DANYCH ---
  const targetTransactions = (profile.transactions || []).filter((t) => {
    if (!t.isoDate) return false;
    const tDate = new Date(`${t.isoDate}T12:00:00`);
    return tDate.getFullYear() === year && tDate.getMonth() === monthIndex;
  });

  const incomeTotal = targetTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const expenseTotal = targetTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const balance = incomeTotal - expenseTotal;

  // --- KARTY PODSUMOWANIA FINANSOWEGO (3 KARTY) ---
  const cardWidth = 58;
  const cardHeight = 24;
  const gap = 4;

  // 1. Karta Przychody
  const x1 = 14;
  doc.setFillColor(...colors.incomeBg);
  doc.setDrawColor(167, 243, 208);
  doc.rect(x1, y, cardWidth, cardHeight, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(6, 95, 70);
  doc.text(cleanStr("PRZYCHODY RAZEM"), x1 + 4, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...colors.incomeGreen);
  doc.text(cleanStr(formatMoney(incomeTotal, currency)), x1 + 4, y + 16);

  // 2. Karta Wydatki
  const x2 = x1 + cardWidth + gap;
  doc.setFillColor(...colors.expenseBg);
  doc.setDrawColor(254, 202, 202);
  doc.rect(x2, y, cardWidth, cardHeight, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(153, 27, 27);
  doc.text(cleanStr("WYDATKI RAZEM"), x2 + 4, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...colors.expenseCoral);
  doc.text(cleanStr(formatMoney(expenseTotal, currency)), x2 + 4, y + 16);

  // 3. Karta Bilans
  const x3 = x2 + cardWidth + gap;
  doc.setFillColor(...colors.tealSubtleBg);
  doc.setDrawColor(153, 224, 212);
  doc.rect(x3, y, cardWidth, cardHeight, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 76, 67);
  doc.text(cleanStr("BILANS OKRESU"), x3 + 4, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  if (balance >= 0) {
    doc.setTextColor(...colors.brandTeal);
  } else {
    doc.setTextColor(...colors.expenseCoral);
  }
  const balancePrefix = balance > 0 ? "+" : "";
  doc.text(cleanStr(`${balancePrefix}${formatMoney(balance, currency)}`), x3 + 4, y + 16);

  y += cardHeight + 10;

  // --- SEKCJA 1: WYDATKI WEDŁUG KATEGORII ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr("WYDATKI WEDŁUG KATEGORII"), 14, y);
  y += 5;

  const categoryExpenses = expenseCategories.map((cat) => {
    const spent = targetTransactions
      .filter((t) => t.type === "expense" && t.category === cat)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    return { name: cat, spent, icon: iconByCategory[cat] || "•" };
  }).sort((a, b) => b.spent - a.spent);

  categoryExpenses.forEach((cat) => {
    const percent = expenseTotal > 0 ? cat.spent / expenseTotal : 0;
    const percentText = `${Math.round(percent * 100)}%`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.darkInk);
    doc.text(cleanStr(cat.name), 14, y + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.mutedText);
    const amountLabel = cleanStr(`${formatMoney(cat.spent, currency)} (${percentText})`);
    doc.text(amountLabel, 196 - doc.getTextWidth(amountLabel), y + 4);

    y += 5.5;

    // Tło paska
    doc.setFillColor(...colors.surfaceLight);
    doc.setDrawColor(...colors.borderLight);
    doc.rect(14, y, 182, 3, "FD");

    // Wypełnienie paska
    if (percent > 0) {
      doc.setFillColor(...colors.brandTeal);
      doc.rect(14, y, Math.max(2, 182 * percent), 3, "F");
    }

    y += 7.5;
  });

  y += 3;

  // --- SEKCJA 2: UŻYTE TAGI ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr("ANALIZA TAGÓW W TYM OKRESIE"), 14, y);
  y += 6;

  const tagMap: Record<string, { count: number; sum: number }> = {};
  targetTransactions.forEach((t) => {
    if (t.tags && Array.isArray(t.tags)) {
      t.tags.forEach((tag) => {
        const cleanTag = tag.trim().toLowerCase();
        if (cleanTag) {
          if (!tagMap[cleanTag]) {
            tagMap[cleanTag] = { count: 0, sum: 0 };
          }
          tagMap[cleanTag].count += 1;
          tagMap[cleanTag].sum += Number(t.amount) || 0;
        }
      });
    }
  });

  const tagsList = Object.entries(tagMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);

  if (tagsList.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.mutedText);
    doc.text(cleanStr("Brak przypisanych tagów w transakcjach z tego miesiąca."), 14, y + 2);
    y += 8;
  } else {
    let x = 14;
    doc.setFontSize(8);
    tagsList.forEach((t) => {
      const tagText = cleanStr(`#${t.name} (${t.count}x, ${formatMoney(t.sum, currency)})`);
      const textWidth = doc.getTextWidth(tagText);
      const pillWidth = textWidth + 6;
      const pillHeight = 5.5;

      if (x + pillWidth > 196) {
        x = 14;
        y += 7;
      }

      if (y > 270) {
        doc.addPage();
        y = 20;
        x = 14;
      }

      doc.setFillColor(...colors.tealSubtleBg);
      doc.setDrawColor(153, 224, 212);
      doc.rect(x, y - 4, pillWidth, pillHeight, "FD");

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.brandTeal);
      doc.text(tagText, x + 3, y);

      x += pillWidth + 3.5;
    });
    y += 8;
  }

  y += 4;

  // --- SEKCJA 3: RACHUNKI I PŁATNOŚCI ---
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr("STAN OPŁAT I RACHUNKÓW"), 14, y);
  y += 6;

  // Nagłówek tabeli rachunków
  doc.setFillColor(...colors.brandTeal);
  doc.rect(14, y, 182, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(cleanStr("Nazwa rachunku"), 18, y + 4.2);
  doc.text(cleanStr("Termin płatności"), 85, y + 4.2);
  doc.text(cleanStr("Kwota"), 135, y + 4.2);
  doc.text(cleanStr("Status"), 168, y + 4.2);

  y += 6;

  const payments = profile.payments || [];
  if (payments.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.mutedText);
    doc.text(cleanStr("Brak zdefiniowanych opłat i rachunków."), 18, y + 5);
    y += 10;
  } else {
    payments.forEach((p, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(...colors.surfaceLight);
        doc.rect(14, y, 182, 6, "F");
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...colors.bodyText);
      doc.text(cleanStr(p.name.length > 35 ? p.name.slice(0, 32) + "..." : p.name), 18, y + 4.2);
      doc.text(cleanStr(p.dueDate || "-"), 85, y + 4.2);
      doc.text(cleanStr(formatMoney(p.amount, currency)), 135, y + 4.2);

      const isPaid = p.status === "Opłacono";
      if (isPaid) {
        doc.setFillColor(...colors.incomeBg);
        doc.setDrawColor(167, 243, 208);
        doc.rect(166, y + 1, 24, 4.2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.incomeGreen);
        doc.text(cleanStr("Opłacono"), 169, y + 4);
      } else {
        doc.setFillColor(...colors.expenseBg);
        doc.setDrawColor(254, 202, 202);
        doc.rect(166, y + 1, 24, 4.2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...colors.expenseCoral);
        doc.text(cleanStr("Do opłacenia"), 167, y + 4);
      }

      y += 6;
    });
    y += 4;
  }

  y += 4;

  // --- SEKCJA 4: CELE OSZCZĘDNOŚCIOWE ---
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr("CELE OSZCZĘDNOŚCIOWE"), 14, y);
  y += 6;

  const goals = profile.goals || [];
  if (goals.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.mutedText);
    doc.text(cleanStr("Brak zdefiniowanych celów oszczędnościowych."), 14, y + 2);
    y += 10;
  } else {
    goals.forEach((g) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const ratio = g.target > 0 ? Math.min(1, g.saved / g.target) : 0;
      const percentText = `${Math.round(ratio * 100)}%`;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...colors.darkInk);
      doc.text(cleanStr(g.name), 14, y + 4);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...colors.mutedText);
      const goalProgressText = cleanStr(`${formatMoney(g.saved, currency)} / ${formatMoney(g.target, currency)} (${percentText})`);
      doc.text(goalProgressText, 196 - doc.getTextWidth(goalProgressText), y + 4);

      y += 5.5;

      doc.setFillColor(...colors.surfaceLight);
      doc.setDrawColor(...colors.borderLight);
      doc.rect(14, y, 182, 3, "FD");

      if (ratio > 0) {
        doc.setFillColor(...colors.brandTeal);
        doc.rect(14, y, Math.max(2, 182 * ratio), 3, "F");
      }

      y += 7.5;
    });
    y += 4;
  }

  // --- SEKCJA 5: PEŁNA HISTORIA TRANSAKCJI ---
  doc.addPage();
  y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...colors.brandTeal);
  doc.text(cleanStr("HISTORIA TRANSAKCJI"), 14, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...colors.mutedText);
  doc.text(cleanStr("Wszystkie wpłaty i wypłaty w wybranym okresie rozliczeniowym."), 14, y + 5);

  y += 9;

  // Nagłówek tabeli transakcji
  doc.setFillColor(...colors.brandTeal);
  doc.rect(14, y, 182, 6.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(cleanStr("Data"), 17, y + 4.5);
  doc.text(cleanStr("Nazwa transakcji"), 42, y + 4.5);
  doc.text(cleanStr("Kategoria"), 112, y + 4.5);
  doc.text(cleanStr("Konto"), 152, y + 4.5);
  doc.text(cleanStr("Kwota"), 178, y + 4.5);

  y += 6.5;

  if (targetTransactions.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.mutedText);
    doc.text(cleanStr("Brak zarejestrowanych transakcji w tym okresie rozliczeniowym."), 17, y + 6);
  } else {
    const sortedTxs = [...targetTransactions].sort((a, b) => (b.isoDate || "").localeCompare(a.isoDate || ""));

    sortedTxs.forEach((t, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;

        // Powtórzenie nagłówka tabeli na nowej stronie
        doc.setFillColor(...colors.brandTeal);
        doc.rect(14, y, 182, 6.5, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(cleanStr("Data"), 17, y + 4.5);
        doc.text(cleanStr("Nazwa transakcji"), 42, y + 4.5);
        doc.text(cleanStr("Kategoria"), 112, y + 4.5);
        doc.text(cleanStr("Konto"), 152, y + 4.5);
        doc.text(cleanStr("Kwota"), 178, y + 4.5);

        y += 6.5;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(...colors.surfaceLight);
        doc.rect(14, y, 182, 6, "F");
      }

      const isIncome = t.type === "income";
      const sign = isIncome ? "+" : "-";
      let txName = t.name || "";
      if (t.tags && t.tags.length > 0) {
        txName += ` [#${t.tags.join(", #")}]`;
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...colors.bodyText);
      doc.text(cleanStr(t.isoDate || "-"), 17, y + 4.2);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.darkInk);
      doc.text(cleanStr(txName.length > 34 ? txName.slice(0, 32) + "..." : txName), 42, y + 4.2);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colors.mutedText);
      doc.text(cleanStr(t.category.length > 20 ? t.category.slice(0, 18) + "..." : t.category), 112, y + 4.2);
      doc.text(cleanStr(t.account.length > 14 ? t.account.slice(0, 12) + "..." : t.account), 152, y + 4.2);

      doc.setFont("helvetica", "bold");
      if (isIncome) {
        doc.setTextColor(...colors.incomeGreen);
      } else {
        doc.setTextColor(...colors.expenseCoral);
      }
      doc.text(cleanStr(`${sign}${formatMoney(t.amount, currency)}`), 178, y + 4.2);

      y += 6;
    });
  }

  // --- DYNAMICZNE STOPKI DLA WSZYSTKICH STRON ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...colors.borderLight);
    doc.line(14, 282, 196, 282);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...colors.mutedText);

    const footerLeft = cleanStr(`Saldo - Twój Budżet Domowy | Profil: ${profile.name}`);
    const footerRight = cleanStr(`Strona ${i} z ${totalPages}`);

    doc.text(footerLeft, 14, 287);
    doc.text(footerRight, 196 - doc.getTextWidth(footerRight), 287);
  }

  // Zapis pliku PDF z bezpieczną nazwą
  const safeMonthName = cleanStr(monthName).replace(/\s+/g, "_");
  doc.save(`Raport_Saldo_${safeMonthName}_${year}.pdf`);
}
