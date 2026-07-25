import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Profile, Transaction } from "../types";
import { formatPln, formatDatePl, iconByCategory, getLocalDateIso } from "../utils";
import { ImportTransactionsModal } from "./ImportTransactionsModal";

interface TransactionsViewProps {
  profile: Profile;
  onOpenTxModal: (tx?: Transaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onImportTransactions: (newTransactions: Transaction[]) => void;
  onBeforeImport?: () => void;
}

export function TransactionsView({ profile, onOpenTxModal, onDeleteTransaction, onImportTransactions, onBeforeImport }: TransactionsViewProps) {
  const [filterType, setFilterType] = useState<"all" | "expense" | "income">("all");
  const [paidByFilter, setPaidByFilter] = useState<"all" | "me" | "partner" | "joint">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [itemsToShow, setItemsToShow] = useState(25);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  // Debounce search term to prevent keyboard delay
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset pagination limit when any filter conditions change
  useEffect(() => {
    setItemsToShow(25);
  }, [filterType, paidByFilter, debouncedSearchTerm, selectedTag, dateFrom, dateTo, minAmount, maxAmount]);

  // Compute all unique tags from expense transactions
  const allUniqueTags = useMemo(() => {
    return Array.from(
      new Set(
        profile.transactions
          .flatMap((tx) => tx.tags || [])
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean)
      )
    ).sort();
  }, [profile.transactions]);

  const filteredTransactions = useMemo(() => {
    return [...profile.transactions]
      .filter((tx) => {
        if (filterType === "expense" && tx.type !== "expense") return false;
        if (filterType === "income" && tx.type !== "income") return false;

        if (profile.kind === "shared" && paidByFilter !== "all") {
          if (tx.paidBy !== paidByFilter) return false;
        }
        
        if (selectedTag) {
          const txTags = (tx.tags || []).map((t) => t.toLowerCase());
          if (!txTags.includes(selectedTag.toLowerCase())) return false;
        }
        
        if (dateFrom && tx.isoDate < dateFrom) return false;
        if (dateTo && tx.isoDate > dateTo) return false;
        
        if (minAmount) {
          const min = parseFloat(minAmount);
          if (!isNaN(min) && tx.amount < min) return false;
        }
        if (maxAmount) {
          const max = parseFloat(maxAmount);
          if (!isNaN(max) && tx.amount > max) return false;
        }

        if (debouncedSearchTerm) {
          const sTerm = debouncedSearchTerm.toLowerCase();
          const searchStr = `${tx.name} ${tx.category} ${tx.account} ${tx.tags ? tx.tags.join(" ") : ""}`.toLowerCase();
          return searchStr.includes(sTerm);
        }
        
        return true;
      })
      .sort((a, b) => b.isoDate.localeCompare(a.isoDate));
  }, [profile.transactions, filterType, paidByFilter, selectedTag, debouncedSearchTerm, dateFrom, dateTo, minAmount, maxAmount]);

  // Paginated chunk of transactions
  const visibleTransactions = useMemo(() => {
    return filteredTransactions.slice(0, itemsToShow);
  }, [filteredTransactions, itemsToShow]);

