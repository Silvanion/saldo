import React, { memo } from "react";
import { DelayedTooltip } from "./DelayedTooltip";
import { SafeToSpendBreakdown, RunwayCalculation, MoMTrend } from "../../services/budgetCalculations";
import { formatMoney } from "../../utils/format";
import { TrendingUp, TrendingDown, Wallet, CalendarClock, ShieldCheck, Hourglass, AlertTriangle, ArrowRight } from "lucide-react";

interface StatsWidgetProps {
  currency: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  emergencyLimit: number;
  investmentCushion: number;
  endOfMonthForecast: any;
  safeBreakdown: SafeToSpendBreakdown;
  runway?: RunwayCalculation;
  momTrends?: MoMTrend;
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
  runway,
  momTrends,
  onChangeView
}: StatsWidgetProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="widget-content-stats-grid">
        {/* Income Card */}
        <div className="bg-surface border border-border rounded-2xl p-5 relative shadow-sm hover:bg-surface transition group min-w-0">
          <div className="absolute inset-0 rounded-2xl pointer-events-none" />
          <span className="absolute top-4 right-4 bg-brand-subtle text-brand p-2 rounded-xl shrink-0 border border-brand/20 shadow-xs">
            <TrendingUp className="w-4 h-4 text-brand" />
          </span>
          <p className="text-xs font-bold text-text-muted mb-1 uppercase tracking-wider relative z-10 truncate pr-10" title="Przychody">Przychody</p>
          <h2 className="text-2xl font-bold text-brand mb-1 relative z-10 truncate pr-10 tabular-nums" id="dash-income-total" title={formatMoney(totalIncome, currency)}>
            {formatMoney(totalIncome, currency)}
          </h2>
          {momTrends && momTrends.previousMonthIncome > 0 ? (
            <div className="flex items-center gap-1.5 relative z-10">
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 tabular-nums ${momTrends.incomeDiffPercent >= 0 ? "bg-brand-subtle text-brand border-brand/20" : "bg-danger-subtle text-danger border-danger/20"}`}>
                {momTrends.incomeDiffPercent >= 0 ? (
                  <TrendingUp className="w-3 h-3 shrink-0" />
                ) : (
                  <TrendingDown className="w-3 h-3 shrink-0" />
                )}
                <span>{momTrends.incomeDiffPercent >= 0 ? `+${momTrends.incomeDiffPercent}%` : `${momTrends.incomeDiffPercent}%`} MoM</span>
              </span>
              <small className="text-xs text-text-faint font-medium truncate">vs zeszły mies.</small>
            </div>
          ) : (
            <small className="text-xs text-text-faint font-medium relative z-10 truncate block" title="W tym okresie rozliczeniowym">W tym okresie rozliczeniowym</small>
          )}
        </div>

        {/* Expense Card */}
        <div className="bg-surface border border-border rounded-2xl p-5 relative shadow-sm hover:bg-surface transition group min-w-0">
          <div className="absolute inset-0 rounded-2xl pointer-events-none" />
          <span className="absolute top-4 right-4 bg-danger-subtle text-danger p-2 rounded-xl shrink-0 border border-danger/20 shadow-xs">
            <TrendingDown className="w-4 h-4 text-danger" />
          </span>
          <p className="text-xs font-bold text-text-muted mb-1 uppercase tracking-wider relative z-10 truncate pr-10" title="Wydatki">Wydatki</p>
          <h2 className="text-2xl font-bold text-danger mb-1 relative z-10 truncate pr-10 tabular-nums" id="dash-expense-total" title={formatMoney(totalExpense, currency)}>
            {formatMoney(totalExpense, currency)}
          </h2>
          {momTrends && momTrends.previousMonthExpenses > 0 ? (
            <div className="flex items-center gap-1.5 relative z-10">
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 tabular-nums ${momTrends.expensesDiffPercent <= 0 ? "bg-brand-subtle text-brand border-brand/20" : "bg-danger-subtle text-danger border-danger/20"}`}>
                {momTrends.expensesDiffPercent > 0 ? (
                  <TrendingUp className="w-3 h-3 shrink-0" />
                ) : (
                  <TrendingDown className="w-3 h-3 shrink-0" />
                )}
                <span>{momTrends.expensesDiffPercent > 0 ? `+${momTrends.expensesDiffPercent}%` : `${momTrends.expensesDiffPercent}%`} MoM</span>
              </span>
              <small className="text-xs text-text-faint font-medium truncate">vs zeszły mies.</small>
            </div>
          ) : (
            <small className="text-xs text-text-faint font-medium relative z-10 truncate block" title={totalExpense > 0 ? "Wydatki w wybranym miesiącu" : "Brak zarejestrowanych wydatków"}>
              {totalExpense > 0 ? "Wydatki w wybranym miesiącu" : "Brak zarejestrowanych wydatków"}
            </small>
          )}
        </div>

        {/* Balance Card */}
        <div className="bg-surface border border-border rounded-2xl p-5 relative shadow-sm hover:bg-surface transition group min-w-0">
          <div className="absolute inset-0 rounded-2xl pointer-events-none" />
          <span className="absolute top-4 right-4 bg-brand-subtle text-brand p-2 rounded-xl shrink-0 border border-brand/20 shadow-xs">
            <Wallet className="w-4 h-4 text-brand" />
          </span>
          <p className="text-xs font-bold text-text-muted mb-1 uppercase tracking-wider relative z-10 truncate pr-10" title="Pozostaje (Bilans)">Pozostaje (Bilans)</p>

          <h2 className={`text-2xl font-bold mb-1 relative z-10 truncate pr-10 tabular-nums ${balance >= 0 ? "text-brand" : "text-danger"}`} id="dash-balance-total" title={formatMoney(balance, currency)}>
            {formatMoney(balance, currency)}
          </h2>
          <DelayedTooltip
            className="block min-w-0 max-w-full"
            label="Aktualna nadwyżka finansowa (suma przychodów minus suma wydatków w wybranym miesiącu)."
            tooltipClassName="w-48 bg-surface border-border text-text-main"
          >
            <small className="text-xs text-text-muted font-medium cursor-help border-b border-dashed border-border relative z-10 pb-0.5 truncate max-w-full inline-block">
              Co to znaczy?
            </small>
          </DelayedTooltip>
          <div className="flex flex-col gap-1 mt-2 relative z-10 min-w-0">
            {emergencyLimit > 0 && (
              <div className="text-xs bg-brand-subtle text-brand px-2.5 py-1 rounded-md border border-brand/20 font-bold w-fit tracking-wide shadow-xs truncate max-w-full" title={`Limit awaryjny: ${formatMoney(emergencyLimit, currency)}`}>
                Limit awaryjny: <span className="tabular-nums">{formatMoney(emergencyLimit, currency)}</span>
              </div>
            )}
            {investmentCushion > 0 && (
              <div className="text-xs bg-surface-2 text-text-muted px-2.5 py-1 rounded-md border border-border font-bold w-fit tracking-wide shadow-xs truncate max-w-full" title={`Poduszka fin.: ${formatMoney(investmentCushion, currency)}`}>
                Poduszka fin.: <span className="tabular-nums">{formatMoney(investmentCushion, currency)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* End of Month Forecast Card */}
        <div className="border border-border bg-surface rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:bg-surface transition min-w-0">
          <div className="absolute inset-0 pointer-events-none" />
          <div className="flex items-start justify-between relative z-10 min-w-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 min-w-0">
                <div className="p-1.5 rounded-lg bg-brand-subtle text-brand border border-brand/20 shrink-0">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-text-main truncate" title="Prognoza na koniec miesiąca">Prognoza na koniec miesiąca</h3>
                <span className="bg-surface-2 border border-border text-text-muted text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">AI Auto-Calc</span>
              </div>
              <p className="text-xs text-text-muted font-medium truncate" title={`Przewidywany stan kont na dzień ${endOfMonthForecast.forecastDate}`}>
                Przewidywany stan kont na dzień <span className="tabular-nums">{endOfMonthForecast.forecastDate}</span>
              </p>
              <p className="text-xs text-text-faint mt-1 font-medium truncate" title="Wyliczane na bazie salda minus oczekujące opłaty cykliczne i rachunki.">Wyliczane na bazie salda minus oczekujące opłaty cykliczne i rachunki.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border relative z-10">
            <div className="bg-surface p-3.5 rounded-xl border border-border shadow-xs min-w-0 flex flex-col">
              <span className="text-xs uppercase font-semibold text-text-muted block mb-1 truncate" title="Planowane Wydatki">Planowane Wydatki</span>
              <span className="text-lg font-bold text-danger tabular-nums truncate" title={formatMoney(endOfMonthForecast.unpaidPaymentsSum + endOfMonthForecast.futureRecurringExpensesSum, currency)}>{formatMoney(endOfMonthForecast.unpaidPaymentsSum + endOfMonthForecast.futureRecurringExpensesSum, currency)}</span>
            </div>

            <div className="bg-surface p-3.5 rounded-xl border border-border shadow-xs min-w-0 flex flex-col">
              <span className="text-xs uppercase font-semibold text-text-muted block mb-1 truncate" title="Plan. Przychody">Plan. Przychody</span>
              <span className="text-lg font-bold text-brand tabular-nums truncate" title={formatMoney(endOfMonthForecast.futureRecurringIncomesSum, currency)}>{formatMoney(endOfMonthForecast.futureRecurringIncomesSum, currency)}</span>
            </div>

            <div className="bg-surface-2 p-3.5 rounded-xl border border-border min-w-0 flex flex-col">
              <span className="text-xs uppercase font-semibold text-text-muted block mb-1 truncate" title="Prognozowane Saldo">Prognozowane Saldo</span>
              <span className={`text-lg font-black tabular-nums truncate ${endOfMonthForecast.forecastedBalance >= 0 ? "text-brand" : "text-danger"}`} title={formatMoney(endOfMonthForecast.forecastedBalance, currency)}>
                {formatMoney(endOfMonthForecast.forecastedBalance, currency)}
              </span>
            </div>
          </div>

          {endOfMonthForecast.isNegative && (
            <div className="mt-3.5 bg-danger-subtle border border-danger/30 rounded-xl p-3 text-xs text-danger flex items-start gap-2 relative z-10 min-w-0 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <span className="min-w-0"><strong>Uwaga:</strong> Zbliżasz się do debetu! Prognozowane wydatki w tym miesiącu przekroczą dostępne środki.</span>
            </div>
          )}
        </div>

        {/* Safe Amount To Spend Card */}
        <div
          id="safe-amount-to-spend-card"
          className={`border rounded-2xl p-5 shadow-sm transition-all relative overflow-hidden min-w-0 ${
            safeBreakdown.isNegative
              ? "bg-danger-subtle border-danger/30"
              : "bg-surface border-border hover:bg-surface"
          }`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 shadow-xs ${
                safeBreakdown.isNegative ? "bg-danger-subtle border-danger/30 text-danger" : "bg-brand-subtle border-brand/20 text-brand"
              }`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`text-sm font-bold truncate ${safeBreakdown.isNegative ? "text-danger" : "text-brand"} `} title="Bezpieczna Kwota do Wydania">
                  Bezpieczna Kwota do Wydania
                </h3>
                <p className={`text-xs font-medium mt-0.5 truncate ${safeBreakdown.isNegative ? "text-danger/70" : "text-text-muted"}`} title="Po odliczeniu nadchodzących opłat i celów">
                  Po odliczeniu nadchodzących opłat i celów
                </p>
              </div>
            </div>
            <button
              onClick={() => onChangeView("analysis")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold active:scale-[0.98] transition-all whitespace-nowrap shadow-xs border shrink-0 flex items-center gap-1 focus-visible:ring-2 cursor-pointer ${
                safeBreakdown.isNegative
                ? "bg-danger-subtle text-danger hover:bg-danger-subtle/80 border-danger/30 focus-visible:ring-focus-ring"
                : "bg-brand-subtle text-brand hover:bg-brand-subtle/80 border-brand/20 focus-visible:ring-focus-ring"
              }`}
            >
              <span>Zobacz Analizę</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-xs uppercase tracking-wider font-bold text-text-muted block mb-0.5 truncate" title="Dostępne dzisiaj">Dostępne dzisiaj</span>
              <span className={`text-2xl sm:text-3xl font-black tabular-nums truncate block ${safeBreakdown.isNegative ? "text-danger" : "text-brand"}`} title={formatMoney(safeBreakdown.safeToSpend, currency)}>
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
                    <span className="text-xs font-medium text-text-muted cursor-help border-b border-dashed border-border pb-0.5 truncate max-w-full block">
                      Zarezerwowane
                    </span>
                  </DelayedTooltip>
                </div>
                <span className="text-sm font-bold text-text-main tabular-nums truncate block max-w-full" title={formatMoney(safeBreakdown.reservedGoalsSum, currency)}>{formatMoney(safeBreakdown.reservedGoalsSum, currency)}</span>
              </div>
              <div className="flex flex-col items-end justify-start min-w-0 sm:min-w-[96px]">
                <div className="h-5 flex items-end mb-1 max-w-full">
                  <span className="text-xs font-medium text-text-muted border-b border-transparent pb-0.5 truncate block" title="Rezerwa opłat">Rezerwa opłat</span>
                </div>
                <span className="text-sm font-bold text-text-main tabular-nums truncate block max-w-full" title={formatMoney(safeBreakdown.futureRecurringExpensesSum + safeBreakdown.unpaidPaymentsSum, currency)}>{formatMoney(safeBreakdown.futureRecurringExpensesSum + safeBreakdown.unpaidPaymentsSum, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Runway & Liquidity Cushion Card */}
        {runway && (
          <div className="border border-border bg-surface rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:bg-surface transition min-w-0 lg:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-brand-subtle text-brand flex items-center justify-center border border-brand/20 shrink-0 shadow-xs">
                  <Hourglass className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h3 className="text-sm font-bold text-text-main truncate" title="Runway — Poduszka Płynności Finansowej">
                      Runway (Poduszka Płynności)
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider inline-flex items-center gap-1.5 ${
                        runway.status === "healthy"
                          ? "bg-brand-subtle text-brand border-brand/20"
                          : runway.status === "warning"
                          ? "bg-warning-subtle text-warning border-warning/20"
                          : runway.status === "infinite"
                          ? "bg-brand-subtle text-brand border-brand/20"
                          : "bg-danger-subtle text-danger border-danger/20"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        runway.status === "healthy" || runway.status === "infinite"
                          ? "bg-brand"
                          : runway.status === "warning"
                          ? "bg-warning"
                          : "bg-danger"
                      }`} />
                      <span>
                        {runway.status === "healthy" && "Bezpieczna (≥6 mies.)"}
                        {runway.status === "warning" && "Umiarkowana (3-6 mies.)"}
                        {runway.status === "critical" && "Krytyczna (<3 mies.)"}
                        {runway.status === "infinite" && "Nielimitowana"}
                      </span>
                    </span>
                  </div>
                  <p className="text-xs text-text-muted font-medium truncate">
                    Szacunek na ile miesięcy wystarczy środków przy średnich miesięcznych wydatkach
                  </p>
                </div>
              </div>
              <button
                onClick={() => onChangeView("analysis")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold active:scale-[0.98] transition-all whitespace-nowrap shadow-xs border shrink-0 bg-surface-2 hover:bg-surface text-text-main border-border cursor-pointer flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <span>Szczegóły płynności</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border relative z-10">
              <div className="bg-surface p-3.5 rounded-xl border border-border min-w-0 flex flex-col">
                <span className="text-xs uppercase font-semibold text-text-muted block mb-1">Długość poduszki</span>
                <span className="text-xl font-black text-text-main tabular-nums">
                  {runway.runwayMonths === Infinity ? "Nielimitowana" : `${runway.runwayMonths} mies.`}
                </span>
              </div>
              <div className="bg-surface p-3.5 rounded-xl border border-border min-w-0 flex flex-col">
                <span className="text-xs uppercase font-semibold text-text-muted block mb-1">Płynne aktywa</span>
                <span className="text-lg font-bold text-brand tabular-nums truncate" title={formatMoney(runway.liquidAssets, currency)}>
                  {formatMoney(runway.liquidAssets, currency)}
                </span>
              </div>
              <div className="bg-surface p-3.5 rounded-xl border border-border min-w-0 flex flex-col">
                <span className="text-xs uppercase font-semibold text-text-muted block mb-1">Śr. miesięczne koszty</span>
                <span className="text-lg font-bold text-danger tabular-nums truncate" title={formatMoney(runway.avgMonthlyExpenses, currency)}>
                  {formatMoney(runway.avgMonthlyExpenses, currency)} / mies.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
