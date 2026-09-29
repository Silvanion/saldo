import React, { useState } from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  History,
  Clock,
  WalletCards,
  Target,
  LineChart,
  Settings,
  X,
  Sparkles,
  Landmark,
  Info,
  Bug,
  PiggyBank,
  Calculator,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { useApp } from "./providers/AppContext";
import type { AppView, ModalType } from "../uiTypes";

interface NavEntry {
  id: string;
  label: string;
  icon: LucideIcon;
  // Dokładnie jedno z dwóch: widok w miejscu lub modal otwierany z menu.
  view?: AppView;
  modal?: ModalType;
}

interface NavGroup {
  title: string;
  items: NavEntry[];
}

// Jedno źródło prawdy dla całej nawigacji. Id `nav-<widok>` są używane przez testy e2e.
const NAV_GROUPS: NavGroup[] = [
  {
    title: "Codzienne",
    items: [
      { id: "nav-dashboard", label: "Przegląd", icon: LayoutDashboard, view: "dashboard" },
      { id: "nav-transactions", label: "Historia", icon: History, view: "transactions" },
      { id: "nav-payments", label: "Płatności", icon: Clock, view: "payments" }
    ]
  },
  {
    title: "Planowanie",
    items: [
      { id: "nav-budget", label: "Budżet", icon: WalletCards, view: "budget" },
      { id: "nav-goals", label: "Cele i oszczędności", icon: Target, view: "goals" },
      { id: "nav-analysis", label: "Analiza", icon: LineChart, view: "analysis" }
    ]
  },
  {
    title: "Majątek",
    items: [
      { id: "nav-networth", label: "Majątek netto", icon: PiggyBank, view: "netWorth" },
      { id: "nav-debts", label: "Kredyty i Hipoteka", icon: Landmark, view: "debts" },
      { id: "nav-b2b-tax", label: "Podatki B2B", icon: Calculator, modal: "b2bTax" }
    ]
  }
];

const FOOTER_ITEMS: NavEntry[] = [
  { id: "nav-help", label: "Pomoc", icon: Info, view: "help" },
  { id: "nav-settings", label: "Ustawienia", icon: Settings, view: "settings" }
];

const COLLAPSED_STORAGE_KEY = "saldo.sidebarCollapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

// Etykiety znikają płynnie tylko na desktopie (lg+); w szufladzie mobilnej
// menu jest zawsze rozwinięte.
const labelClass = (collapsed: boolean) =>
  `overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-200 motion-reduce:transition-none ${
    collapsed ? "lg:max-w-0 lg:opacity-0" : "max-w-[200px] opacity-100"
  }`;

