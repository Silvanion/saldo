import React, { memo } from "react";
import { DelayedTooltip } from "./DelayedTooltip";
import { SafeToSpendBreakdown, RunwayCalculation, MoMTrend } from "../../services/budgetCalculations";
import { formatMoney } from "../../utils/format";
import { TrendingUp, TrendingDown, Wallet, CalendarClock, ShieldCheck, Hourglass, AlertTriangle, ArrowRight, ChevronRight } from "lucide-react";
import { ReasonCard } from "../shared/ReasonCard";
import { useAiExplain } from "../../hooks/useAiExplain";
import type { CalculationReason } from "../../types";

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
  middleRowSlot?: React.ReactNode;
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
  onChangeView,
  middleRowSlot
}: StatsWidgetProps) {
  const { isAiEnabled, explainReason } = useAiExplain();
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* LEVEL 1: Core Financial Metrics (3-column grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="widget-content-stats-grid">
        {/* Income Card */}
        <div
          onClick={() => onChangeView("transactions")}
          className="bg-surface border border-border/70 rounded-xl p-4 sm:p-5 relative shadow-xs hover:border-brand/40 hover:bg-surface-2 transition-all cursor-pointer group min-w-0"
          title="Kliknij, aby przejść do listy transakcji"
        >
          <span className="absolute top-4 right-4 bg-brand-subtle text-brand p-2 rounded-xl shrink-0 border border-brand/20 shadow-xs group-hover:scale-105 transition-transform">
            <TrendingUp className="w-4 h-4 text-brand" strokeWidth={1.75} />
          </span>
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider relative z-10 truncate pr-10" title="Przychody">Przychody</p>
            <ArrowRight className="w-3 h-3 text-text-faint opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.75} />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-brand mb-1.5 relative z-10 truncate pr-10 tabular-nums" id="dash-income-total" title={formatMoney(totalIncome, currency)}>
            {formatMoney(totalIncome, currency)}
          </h2>
          {momTrends && momTrends.previousMonthIncome > 0 ? (
            <div className="flex items-center gap-1.5 relative z-10">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1 tabular-nums ${
                momTrends.incomeDiffPercent >= 0 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40" 
                  : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40"
              }`}>
                {momTrends.incomeDiffPercent >= 0 ? (
                  <TrendingUp className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                ) : (
                  <TrendingDown className="w-3 h-3 shrink-0" strokeWidth={1.75} />
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
        <div
          onClick={() => onChangeView("transactions")}
          className="bg-surface border border-border/70 rounded-xl p-4 sm:p-5 relative shadow-xs hover:border-rose-500/40 hover:bg-surface-2 transition-all cursor-pointer group min-w-0"
          title="Kliknij, aby przejść do listy transakcji"
        >
          <span className="absolute top-4 right-4 bg-danger-subtle text-danger p-2 rounded-xl shrink-0 border border-danger/20 shadow-xs group-hover:scale-105 transition-transform">
            <TrendingDown className="w-4 h-4 text-danger" strokeWidth={1.75} />
          </span>
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider relative z-10 truncate pr-10" title="Wydatki">Wydatki</p>
            <ArrowRight className="w-3 h-3 text-text-faint opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.75} />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-danger mb-1.5 relative z-10 truncate pr-10 tabular-nums" id="dash-expense-total" title={formatMoney(totalExpense, currency)}>
            {formatMoney(totalExpense, currency)}
          </h2>
          {momTrends && momTrends.previousMonthExpenses > 0 ? (
            <div className="flex items-center gap-1.5 relative z-10">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1 tabular-nums ${
                momTrends.expensesDiffPercent <= 0 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40" 
                  : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40"
              }`}>
                {momTrends.expensesDiffPercent > 0 ? (
                  <TrendingUp className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                ) : (
                  <TrendingDown className="w-3 h-3 shrink-0" strokeWidth={1.75} />
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
        <div
          onClick={() => onChangeView("analysis")}
          className="bg-surface border border-border/70 rounded-xl p-4 sm:p-5 relative shadow-xs hover:border-brand/40 hover:bg-surface-2 transition-all cursor-pointer group min-w-0"
          title="Kliknij, aby przejść do analizy"
        >
          <span className="absolute top-4 right-4 bg-brand-subtle text-brand p-2 rounded-xl shrink-0 border border-brand/20 shadow-xs group-hover:scale-105 transition-transform">
            <Wallet className="w-4 h-4 text-brand" strokeWidth={1.75} />
          </span>
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs font-semibold text-text-muted mb-1 uppercase tracking-wider relative z-10 truncate pr-10" title="Pozostaje (Bilans)">Pozostaje (Bilans)</p>
            <ArrowRight className="w-3 h-3 text-text-faint opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.75} />
          </div>

          <h2 className={`text-2xl font-semibold tracking-tight mb-1 relative z-10 truncate pr-10 tabular-nums ${balance >= 0 ? "text-brand" : "text-danger"}`} id="dash-balance-total" title={formatMoney(balance, currency)}>
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
              <div className="text-xs bg-brand-subtle text-brand px-2.5 py-0.5 rounded-md border border-brand/20 font-medium w-fit tracking-wide shadow-2xs truncate max-w-full" title={`Limit awaryjny: ${formatMoney(emergencyLimit, currency)}`}>
                Limit awaryjny: <span className="tabular-nums font-semibold">{formatMoney(emergencyLimit, currency)}</span>
              </div>
            )}
            {investmentCushion > 0 && (
              <div className="text-xs bg-surface-2 text-text-muted px-2.5 py-0.5 rounded-md border border-border font-medium w-fit tracking-wide shadow-2xs truncate max-w-full" title={`Poduszka fin.: ${formatMoney(investmentCushion, currency)}`}>
                Poduszka fin.: <span className="tabular-nums font-semibold">{formatMoney(investmentCushion, currency)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LEVEL 2: Optional Middle Row Slot (Analytics & Insights 2-col layout) */}
      {middleRowSlot && (
        <div className="w-full">
          {middleRowSlot}
        </div>
      )}

      {/* LEVEL 3: Projections & Budgets (2-column grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* End of Month Forecast Card */}
        <div className="border border-border/70 bg-surface rounded-xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-border transition min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between relative z-10 min-w-0 gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 min-w-0">
                  <div className="p-1.5 rounded-lg bg-brand-subtle text-brand border border-brand/20 shrink-0">
                    <CalendarClock className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-sm font-semibold text-text-main tracking-tight truncate" title="Prognoza na koniec miesiąca">Prognoza na koniec miesiąca</h3>
                  <span className="bg-surface-2 border border-border text-text-muted text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">AI Calc</span>
                </div>
                <p className="text-xs text-text-muted font-medium truncate" title={`Przewidywany stan kont na dzień ${endOfMonthForecast.forecastDate}`}>
                  Przewidywany stan kont na dzień <span className="tabular-nums font-semibold">{endOfMonthForecast.forecastDate}</span>
                </p>
                <p className="text-xs text-text-faint mt-0.5 font-medium truncate" title="Wyliczane na bazie salda minus oczekujące opłaty cykliczne i rachunki.">Wyliczane na bazie salda minus oczekujące opłaty cykliczne i rachunki.</p>
              </div>
              <button
                onClick={() => onChangeView("analysis")}
                className="text-xs font-medium text-text-muted hover:text-text-main hover:bg-surface-2 px-2.5 py-1.5 rounded-lg transition-colors shrink-0 flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                title="Przejdź do analizy przepływów"
                aria-label="Szczegóły prognozy"
              >
                <span>Analiza</span>
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/60 relative z-10">
              <div className="bg-surface-2/60 p-3 rounded-lg border border-border/50 shadow-2xs min-w-0 flex flex-col">
                <span className="text-[11px] uppercase font-semibold text-text-muted block mb-0.5 truncate" title="Planowane Wydatki">Planowane Wydatki</span>
                <span className={`text-base font-semibold tabular-nums truncate ${(endOfMonthForecast.unpaidPaymentsSum + endOfMonthForecast.futureRecurringExpensesSum) > 0 ? "text-danger" : "text-text-main"}`} title={formatMoney(endOfMonthForecast.unpaidPaymentsSum + endOfMonthForecast.futureRecurringExpensesSum, currency)}>{formatMoney(endOfMonthForecast.unpaidPaymentsSum + endOfMonthForecast.futureRecurringExpensesSum, currency)}</span>
              </div>

              <div className="bg-surface-2/60 p-3 rounded-lg border border-border/50 shadow-2xs min-w-0 flex flex-col">
                <span className="text-[11px] uppercase font-semibold text-text-muted block mb-0.5 truncate" title="Plan. Przychody">Plan. Przychody</span>
                <span className="text-base font-semibold text-brand tabular-nums truncate" title={formatMoney(endOfMonthForecast.futureRecurringIncomesSum, currency)}>{formatMoney(endOfMonthForecast.futureRecurringIncomesSum, currency)}</span>
              </div>

              <div className="bg-surface-2 p-3 rounded-lg border border-border min-w-0 flex flex-col">
                <span className="text-[11px] uppercase font-semibold text-text-muted block mb-0.5 truncate" title="Prognozowane Saldo">Prognozowane Saldo</span>
                <span className={`text-base font-bold tabular-nums truncate ${endOfMonthForecast.forecastedBalance >= 0 ? "text-brand" : "text-danger"}`} title={formatMoney(endOfMonthForecast.forecastedBalance, currency)}>
                  {formatMoney(endOfMonthForecast.forecastedBalance, currency)}
                </span>
              </div>
            </div>
          </div>

          {endOfMonthForecast.isNegative && (
            <div className="mt-3 bg-danger-subtle border border-danger/30 rounded-lg p-2.5 text-xs text-danger flex items-start gap-2 relative z-10 min-w-0 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" strokeWidth={1.75} />
              <span className="min-w-0"><strong>Uwaga:</strong> Zbliżasz się do debetu! Prognozowane wydatki w tym miesiącu przekroczą dostępne środki.</span>
            </div>
          )}
        </div>

        {/* Safe Amount To Spend Card */}
        <div
          id="safe-amount-to-spend-card"
          className={`border rounded-xl p-4 sm:p-5 shadow-xs transition-all relative overflow-hidden min-w-0 flex flex-col justify-between ${
            safeBreakdown.isNegative
              ? "bg-danger-subtle border-danger/30"
              : "bg-surface border-border/70 hover:border-border"
          }`}
        >
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative z-10">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 shadow-2xs ${
                  safeBreakdown.isNegative ? "bg-danger-subtle border-danger/30 text-danger" : "bg-brand-subtle border-brand/20 text-brand"
                }`}>
                  <ShieldCheck className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`text-sm font-semibold tracking-tight truncate ${safeBreakdown.isNegative ? "text-danger" : "text-text-main"} `} title="Bezpieczna Kwota do Wydania">
                    Bezpieczna Kwota do Wydania
                  </h3>
                  <p className={`text-xs font-medium mt-0.5 truncate ${safeBreakdown.isNegative ? "text-danger/70" : "text-text-muted"}`} title="Po odliczeniu nadchodzących opłat i celów">
                    Po odliczeniu nadchodzących opłat i celów
                  </p>
                </div>
              </div>
              <button
                onClick={() => onChangeView("analysis")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium active:scale-[0.98] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 focus-visible:ring-2 cursor-pointer ${
                  safeBreakdown.isNegative
                  ? "bg-danger-subtle text-danger hover:bg-danger-subtle/80 border border-danger/30 focus-visible:ring-focus-ring"
                  : "text-text-muted hover:text-text-main hover:bg-surface-2 focus-visible:ring-focus-ring"
                }`}
                aria-label="Zobacz Analizę"
              >
                <span>Zobacz Analizę</span>
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 min-w-0">
              <div className="min-w-0 flex-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-text-muted block mb-0.5 truncate" title="Dostępne dzisiaj">Dostępne dzisiaj</span>
                <span className={`text-2xl sm:text-3xl font-bold tracking-tight tabular-nums truncate block ${safeBreakdown.isNegative ? "text-danger" : "text-brand"}`} title={formatMoney(safeBreakdown.safeToSpend, currency)}>
                  {formatMoney(safeBreakdown.safeToSpend, currency)}
                </span>
              </div>

              <div className="flex gap-4 sm:gap-6 shrink-0 min-w-0">
                <div className="hidden sm:flex flex-col items-end justify-start min-w-0 sm:min-w-[96px]">
                  <div className="h-5 flex items-end mb-0.5 min-w-0">
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
                  <span className="text-sm font-semibold text-text-main tabular-nums truncate block max-w-full" title={formatMoney(safeBreakdown.reservedGoalsSum, currency)}>{formatMoney(safeBreakdown.reservedGoalsSum, currency)}</span>
                </div>
                <div className="flex flex-col items-end justify-start min-w-0 sm:min-w-[96px]">
                  <div className="h-5 flex items-end mb-0.5 max-w-full">
                    <span className="text-xs font-medium text-text-muted border-b border-transparent pb-0.5 truncate block" title="Rezerwa opłat">Rezerwa opłat</span>
                  </div>
                  <span className="text-sm font-semibold text-text-main tabular-nums truncate block max-w-full" title={formatMoney(safeBreakdown.futureRecurringExpensesSum + safeBreakdown.unpaidPaymentsSum, currency)}>{formatMoney(safeBreakdown.futureRecurringExpensesSum + safeBreakdown.unpaidPaymentsSum, currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Runway & Liquidity Cushion Card */}
        {runway && (
          <div className="border border-border/70 bg-surface rounded-xl p-4 sm:p-5 shadow-xs relative overflow-hidden group hover:border-border transition min-w-0 lg:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative z-10">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-brand-subtle text-brand flex items-center justify-center border border-brand/20 shrink-0 shadow-2xs">
                  <Hourglass className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h3 className="text-sm font-semibold text-text-main tracking-tight truncate" title="Runway — Poduszka Płynności Finansowej">
                      Runway (Poduszka Płynności)
                    </h3>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider inline-flex items-center gap-1.5 ${
                        runway.status === "critical"
                          ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40"
                          : runway.status === "warning"
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40"
                          : runway.status === "infinite"
                          ? "bg-surface-2 text-text-muted border-border"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40"
                      }`}
                    >
                      {runway.status === "critical" && "Ryzyko płynności"}
                      {runway.status === "warning" && "Umiarkowana ochrona"}
                      {runway.status === "healthy" && "Wysoka ochrona"}
                      {runway.status === "infinite" && "Brak danych o wydatkach"}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted font-medium truncate" title="Liczba miesięcy, na ile wystarczą Twoje rezerwy i oszczędności przy obecnym tempie wydatków.">
                    Liczba miesięcy, na ile wystarczą Twoje rezerwy i oszczędności przy obecnym tempie wydatków.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onChangeView("analysis")}
                className="text-xs font-medium text-text-muted hover:text-text-main hover:bg-surface-2 px-2.5 py-1.5 rounded-lg transition-colors shrink-0 flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                title="Przejdź do symulatora poduszki"
                aria-label="Szczegóły płynności"
              >
                <span>Szczegóły płynności</span>
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>

            {runway.status === "infinite" ? (() => {
              const runwayReason: CalculationReason = {
                code: "runway-no-expense-history",
                severity: "info",
                title: "Za mało danych, by wyliczyć poduszkę płynności",
                message: `Masz zgromadzone ${formatMoney(runway.liquidAssets, currency)} płynnych środków, ale bez żadnych zarejestrowanych wydatków w ostatnich miesiącach aplikacja nie może wyliczyć Twojego tempa spalania gotówki (burn rate) — stąd brak liczby miesięcy poniżej.`,
                actionLabel: "Dodaj pierwszą transakcję wydatku",
                onAction: () => onChangeView("transactions")
              };
              return (
              <div className="mt-4 pt-4 border-t border-border/60 relative z-10">
                <ReasonCard
                  reason={runwayReason}
                  onAskAi={isAiEnabled ? () => explainReason(runwayReason) : undefined}
                />
              </div>
              );
            })() : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/60 relative z-10">
              <div className="bg-surface-2/60 p-3 rounded-lg border border-border/50 min-w-0 flex flex-col">
                <span className="text-[11px] uppercase font-semibold text-text-muted block mb-0.5">Długość poduszki</span>
                <span className="text-lg font-bold text-text-main tabular-nums">
                  {runway.runwayMonths === Infinity ? "Nielimitowana" : `${runway.runwayMonths} mies.`}
                </span>
              </div>
              <div className="bg-surface-2/60 p-3 rounded-lg border border-border/50 min-w-0 flex flex-col">
                <span className="text-[11px] uppercase font-semibold text-text-muted block mb-0.5">Płynne aktywa</span>
                <span className="text-base font-semibold text-brand tabular-nums truncate" title={formatMoney(runway.liquidAssets, currency)}>
                  {formatMoney(runway.liquidAssets, currency)}
                </span>
              </div>
              <div className="bg-surface-2/60 p-3 rounded-lg border border-border/50 min-w-0 flex flex-col">
                <span className="text-[11px] uppercase font-semibold text-text-muted block mb-0.5">Śr. miesięczne koszty</span>
                <span className="text-base font-semibold text-danger tabular-nums truncate" title={formatMoney(runway.avgMonthlyExpenses, currency)}>
                  {formatMoney(runway.avgMonthlyExpenses, currency)} / mies.
                </span>
              </div>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

