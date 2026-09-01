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

/**
 * Skrót do pełnej "Kondycji finansowej" (AnalysisView) widoczny od razu na pulpicie —
 * ten sam wzorzec co karta portfela kredytów: jedna liczba, jeden sygnał, link do szczegółów.
 * Nie duplikuje pełnego panelu (filary, wszystkie alerty, drivers) — to żyje w Analizie.
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
    health.grade === "excellent"
      ? "bg-brand-subtle text-brand border-brand/30"
      : health.grade === "good"
      ? "bg-success-subtle text-success border-success/30"
      : health.grade === "fair"
      ? "bg-warning-subtle text-warning border-warning/30"
      : "bg-danger-subtle text-danger border-danger/30";

  // Alerty są posortowane critical -> warning -> positive; pierwszy jest zawsze najważniejszy.
  const topAlert = health.alerts[0] ?? null;

  return (
    <div
      id="dashboard-health-bridge-card"
      className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in mb-6"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand flex items-center justify-center shrink-0 border border-brand/20 shadow-2xs">
          <Activity className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-text-main">Kondycja finansowa</h3>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${gradeBadgeClass}`}>
              {health.gradeLabel}
            </span>
            <span className="text-xs font-black text-text-main tabular-nums" id="dashboard-health-score">
              {health.score}/100
            </span>
          </div>

          {health.isLowData ? (
            <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5 truncate">
              <Info className="w-3.5 h-3.5 text-brand shrink-0" />
              Ocena wstępna — dodaj więcej transakcji dla pełnej analizy.
            </p>
          ) : topAlert ? (
            <p
              className={`text-xs mt-0.5 flex items-center gap-1.5 truncate ${
                topAlert.severity === "critical" ? "text-danger" : topAlert.severity === "warning" ? "text-warning" : "text-text-muted"
              }`}
              title={topAlert.description}
            >
              {topAlert.severity === "critical" ? (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              ) : topAlert.severity === "warning" ? (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-success" />
              )}
              <span className="truncate">{topAlert.title}</span>
              {health.alerts.length > 1 && (
                <span className="text-text-faint shrink-0">+{health.alerts.length - 1}</span>
              )}
            </p>
          ) : (
            <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              Brak krytycznych sygnałów w tym miesiącu.
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChangeView("analysis")}
        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-hover border border-border text-xs font-bold text-text-main hover:text-brand transition cursor-pointer shadow-2xs shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring w-full sm:w-auto"
        id="btn-dashboard-to-health"
        aria-label="Przejdź do pełnej analizy kondycji finansowej"
      >
        <span>Szczegółowa analiza</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
