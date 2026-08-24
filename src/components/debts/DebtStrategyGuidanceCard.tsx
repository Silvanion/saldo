import React from "react";
import { Compass, TrendingDown, Award, Sliders, Check } from "lucide-react";
import { DebtPayoffStrategyType } from "../../services/debtCalculations";

export interface DebtStrategyGuidanceCardProps {
  selectedStrategy?: DebtPayoffStrategyType;
  onSelectStrategy?: (strategy: DebtPayoffStrategyType) => void;
}

export function DebtStrategyGuidanceCard({
  selectedStrategy = "avalanche",
  onSelectStrategy
}: DebtStrategyGuidanceCardProps) {
  const strategies = [
    {
      id: "avalanche" as const,
      name: "Strategia Lawiny",
      nameEn: "Avalanche",
      icon: TrendingDown,
      rule: "Najwyższe oprocentowanie (APR) w pierwszej kolejności",
      bestFor: "Kierowanie nadpłat na najdroższe długi, co zwykle ogranicza koszty",
      highlight: "Priorytet kosztów"
    },
    {
      id: "snowball" as const,
      name: "Strategia Kuli Śnieżnej",
      nameEn: "Snowball",
      icon: Award,
      rule: "Najmniejsze saldo zadłużenia w pierwszej kolejności",
      bestFor: "Szybkie sukcesy psychologiczne i najszybsza redukcja liczby aktywnych rat",
      highlight: "Maksymalna motywacja"
    },
    {
      id: "custom" as const,
      name: "Strategia Własna",
      nameEn: "Custom",
      icon: Sliders,
      rule: "Kolejność spłaty ustalana indywidualnie przez Ciebie",
      bestFor: "Gdy masz własne priorytety (np. spłata pożyczki od rodziny lub karty ze zmiennym limitem)",
      highlight: "Pełna elastyczność"
    }
  ];

  return (
    <div
      id="debt-strategy-guidance-block"
      className="bg-surface rounded-2xl border border-border p-4 sm:p-5 space-y-3.5 shadow-2xs"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand flex items-center justify-center shrink-0 border border-brand/20">
          <Compass className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-text-main">
            Przewodnik po strategiach spłaty
          </h4>
          <p className="text-[11px] text-text-muted">
            Którą strategię wybrać dla swojego portfela zadłużenia?
          </p>
        </div>
      </div>

      {/* Strategy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {strategies.map((strat) => {
          const isSelected = selectedStrategy === strat.id;
          const Icon = strat.icon;

          return (
            <div
              key={strat.id}
              onClick={() => onSelectStrategy?.(strat.id)}
              className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? "bg-brand-subtle/40 border-brand ring-1 ring-brand/30 shadow-2xs"
                  : "bg-surface-2/40 border-border hover:border-brand/40 hover:bg-surface-2/70"
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  onSelectStrategy?.(strat.id);
                }
              }}
              aria-label={`Wybierz ${strat.name}`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? "bg-brand text-text-inverse border-brand"
                          : "bg-surface text-text-muted border-border"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-bold text-text-main truncate">{strat.name}</span>
                  </div>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted shrink-0">
                    {strat.highlight}
                  </span>
                </div>

                <div className="space-y-1 text-[11px]">
                  <p className="text-text-faint font-semibold">
                    <strong className="text-text-main font-semibold">Zasada:</strong> {strat.rule}
                  </p>
                  <p className="text-text-muted leading-relaxed">
                    <strong className="text-text-main font-semibold">Dla kogo:</strong> {strat.bestFor}
                  </p>
                </div>
              </div>

              {isSelected && (
                <div className="mt-2 pt-2 border-t border-brand/20 flex items-center gap-1 text-[10px] font-bold text-brand">
                  <Check className="w-3 h-3" />
                  <span>Aktywny wariant</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
