import React, { memo, useState } from "react";
import {} from "../../utils";
import { Payment } from "../../types";
import { CalendarClock, AlertCircle, Clock, CalendarDays, Calendar, List, PieChart } from "lucide-react";
import { formatMoney } from "../../utils/format";

interface PaymentsTimelineWidgetProps {
  currency: string;
  unpaidPayments: Payment[];
  onTogglePaymentStatus: (id: string) => void;
  onChangeView: (view: string) => void;
}

export type TimelineFilter = "all" | "overdue" | "week" | "month";

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

export function getDueThisWeekTotal(payments: Payment[]): number {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  return payments.reduce((acc, p) => {
    if (!p.dueDate) return acc;
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
  if (range === "week") {
    return {
      label: "W tym tygodniu",
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
    if (!p.dueDate) return acc;
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
    if (!p.dueDate) return;
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    const diffTime = pDate.getTime() - todayDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      overdue.push(p);
    } else if (diffDays === 0) {
      today.push(p);
    } else if (diffDays <= 7) {
      next7Days.push(p);
    } else if (diffDays <= 30) {
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

export const PaymentsTimelineWidget = memo(function PaymentsTimelineWidget({
  currency,
  unpaidPayments,
  onTogglePaymentStatus,
  onChangeView,
}: PaymentsTimelineWidgetProps) {
  const [viewMode, setViewMode] = useState<"compact" | "monthly">("compact");
  const [range, setRange] = useState<TimelineFilter>("all");
  
  const filteredPayments = filterPaymentsByRange(unpaidPayments, range);
  
  // Limit to max 7 items to prevent endless vertical growth on dashboard
  const MAX_ITEMS = 7;
  // Sort by date before slicing to ensure we show the most pressing ones
  const sortedFiltered = [...filteredPayments].sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
  const limitedPayments = sortedFiltered.slice(0, MAX_ITEMS);
  const remainingCount = sortedFiltered.length - MAX_ITEMS;
  
  const { overdue, today, next7Days, next30Days, later } = groupPaymentsByTimeline(limitedPayments);
  const activeSummary = getActiveSummary(filteredPayments); // keep summary for all filtered
  const overdueCount = getGlobalOverdueCount(limitedPayments); // wait, summary overdue uses limited?
  // Let's use filteredPayments for overdueCount to keep summary accurate
  const totalOverdueCountInView = getGlobalOverdueCount(filteredPayments);
  const texts = getTimelineTexts(range);
  const highlightedIds = getNearestHighlightedPaymentIds(today, next7Days);
  const globalOverdueCount = getGlobalOverdueCount(unpaidPayments);
  const dueThisWeekTotal = getDueThisWeekTotal(unpaidPayments);

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
              <div key={p.id} className={`bg-surface border ${isHighlighted ? "border-brand/30  " : "border-border shadow-sm"} rounded-xl p-3 hover:border-brand/30 hover:bg-surface-offset transition-colors group flex items-center justify-between gap-3`}>
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
    const upcoming = [...today, ...next7Days, ...next30Days].sort((a,b) => a.dueDate.localeCompare(b.dueDate));
    
    if (upcoming.length === 0 && overdue.length === 0) {
      return (
        <div className="text-center py-6 bg-bg-base/30 rounded-xl border border-dashed border-border h-full flex flex-col justify-center min-w-0">
          <div className="text-2xl mb-1 opacity-50 shrink-0">🏖️</div>
          <p className="text-xs text-text-muted font-medium truncate" title="Brak zobowiązań na najbliższe 30 dni.">Brak zobowiązań na najbliższe 30 dni.</p>
        </div>
      );
    }

    const sum = upcoming.reduce((acc, p) => acc + p.amount, 0);
    const count = upcoming.length;
    const nearest = upcoming.length > 0 ? upcoming[0].dueDate : "-";
    const overdueSum = overdue.reduce((acc, p) => acc + p.amount, 0);

    return (
      <div className="flex flex-col gap-4 pt-2">
        {overdue.length > 0 && (
          <div className="bg-danger-subtle border border-danger/30 rounded-xl p-4 flex flex-col gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-danger drop- shrink-0" />
              <h4 className="text-sm font-bold text-danger truncate" title={`Zaległe płatności (${overdue.length})`}>Zaległe płatności ({overdue.length})</h4>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs text-danger/80 truncate" title="Łączna kwota zaległości:">Łączna kwota zaległości:</span>
              <span className="text-sm font-bold text-danger drop- shrink-0 truncate" title={formatMoney(overdueSum, currency)}>{formatMoney(overdueSum, currency)}</span>
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
            <span className="text-sm font-bold text-brand drop- shrink-0 truncate" title={formatMoney(sum, currency)}>{formatMoney(sum, currency)}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-xs text-text-muted truncate" title="Najbliższy termin:">Najbliższy termin:</span>
            <span className="text-sm font-bold text-text-main shrink-0 truncate" title={nearest}>{nearest}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between h-full max-h-[420px] relative overflow-hidden group/timeline">
      <div className="absolute inset-0  pointer-events-none opacity-50 group-hover/timeline:opacity-100 transition-opacity duration-500" />
      <div className="flex items-center justify-between mb-5 relative z-10 gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-text-faint uppercase tracking-wider mb-0.5 truncate" title="Oś Czasu">Oś Czasu</p>
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-base font-bold text-text-main truncate" title="Timeline Płatności">Timeline Płatności</h3>
            {globalOverdueCount > 0 && (
              <span className="text-xs text-danger font-medium flex items-center gap-1 bg-danger-subtle px-1.5 py-0.5 rounded border border-danger/30 shrink-0">
                <AlertCircle className="w-3 h-3 text-danger shrink-0" />
                Zaległe: {globalOverdueCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setViewMode(viewMode === "compact" ? "monthly" : "compact")}
            className="text-xs font-bold text-text-muted bg-surface border border-border px-2.5 py-1.5 rounded-lg hover:bg-surface-offset hover:text-text-main active:scale-[0.98] transition-all flex items-center gap-1 shadow-inner shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
          >
            {viewMode === "compact" ? <PieChart className="w-3.5 h-3.5 shrink-0" /> : <List className="w-3.5 h-3.5 shrink-0" />}
            {viewMode === "compact" ? "Monthly" : "Compact"}
          </button>
          <button
            onClick={() => onChangeView("payments")}
            className="text-xs font-bold text-text-muted bg-surface border border-border px-2.5 py-1.5 rounded-lg hover:bg-surface-offset hover:text-text-main active:scale-[0.98] transition-all flex items-center gap-1 shadow-inner shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
          >
            <CalendarClock className="w-3.5 h-3.5 text-brand shrink-0" />
            Zarządzaj
          </button>
        </div>
      </div>

      <div className="mb-4 bg-brand-subtle border border-brand/30 rounded-xl p-3 flex justify-between items-center gap-2 relative z-10 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
           <CalendarClock className="w-4 h-4 text-brand drop- shrink-0" />
           <span className="text-sm font-semibold text-brand truncate" title="Do zapłaty w tym tygodniu">Do zapłaty w tym tygodniu</span>
        </div>
        <span className="text-sm font-bold text-brand drop- shrink-0 truncate" title={formatMoney(dueThisWeekTotal, currency)}>{formatMoney(dueThisWeekTotal, currency)}</span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0 relative z-10">
        <div className="flex flex-wrap gap-1 mb-4 bg-surface p-1 rounded-xl w-fit max-w-full border border-border shadow-inner min-w-0">
          <button onClick={() => setRange("all")} className={`text-xs font-bold px-3 py-1.5 rounded-lg active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${range === "all" ? "bg-surface-2 text-text-main shadow-sm border border-border" : "text-text-muted hover:text-text-muted hover:bg-surface-offset"}`}>Wszystkie</button>
          <button onClick={() => setRange("overdue")} className={`text-xs font-bold px-3 py-1.5 rounded-lg active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${range === "overdue" ? "bg-danger-subtle text-danger shadow-sm border border-danger/30" : "text-text-muted hover:text-danger hover:bg-danger-subtle"}`}>Zaległe</button>
          <button onClick={() => setRange("week")} className={`text-xs font-bold px-3 py-1.5 rounded-lg active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${range === "week" ? "bg-brand-subtle text-brand shadow-sm border border-brand/30" : "text-text-muted hover:text-brand hover:bg-brand-subtle"}`}>Ten tydzień</button>
          <button onClick={() => setRange("month")} className={`text-xs font-bold px-3 py-1.5 rounded-lg active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${range === "month" ? "bg-surface-2 text-text-main shadow-sm border border-border" : "text-text-muted hover:text-text-muted hover:bg-surface-offset"}`}>30 dni</button>
        </div>

        <div className="mb-5 bg-bg-base/40 rounded-xl p-3 border border-border shadow-inner flex items-center justify-between min-w-0">
          {activeSummary.count > 0 ? (
            <div className="flex flex-col w-full gap-1.5 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CalendarDays className="w-4 h-4 text-brand shrink-0" />
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-text-main truncate" title={texts.label}>{texts.label}</span>
                    <span className="text-xs font-medium text-text-faint shrink-0">({activeSummary.count})</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-text-main shrink-0 truncate" title={formatMoney(activeSummary.total, currency)}>{formatMoney(activeSummary.total, currency)}</span>
              </div>
              {range === "all" && totalOverdueCountInView > 0 && (
                <div className="flex items-center gap-1.5 pl-6 min-w-0">
                  <div className="w-1 h-1 rounded-full bg-danger-subtle0 shrink-0"></div>
                  <span className="text-xs text-text-muted font-medium truncate" title={`W tym zaległe: ${totalOverdueCountInView}`}>
                    W tym zaległe: <span className="text-danger font-semibold">{totalOverdueCountInView}</span>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-text-faint min-w-0">
              <span className="text-lg opacity-80 shrink-0">🏖️</span>
              <span className="text-xs font-medium truncate" title={texts.emptySummary}>
                {texts.emptySummary}
              </span>
            </div>
          )}
        </div>

        {activeSummary.count === 0 ? (
          <div className="text-center py-6 bg-bg-base/30 rounded-xl border border-dashed border-border h-full flex flex-col justify-center min-w-0">
            <div className="text-2xl mb-1 opacity-50 shrink-0">🏖️</div>
            <p className="text-xs text-text-muted font-medium truncate" title={texts.emptyTitle}>{texts.emptyTitle}</p>
            <p className="text-xs text-text-faint truncate" title={texts.emptyDesc}>{texts.emptyDesc}</p>
          </div>
        ) : (
          viewMode === "compact" ? (
            <div className="pt-2 pb-2">
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
