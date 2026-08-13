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
        badgeClass: "bg-danger-subtle text-danger border-danger/20 text-xs font-bold",
      };
    } else if (diffDays === 0) {
      return {
        label: "Dzisiaj!",
        badgeClass: "bg-danger-subtle text-danger border-danger/40 animate-pulse text-xs font-bold",
      };
    } else if (diffDays === 1) {
      return {
        label: "Jutro",
        badgeClass: "bg-danger-subtle text-danger border-danger/40 text-xs font-bold",
      };
    } else if (diffDays <= 3) {
      return {
        label: `Za ${diffDays} dni`,
        badgeClass: "bg-warning-subtle text-warning border-warning/20 text-xs font-bold",
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
      <div className="flex items-center justify-between mb-5 relative z-10 gap-4 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-0.5 truncate" title="Rachunki i opłaty">Rachunki i opłaty</p>
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-base font-bold text-text-main truncate" title="Nadchodzące">Nadchodzące</h3>
            <span className="text-xs uppercase tracking-wider bg-danger-subtle text-danger border border-danger/20 px-1.5 py-0.5 rounded font-bold shrink-0">Priorytet</span>
          </div>
        </div>
        <button
          onClick={() => onChangeView("payments")}
          className="text-xs font-bold text-brand bg-brand-subtle border border-brand/20 px-2.5 py-1.5 rounded-lg hover:bg-brand-subtle active:scale-[0.98] transition-all shrink-0 truncate max-w-[100px] focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
          title="Zarządzaj"
        >
          Zarządzaj
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        {unpaidPayments.length === 0 ? (
          <div className="text-center py-6 bg-surface-2 rounded-xl border border-dashed border-border h-full flex flex-col justify-center min-w-0">
            <div className="text-2xl mb-1 opacity-50 shrink-0">🍵</div>
            <p className="text-xs text-text-muted font-medium truncate" title="Brak rachunków do opłacenia.">Brak rachunków do opłacenia.</p>
            <p className="text-xs text-text-faint truncate" title="Możesz spać spokojnie.">Możesz spać spokojnie.</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar">
            {topItems.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:bg-surface-offset transition-colors shadow-inner group gap-2 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => onTogglePaymentStatus(p.id)}
                    className="w-5 h-5 rounded border border-border flex items-center justify-center text-transparent hover:border-brand/40 hover:text-brand active:scale-[0.98] transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                    title="Oznacz jako opłacone"
                    aria-label="Oznacz jako opłacone"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-bold text-text-main leading-tight group-hover:text-brand transition-colors truncate" title={p.name}>{p.name}</span>
                      {p.paidBy && (
                        <span
                          className="text-xs font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm bg-surface text-text-muted border border-border whitespace-nowrap shrink-0 truncate max-w-[80px]"
                          title={`${p.paidBy === 'me' ? 'Ja' : p.paidBy === 'partner' ? 'Partner' : 'Wspólne'}${p.splitMode === 'equal' ? ' (50-50)' : ''}`}
                        >
                          {p.paidBy === 'me' ? 'Ja' : p.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                          {p.splitMode === 'equal' ? ' (50-50)' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 min-w-0">
                      <p className="text-xs text-text-muted font-medium whitespace-nowrap shrink-0 truncate max-w-[80px]" title={p.dueDate}>{p.dueDate}</p>
                      {(() => {
                        const status = getDueStatus(p.dueDate);
                        if (status.label) {
                          const badgeDarkClass = status.badgeClass;

                          return (
                            <span className={`px-1.5 py-0.5 rounded-md border text-xs font-bold uppercase tracking-wider shrink-0 truncate max-w-[100px] ${badgeDarkClass}`} id={`due-badge-${p.id}`} title={status.label}>
                              {status.label}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2 min-w-0">
                  <p className="text-sm font-black text-text-main group-hover:text-brand transition-colors truncate max-w-[100px]" title={formatMoney(p.amount, p.currency || currency)}>{formatMoney(p.amount, p.currency || currency)}</p>
                </div>
              </div>
            ))}
            {unpaidPayments.length > 5 && (
              <p className="text-center text-xs text-text-faint font-semibold pt-2 pb-1">
                + {unpaidPayments.length - 5} innych opła
              </p>
            )}
          </div>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-border relative z-10">
        <button
          onClick={() => onOpenPaymentModal()}
          className="w-full py-2.5 bg-surface hover:bg-surface-offset text-text-main text-xs font-bold rounded-xl active:scale-[0.98] transition-all border border-border shadow-inner flex items-center justify-center gap-1.5 min-w-0 shrink-0 truncate px-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
          title="Dodaj płatność"
        >
          <span className="truncate">+ Dodaj płatność</span>
        </button>
      </div>
    </div>
  );
});
