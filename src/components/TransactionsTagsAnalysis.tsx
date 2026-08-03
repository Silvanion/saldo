import React, { useMemo } from "react";
import { Transaction } from "../types";
import {} from "../utils";
import { formatMoney } from "../utils/format";

interface TransactionsTagsAnalysisProps {
  currency: string;
  transactions: Transaction[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

export function TransactionsTagsAnalysis({
  currency,
  transactions,
  selectedTag,
  onSelectTag
}: TransactionsTagsAnalysisProps) {
  const tagExpensesMap = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((tx) => {
      if (tx.type === "expense") {
        const txTags = tx.tags || [];
        txTags.forEach((tag) => {
          const cleanTag = tag.trim().toLowerCase();
          if (cleanTag) {
            map[cleanTag] = (map[cleanTag] || 0) + tx.amount;
          }
        });
      }
    });
    return map;
  }, [transactions]);

  // Calculate unique sum of expense amounts that have at least one tag
  const uniqueTaggedExpensesSum = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === "expense" && tx.tags && tx.tags.length > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  const totalOverallExpenses = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  const tagSummaries = useMemo(() => {
    return Object.entries(tagExpensesMap)
      .map(([name, spent]) => ({ name, spent: Number(spent) }))
      .sort((a, b) => b.spent - a.spent);
  }, [tagExpensesMap]);

  const maxSpentTagVal = useMemo(() => {
    return tagSummaries.length > 0 ? tagSummaries[0].spent : 1;
  }, [tagSummaries]);

  return (
    <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 shadow-2xl backdrop-blur-xl p-6 flex flex-col relative overflow-hidden" id="tags-analysis-card">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
      <div className="mb-4 relative z-10">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Raportowanie i Analiza</p>
        <h3 className="text-lg font-bold text-slate-100">Wydatki według tagów</h3>
      </div>

      {/* Mini dashboard stats cards */}
      <div className="grid grid-cols-2 gap-3 mb-5 relative z-10">
        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
          <p className="text-[10px] text-slate-400 font-semibold">Otagowane wydatki</p>
          <p className="text-base font-bold text-slate-200 mt-1">{formatMoney(uniqueTaggedExpensesSum, currency)}</p>
        </div>
        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
          <p className="text-[10px] text-slate-400 font-semibold">Pokrycie tagami</p>
          <p className="text-base font-bold text-slate-200 mt-1">
            {totalOverallExpenses > 0
              ? `${Math.round((uniqueTaggedExpensesSum / totalOverallExpenses) * 100)}%`
              : "0%"}
          </p>
        </div>
      </div>

      {/* Tag distribution bar chart */}
      <div className="flex-1 overflow-y-auto space-y-3 max-h-[350px] pr-1 relative z-10 custom-scrollbar">
        {tagSummaries.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">
            <span className="text-2xl block mb-2 opacity-50">🏷️</span>
            Brak otagowanych wydatków. Dodaj tagi do transakcji, aby wygenerować raport.
          </div>
        ) : (
          tagSummaries.map((tag) => {
            const isSelected = selectedTag === tag.name;
            const pctOfMax = Math.round((tag.spent / maxSpentTagVal) * 100);
            const pctOfTotal = totalOverallExpenses > 0 ? Math.round((tag.spent / totalOverallExpenses) * 100) : 0;
            
            return (
              <div
                key={tag.name}
                onClick={() => onSelectTag(isSelected ? null : tag.name)}
                className={`group p-3 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? "bg-slate-700/60 border-slate-500 shadow-sm"
                    : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/40"
                }`}
              >
                <div className="flex justify-between items-center text-xs mb-2">
                  <span className="font-bold text-slate-200 flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-violet-400" : "bg-slate-500"}`}></span>
                    #{tag.name}
                  </span>
                  <span className="text-slate-400 font-medium text-[11px]">
                    <strong className="text-slate-300">{formatMoney(tag.spent, currency)}</strong> ({pctOfTotal}%)
                  </span>
                </div>
                <div className="w-full bg-slate-900/60 h-1.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${pctOfMax}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${isSelected ? "bg-violet-500" : "bg-slate-500 group-hover:bg-slate-400"}`}
                  ></div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Informational advice footer */}
      <div className="mt-6 border-t border-slate-700/50 pt-4 text-[11px] text-slate-400 leading-relaxed bg-slate-900/40 p-3 rounded-xl border border-slate-800 relative z-10">
        <span className="font-bold text-slate-300 block mb-1">💡 Wskazówka:</span>
        Kliknij na tag w tabeli lub panelu bocznym, aby natychmiast wyfiltrować wszystkie powiązane z nim wydatki i precyzyjnie przeanalizować ich udział.
      </div>
    </div>
  );
}
