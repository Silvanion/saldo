import React, { memo } from "react";
import { Payment } from "../../types";
import { formatMoney } from "../../utils/format";
import { CalendarClock, Plus, Check, ArrowRight, CheckCircle2 } from "lucide-react";

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
        badgeClass: "bg-danger-subtle text-danger border-danger/20 text-[10px] font-bold",
      };
    } else if (diffDays === 0) {
      return {
        label: "Dzisiaj!",
        badgeClass: "bg-danger-subtle text-danger border-danger/40 text-[10px] font-bold",
      };
    } else if (diffDays === 1) {
      return {
        label: "Jutro",
        badgeClass: "bg-warning-subtle text-warning border-warning/30 text-[10px] font-bold",
      };
    } else if (diffDays <= 3) {
      return {
        label: `Za ${diffDays} dni`,
        badgeClass: "bg-warning-subtle text-warning border-warning/20 text-[10px] font-bold",
      };
    }
    return {
      label: null,
      badgeClass: "",
    };
  };

  const topItems = unpaidPayments.slice(0, 5);

  return (
    <div className="bg-surface p-4 sm:p-5 rounded-xl border border-border/70 shadow-xs flex flex-col justify-between h-full max-h-[440px] relative overflow-hidden" id="widget-content-bills-box">
      <div className="flex items-center justify-between mb-3.5 relative z-10 gap-4 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-text-faint uppercase tracking-wider mb-0.5 truncate" title="Rachunki i opłaty">Rachunki i opłaty</p>
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-base font-bold text-text-main truncate" title="Nadchodzące płatności">Nadchodzące</h3>
            {urgentPaymentsCount > 0 && (
              <span className="text-[10px] uppercase tracking-wider bg-danger-subtle text-danger border border-danger/20 px-2 py-0.5 rounded-full font-bold shrink-0">
                Pilne ({urgentPaymentsCount})
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onChangeView("payments")}
          className="text-xs font-semibold text-brand bg-brand-subtle hover:bg-brand-subtle/80 border border-brand/20 px-2.5 py-1.5 rounded-lg active:scale-[0.98] transition-all shrink-0 flex items-center gap-1.5 shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
          title="Zarządzaj"
        >
          <span>Zarządzaj</span>
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        {unpaidPayments.length === 0 ? (
          <div className="text-center py-8 px-4 bg-bg-base/30 rounded-xl border border-dashed border-border h-full flex flex-col items-center justify-center min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle flex items-center justify-center mb-2 border border-brand/20 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-brand" />
            </div>
            <p className="text-xs text-text-main font-bold truncate">Brak rachunków do opłacenia</p>
            <p className="text-[11px] text-text-faint truncate mt-0.5">Wszystkie bieżące opłaty są uregulowane.</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar">
            {topItems.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:bg-surface-offset transition-colors group gap-2 min-w-0 shadow-xs">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => onTogglePaymentStatus(p.id)}
                    className="w-6 h-6 rounded-full border border-border flex items-center justify-center text-transparent hover:border-brand/40 hover:text-brand hover:bg-brand-subtle active:scale-[0.98] transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                    title="Oznacz jako opłacone"
                    aria-label={`Oznacz jako opłacone: ${p.name}`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-bold text-text-main leading-tight group-hover:text-brand transition-colors truncate" title={p.name}>{p.name}</span>
                      {p.paidBy && (
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-2 text-text-muted border border-border shrink-0"
                        >
                          {p.paidBy === 'me' ? 'Ja' : p.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 min-w-0">
                      <p className="text-xs text-text-faint font-medium whitespace-nowrap tabular-nums shrink-0" title={p.dueDate}>{p.dueDate}</p>
                      {(() => {
                        const status = getDueStatus(p.dueDate);
                        if (status.label) {
                          return (
                            <span className={`px-1.5 py-0.5 rounded-md border tracking-wider shrink-0 ${status.badgeClass}`} id={`due-badge-${p.id}`} title={status.label}>
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
                  <p className="text-sm font-bold tabular-nums text-text-main group-hover:text-brand transition-colors truncate" title={formatMoney(p.amount, p.currency || currency)}>
                    {formatMoney(p.amount, p.currency || currency)}
                  </p>
                </div>
              </div>
            ))}
            {unpaidPayments.length > 5 && (
              <p className="text-center text-xs text-text-faint font-semibold pt-2 pb-1">
                + {unpaidPayments.length - 5} innych opłat (zobacz w zakładce Zarządzaj)
              </p>
            )}
          </div>
        )}
      </div>

      <div className="pt-3 mt-3 border-t border-border/70 relative z-10">
        <button
          onClick={onOpenPaymentModal}
          className="w-full py-2 bg-surface-2/60 hover:bg-surface-2 text-text-main text-xs font-semibold rounded-xl active:scale-[0.98] transition-all border border-border/70 flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shadow-2xs"
          title="Dodaj nową opłatę"
        >
          <Plus className="w-3.5 h-3.5 text-brand" strokeWidth={1.75} />
          <span>Dodaj opłatę</span>
        </button>
      </div>
    </div>
  );
});
