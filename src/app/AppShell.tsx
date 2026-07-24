import { useApp } from "./providers/AppContext";
import React, { useState } from "react";
import { AppView, Profile } from "../types";
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
  Info
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
    activeView, setActiveView,
    activeProfile,
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

  // Format active weekday date for header
  const getTodayFormatted = () => {
    return new Intl.DateTimeFormat("pl-PL", {
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(new Date()).toUpperCase();
  };

  return (
    <div className="flex h-screen bg-[#f6f8f7] overflow-hidden font-sans" id="app-root-shell">
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR CONTAINER */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-white border-r border-gray-200 p-6 transition-transform lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        id="sidebar-panel"
      >
        {/* Brand */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-2xl font-black text-[#153a35] tracking-tight">
            <span className="flex items-center justify-center bg-[#137566] text-white rounded-xl w-8 h-8 shadow-sm">
              <Wallet className="w-5 h-5" />
            </span>
            <span>saldo</span>
          </div>
          <button className="lg:hidden p-1 rounded-lg hover:bg-gray-100" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>


        {/* Navigation Items */}
        <nav className="flex-1 space-y-1" aria-label="Główna nawigacja">
          <button
            onClick={() => {
              setActiveView("dashboard");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === "dashboard" ? "bg-[#e7f3f0] text-[#137566]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
            id="nav-dashboard"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            Przegląd
          </button>

          <button
            onClick={() => {
              setActiveView("transactions");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === "transactions" ? "bg-[#e7f3f0] text-[#137566]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
            id="nav-transactions"
          >
            <History className="w-4 h-4 shrink-0" />
            Transakcje
          </button>

          <button
            onClick={() => {
              setActiveView("payments");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === "payments" ? "bg-[#e7f3f0] text-[#137566]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
            id="nav-payments"
          >
            <span className="flex items-center gap-3">
              <Clock className="w-4 h-4 shrink-0" />
              Płatności
            </span>
            {activeProfile && activeProfile.payments.filter((p) => p.status !== "Opłacono").length > 0 && (
              <span className="bg-rose-100 text-[#d55e50] text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                {activeProfile.payments.filter((p) => p.status !== "Opłacono").length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveView("budget");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === "budget" ? "bg-[#e7f3f0] text-[#137566]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
            id="nav-budget"
          >
            <Wallet className="w-4 h-4 shrink-0" />
            Budżet
          </button>

          <button
            onClick={() => {
              setActiveView("goals");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === "goals" ? "bg-[#e7f3f0] text-[#137566]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
            id="nav-goals"
          >
            <Target className="w-4 h-4 shrink-0" />
            Cele i oszczędności
          </button>

          <button
            onClick={() => {
              setActiveView("analysis");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === "analysis" ? "bg-[#e7f3f0] text-[#137566]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
            id="nav-analysis"
          >
            <LineChart className="w-4 h-4 shrink-0" />
            Analizy
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-gray-150 pt-4 mt-auto">
          <button
            onClick={() => {
              setActiveView("help");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeView === "help" ? "bg-[#e7f3f0] text-[#137566]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
            id="nav-help"
          >
            <Info className="w-4 h-4 shrink-0" />
            Pomoc
          </button>

          <button
            onClick={() => {
              setActiveView("settings");
              setIsMobileMenuOpen(false);
            }}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold mb-3 transition ${
              activeView === "settings" ? "bg-[#e7f3f0] text-[#137566]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
            id="nav-settings"
          >
            <Settings className="w-4 h-4 shrink-0" />
            Ustawienia
          </button>

          <button
            onClick={() => {
              openModal("changelog");
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center justify-between w-full px-4 py-2 mb-3 bg-gray-50 border border-gray-150 rounded-xl hover:bg-gray-100 transition group"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-gray-700 group-hover:text-gray-900">Co nowego?</span>
            </div>
          </button>

          {activeProfile && (
            <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-150 rounded-2xl">
              <span className="w-8 h-8 rounded-full bg-[#d7e8e3] text-[#137566] text-sm font-black flex items-center justify-center select-none shadow-inner shrink-0">
                {activeProfile.avatar || activeProfile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
              </span>
              <div className="min-w-0 text-left">
                <p className="text-xs font-black text-gray-800 truncate" id="profile-tag-name">{activeProfile.name}</p>
                <span className="text-[10px] text-gray-400 block truncate">
                  {activeProfile.kind === "shared" ? `👪 Budżet wspólny · ${activeProfile.name} + ${activeProfile.partnerName || 'Partner'}` : "👤 Budżet osobisty"}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN VIEWPORT PANEL */}
      <main className="flex-1 flex flex-col h-full overflow-hidden" id="main-viewport-panel">
        {/* Demo Mode Top Banner */}
        {isDemoMode && showDemoBanner && (
          <div className="bg-[#137566]/10 text-[#137566] border-b border-[#137566]/20 px-6 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 z-20">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 shrink-0" />
              <div className="text-xs">
                <span className="font-bold">Tryb Lokalne Saldo</span> – dane są zapisywane prywatnie w pamięci urządzenia.
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setIsDemoMode(false)}
                className="flex-1 sm:flex-none bg-[#137566] text-white font-bold py-1.5 px-4 rounded-lg text-xs hover:bg-[#0f5d51] transition shadow-sm whitespace-nowrap"
              >
                Zaloguj się z Google
              </button>
              <button
                onClick={() => setShowDemoBanner(false)}
                className="p-1 text-[#137566] hover:bg-[#137566]/20 rounded-md transition"
                title="Ukryj"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TOP BAR HEADER */}
        <header className="flex items-center justify-between bg-white border-b border-gray-200 px-6 py-4 shrink-0 shadow-sm z-10" id="top-bar-header">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1 rounded-lg border border-gray-200 hover:bg-gray-100 lg:hidden"
              id="btn-open-mobile-menu"
            >
              <Menu className="w-5 h-5 text-[#153a35]" />
            </button>
            <div>
              <p className="text-[10px] font-bold text-[#849590] tracking-widest uppercase">{getTodayFormatted()}</p>
              <h1 className="text-lg md:text-xl font-bold text-[#153a35] tracking-tight">
                {activeView === "dashboard" && "Dzień dobry"}
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

          <div className="flex items-center gap-2">
            {!isOnline ? (
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full font-bold border border-amber-100">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Tryb offline</span>
              </div>
            ) : isSyncing ? (
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full font-bold border border-blue-100">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Synchronizacja...</span>
              </div>
            ) : isDemoMode ? (
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 px-3 py-1.5 rounded-full font-bold border border-purple-100">
                <Database className="w-3.5 h-3.5" />
                <span>Tryb demonstracyjny</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full font-bold border border-emerald-100">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zsynchronizowany</span>
              </div>
            )}
            {activeProfile && !isProfileLocked && (
              <button
                onClick={onQuickAdd}
                className="bg-[#137566] text-white font-bold py-2 px-4 rounded-lg hover:bg-[#0f5d51] transition shadow-md text-xs"
                id="btn-quick-add-tx"
              >
                ＋ Dodaj wpis
              </button>
            )}
          </div>
        </header>

        {/* Slim Status and Security Bar */}
        <div
          className={`text-[11px] md:text-xs px-6 py-2 border-b flex flex-wrap items-center justify-between gap-3 transition-all duration-300 shrink-0 ${
            isOnline
              ? "bg-emerald-50/50 border-emerald-100 text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-100"
              : "bg-amber-50/90 border-amber-200 text-amber-950 dark:bg-amber-950/30 dark:border-amber-900/40 dark:text-amber-100"
          }`}
          id="offline-worker-status-banner"
        >
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-bold">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
              )}
              <span>{isOnline ? "System Online" : "System Offline"}</span>
            </span>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <span className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden xs:inline">Bezpieczeństwo:</span>
              <span className="font-medium">Ochrona aktywna</span>
            </span>
            <span className="text-gray-300 dark:text-gray-700 hidden sm:inline">|</span>
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400">
              <Database className="w-3.5 h-3.5 text-[#137566] dark:text-[#209f8c]" />
              <span>Autozapis</span>
            </span>
          </div>
          <button
            onClick={() => toggleSecurityInfo(true)}
            className="flex items-center gap-1 text-[11px] text-[#137566] dark:text-[#209f8c] hover:underline font-bold cursor-pointer"
            id="btn-security-details"
          >
            <Info className="w-3.5 h-3.5" />
            <span>Szczegóły ochrony</span>
          </button>
        </div>

        {apiError && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-center justify-between text-rose-800 text-xs animate-fade-in shrink-0" id="api-error-banner">
            <div className="flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              <span className="font-semibold">{apiError}</span>
            </div>
            <button onClick={() => setApiError(null)} className="text-rose-500 hover:text-rose-700 font-bold text-sm shrink-0 leading-none">
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
          className="fixed bottom-6 right-6 z-40 bg-[#137566] text-white p-4 rounded-full shadow-lg hover:bg-[#1a9c88] hover:scale-105 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-200 group cursor-pointer"
          title="Porozmawiaj z Asystentem AI"
        >
          <Sparkles className="w-6 h-6 animate-pulse" />
          <span className="absolute -top-10 right-0 bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Asystent AI</span>
        </button>
      )}

    </div>
  );
}

