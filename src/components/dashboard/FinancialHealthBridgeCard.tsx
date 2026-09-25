import React, { useMemo } from "react";
import { Profile, RecurringRule } from "../../types";
import { getFinancialHealthSummary } from "../../services/financialHealth";
import { Activity, AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, Info } from "lucide-react";

interface FinancialHealthBridgeCardProps {
  profile: Profile;
  recurringRules?: RecurringRule[];
  selectedDate?: Date;
  onChangeView: (view: string) => void;
}

function HealthProgressCircle({ score, grade }: { score: number | null; grade: string }) {
  const radius = 22;
  const strokeWidth = 3.5;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const numericScore = typeof score === "number" ? Math.min(Math.max(score, 0), 100) : 0;
  const strokeDashoffset = score === null ? circumference : circumference - (numericScore / 100) * circumference;

  const colorClass =
    score === null
      ? "text-border/60 stroke-current"
      : grade === "excellent"
      ? "text-brand stroke-current"
      : grade === "good"
      ? "text-emerald-500 stroke-current"
      : grade === "fair"
      ? "text-amber-500 stroke-current"
      : "text-rose-500 stroke-current";

  return (
    <div className="relative flex items-center justify-center shrink-0 w-12 h-12" aria-hidden="true">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          className="text-border/40"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          className={`${colorClass} transition-all duration-700 ease-out`}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xs font-bold text-text-main tabular-nums leading-none">
          {score !== null ? score : "—"}
        </span>
      </div>
    </div>
  );
}

/**
 * Skrót do "Kondycji finansowej" widoczny w Level 2 Dashboardu —
 * kompaktowy pierścień postępu, status wskaźników, szybki link do pełnej analizy.
 */
export function FinancialHealthBridgeCard({
  profile,
  recurringRules = [],
  selectedDate,
  onChangeView
}: FinancialHealthBridgeCardProps) {
  const health = useMemo(
    () => getFinancialHealthSummary(profile, recurringRules, { selectedDate }),
    [profile, recurringRules, selectedDate]
  );

  const gradeBadgeClass =
    health.status === "INSUFFICIENT_DATA" || health.score === null
      ? "bg-surface-2 text-text-muted border-border"
      : health.grade === "excellent"
      ? "bg-brand-subtle text-brand border-brand/30"
      : health.grade === "good"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40"
      : health.grade === "fair"
      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40"
      : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40";

  // Alerty są posortowane critical -> warning -> positive; pierwszy jest zawsze najważniejszy.
  const topAlert = health.alerts[0] ?? null;

  return (
    <div
      id="dashboard-health-bridge-card"
      className="bg-surface border border-border/70 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3.5 h-full transition-all hover:border-border"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <HealthProgressCircle score={health.score} grade={health.grade} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-text-main tracking-tight">Kondycja finansowa</h3>
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${gradeBadgeClass}`}>
                {health.gradeLabel}
              </span>
            </div>
            <span className="text-xs text-text-muted tabular-nums block mt-0.5" id="dashboard-health-score">
              Wynik:{" "}
              <strong className="font-semibold text-text-main">
                {health.score !== null ? `${health.score}/100` : "Brak danych"}
              </strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onChangeView("analysis")}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shrink-0"
          id="btn-dashboard-to-health"
          aria-label="Przejdź do pełnej analizy kondycji finansowej"
        >
          <span>Analiza</span>
          <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="pt-2 border-t border-border/50 text-xs">
        {health.status === "INSUFFICIENT_DATA" ? (
          <p className="text-text-muted flex items-center gap-1.5 truncate">
            <Info className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={1.75} />
            <span>Dodaj pierwsze transakcje, aby obliczyć kondycję finansową.</span>
          </p>
        ) : health.isLowData ? (
          <p className="text-text-muted flex items-center gap-1.5 truncate">
            <Info className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={1.75} />
            <span>Ocena wstępna — dodaj więcej transakcji dla pełnej analizy.</span>
          </p>
        ) : topAlert ? (
          <p
            className={`flex items-center gap-1.5 truncate ${
              topAlert.severity === "critical" ? "text-rose-600 dark:text-rose-400" : topAlert.severity === "warning" ? "text-amber-600 dark:text-amber-400" : "text-text-muted"
            }`}
            title={topAlert.description}
          >
            {topAlert.severity === "critical" ? (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            ) : topAlert.severity === "warning" ? (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
            )}
            <span className="truncate">{topAlert.title}</span>
            {health.alerts.length > 1 && (
              <span className="text-text-faint shrink-0 text-[11px]">+{health.alerts.length - 1}</span>
            )}
          </p>
        ) : (
          <p className="text-text-muted flex items-center gap-1.5 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
            <span>Brak krytycznych sygnałów w tym miesiącu.</span>
          </p>
        )}
      </div>
    </div>
  );
}
