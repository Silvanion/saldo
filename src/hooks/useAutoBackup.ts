import { useEffect } from "react";
import { loadState } from "../services/localDb";

/**
 * Automatyczna lokalna kopia zapasowa (UX-01, tylko aplikacja desktopowa).
 * Po zmianie danych (z opóźnieniem, by seria edycji dała jedną kopię) zapisuje stan Z BAZY LOKALNEJ,
 * a nie ze stanu Reacta — dzięki temu profile z PIN-em trafiają do kopii zaszyfrowane.
 * Rotację (jeden plik na dzień, 7 dni) i ochronę przed nadpisaniem dobrej kopii robi proces główny.
 */
export function useAutoBackup(updatedAt: string | undefined, profileCount: number, delayMs = 60_000) {
  useEffect(() => {
    const api = typeof window !== "undefined" ? window.electronAPI : undefined;
    if (!api?.writeAutoBackup || !updatedAt || profileCount === 0) return;

    const timer = setTimeout(async () => {
      try {
        const persisted = await loadState();
        if (persisted) await api.writeAutoBackup!(JSON.stringify(persisted));
      } catch (err) {
        console.warn("Automatyczna kopia zapasowa nie powiodła się:", err);
      }
    }, delayMs);
    return () => clearTimeout(timer);
  }, [updatedAt, profileCount, delayMs]);
}
