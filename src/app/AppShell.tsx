
import { useApp } from "./providers/AppContext";
import React, { useState, useEffect } from "react";
import { Profile } from "../types";
import { AppView } from "../uiTypes";
import { CommandPaletteModal } from "../components/CommandPaletteModal";
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
  Wifi,
  WifiOff,
  ShieldCheck,
  Database,
  Info,
  ArrowLeftRight,
  LogOut,
  Search
} from "lucide-react";

export function AppShell({
  children,
  onQuickAdd,
  onOpenAiChatModal
}: {
  children: React.ReactNode;
  onQuickAdd: () => void;
  onOpenAiChatModal?: () => void;
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
    aiMode,
    canUseAiChat,
    isDemoMode,
    setIsDemoMode,
    openModal
  } = useApp();

  const [showDemoBanner, setShowDemoBanner] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

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
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "dashboard" ? "bg-brand-subtle text-brand border border-brand/20" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-dashboard"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {"Przegląd"}
          </button>

          <button
            onClick={() => {
              setActiveView("transactions");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "transactions" ? "bg-brand-subtle text-brand border border-brand/20" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-transactions"
          >
            <History className="w-4 h-4 shrink-0" />
            {"Historia"}
          </button>

          <button
            onClick={() => {
              setActiveView("payments");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-bold active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "payments" ? "bg-brand-subtle text-brand border border-brand/20" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-payments"
          >
            <span className="flex items-center gap-3">
              <Clock className="w-4 h-4 shrink-0" />
              {"Płatności"}
            </span>
            {activeProfile && activeProfile.payments.filter((p) => p.status !== "Opłacono").length > 0 && (
              <span className="bg-danger-subtle text-danger text-xs font-black px-2 py-0.5 rounded-full shrink-0">
                {activeProfile.payments.filter((p) => p.status !== "Opłacono").length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveView("budget");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "budget" ? "bg-brand-subtle text-brand border border-brand/20" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-budget"
          >
            <Wallet className="w-4 h-4 shrink-0" />
            {"Budżet"}
          </button>

          <button
            onClick={() => {
              setActiveView("goals");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "goals" ? "bg-brand-subtle text-brand border border-brand/20" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-goals"
          >
            <Target className="w-4 h-4 shrink-0" />
            {"Cele i oszczędności"}
          </button>

          <button
            onClick={() => {
              setActiveView("analysis");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "analysis" ? "bg-brand-subtle text-brand border border-brand/20" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-analysis"
          >
            <LineChart className="w-4 h-4 shrink-0" />
            {"Analiza"}
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-border pt-4 mt-auto">
          <button
            onClick={() => {
              setActiveView("help");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "help" ? "bg-brand-subtle text-brand border border-brand/20" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-help"
          >
            <Info className="w-4 h-4 shrink-0" />
            {"Pomoc"}
          </button>

          <button
            onClick={() => {
              setActiveView("settings");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-bold mb-3 active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "settings" ? "bg-brand-subtle text-brand border border-brand/20" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-settings"
          >
            <Settings className="w-4 h-4 shrink-0" />
            {"Ustawienia"}
          </button>

          <button
            onClick={() => {
              openModal("changelog");
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center justify-between w-full px-4 py-2 mb-3 bg-surface-2 border border-border rounded-xl hover:bg-surface active:scale-[0.98] transition-all group cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-xl bg-brand-subtle text-brand flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-text-main group-hover:text-brand">Co nowego?</span>
            </div>
          </button>

          {activeProfile && (
            <button
              onClick={() => {
                handleSwitchProfile();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 w-full px-3 py-2 bg-surface/30 border border-border rounded-2xl hover:bg-surface-2 hover:border-brand/30 active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring group"
              id="btn-switch-profile"
              title="Przełącz profil"
            >
              <span className="w-8 h-8 rounded-full bg-surface-offset text-text-main text-sm font-black flex items-center justify-center select-none shadow-inner shrink-0">
                {activeProfile.avatar || activeProfile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-black text-text-main truncate" id="profile-tag-name" title={activeProfile.name}>{activeProfile.name}</p>
                <span className="text-xs text-text-muted block truncate" title={activeProfile.kind === "shared" ? `👪 Budżet wspólny · ${activeProfile.name} + ${activeProfile.partnerName || 'Partner'}` : "👤 Budżet osobisty"}>
                  {activeProfile.kind === "shared" ? `👪 Budżet wspólny · ${activeProfile.name} + ${activeProfile.partnerName || 'Partner'}` : "👤 Budżet osobisty"}
                </span>
              </div>
              <ArrowLeftRight className="w-3.5 h-3.5 text-text-muted group-hover:text-brand shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
      </aside>

      {/* MAIN VIEWPORT PANEL */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0" id="main-viewport-panel">
        {/* Demo Mode Top Banner */}
        {isDemoMode && showDemoBanner && (
          <div className="bg-surface/50 text-text-main border-b border-border px-6 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 z-20">
            <div className="flex items-center gap-2 min-w-0">
              <Database className="w-4 h-4 shrink-0" />
              <div className="text-xs">
                <span className="font-bold">Tryb Lokalne Saldo</span> – dane są zapisywane prywatnie w pamięci urządzenia.
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setIsDemoMode(false)}
                className="flex-1 sm:flex-none bg-brand text-text-inverse font-bold py-1.5 px-4 rounded-xl text-xs hover:bg-brand-hover active:scale-[0.98] transition-all shadow-sm whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Zaloguj się z Google
              </button>
              <button
                onClick={() => setShowDemoBanner(false)}
                className="p-1 text-text-muted hover:bg-surface-offset active:scale-[0.98] transition-all rounded-md cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                title="Ukryj"
                aria-label="Ukryj demonstracyjne powiadomienie"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TOP BAR HEADER */}
        <header className="flex items-center justify-between bg-surface backdrop-blur-md border-b border-border/50 px-6 py-4 shrink-0 shadow-sm z-10 gap-4" id="top-bar-header">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1 rounded-xl border border-border hover:bg-surface-offset active:scale-[0.98] transition-all lg:hidden shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="btn-open-mobile-menu"
              aria-label="Otwórz menu"
            >
              <Menu className="w-5 h-5 text-text-main" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-bold text-text-faint tracking-widest uppercase truncate" title={getTodayFormatted()}>{getTodayFormatted()}</p>
              <h1 className="text-lg md:text-xl font-bold text-text-main tracking-tight truncate">
                {activeView === "dashboard" && (new Date().getHours() >= 5 && new Date().getHours() < 18 ? "Dzień dobry" : "Dobry wieczór")}
                {activeView === "transactions" && "Księga Transakcji"}
                {activeView === "payments" && "Zaplanowane Opłaty"}
                {activeView === "budget" && "Twoje Budżety"}
                {activeView === "goals" && "Cele Finansowe i Inwestycje"}
                {activeView === "analysis" && "Twoje Finanse w Liczbach"}
                {activeView === "settings" && "Konfiguracja Systemu"}
                {activeView === "help" && "Centrum Pomocy"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isOnline ? (
              <div className="hidden sm:flex items-center gap-1 text-xs text-warning bg-warning-subtle px-3 py-1.5 rounded-full font-bold border border-warning/20">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Tryb offline</span>
              </div>
            ) : isSyncing ? (
              <div className="hidden sm:flex items-center gap-1 text-xs text-brand bg-brand-subtle px-3 py-1.5 rounded-full font-bold border border-brand/20">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synchronizacja...</span>
              </div>
            ) : isDemoMode ? (
              <div className="hidden sm:flex items-center gap-1 text-xs text-brand bg-brand-subtle px-3 py-1.5 rounded-full font-bold border border-brand/20">
                <Database className="w-3.5 h-3.5" />
                <span>Tryb demonstracyjny</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1 text-xs text-brand bg-brand-subtle px-3 py-1.5 rounded-full font-bold border border-brand/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zsynchronizowany</span>
              </div>
            )}
            {/* Command Palette Trigger Button */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 py-2 px-3 bg-surface border border-border hover:bg-surface-2 hover:border-brand/30 text-text-muted hover:text-text-main text-xs font-medium rounded-xl active:scale-[0.98] transition-all cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="btn-open-command-palette"
              title="Wyszukaj lub uruchom polecenie (⌘K / /)"
            >
              <Search className="w-3.5 h-3.5 text-brand" />
              <span className="hidden md:inline">Szukaj...</span>
              <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono font-bold bg-surface-2 border border-border text-text-faint px-1.5 py-0.5 rounded shadow-2xs">
                ⌘K
              </kbd>
            </button>

            {activeProfile && (
              <button
                onClick={handleSwitchProfile}
                className="flex items-center gap-1.5 py-2 px-3 bg-surface border border-border hover:bg-surface-2 hover:border-brand/30 text-text-main font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring group"
                id="btn-header-switch-profile"
                title="Przełącz profil"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-brand group-hover:rotate-180 transition-transform duration-300" />
                <span className="hidden sm:inline">Przełącz profil</span>
              </button>
            )}
            {activeProfile && !isProfileLocked && (
              <button
                onClick={onQuickAdd}
                className="bg-brand text-text-inverse font-bold py-2 px-4 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-md text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                id="btn-quick-add-tx"
              >
                ＋ Dodaj wpis
              </button>
            )}
          </div>
        </header>

        {/* Slim Status and Security Bar */}
        <div
          className={`text-xs px-6 py-2 border-b flex flex-wrap items-center justify-between gap-3 transition-all duration-300 shrink-0 ${
            isOnline
              ? "bg-brand-subtle border-brand/20 text-brand"
              : "bg-warning-subtle border-warning/20 text-warning"
          }`}
          id="offline-worker-status-banner"
        >
          <div className="flex items-center gap-2 md:gap-4 flex-wrap min-w-0">
            <span className="flex items-center gap-1.5 font-bold shrink-0 whitespace-nowrap">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-brand" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-warning animate-pulse" />
              )}
              <span>{isOnline ? "System Online" : "System Offline"}</span>
            </span>
            <span className="text-text-muted dark:text-text-main shrink-0">|</span>
            <span className="flex items-center gap-1 text-xs text-text-muted shrink-0 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-brand" />
              <span className="hidden xs:inline">Bezpieczeństwo:</span>
              <span className="font-medium">Ochrona aktywna</span>
            </span>
            <span className="text-text-muted dark:text-text-main hidden sm:inline shrink-0">|</span>
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-text-muted shrink-0 whitespace-nowrap">
              <Database className="w-3.5 h-3.5 text-text-muted" />
              <span>Autozapis</span>
            </span>
          </div>
          <button
            onClick={() => toggleSecurityInfo(true)}
            className="flex items-center gap-1 text-xs text-text-muted hover:underline active:scale-[0.98] transition-all font-bold cursor-pointer shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-focus-ring"
            id="btn-security-details"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Szczegóły ochrony</span>
          </button>
        </div>

        {apiError && (
          <div className="bg-danger-subtle border-b border-danger/20 px-6 py-3 flex items-center justify-between text-danger text-xs animate-fade-in shrink-0" id="api-error-banner">
            <div className="flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              <span className="font-bold">{apiError}</span>
            </div>
            <button onClick={() => setApiError(null)} className="text-danger hover:text-danger/80 active:scale-[0.98] transition-all font-bold text-sm shrink-0 leading-none cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring" aria-label="Zamknij błąd">
              &times;
            </button>
          </div>
        )}

        {/* ACTIVE MODULE VIEW CANVAS */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6" id="canvas-view">
          {children}
        </div>
      </main>

      {/* Floating Action Button for AI Chat */}
      {onOpenAiChatModal && canUseAiChat && activeProfile && !isProfileLocked && (
        <button
          onClick={onOpenAiChatModal}
          className="fixed bottom-6 right-6 z-40 bg-brand text-text-inverse p-4 rounded-full shadow-lg hover:bg-brand-hover active:scale-[0.98] hover:scale-105 transition-all focus-visible:ring-4 focus-visible:ring-focus-ring group cursor-pointer"
          title="Porozmawiaj z Asystentem AI"
          aria-label="Porozmawiaj z Asystentem AI"
        >
          <Sparkles className="w-6 h-6 animate-pulse" />
          <span className="absolute -top-10 right-0 bg-surface-offset text-text-main text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Asystent AI</span>
        </button>
      )}

      {/* Command Palette Modal */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        activeProfile={activeProfile}
        profiles={state?.profiles || []}
        activeView={activeView}
        setActiveView={setActiveView}
        onSelectProfile={(id) => handleSelectProfile(id)}
        onOpenTransactionModal={(tx) => openModal("transaction", tx)}
        onOpenPaymentModal={() => openModal("payment")}
        onOpenGoalModal={() => openModal("goal")}
        onExportData={handleExportData}
        theme={theme === "dark" ? "dark" : "light"}
        onToggleTheme={() => handleThemeChange(theme === "dark" ? "light" : "dark")}
      />

    </div>
  );
}

