import { jsPDF } from "jspdf";
import { Profile, DebtItem } from "../types";
import { getMonthName, expenseCategories, iconByCategory, cleanPolishChars } from "../utils";
import { formatMoney } from "../utils/format";
import {
  calculate503020,
  calculateRollingTrends,
  calculateEmergencySimulator,
  calculateDebtPayoffSimulator
} from "./budgetCalculations";

/**
 * Generuje elegancki, spójny wizualnie raport PDF dla aplikacji Saldo.
 */
export function generateReportPdf(
  profile: Profile,
  year: number,
  monthIndex: number,
  currency: string = "PLN",
  options?: { returnBlob?: boolean }
): Blob | void {
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

  // --- SEKCJA ANALITYCZNA A: WZORZEC BUDŻETOWY 50/30/20 ---
  const selectedDate = new Date(year, monthIndex, 15);
  const breakdown503020 = calculate503020(profile.transactions, selectedDate);
  const hasExpenseData = expenseTotal > 0;
  const cardGap = 4;

  if (hasExpenseData) {

  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr("WZORZEC BUDZETOWY 50 / 30 / 20"), 14, y);
  y += 6;

  const ruleCardW = 58;
  const ruleCardH = 20;

  const rules503020 = [
    { label: "POTRZEBY (50%)", pct: breakdown503020.needs.percentage, amount: breakdown503020.needs.amount, target: 50, color: colors.incomeGreen, bg: colors.incomeBg, border: [167, 243, 208] as [number, number, number] },
    { label: "ZACHCIANKI (30%)", pct: breakdown503020.wants.percentage, amount: breakdown503020.wants.amount, target: 30, color: [99, 102, 241] as [number, number, number], bg: [238, 242, 255] as [number, number, number], border: [199, 210, 254] as [number, number, number] },
    { label: "OSZCZEDNOSCI (20%)", pct: breakdown503020.savings.percentage, amount: breakdown503020.savings.amount, target: 20, color: [168, 85, 247] as [number, number, number], bg: [243, 232, 255] as [number, number, number], border: [216, 180, 254] as [number, number, number] }
  ];

  rules503020.forEach((rule, idx) => {
    const rx = 14 + idx * (ruleCardW + cardGap);

    doc.setFillColor(...rule.bg);
    doc.setDrawColor(...rule.border);
    doc.rect(rx, y, ruleCardW, ruleCardH, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...colors.mutedText);
    doc.text(cleanStr(rule.label), rx + 3, y + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...rule.color);
    doc.text(`${rule.pct}%`, rx + 3, y + 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...colors.mutedText);
    doc.text(cleanStr(formatMoney(rule.amount, currency)), rx + 3, y + 17.5);
  });

  y += ruleCardH + 4;

  // Insight tekstowy
  const overBudgetRules = rules503020.filter(r => r.pct > r.target + 10);
  if (overBudgetRules.length > 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...colors.mutedText);
    doc.text(cleanStr(`Uwaga: ${overBudgetRules.map(r => r.label.split(" (")[0]).join(", ")} przekracza zalecany udzial procentowy.`), 14, y);
    y += 6;
  }

  y += 4;

  } // end: hasExpenseData (50/30/20)

  // --- SEKCJA ANALITYCZNA B: TRENDY WIELOMIESIECZNE & STEROWNIKI ---
  const rollingTrends = calculateRollingTrends(profile.transactions, selectedDate);
  const hasTrendData = rollingTrends.avg3MonthExpense > 0 || rollingTrends.lastMonthExpense > 0;

  if (hasTrendData) {

  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr("TRENDY WIELOMIESIECZNE I STEROWNIKI KOSZTOW"), 14, y);
  y += 6;

  // 2 karty obok siebie: Średnia 3M + Zmiana MoM
  const trendCardW = 89;
  const trendCardH = 18;

  // Karta: Średnia krocząca 3M
  doc.setFillColor(...colors.surfaceLight);
  doc.setDrawColor(...colors.borderLight);
  doc.rect(14, y, trendCardW, trendCardH, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...colors.mutedText);
  doc.text(cleanStr("SREDNIA KROCZACA (3M)"), 17, y + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr(formatMoney(rollingTrends.avg3MonthExpense, currency)), 17, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const avg3Color = rollingTrends.diffVs3MAvg > 0 ? colors.expenseCoral : colors.incomeGreen;
  doc.setTextColor(...avg3Color);
  const avg3Sign = rollingTrends.diffVs3MAvg > 0 ? "+" : "";
  doc.text(`${avg3Sign}${rollingTrends.diffVs3MAvg}% vs srednia`, 17, y + 16);

  // Karta: Zmiana MoM
  const trendX2 = 14 + trendCardW + cardGap;
  doc.setFillColor(...colors.surfaceLight);
  doc.setDrawColor(...colors.borderLight);
  doc.rect(trendX2, y, trendCardW, trendCardH, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...colors.mutedText);
  doc.text(cleanStr("WYDATKI ZESZLY MIESIAC"), trendX2 + 3, y + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr(formatMoney(rollingTrends.lastMonthExpense, currency)), trendX2 + 3, y + 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const momColor = rollingTrends.diffVsLastMonth > 0 ? colors.expenseCoral : colors.incomeGreen;
  doc.setTextColor(...momColor);
  const momSign = rollingTrends.diffVsLastMonth > 0 ? "+" : "";
  doc.text(`${momSign}${rollingTrends.diffVsLastMonth}% MoM`, trendX2 + 3, y + 16);

  y += trendCardH + 4;

  // Sterowniki kosztów
  if (rollingTrends.topGrowthCategory || rollingTrends.topReductionCategory) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...colors.mutedText);
    doc.text(cleanStr("GLOWNE STEROWNIKI ZMIAN (vs poprzedni mc)"), 14, y + 3);
    y += 7;

    if (rollingTrends.topGrowthCategory) {
      doc.setFillColor(...colors.expenseBg);
      doc.setDrawColor(254, 202, 202);
      doc.rect(14, y, 89, 10, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...colors.expenseCoral);
      doc.text(cleanStr(`Wzrost: ${rollingTrends.topGrowthCategory.category}`), 17, y + 4.5);
      doc.text(cleanStr(`+${formatMoney(rollingTrends.topGrowthCategory.diffAmount, currency)}`), 17, y + 8.5);
    }

    if (rollingTrends.topReductionCategory) {
      doc.setFillColor(...colors.incomeBg);
      doc.setDrawColor(167, 243, 208);
      doc.rect(107, y, 89, 10, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...colors.incomeGreen);
      doc.text(cleanStr(`Oszczednosc: ${rollingTrends.topReductionCategory.category}`), 110, y + 4.5);
      doc.text(cleanStr(`${formatMoney(rollingTrends.topReductionCategory.diffAmount, currency)}`), 110, y + 8.5);
    }

    y += 14;
  }

  y += 4;

  } // end: hasTrendData (Trendy)

  // --- SEKCJA ANALITYCZNA C: PODSUMOWANIE STRATEGICZNE ---
  const emergencySim = calculateEmergencySimulator(profile, selectedDate, 6);
  const debtSim = calculateDebtPayoffSimulator(profile, selectedDate, 300);
  const hasStrategicData = hasExpenseData || !debtSim.isDebtFree;

  if (hasStrategicData) {

  if (y > 210) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr("PODSUMOWANIE STRATEGICZNE"), 14, y);
  y += 6;

  // Karta: Poduszka bezpieczeństwa (6M)
  doc.setFillColor(...colors.tealSubtleBg);
  doc.setDrawColor(153, 224, 212);
  doc.rect(14, y, 89, 24, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...colors.brandDarkTeal);
  doc.text(cleanStr("PODUSZKA BEZPIECZENSTWA (6M)"), 17, y + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr(`Wymagane: ${formatMoney(emergencySim.requiredCapital, currency)}`), 17, y + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...colors.brandTeal);
  doc.text(cleanStr(`Rezerwy: ${formatMoney(emergencySim.currentLiquidCapital, currency)} (${emergencySim.progressPercent}%)`), 17, y + 16);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(...colors.mutedText);
  if (emergencySim.status === "completed") {
    doc.text(cleanStr("Cel osiagniety!"), 17, y + 21);
  } else if (emergencySim.monthsToTarget !== null) {
    doc.text(cleanStr(`Do celu: ok. ${emergencySim.monthsToTarget} mies.`), 17, y + 21);
  } else {
    doc.text(cleanStr("Brak nadwyzki do oszczedzania"), 17, y + 21);
  }

  // Karta: Spłata zobowiązań
  doc.setFillColor(...colors.surfaceLight);
  doc.setDrawColor(...colors.borderLight);
  doc.rect(107, y, 89, 24, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...colors.mutedText);
  doc.text(cleanStr("SPLATA ZOBOWIAZAN (SNOWBALL)"), 110, y + 5);

  if (debtSim.isDebtFree) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colors.incomeGreen);
    doc.text(cleanStr("Brak aktywnych zobowiazan"), 110, y + 12);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...colors.mutedText);
    doc.text(cleanStr("Wszystkie rachunki oplacone."), 110, y + 17);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...colors.expenseCoral);
    doc.text(cleanStr(`Laczny dlug: ${formatMoney(debtSim.totalDebt, currency)}`), 110, y + 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colors.darkInk);
    doc.text(cleanStr(`Plan bazowy: ${debtSim.baselineMonths} mc`), 110, y + 16);

    // Snowball queue preview (top 3)
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...colors.mutedText);
    const topQueue = debtSim.snowballQueue.slice(0, 3).map((q, i) => `${i + 1}. ${q.name}`).join(", ");
    const queueText = topQueue.length > 45 ? topQueue.slice(0, 42) + "..." : topQueue;
    doc.text(cleanStr(queueText || "Brak pozycji"), 110, y + 21);
  }

  y += 28;

  // Insight podsumowujący
  if (!debtSim.isDebtFree && debtSim.baselineMonths && debtSim.baselineMonths > 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...colors.brandTeal);
    doc.text(cleanStr(`Wnioski: Przy obecnym tempie splata zobowiazan zajmie ok. ${debtSim.baselineMonths} mies. Nadplata +300 ${currency}/mc skroci czas do ${debtSim.acceleratedMonths} mies.`), 14, y);
    y += 6;
  }

  y += 6;

  } // end: hasStrategicData (Podsumowanie strategiczne)

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
  const filename = `Raport_Saldo_${safeMonthName}_${year}.pdf`;
  if (options?.returnBlob) {
    return doc.output("blob");
  }
  doc.save(filename);
}

