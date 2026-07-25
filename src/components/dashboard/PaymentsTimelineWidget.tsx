import React, { memo, useState } from "react";
import { formatPln } from "../../utils";
import { Payment } from "../../types";
import { CalendarClock, AlertCircle, Clock, CalendarDays, Calendar, List, PieChart } from "lucide-react";

interface PaymentsTimelineWidgetProps {
  unpaidPayments: Payment[];
  onTogglePaymentStatus: (id: string) => void;
  onChangeView: (view: string) => void;
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
  
  const { overdue, today, next7Days, next30Days, later } = groupPaymentsByTimeline(unpaidPayments);
  const totalInTimeline = overdue.length + today.length + next7Days.length + next30Days.length + later.length;

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
          {items.map(p => (
            <div key={p.id} className="bg-white border border-slate-200/60 rounded-xl p-3 shadow-sm hover:border-[#137566]/30 transition group flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">{p.name}</span>
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
          ))}
        </div>
      </div>
    );
  };

  const renderMonthlyOverview = () => {
    const upcoming = [...today, ...next7Days, ...next30Days].sort((a,b) => a.dueDate.localeCompare(b.dueDate));
    
    if (upcoming.length === 0 && overdue.length === 0) {
      return (
        <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 h-full flex flex-col justify-center">
          <div className="text-2xl mb-1 opacity-50">🏖️</div>
          <p className="text-xs text-gray-500 font-medium">Brak nadchodzących zobowiązań na najbliższe 30 dni.</p>
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
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex flex-col gap-3">
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

        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-700" />
            <h4 className="text-sm font-bold text-indigo-900">Nadchodzące 30 dni</h4>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-indigo-700">Liczba pozycji:</span>
            <span className="text-sm font-bold text-indigo-900">{count}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-indigo-700">Suma kwot:</span>
            <span className="text-sm font-bold text-indigo-900">{formatPln(sum)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-indigo-700">Najbliższy termin:</span>
            <span className="text-sm font-bold text-indigo-900">{nearest}</span>
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
        {totalInTimeline === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 h-full flex flex-col justify-center">
            <div className="text-2xl mb-1 opacity-50">🏖️</div>
            <p className="text-xs text-slate-500 font-medium">Brak nadchodzących zobowiązań.</p>
            <p className="text-[10px] text-slate-400">Twój harmonogram jest czysty.</p>
          </div>
        ) : (
          viewMode === "compact" ? (
            <div className="pt-2">
              {renderSection("Zaległe", overdue, <AlertCircle className="w-4 h-4" />, "text-rose-700", "bg-rose-100")}
              {renderSection("Dzisiaj", today, <Clock className="w-4 h-4" />, "text-amber-700", "bg-amber-100")}
              {renderSection("Najbliższe 7 dni", next7Days, <CalendarDays className="w-4 h-4" />, "text-indigo-700", "bg-indigo-100")}
              {renderSection("Następne 30 dni", next30Days, <Calendar className="w-4 h-4" />, "text-blue-700", "bg-blue-100")}
              {renderSection("Później", later, <Calendar className="w-4 h-4" />, "text-gray-600", "bg-gray-100")}
            </div>
          ) : (
            renderMonthlyOverview()
          )
        )}
      </div>
    </div>
  );
});
