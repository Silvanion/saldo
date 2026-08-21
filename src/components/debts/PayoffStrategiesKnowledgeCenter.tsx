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

export function PayoffStrategiesKnowledgeCenter() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden transition-all shadow-2xs">
      {/* Trigger Button */}
      <button
        type="button"
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
              Jak działają strategie spłaty zadłużenia?
            </h4>
            <p className="text-xs text-text-muted mt-0.5">
              Przewodnik po różnicach matematycznych, psychologicznych i zasadach kolejności
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
          <p className="pt-2 text-text-main font-medium">
            W tym symulatorze każda strategia zakłada terminowe opłacanie minimalnych rat wszystkich czynnych zobowiązań, a zadeklarowana miesięczna nadwyżka jest w 100% kierowana na jedno zobowiązanie o najwyższym priorytecie. Po jego spłaceniu, cała uwolniona kwota przechodzi na kolejne (efekt kaskadowy).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Avalanche */}
            <div className="p-4 rounded-xl bg-surface-2/40 border border-border/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-brand-subtle text-brand flex items-center justify-center">
                    <Percent className="w-3.5 h-3.5" />
                  </div>
                  <h5 className="font-bold text-text-main text-xs">Metoda Lawiny (Avalanche)</h5>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                  Matematyczna
                </span>
              </div>
              <p>
                <strong>Zasada kolejności:</strong> Priorytet otrzymuje zobowiązanie o najwyższej rocznej stopie oprocentowania (APR), bez względu na wysokość salda.
              </p>
              <p>
                <strong>Aspekt matematyczny:</strong> Z reguły minimalizuje łączną kwotę zapłaconych odsetek w trakcie całego planu spłaty.
              </p>
              <p>
                <strong>Aspekt psychologiczny:</strong> Bywa wybierana przez osoby kierujące się czystą optymalizacją kosztów finansowych, choć pierwszy sukces (całkowita likwidacja pojedynczej umowy) może wymagać dłuższego czasu, jeśli najdroższy kredyt ma wysokie saldo.
              </p>
            </div>

            {/* 2. Snowball */}
            <div className="p-4 rounded-xl bg-surface-2/40 border border-border/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-brand-subtle text-brand flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h5 className="font-bold text-text-main text-xs">Metoda Kuli Śnieżnej (Snowball)</h5>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                  Motywacyjna
                </span>
              </div>
              <p>
                <strong>Zasada kolejności:</strong> Priorytet otrzymuje zobowiązanie o najmniejszym aktualnym saldzie zadłużenia, bez względu na oprocentowanie.
              </p>
              <p>
                <strong>Aspekt matematyczny:</strong> Może wiązać się z nieznacznie wyższym łącznym kosztem odsetek w porównaniu z Lawiną, jeśli najmniejsze kredyty mają niższe stopy niż pozostałe.
              </p>
              <p>
                <strong>Aspekt psychologiczny:</strong> Daje szybkie poczucie postępu poprzez szybkie zamykanie kolejnych umów, co pomaga w utrzymaniu dyscypliny finansowej i budowaniu nawyku spłaty.
              </p>
            </div>

            {/* 3. Custom */}
            <div className="p-4 rounded-xl bg-surface-2/40 border border-border/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-brand-subtle text-brand flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <h5 className="font-bold text-text-main text-xs">Własna kolejność (Custom)</h5>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                  Elastyczna
                </span>
              </div>
              <p>
                <strong>Zasada kolejności:</strong> Kolejność spłaty ustalana jest ręcznie przez użytkownika w panelu priorytetyzacji.
              </p>
              <p>
                <strong>Aspekt matematyczny:</strong> Wynik (koszt odsetek i czas spłaty) zależy wprost od ustalonej sekwencji celów oraz przypisanych im parametrów kredytowych.
              </p>
              <p>
                <strong>Aspekt psychologiczny:</strong> Pozwala uwzględnić indywidualne uwarunkowania życiowe, np. chęć pozbycia się w pierwszej kolejności pożyczki prywatnej, karty kredytowej w nielubianym banku czy kredytu o zmiennej stopie.
              </p>
            </div>

            {/* 4. Status Quo */}
            <div className="p-4 rounded-xl bg-surface-2/40 border border-border/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-surface border border-border text-text-muted flex items-center justify-center">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </div>
                  <h5 className="font-bold text-text-main text-xs">Status Quo (Tylko raty)</h5>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                  Bazowa
                </span>
              </div>
              <p>
                <strong>Zasada kolejności:</strong> Brak dodatkowej nadpłaty. Każde zobowiązanie spłacane jest wyłącznie według minimalnego harmonogramu umownego.
              </p>
              <p>
                <strong>Aspekt matematyczny:</strong> Stanowi punkt odniesienia (baseline). Wiąże się z najdłuższym okresem spłaty i najwyższym łącznym kosztem odsetkowym.
              </p>
              <p>
                <strong>Aspekt psychologiczny:</strong> Nie wymaga wygospodarowywania dodatkowych środków w miesięcznym budżecie domowym.
              </p>
            </div>
          </div>

          {/* Educational Disclaimer */}
          <div className="text-[11px] text-text-muted flex items-start gap-2.5 bg-surface-2 p-3.5 rounded-xl border border-border">
            <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
            <p>
              <strong>Zastrzeżenie edukacyjne:</strong> Przedstawione opisy mają charakter informacyjny i objaśniający działanie symulatora. Wyniki obliczeń są orientacyjnymi symulacjami opartymi na formule annuitetowej i wprowadzonych danych. Prezentowane materiały nie stanowią zindywidualizowanej rekomendacji finansowej ani porady doradcy kredytowego.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
