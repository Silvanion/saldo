import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Profile, Transaction } from "../types";
import { formatDate, iconByCategory, getLocalDateIso } from "../utils";
import { ImportTransactionsModal } from "./ImportTransactionsModal";
import { TransactionsTagsAnalysis } from "./TransactionsTagsAnalysis";
import { formatMoney } from "../utils/format";

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


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="transactions-page-layout">
      {/* Table Section */}
      <div className="lg:col-span-2 bg-surface rounded-2xl border border-border shadow-sm  p-6 flex flex-col justify-between relative overflow-hidden" id="transactions-view-container">
        <div className="absolute inset-0  pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10 min-w-0">
            <div className="min-w-0">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider truncate" title="Historia finansowa">Historia finansowa</p>
              <h2 className="text-xl font-bold text-text-main truncate" title="Zarejestrowane transakcje">Zarejestrowane transakcje</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex bg-bg-base/60 p-1 rounded-xl border border-border">
                <button
                  onClick={() => {
                    import('../utils').then(({ generateCsvContent, downloadFile }) => {
                      const csv = generateCsvContent(filteredTransactions);
                      downloadFile(csv, `transakcje_${getLocalDateIso()}.csv`, "text/csv;charset=utf-8;");
                    });
                  }}
                  className="text-text-muted font-semibold py-1.5 px-3 rounded-lg hover:bg-surface-2 hover:text-text-main active:scale-[0.98] transition-all text-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                  title="Eksportuj odfiltrowane dane"
                  id="btn-export-csv"
                >
                  📤 Eksportuj
                </button>
                <div className="w-px bg-surface-2 mx-1 my-1"></div>
                <button
                  onClick={() => setIsCSVModalOpen(true)}
                  className="text-text-muted font-semibold py-1.5 px-3 rounded-lg hover:bg-surface-2 hover:text-text-main active:scale-[0.98] transition-all text-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                  id="btn-import-csv"
                >
                  📥 Importuj CSV
                </button>
              </div>
              <button
                onClick={() => onOpenTxModal()}
                className="bg-brand text-text-inverse font-bold py-2.5 px-5 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-md text-sm flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                id="btn-add-tx-view"
              >
                <span>＋</span> Nowa transakcja
              </button>
            </div>
          </div>
                    {/* Filter and Search controls */}
          <div className="flex flex-col gap-4 border-b border-border pb-5 mb-5">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 w-full min-w-0">
              {/* Search */}
              <div className="relative w-full lg:w-72 shrink-0 min-w-0">
                <input
                  type="search"
                  placeholder="Szukaj transakcji, kategorii, tagów..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-border py-2.5 px-4 pl-10 focus-visible:ring-2 focus-visible:ring-focus-ring text-sm bg-bg-base/40 focus:bg-surface text-text-main placeholder:text-text-faint transition"
                  id="tx-search-input"
                />
                <span className="absolute left-3.5 top-2.5 text-text-muted text-base">🔍</span>
              </div>

              {/* Type & Role Pills */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <div className="flex flex-wrap bg-bg-base/60 p-1 rounded-xl border border-border w-full sm:w-auto">
                  <button
                    onClick={() => setFilterType("all")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                      filterType === "all" ? "bg-surface-2 text-text-main shadow-sm" : "text-text-muted hover:text-text-main"
                    }`}
                  >Wszystkie</button>
                  <button
                    onClick={() => setFilterType("expense")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                      filterType === "expense" ? "bg-danger-subtle text-danger shadow-sm" : "text-text-muted hover:text-text-main"
                    }`}
                  >Wydatki</button>
                  <button
                    onClick={() => setFilterType("income")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                      filterType === "income" ? "bg-brand-subtle text-brand shadow-sm" : "text-text-muted hover:text-text-main"
                    }`}
                  >Przychody</button>
                </div>
                
                {profile.kind === "shared" && (
                  <div className="flex flex-wrap bg-bg-base/60 p-1 rounded-xl border border-border w-full sm:w-auto">
                    <button
                      onClick={() => setPaidByFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                        paidByFilter === "all" ? "bg-surface-2 text-text-main shadow-sm" : "text-text-muted hover:text-text-main"
                      }`}
                    >Wszystkie</button>
                    <button
                      onClick={() => setPaidByFilter("me")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                        paidByFilter === "me" ? "bg-surface-2 text-text-main shadow-sm" : "text-text-muted hover:text-text-main"
                      }`}
                    >Ja</button>
                    <button
                      onClick={() => setPaidByFilter("partner")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                        paidByFilter === "partner" ? "bg-surface-2 text-text-main shadow-sm" : "text-text-muted hover:text-text-main"
                      }`}
                    >Partner</button>
                    <button
                      onClick={() => setPaidByFilter("joint")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                        paidByFilter === "joint" ? "bg-surface-2 text-text-main shadow-sm" : "text-text-muted hover:text-text-main"
                      }`}
                    >Wspólne</button>
                  </div>
                )}
              </div>
            </div>

            {/* Advanced Filters Row */}
            <div className="flex flex-wrap items-center gap-4 bg-bg-base/40 p-3 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-text-muted">Okres:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-[120px] rounded-lg border border-border py-1.5 px-2.5 text-xs focus-visible:ring-2 focus-visible:ring-focus-ring bg-surface text-text-main shadow-sm"
                />
                <span className="text-text-faint text-xs">-</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-[120px] rounded-lg border border-border py-1.5 px-2.5 text-xs focus-visible:ring-2 focus-visible:ring-focus-ring bg-surface text-text-main shadow-sm"
                />
              </div>
              
              <div className="hidden sm:block w-px h-6 bg-surface-2"></div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-text-muted">Kwota ({(profile.currency || "PLN")}):</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={minAmount}
                  onChange={e => setMinAmount(e.target.value)}
                  className="w-[75px] rounded-lg border border-border py-1.5 px-2.5 text-xs focus-visible:ring-2 focus-visible:ring-focus-ring bg-surface text-text-main shadow-sm placeholder:text-text-faint"
                />
                <span className="text-text-faint text-xs">-</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={maxAmount}
                  onChange={e => setMaxAmount(e.target.value)}
                  className="w-[75px] rounded-lg border border-border py-1.5 px-2.5 text-xs focus-visible:ring-2 focus-visible:ring-focus-ring bg-surface text-text-main shadow-sm placeholder:text-text-faint"
                />
              </div>
            </div>
            {allUniqueTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2" id="tags-filter-bar">
                <span className="text-xs font-semibold text-text-muted uppercase mr-1">Filtruj tagiem:</span>
                {allUniqueTags.map((tag) => {
                  const isSelected = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(isSelected ? null : tag)}
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                        isSelected
                          ? "bg-surface-2 text-text-main border-text-main shadow-sm"
                          : "bg-surface text-text-muted border-border hover:bg-surface-2"
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="text-xs text-danger font-bold hover:underline ml-2 active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer rounded"
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
                <tr className="border-b border-border text-xs uppercase font-semibold text-text-muted tracking-wider">
                  <th className="py-3 px-2">Opis / Transakcja</th>
                  <th className="py-3 px-2">Data</th>
                  <th className="py-3 px-2">Kategoria</th>
                  <th className="py-3 px-2">Konto</th>
                  <th className="py-3 px-2 text-right whitespace-nowrap">Kwota</th>
                  <th className="py-3 px-2 text-center w-16 whitespace-nowrap">Akcja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-text-muted bg-bg-base/30 border-y border-border">
                      Brak transakcji spełniających kryteria.
                    </td>
                  </tr>
                ) : (
                  visibleTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-2 transition border-border/30">
                      <td className="py-3 px-2 text-sm max-w-[150px] sm:max-w-[200px] md:max-w-[250px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0" title={tx.category}>
                            {tx.categoryIcon || iconByCategory[tx.category] || "📂"}
                          </span>
                          <span className="font-bold text-text-main truncate" title={tx.name}>{tx.name}</span>
                          {profile.kind === "shared" && tx.paidBy && (
                            <span className="ml-2 text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-bg-base/60 text-text-muted border border-border shrink-0 truncate max-w-[80px]" title={tx.paidBy === 'me' ? 'Ja' : tx.paidBy === 'partner' ? 'Partner' : 'Wspólne'}>
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
                                className={`cursor-pointer text-xs px-1.5 py-0.5 rounded font-medium border active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring ${
                                  selectedTag === tag
                                    ? "bg-surface-2 text-text-main border-text-main shadow-sm"
                                    : "bg-surface text-text-muted border-border hover:bg-surface-2"
                                }`}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-xs text-text-muted whitespace-nowrap">{formatDate(tx.isoDate)}</td>
                      <td className="py-3 px-2 text-xs text-text-muted max-w-[120px]">
                        <span className="bg-bg-base/60 border border-border px-2.5 py-1 rounded-full inline-block max-w-full truncate align-bottom" title={tx.category}>{tx.category}</span>
                      </td>
                      <td className="py-3 px-2 text-xs text-text-muted max-w-[120px] truncate" title={tx.account}>{tx.account}</td>
                      <td className={`py-3 px-2 text-sm font-bold text-right whitespace-nowrap ${tx.type === "income" ? "text-brand" : "text-danger"}`} title={formatMoney(tx.amount, tx.currency || profile?.currency || 'PLN')}>
                        {tx.type === "income" ? "+" : "-"} {formatMoney(tx.amount, tx.currency || profile?.currency || 'PLN')}
                      </td>
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onOpenTxModal(tx)}
                            className="text-text-faint hover:text-text-main text-xs font-semibold px-2 py-1 rounded active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                            title="Edytuj transakcję"
                          >
                            Edytuj
                          </button>
                          <button
                            onClick={() => setTransactionToDelete(tx)}
                            className="text-text-faint hover:text-danger text-xs font-semibold px-2 py-1 rounded active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
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
              <div className="py-10 text-center text-sm text-text-muted bg-bg-base/30 border border-border rounded-xl">
  {profile.transactions.length === 0 && profile.kind === "shared" ? "Dodaj pierwszy wspólny wydatek." : "Brak transakcji spełniających kryteria."}
</div>
            ) : (
              visibleTransactions.map((tx) => (
                <div key={tx.id} className="p-4 bg-bg-base/40 border border-border rounded-xl space-y-2 relative min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0 bg-surface-2 shadow-xs rounded-full w-8 h-8 flex items-center justify-center border border-border">
                        {tx.categoryIcon || iconByCategory[tx.category] || "📂"}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-text-main text-sm flex items-center gap-1.5 min-w-0">
                          <span className="truncate" title={tx.name}>{tx.name}</span>
                          {profile.kind === "shared" && tx.paidBy && (
                            <span className="text-xs font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm bg-bg-base/60 text-text-muted border border-border shrink-0 truncate max-w-[80px]" title={tx.paidBy === 'me' ? 'Ja' : tx.paidBy === 'partner' ? 'Partner' : 'Wspólne'}>
                              {tx.paidBy === 'me' ? 'Ja' : tx.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                              {tx.splitMode === 'equal' ? ' (50-50)' : ''}
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-text-muted truncate" title={formatDate(tx.isoDate)}>{formatDate(tx.isoDate)}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-black whitespace-nowrap shrink-0 ${tx.type === "income" ? "text-brand" : "text-danger"}`} title={formatMoney(tx.amount, tx.currency || profile?.currency || 'PLN')}>
                      {tx.type === "income" ? "+" : "-"} {formatMoney(tx.amount, tx.currency || profile?.currency || 'PLN')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-border text-xs text-text-muted min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                      <span className="bg-bg-base/60 border border-border px-2 py-0.5 rounded-md text-xs text-text-muted font-medium truncate max-w-[120px]" title={tx.category}>
                        {tx.category}
                      </span>
                      <span className="bg-bg-base/60 border border-border px-2 py-0.5 rounded-md text-xs text-text-muted truncate max-w-[120px]" title={tx.account}>
                        {tx.account}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onOpenTxModal(tx)}
                        className="text-text-muted hover:text-text-main text-xs font-semibold px-2.5 py-1 bg-surface rounded-lg hover:bg-surface-2 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                      >
                        Edytuj
                      </button>
                      <button
                        onClick={() => setTransactionToDelete(tx)}
                        className="text-danger hover:text-danger text-xs font-semibold px-2.5 py-1 bg-danger-subtle rounded-lg hover:bg-danger-subtle/80 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
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
                          className={`cursor-pointer text-xs px-1.5 py-0.5 rounded font-medium border active:scale-[0.98] transition-all hover:ring-2 hover:ring-focus-ring/50 focus-visible:ring-2 focus-visible:ring-focus-ring ${
                            selectedTag === tag
                              ? "bg-surface-2 text-text-main border-text-main shadow-sm"
                              : "bg-surface text-text-muted border-border hover:bg-surface-2"
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
            <div className="flex justify-center mt-4 border-t border-border pt-4" id="pagination-panel">
              <button
                onClick={() => setItemsToShow((prev) => prev + 25)}
                className="bg-brand-subtle text-brand hover:bg-brand-subtle/80 font-bold text-xs px-5 py-2.5 rounded-xl active:scale-[0.98] transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                id="btn-load-more"
              >
                Pokaż więcej ({filteredTransactions.length - itemsToShow} pozostało)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tags Reporting Panel */}
      <TransactionsTagsAnalysis currency={profile.currency}
        transactions={profile.transactions}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
      />

      <AnimatePresence>
        {transactionToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setTransactionToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Dialog Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-bg-base/90 rounded-2xl max-w-md w-full p-6 shadow-sm relative z-10 border border-border "
            >
              {/* Warning Header */}
              <div className="flex items-center gap-3.5 mb-4 text-danger">
                <div className="w-10 h-10 rounded-full bg-danger-subtle flex items-center justify-center shrink-0 border border-danger/20">
                  <span className="text-xl font-bold">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-main">Potwierdź usunięcie</h3>
                  <p className="text-xs text-text-muted">Czy na pewno chcesz usunąć tę transakcję?</p>
                </div>
              </div>

              {/* Transaction Details Card */}
              <div className="bg-surface rounded-xl p-4 border border-border text-sm mb-5">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-text-main">{transactionToDelete.name}</span>
                  <span className={`font-bold ${transactionToDelete.type === "income" ? "text-brand" : "text-danger"}`}>
                    {transactionToDelete.type === "income" ? "+" : "-"} {formatMoney(transactionToDelete.amount, transactionToDelete.currency || profile?.currency || 'PLN')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <span className="bg-bg-base/60 px-2 py-0.5 rounded-md flex items-center gap-1 border border-border">
                    <span>{transactionToDelete.categoryIcon || iconByCategory[transactionToDelete.category] || "📂"}</span>
                    <span>{transactionToDelete.category}</span>
                  </span>
                  <span className="text-text-faint">•</span>
                  <span>{formatDate(transactionToDelete.isoDate)}</span>
                  <span className="text-text-faint">•</span>
                  <span>{transactionToDelete.account}</span>
                </div>
              </div>

              <p className="text-xs text-danger font-medium mb-5 bg-danger-subtle px-3 py-2 rounded-lg border border-danger/20 flex items-center gap-2">
                <span>ℹ️</span> Tej operacji nie można cofnąć. Transakcja zostanie trwale skasowana z budżetu.
              </p>

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setTransactionToDelete(null)}
                  className="px-4 py-2.5 text-text-muted bg-surface hover:bg-surface-2 rounded-xl text-xs font-semibold active:scale-[0.98] transition-all shadow-sm cursor-pointer border border-border focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  Anuluj
                </button>
                <button
                  onClick={() => {
                    onDeleteTransaction(transactionToDelete.id);
                    setTransactionToDelete(null);
                  }}
                  className="px-4 py-2.5 bg-danger text-text-inverse rounded-xl text-xs font-semibold active:scale-[0.98] transition-all shadow-md flex items-center gap-1.5 cursor-pointer hover:bg-danger/90 focus-visible:ring-2 focus-visible:ring-focus-ring"
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
