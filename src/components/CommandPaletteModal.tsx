import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  PlusCircle,
  Receipt,
  Target,
  FileSpreadsheet,
  Download,
  Moon,
  Sun,
  LayoutDashboard,
  Wallet,
  Calendar,
  BarChart3,
  Settings,
  HelpCircle,
  ArrowRight,
  User,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Landmark,
  Zap
} from "lucide-react";
import { Payment, Profile, Transaction, SupportedCurrency } from "../types";
import { AppView } from "../uiTypes";
import { formatMoney } from "../utils/format";
import { formatDate, getLocalDateIso } from "../utils/date";
import { parseQuickEntry } from "../services/localParsers";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { callAiApi, getAiConfig } from "../services/aiClient";

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: Profile | null;
  profiles: Profile[];
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  onSelectProfile: (profileId: string) => void;
  onOpenTransactionModal: (tx?: Transaction) => void;
  onOpenPaymentModal: (prefill?: Partial<Payment>) => void;
  onOpenCalendarReminder?: (prefill: Partial<Payment>) => void;
  onOpenGoalModal: () => void;
  onOpenSmartRulesManager?: () => void;
  onOpenExportReports?: (tab?: "pdf" | "csv" | "backup") => void;
  onOpenImportCsvModal?: () => void;
  onExportData?: () => void;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
  aiConfig?: { aiMode: "none" | "local" | "cloud"; localAiEndpoint?: string; localAiModel?: string };
}

interface PaletteItem {
  id: string;
  category: "actions" | "views" | "profiles" | "transactions";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  shortcut?: string;
  keywords?: string[];
  onSelect: () => void;
}

