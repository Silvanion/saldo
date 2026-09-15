import React, { useState, useEffect } from "react";
import { Palette, Sun, Moon, Monitor, Laptop, Power, Keyboard } from "lucide-react";

interface SettingsAppearanceSectionProps {
  theme: "light" | "dark" | "auto";
  onThemeChange: (newTheme: "light" | "dark" | "auto") => void;
}

export function SettingsAppearanceSection({
  theme,
  onThemeChange
}: SettingsAppearanceSectionProps) {
  const [isAutostartEnabled, setIsAutostartEnabled] = useState<boolean>(false);
  const [isDesktopAvailable, setIsDesktopAvailable] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI?.getLoginItem) {
      setIsDesktopAvailable(true);
      window.electronAPI.getLoginItem().then((enabled) => {
        setIsAutostartEnabled(Boolean(enabled));
      }).catch(() => {});
    }
  }, []);

  const handleToggleAutostart = async (checked: boolean) => {
    setIsAutostartEnabled(checked);
    if (window.electronAPI?.setLoginItem) {
      try {
        const res = await window.electronAPI.setLoginItem(checked);
        setIsAutostartEnabled(Boolean(res));
      } catch {
        // zachowaj bieżący stan w przypadku błędu
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-theme-card">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/40">
          <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-main">Motyw i wygląd aplikacji</h3>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              Dostosuj schemat kolorów aplikacji Saldo do swoich preferencji lub pory dnia.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" id="theme-selectors-grid">
          {/* Light Theme Option */}
          <button
            onClick={() => onThemeChange("light")}
            className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs ${
              theme === "light"
                ? "bg-brand-subtle/50 border-brand/30 ring-1 ring-brand/20 shadow-xs"
                : "bg-surface border-border hover:bg-surface-2 hover:border-border"
            }`}
            id="btn-set-theme-light"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${theme === "light" ? "bg-brand-subtle text-brand border-brand/20" : "bg-surface-2 text-text-muted border-border"}`}>
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-text-main font-bold">Jasny motyw</strong>
              <span className="text-xs text-text-muted mt-0.5 block font-medium">Klasyczny i przejrzysty</span>
            </div>
          </button>

          {/* Dark Theme Option */}
          <button
            onClick={() => onThemeChange("dark")}
            className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs ${
              theme === "dark"
                ? "bg-brand-subtle/50 border-brand/30 ring-1 ring-brand/20 shadow-xs"
                : "bg-surface border-border hover:bg-surface-2 hover:border-border"
            }`}
            id="btn-set-theme-dark"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${theme === "dark" ? "bg-brand-subtle text-brand border-brand/20" : "bg-surface-2 text-text-muted border-border"}`}>
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-text-main font-bold">Ciemny motyw</strong>
              <span className="text-xs text-text-muted mt-0.5 block font-medium">Komfortowy dla wzroku</span>
            </div>
          </button>

          {/* Auto Theme Option */}
          <button
            onClick={() => onThemeChange("auto")}
            className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs ${
              theme === "auto"
                ? "bg-brand-subtle/50 border-brand/30 ring-1 ring-brand/20 shadow-xs"
                : "bg-surface border-border hover:bg-surface-2 hover:border-border"
            }`}
            id="btn-set-theme-auto"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${theme === "auto" ? "bg-brand-subtle text-brand border-brand/20" : "bg-surface-2 text-text-muted border-border"}`}>
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm text-text-main font-bold">Automatyczny</strong>
              <span className="text-xs text-text-muted mt-0.5 block font-medium">Zależny od pory dnia</span>
            </div>
          </button>
        </div>
      </div>

      {/* Desktop App Integration Card */}
      {isDesktopAvailable && (
        <div className="bg-surface rounded-xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-desktop-card">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/40">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-main">Aplikacja Desktopowa</h3>
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                Ustawienia integracji z systemem operacyjnym, paskiem menu i skrótami.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Autostart toggle */}
            <div className="flex items-center justify-between p-4 bg-surface-2/60 border border-border/70 rounded-xl">
              <div className="pr-4">
                <strong className="text-xs font-bold text-text-main flex items-center gap-1.5">
                  <Power className="w-4 h-4 text-brand" />
                  Uruchamiaj aplikację przy starcie systemu
                </strong>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                  Automatycznie uruchamia Saldo po zalogowaniu do systemu macOS lub Windows.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none focus-within:ring-2 focus-within:ring-focus-ring rounded-full shrink-0">
                <input
                  type="checkbox"
                  checked={isAutostartEnabled}
                  onChange={(e) => handleToggleAutostart(e.target.checked)}
                  className="sr-only peer"
                  id="toggle-autostart"
                />
                <div className="w-11 h-6 bg-surface-offset rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring"></div>
              </label>
            </div>

            {/* Shortcuts and Tray info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-surface-2/40 border border-border/60 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-surface border border-border text-brand shrink-0">
                  <Keyboard className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-text-main block">Globalny skrót klawiszowy</span>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Naciśnij <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border font-mono font-bold text-[10px] text-brand">Cmd/Ctrl+Shift+E</kbd>, aby natychmiast wywołać formularz nowego wydatku.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-2/40 border border-border/60 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-surface border border-border text-brand shrink-0">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-text-main block">Zasobnik systemowy (Tray)</span>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Ikona w pasku menu oferuje szybkie akcje oraz sprawdzanie dostępności aktualizacji.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
