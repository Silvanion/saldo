import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Settings2, Trash2, Power, Filter, Sparkles, AlertCircle } from "lucide-react";
import { SmartRule } from "../../types";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export interface SmartRulesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: SmartRule[];
  onToggleRule: (ruleId: string, enabled: boolean) => void;
  onDeleteRule: (ruleId: string) => void;
  getCategoryName: (categoryId: string) => string;
}

export function SmartRulesManagerModal({
  isOpen,
  onClose,
  rules,
  onToggleRule,
  onDeleteRule,
  getCategoryName,
}: SmartRulesManagerModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

  if (!isOpen) return null;

  const sortedRules = [...(rules || [])].sort((a, b) => {
    // Sort by priority first (1 is highest), then by created date
    if (a.priority !== b.priority) {
      return (Number(a.priority) || 999) - (Number(b.priority) || 999);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const translateField = (field: string) => {
    switch (field) {
      case "name": return "Nazwa / Odbiorca";
      case "description": return "Opis";
      case "account": return "Konto";
      case "amount": return "Kwota";
      default: return field;
    }
  };

  const translateOperator = (operator: string) => {
    switch (operator) {
      case "contains": return "zawiera";
      case "equals": return "równa się";
      case "startsWith": return "zaczyna się od";
      case "greaterThan": return "większa niż";
      case "lessThan": return "mniejsza niż";
      default: return operator;
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.15 }}
          className="bg-surface border border-border/70 w-full max-w-3xl rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[90vh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="smart-rules-manager-title"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-border/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
                <Settings2 className="w-5 h-5" />
              </div>
              <div>
                <h2 id="smart-rules-manager-title" className="text-base sm:text-lg font-bold text-text-main">
                  Zarządzaj inteligentnymi regułami
                </h2>
                <p className="text-xs text-text-muted">
                  Przeglądaj, włączaj lub usuwaj reguły automatycznej kategoryzacji.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-xl transition cursor-pointer"
              aria-label="Zamknij menedżera"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List Content */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
            {sortedRules.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-xl bg-surface-hover flex items-center justify-center mb-4 border border-border/70">
                  <Sparkles className="w-8 h-8 text-text-muted" />
                </div>
                <h3 className="text-base font-semibold text-text-main mb-1">Brak reguł</h3>
                <p className="text-sm text-text-muted max-w-sm">
                  Nie masz jeszcze żadnych inteligentnych reguł. Reguły są tworzone automatycznie, gdy zmieniasz kategoryzację transakcji.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedRules.map((rule) => {
                  const isEnabled = rule.enabled !== false; // default true if undefined
                  const catName = getCategoryName(rule.action.categoryId);

                  return (
                    <div
                      key={rule.id}
                      className={`p-4 rounded-2xl border transition ${
                        isEnabled ? "bg-surface border-border hover:border-brand/30" : "bg-surface-hover border-transparent opacity-75"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <h4 className={`text-sm font-bold truncate ${isEnabled ? "text-text-main" : "text-text-muted"}`}>
                              {rule.name}
                            </h4>
                            {!isEnabled && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-text-muted/10 text-text-muted">
                                Wyłączona
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-surface-hover border border-border/50 rounded-md">
                              <Filter className="w-3 h-3" />
                              {translateField(rule.condition.field)}
                            </span>
                            <span>{translateOperator(rule.condition.operator)}</span>
                            <span className="font-semibold text-text-main break-all max-w-[200px] truncate" title={rule.condition.value}>
                              "{rule.condition.value}"
                            </span>
                            <span className="mx-1">→</span>
                            <span className="font-semibold px-1.5 py-0.5 rounded text-text-main bg-brand/5 border border-brand/10">
                              {catName}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => onToggleRule(rule.id, !isEnabled)}
                            className={`p-2 rounded-xl transition cursor-pointer flex items-center justify-center ${
                              isEnabled 
                                ? "text-brand hover:bg-brand/10 bg-brand/5" 
                                : "text-text-muted hover:text-text-main hover:bg-surface-hover bg-surface"
                            }`}
                            aria-label={isEnabled ? "Wyłącz regułę" : "Włącz regułę"}
                            title={isEnabled ? "Wyłącz regułę" : "Włącz regułę"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => setRuleToDelete(rule.id)}
                            className="p-2 rounded-xl text-status-expense hover:bg-status-expense/10 transition cursor-pointer flex items-center justify-center bg-surface"
                            aria-label="Usuń regułę"
                            title="Usuń regułę"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Delete Confirmation Modal inside the same Portal for simplicity */}
        <AnimatePresence>
          {ruleToDelete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center z-50 p-4 bg-black/40 backdrop-blur-xs"
            >
              <div
                className="bg-surface p-6 rounded-xl max-w-sm w-full border border-border/70 shadow-lg"
                role="dialog"
                aria-modal="true"
                aria-labelledby="smart-rules-delete-title"
              >
                <div className="flex items-center gap-3 mb-4 text-status-expense">
                  <div className="w-10 h-10 rounded-full bg-status-expense/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <h3 id="smart-rules-delete-title" className="text-lg font-bold text-text-main">Usuń regułę</h3>
                </div>
                <p className="text-text-muted text-sm mb-6">
                  Czy na pewno chcesz usunąć tę regułę? Transakcje już nią przypisane nie zmienią się. Tej akcji nie można cofnąć.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setRuleToDelete(null)}
                    className="px-4 py-2 rounded-xl font-bold text-text-muted hover:bg-surface-hover transition cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={() => {
                      onDeleteRule(ruleToDelete);
                      setRuleToDelete(null);
                    }}
                    className="px-4 py-2 rounded-xl font-bold bg-status-expense text-white hover:bg-red-600 transition shadow-sm cursor-pointer"
                  >
                    Usuń regułę
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
