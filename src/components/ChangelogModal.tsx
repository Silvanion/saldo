import React from "react";
import { X, Sparkles, CheckCircle2, Cloud, Shield, Wallet, Smartphone, History } from "lucide-react";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const changelogData = [
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

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#137566]/10 flex items-center justify-center">
              <History className="w-5 h-5 text-[#137566]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Historia Zmian</h2>
              <p className="text-sm text-slate-500">Co nowego w Saldo?</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8">
          {changelogData.map((release, index) => (
            <div key={release.version} className="relative pl-6 sm:pl-8">
              {/* Timeline Line */}
              {index !== changelogData.length - 1 && (
                <div className="absolute left-2.5 sm:left-[21px] top-8 bottom-[-32px] w-0.5 bg-slate-100" />
              )}
              
              {/* Timeline Dot/Icon */}
              <div className="absolute left-0 sm:left-3 top-1 w-6 h-6 rounded-full bg-white border-[3px] border-slate-100 flex items-center justify-center z-10 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-[#137566]" />
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-xl bg-[#137566]/10 text-[#137566] text-xs font-bold font-mono">
                      {release.version}
                    </span>
                    <div className="flex items-center gap-2 text-[#137566] font-bold text-base sm:text-lg">
                      {release.icon}
                      {release.title}
                    </div>
                  </div>
                  <span className="self-start sm:self-auto px-2.5 py-0.5 rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {release.date}
                  </span>
                </div>

                <ul className="space-y-2.5">
                  {release.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                      <span className="leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
