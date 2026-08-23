import React, { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Percent,
  Layers,
  Sparkles,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  ThumbsUp
} from "lucide-react";
import { DebtPayoffStrategyType } from "../../services/debtCalculations";

export interface PayoffStrategiesKnowledgeCenterProps {
  /** Currently active strategy to highlight */
  selectedStrategy?: DebtPayoffStrategyType;
  /** Optional model-recommended strategy to highlight */
  recommendedStrategy?: DebtPayoffStrategyType | null;
  /** Optional callback to select or apply a strategy in the simulator */
  onSelectStrategy?: (strategy: DebtPayoffStrategyType) => void;
  /** Whether the knowledge center is expanded by default (default: false) */
  defaultOpen?: boolean;
}

export function PayoffStrategiesKnowledgeCenter({
  selectedStrategy,
  recommendedStrategy,
  onSelectStrategy,
  defaultOpen = false
}: PayoffStrategiesKnowledgeCenterProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const getStrategyLabel = (strategy?: DebtPayoffStrategyType | null) => {
    switch (strategy) {
      case "avalanche":
        return "Lawina (Avalanche)";
      case "snowball":
        return "Kula Śnieżna (Snowball)";
      case "custom":
        return "Własna kolejność (Custom)";
      case "baseline":
        return "Status Quo (Plan bazowy)";
      default:
        return null;
    }
  };

  const activeStrategyLabel = getStrategyLabel(selectedStrategy);

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden transition-all shadow-2xs">
      {/* Trigger Button */}
      <button
        type="button"
        id="btn-toggle-knowledge-center"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="payoff-strategies-knowledge-content"
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-surface-hover/50 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-hidden min-h-[44px]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand flex items-center justify-center shrink-0 border border-brand/20">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-main">
              Jak działają strategie spłaty?
            </h4>
            <p className="text-xs text-text-muted mt-0.5">
              Krótki opis sposobu porządkowania nadpłat w symulacji oraz interpretacji wskaźników.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-text-muted text-xs font-semibold pl-2">
          <span className="hidden sm:inline">{isOpen ? "Zwiń objaśnienie" : "Rozwiń objaśnienie"}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div
          id="payoff-strategies-knowledge-content"
          className="px-4 pb-5 sm:px-6 sm:pb-6 pt-1 border-t border-border/60 space-y-5 animate-fade-in text-xs text-text-muted leading-relaxed"
        >
          {/* Selected Strategy Context Banner */}
          {activeStrategyLabel && (
            <div className="pt-2 p-3 rounded-xl bg-brand-subtle/20 border border-brand/30 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-text-main text-xs">
                  Wybrana strategia: <strong className="text-brand font-black">{activeStrategyLabel}</strong>
                </span>
              </div>
              <span className="text-[11px] text-text-muted">
                Wyjaśnienie odpowiada aktualnie wybranej strategii.
              </span>
            </div>
          )}

          {/* Summary of trade-offs and mechanism */}
          <div className="p-3.5 rounded-xl bg-surface-2/60 border border-border/80 text-text-main font-medium leading-relaxed">
            <p>
              Avalanche porządkuje zobowiązania według oprocentowania, a Snowball według salda. Status Quo pozostaje punktem odniesienia. Wynik symulacji zależy od wprowadzonych danych, rat, oprocentowania i dodatkowego budżetu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Status Quo */}
            <div
              data-selected={selectedStrategy === "baseline"}
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                selectedStrategy === "baseline"
                  ? "bg-brand-subtle/15 border-brand/60 ring-1 ring-brand/30"
                  : "bg-surface-2/40 border-border/80"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-surface border border-border text-text-muted flex items-center justify-center shrink-0">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="font-bold text-text-main text-xs truncate">Status Quo (Plan bazowy)</h5>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {selectedStrategy === "baseline" ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand text-text-inverse">
                        Aktualnie wybrana
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                        Baza
                      </span>
                    )}
                  </div>
                </div>

                <p>
                  <strong>Zasada:</strong> Punkt odniesienia oparty na bieżących założeniach spłaty.
                </p>
                <p>
                  <strong>Działanie:</strong> Nie dodaje dodatkowej kolejności kierowania nadpłat.
                </p>
                <p>
                  <strong>Zastosowanie:</strong> Służy jako baza do odczytania różnic między scenariuszami.
                </p>
              </div>

              {onSelectStrategy && (
                <div className="pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => onSelectStrategy("baseline")}
                    aria-pressed={selectedStrategy === "baseline"}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer ${
                      selectedStrategy === "baseline"
                        ? "bg-brand text-text-inverse shadow-xs"
                        : "bg-surface border border-border hover:bg-surface-hover text-text-main"
                    }`}
                  >
                    {selectedStrategy === "baseline" ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aktywna strategia bazowa</span>
                      </>
                    ) : (
                      <>
                        <span>Wybierz plan bazowy</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 2. Avalanche */}
            <div
              data-selected={selectedStrategy === "avalanche"}
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                selectedStrategy === "avalanche"
                  ? "bg-brand-subtle/15 border-brand/60 ring-1 ring-brand/30"
                  : "bg-surface-2/40 border-border/80"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-brand-subtle text-brand flex items-center justify-center shrink-0 border border-brand/20">
                      <Percent className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="font-bold text-text-main text-xs truncate">Lawina (Avalanche)</h5>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    {recommendedStrategy === "avalanche" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <ThumbsUp className="w-2.5 h-2.5" />
                        <span>Sugerowana</span>
                      </span>
                    )}
                    {selectedStrategy === "avalanche" ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand text-text-inverse">
                        Aktualnie wybrana
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                        Oprocentowanie
                      </span>
                    )}
                  </div>
                </div>

                <p>
                  <strong>Priorytet:</strong> Nadpłata jest kierowana najpierw na zobowiązanie z najwyższym oprocentowaniem.
                </p>
                <p>
                  <strong>Koszt odsetek:</strong> Kolejność może ograniczać naliczane odsetki w modelu, ale wynik zależy od danych i założeń symulacji.
                </p>
                <p>
                  <strong>Charakter:</strong> To opis mechanizmu, a nie indywidualna rekomendacja.
                </p>
              </div>

              {onSelectStrategy && (
                <div className="pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => onSelectStrategy("avalanche")}
                    aria-pressed={selectedStrategy === "avalanche"}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer ${
                      selectedStrategy === "avalanche"
                        ? "bg-brand text-text-inverse shadow-xs"
                        : "bg-surface border border-border hover:bg-surface-hover text-text-main"
                    }`}
                  >
                    {selectedStrategy === "avalanche" ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Wybrana metoda Lawiny</span>
                      </>
                    ) : (
                      <>
                        <span>Wybierz metodę Lawiny</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 3. Snowball */}
            <div
              data-selected={selectedStrategy === "snowball"}
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                selectedStrategy === "snowball"
                  ? "bg-brand-subtle/15 border-brand/60 ring-1 ring-brand/30"
                  : "bg-surface-2/40 border-border/80"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-brand-subtle text-brand flex items-center justify-center shrink-0 border border-brand/20">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="font-bold text-text-main text-xs truncate">Kula Śnieżna (Snowball)</h5>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    {recommendedStrategy === "snowball" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <ThumbsUp className="w-2.5 h-2.5" />
                        <span>Sugerowana</span>
                      </span>
                    )}
                    {selectedStrategy === "snowball" ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand text-text-inverse">
                        Aktualnie wybrana
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                        Najmniejsze saldo
                      </span>
                    )}
                  </div>
                </div>

                <p>
                  <strong>Priorytet:</strong> Nadpłata jest kierowana najpierw na zobowiązanie z najniższym saldem.
                </p>
                <p>
                  <strong>Kamienie milowe:</strong> Strategia pokazuje wcześniejsze zamykanie mniejszych zobowiązań w modelu.
                </p>
                <p>
                  <strong>Koszty:</strong> Nie oznacza automatycznie niższego kosztu odsetkowego.
                </p>
              </div>

              {onSelectStrategy && (
                <div className="pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => onSelectStrategy("snowball")}
                    aria-pressed={selectedStrategy === "snowball"}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer ${
                      selectedStrategy === "snowball"
                        ? "bg-brand text-text-inverse shadow-xs"
                        : "bg-surface border border-border hover:bg-surface-hover text-text-main"
                    }`}
                  >
                    {selectedStrategy === "snowball" ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Wybrana Kula Śnieżna</span>
                      </>
                    ) : (
                      <>
                        <span>Wybierz Kulę Śnieżną</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 4. Custom */}
            <div
              data-selected={selectedStrategy === "custom"}
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                selectedStrategy === "custom"
                  ? "bg-brand-subtle/15 border-brand/60 ring-1 ring-brand/30"
                  : "bg-surface-2/40 border-border/80"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-brand-subtle text-brand flex items-center justify-center shrink-0 border border-brand/20">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <h5 className="font-bold text-text-main text-xs truncate">Własna kolejność (Custom)</h5>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {selectedStrategy === "custom" ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand text-text-inverse">
                        Aktualnie wybrana
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                        Ręczna
                      </span>
                    )}
                  </div>
                </div>

                <p>
                  <strong>Priorytet:</strong> Kolejność spłaty ustalana jest ręcznie przez użytkownika w panelu priorytetyzacji.
                </p>
                <p>
                  <strong>Kaskada:</strong> Cała nadpłata trafia na cel nr 1, a po jego spłacie uwolniona rata zasila kolejne pozycje.
                </p>
                <p>
                  <strong>Wynik:</strong> Koszt i czas spłaty wynikają wprost ze wskazanej kolejności celów.
                </p>
              </div>

              {onSelectStrategy && (
                <div className="pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => onSelectStrategy("custom")}
                    aria-pressed={selectedStrategy === "custom"}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer ${
                      selectedStrategy === "custom"
                        ? "bg-brand text-text-inverse shadow-xs"
                        : "bg-surface border border-border hover:bg-surface-hover text-text-main"
                    }`}
                  >
                    {selectedStrategy === "custom" ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Wybrana kolejność własna</span>
                      </>
                    ) : (
                      <>
                        <span>Wybierz kolejność własną</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SECTION: METRIC EXPLANATIONS (Sprint 32) */}
          <div className="space-y-3 pt-3 border-t border-border/60">
            <div>
              <h5 className="font-bold text-text-main text-xs">
                Jak interpretować wyniki symulacji?
              </h5>
              <p className="text-[11px] text-text-muted mt-0.5">
                Krótki opis tego, co oznaczają wskaźniki widoczne w porównaniu strategii.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* 1. Data spłaty (Wolność od długu) */}
              <div className="p-3 rounded-xl bg-surface-2/30 border border-border/80 space-y-1">
                <span className="font-bold text-text-main text-xs block">
                  Wolność od długu (data spłaty)
                </span>
                <p className="text-[11px] text-text-muted">
                  Pokazuje przewidywany moment pełnej spłaty w modelu symulacji przy zachowaniu terminowych wpłat i stałej nadpłaty. Nie jest gwarancją rzeczywistego terminu.
                </p>
              </div>

              {/* 2. Zaoszczędzone odsetki */}
              <div className="p-3 rounded-xl bg-surface-2/30 border border-border/80 space-y-1">
                <span className="font-bold text-text-main text-xs block">
                  Zaoszczędzone odsetki
                </span>
                <p className="text-[11px] text-text-muted">
                  Pokazuje modelową różnicę kosztu odsetek względem planu bazowego (Status Quo). To porównanie teoretyczne w ramach modelu, a nie obietnica oszczędności.
                </p>
              </div>

              {/* 3. Zaoszczędzony czas */}
              <div className="p-3 rounded-xl bg-surface-2/30 border border-border/80 space-y-1">
                <span className="font-bold text-text-main text-xs block">
                  Zaoszczędzony czas
                </span>
                <p className="text-[11px] text-text-muted">
                  Pokazuje orientacyjne skrócenie czasu spłaty (w miesiącach i latach) względem planu bazowego (Status Quo).
                </p>
              </div>

              {/* 4. Łączny koszt odsetek */}
              <div className="p-3 rounded-xl bg-surface-2/30 border border-border/80 space-y-1">
                <span className="font-bold text-text-main text-xs block">
                  Łączny koszt odsetek
                </span>
                <p className="text-[11px] text-text-muted">
                  Pokazuje całkowitą sumę odsetek naliczonych przez cały okres spłaty w danym scenariuszu. Wartość zależy od przyjętych założeń oprocentowania i rat.
                </p>
              </div>

              {/* 5. Harmonogram i kolejność spłaty */}
              <div className="p-3 rounded-xl bg-surface-2/30 border border-border/80 space-y-1 sm:col-span-2">
                <span className="font-bold text-text-main text-xs block">
                  Harmonogram i kolejność spłaty
                </span>
                <p className="text-[11px] text-text-muted">
                  Wizualizuje modelową sekwencję zamykania kolejnych zobowiązań. Po spłaceniu długu uwolniona rata zasila kolejny cel, przyspieszając realizację całego planu.
                </p>
              </div>
            </div>
          </div>

          {/* Educational Disclaimer */}
          <div className="text-[11px] text-text-muted flex items-start gap-2.5 bg-surface-2 p-3.5 rounded-xl border border-border">
            <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <p>
              <strong>Zastrzeżenie edukacyjne:</strong> Wskaźniki pokazują wynik modelu na podstawie bieżących danych i przyjętych założeń. Nie stanowią porady finansowej ani gwarancji przyszłego wyniku.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
