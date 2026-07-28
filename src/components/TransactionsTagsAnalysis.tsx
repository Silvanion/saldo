import React, { useMemo } from "react";
import { Transaction } from "../types";
import { formatPln } from "../utils";

interface TransactionsTagsAnalysisProps {
  transactions: Transaction[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

export function TransactionsTagsAnalysis({
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col" id="tags-analysis-card">
      <div className="mb-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Raportowanie i Analiza</p>
        <h3 className="text-lg font-bold text-slate-900">Wydatki według tagów</h3>
      </div>

      {/* Mini dashboard stats cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <p className="text-[10px] text-slate-500 font-semibold">Otagowane wydatki</p>
          <p className="text-base font-bold text-slate-900 mt-1">{formatPln(uniqueTaggedExpensesSum)}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <p className="text-[10px] text-slate-500 font-semibold">Pokrycie tagami</p>
          <p className="text-base font-bold text-slate-900 mt-1">
            {totalOverallExpenses > 0
              ? `${Math.round((uniqueTaggedExpensesSum / totalOverallExpenses) * 100)}%`
              : "0%"}
          </p>
        </div>
      </div>

      {/* Tag distribution bar chart */}
      <div className="flex-1 overflow-y-auto space-y-4 max-h-[350px] pr-1">
        {tagSummaries.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">
            <span className="text-2xl block mb-2">🏷️</span>
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
                className={`group p-2.5 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? "bg-slate-100 border-slate-200"
                    : "bg-white border-transparent hover:bg-slate-50"
                }`}
              >
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    #{tag.name}
                  </span>
                  <span className="text-slate-500 font-medium text-[11px]">
                    <strong>{formatPln(tag.spent)}</strong> ({pctOfTotal}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${pctOfMax}%` }}
                    className="bg-slate-400 h-full rounded-full transition-all duration-500 group-hover:bg-slate-500"
                  ></div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Informational advice footer */}
      <div className="mt-6 border-t border-slate-100 pt-4 text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
        <span className="font-bold text-slate-700 block mb-1">💡 Wskazówka:</span>
        Kliknij na tag w tabeli lub panelu bocznym, aby natychmiast wyfiltrować wszystkie powiązane z nim wydatki i precyzyjnie przeanalizować ich udział.
      </div>
    </div>
  );
}
