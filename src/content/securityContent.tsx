import React from "react";
import { Lock, FileKey, Database } from "lucide-react";

export interface SecurityFeature {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}

export const securityFeatures: SecurityFeature[] = [
  {
    icon: <Lock className="w-5 h-5 text-text-faint shrink-0 mt-0.5" />,
    title: "Szyfrowanie End-to-End",
    description: (
      <>
        Twoje dane finansowe są w pełni szyfrowane na urządzeniu przed wysłaniem do chmury Firebase. 
        Nawet administratorzy nie mają wglądu w kwoty, nazwy transakcji czy budżety.
      </>
    )
  },
  {
    icon: <FileKey className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
    title: "Klucze Kryptograficzne",
    description: (
      <>
        Klucz do odszyfrowania danych powstaje na bazie Twojego numeru PIN oraz lokalnego <code>saltu</code>. 
        Utrata PIN-u oznacza brak możliwości odszyfrowania profili zabezpieczonych hasłem.
      </>
    )
  },
  {
    icon: <Database className="w-5 h-5 text-[#137566] shrink-0 mt-0.5" />,
    title: "Autozapis i Baza Danych",
    description: (
      <>
        Aplikacja wykorzystuje technologię Local-First. Zmiany są zapisywane w pamięci podręcznej i 
        wysyłane do bezpiecznej chmury Firestore (w modelu prywatnego dokumentu użytkownika).
      </>
    )
  }
];
