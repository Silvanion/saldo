import React, { memo } from "react";
import {} from "../../utils";
import { Payment } from "../../types";
import { formatMoney } from "../../utils/format";

interface BillsWidgetProps {
  currency: string;
  unpaidPayments: Payment[];
  urgentPaymentsCount: number;
  onTogglePaymentStatus: (id: string) => void;
  onChangeView: (view: string) => void;
  onOpenPaymentModal: () => void;
}

export const BillsWidget = memo(function BillsWidget({
  currency,
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
    <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between h-full max-h-[420px] relative overflow-hidden" id="widget-content-bills-box">
      <div className="absolute inset-0  pointer-events-none" />
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5 ">Rachunki i opłaty</p>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-text-main">Nadchodzące</h3>
            <span className="text-[9px] uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-bold ">Priorytet</span>
          </div>
        </div>
        <button
          onClick={() => onChangeView("payments")}
          className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/20 transition  "
        >
          Zarządzaj
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        {unpaidPayments.length === 0 ? (
          <div className="text-center py-6 bg-bg-base/30 rounded-xl border border-dashed border-slate-600/50 h-full flex flex-col justify-center">
            <div className="text-2xl mb-1 opacity-50 ">🍵</div>
            <p className="text-xs text-text-muted font-medium">Brak rachunków do opłacenia.</p>
            <p className="text-[10px] text-text-faint">Możesz spać spokojnie.</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar">
            {topItems.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:bg-surface-2 transition shadow-inner group">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => onTogglePaymentStatus(p.id)}
                    className="w-5 h-5 rounded border border-slate-600 flex items-center justify-center text-transparent hover:border-emerald-400 hover:text-emerald-400 hover: transition shrink-0"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-main leading-tight group-hover:text-emerald-400 transition-colors flex items-center gap-1.5 flex-wrap">
                      <span className="truncate">{p.name}</span>
                      {p.paidBy && (
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm bg-surface text-text-muted border border-slate-600/60 whitespace-nowrap shrink-0">
                          {p.paidBy === 'me' ? 'Ja' : p.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                          {p.splitMode === 'equal' ? ' (50-50)' : ''}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-[10px] text-text-muted font-medium whitespace-nowrap">{p.dueDate}</p>
                      {(() => {
                        const status = getDueStatus(p.dueDate);
                        if (status.label) {
                          const badgeDarkClass = status.badgeClass
                            .replace('bg-rose-50 text-rose-700 border-rose-200', 'bg-rose-500/20 text-rose-300 border-rose-500/30')
                            .replace('bg-rose-100 text-rose-800 border-rose-200', 'bg-rose-500/30 text-rose-300 border-rose-500/40')
                            .replace('bg-amber-100 text-amber-800 border-amber-200', 'bg-amber-500/20 text-amber-300 border-amber-500/30');
                          
                          return (
                            <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${badgeDarkClass}`} id={`due-badge-${p.id}`}>
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
                  <p className="text-sm font-black text-text-main group-hover:text-emerald-300 transition-colors">{formatMoney(p.amount, p.currency || currency)}</p>
                </div>
              </div>
            ))}
            {unpaidPayments.length > 5 && (
              <p className="text-center text-[10px] text-text-faint font-semibold pt-2 pb-1">
                + {unpaidPayments.length - 5} innych opłat
              </p>
            )}
          </div>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-border relative z-10">
        <button
          onClick={() => onOpenPaymentModal()}
          className="w-full py-2.5 bg-surface hover:bg-surface-2 text-text-muted text-xs font-bold rounded-xl transition-colors border border-slate-600/50 shadow-inner flex items-center justify-center gap-1.5 hover: hover:border-slate-500/50"
        >
          + Dodaj płatność
        </button>
      </div>
    </div>
  );
});
