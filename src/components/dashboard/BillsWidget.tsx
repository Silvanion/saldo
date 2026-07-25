import React, { memo } from "react";
import { formatPln } from "../../utils";
import { Payment } from "../../types";

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
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
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

  const top3 = unpaidPayments.slice(0, 3);

  return (
    <div className="bg-rose-50/40 p-5 rounded-2xl border border-rose-200/60 shadow-sm flex flex-col justify-between h-full" id="widget-content-bills-box">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-0.5">Rachunki i opłaty</p>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-rose-900">Nadchodzące</h3>
            <span className="text-[9px] uppercase tracking-wider bg-rose-200/70 text-rose-800 px-1.5 py-0.5 rounded-md font-black">Priorytet</span>
          </div>
        </div>
        <button
          onClick={() => onChangeView("payments")}
          className="text-[10px] font-bold text-rose-700 bg-rose-200/50 px-2.5 py-1.5 rounded-lg hover:bg-rose-200 transition"
        >
          Zarządzaj
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {unpaidPayments.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <div className="text-2xl mb-1 opacity-50">🍵</div>
            <p className="text-xs text-gray-500 font-medium">Brak rachunków do opłacenia.</p>
            <p className="text-[10px] text-gray-400">Możesz spać spokojnie.</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar">
            {top3.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 bg-white hover:bg-slate-50 transition shadow-sm group">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => onTogglePaymentStatus(p.id)}
                    className="w-5 h-5 rounded border border-slate-300 flex items-center justify-center text-transparent hover:border-[#137566] hover:text-[#137566] transition"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <div>
                    <p className="text-sm font-bold text-slate-800 leading-tight group-hover:text-[#137566] transition-colors flex items-center gap-1.5 flex-wrap">
                      {p.name}
                      {p.paidBy && (
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                          {p.paidBy === 'me' ? 'Ja' : p.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                          {p.splitMode === 'equal' ? ' (50-50)' : ''}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-slate-500 font-medium">{p.dueDate}</p>
                      {(() => {
                        const status = getDueStatus(p.dueDate);
                        if (status.label) {
                          return (
                            <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider ${status.badgeClass}`} id={`due-badge-${p.id}`}>
                              {status.label}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-800">{formatPln(p.amount)}</p>
                </div>
              </div>
            ))}
            {unpaidPayments.length > 3 && (
              <p className="text-center text-[10px] text-slate-400 font-semibold pt-1">
                + {unpaidPayments.length - 3} innych płatności
              </p>
            )}
          </div>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-rose-200/50">
        <button
          onClick={onOpenPaymentModal}
          className="w-full py-2.5 bg-white hover:bg-rose-100/50 text-rose-700 text-xs font-bold rounded-xl transition-colors border border-rose-200/60 shadow-sm"
        >
          + Dodaj płatność
        </button>
      </div>
    </div>
  );
});
