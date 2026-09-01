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
          className="px-4 pb-6 sm:px-6 sm:pb-8 pt-4 border-t border-border/40 space-y-8 animate-fade-in text-sm text-text-muted leading-relaxed"
        >
          {/* Summary of trade-offs and mechanism */}
          <div className="text-text-main leading-relaxed">
            <p>
              Każda strategia odpowiada na inny priorytet. Wynik zależy od danych i założeń symulacji, dlatego warto porównać kilka wariantów zamiast zakładać, że jeden wariant sprawdzi się najlepiej w każdej sytuacji.
            </p>
            {activeStrategyLabel && (
              <p className="mt-2 text-sm text-brand font-medium">
                Aktualnie symulujesz: {activeStrategyLabel}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Status Quo */}
            <div
              data-selected={selectedStrategy === "baseline"}
              className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                selectedStrategy === "baseline"
                  ? "bg-brand-subtle/10 border-brand/40"
                  : "bg-surface border-border/60"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center shrink-0 text-text-muted">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <h5 className="font-semibold text-text-main text-sm truncate">Status Quo (Plan bazowy)</h5>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedStrategy === "baseline" ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand/10 text-brand">
                        Wybrana
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3 text-sm leading-relaxed text-text-muted">
                  <p>
                    <strong className="text-text-main font-medium">Zasada:</strong> Scenariusz odniesienia oparty wyłącznie na bieżących, minimalnych ratach.
                  </p>
                  <p>
                    <strong className="text-text-main font-medium">Zalety:</strong> Stabilny i w pełni przewidywalny plan spłaty.
                  </p>
                  <p>
                    <strong className="text-text-main font-medium">Ograniczenia:</strong> Brak kaskadowego przyspieszania spłat po zamknięciu celów.
                  </p>
                  <p>
                    <strong className="text-text-main font-medium">Najlepsze dla:</strong> Baza do porównywania wpływu innych strategii nadpłacania.
                  </p>
                </div>
              </div>

              {onSelectStrategy && (
                <div className="pt-4 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => onSelectStrategy("baseline")}
                    aria-pressed={selectedStrategy === "baseline"}
                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 cursor-pointer ${
                      selectedStrategy === "baseline"
                        ? "bg-brand/10 text-brand"
                        : "bg-surface-2/50 text-text-main hover:bg-surface-2"
                    }`}
                  >
                    {selectedStrategy === "baseline" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aktywna</span>
                      </>
                    ) : (
                      <>
                        <span>Zastosuj plan bazowy</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 2. Avalanche */}
            <div
              data-selected={selectedStrategy === "avalanche"}
              className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                selectedStrategy === "avalanche"
                  ? "bg-brand-subtle/10 border-brand/40"
                  : "bg-surface border-border/60"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center shrink-0 text-text-muted">
                      <Percent className="w-4 h-4" />
                    </div>
                    <h5 className="font-semibold text-text-main text-sm truncate">Lawina (Avalanche)</h5>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {recommendedStrategy === "avalanche" && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Sugerowana</span>
                      </span>
                    )}
                    {selectedStrategy === "avalanche" ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand/10 text-brand">
                        Wybrana
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3 text-sm leading-relaxed text-text-muted">
                  <p>
                    <strong className="text-text-main font-medium">Zasada:</strong> Nadpłata jest kierowana w pierwszej kolejności na zobowiązanie z najwyższym oprocentowaniem.
                  </p>
                  <p>
                    <strong className="text-text-main font-medium">Zalety:</strong> Potencjalna minimalizacja odsetek. Oszczędność kapitału poprzez spłatę najdroższego długu.
                  </p>
                  <p>
                    <strong className="text-text-main font-medium">Ograniczenia:</strong> Często wolniejsze poczucie postępu. Skuteczność zależy mocno od poprawnego wpisania bieżących stóp oprocentowania.
                  </p>
                  <p>
                    <strong className="text-text-main font-medium">Najlepsze dla:</strong> Kierowanie budżetu tam, gdzie wygeneruje największy zwrot poprzez uniknięte odsetki.
                  </p>
                </div>
              </div>

              {onSelectStrategy && (
                <div className="pt-4 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => onSelectStrategy("avalanche")}
                    aria-pressed={selectedStrategy === "avalanche"}
                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 cursor-pointer ${
                      selectedStrategy === "avalanche"
                        ? "bg-brand/10 text-brand"
                        : "bg-surface-2/50 text-text-main hover:bg-surface-2"
                    }`}
                  >
                    {selectedStrategy === "avalanche" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aktywna</span>
                      </>
                    ) : (
                      <>
                        <span>Zastosuj Lawinę</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 3. Snowball */}
            <div
              data-selected={selectedStrategy === "snowball"}
              className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                selectedStrategy === "snowball"
                  ? "bg-brand-subtle/10 border-brand/40"
                  : "bg-surface border-border/60"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center shrink-0 text-text-muted">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h5 className="font-semibold text-text-main text-sm truncate">Kula Śnieżna (Snowball)</h5>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {recommendedStrategy === "snowball" && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Sugerowana</span>
                      </span>
                    )}
                    {selectedStrategy === "snowball" ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand/10 text-brand">
                        Wybrana
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3 text-sm leading-relaxed text-text-muted">
                  <p>
                    <strong className="text-text-main font-medium">Zasada:</strong> Nadpłata jest kierowana w pierwszej kolejności na zobowiązanie z najmniejszym saldem.
                  </p>
                  <p>
                    <strong className="text-text-main font-medium">Zalety:</strong> Szybsze zamykanie pojedynczych zobowiązań. Motywacja poprzez szybkie sukcesy i wczesne zwalnianie rat.
                  </p>
                  <p>
                    <strong className="text-text-main font-medium">Ograniczenia:</strong> Zazwyczaj prowadzi do wyższego całkowitego kosztu odsetek w porównaniu z Lawiną.
                  </p>
                  <p>
                    <strong className="text-text-main font-medium">Najlepsze dla:</strong> Budowanie motywacji oraz konieczność szybkiego zmniejszenia liczby płaconych rat miesięcznie.
                  </p>
                </div>
              </div>

              {onSelectStrategy && (
                <div className="pt-4 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => onSelectStrategy("snowball")}
                    aria-pressed={selectedStrategy === "snowball"}
                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 cursor-pointer ${
                      selectedStrategy === "snowball"
                        ? "bg-brand/10 text-brand"
                        : "bg-surface-2/50 text-text-main hover:bg-surface-2"
                    }`}
                  >
                    {selectedStrategy === "snowball" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aktywna</span>
                      </>
                    ) : (
                      <>
                        <span>Zastosuj Kulę Śnieżną</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* 4. Custom */}
            <div
              data-selected={selectedStrategy === "custom"}
              className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                selectedStrategy === "custom"
                  ? "bg-brand-subtle/10 border-brand/40"
                  : "bg-surface border-border/60"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center shrink-0 text-text-muted">
                      <Layers className="w-4 h-4" />
                    </div>
                    <h5 className="font-semibold text-text-main text-sm truncate">Własna kolejność (Custom)</h5>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedStrategy === "custom" ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand/10 text-brand">
                        Wybrana
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3 text-sm leading-relaxed text-text-muted">
                  <p>
                    <strong className="text-text-main font-medium">Zasada:</strong> Użytkownik ręcznie określa listę priorytetów nadpłacania.
                  </p>
                  <p>
                    <strong className="text-text-main font-medium">Zalety:</strong> Pełna osobista elastyczność i kontrola nad spłatą ważnych życiowo celów.
                  </p>
                  <p>
                    <strong className="text-text-main font-medium">Ograniczenia:</strong> Całkowity brak gwarancji optymalności matematycznej pod kątem kosztu lub zaoszczędzonego czasu.
                  </p>
                  <p>
                    <strong className="text-text-main font-medium">Najlepsze dla:</strong> Sytuacje wysoce indywidualne, gdzie czynniki pozafinansowe przeważają nad kosztem (np. pożyczka od rodziny).
                  </p>
                </div>
              </div>

              {onSelectStrategy && (
                <div className="pt-4 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => onSelectStrategy("custom")}
                    aria-pressed={selectedStrategy === "custom"}
                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 cursor-pointer ${
                      selectedStrategy === "custom"
                        ? "bg-brand/10 text-brand"
                        : "bg-surface-2/50 text-text-main hover:bg-surface-2"
                    }`}
                  >
                    {selectedStrategy === "custom" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aktywna</span>
                      </>
                    ) : (
                      <>
                        <span>Zastosuj kolejność własną</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SECTION: METRIC EXPLANATIONS */}
          <div className="space-y-4 pt-6 border-t border-border/40">
            <div>
              <h5 className="font-semibold text-text-main text-sm">
                Jak interpretować wyniki symulacji?
              </h5>
              <p className="text-sm text-text-muted mt-1">
                Krótki opis tego, co oznaczają wskaźniki widoczne w porównaniu strategii.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-surface border border-border/60 space-y-2">
                <span className="font-medium text-text-main text-sm block">
                  Wolność od długu (data spłaty)
                </span>
                <p className="text-sm text-text-muted leading-relaxed">
                  Pokazuje przewidywany moment pełnej spłaty w modelu symulacji przy zachowaniu terminowych wpłat i stałej nadpłaty. Nie jest gwarancją rzeczywistego terminu.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border/60 space-y-2">
                <span className="font-medium text-text-main text-sm block">
                  Zaoszczędzone odsetki
                </span>
                <p className="text-sm text-text-muted leading-relaxed">
                  Pokazuje modelową różnicę kosztu odsetek względem planu bazowego (Status Quo). To porównanie teoretyczne w ramach modelu, a nie obietnica oszczędności.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border/60 space-y-2">
                <span className="font-medium text-text-main text-sm block">
                  Zaoszczędzony czas
                </span>
                <p className="text-sm text-text-muted leading-relaxed">
                  Oznacza liczbę zaoszczędzonych miesięcy w symulacji w stosunku do harmonogramów bazowych, przy założeniu pełnej poprawności i braku zmian stóp w czasie.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border/60 space-y-2">
                <span className="font-medium text-text-main text-sm block">
                  Łączny koszt odsetek
                </span>
                <p className="text-sm text-text-muted leading-relaxed">
                  Pokazuje całkowitą sumę odsetek naliczonych przez cały okres spłaty w danym scenariuszu. Wartość zależy od przyjętych założeń oprocentowania i rat.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border/60 space-y-2 sm:col-span-2">
                <span className="font-medium text-text-main text-sm block">
                  Harmonogram i kolejność spłaty
                </span>
                <p className="text-sm text-text-muted leading-relaxed">
                  Wizualizuje modelową sekwencję zamykania kolejnych zobowiązań. Po spłaceniu długu uwolniona rata zasila kolejny cel, przyspieszając realizację całego planu.
                </p>
              </div>
            </div>
          </div>

          {/* Educational Disclaimer */}
          <div className="pt-6 border-t border-border/40">
            <div className="p-4 rounded-2xl bg-surface-2/50 border border-border/50 text-sm text-text-muted space-y-3 leading-relaxed">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-text-main" />
                <strong className="text-text-main font-medium">Zastrzeżenie edukacyjne</strong>
              </div>
              <p>
                Wszystkie liczby, harmonogramy i nazwy strategii mają charakter wyłącznie edukacyjny i informacyjny. Prezentują one matematyczne modele spłaty oparte na wprowadzonych przez Ciebie danych (saldach, ratach, stopach).
              </p>
              <p>
                Nie stanowią one porady finansowej, inwestycyjnej ani prawnej. Rzeczywiste wyniki u Twoich wierzycieli mogą się różnić w zależności od zapisów w umowach, zmian stóp procentowych oraz kolejności księgowania nadpłat przez bank.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
