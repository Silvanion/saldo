
import React from "react";
import { Payment } from "../types";
import { getLocalDateIso } from "../utils";
import { formatMoney } from "../utils/format";
import { DelayedTooltip } from "./dashboard/DelayedTooltip";

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
    <div className="bg-surface rounded-2xl border border-border shadow-lg p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="bg-slate-100 text-text-muted p-1.5 rounded-xl">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        <h3 className="text-sm font-bold text-text-main">Sugestie z poprzedniego miesiąca</h3>
      </div>
      <p className="text-xs text-text-muted mb-4">
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
            <div key={`sugg-${sp.id}`} className="bg-surface rounded-xl border border-border p-3 shadow-sm hover:border-slate-300 transition">
              <h4 className="text-sm font-bold text-text-main">{sp.name}</h4>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-text-muted">{formatMoney(sp.amount, sp.currency || currency)} <br/><span className="text-xs">do {newDate.toLocaleDateString('pl-PL', {day:'numeric', month:'short'})}</span></span>
                <DelayedTooltip label="Skopiuj do tego miesiąca">
                  <button
                    onClick={() => handleAddSuggestedPayment(sp)}
                    className="bg-slate-100 hover:bg-slate-200 text-text-muted border border-slate-200 px-2 py-1.5 rounded-xl text-xs font-semibold active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50 cursor-pointer"
                  >
                    + Dodaj
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