export function Sidebar({ isElectron }: { isElectron: boolean }) {
  const { activeView, setActiveView, activeProfile, isMobileMenuOpen, setIsMobileMenuOpen, openModal } = useApp();
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // brak localStorage — stan zwinięcia po prostu nie przetrwa restartu
    }
  };

  const unpaidCount = activeProfile ? activeProfile.payments.filter((p) => p.status !== "Opłacono").length : 0;

  const renderEntry = (entry: NavEntry) => {
    const Icon = entry.icon;
    const isActive = entry.view !== undefined && activeView === entry.view;
    const badge = entry.view === "payments" && unpaidCount > 0 ? unpaidCount : 0;
    return (
      <button
        key={entry.id}
        id={entry.id}
        title={collapsed ? entry.label : undefined}
        aria-label={entry.label}
        aria-current={isActive ? "page" : undefined}
        onClick={() => {
          if (entry.view) setActiveView(entry.view);
          else if (entry.modal) openModal(entry.modal as Exclude<ModalType, null>);
          setIsMobileMenuOpen(false);
        }}
        className={`relative flex items-center justify-between w-full px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-bold active:scale-[0.98] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
          collapsed ? "lg:justify-center lg:px-0" : ""
        } ${isActive ? "text-brand" : "text-text-muted hover:text-text-main hover:bg-surface-2"}`}
      >
        {isActive && (
          <motion.span
            layoutId="activeSidebarPill"
            className="absolute inset-0 bg-brand-subtle rounded-xl border border-brand/20 -z-0"
            transition={{ type: "spring", stiffness: 420, damping: 35 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-3">
          <Icon className="w-4 h-4 shrink-0" />
          <span className={labelClass(collapsed)}>{entry.label}</span>
        </span>
        {badge > 0 && (
          <span
            className={`relative z-10 bg-danger-subtle text-danger text-xs font-black px-2 py-0.5 rounded-full shrink-0 ${
              collapsed ? "lg:absolute lg:top-1 lg:right-1 lg:px-1.5 lg:text-[10px]" : ""
            }`}
          >
            {badge}
          </span>
        )}
      </button>
    );
  };

  const renderQuickAction = (id: string, label: string, Icon: LucideIcon, tone: string, modal: "bugReport" | "changelog") => (
    <button
      key={id}
      id={id}
      title={label}
      aria-label={label}
      onClick={() => {
        openModal(modal);
        setIsMobileMenuOpen(false);
      }}
      className="flex items-center justify-center flex-1 h-9 bg-surface-2/60 border border-border/70 rounded-xl hover:bg-surface-2 active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
    >
      <span className={`w-6 h-6 rounded-lg flex items-center justify-center border ${tone}`}>
        <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
      </span>
    </button>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-bg-base/95 backdrop-blur-2xl border-r border-border/50 p-6 transition-[transform,width,padding] duration-200 motion-reduce:transition-none lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-[76px] lg:p-3" : "lg:w-64"} ${isElectron ? "pt-12 lg:pt-12" : ""}`}
        id="sidebar-panel"
        data-collapsed={collapsed}
      >
        {/* Brand */}
        <div
          className={`flex items-center justify-between ${collapsed ? "mb-4 lg:flex-col lg:gap-2" : "mb-8"} ${
            isElectron ? "[-webkit-app-region:drag]" : ""
          }`}
        >
          <div className="flex items-center gap-2 text-2xl font-black text-text-main tracking-tight">
            <span className="flex items-center justify-center bg-brand-subtle text-brand rounded-xl w-8 h-8 shadow-sm border border-brand/20 shrink-0">
              <WalletCards className="w-5 h-5" />
            </span>
            <span className={labelClass(collapsed)}>saldo</span>
          </div>
          <button
            className="lg:hidden p-1 rounded-xl hover:bg-surface-2 active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring [-webkit-app-region:no-drag]"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Zamknij menu"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
          <button
            className="hidden lg:flex p-1.5 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-2 active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring [-webkit-app-region:no-drag]"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Rozwiń menu boczne" : "Zwiń menu boczne"}
            aria-expanded={!collapsed}
            id="sidebar-collapse-toggle"
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden" aria-label="Główna nawigacja">
          {NAV_GROUPS.map((group, index) => (
            <div key={group.title} className={index > 0 ? "mt-4" : ""} role="group" aria-label={group.title}>
              <p
                className={`px-4 mb-1 text-[11px] font-bold uppercase tracking-wider text-text-muted/70 ${labelClass(collapsed)} ${
                  collapsed ? "lg:hidden" : ""
                }`}
              >
                {group.title}
              </p>
              {collapsed && index > 0 && <div className="hidden lg:block mx-3 mb-2 border-t border-border/50" />}
              <div className="space-y-1">{group.items.map(renderEntry)}</div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-border pt-4 mt-4">
          <div className="space-y-1 mb-2">{FOOTER_ITEMS.map(renderEntry)}</div>
          <div className={`flex gap-2 ${collapsed ? "lg:flex-col" : ""}`}>
            {renderQuickAction("nav-bug-report", "Zgłoś błąd", Bug, "bg-orange-500/10 text-orange-500 border-orange-500/20", "bugReport")}
            {renderQuickAction("nav-changelog", "Co nowego?", Sparkles, "bg-brand-subtle text-brand border-brand/20", "changelog")}
          </div>
        </div>
      </aside>
    </>
  );
}
