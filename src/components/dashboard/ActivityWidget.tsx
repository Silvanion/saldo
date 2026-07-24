import React, { memo } from "react";
import { formatPln, formatDatePl, iconByCategory } from "../../utils";
import { Transaction } from "../../types";

interface ActivityWidgetProps {
  profileKind?: "personal" | "shared";
  recentTransactions: Transaction[];
  onChangeView: (view: string) => void;
  onOpenTxModal: () => void;
}

export const ActivityWidget = memo(function ActivityWidget({
  recentTransactions,
  onChangeView,
  onOpenTxModal,
  profileKind
}: ActivityWidgetProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-full" id="widget-content-activity-box">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ostatnie transakcje</p>
          <h3 className="text-base font-bold text-gray-800">Aktywność</h3>
        </div>
        <button
          onClick={() => onChangeView("transactions")}
          className="text-[11px] font-bold text-[#137566] bg-[#137566]/10 px-2 py-1 rounded-lg hover:bg-[#137566]/20 transition"
        >
          Księga
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {recentTransactions.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-xs text-gray-500 font-medium">
              {profileKind === "shared" ? "Dodaj pierwszy wspólny wydatek" : "Brak niedawnych transakcji."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                    t.type === 'income' ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <span className="text-sm">
                      {iconByCategory[t.category] || "📄"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate flex items-center gap-1.5">
                      {t.name || t.category}
                      {/* Note: we don't have access to profile.kind here easily, but we can check if t.paidBy exists since it's only set on shared profiles */}
                      {t.paidBy && (
                        <span className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                          {t.paidBy === 'me' ? 'Ja' : t.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                          {t.splitMode === 'equal' ? ' (50-50)' : ''}
                        </span>
                      )}
                    </p>
                    <p className="text-[9px] text-gray-400">{formatDatePl(t.isoDate)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <p className={`text-xs font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-gray-800'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatPln(t.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 mt-3 border-t border-gray-100">
        <button
          onClick={onOpenTxModal}
          className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-xl transition border border-gray-100"
        >
          + Szybki zapis
        </button>
      </div>
    </div>
  );
});
