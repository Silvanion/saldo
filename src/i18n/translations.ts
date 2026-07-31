import { AppLanguage } from "../types";

export type TranslationDictionary = Record<string, string>;

export const translations: Record<AppLanguage, TranslationDictionary> = {
  pl: {
    "settings.language.title": "Język aplikacji",
    "settings.language.system": "Zgodnie z systemem",
    "settings.language.pl": "Polski",
    "settings.language.en": "English",
    "nav.dashboard": "Przegląd",
    "nav.transactions": "Historia",
    "nav.payments": "Płatności",
    "nav.budget": "Budżet",
    "nav.goals": "Cele i oszczędności",
    "nav.analysis": "Analiza",
    "nav.help": "Pomoc",
    "nav.settings": "Ustawienia",
  },
  en: {
    "settings.language.title": "Application Language",
    "settings.language.system": "System default",
    "settings.language.pl": "Polski",
    "settings.language.en": "English",
    "nav.dashboard": "Dashboard",
    "nav.transactions": "History",
    "nav.payments": "Payments",
    "nav.budget": "Budget",
    "nav.goals": "Goals & Savings",
    "nav.analysis": "Analysis",
    "nav.help": "Help",
    "nav.settings": "Settings",
  }
};
