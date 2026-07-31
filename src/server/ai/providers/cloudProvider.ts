import { getLocalDateIso } from "../../../utils";
import { AiProvider } from "../types";
import { getGemini, getCachedAiResult, setCachedAiResult } from "../../services/aiService";
import { Type } from "@google/genai";

export class CloudProvider implements AiProvider {
  async suggestEvent(payment: any, currentDate: string, uid: string = "unknown"): Promise<any> {
    const promptVersion = "v1";
    // klucz zawiera uid, pełne dane wejściowe, dueDate i wersję promptu.
    const cacheKey = `suggest-event:${uid}:${JSON.stringify(payment)}:${payment.dueDate || currentDate}:${promptVersion}`;
    const cached = getCachedAiResult(cacheKey);
    if (cached) return cached;

    const ai = getGemini();
    const prompt = `Zaplanuj przypomnienie kalendarza dla płatności:
- Nazwa: ${payment.name}
- Kwota: ${payment.amount}
- Termin: ${payment.dueDate}
Dzisiejsza data: ${currentDate || getLocalDateIso()}
Zwróć JSON: summary (np. "💸 Płatność: [Nazwa] ([Kwota])"), description (stworzony profesjonalny szablon z przypomnieniem o kwocie, dacie i dodaną krótką, przyjazną poradą finansową), suggestedTime (HH:MM:SS), reminders (minuty, np [1440, 120]).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 250,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            description: { type: Type.STRING },
            suggestedTime: { type: Type.STRING },
            reminders: { type: Type.ARRAY, items: { type: Type.INTEGER } }
          },
          required: ["summary", "description", "suggestedTime", "reminders"]
        }
      }
    });

    if (!response.text) throw new Error("Empty response");
    const parsedResult = JSON.parse(response.text.trim());
    setCachedAiResult(cacheKey, parsedResult);
    return parsedResult;
  }

  async parseNatural(text: string, currentDate: string): Promise<any> {
    const ai = getGemini();
    const prompt = `Wyodrębnij płatność i wydarzenie.
Tekst: "${text}"
Data: ${currentDate || getLocalDateIso()}
Zwróć JSON z obiektami: 'payment' (name, amount, dueDate), 'event' (summary, description, suggestedDate, suggestedTime, reminders). Jeśli brak, ustaw null.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 300,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            payment: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                dueDate: { type: Type.STRING }
              },
              required: ["name", "amount", "dueDate"]
            },
            event: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                description: { type: Type.STRING },
                suggestedDate: { type: Type.STRING },
                suggestedTime: { type: Type.STRING },
                reminders: { type: Type.ARRAY, items: { type: Type.INTEGER } }
              },
              required: ["summary", "description", "suggestedDate", "suggestedTime", "reminders"]
            }
          },
          required: ["payment", "event"]
        }
      }
    });

    if (!response.text) throw new Error("Empty response");
    return JSON.parse(response.text.trim());
  }

  async parseStatement(text: string, currentDate: string): Promise<any> {
    const ai = getGemini();
    const prompt = `Analizuj wyciąg. Data odniesienia: ${currentDate || getLocalDateIso()}. 
Zwróć transakcje: name, amount (zawsze dodatnia), type ("income"/"expense"), isoDate (YYYY-MM-DD), category, account (zawsze "Konto główne").
Tekst: """${text}"""`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 1000,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ["income", "expense"] },
              isoDate: { type: Type.STRING },
              category: { type: Type.STRING },
              account: { type: Type.STRING }
            },
            required: ["name", "amount", "type", "isoDate", "category", "account"]
          }
        }
      }
    });

    if (!response.text) throw new Error("Empty response");
    const parsedTransactions = JSON.parse(response.text.trim());
    return { transactions: parsedTransactions };
  }

  async chat(message: string, profileData: any): Promise<any> {
    const ai = getGemini();
    const prunedProfile = {
      name: profileData.name,
      budgets: profileData.budgets,
      goals: profileData.goals,
      transactions: profileData.transactions?.slice(0, 10)
    };

    const prompt = `Jesteś doradcą "Saldo". Odpowiadaj zwięźle, bez znaczników markdowna.
Profil: ${JSON.stringify(prunedProfile)}
Użytkownik: "${message}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 500,
        temperature: 0.5
      }
    });

    if (!response.text) throw new Error("Empty response");
    return { reply: response.text };
  }

  async scanInvoice(imageBase64: string, mimeType: string): Promise<any> {
    const ai = getGemini();
    const prompt = `Wyciągnij dane z faktury do JSON: name (tytuł), amount (kwota), dueDate (YYYY-MM-DD), category.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { inlineData: { data: imageBase64, mimeType: mimeType || "image/jpeg" } },
        prompt
      ],
      config: {
        maxOutputTokens: 200,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            dueDate: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["name", "amount", "dueDate"]
        }
      }
    });

    if (!response.text) throw new Error("Empty response");
    return JSON.parse(response.text.trim());
  }
}
