import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Sparkles,
  TrendingDown,
  ShieldCheck,
  Receipt,
  PieChart,
  CheckCircle2,
  Circle,
  Trash2,
  ArrowRight,
  ListTodo,
  Brain,
  Check,
  Clock,
  Coins,
} from "lucide-react";
import { Profile, FinancialActionPlan } from "../../types";
import {
  getAvailableFinancialSkills,
  FinancialSkillMetadata,
} from "../../services/financialSkills";
import { formatMoney } from "../../utils";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export interface FinancialSkillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  onSavePlan: (plan: FinancialActionPlan) => void;
  onTogglePlanItem: (planId: string, itemId: string) => void;
  onDeletePlan: (planId: string) => void;
}

export function FinancialSkillsModal({
  isOpen,
  onClose,
  profile,
  onSavePlan,
  onTogglePlanItem,
  onDeletePlan,
}: FinancialSkillsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const [activeTab, setActiveTab] = useState<"catalog" | "plans">("catalog");
  const [justGeneratedId, setJustGeneratedId] = useState<string | null>(null);

  const skills = getAvailableFinancialSkills();
  const cur = profile.currency || "PLN";
  const userPlans = profile.financialPlans || [];

  if (!isOpen) return null;

  const handleRunSkill = (skill: FinancialSkillMetadata) => {
    const plan = skill.generatePlan(profile);
    onSavePlan(plan);
    setJustGeneratedId(plan.id);
    setActiveTab("plans");
  };

  const renderSkillIcon = (iconName: string) => {
    switch (iconName) {
      case "TrendingDown":
        return <TrendingDown className="w-5 h-5 text-rose-500" />;
      case "ShieldCheck":
        return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      case "Receipt":
        return <Receipt className="w-5 h-5 text-amber-500" />;
      case "PieChart":
        return <PieChart className="w-5 h-5 text-brand" />;
      default:
        return <Brain className="w-5 h-5 text-brand" />;
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="financial-skills-modal-title"
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-surface border border-border/70 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border/60 bg-surface-2/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-subtle text-brand border border-brand/20">
                <Brain className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    id="financial-skills-modal-title"
                    className="text-lg sm:text-xl font-bold text-text-main tracking-tight"
                  >
                    Centrum Umiejętności Finansowych
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-subtle text-brand border border-brand/20">
                    Claude Skills
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Autonomiczne plany działania, audyty kosztów i checklisty realizacji krok po kroku
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              aria-label="Zamknij modal umiejętności"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-border/50 bg-surface text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === "catalog"
                  ? "bg-brand text-white shadow-xs"
                  : "text-text-muted hover:text-text-main hover:bg-surface-2"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Katalog Umiejętności ({skills.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("plans")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === "plans"
                  ? "bg-brand text-white shadow-xs"
                  : "text-text-muted hover:text-text-main hover:bg-surface-2"
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Moje Plany Działań ({userPlans.length})</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            {activeTab === "catalog" && (
              <div className="space-y-4">
                <div className="bg-surface-2/40 border border-border/60 rounded-xl p-4 text-xs text-text-muted flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <p>
                    Wybierz umiejętność, aby przeanalizować Twoje finanse w profilu <strong>{profile.name}</strong> i
                    stworzyć wieloetapowy, interaktywny plan z listą zadań do realizacji.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="bg-surface border border-border/70 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4 transition-all hover:border-brand/50 group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-surface-2 border border-border/60 group-hover:border-brand/40 transition-colors">
                              {renderSkillIcon(skill.iconName)}
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-text-main group-hover:text-brand transition-colors">
                                {skill.name}
                              </h3>
                              <span className="text-[10px] font-semibold text-text-muted">
                                {skill.badge}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-text-muted leading-relaxed">
                          {skill.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRunSkill(skill)}
                        className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-brand text-white hover:bg-brand/90 transition-colors shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                      >
                        <span>Uruchom umiejętność i stwórz plan</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "plans" && (
              <div className="space-y-6">
                {userPlans.length === 0 ? (
                  <div className="text-center py-12 px-4 border border-dashed border-border/80 rounded-2xl">
                    <ListTodo className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-60" />
                    <h3 className="text-base font-bold text-text-main">Brak aktywnych planów działania</h3>
                    <p className="text-xs text-text-muted max-w-md mx-auto mt-1 mb-5">
                      Nie utworzyłeś jeszcze żadnego planu. Przejdź do katalogu umiejętności, aby wygenerować plan
                      dopasowany do Twojego budżetu.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("catalog")}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-brand text-white hover:bg-brand/90 transition-colors cursor-pointer"
                    >
                      Przejdź do katalogu umiejętności
                    </button>
                  </div>
                ) : (
                  userPlans.map((plan) => {
                    const completedCount = plan.items.filter((i) => i.completed).length;
                    const totalCount = plan.items.length;
                    const progressPercent =
                      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                    const isFullyCompleted = completedCount === totalCount && totalCount > 0;

                    return (
                      <div
                        key={plan.id}
                        className={`bg-surface border rounded-2xl p-5 shadow-xs transition-all ${
                          plan.id === justGeneratedId
                            ? "border-brand/70 ring-2 ring-brand/20"
                            : isFullyCompleted
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : "border-border/70"
                        }`}
                      >
                        {/* Plan Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm sm:text-base font-bold text-text-main">
                                {plan.title}
                              </h3>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                  isFullyCompleted
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                }`}
                              >
                                {isFullyCompleted ? "Ukończony (100%)" : "W toku"}
                              </span>
                              {plan.estimatedSavings && plan.estimatedSavings > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                  Szacowana oszczędność: {formatMoney(plan.estimatedSavings, cur)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-text-muted mt-1 leading-relaxed">
                              {plan.description}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => onDeletePlan(plan.id)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Usuń plan"
                            aria-label={`Usuń plan ${plan.title}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1.5 my-4">
                          <div className="flex justify-between text-xs font-semibold text-text-muted">
                            <span>Postęp realizacji</span>
                            <span>
                              {completedCount} z {totalCount} kroków ({progressPercent}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isFullyCompleted ? "bg-emerald-500" : "bg-brand"
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Checklist of Steps */}
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          {plan.items.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => onTogglePlanItem(plan.id, item.id)}
                              className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                item.completed
                                  ? "bg-surface-2/40 border-border/40 text-text-muted"
                                  : "bg-surface border-border/70 text-text-main hover:border-brand/40"
                              }`}
                            >
                              <div className="mt-0.5 shrink-0">
                                {item.completed ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <Circle className="w-4 h-4 text-text-muted" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span
                                  className={`text-xs font-semibold block ${
                                    item.completed ? "line-through opacity-70" : ""
                                  }`}
                                >
                                  {item.title}
                                </span>
                                {item.description && (
                                  <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
