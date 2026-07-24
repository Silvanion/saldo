import { describe, it, expect } from "vitest";
import { validateCalendarEventInput } from "./services/calendarValidation";

describe("validateCalendarEventInput", () => {
  it("zwraca isValid = true dla poprawnych danych", () => {
    const result = validateCalendarEventInput({
      summary: "Rachunek za prąd",
      description: "Płatność PGE",
      eventDate: "2026-08-15",
      eventTime: "10:00",
      reminders: [1440, 120]
    });
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("odrzuca pusty tytuł wydarzenia", () => {
    const result = validateCalendarEventInput({
      summary: "   ",
      eventDate: "2026-08-15",
      eventTime: "10:00",
      reminders: [120]
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("Tytuł");
  });

  it("odrzuca nieprawidłowy format daty", () => {
    const result = validateCalendarEventInput({
      summary: "Tytuł ok",
      eventDate: "15-08-2026",
      eventTime: "10:00",
      reminders: [120]
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("datę");
  });

  it("odrzuca nieprawidłowy format godziny", () => {
    const result = validateCalendarEventInput({
      summary: "Tytuł ok",
      eventDate: "2026-08-15",
      eventTime: "25:61",
      reminders: [120]
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("godzinę");
  });

  it("odrzuca gdy przekroczono maksymalną liczbę powiadomień (np. > 5)", () => {
    const result = validateCalendarEventInput({
      summary: "Tytuł ok",
      eventDate: "2026-08-15",
      eventTime: "10:00",
      reminders: [0, 60, 120, 1440, 2880, 10080] // 6 reminders
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("maksymalnie 5 powiadomień");
  });
});