  // Compute stats per tag using memoization
  const tagExpensesMap = useMemo(() => {
    const map: Record<string, number> = {};
    profile.transactions.forEach((tx) => {
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
  }, [profile.transactions]);

  // Calculate unique sum of expense amounts that have at least one tag
  const uniqueTaggedExpensesSum = useMemo(() => {
    return profile.transactions
      .filter((tx) => tx.type === "expense" && tx.tags && tx.tags.length > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [profile.transactions]);

  const totalOverallExpenses = useMemo(() => {
    return profile.transactions
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [profile.transactions]);

  const tagSummaries = useMemo(() => {
    return Object.entries(tagExpensesMap)
      .map(([name, spent]) => ({ name, spent: Number(spent) }))
      .sort((a, b) => b.spent - a.spent);
  }, [tagExpensesMap]);

  const maxSpentTagVal = useMemo(() => {
    return tagSummaries.length > 0 ? tagSummaries[0].spent : 1;
  }, [tagSummaries]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="transactions-page-layout">
      {/* Table Section */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between" id="transactions-view-container">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historia finansowa</p>
              <h2 className="text-xl font-bold text-slate-900">Zarejestrowane transakcje</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  import('../utils').then(({ generateCsvContent, downloadFile }) => {
                    const csv = generateCsvContent(filteredTransactions);
                    downloadFile(csv, `transakcje_${getLocalDateIso()}.csv`, "text/csv;charset=utf-8;");
                  });
                }}
                className="bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-xl hover:bg-slate-200 transition text-sm flex items-center gap-1.5 shadow-sm border border-slate-200"
                title="Eksportuj odfiltrowane dane"
                id="btn-export-csv"
              >
                📤 Eksportuj
              </button>
              <button
                onClick={() => setIsCSVModalOpen(true)}
                className="bg-[#e7f3f0] text-[#137566] font-bold py-2 px-4 rounded-xl hover:bg-[#d8ebe6] transition text-sm flex items-center gap-1.5 border border-[#137566]/20 shadow-sm"
                id="btn-import-csv"
              >
                📥 Importuj CSV
              </button>
              <button
                onClick={onOpenTxModal}
                className="bg-[#137566] text-white font-bold py-2 px-5 rounded-xl hover:bg-[#0f5d51] transition shadow-md text-sm"
                id="btn-add-tx-view"
              >
                ＋ Nowa transakcja
              </button>
            </div>
          </div>

          {/* Filter and Search controls */}
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 mb-5">
            <div className="flex flex-col xl:flex-row items-center justify-between gap-4 w-full">
              <div className="flex bg-slate-100 p-1 rounded-xl w-full xl:w-auto overflow-x-auto whitespace-nowrap hide-scrollbar">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterType === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                  id="filter-all"
                >
                  Wszystkie
                </button>
                <button
                  onClick={() => setFilterType("expense")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterType === "expense" ? "bg-white text-[#d55e50] shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                  id="filter-expenses"
                >
                  Wydatki
                </button>
                <button
                  onClick={() => setFilterType("income")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterType === "income" ? "bg-white text-[#137566] shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                  id="filter-incomes"
                >
                  Przychody
                </button>
              </div>
              
              {profile.kind === "shared" && (
                <div className="flex bg-slate-100 p-1 rounded-xl w-full xl:w-auto max-w-full overflow-x-auto whitespace-nowrap hide-scrollbar">
                  <button
                    onClick={() => setPaidByFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                      paidByFilter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >Wszystkie</button>
                  <button
                    onClick={() => setPaidByFilter("me")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                      paidByFilter === "me" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Ja
                  </button>
                  <button
                    onClick={() => setPaidByFilter("partner")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                      paidByFilter === "partner" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Partner
                  </button>
                  <button
                    onClick={() => setPaidByFilter("joint")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                      paidByFilter === "joint" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >Wspólne/50-50</button>
                </div>
              )}

              {/* Advanced Filter row */}
              <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Od:</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="w-[125px] rounded-xl border border-slate-200 py-1 px-2 text-xs outline-none focus:border-[#137566]"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Do:</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-[125px] rounded-xl border border-slate-200 py-1 px-2 text-xs outline-none focus:border-[#137566]"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Min:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={minAmount}
                    onChange={e => setMinAmount(e.target.value)}
                    className="w-[70px] rounded-xl border border-slate-200 py-1 px-2 text-xs outline-none focus:border-[#137566]"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Max:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="∞"
                    value={maxAmount}
                    onChange={e => setMaxAmount(e.target.value)}
                    className="w-[70px] rounded-xl border border-slate-200 py-1 px-2 text-xs outline-none focus:border-[#137566]"
                  />
                </div>

                <div className="relative w-full sm:w-56 mt-2 sm:mt-0 flex-grow sm:flex-grow-0">
                  <input
                    type="search"
                    placeholder="Szukaj..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 pl-9 outline-none focus:border-[#137566] text-sm"
                    id="tx-search-input"
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
                </div>
              </div>
            </div>

            {/* Unique tags list for easy quick filtering */}
            {allUniqueTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2" id="tags-filter-bar">
                <span className="text-[11px] font-semibold text-slate-400 uppercase mr-1">Filtruj tagiem:</span>
                {allUniqueTags.map((tag) => {
                  const isSelected = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(isSelected ? null : tag)}
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border transition ${
                        isSelected
                          ? "bg-slate-700 text-white border-slate-700 shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="text-xs text-rose-600 font-bold hover:underline ml-2"
                  >
                    Wyczyść filtr tagu &times;
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Ledger Table (desktop) & Cards (mobile) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse" id="tx-table">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  <th className="py-3 px-2">Opis / Transakcja</th>
                  <th className="py-3 px-2">Data</th>
                  <th className="py-3 px-2">Kategoria</th>
                  <th className="py-3 px-2">Konto</th>
                  <th className="py-3 px-2 text-right">Kwota</th>
                  <th className="py-3 px-2 text-center w-16">Akcja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visibleTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                      Brak transakcji spełniających kryteria.
                    </td>
                  </tr>
                ) : (
                  visibleTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-base shrink-0" title={tx.category}>
                            {tx.categoryIcon || iconByCategory[tx.category] || "📂"}
                          </span>
                          <span className="font-bold text-slate-900">{tx.name}</span>
                          {profile.kind === "shared" && tx.paidBy && (
                            <span className="ml-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 border border-slate-200">
                              {tx.paidBy === 'me' ? 'Ja' : tx.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                              {tx.splitMode === 'equal' ? ' (50-50)' : ''}
                            </span>
                          )}
                        </div>
                        {/* Transaction tags display inside row */}
                        {tx.tags && tx.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tx.tags.map((tag) => (
                              <span
                                key={tag}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTag(selectedTag === tag ? null : tag);
                                }}
                                className={`cursor-pointer text-[10px] px-1.5 py-0.5 rounded font-medium border transition ${
                                  selectedTag === tag
                                    ? "bg-slate-700 text-white border-slate-700"
                                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                }`}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-xs text-slate-500 whitespace-nowrap">{formatDatePl(tx.isoDate)}</td>
                      <td className="py-3 px-2 text-xs text-slate-600">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-full">{tx.category}</span>
                      </td>
                      <td className="py-3 px-2 text-xs text-slate-500">{tx.account}</td>
                      <td className={`py-3 px-2 text-sm font-bold text-right whitespace-nowrap ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                        {tx.type === "income" ? "+" : "-"} {formatPln(tx.amount)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onOpenTxModal(tx)}
                            className="text-slate-400 hover:text-slate-700 text-xs font-semibold px-2 py-1 rounded transition"
                            title="Edytuj transakcję"
                          >
                            Edytuj
                          </button>
                          <button
                            onClick={() => setTransactionToDelete(tx)}
                            className="text-slate-400 hover:text-rose-600 text-xs font-semibold px-2 py-1 rounded transition"
                            title="Usuń transakcję"
                            id={`btn-delete-tx-${tx.id}`}
                          >
                            Usuń
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (visible on mobile only) */}
          <div className="block md:hidden space-y-3" id="tx-mobile-list">
            {visibleTransactions.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400 bg-slate-50 rounded-lg">
  {profile.transactions.length === 0 && profile.kind === "shared" ? "Dodaj pierwszy wspólny wydatek." : "Brak transakcji spełniających kryteria."}
</div>
            ) : (
              visibleTransactions.map((tx) => (
                <div key={tx.id} className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2 relative">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg shrink-0 bg-white shadow-xs rounded-full w-8 h-8 flex items-center justify-center">
                        {tx.categoryIcon || iconByCategory[tx.category] || "📂"}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          {tx.name}
                          {profile.kind === "shared" && tx.paidBy && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm bg-slate-100 text-slate-600 border border-slate-200">
                              {tx.paidBy === 'me' ? 'Ja' : tx.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                              {tx.splitMode === 'equal' ? ' (50-50)' : ''}
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400">{formatDatePl(tx.isoDate)}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-black whitespace-nowrap ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                      {tx.type === "income" ? "+" : "-"} {formatPln(tx.amount)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100/60 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-white border border-slate-150 px-2 py-0.5 rounded-md text-[10px] text-slate-600 font-medium">
                        {tx.category}
                      </span>
                      <span className="bg-white border border-slate-150 px-2 py-0.5 rounded-md text-[10px] text-slate-500">
                        {tx.account}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenTxModal(tx)}
                        className="text-slate-600 hover:text-slate-700 text-[11px] font-semibold px-2.5 py-1 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                      >
                        Edytuj
                      </button>
                      <button
                        onClick={() => setTransactionToDelete(tx)}
                        className="text-rose-600 hover:text-rose-700 text-[11px] font-semibold px-2.5 py-1 bg-rose-50 rounded-lg hover:bg-rose-100 transition"
                        id={`btn-delete-tx-mob-${tx.id}`}
                      >
                        Usuń
                      </button>
                    </div>
                  </div>

                  {tx.tags && tx.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {tx.tags.map((tag) => (
                        <span
                          key={tag}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTag(selectedTag === tag ? null : tag);
                          }}
                          className={`cursor-pointer text-[10px] px-1.5 py-0.5 rounded font-medium border transition ${
                            selectedTag === tag
                              ? "bg-slate-700 text-white border-slate-700"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination / Show More button */}
          {filteredTransactions.length > itemsToShow && (
            <div className="flex justify-center mt-4 border-t border-slate-50 pt-4" id="pagination-panel">
              <button
                onClick={() => setItemsToShow((prev) => prev + 25)}
                className="bg-[#e7f3f0] text-[#137566] hover:bg-[#d8ebe6] font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm"
                id="btn-load-more"
              >
                Pokaż więcej ({filteredTransactions.length - itemsToShow} pozostało)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tags Reporting Panel */}
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
                  onClick={() => setSelectedTag(isSelected ? null : tag.name)}
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

      <AnimatePresence>
        {transactionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTransactionToDelete(null)}
              className="absolute inset-0 bg-black/55 backdrop-blur-xs"
            />

            {/* Dialog Modal Box */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative z-10 border border-slate-100"
            >
              {/* Warning Header */}
              <div className="flex items-center gap-3.5 mb-4 text-rose-600">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100">
                  <span className="text-xl font-bold">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Potwierdź usunięcie</h3>
                  <p className="text-xs text-slate-500">Czy na pewno chcesz usunąć tę transakcję?</p>
                </div>
              </div>

              {/* Transaction Details Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm mb-5">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-900">{transactionToDelete.name}</span>
                  <span className={`font-bold ${transactionToDelete.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                    {transactionToDelete.type === "income" ? "+" : "-"} {formatPln(transactionToDelete.amount)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="bg-slate-200/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span>{transactionToDelete.categoryIcon || iconByCategory[transactionToDelete.category] || "📂"}</span>
                    <span>{transactionToDelete.category}</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span>{formatDatePl(transactionToDelete.isoDate)}</span>
                  <span className="text-slate-300">•</span>
                  <span>{transactionToDelete.account}</span>
                </div>
              </div>

              <p className="text-xs text-rose-500 font-medium mb-5 bg-rose-50 px-3 py-2 rounded-lg border border-rose-100 flex items-center gap-2">
                <span>ℹ️</span> Tej operacji nie można cofnąć. Transakcja zostanie trwale skasowana z budżetu.
              </p>

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setTransactionToDelete(null)}
                  className="px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold transition shadow-sm cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  onClick={() => {
                    onDeleteTransaction(transactionToDelete.id);
                    setTransactionToDelete(null);
                  }}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Usuń transakcję</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ImportTransactionsModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onImport={onImportTransactions}
        onBeforeImport={onBeforeImport}
      />
    </div>
  );
}
