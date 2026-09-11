import React, { useState, useEffect, useMemo, useRef, Suspense, lazy, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Profile, Transaction, DebtItem } from "../types";
import { formatDate, iconByCategory, getLocalDateIso } from "../utils";

import { ErrorBoundary } from "./ErrorBoundary";
import { ModalFallback } from "./ModalFallback";

const ImportTransactionsModal = lazy(() => import("./ImportTransactionsModal").then(m => ({ default: m.ImportTransactionsModal })));
import { SmartRulesPreviewModal } from "./modals/SmartRulesPreviewModal";
import { convertLegacyRulesToSmartRules } from "../services/smartRules";
import { TransactionsTagsAnalysis } from "./TransactionsTagsAnalysis";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { formatMoney } from "../utils/format";
import { DelayedTooltip } from "./dashboard/DelayedTooltip";
import {
  Plus,
  Download,
  UploadCloud,
  Search,
  X,
  Calendar,
  Tag,
  Pencil,
  Trash2,
  Filter,
  RotateCcw,
  Sparkles,
  Settings,
  Link2,
  ReceiptText
} from "lucide-react";

interface TransactionsViewProps {
  profile: Profile;
  onOpenTxModal: (tx?: Transaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onImportTransactions: (newTransactions: Transaction[]) => void;
  onBeforeImport?: () => void;
  onApplySmartRulesBulk?: (selectedTxIds?: string[]) => { appliedCount: number };
  onShowToast?: (msg: string, type?: "success" | "error" | "info") => void;
  onOpenSmartRulesManager?: () => void;
  onNavigateToDebts?: (debtId?: string) => void;
}

export const TransactionsView = memo(function TransactionsView({
  profile,
  onOpenTxModal,
  onDeleteTransaction,
  onImportTransactions,
  onBeforeImport,
  onApplySmartRulesBulk,
  onShowToast,
  onOpenSmartRulesManager,
  onNavigateToDebts
}: TransactionsViewProps) {
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
  const [isSmartRulesModalOpen, setIsSmartRulesModalOpen] = useState(false);
  const [itemsToShow, setItemsToShow] = useState(25);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  useScrollLock(!!transactionToDelete);
  useFocusTrap(deleteModalRef, !!transactionToDelete, () => setTransactionToDelete(null));

  // SPRINT 35: Lookup map for debt metadata resolution
  const debtsMap = useMemo(() => {
    const map = new Map<string, DebtItem>();
    if (profile?.debts) {
      for (const d of profile.debts) {
        map.set(d.id, d);
      }
    }
    return map;
  }, [profile?.debts]);

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

  const smartRules = useMemo(() => {
    if (profile.smartRules && profile.smartRules.length > 0) {
      return profile.smartRules;
    }
    return convertLegacyRulesToSmartRules(profile.transactionRules || []);
  }, [profile.smartRules, profile.transactionRules]);

  const isAnyAdvancedFilterActive = Boolean(dateFrom || dateTo || minAmount || maxAmount || selectedTag);

  const resetAllFilters = () => {
    setFilterType("all");
    setPaidByFilter("all");
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setSelectedTag(null);
    setDateFrom("");
    setDateTo("");
    setMinAmount("");
    setMaxAmount("");
  };

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="transactions-page-layout">
      {/* Table Section */}
      <div className="lg:col-span-2 bg-surface rounded-xl border border-border/70 shadow-xs p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden" id="transactions-view-container">
        <div className="relative z-10">
          
          {/* Header & Primary Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 relative z-10 min-w-0">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-text-faint uppercase tracking-wider truncate" title="Historia finansowa">Historia finansowa</p>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-text-main truncate" title="Zarejestrowane transakcje">Księga transakcji</h2>
                <span className="text-xs font-semibold text-text-muted bg-surface-2/70 border border-border/70 px-2 py-0.5 rounded-full tabular-nums">
                  {filteredTransactions.length}
                </span>
              </div>
            </div>

            {/* Actions: Secondary (Export, Import) & Primary (Add Transaction) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto mt-3 sm:mt-0">
              <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    import('../utils').then(({ generateCsvContent, downloadFile }) => {
                      const csv = generateCsvContent(filteredTransactions);
                      downloadFile(csv, `transakcje_${getLocalDateIso()}.csv`, "text/csv;charset=utf-8;");
                    });
                  }}
                  className="w-full sm:w-auto justify-center text-text-muted hover:text-text-main font-semibold py-1.5 px-3 rounded-xl border border-border/70 bg-surface-2/60 hover:bg-surface-2 active:scale-[0.98] transition-all text-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shadow-2xs"
                  title="Eksportuj odfiltrowane dane do pliku CSV"
                  id="btn-export-csv"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Eksportuj</span>
                </button>

                <button
                  onClick={() => setIsCSVModalOpen(true)}
                  className="w-full sm:w-auto justify-center text-text-muted hover:text-text-main font-semibold py-1.5 px-3 rounded-xl border border-border/70 bg-surface-2/60 hover:bg-surface-2 active:scale-[0.98] transition-all text-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shadow-2xs"
                  title="Importuj wyciąg bankowy CSV"
                  id="btn-import-csv"
                >
                  <UploadCloud className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Importuj</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
                {smartRules.length > 0 && onApplySmartRulesBulk && (
                  <button
                    onClick={() => setIsSmartRulesModalOpen(true)}
                    className="w-full sm:w-auto justify-center text-brand hover:text-brand-hover font-semibold py-1.5 px-3 rounded-xl border border-brand/20 bg-brand-subtle hover:bg-brand-subtle/80 active:scale-[0.98] transition-all text-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shadow-2xs"
                    title="Sprawdź i zastosuj inteligentne reguły kategoryzacji"
                    id="btn-smart-rules-preview"
                  >
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Reguły ({smartRules.length})</span>
                  </button>
                )}
                
                {onOpenSmartRulesManager && (
                  <button
                    onClick={() => onOpenSmartRulesManager()}
                    className="w-full sm:w-auto justify-center text-text-muted hover:text-text-main font-semibold py-1.5 px-3 rounded-xl border border-border/70 bg-surface-2/60 hover:bg-surface-2 active:scale-[0.98] transition-all text-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shadow-2xs"
                    title="Zarządzaj regułami automatycznymi"
                    id="btn-smart-rules-manager"
                  >
                    <Settings className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Ustawienia</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => onOpenTxModal()}
                className="w-full sm:w-auto justify-center bg-brand text-text-inverse font-semibold py-1.5 px-3.5 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-xs text-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                id="btn-add-tx-view"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Nowa transakcja</span>
              </button>
            </div>
          </div>

          {/* Filter and Search controls */}
          <div className="flex flex-col gap-3 border-b border-border/70 pb-4 mb-4">
            {/* Top Row: Search + Segmented Controls */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 w-full min-w-0">
              
              {/* Search Bar */}
              <div className="relative flex-1 min-w-0">
                <input
                  type="search"
                  placeholder="Szukaj po nazwie, kategorii, koncie lub tagu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-border/70 py-2 px-4 pl-9 pr-8 focus-visible:ring-2 focus-visible:ring-focus-ring text-xs bg-surface-2/60 focus:bg-surface text-text-main placeholder:text-text-faint transition shadow-2xs"
                  id="tx-search-input"
                  aria-label="Wyszukaj transakcje po nazwie, kategorii, koncie lub tagu"
                />
                <Search className="w-4 h-4 text-text-faint absolute left-3 top-2.5 pointer-events-none" strokeWidth={1.75} />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-2.5 text-text-faint hover:text-text-main p-0.5 rounded cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                    title="Wyczyść szukanie"
                    aria-label="Wyczyść wyszukiwanie"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                )}
              </div>

              {/* Segmented Control: Type Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-surface-2/60 p-1 rounded-xl border border-border/70 shadow-inner">
                  <button
                    onClick={() => setFilterType("all")}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shrink-0 ${
                      filterType === "all" ? "bg-surface text-text-main shadow-xs border border-border/70" : "text-text-muted hover:text-text-main hover:bg-surface-offset"
                    }`}
                  >
                    Wszystkie
                  </button>
                  <button
                    onClick={() => setFilterType("expense")}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shrink-0 ${
                      filterType === "expense" ? "bg-danger-subtle text-danger shadow-xs border border-danger/20" : "text-text-muted hover:text-danger hover:bg-danger-subtle"
                    }`}
                  >
                    Wydatki
                  </button>
                  <button
                    onClick={() => setFilterType("income")}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shrink-0 ${
                      filterType === "income" ? "bg-brand-subtle text-brand shadow-xs border border-brand/20" : "text-text-muted hover:text-brand hover:bg-brand-subtle"
                    }`}
                  >
                    Przychody
                  </button>
                </div>
                
                {/* Segmented Control: Role (Shared Profiles Only) */}
                {profile.kind === "shared" && (
                  <div className="flex bg-surface-2/60 p-1 rounded-xl border border-border/70 shadow-inner">
                    <button
                      onClick={() => setPaidByFilter("all")}
                      className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shrink-0 ${
                        paidByFilter === "all" ? "bg-surface text-text-main shadow-xs border border-border/70" : "text-text-muted hover:text-text-main hover:bg-surface-offset"
                      }`}
                    >
                      Wszyscy
                    </button>
                    <button
                      onClick={() => setPaidByFilter("me")}
                      className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shrink-0 ${
                        paidByFilter === "me" ? "bg-brand-subtle text-brand shadow-xs border border-brand/20" : "text-text-muted hover:text-text-main hover:bg-surface-offset"
                      }`}
                    >
                      Ja
                    </button>
                    <button
                      onClick={() => setPaidByFilter("partner")}
                      className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shrink-0 ${
                        paidByFilter === "partner" ? "bg-brand-subtle text-brand shadow-xs border border-brand/20" : "text-text-muted hover:text-text-main hover:bg-surface-offset"
                      }`}
                    >
                      Partner
                    </button>
                    <button
                      onClick={() => setPaidByFilter("joint")}
                      className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shrink-0 ${
                        paidByFilter === "joint" ? "bg-brand-subtle text-brand shadow-xs border border-brand/20" : "text-text-muted hover:text-text-main hover:bg-surface-offset"
                      }`}
                    >
                      Wspólne
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Advanced Filters Row: Date Range & Amount Range */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-2/40 p-3 rounded-xl border border-border/70">
              <div className="flex flex-wrap items-center gap-3">
                {/* Date range */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] uppercase font-bold text-text-faint flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Okres:
                  </span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-[125px] rounded-lg border border-border py-1 px-2 text-xs bg-surface text-text-main shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring"
                    aria-label="Data początkowa zakresu"
                  />
                  <span className="text-text-faint text-xs">-</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-[125px] rounded-lg border border-border py-1 px-2 text-xs bg-surface text-text-main shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring"
                    aria-label="Data końcowa zakresu"
                  />
                </div>
                
                <div className="hidden sm:block w-px h-5 bg-border"></div>
                
                {/* Amount range */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] uppercase font-bold text-text-faint flex items-center gap-1">
                    Kwota ({profile.currency || "PLN"}):
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="w-[75px] rounded-lg border border-border py-1 px-2 text-xs bg-surface text-text-main shadow-xs placeholder:text-text-faint focus-visible:ring-2 focus-visible:ring-focus-ring"
                    aria-label="Kwota minimalna"
                  />
                  <span className="text-text-faint text-xs">-</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="w-[75px] rounded-lg border border-border py-1 px-2 text-xs bg-surface text-text-main shadow-xs placeholder:text-text-faint focus-visible:ring-2 focus-visible:ring-focus-ring"
                    aria-label="Kwota maksymalna"
                  />
                </div>
              </div>

              {/* Reset all button */}
              {isAnyAdvancedFilterActive && (
                <button
                  onClick={resetAllFilters}
                  className="text-xs font-bold text-danger bg-danger-subtle border border-danger/20 px-2.5 py-1 rounded-lg hover:bg-danger-subtle/80 active:scale-[0.98] transition-all flex items-center gap-1 cursor-pointer"
                  title="Wyczyść wszystkie nałożone filtry"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Wyczyść filtry</span>
                </button>
              )}
            </div>

            {/* Tag Pills Ribbon */}
            {allUniqueTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1" id="tags-filter-bar">
                <span className="text-[11px] font-bold text-text-faint uppercase flex items-center gap-1 mr-1">
                  <Tag className="w-3 h-3" /> Tagi:
                </span>
                {allUniqueTags.map((tag) => {
                  const isSelected = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(isSelected ? null : tag)}
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold border active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                        isSelected
                          ? "bg-brand-subtle text-brand border-brand/30 shadow-xs"
                          : "bg-surface-2 text-text-muted border-border hover:bg-surface-offset hover:text-text-main"
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="inline-flex items-center gap-1 text-xs text-danger font-bold bg-danger-subtle border border-danger/20 hover:bg-danger-subtle/80 px-2.5 py-0.5 rounded-full ml-1 active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                    aria-label="Wyczyść filtr tagu"
                  >
                    <span>Wyczyść tag</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Ledger Table (Desktop) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse" id="tx-table">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase font-bold text-text-faint tracking-wider">
                  <th className="py-2.5 px-3">Opis / Transakcja</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Kategoria</th>
                  <th className="py-2.5 px-3">Konto</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Kwota</th>
                  <th className="py-2.5 px-3 text-center w-20 whitespace-nowrap">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center bg-surface-2/20 rounded-xl border border-dashed border-border/70 my-2">
                      <div className="flex flex-col items-center justify-center min-w-0">
                        <div className="w-10 h-10 rounded-full bg-surface-2 border border-border/70 flex items-center justify-center mb-2.5 text-text-faint">
                          <ReceiptText className="w-5 h-5 text-text-muted" />
                          <span className="sr-only">{profile.transactions.length > 0 ? "🔍" : "🍵"}</span>
                        </div>
                        <p className="font-semibold text-sm text-text-main mb-0.5 truncate">
                          {profile.transactions.length > 0
                            ? "Brak transakcji pasujących do filtrów"
                            : "Brak zarejestrowanych transakcji"}
                        </p>
                        <p className="text-xs text-text-muted truncate">
                          {profile.transactions.length > 0
                            ? "Zmień kryteria wyszukiwania lub zresetuj filtry."
                            : "Dodaj pierwszy wydatek lub przychód, aby rozpocząć rejestrację."}
                        </p>
                        {profile.transactions.length === 0 && (
                          <button
                            onClick={() => onOpenTxModal()}
                            className="mt-3 text-xs font-semibold text-brand bg-brand-subtle border border-brand/20 px-3.5 py-1.5 rounded-lg hover:bg-brand-subtle active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shrink-0"
                          >
                            + Dodaj pierwszą transakcję
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-offset transition-colors group">
                      <td className="py-3 px-3 text-sm max-w-[220px]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base shrink-0" title={tx.category}>
                            {tx.categoryIcon || iconByCategory[tx.category] || "📂"}
                          </span>
                          <span className="font-bold text-text-main truncate group-hover:text-brand transition-colors" title={tx.name}>
                            {tx.name}
                          </span>
                          {profile.kind === "shared" && tx.paidBy && (
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-surface-2 text-text-muted border border-border shrink-0 truncate max-w-[90px]"
                              title={`${tx.paidBy === 'me' ? 'Ja' : tx.paidBy === 'partner' ? 'Partner' : 'Wspólne'}${tx.splitMode === 'equal' ? ' (50-50)' : ''}`}
                            >
                              {tx.paidBy === 'me' ? 'Ja' : tx.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                              {tx.splitMode === 'equal' ? ' (50-50)' : ''}
                            </span>
                          )}
                        </div>
                        {/* Transaction tags display inside row */}
                        {tx.tags && tx.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 pl-7">
                            {tx.tags.map((tag) => (
                              <span
                                key={tag}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTag(selectedTag === tag ? null : tag);
                                }}
                                className={`cursor-pointer text-[10px] px-1.5 py-0.5 rounded-md font-medium border active:scale-[0.98] transition-all ${
                                  selectedTag === tag
                                    ? "bg-brand-subtle text-brand border-brand/30"
                                    : "bg-surface-2 text-text-muted border-border hover:bg-surface-offset hover:text-text-main"
                                }`}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* SPRINT 35: Linked debt indicator in desktop row */}
                        {tx.debtId && (
                          <div className="mt-1 pl-7 flex items-center">
                            {(() => {
                              const debt = debtsMap.get(tx.debtId);
                              if (debt) {
                                return onNavigateToDebts ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onNavigateToDebts(debt.id);
                                    }}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-brand-subtle text-brand border border-brand/20 hover:bg-brand-subtle/80 hover:border-brand/40 active:scale-[0.98] transition-all cursor-pointer truncate max-w-[200px]"
                                    aria-label={`Zobacz szczegóły długu ${debt.name}`}
                                    title={`Powiązano z długiem: ${debt.name}`}
                                  >
                                    <Link2 className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate">Powiązany kredyt lub dług: {debt.name}</span>
                                  </button>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-brand-subtle text-brand border border-brand/20 shrink-0 truncate max-w-[200px]"
                                    title={`Powiązano z długiem: ${debt.name}`}
                                  >
                                    <Link2 className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate">Powiązany kredyt lub dług: {debt.name}</span>
                                  </span>
                                );
                              }
                              return (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-surface-2 text-text-muted border border-border shrink-0"
                                  title="Powiązany dług niedostępny"
                                >
                                  <Link2 className="w-2.5 h-2.5 shrink-0" />
                                  <span>Powiązany dług nie jest już dostępny.</span>
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-text-faint whitespace-nowrap">{formatDate(tx.isoDate)}</td>
                      <td className="py-3 px-3 text-xs text-text-muted max-w-[130px]">
                        <span className="bg-surface-2 border border-border px-2 py-0.5 rounded-md inline-block max-w-full truncate align-bottom text-[11px] font-medium" title={tx.category}>
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-text-faint max-w-[120px] truncate" title={tx.account}>
                        {tx.account}
                      </td>
                      <td className={`py-3 px-3 text-sm font-black text-right whitespace-nowrap tabular-nums ${tx.type === "income" ? "text-brand" : "text-text-main"}`} title={formatMoney(tx.amount, tx.currency || profile?.currency || 'PLN')}>
                        {tx.type === "income" ? "+" : "-"}{formatMoney(tx.amount, tx.currency || profile?.currency || 'PLN')}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <DelayedTooltip label="Edytuj transakcję">
                            <button
                              onClick={() => onOpenTxModal(tx)}
                              className="p-1.5 text-text-faint hover:text-brand hover:bg-brand-subtle rounded-lg active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                              aria-label="Edytuj transakcję"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </DelayedTooltip>
                          <DelayedTooltip label="Usuń transakcję">
                            <button
                              onClick={() => setTransactionToDelete(tx)}
                              className="p-1.5 text-text-faint hover:text-danger hover:bg-danger-subtle rounded-lg active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                              aria-label="Usuń transakcję"
                              id={`btn-delete-tx-${tx.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </DelayedTooltip>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block md:hidden space-y-3" id="tx-mobile-list">
            {visibleTransactions.length === 0 ? (
              <div className="py-10 px-4 text-center bg-surface-2/20 border border-dashed border-border/70 rounded-xl flex flex-col items-center justify-center min-w-0">
                <div className="w-10 h-10 rounded-full bg-surface-2 border border-border/70 flex items-center justify-center mb-2.5 text-text-faint">
                  <ReceiptText className="w-5 h-5 text-text-muted" />
                  <span className="sr-only">{profile.transactions.length > 0 ? "🔍" : "🍵"}</span>
                </div>
                <p className="font-semibold text-sm text-text-main mb-0.5 truncate">
                  {profile.transactions.length > 0
                    ? "Brak transakcji pasujących do filtrów"
                    : "Brak zarejestrowanych transakcji"}
                </p>
                <p className="text-xs text-text-muted truncate">
                  {profile.transactions.length > 0
                    ? "Zmień kryteria wyszukiwania lub zresetuj filtry."
                    : "Dodaj pierwszy wydatek lub przychód, aby rozpocząć."}
                </p>
                {profile.transactions.length === 0 && (
                  <button
                    onClick={() => onOpenTxModal()}
                    className="mt-3 text-xs font-semibold text-brand bg-brand-subtle border border-brand/20 px-3.5 py-1.5 rounded-lg hover:bg-brand-subtle active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer shrink-0"
                  >
                    + Dodaj transakcję
                  </button>
                )}
              </div>
            ) : (
              visibleTransactions.map((tx) => (
                <div key={tx.id} className="p-3.5 sm:p-4 bg-surface-2/60 hover:bg-surface-2 border border-border/80 rounded-xl space-y-2.5 relative min-w-0 shadow-sm transition-colors">
                  <div className="flex items-start justify-between gap-2.5 min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base shrink-0 bg-surface rounded-full w-8 h-8 flex items-center justify-center border border-border shadow-xs">
                        {tx.categoryIcon || iconByCategory[tx.category] || "📂"}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-text-main text-sm flex items-center gap-1.5 min-w-0">
                          <span className="truncate" title={tx.name}>{tx.name}</span>
                          {profile.kind === "shared" && tx.paidBy && (
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-surface-2 text-text-muted border border-border shrink-0 truncate max-w-[90px]"
                              title={`${tx.paidBy === 'me' ? 'Ja' : tx.paidBy === 'partner' ? 'Partner' : 'Wspólne'}${tx.splitMode === 'equal' ? ' (50-50)' : ''}`}
                            >
                              {tx.paidBy === 'me' ? 'Ja' : tx.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                              {tx.splitMode === 'equal' ? ' (50-50)' : ''}
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-text-faint truncate" title={formatDate(tx.isoDate)}>{formatDate(tx.isoDate)}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-black tabular-nums whitespace-nowrap shrink-0 ${tx.type === "income" ? "text-brand" : "text-text-main"}`} title={formatMoney(tx.amount, tx.currency || profile?.currency || 'PLN')}>
                      {tx.type === "income" ? "+" : "-"}{formatMoney(tx.amount, tx.currency || profile?.currency || 'PLN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/80 text-xs text-text-muted min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
                      <span className="bg-surface border border-border px-2 py-0.5 rounded-md text-[10px] text-text-muted font-medium truncate max-w-[110px]" title={tx.category}>
                        {tx.category}
                      </span>
                      <span className="bg-surface border border-border px-2 py-0.5 rounded-md text-[10px] text-text-faint truncate max-w-[110px]" title={tx.account}>
                        {tx.account}
                      </span>
                      {/* SPRINT 35: Linked debt indicator in mobile card */}
                      {tx.debtId && (
                        (() => {
                          const debt = debtsMap.get(tx.debtId);
                          if (debt) {
                            return onNavigateToDebts ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigateToDebts(debt.id);
                                }}
                                className="bg-brand-subtle text-brand border border-brand/20 px-2 py-0.5 rounded-md text-[10px] font-bold truncate max-w-[160px] inline-flex items-center gap-1 hover:bg-brand-subtle/80 active:scale-[0.98] transition-all cursor-pointer"
                                aria-label={`Zobacz szczegóły długu ${debt.name}`}
                                title={`Powiązano z długiem: ${debt.name}`}
                              >
                                <Link2 className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">Powiązany kredyt lub dług: {debt.name}</span>
                              </button>
                            ) : (
                              <span
                                className="bg-brand-subtle text-brand border border-brand/20 px-2 py-0.5 rounded-md text-[10px] font-bold truncate max-w-[160px] inline-flex items-center gap-1"
                                title={`Powiązano z długiem: ${debt.name}`}
                              >
                                <Link2 className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">Powiązany kredyt lub dług: {debt.name}</span>
                              </span>
                            );
                          }
                          return (
                            <span
                              className="bg-surface border border-border px-2 py-0.5 rounded-md text-[10px] text-text-muted font-medium truncate max-w-[160px] inline-flex items-center gap-1"
                              title="Powiązany dług niedostępny"
                            >
                              <Link2 className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">Powiązany dług nie jest już dostępny.</span>
                            </span>
                          );
                        })()
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onOpenTxModal(tx)}
                        className="text-text-muted hover:text-text-main text-xs font-bold px-2.5 py-1 bg-surface hover:bg-surface-offset rounded-lg active:scale-[0.98] transition-all border border-border cursor-pointer flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
                        aria-label={`Edytuj transakcję ${tx.name}`}
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edytuj</span>
                      </button>
                      <button
                        onClick={() => setTransactionToDelete(tx)}
                        className="text-danger hover:text-danger text-xs font-bold px-2.5 py-1 bg-danger-subtle hover:bg-danger-subtle/80 rounded-lg active:scale-[0.98] transition-all border border-danger/20 cursor-pointer flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-focus-ring"
                        id={`btn-delete-tx-mob-${tx.id}`}
                        aria-label={`Usuń transakcję ${tx.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Usuń</span>
                      </button>
                    </div>
                  </div>

                  {tx.tags && tx.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {tx.tags.map((tag) => (
                        <span
                          key={tag}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTag(selectedTag === tag ? null : tag);
                          }}
                          className={`cursor-pointer text-[10px] px-1.5 py-0.5 rounded-md font-medium border active:scale-[0.98] transition-all ${
                            selectedTag === tag
                              ? "bg-brand-subtle text-brand border-brand/30 shadow-xs"
                              : "bg-surface text-text-muted border-border hover:bg-surface-offset hover:text-text-main"
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
                className="min-h-[44px] bg-brand-subtle text-brand hover:bg-brand-subtle/80 font-bold text-xs px-5 py-2.5 rounded-xl active:scale-[0.98] transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none cursor-pointer border border-brand/20"
                id="btn-load-more"
              >
                Pokaż więcej ({filteredTransactions.length - itemsToShow} pozostało)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tags Reporting Panel */}
      <TransactionsTagsAnalysis
        currency={profile.currency}
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
              ref={deleteModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-tx-title"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-surface rounded-2xl max-w-md w-full p-6 shadow-xl relative z-10 border border-border"
            >
              {/* Warning Header */}
              <div className="flex items-center gap-3.5 mb-4 text-danger">
                <div className="w-10 h-10 rounded-full bg-danger-subtle flex items-center justify-center shrink-0 border border-danger/20">
                  <Trash2 className="w-5 h-5 text-danger" />
                </div>
                <div>
                  <h3 id="delete-tx-title" className="text-lg font-bold text-text-main">Potwierdź usunięcie</h3>
                  <p className="text-xs text-text-muted">Czy na pewno chcesz usunąć tę transakcję?</p>
                </div>
              </div>

              {/* Transaction Details Card */}
              <div className="bg-surface-2 rounded-xl p-4 border border-border text-sm mb-5">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-text-main">{transactionToDelete.name}</span>
                  <span className={`font-black ${transactionToDelete.type === "income" ? "text-brand" : "text-danger"}`}>
                    {transactionToDelete.type === "income" ? "+" : "-"} {formatMoney(transactionToDelete.amount, transactionToDelete.currency || profile?.currency || 'PLN')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-faint">
                  <span className="bg-surface px-2 py-0.5 rounded-md flex items-center gap-1 border border-border">
                    <span>{transactionToDelete.categoryIcon || iconByCategory[transactionToDelete.category] || "📂"}</span>
                    <span>{transactionToDelete.category}</span>
                  </span>
                  <span>•</span>
                  <span>{formatDate(transactionToDelete.isoDate)}</span>
                  <span>•</span>
                  <span>{transactionToDelete.account}</span>
                </div>
              </div>

              <p className="text-xs text-danger font-medium mb-5 bg-danger-subtle px-3 py-2 rounded-lg border border-danger/20 flex items-center gap-2">
                <span>ℹ️</span> Tej operacji nie można cofnąć. Transakcja zostanie trwale usunięta.
              </p>

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setTransactionToDelete(null)}
                  className="px-4 py-2.5 text-text-muted bg-surface hover:bg-surface-offset rounded-xl text-xs font-bold active:scale-[0.98] transition-all cursor-pointer border border-border focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  Anuluj
                </button>
                <button
                  onClick={() => {
                    onDeleteTransaction(transactionToDelete.id);
                    setTransactionToDelete(null);
                  }}
                  className="px-4 py-2.5 bg-danger text-text-inverse rounded-xl text-xs font-bold active:scale-[0.98] transition-all shadow-md flex items-center gap-1.5 cursor-pointer hover:bg-danger/90 focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <span>Usuń transakcję</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isCSVModalOpen && (
        <ErrorBoundary onReset={() => setIsCSVModalOpen(false)} title="Nie udało się załadować modułu importu">
          <Suspense fallback={<ModalFallback label="Ładowanie modułu importu..." />}>
            <ImportTransactionsModal
              isOpen={true}
              onClose={() => setIsCSVModalOpen(false)}
              onImport={onImportTransactions}
              onBeforeImport={onBeforeImport}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {isSmartRulesModalOpen && (
        <SmartRulesPreviewModal
          isOpen={isSmartRulesModalOpen}
          onClose={() => setIsSmartRulesModalOpen(false)}
          transactions={profile.transactions}
          rules={smartRules}
          currency={profile.currency}
          onApply={(selectedTxIds) => {
            if (onApplySmartRulesBulk) {
              const { appliedCount } = onApplySmartRulesBulk(selectedTxIds);
              if (onShowToast) {
                onShowToast(
                  appliedCount > 0
                    ? `Zaktualizowano kategorie w ${appliedCount} ${appliedCount === 1 ? "transakcji" : "transakcjach"}`
                    : "Brak zmian w kategoriach",
                  "success"
                );
              }
            }
          }}
        />
      )}
    </div>
  );
});
