import React, { memo, useState } from "react";
import { Payment } from "../../types";
import { CalendarClock, AlertCircle, Clock, CalendarDays, Calendar, List, PieChart, CheckCircle2 } from "lucide-react";
import { formatMoney } from "../../utils/format";

interface PaymentsTimelineWidgetProps {
  currency: string;
  unpaidPayments: Payment[];
  onTogglePaymentStatus: (id: string) => void;
  onChangeView: (view: string) => void;
}

export type TimelineFilter = "all" | "overdue" | "today" | "week" | "month";

export interface HorizonSummary {
  overdue: { count: number; total: number };
  today: { count: number; total: number };
  week: { count: number; total: number };
  month: { count: number; total: number };
}

export function getHorizonSummary(payments: Payment[]): HorizonSummary {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const summary: HorizonSummary = {
    overdue: { count: 0, total: 0 },
    today: { count: 0, total: 0 },
    week: { count: 0, total: 0 },
    month: { count: 0, total: 0 }
  };

  payments.forEach(p => {
    if (!p.dueDate || p.status === "Opłacono") return;
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    const diffTime = pDate.getTime() - todayDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      summary.overdue.count += 1;
      summary.overdue.total += p.amount;
    } else {
      if (diffDays === 0) {
        summary.today.count += 1;
        summary.today.total += p.amount;
      }
      if (diffDays <= 6) {
        summary.week.count += 1;
        summary.week.total += p.amount;
      }
      if (diffDays <= 29) {
        summary.month.count += 1;
        summary.month.total += p.amount;
      }
    }
  });

  return summary;
}

export function filterPaymentsByRange(payments: Payment[], range: TimelineFilter): Payment[] {
  if (range === "all") return payments;

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  return payments.filter(p => {
    if (!p.dueDate) return false;
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    const diffTime = pDate.getTime() - todayDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (range === "overdue") {
      return diffDays < 0;
    }
    if (range === "today") {
      return diffDays === 0;
    }

    if (diffDays < 0) return false;

    if (range === "week") {
      return diffDays <= 6;
    }
    if (range === "month") {
      return diffDays <= 29;
    }
    return true;
  });
}

export function getActiveSummary(filteredPayments: Payment[]) {
  return {
    count: filteredPayments.length,
    total: filteredPayments.reduce((acc, p) => acc + p.amount, 0)
  };
}

export interface ActiveDecisionSummary {
  count: number;
  total: number;
  nearestDueDate: string | null;
  overdueCount: number;
}

export function getActiveDecisionSummary(filteredPayments: Payment[]): ActiveDecisionSummary {
  const validPayments = filteredPayments
    .filter(p => !!p.dueDate && p.status !== "Opłacono")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const count = validPayments.length;
  const total = validPayments.reduce((acc, p) => acc + p.amount, 0);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const todayTime = todayDate.getTime();

  let overdueCount = 0;
  let nearestDueDate: string | null = null;

  for (const p of validPayments) {
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    if (pDate.getTime() < todayTime) {
      overdueCount++;
    } else if (!nearestDueDate) {
      nearestDueDate = p.dueDate;
    }
  }

  if (!nearestDueDate && validPayments.length > 0) {
    nearestDueDate = validPayments[0].dueDate;
  }

  return { count, total, nearestDueDate, overdueCount };
}

export function getDueThisWeekTotal(payments: Payment[]): number {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  return payments.reduce((acc, p) => {
    if (!p.dueDate || p.status === "Opłacono") return acc;
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    const diffTime = pDate.getTime() - todayDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 6) {
      return acc + p.amount;
    }
    return acc;
  }, 0);
}

