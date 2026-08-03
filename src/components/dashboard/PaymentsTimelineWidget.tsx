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
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-lg ${bgClass} ${colorClass} border border-white/5 shadow-inner`}>
            {icon}
          </div>
          <h4 className={`text-xs font-bold uppercase tracking-wider ${colorClass} drop-shadow-sm`}>{title}</h4>
        </div>
        <div className="space-y-2 border-l-2 border-slate-700/50 ml-3.5 pl-4 relative">
          {items.map(p => {
            const isHighlighted = highlightedIds.has(p.id);
            return (
              <div key={p.id} className={`bg-slate-900/50 border ${isHighlighted ? "border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.1)] ring-1 ring-emerald-500/20" : "border-slate-700/50 shadow-sm"} rounded-xl p-3 hover:border-emerald-500/30 hover:bg-slate-800/50 transition group flex items-center justify-between backdrop-blur-md`}>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{p.name}</span>
                    {isHighlighted && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">Najbliższe</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">{p.dueDate}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-black ${isHighlighted ? "text-emerald-400" : "text-slate-300"}`}>{formatMoney(p.amount, currency)}</span>
                  <button
                    onClick={() => onTogglePaymentStatus(p.id)}
                    className="w-6 h-6 rounded-full border border-slate-600 flex items-center justify-center text-transparent hover:border-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-400 hover:shadow-[0_0_8px_rgba(52,211,153,0.4)] transition"
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
        <div className="text-center py-6 bg-slate-900/30 rounded-xl border border-dashed border-slate-700 h-full flex flex-col justify-center">
          <div className="text-2xl mb-1 opacity-50 drop-shadow-md">🏖️</div>
          <p className="text-xs text-slate-400 font-medium">Brak zobowiązań na najbliższe 30 dni.</p>
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
          <div className="bg-rose-900/20 border border-rose-500/30 rounded-xl p-4 flex flex-col gap-3 shadow-[0_0_15px_rgba(244,63,94,0.05)] backdrop-blur-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]" />
              <h4 className="text-sm font-bold text-rose-300">Zaległe płatności ({overdue.length})</h4>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-rose-400/80">Łączna kwota zaległości:</span>
              <span className="text-sm font-bold text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.3)]">{formatMoney(overdueSum, currency)}</span>
            </div>
          </div>
        )}

        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-3 shadow-inner backdrop-blur-md">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-slate-200">{texts.overviewTitle}</h4>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Liczba pozycji:</span>
            <span className="text-sm font-bold text-slate-200">{count}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Suma kwot:</span>
            <span className="text-sm font-bold text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]">{formatMoney(sum, currency)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Najbliższy termin:</span>
            <span className="text-sm font-bold text-slate-200">{nearest}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-800/40 backdrop-blur-xl p-5 rounded-2xl border border-slate-700/50 shadow-2xl flex flex-col justify-between h-full max-h-[420px] relative overflow-hidden group/timeline">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none opacity-50 group-hover/timeline:opacity-100 transition-opacity duration-500" />
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Oś Czasu</p>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-100 drop-shadow-sm">Timeline Płatności</h3>
            {globalOverdueCount > 0 && (
              <span className="text-[10px] text-rose-300 font-medium flex items-center gap-1 bg-rose-900/40 px-1.5 py-0.5 rounded border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]">
                <AlertCircle className="w-3 h-3 text-rose-400" />
                Zaległe: {globalOverdueCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === "compact" ? "monthly" : "compact")}
            className="text-[10px] font-bold text-slate-400 bg-slate-900/50 border border-slate-700/50 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 hover:text-slate-200 transition flex items-center gap-1 shadow-inner backdrop-blur-md"
          >
            {viewMode === "compact" ? <PieChart className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
            {viewMode === "compact" ? "Monthly" : "Compact"}
          </button>
          <button
            onClick={() => onChangeView("payments")}
            className="text-[10px] font-bold text-slate-400 bg-slate-900/50 border border-slate-700/50 px-2.5 py-1.5 rounded-lg hover:bg-slate-700 hover:text-slate-200 transition flex items-center gap-1 shadow-inner backdrop-blur-md"
          >
            <CalendarClock className="w-3.5 h-3.5 text-emerald-400" />
            Zarządzaj
          </button>
        </div>
      </div>

      <div className="mb-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-3 flex justify-between items-center shadow-[0_0_15px_rgba(52,211,153,0.05)] backdrop-blur-md relative z-10">
        <div className="flex items-center gap-2">
           <CalendarClock className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
           <span className="text-sm font-semibold text-emerald-300">Do zapłaty w tym tygodniu</span>
        </div>
        <span className="text-sm font-bold text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]">{formatMoney(dueThisWeekTotal, currency)}</span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0 relative z-10">
        <div className="flex gap-1 mb-4 bg-slate-900/50 p-1 rounded-xl w-fit border border-slate-700/50 shadow-inner">
          <button onClick={() => setRange("all")} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${range === "all" ? "bg-slate-700 text-slate-100 shadow-sm border border-slate-600" : "text-slate-400 hover:text-slate-300 hover:bg-slate-800"}`}>Wszystkie</button>
          <button onClick={() => setRange("overdue")} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${range === "overdue" ? "bg-rose-900/50 text-rose-300 shadow-sm border border-rose-500/30" : "text-slate-400 hover:text-rose-300 hover:bg-rose-900/20"}`}>Zaległe</button>
          <button onClick={() => setRange("week")} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${range === "week" ? "bg-emerald-900/50 text-emerald-300 shadow-sm border border-emerald-500/30" : "text-slate-400 hover:text-emerald-300 hover:bg-emerald-900/20"}`}>Ten tydzień</button>
          <button onClick={() => setRange("month")} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${range === "month" ? "bg-slate-700 text-slate-100 shadow-sm border border-slate-600" : "text-slate-400 hover:text-slate-300 hover:bg-slate-800"}`}>30 dni</button>
        </div>

        <div className="mb-5 bg-slate-900/40 rounded-xl p-3 border border-slate-700/50 shadow-inner flex items-center justify-between">
          {activeSummary.count > 0 ? (
            <div className="flex flex-col w-full gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-400" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-semibold text-slate-200">{texts.label}</span>
                    <span className="text-[10px] font-medium text-slate-500">({activeSummary.count})</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-200">{formatMoney(activeSummary.total, currency)}</span>
              </div>
              {range === "all" && totalOverdueCountInView > 0 && (
                <div className="flex items-center gap-1.5 pl-6">
                  <div className="w-1 h-1 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.8)]"></div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    W tym zaległe: <span className="text-rose-400 font-semibold">{totalOverdueCountInView}</span>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500">
              <span className="text-lg opacity-80 drop-shadow-sm">🏖️</span>
              <span className="text-xs font-medium">
                {texts.emptySummary}
              </span>
            </div>
          )}
        </div>

        {activeSummary.count === 0 ? (
          <div className="text-center py-6 bg-slate-900/30 rounded-xl border border-dashed border-slate-700 h-full flex flex-col justify-center">
            <div className="text-2xl mb-1 opacity-50 drop-shadow-md">🏖️</div>
            <p className="text-xs text-slate-400 font-medium">{texts.emptyTitle}</p>
            <p className="text-[10px] text-slate-500">{texts.emptyDesc}</p>
          </div>
        ) : (
          viewMode === "compact" ? (
            <div className="pt-2 pb-2">
              {renderSection("Zaległe", overdue, <AlertCircle className="w-4 h-4" />, "text-rose-400", "bg-rose-500/20")}
              {renderSection("Dzisiaj", today, <Clock className="w-4 h-4" />, "text-amber-400", "bg-amber-500/20")}
              {renderSection("Najbliższe 7 dni", next7Days, <CalendarDays className="w-4 h-4" />, "text-emerald-400", "bg-emerald-500/20")}
              {renderSection("Następne 30 dni", next30Days, <Calendar className="w-4 h-4" />, "text-slate-300", "bg-slate-700/50")}
              {renderSection("Później", later, <Calendar className="w-4 h-4" />, "text-slate-500", "bg-slate-800/50")}
              
              {remainingCount > 0 && (
                <p className="text-center text-[10px] text-slate-500 font-semibold pt-2 pb-1">
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
