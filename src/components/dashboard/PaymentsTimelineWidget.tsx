import React, { memo, useState } from "react";
import { formatPln } from "../../utils";
import { Payment } from "../../types";
import { CalendarClock, AlertCircle, Clock, CalendarDays, Calendar, List, PieChart } from "lucide-react";

interface PaymentsTimelineWidgetProps {
  unpaidPayments: Payment[];
  onTogglePaymentStatus: (id: string) => void;
  onChangeView: (view: string) => void;
}

export type TimelineFilter = "all" | "week" | "month";

export function filterPaymentsByRange(payments: Payment[], range: TimelineFilter): Payment[] {
  if (range === "all") return payments;

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  return payments.filter(p => {
    if (!p.dueDate) return false;
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    const diffTime = pDate.getTime() - todayDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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

export function getTimelineTexts(range: TimelineFilter) {
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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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
  unpaidPayments,
  onTogglePaymentStatus,
  onChangeView,
}: PaymentsTimelineWidgetProps) {
  const [viewMode, setViewMode] = useState<"compact" | "monthly">("compact");
  const [range, setRange] = useState<TimelineFilter>("all");
  
  const filteredPayments = filterPaymentsByRange(unpaidPayments, range);
  const { overdue, today, next7Days, next30Days, later } = groupPaymentsByTimeline(filteredPayments);
  const activeSummary = getActiveSummary(filteredPayments);
  const overdueCount = overdue.length;
  const texts = getTimelineTexts(range);
  const highlightedIds = getNearestHighlightedPaymentIds(today, next7Days);
  const globalOverdueCount = getGlobalOverdueCount(unpaidPayments);

  const renderSection = (title: string, items: Payment[], icon: React.ReactNode, colorClass: string, bgClass: string) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4 relative">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-lg ${bgClass} ${colorClass}`}>
            {icon}
          </div>
          <h4 className={`text-xs font-bold uppercase tracking-wider ${colorClass}`}>{title}</h4>
        </div>
        <div className="space-y-2 border-l-2 border-gray-100 ml-3.5 pl-4 relative">
          {items.map(p => {
            const isHighlighted = highlightedIds.has(p.id);
            return (
              <div key={p.id} className={`bg-white border ${isHighlighted ? "border-slate-300 shadow-sm ring-1 ring-slate-100" : "border-slate-200/60 shadow-sm"} rounded-xl p-3 hover:border-[#137566]/30 transition group flex items-center justify-between`}>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{p.name}</span>
                    {isHighlighted && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Najbliższe</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">{p.dueDate}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-slate-800">{formatPln(p.amount)}</span>
                  <button
                    onClick={() => onTogglePaymentStatus(p.id)}
                    className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-transparent hover:border-[#137566] hover:bg-[#137566]/10 hover:text-[#137566] transition"
                    title="Oznacz jako opłacone"
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
        <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 h-full flex flex-col justify-center">
          <div className="text-2xl mb-1 opacity-50">🏖️</div>
          <p className="text-xs text-slate-500 font-medium">Brak zobowiązań na najbliższe 30 dni.</p>
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
          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-700" />
              <h4 className="text-sm font-bold text-rose-900">Zaległe płatności ({overdue.length})</h4>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-rose-700">Łączna kwota zaległości:</span>
              <span className="text-sm font-bold text-rose-900">{formatPln(overdueSum)}</span>
            </div>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-slate-500" />
            <h4 className="text-sm font-bold text-slate-700">{texts.overviewTitle}</h4>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Liczba pozycji:</span>
            <span className="text-sm font-bold text-slate-700">{count}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Suma kwot:</span>
            <span className="text-sm font-bold text-slate-700">{formatPln(sum)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Najbliższy termin:</span>
            <span className="text-sm font-bold text-slate-700">{nearest}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Oś Czasu</p>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Timeline Płatności</h3>
            {globalOverdueCount > 0 && (
              <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100/50">
                <AlertCircle className="w-3 h-3" />
                Zaległe: {globalOverdueCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === "compact" ? "monthly" : "compact")}
            className="text-[10px] font-bold text-slate-600 bg-slate-100/80 px-2.5 py-1.5 rounded-lg hover:bg-slate-200 transition flex items-center gap-1"
          >
            {viewMode === "compact" ? <PieChart className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
            {viewMode === "compact" ? "Monthly" : "Compact"}
          </button>
          <button
            onClick={() => onChangeView("payments")}
            className="text-[10px] font-bold text-slate-600 bg-slate-100/80 px-2.5 py-1.5 rounded-lg hover:bg-slate-200 transition flex items-center gap-1"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            Zarządzaj
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        <div className="flex gap-1 mb-4 bg-slate-100/50 p-1 rounded-xl w-fit">
          <button onClick={() => setRange("all")} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${range === "all" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>Wszystkie</button>
          <button onClick={() => setRange("week")} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${range === "week" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>Ten tydzień</button>
          <button onClick={() => setRange("month")} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${range === "month" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>30 dni</button>
        </div>

        <div className="mb-5 bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
          {activeSummary.count > 0 ? (
            <div className="flex flex-col w-full gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700">
                    {texts.label} ({activeSummary.count})
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-900">{formatPln(activeSummary.total)}</span>
              </div>
              {range === "all" && overdueCount > 0 && (
                <div className="flex justify-start mt-0.5">
                  <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded">
                    <AlertCircle className="w-3 h-3" />
                    Zaległe: {overdueCount}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500">
              <span className="text-lg">🏖️</span>
              <span className="text-xs font-medium">
                {texts.emptySummary}
              </span>
            </div>
          )}
        </div>

        {activeSummary.count === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 h-full flex flex-col justify-center">
            <div className="text-2xl mb-1 opacity-50">🏖️</div>
            <p className="text-xs text-slate-500 font-medium">{texts.emptyTitle}</p>
            <p className="text-[10px] text-slate-400">{texts.emptyDesc}</p>
          </div>
        ) : (
          viewMode === "compact" ? (
            <div className="pt-2">
              {renderSection("Zaległe", overdue, <AlertCircle className="w-4 h-4" />, "text-rose-700", "bg-rose-100")}
              {renderSection("Dzisiaj", today, <Clock className="w-4 h-4" />, "text-amber-700", "bg-amber-100")}
              {renderSection("Najbliższe 7 dni", next7Days, <CalendarDays className="w-4 h-4" />, "text-slate-700", "bg-slate-100")}
              {renderSection("Następne 30 dni", next30Days, <Calendar className="w-4 h-4" />, "text-slate-600", "bg-slate-100/50")}
              {renderSection("Później", later, <Calendar className="w-4 h-4" />, "text-slate-400", "bg-slate-50")}
            </div>
          ) : (
            renderMonthlyOverview()
          )
        )}
      </div>
    </div>
  );
});
