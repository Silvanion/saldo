import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Profile, Transaction, Payment, RecurringRule } from "../types";
import { formatDate, getMonthName, iconByCategory, monthsPl, budgetCategories } from "../utils";
import { Wifi, WifiOff, Database, ShieldCheck, Settings, Move, Eye, EyeOff, ArrowUp, ArrowDown, Check, GripVertical, RotateCcw, X, Info } from "lucide-react";
import { useDashboardMetrics } from "../hooks/useDashboardMetrics";
import { StatsWidget, CashflowChartWidget, BillsWidget, BudgetWarningsWidget, ActivityWidget, SettlementWidget, PaymentsTimelineWidget } from "./dashboard";
import { formatMoney } from "../utils/format";

interface Widget {
  id: string;
  name: string;
  visible: boolean;
  icon: string;
}

interface DashboardViewProps {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  profile: Profile;
  selectedDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onTogglePaymentStatus: (paymentId: string) => void;
  onOpenTxModal: () => void;
  onOpenBudgetModal: () => void;
  onOpenPaymentModal: () => void;
  onChangeView: (view: string) => void;
  recurringRules?: RecurringRule[];
  onAddSettlement?: (entry: { amount: number; isoDate: string; note?: string }) => void;
  onDeleteSettlement?: (settlementId: string) => void;
}

