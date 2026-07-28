import { Transaction, TransactionRule } from "../types";
import { getLocalDateIso } from "./date";
import { autoCategorizeTransaction, incomeCategories } from "./categories";

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
