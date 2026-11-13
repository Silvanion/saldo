import { useEffect, useState } from "react";
import { History, FolderOpen, RotateCcw } from "lucide-react";

interface AutoBackupEntry { name: string; date: string; size: number; modifiedAt: string }

const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} kB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/**
 * Lista automatycznych kopii lokalnych (UX-01, tylko aplikacja desktopowa). „Przywróć” przekazuje treść
 * do istniejącego podglądu importu — nic nie jest nadpisywane bez Twojego potwierdzenia.
 */
export function AutoBackupCard({ onRestore }: { onRestore: (json: string) => void }) {
  const api = typeof window !== "undefined" ? window.electronAPI : undefined;
  const [backups, setBackups] = useState<AutoBackupEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api?.listAutoBackups?.().then((list) => { if (!cancelled) setBackups(list); }).catch(() => { if (!cancelled) setBackups([]); });
    return () => { cancelled = true; };
  }, [api]);

  if (!api?.listAutoBackups) return null;

  const restore = async (name: string) => {
    setError(null);
    try {
      const res = await api.readAutoBackup!(name);
      if (res?.ok && res.json) onRestore(res.json);
      else setError(res?.error || "Nie udało się odczytać kopii.");
    } catch {
      setError("Nie udało się odczytać kopii.");
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-xs" id="auto-backup-card">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h4 className="text-sm font-bold text-text-main flex items-center gap-2"><History className="w-4 h-4 text-brand" /> Automatyczna kopia lokalna</h4>
        <button type="button" onClick={() => api.openBackupsFolder?.()} className="inline-flex items-center gap-1.5 text-xs font-bold text-brand bg-surface hover:bg-surface-2 border border-border px-3 py-1.5 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring">
          <FolderOpen className="w-3.5 h-3.5" /> Otwórz folder kopii
        </button>
      </div>
      <p className="text-xs text-text-muted mb-3">
        Saldo zapisuje na tym komputerze jedną kopię dziennie i trzyma ostatnie 7 dni. Kopie mają taką samą ochronę jak dane w aplikacji:
        profile z PIN-em są zaszyfrowane, a profile bez PIN-u nie są zaszyfrowane.
      </p>
      {backups === null ? (
        <p className="text-xs text-text-muted">Wczytywanie…</p>
      ) : backups.length === 0 ? (
        <p className="text-xs text-text-muted">Brak kopii — pierwsza powstanie po pierwszej zmianie danych.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {backups.map((b) => (
            <li key={b.name} className="flex items-center justify-between gap-2 py-2 text-xs">
              <span className="font-semibold text-text-main tabular-nums">{b.date}</span>
              <span className="text-text-muted tabular-nums">{formatSize(b.size)}</span>
              <button type="button" onClick={() => restore(b.name)} aria-label={`Przywróć kopię z ${b.date}`} className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring rounded">
                <RotateCcw className="w-3.5 h-3.5" /> Przywróć
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-danger mt-2" role="alert">{error}</p>}
    </div>
  );
}
