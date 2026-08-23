import React from "react";
import {
  GitCompare,
  Sparkles,
  Bookmark,
  Save,
  Edit3,
  Copy,
  Trash2,
  Info
} from "lucide-react";
import {
  SupportedCurrency,
  DebtPayoffScenario
} from "../../types";
import { formatMoney } from "../../utils/format";

export type DebtPayoffStrategyType = "avalanche" | "snowball" | "custom" | "baseline";

export interface WhatIfImpactSummary {
  durDiff: number;
  intDiff: number;
  debtFreeDate: string;
}

export interface SavedScenarioPreview {
  debtFreeDate: string;
  totalInterestPaid: number;
}

export interface DebtScenarioConfigSectionProps {
  monthlyDebtService: number;
  extraMonthlyPayoff: number;
  currency: SupportedCurrency;
  onExtraMonthlyPayoffChange: (amount: number) => void;

  selectedPayoffStrategy: DebtPayoffStrategyType;

  oneTimeOverpayment: number;
  onOneTimeOverpaymentChange: (amount: number) => void;

  previewStrategy: DebtPayoffStrategyType | null;
  onPreviewStrategyChange: (strategy: DebtPayoffStrategyType | null) => void;

  isWhatIfExpanded: boolean;
  onToggleWhatIfExpanded: () => void;
  onResetWhatIf: () => void;

  whatIfImpact?: WhatIfImpactSummary | null;

  savedScenarios: DebtPayoffScenario[];
  savedScenarioPreviews?: Record<string, SavedScenarioPreview>;
  validSelectedScenarioIds: string[];
  onToggleSelectScenario: (scenarioId: string) => void;
  onOpenCompareScenarios: () => void;
  onOpenSaveScenario: () => void;
  onLoadScenario: (scenario: DebtPayoffScenario) => void;
  onOpenRenameScenario: (scenario: DebtPayoffScenario) => void;
  onOpenDuplicateScenario: (scenario: DebtPayoffScenario) => void;
  onDeleteScenario?: (scenarioId: string) => void;
}

