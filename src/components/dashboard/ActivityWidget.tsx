import React, { memo } from "react";
import { formatDate, iconByCategory } from "../../utils";
import { Transaction } from "../../types";
import { formatMoney } from "../../utils/format";

interface ActivityWidgetProps {
  currency: string;
  profileKind?: "personal" | "shared";
  recentTransactions: Transaction[];
  onChangeView: (view: string) => void;
  onOpenTxModal: () => void;
}

export const ActivityWidget = memo(function ActivityWidget({
  currency,
  recentTransactions,
  onChangeView,
  onOpenTxModal,
  profileKind
}: ActivityWidgetProps) {
  return (
    <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between h-full relative overflow-hidden" id="widget-content-activity-box">
      <div className="absolute inset-0  pointer-events-none" />
      <div className="flex items-center justify-between mb-5 relative z-10 gap-4 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-0.5 truncate" title="Ostatnie transakcje">Ostatnie transakcje</p>
          <h3 className="text-base font-bold text-text-main truncate" title="Aktywność">Aktywność</h3>
        </div>
        <button
          onClick={() => onChangeView("transactions")}
          className="text-xs font-bold text-text-muted bg-surface-2 border border-border px-2.5 py-1.5 rounded-lg hover:bg-surface active:scale-[0.98] transition-all shrink-0 truncate max-w-[100px] focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
          title="Księga"
        >
          Księga
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center relative z-10">
        {recentTransactions.length === 0 ? (
          <div className="text-center py-6 bg-surface-2 rounded-xl border border-dashed border-border h-full flex flex-col justify-center min-w-0">
            <div className="text-2xl mb-1 opacity-50 shrink-0">🧾</div>
            <p className="text-xs text-text-muted font-medium truncate px-2" title={profileKind === "shared" ? "Dodaj pierwszy wspólny wydatek" : "Brak niedawnych transakcji."}>
              {profileKind === "shared" ? "Dodaj pierwszy wspólny wydatek" : "Brak niedawnych transakcji."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:bg-surface-offset transition-all shadow-inner group gap-2 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                    t.type === 'income' ? 'bg-brand-subtle border-brand/20 text-brand' : 'bg-surface border-border text-text-muted'
                  } group-hover: transition-shadow`}>
                    <span className="text-sm shrink-0">
                      {iconByCategory[t.category] || "📄"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-text-main truncate group-hover:text-brand transition-colors" title={t.name || t.category}>
                        {t.name || t.category}
                      </span>
                      {t.paidBy && (
                        <span 
                          className="text-xs font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm bg-surface text-text-muted border border-border whitespace-nowrap shrink-0 truncate max-w-[80px]"
                          title={`${t.paidBy === 'me' ? 'Ja' : t.paidBy === 'partner' ? 'Partner' : 'Wspólne'}${t.splitMode === 'equal' ? ' (50-50)' : ''}`}
                        >
                          {t.paidBy === 'me' ? 'Ja' : t.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                          {t.splitMode === 'equal' ? ' (50-50)' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5 truncate max-w-[100px]" title={formatDate(t.isoDate)}>{formatDate(t.isoDate)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2 min-w-0">
                  <p className={`text-xs font-black truncate max-w-[100px] ${t.type === 'income' ? 'text-brand drop-' : 'text-text-main'}`} title={t.type === 'income' ? `+${formatMoney(t.amount, t.currency || currency)}` : `-${formatMoney(t.amount, t.currency || currency)}`}>
                    {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount, t.currency || currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-border relative z-10">
        <button
          onClick={() => onOpenTxModal()}
          className="w-full py-2.5 bg-surface hover:bg-surface-offset active:scale-[0.98] transition-all text-text-main text-xs font-bold rounded-xl border border-border shadow-inner flex items-center justify-center min-w-0 shrink-0 truncate px-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
          title="Szybki zapis"
        >
          <span className="truncate">+ Szybki zapis</span>
        </button>
      </div>
    </div>
  );
});
