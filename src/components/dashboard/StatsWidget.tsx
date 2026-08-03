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
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 relative shadow-sm hover:shadow transition">
          <span className="absolute top-4 right-4 bg-emerald-50 dark:bg-emerald-900/40 text-[#137566] dark:text-emerald-400 p-2 rounded-xl text-xl font-bold">
            ↗
          </span>
          <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Przychody</p>
          <h2 className="text-2xl font-bold text-[#137566] dark:text-emerald-400 mb-1" id="dash-income-total">
            {formatMoney(totalIncome, currency)}
          </h2>
          <small className="text-[11px] text-slate-500 font-medium">W tym okresie rozliczeniowym</small>
        </div>

        {/* Expense Card */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 relative shadow-sm hover:shadow transition">
          <span className="absolute top-4 right-4 bg-rose-50 dark:bg-rose-900/40 text-[#d55e50] dark:text-rose-400 p-2 rounded-xl text-xl font-bold">
            ↙
          </span>
          <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Wydatki</p>
          <h2 className="text-2xl font-bold text-[#d55e50] dark:text-rose-400 mb-1" id="dash-expense-total">
            {formatMoney(totalExpense, currency)}
          </h2>
          <small className="text-[11px] text-slate-500 font-medium">
            {totalExpense > 0 ? "Wydatki w wybranym miesiącu" : "Brak zarejestrowanych wydatków"}
          </small>
        </div>

        {/* Balance Card */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 relative shadow-sm hover:shadow transition">
          <span className="absolute top-4 right-4 bg-teal-50 dark:bg-teal-900/40 text-[#153a35] dark:text-teal-400 p-2 rounded-xl text-xl font-bold">
            ◎
          </span>
          <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Pozostaje (Bilans)</p>

          <h2 className={`text-2xl font-bold mb-1 ${balance >= 0 ? "text-[#137566] dark:text-emerald-400" : "text-[#d55e50] dark:text-rose-400"}`} id="dash-balance-total">
            {formatMoney(balance, currency)}
          </h2>
          <DelayedTooltip
            label="Aktualna nadwyżka finansowa (suma przychodów minus suma wydatków w wybranym miesiącu)."
            tooltipClassName="w-48"
          >
            <small className="text-[11px] text-slate-500 font-medium cursor-help border-b border-dashed border-slate-300">
              Co to znaczy?
            </small>
          </DelayedTooltip>
          <div className="flex flex-col gap-1 mt-2">
            {emergencyLimit > 0 && (
              <div className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-100 dark:border-emerald-800/50 font-bold w-fit tracking-wide">
                Limit awaryjny: {formatMoney(emergencyLimit, currency)}
              </div>
            )}
            {investmentCushion > 0 && (
              <div className="text-[10px] bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md border border-slate-200/60 dark:border-slate-700 font-bold w-fit tracking-wide">
                Poduszka fin.: {formatMoney(investmentCushion, currency)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* End of Month Forecast Card */}
        <div className="border border-[#b8ded5]/60 dark:border-emerald-800/40 bg-gradient-to-br from-[#f2f9f8] to-[#e7f3f0] dark:from-emerald-900/20 dark:to-slate-900 rounded-2xl p-5 shadow-sm relative">
          <div className="absolute -right-6 -top-6 text-9xl opacity-5">📅</div>
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-[#153a35] dark:text-emerald-400">Prognoza na koniec miesiąca</h3>
                <span className="bg-[#137566] dark:bg-emerald-800 text-white dark:text-emerald-100 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">AI Auto-Calc</span>
              </div>
              <p className="text-xs text-[#52796f] dark:text-emerald-500/80 font-medium">
                Przewidywany stan kont na dzień {endOfMonthForecast.forecastDate}
              </p>
              <p className="text-[10px] text-[#52796f] dark:text-emerald-500/60 mt-1 opacity-80 font-medium">Wyliczane na bazie salda minus oczekujące opłaty cykliczne i rachunki.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#cce3df] dark:border-emerald-800/40">
            <div className="bg-white/50 dark:bg-slate-800/50 p-3.5 rounded-lg border border-[#e1f0ed]/60 dark:border-slate-700/60">
              <span className="text-[10px] uppercase font-semibold text-[#739087] dark:text-emerald-600 block">Planowane Wydatki</span>
              <span className="text-lg font-bold text-[#d55e50] dark:text-rose-400">{formatMoney(endOfMonthForecast.unpaidPaymentsSum + endOfMonthForecast.futureRecurringExpensesSum, currency)}</span>
            </div>

            <div className="bg-white/50 dark:bg-slate-800/50 p-3.5 rounded-lg border border-[#e1f0ed]/60 dark:border-slate-700/60">
              <span className="text-[10px] uppercase font-semibold text-[#739087] dark:text-emerald-600 block">Planowane Przychody</span>
              <span className="text-lg font-bold text-[#137566] dark:text-emerald-400">{formatMoney(endOfMonthForecast.futureRecurringIncomesSum, currency)}</span>
            </div>

            <div className="bg-white dark:bg-slate-800/90 p-3.5 rounded-lg border border-[#b8ded5] dark:border-emerald-700/50 shadow-inner dark:shadow-none">
              <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block">Prognozowane Saldo</span>
              <span className={`text-lg font-black ${endOfMonthForecast.forecastedBalance >= 0 ? "text-[#137566] dark:text-emerald-400" : "text-[#d55e50] dark:text-rose-400"}`}>
                {formatMoney(endOfMonthForecast.forecastedBalance, currency)}
              </span>
            </div>
          </div>

          {endOfMonthForecast.isNegative && (
            <div className="mt-3.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 rounded-lg p-3 text-xs text-rose-800 dark:text-rose-400 flex items-center gap-2 animate-pulse">
              <span>⚠️</span>
              <span><strong>Uwaga:</strong> Zbliżasz się do debetu! Prognozowane wydatki w tym miesiącu przekroczą dostępne środki.</span>
            </div>
          )}
        </div>

        {/* Safe Amount To Spend Card */}
        <div
          id="safe-amount-to-spend-card"
          className={`border rounded-2xl p-5 shadow-sm transition-all ${
            safeBreakdown.isNegative
              ? "bg-rose-50/90 border-rose-200/60 dark:bg-rose-900/20 dark:border-rose-800/50"
              : "bg-gradient-to-r from-emerald-50/70 via-teal-50/60 to-emerald-50/70 border-emerald-200/60 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-emerald-900/20 dark:border-emerald-800/50"
          }`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🛡️</span>
              <div>
                <h3 className={`text-sm font-bold ${safeBreakdown.isNegative ? "text-rose-900 dark:text-rose-400" : "text-emerald-900 dark:text-emerald-400"}`}>
                  Bezpieczna Kwota do Wydania
                </h3>
                <p className={`text-[11px] font-medium mt-0.5 ${safeBreakdown.isNegative ? "text-rose-700/80 dark:text-rose-400/80" : "text-emerald-700/80 dark:text-emerald-500/80"}`}>
                  Po odliczeniu nadchodzących opłat i celów
                </p>
              </div>
            </div>
            <button 
              onClick={() => onChangeView("analysis")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shadow-sm border ${
                safeBreakdown.isNegative 
                ? "bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200/50 dark:bg-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/30 dark:border-rose-500/30" 
                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200/50 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 dark:border-emerald-500/30"
              }`}
            >
              Zobacz Analizę →
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
            <div className="flex-1">
              <span className="text-[10px] uppercase tracking-wider font-bold opacity-60 block mb-0.5">Dostępne dzisiaj</span>
              <span className={`text-2xl sm:text-3xl font-black ${safeBreakdown.isNegative ? "text-rose-700 dark:text-rose-400" : "text-emerald-800 dark:text-emerald-400"}`}>
                {formatMoney(safeBreakdown.safeToSpend, currency)}
              </span>
            </div>
            
            <div className="flex gap-6">
              <div className="hidden sm:flex flex-col items-end justify-start min-w-[96px]">
                <div className="h-5 flex items-end mb-1">
                  <DelayedTooltip
                    label="Środki przypisane do Twoich celów oszczędnościowych. Nie są uwzględniane w bezpiecznej kwocie do wydania."
                    tooltipClassName="w-48"
                  >
                    <span className="text-[11px] font-medium opacity-70 cursor-help border-b border-dashed border-emerald-900/30 dark:border-emerald-400/30 pb-0.5">
                      Zarezerwowane
                    </span>
                  </DelayedTooltip>
                </div>
                <span className="text-sm font-bold opacity-90">{formatMoney(safeBreakdown.reservedGoalsSum, currency)}</span>
              </div>
              <div className="flex flex-col items-end justify-start min-w-[96px]">
                <div className="h-5 flex items-end mb-1">
                  <span className="text-[11px] font-medium opacity-70 border-b border-transparent pb-0.5">Rezerwa opłat</span>
                </div>
                <span className="text-sm font-bold opacity-90">{formatMoney(safeBreakdown.futureRecurringExpensesSum + safeBreakdown.unpaidPaymentsSum, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
