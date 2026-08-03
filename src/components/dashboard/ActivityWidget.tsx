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
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5 ">Ostatnie transakcje</p>
          <h3 className="text-base font-bold text-text-main">Aktywność</h3>
        </div>
        <button
          onClick={() => onChangeView("transactions")}
          className="text-[10px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1.5 rounded-lg hover:bg-purple-500/20 transition  "
        >
          Księga
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center relative z-10">
        {recentTransactions.length === 0 ? (
          <div className="text-center py-6 bg-bg-base/30 rounded-xl border border-dashed border-slate-600/50 h-full flex flex-col justify-center">
            <div className="text-2xl mb-1 opacity-50 ">🧾</div>
            <p className="text-xs text-text-muted font-medium">
              {profileKind === "shared" ? "Dodaj pierwszy wspólny wydatek" : "Brak niedawnych transakcji."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface hover:bg-surface-2 transition shadow-inner group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                    t.type === 'income' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-surface border-slate-600 text-text-muted'
                  } group-hover: transition-shadow`}>
                    <span className="text-sm ">
                      {iconByCategory[t.category] || "📄"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-main truncate flex items-center gap-1.5 group-hover:text-purple-300 transition-colors">
                      {t.name || t.category}
                      {t.paidBy && (
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm bg-surface text-text-muted border border-slate-600/60 whitespace-nowrap">
                          {t.paidBy === 'me' ? 'Ja' : t.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                          {t.splitMode === 'equal' ? ' (50-50)' : ''}
                        </span>
                      )}
                    </p>
                    <p className="text-[9px] text-text-muted mt-0.5">{formatDate(t.isoDate)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <p className={`text-xs font-black ${t.type === 'income' ? 'text-emerald-400 drop-' : 'text-text-main'}`}>
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
          className="w-full py-2.5 bg-surface hover:bg-surface-2 text-text-muted text-xs font-bold rounded-xl transition-colors border border-slate-600/50 shadow-inner flex items-center justify-center hover: hover:border-slate-500/50"
        >
          + Szybki zapis
        </button>
      </div>
    </div>
  );
});
