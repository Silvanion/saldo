import React from "react";
import { Palette, Sun, Moon, Monitor } from "lucide-react";

interface SettingsAppearanceSectionProps {
  theme: "light" | "dark" | "auto";
  onThemeChange: (newTheme: "light" | "dark" | "auto") => void;
}

export function SettingsAppearanceSection({
  theme,
  onThemeChange
}: SettingsAppearanceSectionProps) {
  return (
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
  );
}
