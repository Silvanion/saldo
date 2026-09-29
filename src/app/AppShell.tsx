
import { useApp } from "./providers/AppContext";
import React, { useState, useEffect, Suspense, lazy } from "react";
import { Profile } from "../types";
import { AppView } from "../uiTypes";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ModalFallback } from "../components/ModalFallback";
import { ProfileDropdown } from "../components/profile/ProfileDropdown";
import { UpdateToast } from "../components/update/UpdateToast";
import { Sidebar } from "./Sidebar";
import { useWindowScale } from "../services/WindowScaleManager";

const CommandPaletteModal = lazy(() => import("../components/CommandPaletteModal").then(m => ({ default: m.CommandPaletteModal })));
import {
  Menu,
  X,
  RefreshCw,
  Sparkles,
  Wifi,
  WifiOff,
  ShieldCheck,
  Database,
  ArrowLeftRight,
  LogOut,
  Search,
  FileSpreadsheet,
  Plus,
  ChevronDown,
  AlertTriangle
} from "lucide-react";


const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron');

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
    setPendingImportFile,
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

  useWindowScale();

  const [showDemoBanner, setShowDemoBanner] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTopUserMenuOpen, setIsTopUserMenuOpen] = useState(false);

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

  // Desktop IPC listeners (global shortcut, system tray, preferences menu)
  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubAddExpense = window.electronAPI.onOpenAddExpense?.(() => {
      openModal("transaction");
    });

    const unsubPreferences = window.electronAPI.onOpenPreferences?.(() => {
      setActiveView("settings");
    });

    // Statement file opened via Finder/Explorer "Open with", a Dock/taskbar
    // drop, or double-click while the app is already running.
    const unsubImportFile = window.electronAPI.onImportFileDropped?.(({ name, bytes }) => {
      const file = new File([new Uint8Array(bytes)], name);
      setActiveView("transactions");
      setPendingImportFile(file);
    });

    return () => {
      unsubAddExpense?.();
      unsubPreferences?.();
      unsubImportFile?.();
    };
  }, [openModal, setActiveView, setPendingImportFile]);

  // Statement file (CSV/PDF) dragged from the OS straight onto the app
  // window while it's running — distinct from the modal's own dropzone,
  // which only reacts once the import modal is already open.
  useEffect(() => {
    const isImportableFile = (file: File) => /\.(csv|pdf)$/i.test(file.name);

    const handleWindowDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        e.preventDefault();
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      const file = e.dataTransfer?.files?.[0];
      if (file && isImportableFile(file)) {
        e.preventDefault();
        setActiveView("transactions");
        setPendingImportFile(file);
      } else if (e.dataTransfer?.types.includes("Files")) {
        // Prevent Electron/Chromium from navigating the window to the
        // dropped file for unsupported types too.
        e.preventDefault();
      }
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);
    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, [setActiveView, setPendingImportFile]);

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

      <Sidebar isElectron={isElectron} />

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
        <header className={`flex items-center justify-between bg-surface/90 backdrop-blur-md border-b border-border/60 px-4 sm:px-6 py-2.5 sm:py-3 shrink-0 shadow-2xs z-20 gap-3 ${isElectron ? "[-webkit-app-region:drag] pl-[72px] lg:pl-6" : ""}`} id="top-bar-header">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 rounded-lg border border-border hover:bg-surface-offset active:scale-[0.98] transition-all lg:hidden shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring [-webkit-app-region:no-drag]"
              id="btn-open-mobile-menu"
              aria-label="Otwórz menu"
            >
              <Menu className="w-5 h-5 text-text-main" strokeWidth={1.75} />
            </button>
            <div className="min-w-0">
              <p className="hidden sm:block text-[10px] sm:text-xs font-semibold text-text-faint tracking-wider uppercase truncate" title={getTodayFormatted()}>{getTodayFormatted()}</p>
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
              className="flex items-center gap-2 py-1.5 px-2.5 sm:px-3 bg-surface border border-border/70 hover:bg-surface-2 hover:border-brand/30 text-text-muted hover:text-text-main text-xs font-medium rounded-lg active:scale-[0.98] transition-all cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-focus-ring [-webkit-app-region:no-drag]"
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand/20 bg-brand-subtle px-2.5 py-1.5 text-xs font-semibold text-brand transition-all hover:bg-brand/15 disabled:cursor-not-allowed disabled:opacity-50 [-webkit-app-region:no-drag]"
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
              <ProfileDropdown
                activeProfile={activeProfile}
                isOpen={isTopUserMenuOpen}
                onClose={() => setIsTopUserMenuOpen(false)}
                onToggle={() => setIsTopUserMenuOpen((prev) => !prev)}
                onSwitchProfile={handleSwitchProfile}
                onExportReports={() => openModal("exportReports")}
                isDemoMode={isDemoMode}
                onToggleDemoMode={() => setIsDemoMode(!isDemoMode)}
                onOpenSecurityInfo={() => toggleSecurityInfo(true)}
                googleUser={googleUser}
                onLogoutGoogle={handleLogoutClick}
              />
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

      {/* Floating non-blocking update notification widget */}
      <UpdateToast />
    </div>
  );
}
