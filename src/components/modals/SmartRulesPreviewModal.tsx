import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Check, ArrowRight, AlertCircle, ShieldCheck, Filter } from "lucide-react";
import { Transaction, SmartRule, SupportedCurrency } from "../../types";
import { previewSmartRules, SmartRuleMatchPreview } from "../../services/smartRules";
import { formatMoney } from "../../utils/format";
import { formatDate } from "../../utils";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export interface SmartRulesPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  rules: SmartRule[];
  onApply: (selectedTxIds: string[]) => void;
  currency?: SupportedCurrency;
}

export function SmartRulesPreviewModal({
  isOpen,
  onClose,
  transactions,
  rules,
  onApply,
  currency = "PLN",
}: SmartRulesPreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const preview = useMemo(() => {
    return previewSmartRules(transactions, rules);
  }, [transactions, rules]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Whenever preview results change, pre-select all proposed changes by default
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(preview.proposedChanges.map((p) => p.transactionId)));
    }
  }, [isOpen, preview]);

  const allSelected = preview.proposedChanges.length > 0 && selectedIds.size === preview.proposedChanges.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(preview.proposedChanges.map((p) => p.transactionId)));
    }
  };

  const handleToggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirmApply = () => {
    onApply(Array.from(selectedIds));
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs" id="smart-rules-preview-backdrop">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.15 }}
          className="bg-surface border border-border/70 w-full max-w-2xl rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[90vh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="smart-rules-preview-title"
          id="smart-rules-preview-modal"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-border/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-text-main" id="smart-rules-preview-title">
                  Podgląd reguł automatyzacji
                </h2>
                <p className="text-xs text-text-muted">
                  Sprawdź proponowane zmiany kategorii przed ich zastosowaniem.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-main rounded-xl hover:bg-surface-2 active:bg-surface-3 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              aria-label="Zamknij podgląd"
              id="smart-rules-preview-close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
            {/* Info Summary Banner */}
            <div className="bg-surface-2 border border-border p-4 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Filter className="w-4 h-4 text-brand shrink-0" />
                <span className="text-xs font-bold text-text-main">
                  Dopasowano {preview.matchesCount} {preview.matchesCount === 1 ? "transakcję" : "transakcji"}
                </span>
              </div>
              {preview.matchesCount > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-xs font-bold text-brand hover:underline cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring px-1.5 py-0.5 rounded"
                  id="smart-rules-toggle-all-btn"
                >
                  {allSelected ? "Odznacz wszystkie" : "Zaznacz wszystkie"}
                </button>
              )}
            </div>

            {preview.matchesCount === 0 ? (
              <div className="text-center py-12 px-4 bg-bg-base/40 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center mb-2.5 text-text-faint">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-text-main">Wszystkie transakcje są aktualne</h3>
                <p className="text-xs text-text-muted mt-1 max-w-sm">
                  Żadna transakcja w historii nie wymaga zmiany kategorii na podstawie aktywnych reguł automatyzacji.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5" id="smart-rules-matches-list">
                {preview.proposedChanges.map((item: SmartRuleMatchPreview) => {
                  const isChecked = selectedIds.has(item.transactionId);
                  return (
                    <label
                      key={item.transactionId}
                      className={`block border p-3.5 rounded-2xl cursor-pointer transition-all ${
                        isChecked
                          ? "bg-brand-subtle/30 border-brand/40 shadow-xs"
                          : "bg-surface border-border opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleItem(item.transactionId)}
                          className="mt-1 w-4 h-4 rounded text-brand focus:ring-brand accent-brand cursor-pointer shrink-0"
                          id={`checkbox-tx-${item.transactionId}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-bold text-text-main truncate" title={item.transactionName}>
                              {item.transactionName}
                            </h4>
                            <span className="text-xs font-bold text-text-main tabular-nums shrink-0">
                              {formatMoney(item.amount, currency)}
                            </span>
                          </div>

                          <div className="text-[11px] text-text-faint mt-0.5">
                            {formatDate(item.transactionDate)} • <span className="italic">{item.ruleName}</span>
                          </div>

                          {/* Category Diff */}
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50 text-xs">
                            <span className="bg-surface-2 text-text-muted px-2 py-0.5 rounded-lg border border-border truncate max-w-[120px]">
                              {item.currentCategory}
                            </span>
                            <ArrowRight className="w-3 h-3 text-text-faint shrink-0" />
                            <span className="bg-brand-subtle text-brand px-2 py-0.5 rounded-lg border border-brand/20 font-bold truncate max-w-[140px]">
                              {item.proposedCategory}
                            </span>
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-border bg-surface-2 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border text-xs font-bold text-text-muted hover:text-text-main hover:bg-surface active:bg-surface-3 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="smart-rules-preview-cancel"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={handleConfirmApply}
              disabled={selectedIds.size === 0}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
                selectedIds.size > 0
                  ? "bg-brand text-text-inverse hover:bg-brand-hover active:scale-[0.98]"
                  : "bg-surface border border-border text-text-faint cursor-not-allowed"
              }`}
              id="smart-rules-preview-apply"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Zastosuj zmiany ({selectedIds.size})</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