export function getTimelineTexts(range: TimelineFilter) {
  if (range === "overdue") {
    return {
      label: "Zaległe",
      emptySummary: "Brak zaległych płatności",
      emptyTitle: "Brak zaległości",
      emptyDesc: "Wszystko opłacone na czas.",
      overviewTitle: "Podsumowanie zaległości"
    };
  }
  if (range === "today") {
    return {
      label: "Na dzisiaj",
      emptySummary: "Brak płatności na dzisiaj",
      emptyTitle: "Czysty dzień",
      emptyDesc: "Brak zobowiązań do zapłaty na dzisiaj.",
      overviewTitle: "Płatności na dzisiaj"
    };
  }
  if (range === "week") {
    return {
      label: "W tym tygodniu (7 dni)",
      emptySummary: "Brak płatności w tym tygodniu",
      emptyTitle: "Brak zobowiązań",
      emptyDesc: "W tym tygodniu masz spokój.",
      overviewTitle: "Podsumowanie tygodnia"
    };
  }
  if (range === "month") {
    return {
      label: "Najbliższe 30 dni",
      emptySummary: "Brak płatności na najbliższe 30 dni",
      emptyTitle: "Brak zobowiązań",
      emptyDesc: "Przez najbliższe 30 dni masz spokój.",
      overviewTitle: "Najbliższe 30 dni"
    };
  }
  return {
    label: "Wszystkie pozycje",
    emptySummary: "Brak zaplanowanych płatności",
    emptyTitle: "Brak zobowiązań",
    emptyDesc: "Twój harmonogram jest czysty.",
    overviewTitle: "Zestawienie ogólne"
  };
}

export function getNearestHighlightedPaymentIds(today: Payment[], next7Days: Payment[]): Set<string> {
  const highlighted = new Set<string>();
  if (today.length > 0) {
    today.forEach(p => highlighted.add(p.id));
  } else if (next7Days.length > 0) {
    highlighted.add(next7Days[0].id);
  }
  return highlighted;
}

export function getGlobalOverdueCount(payments: Payment[]): number {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const todayTime = todayDate.getTime();

  return payments.reduce((acc, p) => {
    if (!p.dueDate || p.status === "Opłacono") return acc;
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    return pDate.getTime() < todayTime ? acc + 1 : acc;
  }, 0);
}

export function groupPaymentsByTimeline(payments: Payment[]) {
  const overdue: Payment[] = [];
  const today: Payment[] = [];
  const next7Days: Payment[] = [];
  const next30Days: Payment[] = [];
  const later: Payment[] = [];

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  payments.forEach(p => {
    if (!p.dueDate || p.status === "Opłacono") return;
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    const diffTime = pDate.getTime() - todayDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      overdue.push(p);
    } else if (diffDays === 0) {
      today.push(p);
    } else if (diffDays <= 6) {
      next7Days.push(p);
    } else if (diffDays <= 29) {
      next30Days.push(p);
    } else {
      later.push(p);
    }
  });

  const sortByDate = (a: Payment, b: Payment) => a.dueDate.localeCompare(b.dueDate);
  
  overdue.sort(sortByDate);
  today.sort(sortByDate);
  next7Days.sort(sortByDate);
  next30Days.sort(sortByDate);
  later.sort(sortByDate);

  return { overdue, today, next7Days, next30Days, later };
}

export function getMonthlyOverviewMetrics(grouped: ReturnType<typeof groupPaymentsByTimeline>) {
  const upcoming = [...grouped.today, ...grouped.next7Days, ...grouped.next30Days].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate)
  );
  const sum = upcoming.reduce((acc, p) => acc + p.amount, 0);
  const count = upcoming.length;
  const nearest = upcoming.length > 0 ? upcoming[0].dueDate : "-";
  const overdueSum = grouped.overdue.reduce((acc, p) => acc + p.amount, 0);
  const overdueCount = grouped.overdue.length;

  return { upcoming, sum, count, nearest, overdueSum, overdueCount };
}

