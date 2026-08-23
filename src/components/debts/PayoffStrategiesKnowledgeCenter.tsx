import React, { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Percent,
  Layers,
  Sparkles,
  RotateCcw
} from "lucide-react";
import { DebtPayoffStrategyType } from "../../services/debtCalculations";

export interface PayoffStrategiesKnowledgeCenterProps {
  selectedStrategy?: DebtPayoffStrategyType;
}

export function PayoffStrategiesKnowledgeCenter({
  selectedStrategy
}: PayoffStrategiesKnowledgeCenterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getStrategyLabel = (strategy?: DebtPayoffStrategyType) => {
    switch (strategy) {
      case "avalanche":
        return "Lawina (Avalanche)";
      case "snowball":
        return "Kula Śnieżna (Snowball)";
      case "custom":
        return "Własna kolejność (Custom)";
      case "baseline":
        return "Plan bazowy (Status Quo)";
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
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-surface-hover/50 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-hidden"
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
            <div className="pt-2 p-3 rounded-xl bg-brand-subtle/20 border border-brand/30 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
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
          <div className="p-3 rounded-xl bg-surface-2/60 border border-border/80 text-text-main font-medium">
            <p>
              Avalanche porządkuje zobowiązania według oprocentowania, a Snowball według salda. Status Quo pozostaje punktem odniesienia. Wynik symulacji zależy od wprowadzonych danych, rat, oprocentowania i dodatkowego budżetu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Status Quo */}
            <div
              data-selected={selectedStrategy === "baseline"}
              className={`p-4 rounded-xl border space-y-2 transition-all ${
                selectedStrategy === "baseline"
                  ? "bg-brand-subtle/15 border-brand/60 ring-1 ring-brand/30"
                  : "bg-surface-2/40 border-border/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-surface border border-border text-text-muted flex items-center justify-center">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </div>
                  <h5 className="font-bold text-text-main text-xs">Status Quo (Plan bazowy)</h5>
                </div>
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

            {/* 2. Avalanche */}
            <div
              data-selected={selectedStrategy === "avalanche"}
              className={`p-4 rounded-xl border space-y-2 transition-all ${
                selectedStrategy === "avalanche"
                  ? "bg-brand-subtle/15 border-brand/60 ring-1 ring-brand/30"
                  : "bg-surface-2/40 border-border/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-brand-subtle text-brand flex items-center justify-center">
                    <Percent className="w-3.5 h-3.5" />
                  </div>
                  <h5 className="font-bold text-text-main text-xs">Lawina (Avalanche)</h5>
                </div>
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

            {/* 3. Snowball */}
            <div
              data-selected={selectedStrategy === "snowball"}
              className={`p-4 rounded-xl border space-y-2 transition-all ${
                selectedStrategy === "snowball"
                  ? "bg-brand-subtle/15 border-brand/60 ring-1 ring-brand/30"
                  : "bg-surface-2/40 border-border/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-brand-subtle text-brand flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h5 className="font-bold text-text-main text-xs">Kula Śnieżna (Snowball)</h5>
                </div>
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

            {/* 4. Custom */}
            <div
              data-selected={selectedStrategy === "custom"}
              className={`p-4 rounded-xl border space-y-2 transition-all ${
                selectedStrategy === "custom"
                  ? "bg-brand-subtle/15 border-brand/60 ring-1 ring-brand/30"
                  : "bg-surface-2/40 border-border/80"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-brand-subtle text-brand flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <h5 className="font-bold text-text-main text-xs">Własna kolejność (Custom)</h5>
                </div>
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
