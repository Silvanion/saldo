import React from "react";
import {
  GitCompare,
  Sparkles,
  Bookmark,
  Save,
  Edit3,
  Copy,
  Trash2,
  Info,
  Calendar
} from "lucide-react";
import {
  SupportedCurrency,
  DebtPayoffScenario
} from "../../types";
import { formatMoney, getScheduledOverpaymentBadgeLabel } from "../../utils/format";

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

  oneTimeOverpayments: { month: number; amount: number }[];
  onOneTimeOverpaymentsChange: (schedule: { month: number; amount: number }[]) => void;

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
  oneTimeOverpayments,
  onOneTimeOverpaymentsChange,
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
              className="text-xs font-bold text-text-muted hover:text-brand transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] rounded px-1.5 py-0.5"
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
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none tabular-nums pr-12"
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
                className={`px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
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
            className="flex items-center gap-2 text-xs font-bold text-text-main hover:text-brand transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none rounded-lg p-1"
          >
            <Sparkles className="w-4 h-4 text-brand" />
            <span>Symulacja wariantowa (What-If)</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-subtle text-brand border border-brand/20">
              {oneTimeOverpayments.length > 0 || previewStrategy ? "Aktywna symulacja" : "Opcjonalnie"}
            </span>
          </button>

          {(oneTimeOverpayments.length > 0 || previewStrategy) && (
            <button
              type="button"
              onClick={onResetWhatIf}
              className="text-xs font-bold text-text-muted hover:text-danger transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] rounded px-1.5 py-0.5"
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
              {/* 1. Overpayment schedule input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-text-faint uppercase text-xs tracking-wider">
                    Harmonogram Nadpłat
                  </span>
                  <button
                    type="button"
                    onClick={() => onOneTimeOverpaymentsChange([...oneTimeOverpayments, { month: 1, amount: 0 }])}
                    className="text-xs font-bold text-brand hover:text-brand-emphasis transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none rounded px-1"
                  >
                    + Dodaj wpłatę
                  </button>
                </div>
                
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {oneTimeOverpayments.map((op, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <div className="flex-1 relative">
                        <span className="absolute left-2 top-2 text-xs text-text-muted font-bold pointer-events-none">Msc:</span>
                        <input
                          type="number"
                          min="1"
                          value={op.month}
                          onChange={(e) => {
                            const newArr = [...oneTimeOverpayments];
                            newArr[idx].month = parseInt(e.target.value) || 1;
                            onOneTimeOverpaymentsChange(newArr);
                          }}
                          className="w-full bg-surface border border-border rounded-lg pl-8 pr-2 py-1.5 text-xs font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
                        />
                      </div>
                      <div className="flex-1 relative">
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={op.amount === 0 ? "" : op.amount}
                          placeholder="0"
                          onChange={(e) => {
                            const newArr = [...oneTimeOverpayments];
                            const val = parseFloat(e.target.value);
                            newArr[idx].amount = isNaN(val) || val < 0 ? 0 : val;
                            onOneTimeOverpaymentsChange(newArr);
                          }}
                          className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none tabular-nums pr-8"
                        />
                        <span className="absolute right-2 top-1.5 text-xs text-text-muted font-bold pointer-events-none">{currency}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOneTimeOverpaymentsChange(oneTimeOverpayments.filter((_, i) => i !== idx))}
                        className="text-danger opacity-70 hover:opacity-100 p-1 cursor-pointer font-bold focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none rounded"
                        aria-label="Usuń nadpłatę"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {oneTimeOverpayments.length === 0 && (
                    <div className="text-xs font-bold text-text-muted text-center py-2.5 border border-dashed border-border rounded-lg">
                      Brak zaplanowanych nadpłat
                    </div>
                  )}
                </div>
                <p className="text-xs text-text-faint mt-1.5 leading-tight">
                  Wprowadź miesiąc (np. 1 = teraz, 12 = za rok) i kwotę.
                </p>
              </div>

              {/* 2. Strategy What-If Switch */}
              <div>
                <span className="font-bold text-text-faint uppercase text-xs tracking-wider block mb-1.5">
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
                        className={`px-2.5 py-1.5 rounded-lg font-bold text-xs border transition cursor-pointer text-center focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
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
                <p className="text-xs text-text-faint mt-1">
                  Kliknij, aby tymczasowo podejrzeć wynik innej metody.
                </p>
              </div>
            </div>

            {/* 3. Action-oriented What-if Result Summary */}
            {(oneTimeOverpayments.length > 0 || previewStrategy) && whatIfImpact && (
              <div className="p-3 bg-surface rounded-xl border border-brand/30 space-y-1.5 animate-fade-in" id="what-if-result-summary-box">
                <div className="flex items-center gap-1.5 font-bold text-text-main text-xs">
                  {/* Zakładam, że Info to ikona, jeśli jej brakuje w importach, należy ją zignorować. Domyślam się, że tam była ikona, bo usunąłem ją w replace. Zrobię fallback na prosty SVG lub sam tekst. A zaraz, widzę ją w oryginale. Mam nadzieję, że jest zaimportowana. Tak, w view_file widzę <Info className=.../> */}
                  <span className="text-brand">ℹ</span>
                  <span>Wpływ symulacji na plan spłaty:</span>
                </div>
                <ul className="space-y-1 pl-5 list-disc text-text-muted text-xs leading-relaxed">
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
                <p className="text-xs text-text-faint pt-1 border-t border-border/40">
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface text-text-main text-xs font-bold hover:bg-surface-hover hover:border-brand/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] shadow-2xs"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand/30 bg-brand-subtle text-brand text-xs font-bold hover:bg-brand hover:text-text-inverse transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] shadow-2xs"
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
              const overpaymentsBadge = getScheduledOverpaymentBadgeLabel(sc.oneTimeOverpayments);

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
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-surface-2 text-text-muted border border-border shrink-0">
                          {strategyLabel}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted space-y-0.5">
                        <div>
                          Nadpłata: <strong className="text-brand font-bold tabular-nums">+{formatMoney(sc.extraMonthlyPayment, currency)} / mc</strong>
                        </div>
                        {scPreview && (
                          <div className="flex items-center gap-2 text-xs text-text-faint pt-0.5">
                            <span>Termin: <strong className="text-text-main font-semibold">{scPreview.debtFreeDate}</strong></span>
                            <span>•</span>
                            <span>Odsetki: <strong className="text-text-main font-semibold tabular-nums">{formatMoney(scPreview.totalInterestPaid, currency)}</strong></span>
                          </div>
                        )}
                        {overpaymentsBadge && (
                          <div className="flex items-center gap-1.5 pt-1.5 pb-0.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-brand-subtle text-brand text-xs font-bold border border-brand/20">
                              <Calendar className="w-2.5 h-2.5" />
                              {overpaymentsBadge}
                            </span>
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
                      className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-brand hover:text-text-inverse text-text-main text-xs font-bold border border-border hover:border-brand transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                    >
                      Wczytaj
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenRenameScenario(sc)}
                      aria-label={`Zmień nazwę scenariusza ${sc.name}`}
                      className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                      title="Zmień nazwę"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDuplicateScenario(sc)}
                      disabled={savedScenarios.length >= 5}
                      aria-label={`Duplikuj scenariusz ${sc.name}`}
                      className="p-1.5 rounded-lg text-text-muted hover:text-brand hover:bg-brand-subtle transition disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
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
                        className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-subtle transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
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
          <p className="text-xs text-text-muted">
            Brak zapisanych scenariuszy. Możesz zapisać do 5 wariantów nadpłat i strategii, aby łatwo je odtwarzać.
          </p>
        )}
      </div>
    </div>
  );
}
