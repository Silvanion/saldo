import React, { memo } from "react";
import { formatPln } from "../../utils";
import { SafeToSpendBreakdown } from "../../services/budgetCalculations";

interface StatsWidgetProps {
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
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 relative overflow-hidden shadow-sm hover:shadow transition">
          <span className="absolute top-4 right-4 bg-emerald-50 text-[#137566] p-2 rounded-xl text-xl font-bold">
            ↗
          </span>
          <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Przychody</p>
          <h2 className="text-2xl font-bold text-[#137566] mb-1" id="dash-income-total">
            {formatPln(totalIncome)}
          </h2>
          <small className="text-[11px] text-slate-500 font-medium">W tym okresie rozliczeniowym</small>
        </div>

        {/* Expense Card */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 relative overflow-hidden shadow-sm hover:shadow transition">
          <span className="absolute top-4 right-4 bg-rose-50 text-[#d55e50] p-2 rounded-xl text-xl font-bold">
            ↙
          </span>
          <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Wydatki</p>
          <h2 className="text-2xl font-bold text-[#d55e50] mb-1" id="dash-expense-total">
            {formatPln(totalExpense)}
          </h2>
          <small className="text-[11px] text-slate-500 font-medium">
            {totalExpense > 0 ? "Wydatki w wybranym miesiącu" : "Brak zarejestrowanych wydatków"}
          </small>
        </div>

        {/* Balance Card */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 relative overflow-hidden shadow-sm hover:shadow transition">
          <span className="absolute top-4 right-4 bg-teal-50 text-[#153a35] p-2 rounded-xl text-xl font-bold">
            ◎
          </span>
          <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Pozostaje (Bilans)</p>

          <h2 className={`text-2xl font-bold mb-1 ${balance >= 0 ? "text-[#137566]" : "text-[#d55e50]"}`} id="dash-balance-total">
            {formatPln(balance)}
          </h2>
          <div className="group relative">
            <small className="text-[11px] text-slate-500 font-medium cursor-help border-b border-dashed border-slate-300">Co to znaczy?</small>
            <div className="hidden group-hover:block absolute z-10 bottom-full left-0 mb-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-xl shadow-lg">
              Aktualna nadwyżka finansowa (suma przychodów minus suma wydatków w wybranym miesiącu).
            </div>
          </div>
          <div className="flex flex-col gap-1 mt-2">
            {emergencyLimit > 0 && (
              <div className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-100 font-bold w-fit tracking-wide">
                Limit awaryjny: {formatPln(emergencyLimit)}
              </div>
            )}
            {investmentCushion > 0 && (
              <div className="text-[10px] bg-slate-50 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200/60 font-bold w-fit tracking-wide">
                Poduszka fin.: {formatPln(investmentCushion)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* End of Month Forecast Card */}
        <div className="border border-[#b8ded5]/60 bg-gradient-to-br from-[#f2f9f8] to-[#e7f3f0] rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute -right-6 -top-6 text-9xl opacity-5">📅</div>
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-[#153a35]">Prognoza na koniec miesiąca</h3>
                <span className="bg-[#137566] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">AI Auto-Calc</span>
              </div>
              <p className="text-xs text-[#52796f] font-medium">
                Przewidywany stan kont na dzień {endOfMonthForecast.forecastDate}
              </p>
              <p className="text-[10px] text-[#52796f] mt-1 opacity-80 font-medium">Wyliczane na bazie salda minus oczekujące opłaty cykliczne i rachunki.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#cce3df]">
            <div className="bg-white/50 p-3.5 rounded-lg border border-[#e1f0ed]/60">
              <span className="text-[10px] uppercase font-semibold text-[#739087] block">Planowane Wydatki</span>
              <span className="text-lg font-bold text-[#d55e50]">{formatPln(endOfMonthForecast.unpaidPaymentsSum + endOfMonthForecast.futureRecurringExpensesSum)}</span>
            </div>

            <div className="bg-white/50 p-3.5 rounded-lg border border-[#e1f0ed]/60">
              <span className="text-[10px] uppercase font-semibold text-[#739087] block">Planowane Przychody</span>
              <span className="text-lg font-bold text-[#137566]">{formatPln(endOfMonthForecast.futureRecurringIncomesSum)}</span>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-[#b8ded5] shadow-inner">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">Prognozowane Saldo</span>
              <span className={`text-lg font-black ${endOfMonthForecast.forecastedBalance >= 0 ? "text-[#137566]" : "text-[#d55e50]"}`}>
                {formatPln(endOfMonthForecast.forecastedBalance)}
              </span>
            </div>
          </div>

          {endOfMonthForecast.isNegative && (
            <div className="mt-3.5 bg-rose-50 border border-rose-100 rounded-lg p-3 text-xs text-rose-800 flex items-center gap-2 animate-pulse">
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
              ? "bg-rose-50/90 border-rose-200/60"
              : "bg-gradient-to-r from-emerald-50/70 via-teal-50/60 to-emerald-50/70 border-emerald-200/60"
          }`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🛡️</span>
              <div>
                <h3 className={`text-sm font-bold ${safeBreakdown.isNegative ? "text-rose-900" : "text-emerald-900"}`}>
                  Bezpieczna Kwota do Wydania
                </h3>
                <p className={`text-[11px] font-medium mt-0.5 ${safeBreakdown.isNegative ? "text-rose-700/80" : "text-emerald-700/80"}`}>
                  Po odliczeniu nadchodzących opłat i celów
                </p>
              </div>
            </div>
            <button 
              onClick={() => onChangeView("analysis")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shadow-sm border ${
                safeBreakdown.isNegative 
                ? "bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200/50" 
                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200/50"
              }`}
            >
              Zobacz Analizę →
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-black/5 flex items-center justify-between">
            <div className="flex-1">
              <span className="text-[10px] uppercase tracking-wider font-bold opacity-60 block mb-0.5">Dostępne dzisiaj</span>
              <span className={`text-2xl sm:text-3xl font-black ${safeBreakdown.isNegative ? "text-rose-700" : "text-emerald-800"}`}>
                {formatPln(safeBreakdown.safeToSpend)}
              </span>
            </div>
            
            <div className="flex gap-4">
              <div className="text-right hidden sm:block">
                <div className="group relative">
                  <span className="text-[10px] uppercase font-bold opacity-50 block cursor-help border-b border-dashed border-emerald-900/30">Zarezerwowane</span>
                  <div className="hidden group-hover:block absolute z-10 bottom-full right-0 mb-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-xl shadow-lg text-left normal-case tracking-normal font-medium">
                    Środki przypisane do Twoich celów oszczędnościowych. Nie są uwzględniane w bezpiecznej kwocie do wydania.
                  </div>
                </div>
                <span className="text-sm font-bold opacity-80">{formatPln(safeBreakdown.reservedGoalsSum)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold opacity-50 block">Rezerwa opłat</span>
                <span className="text-sm font-bold opacity-80">{formatPln(safeBreakdown.futureRecurringExpensesSum + safeBreakdown.unpaidPaymentsSum)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
