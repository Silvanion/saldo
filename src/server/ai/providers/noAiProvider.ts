import { AiProvider } from "../types";
import { buildCalendarReminder, parseQuickEntry, parseStatementText } from "../../../services/localParsers";

/**
 * Tryb bez AI. Cała logika mieszka teraz w src/services/localParsers.ts i działa
 * po stronie klienta — ten provider jest już tylko cienką warstwą zgodności HTTP.
 */
export class NoAiProvider implements AiProvider {
  async suggestEvent(payment: any, currentDate: string): Promise<any> {
    return buildCalendarReminder(payment || {}, currentDate);
  }

  async parseNatural(text: string, currentDate: string): Promise<any> {
    const entry = parseQuickEntry(text, currentDate);

    if (!entry) {
      return { payment: null, event: null };
    }

    if (entry.kind === "event") {
      return {
        payment: null,
        event: {
          summary: `Przypomnienie: ${entry.name}`,
          description: `Wpis regułowy: ${text}`,
          suggestedDate: entry.isoDate,
          suggestedTime: "10:00:00",
          reminders: [1440, 120]
        }
      };
    }

    return {
      payment: { name: entry.name, amount: entry.amount, dueDate: entry.isoDate },
      event: null
    };
  }

  async parseStatement(text: string, currentDate: string): Promise<any> {
    return { transactions: parseStatementText(text, currentDate) };
  }

  async chat(_message: string, _profileData: any): Promise<any> {
    return {
      reply: "Funkcja interaktywnego chatu wymaga włączenia trybu Lokalne AI (Ollama) lub Chmura AI w Ustawieniach."
    };
  }

  async scanInvoice(_imageBase64: string, _mimeType: string): Promise<any> {
    throw new Error("Skanowanie obrazów faktur wymaga włączenia trybu Chmura AI.");
  }
}