export function DebtScenarioConfigSection({
  monthlyDebtService,
  extraMonthlyPayoff,
  currency,
  onExtraMonthlyPayoffChange,
  selectedPayoffStrategy,
  oneTimeOverpayment,
  onOneTimeOverpaymentChange,
  previewStrategy,
  onPreviewStrategyChange,
  isWhatIfExpanded,
  onToggleWhatIfExpanded,
  onResetWhatIf,
  whatIfImpact,
  savedScenarios,
  savedScenarioPreviews = {},
  validSelectedScenarioIds,
  onToggleSelectScenario,
  onOpenCompareScenarios,
  onOpenSaveScenario,
  onLoadScenario,
  onOpenRenameScenario,
  onOpenDuplicateScenario,
  onDeleteScenario
}: DebtScenarioConfigSectionProps) {
  return (
    <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border space-y-4">
      {/* 1. Header & Total Monthly Service */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-text-main flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-brand" />
            Symulator strategii spłaty całego portfela
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Porównaj spłatę metodą Lawiny (Avalanche) i Kuli Śnieżnej (Snowball) z mechanizmem kaskadowego przenoszenia rat.
          </p>
        </div>

        <div className="bg-surface-2 px-3.5 py-2 rounded-xl border border-border flex items-center gap-3">
          <span className="text-xs text-text-faint font-semibold">Łączna miesięczna wpłata:</span>
          <span className="text-sm font-black text-text-main tabular-nums">
            {formatMoney(monthlyDebtService + extraMonthlyPayoff, currency)} / mc
          </span>
        </div>
      </div>

      {/* 2. Extra Monthly Payoff Input & Presets */}
      <div className="pt-2 border-t border-border/60">
        <div className="flex items-center justify-between gap-2 mb-2">
          <label htmlFor="extra-monthly-payoff-input" className="block text-xs font-bold text-text-faint uppercase tracking-wider">
            Dodatkowy budżet na nadpłatę (ponad minimalne raty)
          </label>
          {extraMonthlyPayoff > 0 && (
            <button
              type="button"
              onClick={() => onExtraMonthlyPayoffChange(0)}
              className="text-xs font-bold text-text-muted hover:text-brand transition cursor-pointer"
            >
              Wyzeruj (0 zł)
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-40">
            <input
              id="extra-monthly-payoff-input"
              type="number"
              min="0"
              step="50"
              value={extraMonthlyPayoff === 0 ? "" : extraMonthlyPayoff}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onExtraMonthlyPayoffChange(isNaN(val) || val < 0 ? 0 : val);
              }}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-12"
              placeholder="0"
            />
            <span className="absolute right-3 top-2 text-xs text-text-muted font-bold pointer-events-none">
              {currency}
            </span>
          </div>

          {/* Preset buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[0, 200, 500, 1000, 2000].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => onExtraMonthlyPayoffChange(amount)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  extraMonthlyPayoff === amount
                    ? "bg-brand text-text-inverse border-brand shadow-xs"
                    : "bg-surface-2 text-text-muted hover:text-text-main border-border"
                }`}
              >
                +{formatMoney(amount, currency)}
              </button>
            ))}
          </div>
        </div>

        {extraMonthlyPayoff === 0 && (
          <div className="mt-3 p-3 bg-surface-2/60 border border-border/80 rounded-xl text-xs text-text-muted">
            <p>
              Przy nadpłacie 0 zł symulacja nie dodaje dodatkowego budżetu do spłaty. Wyniki strategii mogą być takie same lub bardzo zbliżone do planu bazowego.
            </p>
          </div>
        )}
      </div>

      {/* 3. SPRINT 14: WHAT-IF PLANNING PANEL */}
      <div className="pt-3 border-t border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            id="btn-toggle-what-if"
            onClick={onToggleWhatIfExpanded}
            aria-expanded={isWhatIfExpanded}
            aria-controls="what-if-planning-panel"
            className="flex items-center gap-2 text-xs font-bold text-text-main hover:text-brand transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-brand" />
            <span>Symulacja wariantowa (What-If)</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-subtle text-brand border border-brand/20">
              {oneTimeOverpayment > 0 || previewStrategy ? "Aktywna symulacja" : "Opcjonalnie"}
            </span>
          </button>

          {(oneTimeOverpayment > 0 || previewStrategy) && (
            <button
              type="button"
              onClick={onResetWhatIf}
              className="text-xs font-bold text-text-muted hover:text-danger transition cursor-pointer"
              aria-label="Zresetuj parametry symulacji What-If"
            >
              Zresetuj symulację
            </button>
          )}
        </div>

        {isWhatIfExpanded && (
          <div
            id="what-if-planning-panel"
            className="p-4 bg-surface-2/50 rounded-xl border border-border space-y-3.5 animate-fade-in text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. One-time overpayment input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="one-time-overpayment-input"
                    className="font-bold text-text-faint uppercase text-[10px] tracking-wider"
                  >
                    Jednorazowa nadpłata
                  </label>
                  {oneTimeOverpayment > 0 && (
                    <button
                      type="button"
                      onClick={() => onOneTimeOverpaymentChange(0)}
                      className="text-[11px] font-bold text-text-muted hover:text-brand transition cursor-pointer"
                      aria-label="Wyzeruj jednorazową nadpłatę"
                    >
                      Wyzeruj (0 zł)
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="one-time-overpayment-input"
                    type="number"
                    min="0"
                    step="500"
                    value={oneTimeOverpayment === 0 ? "" : oneTimeOverpayment}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onOneTimeOverpaymentChange(isNaN(val) || val < 0 ? 0 : val);
                    }}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-12"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-2 text-xs text-text-muted font-bold pointer-events-none">
                    {currency}
                  </span>
                </div>
                <p className="text-[10px] text-text-faint mt-1">
                  Symulowany jednorazowy zastrzyk gotówki w 1. miesiącu planu.
                </p>
              </div>

              {/* 2. Strategy What-If Switch */}
              <div>
                <span className="font-bold text-text-faint uppercase text-[10px] tracking-wider block mb-1.5">
                  Podgląd alternatywnej strategii
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "avalanche" as const, label: "Lawina" },
                    { id: "snowball" as const, label: "Kula Śnieżna" },
                    { id: "custom" as const, label: "Własna" },
                    { id: "baseline" as const, label: "Status Quo" }
                  ].map((st) => {
                    const isCurrentMain = selectedPayoffStrategy === st.id;
                    const isPreviewActive = previewStrategy === st.id;

                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          if (isPreviewActive) {
                            onPreviewStrategyChange(null);
                          } else {
                            onPreviewStrategyChange(st.id);
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg font-bold text-xs border transition cursor-pointer text-center ${
                          isPreviewActive
                            ? "bg-brand text-text-inverse border-brand shadow-xs"
                            : isCurrentMain
                            ? "bg-surface border-brand/50 text-brand ring-1 ring-brand/30"
                            : "bg-surface text-text-muted hover:text-text-main border-border"
                        }`}
                      >
                        {st.label} {isCurrentMain && !isPreviewActive ? "(Bieżąca)" : ""}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-text-faint mt-1">
                  Kliknij, aby tymczasowo podejrzeć wynik innej metody.
                </p>
              </div>
            </div>

            {/* 3. Action-oriented What-if Result Summary */}
            {(oneTimeOverpayment > 0 || previewStrategy) && whatIfImpact && (
              <div className="p-3 bg-surface rounded-xl border border-brand/30 space-y-1.5 animate-fade-in" id="what-if-result-summary-box">
                <div className="flex items-center gap-1.5 font-bold text-text-main text-xs">
                  <Info className="w-3.5 h-3.5 text-brand" />
                  <span>Wpływ symulacji na plan spłaty:</span>
                </div>
                <ul className="space-y-1 pl-5 list-disc text-text-muted text-[11px] leading-relaxed">
                  <li>
                    {whatIfImpact.durDiff > 0
                      ? `Wariant symulacyjny skraca orientacyjny czas spłaty o ${whatIfImpact.durDiff} ${
                          whatIfImpact.durDiff === 1 ? "miesiąc" : whatIfImpact.durDiff < 5 ? "miesiące" : "miesięcy"
                        }.`
                      : whatIfImpact.durDiff < 0
                      ? `Wariant symulacyjny wydłuża orientacyjny czas spłaty o ${Math.abs(whatIfImpact.durDiff)} ${
                          Math.abs(whatIfImpact.durDiff) === 1 ? "miesiąc" : Math.abs(whatIfImpact.durDiff) < 5 ? "miesiące" : "miesięcy"
                        }.`
                      : "Termin spłaty pozostaje orientacyjnie taki sam."}
                  </li>
                  {whatIfImpact.intDiff !== 0 && (
                    <li>
                      {whatIfImpact.intDiff > 0
                        ? `Szacowany koszt odsetek jest niższy o około ${formatMoney(whatIfImpact.intDiff, currency)}.`
                        : `Szacowany koszt odsetek jest wyższy o około ${formatMoney(Math.abs(whatIfImpact.intDiff), currency)}.`}
                    </li>
                  )}
                  <li>
                    Szacowany termin spłaty: <strong className="text-text-main font-bold">{whatIfImpact.debtFreeDate}</strong>.
                  </li>
                </ul>
                <p className="text-[10px] text-text-faint pt-1 border-t border-border/40">
                  Szacunek na podstawie podanych danych. Parametr tymczasowej symulacji — nie modyfikuje zapisanych scenariuszy.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Saved Scenarios Sub-section */}
      <div className="pt-3 border-t border-border/60 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-brand shrink-0" />
            <span className="text-xs font-bold text-text-main">
              Zapisane scenariusze ({savedScenarios.length} / 5)
            </span>
          </div>

<div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button
              type="button"
              id="btn-compare-scenarios"
              onClick={onOpenCompareScenarios}
              disabled={savedScenarios.length < 2 || validSelectedScenarioIds.length < 2}
              aria-disabled={savedScenarios.length < 2 || validSelectedScenarioIds.length < 2}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface text-text-main text-xs font-bold hover:bg-surface-hover hover:border-brand/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shadow-2xs"
              aria-label={`Porównaj scenariusze (wybrano ${validSelectedScenarioIds.length} z 2)`}
              title={
                savedScenarios.length < 2
                  ? "Wymaga co najmniej 2 zapisanych scenariuszy"
                  : validSelectedScenarioIds.length < 2
                  ? "Zaznacz 2 scenariusze do porównania"
                  : "Otwórz porównanie wybranych 2 scenariuszy"
              }
            >
              <GitCompare className="w-3.5 h-3.5 text-brand" />
              <span>Porównaj scenariusze ({validSelectedScenarioIds.length} / 2)</span>
            </button>
            {(savedScenarios.length < 2 || validSelectedScenarioIds.length < 2) && (
              <p className="text-xs text-text-muted mt-1">
                {savedScenarios.length < 2
                  ? "Zapisz przynajmniej dwa scenariusze, aby móc je porównać."
                  : "Wybierz dwa scenariusze do porównania."}
              </p>
            )}

            <button
              type="button"
              id="btn-save-scenario"
              onClick={() => onOpenSaveScenario()}
              disabled={savedScenarios.length >= 5}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand/30 bg-brand-subtle text-brand text-xs font-bold hover:bg-brand hover:text-text-inverse transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Zapisz bieżący plan</span>
            </button>
          </div>
        </div>

        {savedScenarios.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {savedScenarios.map((sc) => {
              const isSelected = validSelectedScenarioIds.includes(sc.id);
              const strategyLabel =
                sc.strategy === "avalanche"
                  ? "Lawina"
                  : sc.strategy === "snowball"
                  ? "Kula Śnieżna"
                  : sc.strategy === "custom"
                  ? "Własna kolejność"
                  : "Status Quo";

              const scPreview = savedScenarioPreviews[sc.id];

              return (
                <div
                  key={sc.id}
                  className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition shadow-2xs ${
                    isSelected
                      ? "bg-brand-subtle/20 border-brand ring-1 ring-brand/30"
                      : "bg-surface border-border hover:border-brand/30"
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <label className="flex items-center gap-2">
                       <input
                         type="checkbox"
                         checked={isSelected}
                         disabled={!isSelected && validSelectedScenarioIds.length >= 2}
                         onChange={() => onToggleSelectScenario(sc.id)}
                         aria-label={`Wybierz scenariusz ${sc.name} do porównania`}
                         className="w-5 h-5 rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer shrink-0 disabled:opacity-30 disabled:cursor-not-allowed mt-0.5"
                         title={
                           !isSelected && validSelectedScenarioIds.length >= 2
                             ? "Możesz wybrać maksymalnie 2 scenariusze"
                             : undefined
                         }
                       />
                       {/* Visually hidden text for screen readers */}
                        <span className="sr-only" aria-label={sc.name} aria-hidden="true"></span>
                     </label>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-text-main truncate" title={sc.name}>
                          {sc.name}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-surface-2 text-text-muted border border-border shrink-0">
                          {strategyLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-muted space-y-0.5">
                        <div>
                          Nadpłata: <strong className="text-brand font-bold tabular-nums">+{formatMoney(sc.extraMonthlyPayment, currency)} / mc</strong>
                        </div>
                        {scPreview && (
                          <div className="flex items-center gap-2 text-[10px] text-text-faint pt-0.5">
                            <span>Termin: <strong className="text-text-main font-semibold">{scPreview.debtFreeDate}</strong></span>
                            <span>•</span>
                            <span>Odsetki: <strong className="text-text-main font-semibold tabular-nums">{formatMoney(scPreview.totalInterestPaid, currency)}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 shrink-0 pt-2 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => onLoadScenario(sc)}
                      aria-label={`Wczytaj scenariusz ${sc.name}`}
                      className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-brand hover:text-text-inverse text-text-main text-[11px] font-bold border border-border hover:border-brand transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      Wczytaj
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenRenameScenario(sc)}
                      aria-label={`Zmień nazwę scenariusza ${sc.name}`}
                      className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                      title="Zmień nazwę"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDuplicateScenario(sc)}
                      disabled={savedScenarios.length >= 5}
                      aria-label={`Duplikuj scenariusz ${sc.name}`}
                      className="p-1.5 rounded-lg text-text-muted hover:text-brand hover:bg-brand-subtle transition disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                      title={
                        savedScenarios.length >= 5
                          ? "Osiągnięto limit 5 zapisanych scenariuszy"
                          : "Duplikuj scenariusz"
                      }
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {onDeleteScenario && (
                      <button
                        type="button"
                        onClick={() => onDeleteScenario(sc.id)}
                        aria-label={`Usuń scenariusz ${sc.name}`}
                        className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-subtle transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                        title="Usuń scenariusz"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-text-muted">
            Brak zapisanych scenariuszy. Możesz zapisać do 5 wariantów nadpłat i strategii, aby łatwo je odtwarzać.
          </p>
        )}
      </div>
    </div>
  );
}