export function CommandPaletteModal({
  isOpen,
  onClose,
  activeProfile,
  profiles,
  activeView,
  setActiveView,
  onSelectProfile,
  onOpenTransactionModal,
  onOpenPaymentModal,
  onOpenCalendarReminder,
  onOpenGoalModal,
  onOpenSmartRulesManager,
  onOpenExportReports,
  onOpenImportCsvModal,
  onExportData,
  theme = "dark",
  onToggleTheme,
  aiConfig = { aiMode: "none" }
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAiParsing, setIsAiParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build static navigation items
  const viewItems: PaletteItem[] = useMemo(() => [
    {
      id: "view-dashboard",
      category: "views",
      title: "Pulpit główny",
      subtitle: "Podsumowanie finansowe, przepływy i bilans",
      icon: <LayoutDashboard className="w-4 h-4 text-brand" />,
      badge: activeView === "dashboard" ? "Aktywny" : undefined,
      keywords: ["start", "home", "ekran główny", "pulpit", "statystyki"],
      onSelect: () => setActiveView("dashboard")
    },
    {
      id: "view-transactions",
      category: "views",
      title: "Transakcje i operacje",
      subtitle: "Historia wydatków, przychodów i filtracja",
      icon: <Receipt className="w-4 h-4 text-brand" />,
      badge: activeView === "transactions" ? "Aktywny" : undefined,
      keywords: ["wydatki", "przychody", "historia", "wpisy", "operacje", "lista"],
      onSelect: () => setActiveView("transactions")
    },
    {
      id: "view-budget",
      category: "views",
      title: "Budżety miesięczne",
      subtitle: "Limity kategorii i ostrzeżenia wydatków",
      icon: <Wallet className="w-4 h-4 text-brand" />,
      badge: activeView === "budget" ? "Aktywny" : undefined,
      keywords: ["limity", "kategorie", "planowanie", "koperty"],
      onSelect: () => setActiveView("budget")
    },
    {
      id: "view-payments",
      category: "views",
      title: "Płatności i terminarz",
      subtitle: "Rachunki stałe, subskrypcje i terminy",
      icon: <Calendar className="w-4 h-4 text-brand" />,
      badge: activeView === "payments" ? "Aktywny" : undefined,
      keywords: ["rachunki", "subskrypcje", "opłaty", "kalendarz", "terminy"],
      onSelect: () => setActiveView("payments")
    },
    {
      id: "view-goals",
      category: "views",
      title: "Cele oszczędnościowe",
      subtitle: "Skarbonki, zbiórki i postępy oszczędzania",
      icon: <Target className="w-4 h-4 text-brand" />,
      badge: activeView === "goals" ? "Aktywny" : undefined,
      keywords: ["skarbonki", "oszczędności", "inwestycje", "rezerwa", "cele"],
      onSelect: () => setActiveView("goals")
    },
    {
      id: "view-debts",
      category: "views",
      title: "Kredyty i Hipoteka",
      subtitle: "Portfel zadłużenia, symulator nadpłat i refinansowanie",
      icon: <Landmark className="w-4 h-4 text-brand" />,
      badge: activeView === "debts" ? "Aktywny" : undefined,
      keywords: ["kredyty", "hipoteka", "zadłużenie", "długi", "nadpłata", "refinansowanie", "pożyczki", "karty", "wibor", "raty"],
      onSelect: () => setActiveView("debts")
    },
    {
      id: "view-analysis",
      category: "views",
      title: "Analizy i raporty",
      subtitle: "Trendy, wykresy, porównania i podsumowania miesięczne",
      icon: <BarChart3 className="w-4 h-4 text-brand" />,
      badge: activeView === "analysis" ? "Aktywny" : undefined,
      keywords: ["statystyki", "trendy", "wykresy", "runway", "prognoza", "porównanie", "raport"],
      onSelect: () => setActiveView("analysis")
    },
    {
      id: "view-settings",
      category: "views",
      title: "Ustawienia i kopie",
      subtitle: "Konfiguracja profilu, Google Drive i bazy danych",
      icon: <Settings className="w-4 h-4 text-brand" />,
      badge: activeView === "settings" ? "Aktywny" : undefined,
      keywords: ["profil", "dane", "baza", "drive", "kopia", "backup", "opcje"],
      onSelect: () => setActiveView("settings")
    },
    {
      id: "view-help",
      category: "views",
      title: "Centrum pomocy",
      subtitle: "Przewodnik, skróty i instrukcje Ollama / AI",
      icon: <HelpCircle className="w-4 h-4 text-brand" />,
      badge: activeView === "help" ? "Aktywny" : undefined,
      keywords: ["pomoc", "faq", "skróty", "instrukcja", "poradnik"],
      onSelect: () => setActiveView("help")
    }
  ], [activeView, setActiveView]);

  // Build quick action items
  const actionItems: PaletteItem[] = useMemo(() => {
    const items: PaletteItem[] = [
      {
        id: "action-add-transaction",
        category: "actions",
        title: "Dodaj wydatek lub przychód",
        subtitle: "Otwórz formularz nowej transakcji",
        icon: <PlusCircle className="w-4 h-4 text-brand" />,
        shortcut: "N",
        keywords: ["nowa", "dodaj", "wydatek", "przychód", "wpis", "transakcja"],
        onSelect: () => onOpenTransactionModal()
      },
      {
        id: "action-add-payment",
        category: "actions",
        title: "Dodaj rachunek lub płatność",
        subtitle: "Zaplanuj nadchodzący wydatek lub subskrypcję",
        icon: <Receipt className="w-4 h-4 text-brand" />,
        keywords: ["rachunek", "opłata", "płatność", "termin", "subskrypcja"],
        onSelect: () => onOpenPaymentModal()
      },
      {
        id: "action-add-goal",
        category: "actions",
        title: "Nowy cel oszczędnościowy",
        subtitle: "Utwórz nową skarbonkę z kwotą docelową",
        icon: <Target className="w-4 h-4 text-brand" />,
        keywords: ["cel", "skarbonka", "oszczędzanie", "zbiórka"],
        onSelect: () => onOpenGoalModal()
      },
      {
        id: "action-cashflow-forecast",
        category: "actions",
        title: "Prognoza płynności finansowej (30/60/90 dni)",
        subtitle: "Przegląd nadchodzących przepływów i szacunek salda",
        icon: <Sparkles className="w-4 h-4 text-brand" />,
        keywords: ["forecast", "prognoza", "płynność", "przepływy", "horyzont", "gotówka"],
        onSelect: () => setActiveView("analysis")
      },
      {
        id: "action-debt-payoff",
        category: "actions",
        title: "Symulator spłaty zadłużenia (Kula śnieżna)",
        subtitle: "Kalkulator przyspieszenia spłaty kredytów i kart",
        icon: <BarChart3 className="w-4 h-4 text-brand" />,
        keywords: ["kredyt", "dług", "zadłużenie", "kula śnieżna", "pożyczka", "snowball"],
        onSelect: () => setActiveView("analysis")
      },
      {
        id: "action-smart-rules",
        category: "actions",
        title: "Reguły kategoryzacji (Smart Rules)",
        subtitle: "Automatyzacja i reguły przypisywania kategorii",
        icon: <Sparkles className="w-4 h-4 text-brand" />,
        keywords: ["reguły", "smart rules", "kategoryzacja", "automatyzacja", "filtry", "menedżer"],
        onSelect: () => {
          if (onOpenSmartRulesManager) {
            onOpenSmartRulesManager();
          } else {
            setActiveView("transactions");
          }
        }
      }
    ];

    if (onOpenExportReports) {
      items.push({
        id: "action-export-reports",
        category: "actions",
        title: "Centrum Raportów i Eksportu (PDF, CSV)",
        subtitle: "Generuj raporty PDF, pobieraj pliki CSV lub twórz kopię bazy",
        icon: <FileSpreadsheet className="w-4 h-4 text-brand" />,
        keywords: ["raport", "eksport", "pdf", "csv", "zestawienie", "roczne", "miesięczne", "pobierz"],
        onSelect: () => onOpenExportReports()
      });
    }

    if (onOpenImportCsvModal) {
      items.push({
        id: "action-import-csv",
        category: "actions",
        title: "Importuj wyciąg bankowy (CSV)",
        subtitle: "mBank, PKO, Revolut, Santander, Millennium, Pekao, Alior, BNP",
        icon: <FileSpreadsheet className="w-4 h-4 text-brand" />,
        keywords: ["import", "csv", "wyciąg", "bank", "pobierz", "revolut", "mbank", "pko"],
        onSelect: () => onOpenImportCsvModal()
      });
    }

    if (onExportData) {
      items.push({
        id: "action-export-json",
        category: "actions",
        title: "Eksportuj kopię zapasową JSON",
        subtitle: "Pobierz czytelny plik z całą bazą danych",
        icon: <Download className="w-4 h-4 text-brand" />,
        keywords: ["eksport", "kopia", "backup", "json", "pobierz", "zapisz"],
        onSelect: () => onExportData()
      });
    }

    if (onToggleTheme) {
      items.push({
        id: "action-toggle-theme",
        category: "actions",
        title: theme === "dark" ? "Przełącz na motyw jasny" : "Przełącz na motyw ciemny",
        subtitle: theme === "dark" ? "Aktywuj neutralny jasny profil kolorystyczny" : "Aktywuj grafitowy profil Dark Mode",
        icon: theme === "dark" ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-400" />,
        keywords: ["motyw", "ciemny", "jasny", "dark mode", "light mode", "kolory", "tryb"],
        onSelect: () => onToggleTheme()
      });
    }

    return items;
  }, [onOpenTransactionModal, onOpenPaymentModal, onOpenGoalModal, onOpenExportReports, onOpenImportCsvModal, onExportData, theme, onToggleTheme, setActiveView]);

  // Build profile items
  const profileItems: PaletteItem[] = useMemo(() => {
    return (profiles || []).map((p) => ({
      id: `profile-${p.id}`,
      category: "profiles",
      title: `Przełącz na profil: ${p.name}`,
      subtitle: p.kind === "shared" ? `Budżet wspólny z ${p.partnerName || "partnerem"}` : "Budżet osobisty",
      icon: <User className="w-4 h-4 text-brand" />,
      badge: p.id === activeProfile?.id ? "Bieżący" : undefined,
      onSelect: () => onSelectProfile(p.id)
    }));
  }, [profiles, activeProfile, onSelectProfile]);

  // Build filtered transaction items based on query
  const transactionItems: PaletteItem[] = useMemo(() => {
    if (!query.trim() || !activeProfile?.transactions) return [];
    const q = query.toLowerCase().trim();

    return activeProfile.transactions
      .filter((tx) => {
        const nameMatch = (tx.name || "").toLowerCase().includes(q);
        const catMatch = (tx.category || "").toLowerCase().includes(q);
        const accMatch = (tx.account || "").toLowerCase().includes(q);
        const amountMatch = String(tx.amount || "").includes(q);
        const tagMatch = (tx.tags || []).some((t) => t.toLowerCase().includes(q));
        return nameMatch || catMatch || accMatch || amountMatch || tagMatch;
      })
      .slice(0, 15)
      .map((tx) => {
        const isExpense = tx.type === "expense";
        const curr = tx.currency || activeProfile.currency || "PLN";
        return {
          id: `tx-${tx.id}`,
          category: "transactions",
          title: tx.name,
          subtitle: `${tx.isoDate} • ${tx.category} • ${tx.account}`,
          icon: isExpense ? <ArrowUpRight className="w-4 h-4 text-danger" /> : <ArrowDownLeft className="w-4 h-4 text-brand" />,
          badge: `${isExpense ? "-" : "+"} ${formatMoney(tx.amount, curr)}`,
          onSelect: () => onOpenTransactionModal(tx)
        };
      });
  }, [query, activeProfile, onOpenTransactionModal]);

  // Szybkie dodawanie: zdanie w rodzaju "prąd 340 zł za 3 dni" zamienione na gotowy wpis.
  const quickEntryItem: PaletteItem | null = useMemo(() => {
    const entry = parseQuickEntry(query, getLocalDateIso(), activeProfile?.transactionRules || []);
    if (!entry) return null;

    const currency = activeProfile?.currency || "PLN";
    const isEvent = entry.kind === "event";

    return {
      id: "quick-entry",
      category: "actions",
      title: isEvent ? `Przypomnienie: ${entry.name}` : `Dodaj rachunek: ${entry.name}`,
      subtitle: isEvent
        ? `Termin ${formatDate(entry.isoDate)}`
        : `${formatMoney(entry.amount, currency as SupportedCurrency)} • termin ${formatDate(entry.isoDate)} • ${entry.category}`,
      icon: <Zap className="w-4 h-4 text-brand" />,
      badge: "Szybki wpis",
      onSelect: () => {
        if (isEvent) {
          onOpenCalendarReminder?.({ name: entry.name, amount: entry.amount, dueDate: entry.isoDate });
          return;
        }
        onOpenPaymentModal({
          name: entry.name,
          amount: entry.amount,
          dueDate: entry.isoDate,
          status: "Do opłacenia"
        });
      }
    };
  }, [query, activeProfile, onOpenPaymentModal, onOpenCalendarReminder]);

  const aiEntryItem: PaletteItem | null = useMemo(() => {
    const text = query.trim();
    if (text.length < 4 || aiConfig.aiMode === "none") return null;
    return {
      id: "ai-natural-entry",
      category: "actions",
      title: isAiParsing ? "Rozpoznawanie wpisu przez AI..." : "Rozpoznaj wpis przez AI",
      subtitle: `Przeanalizuj: „${text}”`,
      icon: <Sparkles className="w-4 h-4 text-brand" />,
      badge: aiConfig.aiMode === "cloud" ? "Gemini" : "Ollama",
      onSelect: async () => {
        if (isAiParsing) return;
        setIsAiParsing(true);
        try {
          const result = await callAiApi("parse-natural", {
            text,
            currentDate: getLocalDateIso()
          }, getAiConfig(aiConfig));
          const payment = result?.payment;
          const event = result?.event;
          if (payment?.name && Number(payment.amount) > 0 && payment.dueDate) {
            onOpenPaymentModal({
              name: String(payment.name),
              amount: Number(payment.amount),
              dueDate: String(payment.dueDate),
              status: "Do opłacenia"
            });
          } else if (event?.summary && onOpenCalendarReminder) {
            onOpenCalendarReminder({
              name: String(event.summary),
              amount: Number(payment?.amount) || 0,
              dueDate: String(event.suggestedDate || getLocalDateIso())
            });
          } else {
            throw new Error("AI nie rozpoznało płatności ani terminu.");
          }
        } catch (error) {
          console.error("AI natural entry error:", error);
        } finally {
          setIsAiParsing(false);
        }
      }
    };
  }, [query, aiConfig, onOpenPaymentModal, onOpenCalendarReminder, isAiParsing]);

  // Combined and filtered items
  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return [...actionItems, ...viewItems, ...profileItems];
    }

    const matchesQuery = (item: PaletteItem) =>
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(q)));

    const matchedActions = actionItems.filter(matchesQuery);
    const matchedViews = viewItems.filter(matchesQuery);
    const matchedProfiles = profileItems.filter(matchesQuery);

    // Szybki wpis na czele — to najczęstsza intencja przy wpisaniu kwoty.
    return [
      ...(quickEntryItem ? [quickEntryItem] : []),
      ...(aiEntryItem ? [aiEntryItem] : []),
      ...matchedActions,
      ...transactionItems,
      ...matchedViews,
      ...matchedProfiles
    ];
  }, [query, actionItems, viewItems, profileItems, transactionItems, quickEntryItem, aiEntryItem]);

  // Clamp selection index
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length, query]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl && typeof activeEl.scrollIntoView === "function") {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].onSelect();
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  const content = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 sm:p-6 md:pt-20 bg-black/60 backdrop-blur-xs">
        <motion.div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label="Paleta poleceń"
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="bg-bg-base/95 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] ring-1 ring-white/5"
          onKeyDown={handleKeyDown}
        >
          {/* SEARCH INPUT BAR */}
          <div className="relative flex items-center px-4 py-3.5 border-b border-border bg-surface/50">
            <Search className="w-5 h-5 text-brand shrink-0 mr-3" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Wpisz polecenie, widok lub szukaj transakcji..."
              aria-label="Wyszukaj polecenie, widok lub transakcję"
              className="w-full bg-transparent text-text-main placeholder:text-text-faint text-sm font-medium focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Wyczyść wyszukiwanie"
                className="text-xs text-text-muted hover:text-text-main px-2 py-0.5 rounded-md hover:bg-surface-2 transition-colors mr-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Wyczyść
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold bg-surface-2 border border-border text-text-muted rounded-md shadow-2xs">
              ESC
            </kbd>
          </div>

          {/* RESULTS LIST */}
          <div ref={listRef} className="p-2 overflow-y-auto flex-1 custom-scrollbar max-h-[60vh] space-y-1">
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center text-text-muted space-y-2">
                <Search className="w-8 h-8 mx-auto text-text-faint opacity-60" />
                <p className="text-sm font-bold text-text-main">Brak pasujących wyników</p>
                <p className="text-xs text-text-muted">Spróbuj wpisać inną frazę lub nazwę transakcji.</p>
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    data-index={index}
                    onClick={() => {
                      item.onSelect();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all active:scale-[0.99] cursor-pointer group ${
                      isSelected
                        ? "bg-brand text-text-inverse shadow-xs"
                        : "text-text-main hover:bg-surface-2"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-text-inverse/15 text-text-inverse"
                            : "bg-surface-2 text-text-muted group-hover:text-brand"
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold truncate leading-snug">
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p
                            className={`text-xs truncate ${
                              isSelected ? "text-text-inverse/80" : "text-text-muted"
                            }`}
                          >
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            isSelected
                              ? "bg-text-inverse/20 border-text-inverse/30 text-text-inverse"
                              : "bg-surface-2 border-border text-text-muted"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isSelected ? (
                        <kbd className="inline-flex items-center text-[10px] font-mono font-bold bg-text-inverse/20 text-text-inverse px-1.5 py-0.5 rounded">
                          ↵
                        </kbd>
                      ) : (
                        item.shortcut && (
                          <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono font-bold bg-surface-2 border border-border text-text-faint px-1.5 py-0.5 rounded">
                            {item.shortcut}
                          </kbd>
                        )
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* FOOTER */}
          <div className="px-4 py-2.5 bg-surface/50 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface-2 border border-border rounded text-[10px] font-mono font-bold">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-surface-2 border border-border rounded text-[10px] font-mono font-bold">↓</kbd>
                <span>Nawiguj</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface-2 border border-border rounded text-[10px] font-mono font-bold">↵</kbd>
                <span>Wybierz</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface-2 border border-border rounded text-[10px] font-mono font-bold">ESC</kbd>
                <span>Zamknij</span>
              </span>
            </div>
            <span className="hidden sm:inline text-text-faint">
              {filteredItems.length} {filteredItems.length === 1 ? "wynik" : "wyników"}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