export const PaymentsTimelineWidget = memo(function PaymentsTimelineWidget({
  currency,
  unpaidPayments,
  onTogglePaymentStatus,
  onChangeView,
}: PaymentsTimelineWidgetProps) {
  const [viewMode, setViewMode] = useState<"compact" | "monthly">("compact");
  const [range, setRange] = useState<TimelineFilter>("all");
  
  const filteredPayments = filterPaymentsByRange(unpaidPayments, range);
  const horizonSummary = getHorizonSummary(unpaidPayments);
  
  // Full grouped dataset for analytics / monthly overview calculations
  const fullGrouped = groupPaymentsByTimeline(filteredPayments);

  // Limit to max 7 items to prevent endless vertical growth on dashboard compact list
  const MAX_ITEMS = 7;
  const sortedFiltered = [...filteredPayments].sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
  const limitedPayments = sortedFiltered.slice(0, MAX_ITEMS);
  const remainingCount = sortedFiltered.length - MAX_ITEMS;
  
  // Limited grouped dataset for compact list rendering only
  const { overdue, today, next7Days, next30Days, later } = groupPaymentsByTimeline(limitedPayments);
  const activeSummary = getActiveSummary(filteredPayments);
  const decisionSummary = getActiveDecisionSummary(filteredPayments);
  const totalOverdueCountInView = getGlobalOverdueCount(filteredPayments);
  const texts = getTimelineTexts(range);
  const highlightedIds = getNearestHighlightedPaymentIds(today, next7Days);
  const globalOverdueCount = getGlobalOverdueCount(unpaidPayments);

  const renderSection = (title: string, items: Payment[], icon: React.ReactNode, colorClass: string, bgClass: string) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4 relative">
        <div className="flex items-center gap-2 mb-2 min-w-0">
          <div className={`p-1.5 rounded-lg ${bgClass} ${colorClass} border border-white/5 shadow-inner shrink-0`}>
            {icon}
          </div>
          <h4 className={`text-xs font-bold uppercase tracking-wider ${colorClass} truncate`} title={title}>{title}</h4>
        </div>
        <div className="space-y-2 border-l-2 border-border ml-3.5 pl-4 relative">
          {items.map(p => {
            const isHighlighted = highlightedIds.has(p.id);
            return (
              <div key={p.id} className={`bg-surface border ${isHighlighted ? "border-brand/30" : "border-border shadow-sm"} rounded-xl p-3 hover:border-brand/30 hover:bg-surface-offset transition-colors group flex items-center justify-between gap-3`}>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-bold text-text-main group-hover:text-brand transition-colors truncate" title={p.name}>{p.name}</span>
                    {isHighlighted && (
                      <span className="text-xs font-bold uppercase tracking-wider bg-brand-subtle text-brand px-1.5 py-0.5 rounded border border-brand/30 shrink-0">Najbliższe</span>
                    )}
                  </div>
                  <span className="text-xs text-text-faint font-medium truncate" title={p.dueDate}>{p.dueDate}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2 max-w-[40%]">
                  <span className={`text-sm font-black truncate ${isHighlighted ? "text-brand" : "text-text-muted"}`} title={formatMoney(p.amount, currency)}>{formatMoney(p.amount, currency)}</span>
                  <button
                    onClick={() => onTogglePaymentStatus(p.id)}
                    className="w-6 h-6 shrink-0 rounded-full border border-border flex items-center justify-center text-transparent hover:border-brand/50 hover:bg-brand-subtle hover:text-brand active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                    title="Oznacz jako opłacone"
                    aria-label="Oznacz jako opłacone"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthlyOverview = () => {
    const { upcoming, sum, count, nearest, overdueSum, overdueCount } = getMonthlyOverviewMetrics(fullGrouped);
    
    if (upcoming.length === 0 && overdueCount === 0) {
      return (
        <div className="text-center py-6 bg-bg-base/30 rounded-xl border border-dashed border-border/70 h-full flex flex-col items-center justify-center min-w-0">
          <CheckCircle2 className="w-7 h-7 text-brand/80 mb-1.5" strokeWidth={1.75} />
          <span className="sr-only">🏖️</span>
          <p className="text-xs text-text-muted font-medium truncate" title="Brak zobowiązań na najbliższe 30 dni.">Brak zobowiązań na najbliższe 30 dni.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 pt-2">
        {overdueCount > 0 && (
          <div className="bg-danger-subtle border border-danger/30 rounded-xl p-4 flex flex-col gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-danger shrink-0" />
              <h4 className="text-sm font-bold text-danger truncate" title={`Zaległe płatności (${overdueCount})`}>Zaległe płatności ({overdueCount})</h4>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs text-danger/80 truncate" title="Łączna kwota zaległości:">Łączna kwota zaległości:</span>
              <span className="text-sm font-bold text-danger shrink-0 truncate" title={formatMoney(overdueSum, currency)}>{formatMoney(overdueSum, currency)}</span>
            </div>
          </div>
        )}

        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3 shadow-inner min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <PieChart className="w-4 h-4 text-brand shrink-0" />
            <h4 className="text-sm font-bold text-text-main truncate" title={texts.overviewTitle}>{texts.overviewTitle}</h4>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs text-text-muted truncate" title="Liczba pozycji:">Liczba pozycji:</span>
            <span className="text-sm font-bold text-text-main shrink-0 truncate" title={count.toString()}>{count}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs text-text-muted truncate" title="Suma kwot:">Suma kwot:</span>
            <span className="text-sm font-bold text-brand shrink-0 truncate" title={formatMoney(sum, currency)}>{formatMoney(sum, currency)}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs text-text-muted truncate" title="Najbliższy termin:">Najbliższy termin:</span>
            <span className="text-sm font-bold text-text-main shrink-0 truncate" title={nearest}>{nearest}</span>
          </div>
        </div>

        {/* Cumulative Cashflow Commitment Breakdown */}
        {upcoming.length > 0 && (
          <div className="bg-surface-2 border border-border rounded-xl p-3 space-y-2">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Harmonogram kumulatywny</span>
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {(() => {
                let cumulative = 0;
                return upcoming.map(p => {
                  cumulative += p.amount;
                  return (
                    <div key={p.id} className="flex justify-between items-center text-xs p-1.5 rounded-lg bg-surface border border-border/50">
                      <div className="min-w-0 flex-1 truncate">
                        <span className="font-bold text-text-main mr-2">{p.dueDate}</span>
                        <span className="text-text-muted">{p.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-danger block">{formatMoney(p.amount, currency)}</span>
                        <span className="text-[10px] text-text-faint block">suma: {formatMoney(cumulative, currency)}</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-surface p-4 sm:p-5 rounded-xl border border-border/70 shadow-xs flex flex-col justify-between h-full max-h-[480px] relative overflow-hidden group/timeline">
      <div className="flex items-center justify-between mb-3.5 relative z-10 gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-text-faint uppercase tracking-wider mb-0.5 truncate" title="Oś Czasu">Oś Czasu</p>
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-base font-bold text-text-main truncate" title="Timeline Płatności">Timeline Płatności</h3>
            {globalOverdueCount > 0 && (
              <span className="text-xs text-danger font-semibold flex items-center gap-1 bg-danger-subtle px-2 py-0.5 rounded-md border border-danger/20 shrink-0">
                <AlertCircle className="w-3 h-3 text-danger shrink-0" strokeWidth={1.75} />
                Zaległe: {globalOverdueCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setViewMode(viewMode === "compact" ? "monthly" : "compact")}
            className="text-xs font-semibold text-text-muted hover:text-text-main bg-surface-2/60 hover:bg-surface-2 border border-border/70 px-2.5 py-1.5 rounded-lg active:scale-[0.98] transition-all flex items-center gap-1.5 shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
          >
            {viewMode === "compact" ? <PieChart className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} /> : <List className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />}
            {viewMode === "compact" ? "Cashflow" : "Lista"}
          </button>
          <button
            onClick={() => onChangeView("payments")}
            className="text-xs font-semibold text-brand hover:text-brand bg-brand-subtle hover:bg-brand-subtle/80 border border-brand/20 px-2.5 py-1.5 rounded-lg active:scale-[0.98] transition-all flex items-center gap-1.5 shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
          >
            <CalendarClock className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={1.75} />
            Zarządzaj
          </button>
        </div>
      </div>

      {/* 4-Pillar Horizon Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mb-3 sm:mb-4 relative z-10 min-w-0">
        {/* Overdue */}
        <button
          onClick={() => setRange(range === "overdue" ? "all" : "overdue")}
          className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            range === "overdue"
              ? "bg-danger-subtle border-danger/40 ring-1 ring-danger/30"
              : "bg-surface-2/60 border-border/70 hover:border-danger/30"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-danger mb-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block shrink-0" />
              Zaległe
            </span>
            <span className="bg-danger/10 px-1.5 py-0.2 rounded font-bold">{horizonSummary.overdue.count}</span>
          </div>
          <div className="text-xs font-bold text-danger truncate" title={formatMoney(horizonSummary.overdue.total, currency)}>
            {formatMoney(horizonSummary.overdue.total, currency)}
          </div>
        </button>

        {/* Today */}
        <button
          onClick={() => setRange(range === "today" ? "all" : "today")}
          className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            range === "today"
              ? "bg-warning-subtle border-warning/40 ring-1 ring-warning/30"
              : "bg-surface-2/60 border-border/70 hover:border-warning/30"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-warning mb-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block shrink-0" />
              Dzisiaj
            </span>
            <span className="bg-warning/10 px-1.5 py-0.2 rounded font-bold">{horizonSummary.today.count}</span>
          </div>
          <div className="text-xs font-bold text-warning truncate" title={formatMoney(horizonSummary.today.total, currency)}>
            {formatMoney(horizonSummary.today.total, currency)}
          </div>
        </button>

        {/* Next 7 Days */}
        <button
          onClick={() => setRange(range === "week" ? "all" : "week")}
          className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            range === "week"
              ? "bg-brand-subtle border-brand/40 ring-1 ring-brand/30"
              : "bg-surface-2/60 border-border/70 hover:border-brand/30"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-brand mb-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand inline-block shrink-0" />
              7 dni
            </span>
            <span className="bg-brand/10 px-1.5 py-0.2 rounded font-bold">{horizonSummary.week.count}</span>
          </div>
          <div className="text-xs font-bold text-brand truncate" title={formatMoney(horizonSummary.week.total, currency)}>
            {formatMoney(horizonSummary.week.total, currency)}
          </div>
        </button>

        {/* Next 30 Days */}
        <button
          onClick={() => setRange(range === "month" ? "all" : "month")}
          className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
            range === "month"
              ? "bg-surface border-border ring-1 ring-border"
              : "bg-surface-2/60 border-border/70 hover:border-text-muted"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted mb-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block shrink-0" />
              30 dni
            </span>
            <span className="bg-surface-2 px-1.5 py-0.2 rounded font-bold">{horizonSummary.month.count}</span>
          </div>
          <div className="text-xs font-bold text-text-main truncate" title={formatMoney(horizonSummary.month.total, currency)}>
            {formatMoney(horizonSummary.month.total, currency)}
          </div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0 relative z-10">
        <div className="flex items-center justify-between gap-2 mb-2 bg-surface p-1 rounded-xl border border-border shadow-inner min-w-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 min-w-0">
            <button onClick={() => setRange("all")} className={`text-xs font-bold px-2.5 py-1 rounded-lg active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shrink-0 ${range === "all" ? "bg-surface-2 text-text-main shadow-sm border border-border" : "text-text-muted hover:text-text-muted hover:bg-surface-offset"}`}>Wszystkie</button>
            <button onClick={() => setRange("overdue")} className={`text-xs font-bold px-2.5 py-1 rounded-lg active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shrink-0 ${range === "overdue" ? "bg-danger-subtle text-danger shadow-sm border border-danger/30" : "text-text-muted hover:text-danger hover:bg-danger-subtle"}`}>Zaległe</button>
            <button onClick={() => setRange("today")} className={`text-xs font-bold px-2.5 py-1 rounded-lg active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shrink-0 ${range === "today" ? "bg-warning-subtle text-warning shadow-sm border border-warning/30" : "text-text-muted hover:text-warning hover:bg-warning-subtle"}`}>Dzisiaj</button>
            <button onClick={() => setRange("week")} className={`text-xs font-bold px-2.5 py-1 rounded-lg active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shrink-0 ${range === "week" ? "bg-brand-subtle text-brand shadow-sm border border-brand/30" : "text-text-muted hover:text-brand hover:bg-brand-subtle"}`}>7 dni</button>
            <button onClick={() => setRange("month")} className={`text-xs font-bold px-2.5 py-1 rounded-lg active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shrink-0 ${range === "month" ? "bg-surface-2 text-text-main shadow-sm border border-border" : "text-text-muted hover:text-text-muted hover:bg-surface-offset"}`}>30 dni</button>
          </div>
          <span className="text-xs font-mono font-bold text-text-muted pr-1 shrink-0 whitespace-nowrap">
            {decisionSummary.count} poz.
          </span>
        </div>

        {/* Compact Decision Summary Strip */}
        {decisionSummary.count > 0 && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 mb-2.5 bg-surface-2/60 border border-border/70 rounded-xl text-xs min-w-0" id="timeline-decision-summary">
            <div className="flex items-center gap-1.5 min-w-0 truncate text-text-muted">
              <span className="font-semibold text-text-main shrink-0 truncate max-w-[120px]" title={texts.label}>
                {texts.label}:
              </span>
              <span className="shrink-0 font-medium">
                {decisionSummary.count} {decisionSummary.count === 1 ? "poz." : "poz."}
              </span>
              {decisionSummary.nearestDueDate && (
                <>
                  <span className="text-text-faint hidden xs:inline">•</span>
                  <span className="text-text-faint hidden xs:inline truncate" title={`Termin: ${decisionSummary.nearestDueDate}`}>
                    Termin: <strong className="text-text-muted font-medium">{decisionSummary.nearestDueDate}</strong>
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-black text-brand whitespace-nowrap" title={formatMoney(decisionSummary.total, currency)}>
                {formatMoney(decisionSummary.total, currency)}
              </span>
              {decisionSummary.overdueCount > 0 && range !== "overdue" && (
                <span className="bg-danger-subtle text-danger font-semibold text-[10px] px-1.5 py-0.5 rounded border border-danger/20 shrink-0 flex items-center gap-1" title={`W tym zaległe: ${decisionSummary.overdueCount}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
                  <span>{decisionSummary.overdueCount}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {activeSummary.count === 0 ? (
          <div className="text-center py-6 bg-bg-base/30 rounded-xl border border-dashed border-border/70 h-full flex flex-col items-center justify-center min-w-0">
            <CheckCircle2 className="w-7 h-7 text-brand/80 mb-1.5" strokeWidth={1.75} />
            <span className="sr-only">🏖️</span>
            <p className="text-xs text-text-muted font-medium truncate" title={texts.emptyTitle}>{texts.emptyTitle}</p>
            <p className="text-xs text-text-faint truncate" title={texts.emptyDesc}>{texts.emptyDesc}</p>
          </div>
        ) : (
          viewMode === "compact" ? (
            <div className="pt-1 pb-2">
              {renderSection("Zaległe", overdue, <AlertCircle className="w-4 h-4" />, "text-danger", "bg-danger-subtle")}
              {renderSection("Dzisiaj", today, <Clock className="w-4 h-4" />, "text-warning", "bg-warning-subtle")}
              {renderSection("Najbliższe 7 dni", next7Days, <CalendarDays className="w-4 h-4" />, "text-brand", "bg-brand-subtle")}
              {renderSection("Następne 30 dni", next30Days, <Calendar className="w-4 h-4" />, "text-text-muted", "bg-surface-2")}
              {renderSection("Później", later, <Calendar className="w-4 h-4" />, "text-text-faint", "bg-surface/50")}
              
              {remainingCount > 0 && (
                <p className="text-center text-xs text-text-faint font-semibold pt-2 pb-1">
                  + {remainingCount} innych wpisów (zobacz w zakładce Zarządzaj)
                </p>
              )}
            </div>
          ) : (
            renderMonthlyOverview()
          )
        )}
      </div>
    </div>
  );
});
