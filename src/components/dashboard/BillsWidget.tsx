import React, { memo } from "react";
import {} from "../../utils";
import { Payment } from "../../types";
import { formatMoney } from "../../utils/format";

interface BillsWidgetProps {
  unpaidPayments: Payment[];
  urgentPaymentsCount: number;
  onTogglePaymentStatus: (id: string) => void;
  onChangeView: (view: string) => void;
  onOpenPaymentModal: () => void;
}

export const BillsWidget = memo(function BillsWidget({
  unpaidPayments,
  urgentPaymentsCount,
  onTogglePaymentStatus,
  onChangeView,
  onOpenPaymentModal
}: BillsWidgetProps) {
  
  const getDueStatus = (dueDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pDate = new Date(`${dueDateStr}T00:00:00`);
    const diffTime = pDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return {
        label: "Przeterminowane!",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 text-[9px] font-bold",
      };
    } else if (diffDays === 0) {
      return {
        label: "Dzisiaj!",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-200 animate-pulse text-[9px] font-bold",
      };
    } else if (diffDays === 1) {
      return {
        label: "Jutro",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-200 text-[9px] font-bold",
      };
    } else if (diffDays <= 3) {
      return {
        label: `Za ${diffDays} dni`,
        badgeClass: "bg-amber-100 text-amber-800 border-amber-200 text-[9px] font-bold",
      };
    }
    return {
      label: null,
      badgeClass: "",
    };
  };

  const topItems = unpaidPayments.slice(0, 5);

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-full max-h-[420px]" id="widget-content-bills-box">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Rachunki i opłaty</p>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Nadchodzące</h3>
            <span className="text-[9px] uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100/50 px-1.5 py-0.5 rounded font-bold">Priorytet</span>
          </div>
        </div>
        <button
          onClick={() => onChangeView("payments")}
          className="text-[10px] font-bold text-slate-600 bg-slate-100/80 px-2.5 py-1.5 rounded-lg hover:bg-slate-200 transition"
        >
          Zarządzaj
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {unpaidPayments.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 h-full flex flex-col justify-center">
            <div className="text-2xl mb-1 opacity-50">🍵</div>
            <p className="text-xs text-slate-500 font-medium">Brak rachunków do opłacenia.</p>
            <p className="text-[10px] text-slate-400">Możesz spać spokojnie.</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar">
            {topItems.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 bg-white hover:bg-slate-50 transition shadow-sm group">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => onTogglePaymentStatus(p.id)}
                    className="w-5 h-5 rounded border border-slate-300 flex items-center justify-center text-transparent hover:border-[#137566] hover:text-[#137566] transition shrink-0"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 leading-tight group-hover:text-[#137566] transition-colors flex items-center gap-1.5 flex-wrap">
                      <span className="truncate">{p.name}</span>
                      {p.paidBy && (
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm bg-slate-100 text-slate-600 border border-slate-200/60 whitespace-nowrap shrink-0">
                          {p.paidBy === 'me' ? 'Ja' : p.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                          {p.splitMode === 'equal' ? ' (50-50)' : ''}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap">{p.dueDate}</p>
                      {(() => {
                        const status = getDueStatus(p.dueDate);
                        if (status.label) {
                          return (
                            <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${status.badgeClass}`} id={`due-badge-${p.id}`}>
                              {status.label}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-black text-slate-800">{formatMoney(p.amount)}</p>
                </div>
              </div>
            ))}
            {unpaidPayments.length > 5 && (
              <p className="text-center text-[10px] text-slate-400 font-semibold pt-2 pb-1">
                + {unpaidPayments.length - 5} innych opłat
              </p>
            )}
          </div>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-slate-100">
        <button
          onClick={() => onOpenPaymentModal()}
          className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors border border-slate-200/60 shadow-sm flex items-center justify-center gap-1.5"
        >
          + Dodaj płatność
        </button>
      </div>
    </div>
  );
});
