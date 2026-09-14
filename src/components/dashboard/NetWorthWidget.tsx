import React, { useMemo } from "react";
import { Profile, SupportedCurrency } from "../../types";
import { calculateNetWorthSummary } from "../../services/netWorthCalculations";
import { formatMoney } from "../../utils";
import {
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Landmark,
} from "lucide-react";

export interface NetWorthWidgetProps {
  profile: Profile;
  currency?: SupportedCurrency;
  onOpenNetWorthModal?: () => void;
  onChangeView?: (view: string) => void;
}

export function NetWorthWidget({
  profile,
  currency = "PLN",
  onOpenNetWorthModal,
  onChangeView,
}: NetWorthWidgetProps) {
  const summary = useMemo(() => calculateNetWorthSummary(profile), [profile]);
  const cur = profile.currency || currency;

  const totalAssets = summary.assets.totalAssets;
  const totalLiabilities = summary.liabilities.totalLiabilities;
  const totalGross = totalAssets + totalLiabilities;
  const assetsPercent = totalGross > 0 ? Math.round((totalAssets / totalGross) * 100) : 100;
  const liabilitiesPercent = 100 - assetsPercent;

  const debtRatio = summary.debtToAssetsRatio;
  const debtRatioColor =
    debtRatio <= 30
      ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
      : debtRatio <= 60
      ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
      : "text-rose-500 bg-rose-500/10 border-rose-500/20";

  const isNetPositive = summary.netWorth >= 0;

  return (
    <div
      id="dashboard-net-worth-widget"
      data-testid="net-worth-widget"
      className="bg-surface border border-border/70 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-4 h-full transition-all hover:border-border"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-subtle text-brand border border-brand/20 shrink-0">
            <Landmark className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-main tracking-tight">
                Majątek Netto
              </h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-surface-2 text-text-muted border-border/60">
                Wealthfolio
              </span>
            </div>
            <p className="text-xs text-text-muted">Aktywa pomniejszone o pasywa</p>
          </div>
        </div>

        {onOpenNetWorthModal && (
          <button
            type="button"
            onClick={onOpenNetWorthModal}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shrink-0"
            id="btn-open-net-worth-modal"
            aria-label="Otwórz szczegóły majątku netto"
          >
            <span>Szczegóły</span>
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Main Net Worth Metric */}
      <div>
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <span
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${
              isNetPositive ? "text-text-main" : "text-rose-500"
            }`}
            data-testid="net-worth-value"
          >
            {formatMoney(summary.netWorth, cur)}
          </span>

          {summary.momChange.absolute !== 0 && (
            <div
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${
                summary.momChange.absolute > 0
                  ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400"
                  : "text-rose-600 bg-rose-500/10 border-rose-500/20 dark:text-rose-400"
              }`}
            >
              {summary.momChange.absolute > 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {summary.momChange.absolute > 0 ? "+" : ""}
                {summary.momChange.percentage.toFixed(1)}% m/m
              </span>
            </div>
          )}
        </div>

        {/* Proportional Assets vs Liabilities Bar */}
        <div className="mt-3">
          <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden flex" title={`Aktywa: ${assetsPercent}%, Pasywa: ${liabilitiesPercent}%`}>
            <div
              className="bg-emerald-500 transition-all duration-500 rounded-l-full"
              style={{ width: `${assetsPercent}%` }}
            />
            <div
              className="bg-rose-500 transition-all duration-500 rounded-r-full"
              style={{ width: `${liabilitiesPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border/50 text-xs">
        <div className="bg-surface-2/60 p-2.5 rounded-lg border border-border/40">
          <span className="text-[10px] uppercase font-semibold text-text-muted block mb-0.5">
            Aktywa
          </span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums truncate block">
            {formatMoney(totalAssets, cur)}
          </span>
        </div>

        <div className="bg-surface-2/60 p-2.5 rounded-lg border border-border/40">
          <span className="text-[10px] uppercase font-semibold text-text-muted block mb-0.5">
            Pasywa (Długi)
          </span>
          <span className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums truncate block">
            {formatMoney(totalLiabilities, cur)}
          </span>
        </div>

        <div className="bg-surface-2/60 p-2.5 rounded-lg border border-border/40">
          <span className="text-[10px] uppercase font-semibold text-text-muted block mb-0.5">
            Zadłużenie / Aktywa
          </span>
          <span className={`text-sm font-bold tabular-nums truncate block ${debtRatio > 60 ? "text-rose-500" : debtRatio > 30 ? "text-amber-500" : "text-emerald-500"}`}>
            {debtRatio.toFixed(1)}%
          </span>
        </div>

        <div className="bg-surface-2/60 p-2.5 rounded-lg border border-border/40">
          <span className="text-[10px] uppercase font-semibold text-text-muted block mb-0.5">
            Poduszka (Runway)
          </span>
          <span className="text-sm font-bold text-text-main tabular-nums truncate block">
            {summary.liquidRunwayMonths >= 99 ? "Bez limitu" : `${summary.liquidRunwayMonths} mc`}
          </span>
        </div>
      </div>
    </div>
  );
}