/**
 * Generuje roczne podsumowanie finansowe PDF dla aplikacji Saldo.
 */
export function generateAnnualReportPdf(
  profile: Profile,
  year: number,
  currency: string = "PLN",
  options?: { returnBlob?: boolean }
): Blob | void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const cleanStr = (text: string) => cleanPolishChars(text || "");

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
    tealSubtleBg: [230, 244, 241] as [number, number, number],
    cardBg: [241, 245, 249] as [number, number, number]
  };

  // --- STRONA 1: PODSUMOWANIE ROCZNE I MIESIĄC PO MIESIĄCU ---
  let y = 14;

  // Top accent bar
  doc.setFillColor(...colors.brandTeal);
  doc.rect(0, 0, 210, 4, "F");

  // Header
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...colors.brandTeal);
  doc.text("SALDO", 14, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...colors.mutedText);
  doc.text(cleanStr("ROCZNE PODSUMOWANIE FINANSOWE"), 14, y + 11);

  const profileKindText = profile.kind === "shared" ? "Budżet wspólny" : "Budżet osobisty";
  const profileLabel = cleanStr(`Profil: ${profile.name} (${profileKindText})`);
  const periodLabel = cleanStr(`Rok obrachunkowy: ${year}`);

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

  // --- OBLICZENIA DLA ROKU ---
  const allYearTransactions = (profile.transactions || []).filter((t) => {
    if (!t.isoDate) return false;
    const tDate = new Date(`${t.isoDate}T12:00:00`);
    return tDate.getFullYear() === year;
  });

  const monthsData = Array.from({ length: 12 }, (_, m) => {
    const monthTxs = allYearTransactions.filter((t) => {
      const tDate = new Date(`${t.isoDate}T12:00:00`);
      return tDate.getMonth() === m;
    });
    const inc = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const exp = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const bal = inc - exp;
    const rate = inc > 0 ? ((inc - exp) / inc) * 100 : 0;
    return {
      monthIndex: m,
      monthName: getMonthName(m),
      income: inc,
      expense: exp,
      balance: bal,
      savingsRate: rate
    };
  });

  const totalIncome = monthsData.reduce((s, m) => s + m.income, 0);
  const totalExpense = monthsData.reduce((s, m) => s + m.expense, 0);
  const totalBalance = totalIncome - totalExpense;
  const overallSavingsRate = totalIncome > 0 ? (totalBalance / totalIncome) * 100 : 0;

  // --- 4 KARTY KPI ---
  const cardW = 43;
  const cardH = 22;
  const gap = 3.3;

  // 1. Przychody
  let cx = 14;
  doc.setFillColor(...colors.incomeBg);
  doc.setDrawColor(167, 243, 208);
  doc.rect(cx, y, cardW, cardH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(6, 95, 70);
  doc.text(cleanStr("PRZYCHODY ROCZNE"), cx + 3, y + 5.5);
  doc.setFontSize(11);
  doc.setTextColor(...colors.incomeGreen);
  doc.text(cleanStr(formatMoney(totalIncome, currency)), cx + 3, y + 15);

  // 2. Wydatki
  cx += cardW + gap;
  doc.setFillColor(...colors.expenseBg);
  doc.setDrawColor(254, 202, 202);
  doc.rect(cx, y, cardW, cardH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(153, 27, 27);
  doc.text(cleanStr("WYDATKI ROCZNE"), cx + 3, y + 5.5);
  doc.setFontSize(11);
  doc.setTextColor(...colors.expenseCoral);
  doc.text(cleanStr(formatMoney(totalExpense, currency)), cx + 3, y + 15);

  // 3. Bilans
  cx += cardW + gap;
  const isPositive = totalBalance >= 0;
  doc.setFillColor(...(isPositive ? colors.tealSubtleBg : colors.expenseBg));
  doc.setDrawColor(...(isPositive ? [167, 243, 208] as [number, number, number] : [254, 202, 202] as [number, number, number]));
  doc.rect(cx, y, cardW, cardH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...(isPositive ? ([15, 92, 80] as [number, number, number]) : ([153, 27, 27] as [number, number, number])));
  doc.text(cleanStr("OSZCZĘDNOŚCI NETTO"), cx + 3, y + 5.5);
  doc.setFontSize(11);
  doc.setTextColor(...(isPositive ? colors.brandDarkTeal : colors.expenseCoral));
  doc.text(cleanStr(formatMoney(totalBalance, currency)), cx + 3, y + 15);

  // 4. Stopa oszczędności
  cx += cardW + gap;
  doc.setFillColor(...colors.cardBg);
  doc.setDrawColor(...colors.borderLight);
  doc.rect(cx, y, cardW, cardH, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...colors.mutedText);
  doc.text(cleanStr("STOPA OSZCZĘDNOŚCI"), cx + 3, y + 5.5);
  doc.setFontSize(11);
  doc.setTextColor(...colors.darkInk);
  doc.text(`${overallSavingsRate.toFixed(1)}%`, cx + 3, y + 15);

  y += cardH + 10;

  // --- TABELA MIESIĘCZNA ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr("Zestawienie miesiąc po miesiącu"), 14, y);
  y += 5;

  // Nagłówek tabeli
  doc.setFillColor(...colors.brandTeal);
  doc.rect(14, y, 182, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(cleanStr("Miesiąc"), 17, y + 4.8);
  doc.text(cleanStr("Przychody"), 72, y + 4.8);
  doc.text(cleanStr("Wydatki"), 107, y + 4.8);
  doc.text(cleanStr("Bilans"), 142, y + 4.8);
  doc.text(cleanStr("Stopa oszcz."), 175, y + 4.8);

  y += 7;

  monthsData.forEach((m, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(...colors.surfaceLight);
      doc.rect(14, y, 182, 6, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colors.bodyText);
    doc.text(cleanStr(m.monthName), 17, y + 4.2);

    doc.setTextColor(...colors.incomeGreen);
    doc.text(cleanStr(formatMoney(m.income, currency)), 72, y + 4.2);

    doc.setTextColor(...colors.expenseCoral);
    doc.text(cleanStr(formatMoney(m.expense, currency)), 107, y + 4.2);

    doc.setFont("helvetica", "bold");
    if (m.balance >= 0) {
      doc.setTextColor(...colors.incomeGreen);
    } else {
      doc.setTextColor(...colors.expenseCoral);
    }
    doc.text(cleanStr(formatMoney(m.balance, currency)), 142, y + 4.2);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.darkInk);
    doc.text(`${m.savingsRate.toFixed(1)}%`, 175, y + 4.2);

    y += 6;
  });

  // Wiersz podsumowania
  doc.setFillColor(...colors.tealSubtleBg);
  doc.rect(14, y, 182, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr("RAZEM (ROK)"), 17, y + 4.8);

  doc.setTextColor(...colors.incomeGreen);
  doc.text(cleanStr(formatMoney(totalIncome, currency)), 72, y + 4.8);

  doc.setTextColor(...colors.expenseCoral);
  doc.text(cleanStr(formatMoney(totalExpense, currency)), 107, y + 4.8);

  if (totalBalance >= 0) {
    doc.setTextColor(...colors.incomeGreen);
  } else {
    doc.setTextColor(...colors.expenseCoral);
  }
  doc.text(cleanStr(formatMoney(totalBalance, currency)), 142, y + 4.8);

  doc.setTextColor(...colors.darkInk);
  doc.text(`${overallSavingsRate.toFixed(1)}%`, 175, y + 4.8);

  // --- STRONA 2: KATEGORIE WYDATKÓW ---
  doc.addPage();
  y = 14;

  doc.setFillColor(...colors.brandTeal);
  doc.rect(0, 0, 210, 4, "F");
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...colors.brandTeal);
  doc.text(cleanStr("Kategorie wydatków i alokacja roczna"), 14, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...colors.mutedText);
  doc.text(cleanStr(`Szczegółowy rozkład wydatków profilu ${profile.name} za rok ${year}`), 14, y + 11);

  y += 16;
  doc.setDrawColor(...colors.borderLight);
  doc.line(14, y, 196, y);
  y += 6;

  // Obliczenie kategorii wydatków
  const expenseTxs = allYearTransactions.filter((t) => t.type === "expense");
  const categoryMap = new Map<string, number>();
  expenseTxs.forEach((t) => {
    const cat = t.category || "Inne";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + (Number(t.amount) || 0));
  });

  const sortedCategories = Array.from(categoryMap.entries())
    .map(([cat, amount]) => ({
      category: cat,
      amount,
      percent: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      monthlyAvg: amount / 12
    }))
    .sort((a, b) => b.amount - a.amount);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr(`Wszystkie kategorie wydatków (${sortedCategories.length})`), 14, y);
  y += 5;

  // Nagłówek tabeli kategorii
  doc.setFillColor(...colors.brandTeal);
  doc.rect(14, y, 182, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(cleanStr("Kategoria"), 17, y + 4.8);
  doc.text(cleanStr("Kwota roczna"), 90, y + 4.8);
  doc.text(cleanStr("Udział (%)"), 130, y + 4.8);
  doc.text(cleanStr("Śr. miesięczna"), 165, y + 4.8);

  y += 7;

  if (sortedCategories.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.mutedText);
    doc.text(cleanStr("Brak zarejestrowanych wydatków w tym roku."), 17, y + 6);
    y += 12;
  } else {
    sortedCategories.forEach((cat, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        doc.setFillColor(...colors.brandTeal);
        doc.rect(14, y, 182, 7, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(cleanStr("Kategoria"), 17, y + 4.8);
        doc.text(cleanStr("Kwota roczna"), 90, y + 4.8);
        doc.text(cleanStr("Udział (%)"), 130, y + 4.8);
        doc.text(cleanStr("Śr. miesięczna"), 165, y + 4.8);
        y += 7;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(...colors.surfaceLight);
        doc.rect(14, y, 182, 6, "F");
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...colors.darkInk);
      doc.text(cleanStr(cat.category), 17, y + 4.2);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...colors.expenseCoral);
      doc.text(cleanStr(formatMoney(cat.amount, currency)), 90, y + 4.2);

      doc.setTextColor(...colors.darkInk);
      doc.text(`${cat.percent.toFixed(1)}%`, 130, y + 4.2);

      doc.setTextColor(...colors.mutedText);
      doc.text(cleanStr(formatMoney(cat.monthlyAvg, currency)), 165, y + 4.2);

      y += 6;
    });
  }

  // --- STRONA 3: MAJĄTEK, CELE I ZOBOWIĄZANIA ---
  doc.addPage();
  y = 14;

  doc.setFillColor(...colors.brandTeal);
  doc.rect(0, 0, 210, 4, "F");
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...colors.brandTeal);
  doc.text(cleanStr("Majątek, cele oszczędnościowe i zobowiązania"), 14, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...colors.mutedText);
  doc.text(cleanStr(`Stan majątku i postępy na koniec roku ${year}`), 14, y + 11);

  y += 16;
  doc.setDrawColor(...colors.borderLight);
  doc.line(14, y, 196, y);
  y += 6;

  // 1. Konta
  const accounts = profile.accounts || [];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr(`Rachunki i portfele (${accounts.length})`), 14, y);
  y += 5;

  doc.setFillColor(...colors.brandTeal);
  doc.rect(14, y, 182, 6.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(cleanStr("Nazwa rachunku"), 17, y + 4.5);
  doc.text(cleanStr("Typ"), 95, y + 4.5);
  doc.text(cleanStr("Saldo bieżące"), 150, y + 4.5);
  y += 6.5;

  if (accounts.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colors.mutedText);
    doc.text(cleanStr("Brak skonfigurowanych kont."), 17, y + 4.5);
    y += 8;
  } else {
    accounts.forEach((acc, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(...colors.surfaceLight);
        doc.rect(14, y, 182, 6, "F");
      }
      const accBalance = (profile.transactions || [])
        .filter((t) => t.account === acc.name)
        .reduce((sum, t) => sum + (t.type === "income" ? Number(t.amount) || 0 : -(Number(t.amount) || 0)), 0);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...colors.darkInk);
      doc.text(cleanStr(acc.name), 17, y + 4.2);
      doc.setTextColor(...colors.mutedText);
      doc.text(cleanStr(acc.bankName || "Rachunek"), 95, y + 4.2);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...(accBalance >= 0 ? colors.brandDarkTeal : colors.expenseCoral));
      doc.text(cleanStr(formatMoney(accBalance, currency)), 150, y + 4.2);
      y += 6;
    });
  }

  y += 6;

  // 2. Cele oszczędnościowe
  const goals = profile.goals || [];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr(`Cele oszczędnościowe (${goals.length})`), 14, y);
  y += 5;

  doc.setFillColor(...colors.brandTeal);
  doc.rect(14, y, 182, 6.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(cleanStr("Cel"), 17, y + 4.5);
  doc.text(cleanStr("Zebrano"), 85, y + 4.5);
  doc.text(cleanStr("Cel kwotowy"), 125, y + 4.5);
  doc.text(cleanStr("Postęp"), 165, y + 4.5);
  y += 6.5;

  if (goals.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colors.mutedText);
    doc.text(cleanStr("Brak zdefiniowanych celów."), 17, y + 4.5);
    y += 8;
  } else {
    goals.forEach((g, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(...colors.surfaceLight);
        doc.rect(14, y, 182, 6, "F");
      }
      const progress = g.target > 0 ? (g.saved / g.target) * 100 : 0;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...colors.darkInk);
      doc.text(cleanStr(g.name), 17, y + 4.2);
      doc.setTextColor(...colors.incomeGreen);
      doc.text(cleanStr(formatMoney(g.saved, currency)), 85, y + 4.2);
      doc.setTextColor(...colors.mutedText);
      doc.text(cleanStr(formatMoney(g.target, currency)), 125, y + 4.2);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.darkInk);
      doc.text(`${progress.toFixed(1)}%`, 165, y + 4.2);
      y += 6;
    });
  }

  y += 6;

  // 3. Kredyty i zobowiązania
  const debts = profile.debts || [];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr(`Zobowiązania kredytowe (${debts.length})`), 14, y);
  y += 5;

  doc.setFillColor(...colors.brandTeal);
  doc.rect(14, y, 182, 6.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(cleanStr("Kredyt / Pożyczka"), 17, y + 4.5);
  doc.text(cleanStr("Do spłaty"), 85, y + 4.5);
  doc.text(cleanStr("Oprocentowanie"), 130, y + 4.5);
  doc.text(cleanStr("Rata"), 165, y + 4.5);
  y += 6.5;

  if (debts.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colors.mutedText);
    doc.text(cleanStr("Brak aktywnych zobowiązań kredytowych."), 17, y + 4.5);
    y += 8;
  } else {
    debts.forEach((d, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(...colors.surfaceLight);
        doc.rect(14, y, 182, 6, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...colors.darkInk);
      doc.text(cleanStr(d.name), 17, y + 4.2);
      doc.setTextColor(...colors.expenseCoral);
      doc.text(cleanStr(formatMoney(d.balance, currency)), 85, y + 4.2);
      doc.setTextColor(...colors.mutedText);
      doc.text(`${d.interestRate}%`, 130, y + 4.2);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...colors.darkInk);
      doc.text(cleanStr(formatMoney(d.monthlyPayment, currency)), 165, y + 4.2);
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

    const footerLeft = cleanStr(`Saldo - Roczne Podsumowanie Finansowe | Profil: ${profile.name} | Rok: ${year}`);
    const footerRight = cleanStr(`Strona ${i} z ${totalPages}`);

    doc.text(footerLeft, 14, 287);
    doc.text(footerRight, 196 - doc.getTextWidth(footerRight), 287);
  }

  // Zapis pliku PDF z bezpieczną nazwą
  const filename = `Roczne_Podsumowanie_Saldo_${year}.pdf`;
  if (options?.returnBlob) {
    return doc.output("blob");
  }
  doc.save(filename);
}

