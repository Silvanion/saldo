import React, { useMemo } from "react";
import { Profile, RecurringRule } from "../../types";
import { getFinancialHealthSummary, HealthPillar } from "../../services/financialHealth";
import {
  Activity,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Scale,
  Sparkles,
  Info
} from "lucide-react";

interface FinancialHealthSectionProps {
  profile: Profile;
  recurringRules?: RecurringRule[];
  selectedDate?: Date;
}

export function FinancialHealthSection({
  profile,
  recurringRules = [],
  selectedDate
}: FinancialHealthSectionProps) {
  const health = useMemo(() => {
    return getFinancialHealthSummary(profile, recurringRules, { selectedDate });
  }, [profile, recurringRules, selectedDate]);

  const gradeBadgeClass =
    health.grade === "excellent"
      ? "bg-brand-subtle text-brand border-brand/30"
      : health.grade === "good"
      ? "bg-success-subtle text-success border-success/30"
      : health.grade === "fair"
      ? "bg-warning-subtle text-warning border-warning/30"
      : "bg-danger-subtle text-danger border-danger/30";

  const getPillarIcon = (key: HealthPillar["key"]) => {
    switch (key) {
      case "budget":
        return <Scale className="w-4 h-4" />;
      case "payments":
        return <CreditCard className="w-4 h-4" />;
      case "liquidity":
        return <Activity className="w-4 h-4" />;
      case "fixed_costs":
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const getPillarPill = (status: HealthPillar["status"]) => {
    if (status === "good") {
      return "bg-success-subtle text-success border-success/20";
    }
    if (status === "fair") {
      return "bg-warning-subtle text-warning border-warning/20";
    }
    return "bg-danger-subtle text-danger border-danger/20";
  };

  const pillarsList: HealthPillar[] = [
    health.pillars.budget,
    health.pillars.payments,
    health.pillars.liquidity,
    health.pillars.fixedCosts
  ];

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5" id="financial-health-card">
      {/* Header with Score KPI */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 border-b border-border pb-4 sm:pb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-text-main">
                Kondycja finansowa
              </h3>
              <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full border shrink-0 ${gradeBadgeClass}`}>
                {health.gradeLabel}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5 leading-snug">
              Deterministyczna ocena płynności, terminowości, budżetu i kosztów stałych (0–100 pkt)
            </p>
          </div>
        </div>

        {/* Score Value Display */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 bg-surface-2 p-2.5 px-4 rounded-xl sm:rounded-2xl border border-border shadow-xs">
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-faint block">Wynik</span>
            <span className="text-xs font-bold text-text-muted">na 100 pkt</span>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-text-main tabular-nums tracking-tight" id="financial-health-score">
            {health.score}
          </span>
        </div>
      </div>

      {/* 4 Pillars Chips / Mini-Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {pillarsList.map((pillar) => (
          <div
            key={pillar.key}
            className="p-3 sm:p-3.5 bg-surface-2 rounded-xl border border-border flex flex-col justify-between space-y-1.5 sm:space-y-2 shadow-xs"
          >
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0 text-text-muted">
                {getPillarIcon(pillar.key)}
                <span className="text-xs font-bold text-text-main truncate">{pillar.name}</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${getPillarPill(pillar.status)}`}>
                {pillar.score}/{pillar.maxScore}
              </span>
            </div>
            <p className="text-[11px] text-text-muted leading-tight line-clamp-2" title={pillar.summary}>
              {pillar.summary}
            </p>
          </div>
        ))}
      </div>

      {/* Low-data advisory */}
      {health.isLowData && (
        <div className="flex items-start gap-2.5 p-3 sm:p-3.5 bg-brand-subtle/50 rounded-xl border border-brand/20 text-xs text-text-main">
          <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Ocena wstępna. <strong>Dodaj płatności, budżety lub historię wydatków</strong>, aby uzyskać pełniejszą analizę kondycji.
          </p>
        </div>
      )}

      {/* Prioritized Alerts List */}
      {health.alerts.length > 0 && (
        <div className="space-y-2 pt-1">
          <h4 className="text-xs font-bold text-text-faint uppercase tracking-wider">
            Alerty i sygnały decyzyjne ({health.alerts.slice(0, 4).length})
          </h4>
          <div className="space-y-2">
            {health.alerts.slice(0, 4).map((alert) => {
              const isCritical = alert.severity === "critical";
              const isWarning = alert.severity === "warning";

              const alertStyle = isCritical
                ? "bg-danger-subtle/70 border-danger/30 text-danger"
                : isWarning
                ? "bg-warning-subtle/70 border-warning/30 text-warning"
                : "bg-surface-2 border-border text-brand";

              const badgeStyle = isCritical
                ? "bg-danger-subtle text-danger border-danger/30"
                : isWarning
                ? "bg-warning-subtle text-warning border-warning/30"
                : "bg-success-subtle text-success border-success/30";

              const badgeText = isCritical ? "Krytyczne" : isWarning ? "Uwaga" : "Pozytywne";

              return (
                <div
                  key={alert.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border gap-2 transition-all shadow-xs ${alertStyle}`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {isCritical ? (
                        <AlertCircle className="w-4 h-4 text-danger" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-4 h-4 text-warning" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-main leading-snug">{alert.title}</p>
                      <p className="text-[11px] text-text-muted mt-0.5 leading-snug">{alert.description}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 self-start sm:self-auto ${badgeStyle}`}>
                    {badgeText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Drivers Breakdown ("Co wspiera wynik" / "Co obniża wynik") */}
      {(health.positiveDrivers.length > 0 || health.negativeDrivers.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-2 border-t border-border/60">
          {/* Positive Drivers */}
          {health.positiveDrivers.length > 0 && (
            <div className="p-3 bg-surface-2 rounded-xl border border-border/60 space-y-1.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Co wspiera wynik
              </span>
              <ul className="text-xs text-text-muted space-y-1">
                {health.positiveDrivers.slice(0, 3).map((d, i) => (
                  <li key={i} className="flex items-start gap-1.5 leading-tight">
                    <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0 mt-1" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Negative Drivers */}
          {health.negativeDrivers.length > 0 && (
            <div className="p-3 bg-surface-2 rounded-xl border border-border/60 space-y-1.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-danger flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Co obniża wynik
              </span>
              <ul className="text-xs text-text-muted space-y-1">
                {health.negativeDrivers.slice(0, 3).map((d, i) => (
                  <li key={i} className="flex items-start gap-1.5 leading-tight">
                    <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0 mt-1" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
