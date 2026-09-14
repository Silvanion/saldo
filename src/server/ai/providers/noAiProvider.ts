import { getLocalDateIso } from "../../../utils";
import { AiProvider } from "../types";

export class NoAiProvider implements AiProvider {
  /**
   * Generates a calendar event suggestion using deterministic rules.
   */
  async suggestEvent(payment: any, currentDate: string): Promise<any> {
    const name = payment.name || "Rachunek";
    const amount = payment.amount ? `${payment.amount} ${payment.currency || 'PLN'}` : "nieznaną kwotę";
    const refDate = payment.dueDate || currentDate || getLocalDateIso();

    return {
      summary: `💸 Płatność: ${name} (${amount})`,
      description: `Przypomnienie o uregulowaniu rachunku/subskrypcji.\n\nNazwa: ${name}\nKwota: ${amount}\nTermin: ${refDate}\n\n[Wygenerowano automatycznie z aplikacji Saldo]`,
      suggestedTime: "10:00:00",
      reminders: [1440, 120] // 24h and 2h before
    };
  }

  /**
   * Parses natural language input using deterministic regex patterns, date logic, and auto-categorization.
   */
  async parseNatural(text: string, currentDate: string): Promise<any> {
    const raw = text.trim();
    const lower = raw.toLowerCase();
    const today = new Date(currentDate || getLocalDateIso());

    // 1. Amount Extraction (matches e.g. 120 zł, 120.50 {waluta}, 45,99)
    let amount = 0;
    const amountMatch = raw.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:zł|pln|eur|usd|$)/i) || raw.match(/(\d+(?:[.,]\d{1,2})?)/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(",", "."));
    }

    // 2. Date Extraction (jutro, pojutrze, za X dni, YYYY-MM-DD, DD.MM.YYYY)
    let targetDate = new Date(today);
    if (lower.includes("jutro")) {
      targetDate.setDate(today.getDate() + 1);
    } else if (lower.includes("pojutrze")) {
      targetDate.setDate(today.getDate() + 2);
    } else {
      const daysMatch = lower.match(/za\s+(\d+)\s+dni/);
      if (daysMatch) {
        targetDate.setDate(today.getDate() + parseInt(daysMatch[1], 10));
      } else {
        const isoMatch = raw.match(/\b(\d{4}-\d{2}-\d{2})\b/);
        const dotMatch = raw.match(/\b(\d{1,2})[.-](\d{1,2})[.-](\d{4})\b/);
        if (isoMatch) {
          targetDate = new Date(isoMatch[1]);
        } else if (dotMatch) {
          targetDate = new Date(`${dotMatch[3]}-${dotMatch[2].padStart(2, '0')}-${dotMatch[1].padStart(2, '0')}`);
        }
      }
    }

    const isoDueDate = isNaN(targetDate.getTime())
      ? getLocalDateIso(today)
      : getLocalDateIso(targetDate);

    // 3. Name & Intent Extraction
    const isEvent = lower.includes("przypomnij") || lower.includes("wydarzenie") || lower.includes("spotkanie") || lower.includes("kalendarz");
    
    // Clean name from keywords
    let name = raw
      .replace(/(\d+(?:[.,]\d{1,2})?)\s*(?:zł|pln|eur|usd)/gi, "")
      .replace(/przypomnij|wydarzenie|płatność|rachunek|na|za|dni|jutro|pojutrze/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!name || name.length < 2) {
      name = "Szybki wpis";
    } else {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }

    if (isEvent) {
      return {
        payment: null,
        event: {
          summary: `Przypomnienie: ${name}`,
          description: `Ręczny wpis regułowy: ${raw}`,
          suggestedDate: isoDueDate,
          suggestedTime: "10:00:00",
          reminders: [1440, 120]
        }
      };
    } else {
      return {
        payment: {
          name: name,
          amount: amount || 0,
          dueDate: isoDueDate
        },
        event: null
      };
    }
  }

  /**
   * Deterministic CSV / Text statement parser for NoAiProvider fallback.
   */
  async parseStatement(text: string, currentDate: string): Promise<any> {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    const transactions: any[] = [];
    const refDate = currentDate || getLocalDateIso();

    for (const line of lines) {
      const parts = line.split(/;|,|\t/);
      if (parts.length >= 2) {
        // Try parsing columns
        let name = "Transakcja";
        let amount = 0;
        let type: "income" | "expense" = "expense";
        let isoDate = refDate;
        let category = "Inne";

        for (const part of parts) {
          const trimmed = part.trim();
          // Check date
          if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            isoDate = trimmed;
          } else {
            // Check amount
            const num = parseFloat(trimmed.replace(/\s/g, "").replace(",", "."));
            if (!isNaN(num) && num !== 0) {
              if (num < 0) {
                amount = Math.abs(num);
                type = "expense";
              } else {
                amount = num;
                type = "income";
              }

            } else if (trimmed.length > 2 && !/^(data|kwota|opis|tytuł|saldo)$/i.test(trimmed)) {
              name = trimmed;
            }
          }
        }

        // Categorize based on keywords
        const lowerName = name.toLowerCase();
        if (lowerName.includes("orlen") || lowerName.includes("paliwo") || lowerName.includes("bp") || lowerName.includes("shell")) {
          category = "Transport";
        } else if (lowerName.includes("biedronka") || lowerName.includes("lidl") || lowerName.includes("żabka") || lowerName.includes("auchan")) {
          category = "Żywność";
        } else if (lowerName.includes("pge") || lowerName.includes("orange") || lowerName.includes("czynsz") || lowerName.includes("prąd")) {
          category = "Rachunki";
        } else if (type === "income") {
          category = "Wynagrodzenie";
        }

        if (amount > 0) {
          transactions.push({
            name,
            amount,
            type,
            isoDate,
            category,
            account: "Konto główne"
          });
        }
      }
    }

    return { transactions };
  }

  async chat(_message: string, _profileData: any): Promise<any> {
    return {
      reply: "Funkcja interaktywnego chatu wymaga włączenia trybu Lokalne AI (Ollama) lub Chmura AI w Ustawieniach."
    };
  }

  async parseStatementImage(): Promise<any> {
    throw new Error("Analiza skanów wymaga włączenia lokalnego modelu multimodalnego lub Chmury AI.");
  }

  async scanInvoice(_imageBase64: string, _mimeType: string): Promise<any> {
    throw new Error("Skanowanie faktur wymaga włączenia lokalnego AI i modelu Ollama vision.");
  }
}
