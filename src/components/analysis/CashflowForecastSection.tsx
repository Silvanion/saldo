import React, { useState, useMemo } from "react";
import { Profile, RecurringRule } from "../../types";
import { calculateCashflowForecast, CashflowHorizonSummary } from "../../services/cashflowForecast";
import { formatMoney } from "../../utils/format";
import { formatDate } from "../../utils/date";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Sparkles,
  Info
} from "lucide-react";

interface CashflowForecastSectionProps {
  profile: Profile;
  recurringRules?: RecurringRule[];
}

export function CashflowForecastSection({ profile, recurringRules = [] }: CashflowForecastSectionProps) {
  const [horizon, setHorizon] = useState<30 | 60 | 90>(30);

  const forecast = useMemo(() => {
    return calculateCashflowForecast(profile, recurringRules, {
      safetyBuffer: 500,
      includeDailyRunRate: true
    });
  }, [profile, recurringRules]);

  const activeSummary: CashflowHorizonSummary = useMemo(() => {
    if (horizon === 30) return forecast.summary30;
    if (horizon === 60) return forecast.summary60;
    return forecast.summary90;
  }, [forecast, horizon]);

  const currency = profile.currency || "PLN";
  const horizonPoints = useMemo(() => {
    return forecast.timeline.slice(0, horizon);
  }, [forecast.timeline, horizon]);

  const eventsInHorizon = useMemo(() => {
    return forecast.upcomingEvents.filter((ev) => {
      const daysDiff = Math.ceil(
        (new Date(ev.date + "T00:00:00").getTime() - new Date(forecast.todayIso + "T00:00:00").getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return daysDiff > 0 && daysDiff <= horizon;
    });
  }, [forecast.upcomingEvents, forecast.todayIso, horizon]);

  // SVG Chart calculation
  const chartData = useMemo(() => {
    if (horizonPoints.length === 0) return { path: "", min: 0, max: 0, points: [] };

    const values = horizonPoints.map((p) => p.projectedBalance);
    const minVal = Math.min(forecast.currentBalance, ...values, 0);
    const maxVal = Math.max(forecast.currentBalance, ...values, 1000);
    const range = maxVal - minVal || 1;

    const width = 600;
    const height = 120;
    const paddingY = 16;

    const coords = horizonPoints.map((p, idx) => {
      const x = (idx / (horizonPoints.length - 1 || 1)) * width;
      const normalizedY = (p.projectedBalance - minVal) / range;
      const y = height - paddingY - normalizedY * (height - paddingY * 2);
      return { x, y, balance: p.projectedBalance, date: p.date, dayOffset: p.dayOffset, isRiskDip: p.isRiskDip };
    });

    const startX = 0;
    const startNormalizedY = (forecast.currentBalance - minVal) / range;
    const startY = height - paddingY - startNormalizedY * (height - paddingY * 2);

    let path = `M ${startX},${startY}`;
    coords.forEach((c) => {
      path += ` L ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
    });

    const zeroY = height - paddingY - ((0 - minVal) / range) * (height - paddingY * 2);
    const bufferY = height - paddingY - ((forecast.safetyBuffer - minVal) / range) * (height - paddingY * 2);

    return {
      path,
      min: minVal,
      max: maxVal,
      zeroY,
      bufferY,
      points: coords,
      width,
      height
    };
  }, [horizonPoints, forecast.currentBalance, forecast.safetyBuffer]);

  return (
    <div
      className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6"
      id="cashflow-forecast-card"
      role="region"
      aria-label="Prognoza Cashflow i Płynności"
    >
      {/* Header with segmented horizon control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-text-main">Prognoza Cashflow & Płynności</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-subtle text-brand border border-brand/20 uppercase tracking-wider">
                {horizon} dni
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Symulacja salda z uwzględnieniem rachunków, pensji cyklicznych i budżetów
            </p>
          </div>
        </div>

        {/* Horizon selector buttons */}
        <div
          className="flex bg-surface-2 p-1 rounded-xl border border-border self-start sm:self-auto shadow-xs"
          role="tablist"
          aria-label="Wybór horyzontu prognozy"
        >
          {([30, 60, 90] as const).map((h) => (
            <button
              key={h}
              type="button"
              role="tab"
              aria-selected={horizon === h}
              onClick={() => setHorizon(h)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
                horizon === h
                  ? "bg-surface text-brand shadow-xs border border-border"
                  : "text-text-muted hover:text-text-main"
              }`}
              id={`btn-horizon-${h}`}
            >
              {h} dni
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Projected End Balance */}
        <div className="p-4 bg-surface-2 rounded-xl border border-border shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-text-faint uppercase tracking-wider block">
            Prognoza na {formatDate(activeSummary.targetDate)}
          </span>
          <div className="my-2">
            <span
              className={`text-xl font-black tabular-nums block ${
                activeSummary.projectedBalance < 0
                  ? "text-danger"
                  : activeSummary.projectedBalance < forecast.safetyBuffer
                  ? "text-warning"
                  : "text-text-main"
              }`}
              id="kpi-projected-balance"
            >
              {formatMoney(activeSummary.projectedBalance, currency)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold tabular-nums">
            {activeSummary.netChange >= 0 ? (
              <span className="text-brand flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{formatMoney(activeSummary.netChange, currency)}
              </span>
            ) : (
              <span className="text-danger flex items-center gap-0.5">
                <ArrowDownRight className="w-3.5 h-3.5" /> {formatMoney(activeSummary.netChange, currency)}
              </span>
            )}
            <span className="text-text-faint font-normal">vs dziś</span>
          </div>
        </div>

        {/* Card 2: Lowest Balance Point (Cash Dip) */}
        <div className="p-4 bg-surface-2 rounded-xl border border-border shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-text-faint uppercase tracking-wider block">
            Najniższy punkt (Cash Dip)
          </span>
          <div className="my-2">
            <span
              className={`text-xl font-black tabular-nums block ${
                activeSummary.lowestPoint.amount < 0
                  ? "text-danger"
                  : activeSummary.lowestPoint.amount < forecast.safetyBuffer
                  ? "text-warning"
                  : "text-text-main"
              }`}
              id="kpi-lowest-balance"
            >
              {formatMoney(activeSummary.lowestPoint.amount, currency)}
            </span>
          </div>
          <span className="text-[11px] text-text-muted font-medium">
            Termin: <strong className="text-text-main">{formatDate(activeSummary.lowestPoint.date)}</strong>
          </span>
        </div>

        {/* Card 3: Risk Days Warning */}
        <div
          className={`p-4 rounded-xl border shadow-xs flex flex-col justify-between ${
            activeSummary.riskDaysCount > 0
              ? "bg-warning-subtle/50 border-warning/30 text-warning"
              : "bg-surface-2 border-border text-text-main"
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider block">
            {activeSummary.riskDaysCount > 0 ? "Dni ryzyka płynności" : "Stabilność płynności"}
          </span>
          <div className="my-2 flex items-center gap-2">
            {activeSummary.riskDaysCount > 0 ? (
              <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-brand shrink-0" />
            )}
            <span className="text-xl font-black tabular-nums" id="kpi-risk-days">
              {activeSummary.riskDaysCount} {activeSummary.riskDaysCount === 1 ? "dzień" : "dni"}
            </span>
          </div>
          <span className="text-[11px] text-text-muted font-medium">
            {activeSummary.riskDaysCount > 0
              ? `Poniżej bufora ${formatMoney(forecast.safetyBuffer, currency)}`
              : "Brak zagrożeń poniżej progu"}
          </span>
        </div>

        {/* Card 4: Upcoming Outflows */}
        <div className="p-4 bg-surface-2 rounded-xl border border-border shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-text-faint uppercase tracking-wider block">
            Wypływy w okresie ({horizon}d)
          </span>
          <div className="my-2">
            <span className="text-xl font-black text-text-main tabular-nums block" id="kpi-total-outflows">
              {formatMoney(activeSummary.totalExpenses, currency)}
            </span>
          </div>
          <span className="text-[11px] text-text-muted font-medium">
            Rachunki: <strong>{formatMoney(activeSummary.totalBills, currency)}</strong> + Zmienne:{" "}
            <strong>{formatMoney(activeSummary.totalVariableSpend, currency)}</strong>
          </span>
        </div>
      </div>

      {/* Trajectory Curve SVG Chart */}
      <div className="p-4 sm:p-5 bg-surface-2 rounded-2xl border border-border shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-text-main flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-brand" /> Trajektoria salda gotówkowego
          </span>
          <div className="flex items-center gap-3 text-[11px] text-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-brand rounded-full inline-block" /> Saldo
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 border-b border-dashed border-warning inline-block" /> Bufor bezpieczeństwa ({formatMoney(forecast.safetyBuffer, currency)})
            </span>
          </div>
        </div>

        <div className="relative w-full h-32 overflow-hidden select-none">
          <svg
            viewBox={`0 0 ${chartData.width} ${chartData.height}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="cashflowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Safety buffer line */}
            {chartData.bufferY >= 0 && chartData.bufferY <= chartData.height && (
              <line
                x1="0"
                y1={chartData.bufferY}
                x2={chartData.width}
                y2={chartData.bufferY}
                stroke="var(--color-warning)"
                strokeDasharray="4 4"
                strokeWidth="1.5"
                opacity="0.6"
              />
            )}

            {/* Trajectory area & line */}
            <path
              d={`${chartData.path} L ${chartData.width},${chartData.height} L 0,${chartData.height} Z`}
              fill="url(#cashflowGrad)"
            />
            <path
              d={chartData.path}
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Dip indicators */}
            {chartData.points.map((pt, i) => {
              if (pt.isRiskDip || pt.dayOffset === activeSummary.lowestPoint.dayOffset) {
                return (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={pt.dayOffset === activeSummary.lowestPoint.dayOffset ? "4.5" : "3"}
                    className={pt.isRiskDip ? "fill-warning stroke-surface" : "fill-brand stroke-surface"}
                    strokeWidth="2"
                  />
                );
              }
              return null;
            })}
          </svg>
        </div>

        <div className="flex justify-between items-center text-[10px] text-text-faint font-mono font-medium pt-1 border-t border-border/50">
          <span>Dziś ({formatDate(forecast.todayIso)})</span>
          <span>+15 dni</span>
          <span>+{horizon} dni ({formatDate(activeSummary.targetDate)})</span>
        </div>
      </div>

      {/* Discrete Cash Events Timeline */}
      <div className="space-y-3 pt-2">
        <span className="text-[11px] font-bold text-text-faint uppercase tracking-wider block">
          Zaplanowane zdarzenia finansowe w horyzoncie ({eventsInHorizon.length})
        </span>

        {eventsInHorizon.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-text-faint bg-bg-base/30">
            Brak zaplanowanych rachunków ani pensji cyklicznych w wybranym oknie {horizon} dni.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
            {eventsInHorizon.map((ev) => (
              <div
                key={ev.id}
                className="p-3 bg-surface-2 rounded-xl border border-border flex items-center justify-between shadow-xs hover:border-brand/30 transition-colors"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      ev.type === "income"
                        ? "bg-success-subtle text-success border border-success/20"
                        : "bg-danger-subtle text-danger border border-danger/20"
                    }`}
                  >
                    {ev.type === "income" ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-text-main truncate block" title={ev.name}>
                      {ev.name}
                    </span>
                    <span className="text-[10px] text-text-muted font-medium block">
                      {formatDate(ev.date)} {ev.category ? `• ${ev.category}` : ""}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-xs font-black tabular-nums shrink-0 ml-2 ${
                    ev.type === "income" ? "text-brand" : "text-danger"
                  }`}
                >
                  {ev.type === "income" ? "+" : "-"}
                  {formatMoney(ev.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
