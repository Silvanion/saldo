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
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 relative shadow-2xl hover:bg-slate-800/60 transition group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-2xl pointer-events-none" />
          <span className="absolute top-4 right-4 bg-emerald-500/20 text-emerald-400 p-2 rounded-xl text-xl font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            ↗
          </span>
          <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider relative z-10">Przychody</p>
          <h2 className="text-2xl font-bold text-emerald-400 mb-1 relative z-10 drop-shadow-sm" id="dash-income-total">
            {formatMoney(totalIncome, currency)}
          </h2>
          <small className="text-[11px] text-slate-500 font-medium relative z-10">W tym okresie rozliczeniowym</small>
        </div>

        {/* Expense Card */}
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 relative shadow-2xl hover:bg-slate-800/60 transition group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent rounded-2xl pointer-events-none" />
          <span className="absolute top-4 right-4 bg-rose-500/20 text-rose-400 p-2 rounded-xl text-xl font-bold shadow-[0_0_15px_rgba(244,63,94,0.3)]">
            ↙
          </span>
          <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider relative z-10">Wydatki</p>
          <h2 className="text-2xl font-bold text-rose-400 mb-1 relative z-10 drop-shadow-sm" id="dash-expense-total">
            {formatMoney(totalExpense, currency)}
          </h2>
          <small className="text-[11px] text-slate-500 font-medium relative z-10">
            {totalExpense > 0 ? "Wydatki w wybranym miesiącu" : "Brak zarejestrowanych wydatków"}
          </small>
        </div>

        {/* Balance Card */}
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 relative shadow-2xl hover:bg-slate-800/60 transition group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent rounded-2xl pointer-events-none" />
          <span className="absolute top-4 right-4 bg-amber-500/20 text-amber-400 p-2 rounded-xl text-xl font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            ◎
          </span>
          <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider relative z-10">Pozostaje (Bilans)</p>

          <h2 className={`text-2xl font-bold mb-1 relative z-10 drop-shadow-sm ${balance >= 0 ? "text-amber-400" : "text-rose-400"}`} id="dash-balance-total">
            {formatMoney(balance, currency)}
          </h2>
          <DelayedTooltip
            label="Aktualna nadwyżka finansowa (suma przychodów minus suma wydatków w wybranym miesiącu)."
            tooltipClassName="w-48 bg-slate-800 border-slate-700 text-slate-200"
          >
            <small className="text-[11px] text-slate-400 font-medium cursor-help border-b border-dashed border-slate-600 relative z-10 pb-0.5">
              Co to znaczy?
            </small>
          </DelayedTooltip>
          <div className="flex flex-col gap-1 mt-2 relative z-10">
            {emergencyLimit > 0 && (
              <div className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-500/20 font-bold w-fit tracking-wide shadow-sm">
                Limit awaryjny: {formatMoney(emergencyLimit, currency)}
              </div>
            )}
            {investmentCushion > 0 && (
              <div className="text-[10px] bg-slate-700/50 text-slate-300 px-2.5 py-1 rounded-md border border-slate-600/50 font-bold w-fit tracking-wide shadow-sm">
                Poduszka fin.: {formatMoney(investmentCushion, currency)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* End of Month Forecast Card */}
        <div className="border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl rounded-2xl p-5 shadow-2xl relative overflow-hidden group hover:bg-slate-800/60 transition">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
          <div className="absolute -right-6 -top-6 text-9xl opacity-5 pointer-events-none">📅</div>
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-slate-100">Prognoza na koniec miesiąca</h3>
                <span className="bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-[0_0_10px_rgba(139,92,246,0.2)]">AI Auto-Calc</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Przewidywany stan kont na dzień {endOfMonthForecast.forecastDate}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">Wyliczane na bazie salda minus oczekujące opłaty cykliczne i rachunki.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700/50 relative z-10">
            <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-700/50 shadow-inner">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Planowane Wydatki</span>
              <span className="text-lg font-bold text-rose-400">{formatMoney(endOfMonthForecast.unpaidPaymentsSum + endOfMonthForecast.futureRecurringExpensesSum, currency)}</span>
            </div>

            <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-700/50 shadow-inner">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Plan. Przychody</span>
              <span className="text-lg font-bold text-emerald-400">{formatMoney(endOfMonthForecast.futureRecurringIncomesSum, currency)}</span>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
              <span className="text-[10px] uppercase font-semibold text-violet-300 block mb-1">Prognozowane Saldo</span>
              <span className={`text-lg font-black drop-shadow-sm ${endOfMonthForecast.forecastedBalance >= 0 ? "text-amber-400" : "text-rose-400"}`}>
                {formatMoney(endOfMonthForecast.forecastedBalance, currency)}
              </span>
            </div>
          </div>

          {endOfMonthForecast.isNegative && (
            <div className="mt-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-300 flex items-center gap-2 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.1)] relative z-10">
              <span>⚠️</span>
              <span><strong>Uwaga:</strong> Zbliżasz się do debetu! Prognozowane wydatki w tym miesiącu przekroczą dostępne środki.</span>
            </div>
          )}
        </div>

        {/* Safe Amount To Spend Card */}
        <div
          id="safe-amount-to-spend-card"
          className={`border rounded-2xl p-5 shadow-2xl transition-all relative overflow-hidden backdrop-blur-xl ${
            safeBreakdown.isNegative
              ? "bg-rose-900/20 border-rose-500/30"
              : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60"
          }`}
        >
          <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none ${safeBreakdown.isNegative ? "from-rose-500/5" : "from-amber-500/5"} to-transparent`} />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <span className="text-2xl drop-shadow-md">🛡️</span>
              <div>
                <h3 className={`text-sm font-bold ${safeBreakdown.isNegative ? "text-rose-400" : "text-amber-400"} drop-shadow-sm`}>
                  Bezpieczna Kwota do Wydania
                </h3>
                <p className={`text-[11px] font-medium mt-0.5 ${safeBreakdown.isNegative ? "text-rose-300/70" : "text-slate-400"}`}>
                  Po odliczeniu nadchodzących opłat i celów
                </p>
              </div>
            </div>
            <button 
              onClick={() => onChangeView("analysis")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shadow-sm border backdrop-blur-md ${
                safeBreakdown.isNegative 
                ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border-rose-500/30" 
                : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-amber-500/30"
              }`}
            >
              Zobacz Analizę →
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-700/50 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">Dostępne dzisiaj</span>
              <span className={`text-2xl sm:text-3xl font-black drop-shadow-md ${safeBreakdown.isNegative ? "text-rose-400" : "text-amber-400"}`}>
                {formatMoney(safeBreakdown.safeToSpend, currency)}
              </span>
            </div>
            
            <div className="flex gap-6">
              <div className="hidden sm:flex flex-col items-end justify-start min-w-[96px]">
                <div className="h-5 flex items-end mb-1">
                  <DelayedTooltip
                    label="Środki przypisane do Twoich celów oszczędnościowych. Nie są uwzględniane w bezpiecznej kwocie do wydania."
                    tooltipClassName="w-48 bg-slate-800 border-slate-700 text-slate-200"
                  >
                    <span className="text-[11px] font-medium text-slate-400 cursor-help border-b border-dashed border-slate-600 pb-0.5">
                      Zarezerwowane
                    </span>
                  </DelayedTooltip>
                </div>
                <span className="text-sm font-bold text-slate-200">{formatMoney(safeBreakdown.reservedGoalsSum, currency)}</span>
              </div>
              <div className="flex flex-col items-end justify-start min-w-[96px]">
                <div className="h-5 flex items-end mb-1">
                  <span className="text-[11px] font-medium text-slate-400 border-b border-transparent pb-0.5">Rezerwa opłat</span>
                </div>
                <span className="text-sm font-bold text-slate-200">{formatMoney(safeBreakdown.futureRecurringExpensesSum + safeBreakdown.unpaidPaymentsSum, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
