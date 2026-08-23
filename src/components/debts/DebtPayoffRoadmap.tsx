import React from "react";
import {
  Calendar,
  ArrowUp,
  ArrowDown,
  Info,
  Sparkles
} from "lucide-react";
import {
  DebtPayoffStrategyType,
  DebtPayoffStrategyResult
} from "../../services/debtCalculations";
import { DebtItem, SupportedCurrency } from "../../types";
import { formatMoney } from "../../utils/format";
import { DebtScenarioFallbackState } from "./DebtScenarioFallbackState";

export interface DebtPayoffRoadmapProps {
  activePlan: DebtPayoffStrategyResult | null;
  activeStrategy: DebtPayoffStrategyType;
  currency: SupportedCurrency;
  activeDebts: DebtItem[];
  validatedCustomOrder: string[];
  onSelectStrategy: (strategy: DebtPayoffStrategyType) => void;
  onMoveDebtUp?: (debtId: string) => void;
  onMoveDebtDown?: (debtId: string) => void;
}

export function DebtPayoffRoadmap({
  activePlan,
  activeStrategy,
  currency,
  activeDebts,
  validatedCustomOrder,
  onSelectStrategy,
  onMoveDebtUp,
  onMoveDebtDown
}: DebtPayoffRoadmapProps) {
  const isCustomOrderIncomplete = activeStrategy === "custom" && !activePlan;

  // Milestone Card calculation / fallback evaluation
  const renderMilestoneCard = () => {
    if (!activePlan || activePlan.debtFreeDate === "Nigdy" || !activePlan.debtFreeDate || activePlan.totalMonths >= 600) {
      if (isCustomOrderIncomplete) {
        return (
          <DebtScenarioFallbackState
            type="custom_order_incomplete"
            onSelectStrategy={onSelectStrategy}
          />
        );
      }
      if (activePlan?.debtFreeDate === "Nigdy" || (activePlan && activePlan.totalMonths >= 600)) {
        return (
          <DebtScenarioFallbackState
            type="calculation_unavailable"
            title="Spłata nieosiągalna przy obecnych parametrach"
            message="Miesięczna kwota spłaty nie wystarcza na pokrycie naliczanych odsetek. Zwiększ miesięczną wpłatę, aby zamknąć zadłużenie."
          />
        );
      }
      return <DebtScenarioFallbackState type="calculation_unavailable" />;
    }

    return (
      <div
        className="bg-surface-2/60 border border-brand/30 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 animate-fade-in"
        id="debt-free-milestone-card"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand flex items-center justify-center shrink-0 border border-brand/20">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-main">
                Kamień milowy spłaty zadłużenia
              </h4>
              <p className="text-[11px] text-text-muted">
                Szacunek dla wybranej metody:{" "}
                <strong className="text-text-main">{activePlan.strategyLabel}</strong>
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] text-text-faint block">Szacowany termin spłaty:</span>
            <span className="text-sm sm:text-base font-black text-brand tabular-nums">
              {activePlan.debtFreeDate}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-surface rounded-xl border border-border/80 space-y-0.5">
            <span className="text-[11px] text-text-faint block">Orientacyjny czas do końca:</span>
            <strong className="text-sm font-bold text-text-main tabular-nums">
              {activePlan.totalMonths} mies.
              {activePlan.totalMonths > 0 && (
                <span className="text-xs font-normal text-text-muted ml-1">
                  (~{Math.round((activePlan.totalMonths / 12) * 10) / 10} lat)
                </span>
              )}
            </strong>
          </div>

          <div className="p-3 bg-surface rounded-xl border border-border/80 space-y-0.5">
            <span className="text-[11px] text-text-faint block">Szacowany koszt odsetek:</span>
            <strong className="text-sm font-bold text-text-main tabular-nums">
              {formatMoney(activePlan.totalInterestPaid, currency)}
            </strong>
          </div>

          <div className="p-3 bg-surface rounded-xl border border-border/80 space-y-0.5">
            <span className="text-[11px] text-text-faint block">Różnica względem wariantu bazowego:</span>
            {activePlan.interestSavedVsBaseline > 0 ? (
              <div>
                <strong className="text-sm font-bold text-brand tabular-nums block">
                  +{formatMoney(activePlan.interestSavedVsBaseline, currency)} oszczędności
                </strong>
                <span className="text-[10px] text-text-faint block">
                  Modelowa różnica względem planu bazowego (Status Quo). Wynik symulacji zależny od przyjętych danych i założeń.
                </span>
              </div>
            ) : activeStrategy === "baseline" ? (
              <span className="text-xs text-text-muted font-medium block">
                Plan odniesienia (Status Quo) — punkt odniesienia bez dodatkowej nadpłaty.
              </span>
            ) : (
              <span className="text-xs text-text-muted font-medium block">
                W tym scenariuszu model nie pokazuje różnicy względem planu bazowego. Wynik zależy od aktualnych danych, rat, oprocentowania i dodatkowego budżetu.
              </span>
            )}
          </div>
        </div>

        <p className="text-[10px] text-text-muted leading-relaxed">
          Na podstawie podanych danych. Wynik jest orientacyjną symulacją matematyczną i zakłada terminowe opłacanie minimalnych rat oraz stałą miesięczną nadpłatę.
        </p>
      </div>
    );
  };

  // Custom Order Reorder Panel
  const renderCustomOrderPanel = () => {
    if (activeStrategy !== "custom" || activeDebts.length === 0) return null;

    return (
      <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h4 className="text-sm font-bold text-text-main flex items-center gap-2">
              <span>Ustal kolejność spłaty</span>
              <span className="text-[11px] font-normal text-text-muted">
                (priorytetyzacja nadpłat)
              </span>
            </h4>
            <p className="text-xs text-text-muted mt-0.5">
              Ustaw kolejność, w jakiej nadwyżka budżetowa będzie likwidować poszczególne zobowiązania. Zmiana pozycji natychmiast aktualizuje poniższy harmonogram.
            </p>
          </div>
          <span className="text-xs font-semibold text-text-faint whitespace-nowrap">
            Liczba aktywnych celów: {activeDebts.length}
          </span>
        </div>

        <div className="space-y-3">
          {validatedCustomOrder.map((id, index) => {
            const debtItem = activeDebts.find((d) => d.id === id);
            if (!debtItem) return null;
            const isFirst = index === 0;
            const isLast = index === validatedCustomOrder.length - 1;
            const totalCount = validatedCustomOrder.length;

            return (
              <div
                key={id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isFirst
                    ? "bg-brand-subtle/30 border-brand/40 shadow-xs ring-1 ring-brand/20"
                    : "bg-surface-2/40 border-border/80 hover:border-border"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center shrink-0 ${
                      isFirst
                        ? "bg-brand text-text-inverse shadow-2xs"
                        : "bg-surface border border-border text-text-muted"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-0.5">
                      <span className="text-xs font-bold text-text-main truncate">
                        {debtItem.name}
                      </span>
                      <span className="text-[11px] text-text-muted shrink-0">
                        ({debtItem.institution})
                      </span>
                      {isFirst && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-brand text-text-inverse shrink-0 shadow-2xs">
                          Cel priorytetowy #1
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-text-muted flex items-center flex-wrap gap-x-2.5 gap-y-0.5 mt-1">
                      <span>Saldo: <strong className="text-text-main font-semibold tabular-nums">{formatMoney(debtItem.balance, currency)}</strong></span>
                      <span>•</span>
                      <span>Oprocentowanie: <strong className="text-brand font-bold tabular-nums">{debtItem.interestRate.toFixed(2)}% APR</strong></span>
                      <span>•</span>
                      <span>Rata: <strong className="text-text-main font-semibold tabular-nums">{formatMoney(debtItem.monthlyPayment, currency)}</strong></span>
                    </div>
                    {isFirst && (
                      <p className="text-[10px] text-brand font-medium mt-1">
                        To zobowiązanie otrzymuje całą nadwyżkę nadpłaty do czasu pełnej spłaty.
                      </p>
                    )}
                  </div>
                </div>

                {/* Move Up / Down Buttons with WCAG Touch Target */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => onMoveDebtUp?.(id)}
                    disabled={isFirst}
                    aria-label={`Przenieś zobowiązanie ${debtItem.name} wyżej (obecnie pozycja ${index + 1} z ${totalCount})`}
                    className="p-2 sm:px-3 sm:py-2 min-h-[40px] min-w-[40px] rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-hidden disabled:opacity-25 disabled:cursor-not-allowed disabled:pointer-events-none disabled:bg-surface-2 bg-surface hover:bg-surface-hover hover:border-brand/40 text-text-main active:scale-95 cursor-pointer shadow-2xs"
                    title="Przenieś wyżej"
                  >
                    <ArrowUp className="w-4 h-4" />
                    <span className="hidden sm:inline text-[11px]">Przenieś wyżej</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveDebtDown?.(id)}
                    disabled={isLast}
                    aria-label={`Przenieś zobowiązanie ${debtItem.name} niżej (obecnie pozycja ${index + 1} z ${totalCount})`}
                    className="p-2 sm:px-3 sm:py-2 min-h-[40px] min-w-[40px] rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-hidden disabled:opacity-25 disabled:cursor-not-allowed disabled:pointer-events-none disabled:bg-surface-2 bg-surface hover:bg-surface-hover hover:border-brand/40 text-text-main active:scale-95 cursor-pointer shadow-2xs"
                    title="Przenieś niżej"
                  >
                    <ArrowDown className="w-4 h-4" />
                    <span className="hidden sm:inline text-[11px]">Przenieś niżej</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-[11px] text-text-muted bg-surface-2/60 p-3.5 rounded-xl border border-border/60 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Zasada działania:</strong> Nadwyżka budżetowa (oraz raty ze spłaconych wcześniej kredytów) trafia w 100% na cel priorytetowy z pozycji nr 1. Po jego całkowitej spłacie uwolnione środki automatycznie przechodzą na kolejne zobowiązanie.
          </p>
        </div>
      </div>
    );
  };

  // Step-by-Step Roadmap Queue
  const renderRoadmapQueue = () => {
    if (isCustomOrderIncomplete) {
      return (
        <DebtScenarioFallbackState
          type="custom_order_incomplete"
          onSelectStrategy={onSelectStrategy}
        />
      );
    }

    if (
      !activePlan ||
      activePlan.debtFreeDate === "Nigdy" ||
      activePlan.totalMonths >= 600 ||
      !activePlan.payoffQueue ||
      activePlan.payoffQueue.length === 0
    ) {
      if (activePlan?.debtFreeDate === "Nigdy" || (activePlan && activePlan.totalMonths >= 600)) {
        return (
          <DebtScenarioFallbackState
            type="calculation_unavailable"
            title="Brak możliwości wygenerowania harmonogramu"
            message="Zadeklarowane wpłaty nie pokrywają odsetek. Zwiększ wpłatę miesięczną, aby wyliczyć etapy spłaty."
          />
        );
      }
      return <DebtScenarioFallbackState type="calculation_unavailable" />;
    }

    return (
      <div className="bg-surface p-5 sm:p-6 rounded-2xl border border-border space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-text-main">
                Plan i kolejność spłaty: {activePlan.strategyLabel}
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-subtle text-brand border border-brand/30">
                {activePlan.strategyBadge}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Harmonogram zamknięcia poszczególnych zobowiązań przy zadeklarowanym budżecie{" "}
              {formatMoney(activePlan.totalMonthlyCommitment, currency)} / mc.
            </p>
          </div>
        </div>

        {/* 3 Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-surface-2/60 rounded-xl border border-border">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
              Data spłaty całego długu
            </span>
            <span className="text-lg sm:text-xl font-black text-text-main tabular-nums block">
              {activePlan.debtFreeDate}
            </span>
            <span className="text-[11px] text-text-muted">
              {activePlan.totalMonths} miesięcy do pełnej wolności
            </span>
          </div>

          <div className="p-4 bg-surface-2/60 rounded-xl border border-border">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
              Zaoszczędzone odsetki
            </span>
            <span className="text-lg sm:text-xl font-black text-brand tabular-nums block">
              +{formatMoney(activePlan.interestSavedVsBaseline, currency)}
            </span>
            <span className="text-[11px] text-text-muted">
              w porównaniu ze spłatą tylko minimalnych rat
            </span>
          </div>

          <div className="p-4 bg-surface-2/60 rounded-xl border border-border">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
              Skrócony czas spłaty
            </span>
            <span className="text-lg sm:text-xl font-black text-success tabular-nums block">
              {activePlan.monthsSavedVsBaseline > 0
                ? `-${activePlan.monthsSavedVsBaseline} mies.`
                : "0 mies."}
            </span>
            <span className="text-[11px] text-text-muted">
              {activePlan.monthsSavedVsBaseline > 0
                ? `o ${Math.round((activePlan.monthsSavedVsBaseline / 12) * 10) / 10} lat szybciej bez długu`
                : "standardowy harmonogram"}
            </span>
          </div>
        </div>

        {/* Step-by-Step Roadmap Queue */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-text-faint block">
            Kolejność likwidacji kredytów ({activePlan.payoffQueue.length})
          </span>

          <div className="space-y-3">
            {activePlan.payoffQueue.map((item, idx) => (
              <div
                key={item.debtId}
                className="p-4 bg-surface-2/30 rounded-xl border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand text-text-inverse text-xs font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-main">{item.debtName}</span>
                      <span className="text-[10px] text-text-muted">({item.institution})</span>
                    </div>
                    <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
                      <span>Saldo początkowe: {formatMoney(item.initialBalance, currency)}</span>
                      <span>•</span>
                      <span className="font-bold text-brand tabular-nums">{item.interestRate.toFixed(2)}% APR</span>
                      <span>•</span>
                      <span>Rata: {formatMoney(item.monthlyPayment, currency)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50">
                  <span className="text-xs font-black text-text-main block">
                    Spłata: {item.payoffDate}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    ({item.payoffMonth}. miesiąc • odsetki: {formatMoney(item.totalInterestPaid, currency)})
                  </span>
                </div>
              </div>
            ))}
          </div>

          {activePlan.strategy !== "baseline" && activePlan.payoffQueue.length > 1 && (
            <div className="p-3.5 bg-brand-subtle/30 rounded-xl border border-brand/20 text-xs text-text-main leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <p>
                <strong>Efekt kaskadowy (Roll):</strong> Po spłaceniu każdego kredytu z listy, cała kwota jego dotychczasowej raty nie wraca do konsumpcji, lecz automatycznie zasila nadpłatę kolejnego zobowiązania, wykładniczo przyspieszając kolejne spłaty.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 1. Milestone Card */}
      {renderMilestoneCard()}

      {/* 2. Custom Order Panel */}
      {renderCustomOrderPanel()}

      {/* 3. Roadmap Queue */}
      {renderRoadmapQueue()}
    </>
  );
}
