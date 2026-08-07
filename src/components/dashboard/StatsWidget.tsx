import React, { memo } from "react";
import { DelayedTooltip } from "./DelayedTooltip";
import {} from "../../utils";
import { SafeToSpendBreakdown } from "../../services/budgetCalculations";
import { formatMoney } from "../../utils/format";

interface StatsWidgetProps {
  currency: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  emergencyLimit: number;
  investmentCushion: number;
  endOfMonthForecast: any;
  safeBreakdown: SafeToSpendBreakdown;
  onChangeView: (view: string) => void;
}

export const StatsWidget = memo(function StatsWidget({
  currency,
  totalIncome,
  totalExpense,
  balance,
  emergencyLimit,
  investmentCushion,
  endOfMonthForecast,
  safeBreakdown,
  onChangeView
}: StatsWidgetProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="widget-content-stats-grid">
        {/* Income Card */}
        <div className="bg-surface border border-border rounded-2xl p-5 relative shadow-sm hover:bg-surface transition group min-w-0">
          <div className="absolute inset-0  rounded-2xl pointer-events-none" />
          <span className="absolute top-4 right-4 bg-emerald-50 text-emerald-700 p-2 rounded-xl text-xl font-bold shrink-0">
            ↗
          </span>
          <p className="text-[10px] font-bold text-text-muted mb-1 uppercase tracking-wider relative z-10 truncate pr-10" title="Przychody">Przychody</p>
          <h2 className="text-2xl font-bold text-emerald-700 mb-1 relative z-10 truncate pr-10" id="dash-income-total" title={formatMoney(totalIncome, currency)}>
            {formatMoney(totalIncome, currency)}
          </h2>
          <small className="text-[11px] text-text-faint font-medium relative z-10 truncate block" title="W tym okresie rozliczeniowym">W tym okresie rozliczeniowym</small>
        </div>

        {/* Expense Card */}
        <div className="bg-surface border border-border rounded-2xl p-5 relative shadow-sm hover:bg-surface transition group min-w-0">
          <div className="absolute inset-0  rounded-2xl pointer-events-none" />
          <span className="absolute top-4 right-4 bg-rose-50 text-rose-700 p-2 rounded-xl text-xl font-bold shrink-0">
            ↙
          </span>
          <p className="text-[10px] font-bold text-text-muted mb-1 uppercase tracking-wider relative z-10 truncate pr-10" title="Wydatki">Wydatki</p>
          <h2 className="text-2xl font-bold text-rose-700 mb-1 relative z-10 truncate pr-10" id="dash-expense-total" title={formatMoney(totalExpense, currency)}>
            {formatMoney(totalExpense, currency)}
          </h2>
          <small className="text-[11px] text-text-faint font-medium relative z-10 truncate block" title={totalExpense > 0 ? "Wydatki w wybranym miesiącu" : "Brak zarejestrowanych wydatków"}>
            {totalExpense > 0 ? "Wydatki w wybranym miesiącu" : "Brak zarejestrowanych wydatków"}
          </small>
        </div>

        {/* Balance Card */}
        <div className="bg-surface border border-border rounded-2xl p-5 relative shadow-sm hover:bg-surface transition group min-w-0">
          <div className="absolute inset-0  rounded-2xl pointer-events-none" />
          <span className="absolute top-4 right-4 bg-amber-50 text-amber-700 p-2 rounded-xl text-xl font-bold shrink-0">
            ◎
          </span>
          <p className="text-[10px] font-bold text-text-muted mb-1 uppercase tracking-wider relative z-10 truncate pr-10" title="Pozostaje (Bilans)">Pozostaje (Bilans)</p>

          <h2 className={`text-2xl font-bold mb-1 relative z-10 truncate pr-10 ${balance >= 0 ? "text-amber-700" : "text-rose-700"}`} id="dash-balance-total" title={formatMoney(balance, currency)}>
            {formatMoney(balance, currency)}
          </h2>
          <DelayedTooltip
            className="block min-w-0 max-w-full"
            label="Aktualna nadwyżka finansowa (suma przychodów minus suma wydatków w wybranym miesiącu)."
            tooltipClassName="w-48 bg-surface border-border text-text-main"
          >
            <small className="text-[11px] text-text-muted font-medium cursor-help border-b border-dashed border-slate-200 relative z-10 pb-0.5 truncate max-w-full inline-block" title="Co to znaczy?">
              Co to znaczy?
            </small>
          </DelayedTooltip>
          <div className="flex flex-col gap-1 mt-2 relative z-10 min-w-0">
            {emergencyLimit > 0 && (
              <div className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-500/20 font-bold w-fit tracking-wide shadow-sm truncate max-w-full" title={`Limit awaryjny: ${formatMoney(emergencyLimit, currency)}`}>
                Limit awaryjny: {formatMoney(emergencyLimit, currency)}
              </div>
            )}
            {investmentCushion > 0 && (
              <div className="text-[10px] bg-slate-100 text-text-muted px-2.5 py-1 rounded-md border border-slate-200 font-bold w-fit tracking-wide shadow-sm truncate max-w-full" title={`Poduszka fin.: ${formatMoney(investmentCushion, currency)}`}>
                Poduszka fin.: {formatMoney(investmentCushion, currency)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* End of Month Forecast Card */}
        <div className="border border-border bg-surface rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:bg-surface transition min-w-0">
          <div className="absolute inset-0  pointer-events-none" />
          <div className="absolute -right-6 -top-6 text-9xl opacity-5 pointer-events-none shrink-0">📅</div>
          <div className="flex items-start justify-between relative z-10 min-w-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 min-w-0">
                <h3 className="text-sm font-bold text-text-main truncate" title="Prognoza na koniec miesiąca">Prognoza na koniec miesiąca</h3>
                <span className="bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">AI Auto-Calc</span>
              </div>
              <p className="text-xs text-text-muted font-medium truncate" title={`Przewidywany stan kont na dzień ${endOfMonthForecast.forecastDate}`}>
                Przewidywany stan kont na dzień {endOfMonthForecast.forecastDate}
              </p>
              <p className="text-[10px] text-text-faint mt-1 font-medium truncate" title="Wyliczane na bazie salda minus oczekujące opłaty cykliczne i rachunki.">Wyliczane na bazie salda minus oczekujące opłaty cykliczne i rachunki.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border relative z-10">
            <div className="bg-surface p-3.5 rounded-xl border border-border shadow-inner min-w-0 flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-text-muted block mb-1 truncate" title="Planowane Wydatki">Planowane Wydatki</span>
              <span className="text-lg font-bold text-rose-700 truncate" title={formatMoney(endOfMonthForecast.unpaidPaymentsSum + endOfMonthForecast.futureRecurringExpensesSum, currency)}>{formatMoney(endOfMonthForecast.unpaidPaymentsSum + endOfMonthForecast.futureRecurringExpensesSum, currency)}</span>
            </div>

            <div className="bg-surface p-3.5 rounded-xl border border-border shadow-inner min-w-0 flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-text-muted block mb-1 truncate" title="Plan. Przychody">Plan. Przychody</span>
              <span className="text-lg font-bold text-emerald-700 truncate" title={formatMoney(endOfMonthForecast.futureRecurringIncomesSum, currency)}>{formatMoney(endOfMonthForecast.futureRecurringIncomesSum, currency)}</span>
            </div>

            <div className="bg-surface-2 p-3.5 rounded-xl border border-violet-500/30 min-w-0 flex flex-col">
              <span className="text-[10px] uppercase font-semibold text-violet-300 block mb-1 truncate" title="Prognozowane Saldo">Prognozowane Saldo</span>
              <span className={`text-lg font-black truncate ${endOfMonthForecast.forecastedBalance >= 0 ? "text-amber-700" : "text-rose-700"}`} title={formatMoney(endOfMonthForecast.forecastedBalance, currency)}>
                {formatMoney(endOfMonthForecast.forecastedBalance, currency)}
              </span>
            </div>
          </div>

          {endOfMonthForecast.isNegative && (
            <div className="mt-3.5 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 flex items-start gap-2 animate-pulse relative z-10 min-w-0">
              <span className="shrink-0">⚠️</span>
              <span className="min-w-0"><strong>Uwaga:</strong> Zbliżasz się do debetu! Prognozowane wydatki w tym miesiącu przekroczą dostępne środki.</span>
            </div>
          )}
        </div>

        {/* Safe Amount To Spend Card */}
        <div
          id="safe-amount-to-spend-card"
          className={`border rounded-2xl p-5 shadow-sm transition-all relative overflow-hidden min-w-0 ${
            safeBreakdown.isNegative
              ? "bg-rose-900/20 border-rose-200"
              : "bg-surface border-border hover:bg-surface"
          }`}
        >
          {/* Glow/Gradient removed for clean solid look */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="text-2xl shrink-0">🛡️</span>
              <div className="min-w-0 flex-1">
                <h3 className={`text-sm font-bold truncate ${safeBreakdown.isNegative ? "text-rose-700" : "text-amber-700"} `} title="Bezpieczna Kwota do Wydania">
                  Bezpieczna Kwota do Wydania
                </h3>
                <p className={`text-[11px] font-medium mt-0.5 truncate ${safeBreakdown.isNegative ? "text-rose-700/70" : "text-text-muted"}`} title="Po odliczeniu nadchodzących opłat i celów">
                  Po odliczeniu nadchodzących opłat i celów
                </p>
              </div>
            </div>
            <button 
              onClick={() => onChangeView("analysis")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold active:scale-[0.98] transition-all whitespace-nowrap shadow-sm border shrink-0 focus-visible:outline-none focus-visible:ring-2 cursor-pointer ${
                safeBreakdown.isNegative 
                ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 focus-visible:ring-rose-500/50" 
                : "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 focus-visible:ring-amber-500/50"
              }`}
            >
              Zobacz Analizę →
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-text-muted block mb-0.5 truncate" title="Dostępne dzisiaj">Dostępne dzisiaj</span>
              <span className={`text-2xl sm:text-3xl font-black truncate block ${safeBreakdown.isNegative ? "text-rose-700" : "text-amber-700"}`} title={formatMoney(safeBreakdown.safeToSpend, currency)}>
                {formatMoney(safeBreakdown.safeToSpend, currency)}
              </span>
            </div>
            
            <div className="flex gap-4 sm:gap-6 shrink-0 min-w-0">
              <div className="hidden sm:flex flex-col items-end justify-start min-w-0 sm:min-w-[96px]">
                <div className="h-5 flex items-end mb-1 min-w-0">
                  <DelayedTooltip
                    className="flex min-w-0 max-w-full"
                    label="Środki przypisane do Twoich celów oszczędnościowych. Nie są uwzględniane w bezpiecznej kwocie do wydania."
                    tooltipClassName="w-48 bg-surface border-border text-text-main"
                  >
                    <span className="text-[11px] font-medium text-text-muted cursor-help border-b border-dashed border-slate-200 pb-0.5 truncate max-w-full block" title="Zarezerwowane">
                      Zarezerwowane
                    </span>
                  </DelayedTooltip>
                </div>
                <span className="text-sm font-bold text-text-main truncate block max-w-full" title={formatMoney(safeBreakdown.reservedGoalsSum, currency)}>{formatMoney(safeBreakdown.reservedGoalsSum, currency)}</span>
              </div>
              <div className="flex flex-col items-end justify-start min-w-0 sm:min-w-[96px]">
                <div className="h-5 flex items-end mb-1 max-w-full">
                  <span className="text-[11px] font-medium text-text-muted border-b border-transparent pb-0.5 truncate block" title="Rezerwa opłat">Rezerwa opłat</span>
                </div>
                <span className="text-sm font-bold text-text-main truncate block max-w-full" title={formatMoney(safeBreakdown.futureRecurringExpensesSum + safeBreakdown.unpaidPaymentsSum, currency)}>{formatMoney(safeBreakdown.futureRecurringExpensesSum + safeBreakdown.unpaidPaymentsSum, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
