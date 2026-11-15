import { AlertTriangle } from "lucide-react";

/**
 * Pokazywany zamiast okna PIN-u, gdy profil został zaszyfrowany nowszą wersją Saldo (format v2,
 * hasło główne). Ta wersja nie umie go odczytać i niczego w nim nie zmienia (SEC-02 faza 2a).
 */
export function NewerVersionNotice({ profileName, onSelectOtherProfile }: { profileName: string; onSelectOtherProfile: () => void }) {
  return (
    <div className="flex items-center justify-center h-full p-6" role="alert" id="newer-version-notice">
      <div className="max-w-md rounded-2xl border border-warning/30 bg-warning-subtle/40 p-6 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-warning mx-auto" aria-hidden="true" />
        <h2 className="text-base font-bold text-text-main">Profil „{profileName}” wymaga nowszej wersji Saldo</h2>
        <p className="text-sm text-text-muted leading-relaxed">
          Ten profil został zaszyfrowany nowszą wersją aplikacji, której ta wersja nie potrafi odczytać.
          Zaktualizuj Saldo, aby go otworzyć. Twoje dane nie zostały zmienione — ta wersja niczego w tym profilu nie zapisze.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
          <a
            href="https://github.com/Silvanion/saldo/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-text-inverse bg-brand hover:bg-brand-hover px-3.5 py-2 rounded-xl focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Pobierz najnowszą wersję
          </a>
          <button
            type="button"
            onClick={onSelectOtherProfile}
            className="text-xs font-bold text-brand bg-surface hover:bg-surface-2 border border-border px-3.5 py-2 rounded-xl cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Wybierz inny profil
          </button>
        </div>
      </div>
    </div>
  );
}
