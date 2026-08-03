import { describe, it, expect } from "vitest";
import { estimateProfileSizes } from "./crypto";
import { AppState, Profile } from "../types";

describe("estimateProfileSizes", () => {
  it("powinno zwracać rozmiary dla wszystkich profili w stanie", () => {
    const smallProfile: Profile = {
      id: "p-small",
      name: "Small",
      kind: "personal",
      transactions: [{ id: "t1", name: "Zakup", amount: 10, type: "expense", category: "Inne", account: "Gotówka", isoDate: "2023-01-01",
          currency: "PLN"
    }],
      payments: [],
      goals: [],
      investments: [],
      currency: "PLN", budgets: {}
    };

    const largeProfile: Profile = {
      ...smallProfile,
      id: "p-large",
      name: "Large",
      transactions: [
        { id: "t1", name: "Zakup", amount: 10, type: "expense", category: "Inne", account: "Gotówka", isoDate: "2023-01-01",
            currency: "PLN"
        },
        { id: "t2", name: "Zakup 2", amount: 20, type: "expense", category: "Inne", account: "Gotówka", isoDate: "2023-01-02",
            currency: "PLN"
        },
        { id: "t3", name: "Zakup 3", amount: 30, type: "expense", category: "Inne", account: "Gotówka", isoDate: "2023-01-03",
            currency: "PLN"
        },
        { id: "t4", name: "Bardzo długi tekst transakcji aby zwiększyć rozmiar payloadu", amount: 100, type: "expense", category: "Inne", account: "Gotówka", isoDate: "2023-01-04",
            currency: "PLN"
        }
      ]
    };

    const state: AppState = {
      profiles: [smallProfile, largeProfile],
      activeProfileId: "p-small",
      schemaVersion: 1,
      updatedAt: "2023-01-01T00:00:00Z",
      lastModifiedBy: "test",
      driveFileId: null,
      recurringRules: [],
      transactionRules: []
    };

    const sizes = estimateProfileSizes(state);

    expect(sizes).toHaveLength(2);
    
    const smallSize = sizes.find(s => s.profileId === "p-small")?.bytes;
    const largeSize = sizes.find(s => s.profileId === "p-large")?.bytes;

    expect(smallSize).toBeDefined();
    expect(largeSize).toBeDefined();
    
    // Upewnijmy się, że profil z większą liczbą danych ma większy rozmiar
    expect(largeSize!).toBeGreaterThan(smallSize!);
  });

  it("powinno bezpiecznie obsłużyć brak profili", () => {
    const state = {} as AppState; // symulujemy niepełny stan
    const sizes = estimateProfileSizes(state);
    expect(sizes).toEqual([]);
  });
});
