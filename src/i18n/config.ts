import { AppLanguage, LanguagePreference } from "../types";

export function resolveLanguage(preference?: LanguagePreference): AppLanguage {
  if (preference === "pl") return "pl";
  if (preference === "en") return "en";
  
  // system fallback
  if (typeof navigator !== "undefined") {
    const langs = navigator.languages || [navigator.language];
    for (const l of langs) {
      if (l.toLowerCase().startsWith("pl")) return "pl";
    }
  }
  return "en";
}

export function getLocaleForLanguage(lang: AppLanguage): string {
  return lang === "pl" ? "pl-PL" : "en-US";
}
