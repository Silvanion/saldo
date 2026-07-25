import React from "react";
import { Sparkles, CheckCircle2, Cloud, Shield, Wallet, Smartphone } from "lucide-react";

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  icon: React.ReactNode;
  features: string[];
}

export const changelogData: ChangelogEntry[] = [
  {
    version: "v0.8.7",
    date: "Lipiec 2026",
    title: "Ochrona Rezerw i Bezpieczny Import Transakcji",
    icon: <Shield className="w-5 h-5 text-[#137566]" />,
    features: [
      "Blokada usuwania celów oszczędnościowych ze zgromadzonymi środkami (saved > 0) chroniąca rezerwy finansowe.",
      "Automatyczna detekcja duplikatów i deduplikacja podczas wielokrotnego importu plików CSV.",
      "Filtrowanie uszkodzonych wartości numerycznych (NaN) przy wprowadzaniu i imporcie transakcji.",
      "Ścisłe typowanie wskaźników oraz danych wykresów w panelu głównym (Dashboard Metrics)."
    ]
  },
  {
    version: "v0.8.6",
    date: "Lipiec 2026",
    title: "Izolacja Profilowa i Bezpieczeństwo Danych",
    icon: <Shield className="w-5 h-5 text-emerald-600" />,
    features: [
      "Pełna izolacja reguł cyklicznych i reguł transakcji dla każdego profilu (osobistego i wspólnego).",
      "Gwarancja braku wycieków danych finansowych przy przełączaniu profili.",
      "Ścisła walidacja typów w czasie rzeczywistym (Type Guards) oraz ochrona przed uszkodzonymi danymi.",
      "Idempotentne i bezpieczne procedury migracji bazy danych i pamięci podręcznej."
    ]
  },
  {
    version: "v0.8.5",
    date: "Lipiec 2026",
    title: "Rozliczenia i Budżet Wspólny",
    icon: <Wallet className="w-5 h-5 text-indigo-500" />,
    features: [
      "Automatyczne wyliczanie salda rozliczeń między partnerami (kto komu jest winien).",
      "Możliwość oznaczania, kto opłacił dany wydatek (Ja, Partner, Wspólne/50-50).",
      "Nowe filtry list transakcji i nadchodzących opłat według osoby płacącej.",
      "Wyraźne oznaczanie profili wspólnych w interfejsie aplikacji."
    ]
  },
  {
    version: "v0.8.4",
    date: "Lipiec 2026",
    title: "PWA i Bezpieczna Praca Offline",
    icon: <Smartphone className="w-5 h-5 text-emerald-500" />,
    features: [
      "Aplikacja jako PWA (Progresywna Aplikacja Internetowa) - możliwość instalacji na ekranie głównym.",
      "Pełne wsparcie dla trybu offline z lokalnym cache.",
      "Ostrzeżenia o braku połączenia sieciowego podczas zapisu.",
      "Zoptymalizowany manifest i service worker do przechowywania interfejsu (app shell)."
    ]
  },
  {
    version: "v0.8.3",
    date: "Lipiec 2026",
    title: "Synchronizacja w Chmurze i Dysku",
    icon: <Cloud className="w-5 h-5 text-blue-500" />,
    features: [
      "Integracja z Firebase Firestore dla bezpiecznej synchronizacji profili.",
      "Kopie zapasowe na koncie Google Drive z separacją uprawnień OAuth.",
      "Zautomatyzowane konflikty zapisów pomiędzy urządzeniami.",
      "Zabezpieczenia przed błędami dostępu (401/403/404) z Google Drive."
    ]
  },
  {
    version: "v0.8.2",
    date: "Czerwiec 2026",
    title: "Profile Bezpieczne PIN i Detekcja Duplikatów",
    icon: <Shield className="w-5 h-5 text-purple-500" />,
    features: [
      "Szyfrowanie profili kodem PIN za pomocą AES-GCM.",
      "Bezpieczny magazyn kluczy, zapobiegający wyciekom danych finansowych w przeglądarce.",
      "Inteligentna detekcja duplikatów dla cyklicznych oraz importowanych transakcji.",
      "Mechanizmy automatycznego czyszczenia pamięci po wylogowaniu."
    ]
  },
  {
    version: "v0.8.1",
    date: "Maj 2026",
    title: "Kategoryzacja AI i Zaawansowane Budżety",
    icon: <Sparkles className="w-5 h-5 text-amber-500" />,
    features: [
      "Asystent AI analizujący płatności i sugerujący kategorie za pomocą modelu Gemini.",
      "Funkcja eksportu i importu z/do CSV do integracji z bankami.",
      "Rozbudowany podział wydatków i cele oszczędnościowe.",
      "Limitery i procentowe wskaźniki użycia budżetów."
    ]
  },
  {
    version: "v0.8.0",
    date: "Kwiecień 2026",
    title: "Pierwsze Wydanie",
    icon: <CheckCircle2 className="w-5 h-5 text-slate-500" />,
    features: [
      "Uruchomienie podstawowego silnika zarządzania transakcjami.",
      "Logowanie kontem Google.",
      "Główny dashboard ze wskaźnikami dziennymi."
    ]
  }
];
