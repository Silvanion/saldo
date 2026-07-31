import React, { createContext, useContext, ReactNode, useMemo, useCallback } from "react";
import { AppLanguage, LanguagePreference } from "../types";
import { resolveLanguage } from "./config";
import { translations } from "./translations";

interface I18nContextType {
  language: AppLanguage;
  preference: LanguagePreference;
  setPreference: (pref: LanguagePreference) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextType | null>(null);

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}

interface I18nProviderProps {
  preference: LanguagePreference | undefined;
  setPreference: (pref: LanguagePreference) => void;
  children: ReactNode;
}

export function I18nProvider({ preference = "system", setPreference, children }: I18nProviderProps) {
  const language = useMemo(() => resolveLanguage(preference), [preference]);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let text = translations[language]?.[key] || translations["pl"]?.[key] || key;
    
    if (params) {
      Object.keys(params).forEach(paramKey => {
        text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(params[paramKey]));
      });
    }
    
    return text;
  }, [language]);

  const value = useMemo(() => ({
    language,
    preference,
    setPreference,
    t
  }), [language, preference, setPreference, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}