/**
 * Generuje profesjonalny raport analityczny kredytu hipotecznego Mortgage Pro (PDF).
 */
export function generateMortgageReportPdf(
  debt: DebtItem,
  currency: string = "PLN",
  options?: { returnBlob?: boolean }
): Blob | void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const cleanStr = (text: string) => cleanPolishChars(text || "");

  const colors = {
    brandTeal: [19, 117, 102] as [number, number, number],
    brandDarkTeal: [15, 92, 80] as [number, number, number],
    darkInk: [15, 23, 42] as [number, number, number],
    mutedText: [100, 116, 139] as [number, number, number],
    surfaceLight: [248, 250, 252] as [number, number, number],
    borderLight: [226, 232, 240] as [number, number, number],
    incomeGreen: [16, 185, 129] as [number, number, number],
    expenseCoral: [244, 63, 94] as [number, number, number],
    tealSubtleBg: [230, 244, 241] as [number, number, number]
  };

  let y = 14;

  // --- TOP ACCENT BAR ---
  doc.setFillColor(...colors.brandTeal);
  doc.rect(0, 0, 210, 4, "F");

  // --- HEADER SECTION ---
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...colors.brandTeal);
  doc.text("SALDO", 14, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...colors.mutedText);
  doc.text("Centrum Hipoteczne Mortgage Pro", 14, y + 11);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...colors.darkInk);
  const titleText = cleanStr("RAPORT ANALITYCZNY HIPOTEKI");
  doc.text(titleText, 196 - doc.getTextWidth(titleText), y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...colors.mutedText);
  const dateStr = cleanStr(`Wygenerowano: ${new Date().toLocaleDateString("pl-PL")}`);
  doc.text(dateStr, 196 - doc.getTextWidth(dateStr), y + 11);

  y += 18;
  doc.setDrawColor(...colors.borderLight);
  doc.line(14, y, 196, y);
  y += 6;

  // --- LOAN DETAILS HEADER STRIP ---
  doc.setFillColor(...colors.surfaceLight);
  doc.roundedRect(14, y, 182, 22, 2, 2, "F");
  doc.setDrawColor(...colors.borderLight);
  doc.roundedRect(14, y, 182, 22, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr(debt.name), 18, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...colors.mutedText);
  doc.text(cleanStr(`Instytucja: ${debt.institution || "Bank"} | Status: ${debt.status === "active" ? "Aktywny" : "Zamkniety"}`), 18, y + 13);
  doc.text(cleanStr(`Pozostaly okres: ${debt.remainingMonths || 240} miesiecy (${Math.round(((debt.remainingMonths || 240) / 12) * 10) / 10} lat)`), 18, y + 18);

  const balanceText = cleanStr(`Saldo: ${formatMoney(debt.balance, currency)}`);
  const rateText = cleanStr(`Oprocentowanie: ${debt.interestRate}%`);
  const paymentText = cleanStr(`Rata: ${formatMoney(debt.monthlyPayment, currency)}`);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...colors.brandDarkTeal);
  doc.text(balanceText, 192 - doc.getTextWidth(balanceText), y + 7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...colors.darkInk);
  doc.text(rateText, 192 - doc.getTextWidth(rateText), y + 13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.darkInk);
  doc.text(paymentText, 192 - doc.getTextWidth(paymentText), y + 18);

  y += 28;

  // --- METRICS GRID (2 CARDS) ---
  const ltv = debt.propertyValue && debt.propertyValue > 0
    ? Math.round((debt.balance / debt.propertyValue) * 1000) / 10
    : null;
  const ltvOverpayment80 = ltv && ltv > 80 && debt.propertyValue
    ? Math.max(0, Math.round(debt.balance - debt.propertyValue * 0.8))
    : 0;

  // Card 1: LTV
  doc.setFillColor(...colors.tealSubtleBg);
  doc.roundedRect(14, y, 88, 26, 2, 2, "F");
  doc.setDrawColor(...colors.borderLight);
  doc.roundedRect(14, y, 88, 26, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...colors.brandDarkTeal);
  doc.text(cleanStr("WSKAZNIK LTV (LOAN-TO-VALUE)"), 18, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...colors.darkInk);
  doc.text(ltv !== null ? `${ltv}%` : "Brak danych", 18, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...colors.mutedText);
  if (ltv !== null) {
    if (ltv <= 80) {
      doc.text(cleanStr("Bezpieczna strefa (ponizej 80% LTV)."), 18, y + 21);
    } else {
      doc.text(cleanStr(`Nadplac ${formatMoney(ltvOverpayment80, currency)} do progu 80% LTV.`), 18, y + 21);
    }
  } else {
    doc.text(cleanStr("Wymaga uzupelnienia wartosci nieruchomosci."), 18, y + 21);
  }

  // Card 2: KNF Stress Test (+250 pb — Rekomendacja S minimum since X 2022)
  const monthlyRate = (debt.interestRate + 2.5) / 100 / 12;
  const months = debt.remainingMonths || 240;
  const pow = Math.pow(1 + monthlyRate, months);
  const knfPayment = Math.round(((debt.balance * monthlyRate * pow) / (pow - 1)) * 100) / 100;
  const knfDiff = Math.max(0, Math.round((knfPayment - debt.monthlyPayment) * 100) / 100);

  doc.setFillColor(...colors.surfaceLight);
  doc.roundedRect(108, y, 88, 26, 2, 2, "F");
  doc.setDrawColor(...colors.borderLight);
  doc.roundedRect(108, y, 88, 26, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...colors.expenseCoral);
  doc.text(cleanStr("TEST ODPORNOSCI KNF (+2.50 P.P.)"), 112, y + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr(formatMoney(knfPayment, currency)), 112, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...colors.mutedText);
  doc.text(cleanStr(`Wzrost raty: +${formatMoney(knfDiff, currency)}/mc (+${formatMoney(knfDiff * 12, currency)}/rok)`), 112, y + 21);

  y += 32;

  // --- AMORTIZATION SCHEDULE PREVIEW ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...colors.darkInk);
  doc.text(cleanStr("HARMONOGRAM SPLATY (PIERWSZE 16 MIESIECY)"), 14, y);
  y += 5;

  doc.setFillColor(...colors.brandTeal);
  doc.rect(14, y, 182, 6.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(cleanStr("Miesiac"), 17, y + 4.5);
  doc.text(cleanStr("Rata laczna"), 50, y + 4.5);
  doc.text(cleanStr("Czesc kapitalowa"), 90, y + 4.5);
  doc.text(cleanStr("Czesc odsetkowa"), 135, y + 4.5);
  doc.text(cleanStr("Pozostaly kapital"), 165, y + 4.5);
  y += 6.5;

  let currentBal = debt.balance;
  const baseMonthlyRate = (debt.interestRate / 100) / 12;
  const previewMonths = Math.min(16, debt.remainingMonths || 240);

  for (let m = 1; m <= previewMonths; m++) {
    if (m % 2 === 0) {
      doc.setFillColor(...colors.surfaceLight);
      doc.rect(14, y, 182, 5.5, "F");
    }

    const interestPortion = Math.round(currentBal * baseMonthlyRate * 100) / 100;
    const principalPortion = Math.min(currentBal, Math.max(0, Math.round((debt.monthlyPayment - interestPortion) * 100) / 100));
    currentBal = Math.max(0, Math.round((currentBal - principalPortion) * 100) / 100);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...colors.darkInk);
    doc.text(cleanStr(`Miesiac ${m}`), 17, y + 3.8);
    doc.text(cleanStr(formatMoney(debt.monthlyPayment, currency)), 50, y + 3.8);
    doc.setTextColor(...colors.incomeGreen);
    doc.text(cleanStr(formatMoney(principalPortion, currency)), 90, y + 3.8);
    doc.setTextColor(...colors.expenseCoral);
    doc.text(cleanStr(formatMoney(interestPortion, currency)), 135, y + 3.8);
    doc.setTextColor(...colors.mutedText);
    doc.text(cleanStr(formatMoney(currentBal, currency)), 165, y + 3.8);

    y += 5.5;
  }

  // --- FOOTER ---
  doc.setDrawColor(...colors.borderLight);
  doc.line(14, 282, 196, 282);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...colors.mutedText);

  const footerLeft = cleanStr(`Saldo Mortgage Pro | Raport Kredytu: ${debt.name} (${debt.institution})`);
  const footerRight = cleanStr("Strona 1 z 1");

  doc.text(footerLeft, 14, 287);
  doc.text(footerRight, 196 - doc.getTextWidth(footerRight), 287);

  const filename = `Raport_Hipoteki_${cleanStr(debt.name).replace(/\s+/g, "_")}.pdf`;
  if (options?.returnBlob) {
    return doc.output("blob");
  }
  doc.save(filename);
}
