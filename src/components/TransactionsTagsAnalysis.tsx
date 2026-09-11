import React, { useMemo } from "react";
import { Transaction } from "../types";
import { formatMoney } from "../utils/format";
import { Tag, PieChart, Info } from "lucide-react";

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
    <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 flex flex-col justify-between relative overflow-hidden" id="tags-analysis-card">
      <div className="relative z-10">
        {/* Header */}
        <div className="mb-4">
          <p className="text-xs font-bold text-text-faint uppercase tracking-wider">Raportowanie i Etykiety</p>
          <div className="flex items-center gap-2 mt-0.5">
            <h3 className="text-base font-bold text-text-main">Wydatki według tagów</h3>
            <span className="text-[10px] font-bold text-brand bg-brand-subtle border border-brand/20 px-2 py-0.5 rounded-full">
              {tagSummaries.length} tagów
            </span>
          </div>
        </div>

        {/* Mini stats cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-surface-2 p-3 rounded-xl border border-border">
            <p className="text-[11px] text-text-faint font-medium">Otagowane wydatki</p>
            <p className="text-sm font-black text-text-main mt-0.5">{formatMoney(uniqueTaggedExpensesSum, currency)}</p>
          </div>
          <div className="bg-surface-2 p-3 rounded-xl border border-border">
            <p className="text-[11px] text-text-faint font-medium">Pokrycie tagami</p>
            <p className="text-sm font-black text-brand mt-0.5">
              {totalOverallExpenses > 0
                ? `${Math.round((uniqueTaggedExpensesSum / totalOverallExpenses) * 100)}%`
                : "0%"}
            </p>
          </div>
        </div>

        {/* Tag distribution bar list */}
        <div className="space-y-2 overflow-y-auto max-h-[380px] pr-1 custom-scrollbar">
          {tagSummaries.length === 0 ? (
            <div className="text-center py-10 text-xs text-text-muted bg-surface-2/50 rounded-xl border border-dashed border-border/70 flex flex-col items-center justify-center">
              <Tag className="w-6 h-6 text-text-muted/60 mb-1.5" strokeWidth={1.75} />
              <p className="font-semibold text-text-main">Brak otagowanych wydatków</p>
              <p className="text-text-faint mt-0.5">Dodaj tagi podczas wprowadzania transakcji.</p>
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
                  className={`group p-3 rounded-xl border transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
                    isSelected
                      ? "bg-brand-subtle border-brand/30 shadow-xs"
                      : "bg-surface border-border hover:bg-surface-offset"
                  }`}
                >
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-text-main flex items-center gap-1.5 truncate">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-brand" : "bg-text-faint"}`}></span>
                      <span className="truncate">#{tag.name}</span>
                    </span>
                    <span className="text-xs text-text-muted font-bold shrink-0 ml-2">
                      {formatMoney(tag.spent, currency)} <span className="text-[10px] text-text-faint font-normal">({pctOfTotal}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-surface-2 h-1.5 rounded-full overflow-hidden border border-border/50">
                    <div
                      style={{ width: `${pctOfMax}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${isSelected ? "bg-brand" : "bg-text-muted group-hover:bg-brand"}`}
                    ></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Informational tip footer */}
      <div className="mt-4 pt-3 border-t border-border flex items-start gap-2.5 text-xs text-text-muted bg-surface-2/70 p-3 rounded-xl border border-border relative z-10">
        <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Kliknij na tag w tabeli lub panelu bocznym, aby natychmiast wyfiltrować wszystkie powiązane z nim transakcje.
        </p>
      </div>
    </div>
  );
}
