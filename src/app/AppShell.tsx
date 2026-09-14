
import { useApp } from "./providers/AppContext";
import React, { useState, useEffect, Suspense, lazy } from "react";
import { motion } from "motion/react";
import { Profile } from "../types";
import { AppView } from "../uiTypes";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ModalFallback } from "../components/ModalFallback";

const CommandPaletteModal = lazy(() => import("../components/CommandPaletteModal").then(m => ({ default: m.CommandPaletteModal })));
import {
  LayoutDashboard,
  History,
  Clock,
  Wallet,
  Target,
  LineChart,
  Settings,
  Menu,
  X,
  RefreshCw,
  Sparkles,
  Landmark,
  Wifi,
  WifiOff,
  ShieldCheck,
  Database,
  Info,
  ArrowLeftRight,
  LogOut,
  Search,
  FileSpreadsheet,
  Plus,
  ChevronDown,
  AlertTriangle
} from "lucide-react";

export function AppShell({
  children,
  onQuickAdd
}: {
  children: React.ReactNode;
  onQuickAdd: () => void;
}) {
  const {
    state,
    activeView, setActiveView,
    activeProfile,
    handleSwitchProfile,
    handleSelectProfile,
    handleExportData,
    theme,
    handleThemeChange,
    isMobileMenuOpen, setIsMobileMenuOpen,
    isOnline,
    isSyncing,
    refreshState,
    isProfileLocked,
    toggleSecurityInfo,
    apiError,
    setApiError,
    isDemoMode,
    setIsDemoMode,
    openModal,
    googleUser,
    disconnectGoogle,
    showToast
  } = useApp();

  const [showDemoBanner, setShowDemoBanner] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTopUserMenuOpen, setIsTopUserMenuOpen] = useState(false);
  const topUserMenuRef = React.useRef<HTMLDivElement>(null);

  // Zamknij menu profilu po kliknięciu poza nim lub klawiszem Escape
  useEffect(() => {
    if (!isTopUserMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (topUserMenuRef.current && !topUserMenuRef.current.contains(e.target as Node)) {
        setIsTopUserMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsTopUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isTopUserMenuOpen]);

  const handleLogoutClick = async () => {
    setIsMobileMenuOpen(false);
    try {
      await disconnectGoogle();
      showToast("Wylogowano z konta Google na tym urządzeniu.", "success");
    } catch (err: any) {
      showToast(err?.message || "Błąd podczas wylogowywania.", "error");
    }
  };

  // Global keyboard shortcut listener for Command Palette (Cmd+K / Ctrl+K / "/")
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Format active weekday date for header
  const getTodayFormatted = () => {
    return new Intl.DateTimeFormat("pl-PL", {
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(new Date()).toUpperCase();
  };

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden font-sans" id="app-root-shell">
      {/* Skip to Main Content link for keyboard / screen-reader accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-brand focus:text-text-inverse focus:font-bold focus:text-sm focus:rounded-xl focus:shadow-xl focus:ring-4 focus:ring-focus-ring"
      >
        Przejdź do głównej treści
      </a>

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-bg-base/95 backdrop-blur-2xl border-r border-border/50 p-6 transition-transform lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        id="sidebar-panel"
      >
        {/* Brand */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-2xl font-black text-text-main tracking-tight">
            <span className="flex items-center justify-center bg-brand-subtle text-brand rounded-xl w-8 h-8 shadow-sm border border-brand/20">
              <Wallet className="w-5 h-5" />
            </span>
            <span>saldo</span>
          </div>
          <button
            className="lg:hidden p-1 rounded-xl hover:bg-surface-2 active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Zamknij menu"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>


        {/* Navigation Items */}
        <nav className="flex-1 space-y-1" aria-label="Główna nawigacja">
          <button
            onClick={() => {
              setActiveView("dashboard");
              setIsMobileMenuOpen(false);
            }}
            className={`relative flex items-center gap-3 w-full px-4 py-3 min-h-[44px] rounded-xl text-sm font-bold active:scale-[0.98] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "dashboard" ? "text-brand" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-dashboard"
          >
            {activeView === "dashboard" && (
              <motion.span
                layoutId="activeSidebarPill"
                className="absolute inset-0 bg-brand-subtle rounded-xl border border-brand/20 -z-0"
                transition={{ type: "spring", stiffness: 420, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {"Przegląd"}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveView("transactions");
              setIsMobileMenuOpen(false);
            }}
            className={`relative flex items-center gap-3 w-full px-4 py-3 min-h-[44px] rounded-xl text-sm font-bold active:scale-[0.98] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "transactions" ? "text-brand" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-transactions"
          >
            {activeView === "transactions" && (
              <motion.span
                layoutId="activeSidebarPill"
                className="absolute inset-0 bg-brand-subtle rounded-xl border border-brand/20 -z-0"
                transition={{ type: "spring", stiffness: 420, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-3">
              <History className="w-4 h-4 shrink-0" />
              {"Historia"}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveView("payments");
              setIsMobileMenuOpen(false);
            }}
            className={`relative flex items-center justify-between w-full px-4 py-3 min-h-[44px] rounded-xl text-sm font-bold active:scale-[0.98] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "payments" ? "text-brand" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-payments"
          >
            {activeView === "payments" && (
              <motion.span
                layoutId="activeSidebarPill"
                className="absolute inset-0 bg-brand-subtle rounded-xl border border-brand/20 -z-0"
                transition={{ type: "spring", stiffness: 420, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-3">
              <Clock className="w-4 h-4 shrink-0" />
              {"Płatności"}
            </span>
            {activeProfile && activeProfile.payments.filter((p) => p.status !== "Opłacono").length > 0 && (
              <span className="relative z-10 bg-danger-subtle text-danger text-xs font-black px-2 py-0.5 rounded-full shrink-0">
                {activeProfile.payments.filter((p) => p.status !== "Opłacono").length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveView("budget");
              setIsMobileMenuOpen(false);
            }}
            className={`relative flex items-center gap-3 w-full px-4 py-3 min-h-[44px] rounded-xl text-sm font-bold active:scale-[0.98] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "budget" ? "text-brand" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-budget"
          >
            {activeView === "budget" && (
              <motion.span
                layoutId="activeSidebarPill"
                className="absolute inset-0 bg-brand-subtle rounded-xl border border-brand/20 -z-0"
                transition={{ type: "spring", stiffness: 420, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-3">
              <Wallet className="w-4 h-4 shrink-0" />
              {"Budżet"}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveView("goals");
              setIsMobileMenuOpen(false);
            }}
            className={`relative flex items-center gap-3 w-full px-4 py-3 min-h-[44px] rounded-xl text-sm font-bold active:scale-[0.98] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "goals" ? "text-brand" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-goals"
          >
            {activeView === "goals" && (
              <motion.span
                layoutId="activeSidebarPill"
                className="absolute inset-0 bg-brand-subtle rounded-xl border border-brand/20 -z-0"
                transition={{ type: "spring", stiffness: 420, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-3">
              <Target className="w-4 h-4 shrink-0" />
              {"Cele i oszczędności"}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveView("analysis");
              setIsMobileMenuOpen(false);
            }}
            className={`relative flex items-center gap-3 w-full px-4 py-3 min-h-[44px] rounded-xl text-sm font-bold active:scale-[0.98] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "analysis" ? "text-brand" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-analysis"
          >
            {activeView === "analysis" && (
              <motion.span
                layoutId="activeSidebarPill"
                className="absolute inset-0 bg-brand-subtle rounded-xl border border-brand/20 -z-0"
                transition={{ type: "spring", stiffness: 420, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-3">
              <LineChart className="w-4 h-4 shrink-0" />
              {"Analiza"}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveView("debts");
              setIsMobileMenuOpen(false);
            }}
            className={`relative flex items-center gap-3 w-full px-4 py-3 min-h-[44px] rounded-xl text-sm font-bold active:scale-[0.98] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "debts" ? "text-brand" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-debts"
          >
            {activeView === "debts" && (
              <motion.span
                layoutId="activeSidebarPill"
                className="absolute inset-0 bg-brand-subtle rounded-xl border border-brand/20 -z-0"
                transition={{ type: "spring", stiffness: 420, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-3">
              <Landmark className="w-4 h-4 shrink-0" />
              {"Kredyty i Hipoteka"}
            </span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-border pt-4 mt-auto">
          <button
            onClick={() => {
              setActiveView("help");
              setIsMobileMenuOpen(false);
            }}
            className={`relative flex items-center gap-3 w-full px-4 py-3 min-h-[44px] rounded-xl text-sm font-bold active:scale-[0.98] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "help" ? "text-brand" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-help"
          >
            {activeView === "help" && (
              <motion.span
                layoutId="activeSidebarPill"
                className="absolute inset-0 bg-brand-subtle rounded-xl border border-brand/20 -z-0"
                transition={{ type: "spring", stiffness: 420, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-3">
              <Info className="w-4 h-4 shrink-0" />
              {"Pomoc"}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveView("settings");
              setIsMobileMenuOpen(false);
            }}
            className={`relative flex items-center gap-3 w-full px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold mb-3 active:scale-[0.98] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "settings" ? "text-brand" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-settings"
          >
            {activeView === "settings" && (
              <motion.span
                layoutId="activeSidebarPill"
                className="absolute inset-0 bg-brand-subtle rounded-xl border border-brand/20 -z-0"
                transition={{ type: "spring", stiffness: 420, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-3">
              <Settings className="w-4 h-4 shrink-0" />
              {"Ustawienia"}
            </span>
          </button>

          <button
            onClick={() => {
              openModal("changelog");
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center justify-between w-full px-3.5 py-2 mb-3 bg-surface-2/60 border border-border/70 rounded-xl hover:bg-surface-2 active:scale-[0.98] transition-all group cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-brand-subtle text-brand flex items-center justify-center border border-brand/20">
                <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
              </span>
              <span className="text-xs font-semibold text-text-main group-hover:text-brand">Co nowego?</span>
            </div>
          </button>

        </div>
      </aside>

      {/* MAIN VIEWPORT PANEL */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0" id="main-viewport-panel">
        {/* Demo Mode Compact Notice */}
        {isDemoMode && showDemoBanner && (
          <div className="bg-surface-2/90 text-text-main border-b border-border/60 px-4 sm:px-6 py-1.5 flex items-center justify-between gap-3 shrink-0 z-20 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Database className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={1.75} />
              <span className="truncate text-[11px] sm:text-xs">
                <strong className="font-semibold text-text-main">Tryb Lokalne Saldo</strong> — dane zapisywane prywatnie na tym urządzeniu.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsDemoMode(false)}
                className="text-[11px] font-semibold text-brand hover:underline cursor-pointer"
              >
                Połącz z Google
              </button>
              <button
                onClick={() => setShowDemoBanner(false)}
                className="p-1 text-text-muted hover:text-text-main hover:bg-surface-offset rounded-md cursor-pointer"
                title="Ukryj"
                aria-label="Ukryj demonstracyjne powiadomienie"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        )}

        {/* HIGH-DENSITY CONSOLIDATED TOP BAR HEADER */}
        <header className="flex items-center justify-between bg-surface/90 backdrop-blur-md border-b border-border/60 px-4 sm:px-6 py-2.5 sm:py-3 shrink-0 shadow-2xs z-20 gap-3" id="top-bar-header">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-lg border border-border hover:bg-surface-offset active:scale-[0.98] transition-all lg:hidden shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="btn-open-mobile-menu"
              aria-label="Otwórz menu"
            >
              <Menu className="w-5 h-5 text-text-main" strokeWidth={1.75} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-text-faint tracking-wider uppercase truncate" title={getTodayFormatted()}>{getTodayFormatted()}</p>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base md:text-lg font-bold text-text-main tracking-tight truncate">
                  {activeView === "dashboard" && (new Date().getHours() >= 5 && new Date().getHours() < 18 ? "Dzień dobry" : "Dobry wieczór")}
                  {activeView === "transactions" && "Księga Transakcji"}
                  {activeView === "payments" && "Zaplanowane Opłaty"}
                  {activeView === "budget" && "Twoje Budżety"}
                  {activeView === "goals" && "Cele Finansowe i Inwestycje"}
                  {activeView === "analysis" && "Twoje Finanse w Liczbach"}
                  {activeView === "settings" && "Konfiguracja Systemu"}
                  {activeView === "help" && "Centrum Pomocy"}
                </h1>
                {isDemoMode && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-text-muted bg-surface-2 border border-border/70 px-2 py-0.5 rounded-full shrink-0" title="Tryb Lokalne Saldo — dane prywatne na urządzeniu">
                    <Database className="w-3 h-3 text-brand" strokeWidth={1.75} />
                    <span>Lokalnie</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Subtle Sync/Status Indicator Dot with Tooltip */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-text-muted text-xs cursor-default select-none hover:bg-surface-2 transition-colors"
              title={isOnline ? (isSyncing ? "Synchronizacja danych w toku..." : "System Online • Zsynchronizowano lokalnie") : "System Offline"}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${!isOnline ? "bg-amber-500 animate-pulse" : isSyncing ? "bg-brand animate-spin" : "bg-emerald-500 animate-pulse"}`} />
              <span className="text-[11px] font-medium hidden xl:inline">
                {!isOnline ? "Offline" : isSyncing ? "Sync..." : "Zsynchronizowano"}
              </span>
            </div>

            {/* Primary Action 1: Command Palette Trigger */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 py-1.5 px-2.5 sm:px-3 bg-surface border border-border/70 hover:bg-surface-2 hover:border-brand/30 text-text-muted hover:text-text-main text-xs font-medium rounded-lg active:scale-[0.98] transition-all cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="btn-open-command-palette"
              title="Wyszukaj lub uruchom polecenie (⌘K / /)"
              aria-label="Wyszukaj lub uruchom polecenie"
            >
              <Search className="w-3.5 h-3.5 text-brand" strokeWidth={1.75} />
              <span className="hidden md:inline">Szukaj...</span>
              <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono font-semibold bg-surface-offset border border-border text-text-muted px-1.5 py-0.5 rounded shadow-2xs">
                ⌘K
              </kbd>
            </button>

            <button
              onClick={() => openModal("aiChat")}
              disabled={isProfileLocked}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand/20 bg-brand-subtle px-2.5 py-1.5 text-xs font-semibold text-brand transition-all hover:bg-brand/15 disabled:cursor-not-allowed disabled:opacity-50"
              id="btn-open-ai-chat"
              title="Otwórz doradcę finansowego AI"
              aria-label="Otwórz doradcę finansowego AI"
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="hidden lg:inline">Doradca AI</span>
            </button>

            {/* Primary Action 2: Quick Add CTA Button */}
            {activeProfile && !isProfileLocked && (
              <button
                onClick={onQuickAdd}
                className="inline-flex items-center gap-1 bg-brand text-text-inverse font-semibold py-1.5 px-2.5 sm:px-3.5 rounded-lg hover:bg-brand-hover active:scale-[0.98] transition-all shadow-xs text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring whitespace-nowrap"
                id="btn-quick-add-tx"
                aria-label="Dodaj nową transakcję"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Dodaj wpis</span>
              </button>
            )}

            {/* Consolidated Secondary Actions: User Profile Dropdown Menu */}
            {activeProfile && (
              <div className="relative" ref={topUserMenuRef}>
                <button
                  onClick={() => setIsTopUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-lg border border-border/70 bg-surface hover:bg-surface-2 hover:border-brand/30 transition-all cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-focus-ring group"
                  id="btn-top-user-menu"
                  aria-haspopup="menu"
                  aria-expanded={isTopUserMenuOpen}
                  aria-label="Menu profilu i akcji"
                >
                  <span className="w-6 h-6 rounded-full bg-brand-subtle text-brand text-xs font-bold flex items-center justify-center select-none shadow-2xs shrink-0 border border-brand/20">
                    {activeProfile.avatar || activeProfile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                  </span>
                  <span className="text-xs font-semibold text-text-main max-w-[85px] truncate hidden md:inline">
                    {activeProfile.name}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${isTopUserMenuOpen ? "rotate-180" : ""}`} strokeWidth={1.75} />
                </button>

                {/* Floating shadcn-style dropdown menu */}
                {isTopUserMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1.5 w-60 bg-surface border border-border rounded-xl shadow-lg overflow-hidden py-1 z-50 animate-in fade-in slide-in-from-top-2"
                    role="menu"
                    id="top-user-actions-menu"
                  >
                    <div className="px-3.5 py-2 border-b border-border/50">
                      <p className="text-xs font-bold text-text-main truncate">{activeProfile.name}</p>
                      <p className="text-[11px] text-text-muted truncate">
                        {activeProfile.kind === "shared" ? `Budżet wspólny (${activeProfile.partnerName || 'Partner'})` : "Budżet osobisty"}
                      </p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsTopUserMenuOpen(false);
                          handleSwitchProfile();
                        }}
                        role="menuitem"
                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-medium text-text-main hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-focus-ring"
                        id="btn-header-switch-profile"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={1.75} />
                        <span>Przełącz profil</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsTopUserMenuOpen(false);
                          openModal("exportReports");
                        }}
                        role="menuitem"
                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-medium text-text-main hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-focus-ring"
                        id="btn-header-export-reports"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={1.75} />
                        <span>Raporty i eksport</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsTopUserMenuOpen(false);
                          setIsDemoMode(!isDemoMode);
                        }}
                        role="menuitem"
                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-medium text-text-main hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-focus-ring"
                        id="btn-header-toggle-demo"
                      >
                        <Database className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={1.75} />
                        <span>{isDemoMode ? "Tryb: Lokalne Saldo" : "Tryb: Chmura"}</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsTopUserMenuOpen(false);
                          toggleSecurityInfo(true);
                        }}
                        role="menuitem"
                        className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-medium text-text-main hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-focus-ring"
                        id="btn-header-security-info"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={1.75} />
                        <span>Szczegóły ochrony</span>
                      </button>
                    </div>

                    {googleUser && (
                      <div className="border-t border-border/50 pt-1">
                        <button
                          onClick={handleLogoutClick}
                          role="menuitem"
                          className="flex items-center gap-2.5 w-full px-3.5 py-2 text-xs font-medium text-danger hover:bg-danger-subtle transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-focus-ring"
                          id="btn-header-logout"
                        >
                          <LogOut className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                          <span>Wyloguj z konta Google</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {apiError && (
          <div
            className="bg-danger-subtle border-b border-danger/20 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between text-danger text-xs animate-fade-in shrink-0"
            id="api-error-banner"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0 text-danger" strokeWidth={1.75} />
              <span className="font-bold truncate">{apiError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setApiError(null);
                  refreshState?.();
                }}
                className="px-2.5 py-1 bg-danger/10 hover:bg-danger/20 active:scale-[0.98] text-danger rounded-lg font-bold text-xs transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                id="btn-retry-api"
              >
                Ponów
              </button>
              <button
                onClick={() => setApiError(null)}
                className="text-danger hover:text-danger/80 active:scale-[0.98] transition-all font-bold text-base shrink-0 leading-none cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring p-1 rounded-md"
                aria-label="Zamknij błąd"
                id="btn-dismiss-api-error"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE MODULE VIEW CANVAS */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 focus:outline-none" id="main-content" tabIndex={-1}>
          {children}
        </div>

        {/* SUBTLE LOW-PROFILE FOOTER STATUS BAR (Retains e2e and a11y compatibility) */}
        <footer
          className="h-7 px-4 sm:px-6 border-t border-border/50 bg-surface/50 backdrop-blur-xs flex items-center justify-between text-[11px] text-text-muted shrink-0 select-none z-10"
          id="offline-worker-status-banner"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOnline ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
            <span className="font-medium truncate">{isOnline ? "System Online" : "System Offline"}</span>
            <span className="text-border">|</span>
            <span className="hidden sm:inline text-text-faint truncate">Ochrona aktywna</span>
            <span className="text-border hidden sm:inline">|</span>
            <span className="hidden md:inline text-text-faint truncate">Autozapis</span>
          </div>
          <button
            onClick={() => toggleSecurityInfo(true)}
            className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-text-main transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-focus-ring"
            id="btn-security-details"
            aria-label="Szczegóły ochrony"
          >
            <ShieldCheck className="w-3 h-3 text-brand" strokeWidth={1.75} />
            <span className="hidden xs:inline">Szczegóły ochrony</span>
          </button>
        </footer>
      </main>

      {/* Command Palette Modal */}
      {isCommandPaletteOpen && (
        <ErrorBoundary onReset={() => setIsCommandPaletteOpen(false)} title="Nie udało się załadować palety poleceń">
          <Suspense fallback={<ModalFallback label="Ładowanie palety poleceń..." />}>
            <CommandPaletteModal
              isOpen={true}
              onClose={() => setIsCommandPaletteOpen(false)}
              activeProfile={activeProfile}
              profiles={state?.profiles || []}
              activeView={activeView}
              setActiveView={setActiveView}
              onSelectProfile={(id) => handleSelectProfile(id)}
              onOpenTransactionModal={(tx) => openModal("transaction", tx)}
              onOpenPaymentModal={(prefill) => openModal("payment", prefill)}
              onOpenCalendarReminder={(prefill) => openModal("calendarAi", prefill)}
              onOpenGoalModal={() => openModal("goal")}
              onOpenSmartRulesManager={() => openModal("smartRulesManager")}
              onOpenExportReports={(tab) => openModal("exportReports", { initialTab: tab })}
              onExportData={handleExportData}
              theme={theme === "dark" ? "dark" : "light"}
              onToggleTheme={() => handleThemeChange(theme === "dark" ? "light" : "dark")}
              aiConfig={{
                aiMode: state.aiMode || "none",
                localAiEndpoint: state.localAiEndpoint,
                localAiModel: state.localAiModel
              }}
            />
          </Suspense>
        </ErrorBoundary>
      )}

    </div>
  );
}
