export interface CalendarEventInput {
  summary: string;
  description?: string;
  eventDate: string;
  eventTime: string;
  reminders: number[];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateCalendarEventInput(input: CalendarEventInput): ValidationResult {
  if (!input.summary || input.summary.trim().length === 0) {
    return { isValid: false, error: "Tytuł wydarzenia nie może być pusty." };
  }

  if (!input.eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate) || isNaN(Date.parse(input.eventDate))) {
    return { isValid: false, error: "Wybierz prawidłową datę wydarzenia w formacie YYYY-MM-DD." };
  }

  if (!input.eventTime || !/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(input.eventTime)) {
    return { isValid: false, error: "Wybierz prawidłową godzinę wydarzenia w formacie HH:MM." };
  }

  if (Array.isArray(input.reminders) && input.reminders.length > 5) {
    return { isValid: false, error: "Możesz wybrać maksymalnie 5 powiadomień." };
  }

  return { isValid: true };
}
