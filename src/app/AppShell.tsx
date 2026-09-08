
import { useApp } from "./providers/AppContext";
import React, { useState, useEffect, Suspense, lazy } from "react";
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
  FileSpreadsheet
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);

  // Zamknij menu profilu po kliknięciu poza nim lub klawiszem Escape
  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isProfileMenuOpen]);

  const handleLogoutClick = async () => {
    setIsProfileMenuOpen(false);
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

          <button
            onClick={() => {
              setActiveView("debts");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              activeView === "debts" ? "bg-brand-subtle text-brand border border-brand/20" : "text-text-muted hover:text-text-main hover:bg-surface-2"
            }`}
            id="nav-debts"
          >
            <Landmark className="w-4 h-4 shrink-0" />
            {"Kredyty i Hipoteka"}
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
            <div className="relative" ref={profileMenuRef}>
              {isProfileMenuOpen && (
                <div
                  className="absolute bottom-full left-0 right-0 mb-2 bg-surface border border-border rounded-2xl shadow-lg overflow-hidden py-1.5 z-10"
                  role="menu"
                  id="profile-account-menu"
                >
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      handleSwitchProfile();
                      setIsMobileMenuOpen(false);
                    }}
                    role="menuitem"
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-bold text-text-main hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                    id="btn-switch-profile"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-brand shrink-0" />
                    Przełącz profil
                  </button>
                  {googleUser && (
                    <button
                      onClick={handleLogoutClick}
                      role="menuitem"
                      className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-bold text-danger hover:bg-danger-subtle transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                      id="btn-header-logout"
                    >
                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                      Wyloguj z konta Google
                    </button>
                  )}
                </div>
              )}
              <button
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-3 w-full px-3 py-2 bg-surface/30 border border-border rounded-2xl hover:bg-surface-2 hover:border-brand/30 active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring group"
                id="btn-profile-menu-trigger"
                title="Menu konta"
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
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
            </div>
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
        <header className="flex items-center justify-between bg-surface backdrop-blur-md border-b border-border/50 px-4 sm:px-6 py-3 sm:py-4 shrink-0 shadow-sm z-10 gap-3 sm:gap-4" id="top-bar-header">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-xl border border-border hover:bg-surface-offset active:scale-[0.98] transition-all lg:hidden shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="btn-open-mobile-menu"
              aria-label="Otwórz menu"
            >
              <Menu className="w-5 h-5 text-text-main" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-bold text-text-faint tracking-widest uppercase truncate" title={getTodayFormatted()}>{getTodayFormatted()}</p>
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-text-main tracking-tight truncate">
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
              className="flex items-center gap-2 py-2 px-2.5 sm:px-3 bg-surface border border-border hover:bg-surface-2 hover:border-brand/30 text-text-muted hover:text-text-main text-xs font-medium rounded-xl active:scale-[0.98] transition-all cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="btn-open-command-palette"
              title="Wyszukaj lub uruchom polecenie (⌘K / /)"
              aria-label="Wyszukaj lub uruchom polecenie"
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
                className="flex items-center gap-1.5 py-2 px-2.5 sm:px-3 bg-surface border border-border hover:bg-surface-2 hover:border-brand/30 text-text-main font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring group"
                id="btn-header-switch-profile"
                title="Przełącz profil"
                aria-label="Przełącz profil"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-brand group-hover:rotate-180 transition-transform duration-300" />
                <span className="hidden sm:inline">Przełącz profil</span>
              </button>
            )}
            {activeProfile && (
              <button
                onClick={() => openModal("exportReports")}
                className="flex items-center gap-1.5 py-2 px-2.5 sm:px-3 bg-surface border border-border hover:bg-surface-2 hover:border-brand/30 text-text-main font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring"
                id="btn-header-export-reports"
                title="Eksport i raporty (PDF, CSV, Backup)"
                aria-label="Otwórz centrum raportów i eksportu"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-brand" />
                <span className="hidden md:inline">Raporty</span>
              </button>
            )}
            {activeProfile && !isProfileLocked && (
              <button
                onClick={onQuickAdd}
                className="bg-brand text-text-inverse font-bold py-2 px-3 sm:px-4 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-md text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring whitespace-nowrap"
                id="btn-quick-add-tx"
                aria-label="Dodaj nową transakcję"
              >
                ＋ Dodaj wpis
              </button>
            )}
          </div>
        </header>

        {/* Slim Status and Security Bar */}
        <div
          className={`text-xs px-4 sm:px-6 py-1.5 sm:py-2 border-b flex flex-wrap items-center justify-between gap-2 sm:gap-3 transition-all duration-300 shrink-0 ${
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
          <div
            className="bg-danger-subtle border-b border-danger/20 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between text-danger text-xs animate-fade-in shrink-0"
            id="api-error-banner"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm shrink-0">⚠️</span>
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
            />
          </Suspense>
        </ErrorBoundary>
      )}

    </div>
  );
}

