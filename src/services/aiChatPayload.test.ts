import { describe, expect, it } from "vitest";
import { buildChatProfileData, CHAT_MAX_TRANSACTIONS } from "./aiChatPayload";
import type { Profile } from "../types";

const makeProfile = (txCount: number): Profile =>
  ({
    id: "p1",
    name: "Dom",
    kind: "personal",
    currency: "PLN",
    budgets: { Jedzenie: 1000 },
    transactions: Array.from({ length: txCount }, (_, i) => ({
      id: `t${i}`,
      name: `Zakup ${i}`,
      category: "Jedzenie",
      categoryIcon: "🍞",
      amount: 10 + i,
      type: "expense",
      isoDate: new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString().slice(0, 10),
      note: "długa notatka ".repeat(20)
    })),
    payments: [],
    goals: [],
    investments: []
  }) as unknown as Profile;

describe("buildChatProfileData", () => {
  it("keeps only the most recent transactions within the server cap", () => {
    const data = buildChatProfileData(makeProfile(500));
    const txs = data.profiles[0].transactions;
    expect(txs).toHaveLength(CHAT_MAX_TRANSACTIONS);
    expect(txs[0].id).toBe("t499");
    expect(Object.keys(txs[0]).sort()).toEqual(["amount", "category", "id", "isoDate", "name", "type"]);
  });

  it("fits within the /chat body-size limit for a large profile", () => {
    const body = { message: "Jak oszczędzać?", profileData: buildChatProfileData(makeProfile(5000)) };
    expect(JSON.stringify(body).length).toBeLessThan(150_000);
  });
});