export function DashboardView({
  showToast,
  profile,
  selectedDate,
  onPrevMonth,
  onNextMonth,
  onTogglePaymentStatus,
  onOpenTxModal,
  onOpenBudgetModal,
  onOpenPaymentModal,
  onChangeView,
  recurringRules = [],
  onAddSettlement,
  onDeleteSettlement
}: DashboardViewProps) {
  
  const metrics = useDashboardMetrics(profile, selectedDate, recurringRules);

  const DEFAULT_WIDGETS: Widget[] = [
    { id: "timeline", name: "Oś czasu płatności", visible: true, icon: "⏳" },
    { id: "bills", name: "Najbliższe opłaty i rachunki", visible: true, icon: "📅" },
    { id: "stats", name: "Podsumowanie finansowe (Przychody, Wydatki, Bilans)", visible: true, icon: "📊" },
    { id: "budget", name: "Plan budżetu i kategorie", visible: true, icon: "🎯" },
    { id: "chart", name: "Wykres przepływów (6-miesięczny)", visible: true, icon: "📈" },
    { id: "activity", name: "Ostatnie transakcje (Aktywność)", visible: true, icon: "⏱️" },
  ];

  const [widgets, setWidgets] = useState<Widget[]>(() => {
    const saved = localStorage.getItem("dashboard_widgets_v5");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_WIDGETS.length) {
          return parsed;
        }
      } catch (e) {
        // Fallback
      }
    }
    return DEFAULT_WIDGETS;
  });

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const saveWidgets = useCallback((newWidgets: Widget[]) => {
    setWidgets(newWidgets);
    localStorage.setItem("dashboard_widgets_v5", JSON.stringify(newWidgets));
  }, []);

  const handleToggleVisibility = useCallback((id: string) => {
    const updated = widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
    saveWidgets(updated);
  }, [widgets, saveWidgets]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const updated = [...widgets];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    saveWidgets(updated);
  }, [widgets, saveWidgets]);

  const handleMoveDown = useCallback((index: number) => {
    if (index === widgets.length - 1) return;
    const updated = [...widgets];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    saveWidgets(updated);
  }, [widgets, saveWidgets]);

  const handleResetWidgets = useCallback(() => {
    saveWidgets(DEFAULT_WIDGETS);
  }, [saveWidgets]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const draggedIdx = widgets.findIndex(w => w.id === draggedId);
    const targetIdx = widgets.findIndex(w => w.id === targetId);
    if (draggedIdx !== -1 && targetIdx !== -1) {
      const updated = [...widgets];
      const [draggedItem] = updated.splice(draggedIdx, 1);
      updated.splice(targetIdx, 0, draggedItem);
      setWidgets(updated);
    }
  }, [draggedId, widgets]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    localStorage.setItem("dashboard_widgets_v5", JSON.stringify(widgets));
  }, [widgets]);

  const currentYear = selectedDate.getFullYear();
  const currentMonthIdx = selectedDate.getMonth();

  return (
    <div className="flex-1 overflow-y-auto bg-bg-base text-text-main p-4 sm:p-6 lg:p-8 custom-scrollbar relative" id="dashboard-scroll-area">
      {/* Background Glowing Orbs for Glassmorphism (removed for solid light mode) */ }
      
      {/* Month Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 relative z-10">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-text-main" id="dash-month-title">
            {getMonthName(currentMonthIdx)} {currentYear}
          </h2>
          <p className="text-sm text-text-muted">Podsumowanie i wskaźniki dla tego miesiąca.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-surface rounded-xl border border-border shadow-sm overflow-hidden flex-1 sm:flex-none">
            <button
              onClick={onPrevMonth}
              className="px-4 py-2 hover:bg-surface-2 active:bg-surface-3 transition-colors text-text-muted hover:text-text-main font-bold border-r border-border cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="dash-prev-month"
            >
              ← Poprzedni
            </button>
            <button
              onClick={onNextMonth}
              className="px-4 py-2 hover:bg-surface-2 active:bg-surface-3 transition-colors text-text-muted hover:text-text-main font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="dash-next-month"
            >
              Następny →
            </button>
          </div>
          <button
            onClick={() => setIsCustomizerOpen(true)}
            className="p-2.5 bg-surface border border-border rounded-xl shadow-sm text-text-muted hover:text-text-main hover:bg-surface-2 active:scale-[0.98] transition-all cursor-pointer group focus-visible:ring-2 focus-visible:ring-focus-ring"
            title="Dostosuj ekran"
            aria-label="Dostosuj układ ekranu głównego"
          >
            <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
          </button>
        </div>
      </div>

      <SettlementWidget
        profile={profile}
        onAddSettlement={onAddSettlement}
        onDeleteSettlement={onDeleteSettlement}
        showToast={showToast}
      />

      {isEditMode && (
        <div className="bg-warning-subtle border border-warning/20 text-warning px-4 py-3 rounded-xl mb-6 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 relative z-10 ">
          <div className="flex items-center gap-3 min-w-0">
            <Move className="w-5 h-5 text-warning shrink-0" />
            <span className="text-sm font-bold truncate" title="Tryb edycji włączony. Możesz przeciągać kafelki, aby zmienić ich kolejność.">Tryb edycji włączony. Możesz przeciągać kafelki, aby zmienić ich kolejność.</span>
          </div>
          <button
            onClick={() => setIsEditMode(false)}
            className="px-3 py-1.5 bg-warning text-text-inverse rounded-lg text-xs font-bold hover:bg-warning/90 active:scale-[0.98] transition-all cursor-pointer shadow-sm shrink-0 ml-3 focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Zakończ
          </button>
        </div>
      )}

      {/* Flexible Masonry/Grid Layout for Widgets */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch relative z-0">
        {widgets.filter(w => w.visible || isEditMode).map((widget, index) => {
          let widgetContent = null;

          if (widget.id === "stats") {
            widgetContent = (
              <StatsWidget currency={profile?.currency || 'PLN'} 
                totalIncome={metrics.totalIncome}
                totalExpense={metrics.totalExpense}
                balance={metrics.balance}
                emergencyLimit={metrics.emergencyLimit}
                investmentCushion={metrics.investmentCushion}
                endOfMonthForecast={metrics.endOfMonthForecast}
                safeBreakdown={metrics.safeBreakdown}
                runway={metrics.runway}
                momTrends={metrics.momTrends}
                onChangeView={onChangeView}
              />
            );
          } else if (widget.id === "chart") {
            widgetContent = <CashflowChartWidget currency={profile.currency || 'PLN'} chartData={metrics.chartData} />;
          } else if (widget.id === "bills") {
            widgetContent = (
              <BillsWidget currency={profile.currency || 'PLN'} 
                unpaidPayments={metrics.unpaidPayments}
                urgentPaymentsCount={metrics.urgentPaymentsCount}
                onTogglePaymentStatus={onTogglePaymentStatus}
                onChangeView={onChangeView}
                onOpenPaymentModal={onOpenPaymentModal}
              />
            );
          } else if (widget.id === "timeline") {
            widgetContent = (
              <PaymentsTimelineWidget currency={profile.currency || 'PLN'}
                unpaidPayments={metrics.unpaidPayments}
                onTogglePaymentStatus={onTogglePaymentStatus}
                onChangeView={onChangeView}
              />
            );
          } else if (widget.id === "budget") {
            widgetContent = (
              <BudgetWarningsWidget currency={profile.currency || 'PLN'} 
                totalPlannedBudget={metrics.totalPlannedBudget}
                totalActualSpentInBudget={metrics.totalActualSpentInBudget}
                budgetWarnings={metrics.budgetWarnings}
                onChangeView={onChangeView}
                onOpenBudgetModal={onOpenBudgetModal}
              />
            );
          } else if (widget.id === "activity") {
            widgetContent = (
              <ActivityWidget currency={profile.currency} 
                profileKind={profile.kind}
                recentTransactions={metrics.recentTransactions}
                onChangeView={onChangeView}
                onOpenTxModal={onOpenTxModal}
              />
            );
          }

          if (!widgetContent) return null;

          const isFullWidth = widget.id === "stats";

          return (
            <motion.div
              key={widget.id}
              layout
              draggable={isEditMode}
              onDragStart={(e: any) => handleDragStart(e, widget.id)}
              onDragOver={(e: any) => handleDragOver(e, widget.id)}
              onDragEnd={handleDragEnd}
              className={`relative group h-full ${isFullWidth ? "xl:col-span-2" : ""} ${!widget.visible && isEditMode ? "opacity-40 grayscale" : ""} ${isEditMode ? "cursor-move" : ""}`}
              style={{ minHeight: isEditMode ? '100px' : 'auto' }}
            >
              {isEditMode && (
                <div className="absolute inset-0 bg-surface rounded-2xl border-2 border-white/20 z-20 pointer-events-none group-hover:border-white/40 transition flex items-start justify-between p-2">
                  <div className="bg-surface/90  p-1.5 rounded-lg shadow-sm border border-border flex items-center gap-1.5 text-text-main pointer-events-auto min-w-0">
                    <GripVertical className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider truncate" title={widget.name.split(' ')[0]}>{widget.name.split(' ')[0]}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 bg-surface/90  p-1 rounded-lg shadow-sm border border-border pointer-events-auto shrink-0 ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 text-text-muted transition cursor-pointer z-30 relative focus-visible:ring-2 focus-visible:ring-focus-ring"
                      title="Przesuń wyżej"
                      aria-label="Przesuń wyżej"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                      disabled={index === widgets.length - 1}
                      className="p-1 rounded hover:bg-surface-2 disabled:opacity-30 text-text-muted transition cursor-pointer z-30 relative focus-visible:ring-2 focus-visible:ring-focus-ring"
                      title="Przesuń niżej"
                      aria-label="Przesuń niżej"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleVisibility(widget.id); }}
                      className="p-1 rounded hover:bg-danger-subtle text-danger transition ml-1.5 cursor-pointer z-30 relative focus-visible:ring-2 focus-visible:ring-focus-ring"
                      title={widget.visible ? "Ukryj" : "Pokaż"}
                      aria-label={widget.visible ? "Ukryj widget" : "Pokaż widget"}
                    >
                      {widget.visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              <div className={isEditMode ? "p-1 opacity-70 transition-opacity h-full" : "transition-opacity h-full"}>
                {widgetContent}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Customizer Overlay Modal */}
      <AnimatePresence>
        {isCustomizerOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsCustomizerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-bg-base rounded-2xl max-w-lg w-full p-6 shadow-sm relative z-10 border border-border text-text-main"
            >
              <button
                onClick={() => setIsCustomizerOpen(false)}
                className="absolute top-4 right-4 p-1.5 text-text-faint hover:text-text-muted hover:bg-surface-2 active:scale-[0.98] transition-all cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-focus-ring"
                aria-label="Zamknij ustawienia ekranu"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center border border-border shrink-0 text-xl">
                  ⚙️
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-main">Dostosuj Ekran Główny</h3>
                  <p className="text-xs text-text-muted">Zarządzaj widocznością kafelków i ich kolejnością.</p>
                </div>
              </div>

              <div className="space-y-2.5 my-5 max-h-[350px] overflow-y-auto pr-1">
                {widgets.map((w, index) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-3.5 bg-surface/50 border border-border rounded-xl text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg bg-surface-2 w-8 h-8 rounded-lg shadow-xs flex items-center justify-center shrink-0">
                        {w.icon}
                      </span>
                      <span className="font-bold text-text-main text-xs sm:text-sm truncate" title={w.name}>
                        {w.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 pl-2">
                      <div className="flex items-center bg-surface-2 border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="p-1.5 hover:bg-surface-3 disabled:opacity-30 text-text-muted transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                          aria-label="Przesuń wyżej"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-4 bg-border" />
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === widgets.length - 1}
                          className="p-1.5 hover:bg-surface-3 disabled:opacity-30 text-text-muted transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                          aria-label="Przesuń niżej"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleToggleVisibility(w.id)}
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer flex items-center ${
                          w.visible ? "bg-brand justify-end" : "bg-surface-3 justify-start"
                        }`}
                        aria-label={w.visible ? "Ukryj widget" : "Pokaż widget"}
                      >
                        <motion.div
                          layout
                          className="bg-surface w-5 h-5 rounded-full shadow-md"
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-surface/50 border border-border p-4 rounded-xl flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Move className="w-5 h-5 text-text-muted shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-text-main">Tryb edycji na żywo</h4>
                    <p className="text-xs text-text-muted leading-relaxed">Pozwala układać elementy bezpośrednio na pulpicie za pomocą Drag & Drop.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsEditMode(!isEditMode);
                    setIsCustomizerOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold active:scale-[0.98] transition-all shadow-xs cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring ${
                    isEditMode
                      ? "bg-danger text-text-inverse hover:bg-danger/90"
                      : "bg-brand text-text-inverse hover:bg-brand-hover"
                  }`}
                >
                  {isEditMode ? "Wyłącz edycję" : "Włącz edycję"}
                </button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button
                  onClick={handleResetWidgets}
                  className="flex items-center gap-1 text-xs font-bold text-text-muted hover:text-text-main active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Domyślny układ</span>
                </button>
                <button
                  onClick={() => setIsCustomizerOpen(false)}
                  className="px-5 py-2.5 bg-brand text-text-inverse hover:bg-brand-hover rounded-xl text-xs font-bold shadow-md active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  Gotowe
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
