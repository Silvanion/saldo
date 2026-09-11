import React, { memo } from "react";
import { formatDate, iconByCategory } from "../../utils";
import { Transaction } from "../../types";
import { formatMoney } from "../../utils/format";
import { Plus, ArrowRight, ReceiptText } from "lucide-react";

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
    <div className="bg-surface p-4 sm:p-5 rounded-xl border border-border/70 shadow-xs flex flex-col justify-between h-full max-h-[440px] relative overflow-hidden" id="widget-content-activity-box">
      <div className="flex items-center justify-between mb-3.5 relative z-10 gap-4 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-text-faint uppercase tracking-wider mb-0.5 truncate" title="Ostatnie transakcje">Ostatnie transakcje</p>
          <h3 className="text-base font-bold text-text-main truncate" title="Historia aktywności">Aktywność</h3>
        </div>
        <button
          onClick={() => onChangeView("transactions")}
          className="text-xs font-semibold text-brand bg-brand-subtle hover:bg-brand-subtle/80 border border-brand/20 px-2.5 py-1.5 rounded-lg active:scale-[0.98] transition-all shrink-0 flex items-center gap-1.5 shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
          title="Przejdź do Księgi"
        >
          <span>Księga</span>
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-start overflow-y-auto pr-1 custom-scrollbar relative z-10">
        {recentTransactions.length === 0 ? (
          <div className="text-center py-8 px-4 bg-bg-base/30 rounded-xl border border-dashed border-border h-full flex flex-col items-center justify-center min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle flex items-center justify-center mb-2 border border-brand/20 shadow-xs">
              <ReceiptText className="w-5 h-5 text-brand" />
            </div>
            <p className="text-xs text-text-main font-bold truncate px-2">
              {profileKind === "shared" ? "Brak wspólnych wydatków" : "Brak zarejestrowanych transakcji"}
            </p>
            <p className="text-[11px] text-text-faint truncate mt-0.5">Dodaj pierwszy wydatek lub przychód.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:bg-surface-offset transition-all shadow-xs group gap-2 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-xs ${
                    t.type === 'income' ? 'bg-brand-subtle border-brand/20 text-brand' : 'bg-surface-2 border-border text-text-muted'
                  }`}>
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
                          className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-2 text-text-muted border border-border shrink-0"
                          title={`${t.paidBy === 'me' ? 'Ja' : t.paidBy === 'partner' ? 'Partner' : 'Wspólne'}${t.splitMode === 'equal' ? ' (50-50)' : ''}`}
                        >
                          {t.paidBy === 'me' ? 'Ja' : t.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-faint mt-0.5 truncate" title={formatDate(t.isoDate)}>{formatDate(t.isoDate)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2 min-w-0">
                  <p className={`text-xs font-bold tabular-nums truncate ${t.type === 'income' ? 'text-brand' : 'text-text-main'}`} title={t.type === 'income' ? `+${formatMoney(t.amount, t.currency || currency)}` : `-${formatMoney(t.amount, t.currency || currency)}`}>
                    {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount, t.currency || currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 mt-3 border-t border-border/70 relative z-10">
        <button
          onClick={() => onOpenTxModal()}
          className="w-full py-2 bg-surface-2/60 hover:bg-surface-2 active:scale-[0.98] transition-all text-text-main text-xs font-semibold rounded-xl border border-border/70 shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
          title="Szybki zapis transakcji"
        >
          <Plus className="w-3.5 h-3.5 text-brand" strokeWidth={1.75} />
          <span>Szybki zapis</span>
        </button>
      </div>
    </div>
  );
});
