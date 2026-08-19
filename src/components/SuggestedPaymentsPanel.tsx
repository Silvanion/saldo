
import React from "react";
import { Payment } from "../types";
import { getLocalDateIso } from "../utils";
import { formatMoney } from "../utils/format";
import { DelayedTooltip } from "./dashboard/DelayedTooltip";
import { Sparkles, Plus } from "lucide-react";

interface SuggestedPaymentsPanelProps {
  currency: string;
  payments: Payment[];
  selectedDate: Date;
  onAddPayment: (payment: any) => void;
}

export function SuggestedPaymentsPanel({ payments, selectedDate, onAddPayment, currency }: SuggestedPaymentsPanelProps) {
  const currentMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const currentMonthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

  const prevMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
  const prevMonthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0);

  const prevMonthPayments = payments.filter((p) => {
    const d = new Date(p.dueDate);
    return d >= prevMonthStart && d <= prevMonthEnd;
  });

  const currentMonthPayments = payments.filter((p) => {
    const d = new Date(p.dueDate);
    return d >= currentMonthStart && d <= currentMonthEnd;
  });

  const currentMonthNames = new Set(currentMonthPayments.map((p) => p.name.trim().toLowerCase()));

  const suggestedPayments = prevMonthPayments.filter((p) => !currentMonthNames.has(p.name.trim().toLowerCase()));

  const handleAddSuggestedPayment = (suggestedP: Payment) => {
    // Generate new due date for current month
    const oldDate = new Date(suggestedP.dueDate);
    let newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), oldDate.getDate());
    
    // If the old date was e.g. 31st and this month has 30 days, adjust to last day of month
    if (newDate.getMonth() !== selectedDate.getMonth()) {
      newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    }
    
    onAddPayment({
      name: suggestedP.name,
      amount: suggestedP.amount,
      dueDate: getLocalDateIso(newDate),
      status: "Do opłacenia",
      category: suggestedP.category
    });
  };

  if (suggestedPayments.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-sm p-5 sm:p-6 mb-6" id="suggested-payments-panel">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-brand-subtle text-brand shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-text-faint uppercase tracking-wider mb-0.5 truncate" title="Sugestie Cykliczne">
              Sugestie Cykliczne
            </p>
            <h3 className="text-sm sm:text-base font-bold text-text-main truncate" title="Rachunki z poprzedniego miesiąca">
              Rachunki z poprzedniego miesiąca
            </h3>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-subtle text-brand border border-brand/20 shrink-0 self-start sm:self-auto">
          {suggestedPayments.length} do dodania
        </span>
      </div>

      <p className="text-xs text-text-muted mb-4 leading-relaxed">
        W poprzednim miesiącu opłacono te rachunki. Chcesz je powtórzyć w tym miesiącu z podobną kwotą i terminem?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {suggestedPayments.map(sp => {
          const oldDate = new Date(sp.dueDate);
          let newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), oldDate.getDate());
          if (newDate.getMonth() !== selectedDate.getMonth()) {
            newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
          }
          return (
            <div
              key={`sugg-${sp.id}`}
              className="bg-surface-2/60 hover:bg-surface-2 border border-border/80 rounded-xl p-3.5 shadow-sm transition-colors flex flex-col justify-between gap-3 min-w-0"
            >
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-text-main truncate" title={sp.name}>
                  {sp.name}
                </h4>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-main tabular-nums truncate">
                    {formatMoney(sp.amount, sp.currency || currency)}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    do {newDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <DelayedTooltip label="Skopiuj do tego miesiąca">
                  <button
                    onClick={() => handleAddSuggestedPayment(sp)}
                    aria-label={`Dodaj rachunek ${sp.name}`}
                    className="inline-flex items-center gap-1 bg-brand-subtle hover:bg-brand text-brand hover:text-text-inverse border border-brand/20 px-2.5 py-1 rounded-lg text-xs font-bold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Dodaj</span>
                  </button>
                </DelayedTooltip>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
