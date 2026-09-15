import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bookmark, X, Edit3, Copy } from "lucide-react";
import {
  DebtItem,
  SupportedCurrency,
  DebtPayoffScenario
} from "../../types";
import { formatMoney } from "../../utils/format";
import { PayoffScenarioComparisonModal } from "./PayoffScenarioComparisonModal";
import { DebtPayoffStrategyType } from "./DebtScenarioConfigSection";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export interface DebtScenarioModalsProps {
  currency: SupportedCurrency;

  // 1. Save Scenario Modal
  isSaveScenarioModalOpen: boolean;
  scenarioNameInput: string;
  onScenarioNameChange: (value: string) => void;
  onSaveScenarioSubmit: (event: React.FormEvent) => void;
  onCloseSaveScenario: () => void;
  selectedPayoffStrategy: DebtPayoffStrategyType;
  extraMonthlyPayoff: number;
  validatedCustomOrder: string[];

  // 2. Compare Scenarios Modal
  isCompareScenariosModalOpen: boolean;
  savedScenarios: DebtPayoffScenario[];
  validSelectedScenarioIds: string[];
  activeDebts: DebtItem[];
  onLoadScenario: (scenario: DebtPayoffScenario) => void;
  onCloseCompareScenarios: () => void;

  // 3. Rename Scenario Modal
  renameModalScenario: DebtPayoffScenario | null;
  renameScenarioInput: string;
  onRenameScenarioInputChange: (value: string) => void;
  onRenameSubmit: (event: React.FormEvent) => void;
  onCloseRenameScenario: () => void;

  // 4. Duplicate Scenario Modal
  duplicateModalScenario: DebtPayoffScenario | null;
  duplicateScenarioInput: string;
  onDuplicateScenarioInputChange: (value: string) => void;
  onDuplicateSubmit: (event: React.FormEvent) => void;
  onCloseDuplicateScenario: () => void;
}

export function DebtScenarioModals({
  currency,
  isSaveScenarioModalOpen,
  scenarioNameInput,
  onScenarioNameChange,
  onSaveScenarioSubmit,
  onCloseSaveScenario,
  selectedPayoffStrategy,
  extraMonthlyPayoff,
  validatedCustomOrder,
  isCompareScenariosModalOpen,
  savedScenarios,
  validSelectedScenarioIds,
  activeDebts,
  onLoadScenario,
  onCloseCompareScenarios,
  renameModalScenario,
  renameScenarioInput,
  onRenameScenarioInputChange,
  onRenameSubmit,
  onCloseRenameScenario,
  duplicateModalScenario,
  duplicateScenarioInput,
  onDuplicateScenarioInputChange,
  onDuplicateSubmit,
  onCloseDuplicateScenario
}: DebtScenarioModalsProps) {
  const saveModalRef = React.useRef<HTMLDivElement>(null);
  const renameModalRef = React.useRef<HTMLDivElement>(null);
  const duplicateModalRef = React.useRef<HTMLDivElement>(null);

  useFocusTrap(saveModalRef, isSaveScenarioModalOpen, onCloseSaveScenario);
  useFocusTrap(renameModalRef, !!renameModalScenario, onCloseRenameScenario);
  useFocusTrap(duplicateModalRef, !!duplicateModalScenario, onCloseDuplicateScenario);

  return (
    <AnimatePresence>
      {/* MODAL 5: SAVE SCENARIO */}
      {isSaveScenarioModalOpen && (
        <motion.div
          key="save-scenario-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            ref={saveModalRef}
            className="bg-surface border border-border rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-scenario-modal-title"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand flex items-center justify-center">
                  <Bookmark className="w-4 h-4" />
                </div>
                <h3 id="save-scenario-modal-title" className="text-base font-bold text-text-main">
                  Zapisz scenariusz spłaty
                </h3>
              </div>
              <button
                type="button"
                onClick={onCloseSaveScenario}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
                aria-label="Zamknij"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onSaveScenarioSubmit} className="space-y-4">
              <div>
                <label htmlFor="save-scenario-name-input" className="block text-xs font-bold text-text-muted mb-1.5">
                  Nazwa scenariusza
                </label>
                <input
                  id="save-scenario-name-input"
                  type="text"
                  required
                  maxLength={50}
                  value={scenarioNameInput}
                  onChange={(e) => onScenarioNameChange(e.target.value)}
                  placeholder="np. Wariant optymistyczny 750 zł"
                  className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
                  autoFocus
                />
              </div>

              {/* Summary of current parameters */}
              <div className="p-3 bg-surface-2/60 rounded-xl border border-border/80 text-xs space-y-1.5 text-text-muted">
                <div className="flex justify-between">
                  <span>Wybrana metoda:</span>
                  <strong className="text-text-main">
                    {selectedPayoffStrategy === "avalanche"
                      ? "Metoda Lawiny"
                      : selectedPayoffStrategy === "snowball"
                      ? "Metoda Kuli Śnieżnej"
                      : selectedPayoffStrategy === "custom"
                      ? "Własna kolejność"
                      : "Status Quo"}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Miesięczna nadpłata:</span>
                  <strong className="text-brand font-bold tabular-nums">
                    +{formatMoney(extraMonthlyPayoff, currency)} / mc
                  </strong>
                </div>
                {selectedPayoffStrategy === "custom" && (
                  <div className="flex justify-between">
                    <span>Liczba celów w kolejce:</span>
                    <strong className="text-text-main">{validatedCustomOrder.length}</strong>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onCloseSaveScenario}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text-main hover:bg-surface-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={scenarioNameInput.trim().length < 2}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand text-text-inverse hover:bg-brand-hover transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                >
                  Zapisz scenariusz
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* MODAL 6: COMPARE SCENARIOS */}
      <PayoffScenarioComparisonModal
        isOpen={isCompareScenariosModalOpen}
        onClose={onCloseCompareScenarios}
        scenarios={savedScenarios.filter((s) => validSelectedScenarioIds.includes(s.id))}
        activeDebts={activeDebts}
        currency={currency}
        onLoadScenario={onLoadScenario}
      />

      {/* MODAL 7: RENAME SCENARIO */}
      {renameModalScenario && (
        <motion.div
          key="rename-scenario-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            ref={renameModalRef}
            className="bg-surface border border-border rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-scenario-modal-title"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 id="rename-scenario-modal-title" className="text-base font-bold text-text-main">
                  Zmień nazwę scenariusza
                </h3>
              </div>
              <button
                type="button"
                onClick={onCloseRenameScenario}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
                aria-label="Zamknij"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onRenameSubmit} className="space-y-4">
              <div>
                <label htmlFor="rename-scenario-name-input" className="block text-xs font-bold text-text-muted mb-1.5">
                  Nowa nazwa scenariusza
                </label>
                <input
                  id="rename-scenario-name-input"
                  type="text"
                  required
                  maxLength={50}
                  value={renameScenarioInput}
                  onChange={(e) => onRenameScenarioInputChange(e.target.value)}
                  placeholder="np. Nowy wariant planu"
                  className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={onCloseRenameScenario}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text-main hover:bg-surface-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={renameScenarioInput.trim().length < 2}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand text-text-inverse hover:bg-brand-hover transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                >
                  Zapisz
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* MODAL 8: DUPLICATE SCENARIO */}
      {duplicateModalScenario && (
        <motion.div
          key="duplicate-scenario-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            ref={duplicateModalRef}
            className="bg-surface border border-border rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="duplicate-scenario-modal-title"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-subtle text-brand flex items-center justify-center">
                  <Copy className="w-4 h-4" />
                </div>
                <h3 id="duplicate-scenario-modal-title" className="text-base font-bold text-text-main">
                  Duplikuj scenariusz spłaty
                </h3>
              </div>
              <button
                type="button"
                onClick={onCloseDuplicateScenario}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
                aria-label="Zamknij"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onDuplicateSubmit} className="space-y-4">
              <div>
                <label htmlFor="duplicate-scenario-name-input" className="block text-xs font-bold text-text-muted mb-1.5">
                  Nazwa kopii scenariusza
                </label>
                <input
                  id="duplicate-scenario-name-input"
                  type="text"
                  required
                  maxLength={50}
                  value={duplicateScenarioInput}
                  onChange={(e) => onDuplicateScenarioInputChange(e.target.value)}
                  placeholder="np. Wariant bazowy — kopia"
                  className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
                  autoFocus
                />
              </div>

              <div className="p-3 bg-surface-2/60 rounded-xl border border-border/80 text-xs space-y-1.5 text-text-muted">
                <div className="flex justify-between">
                  <span>Kopiowana metoda:</span>
                  <strong className="text-text-main">
                    {duplicateModalScenario.strategy === "avalanche"
                      ? "Metoda Lawiny"
                      : duplicateModalScenario.strategy === "snowball"
                      ? "Metoda Kuli Śnieżnej"
                      : duplicateModalScenario.strategy === "custom"
                      ? "Własna kolejność"
                      : "Status Quo"}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Miesięczna nadpłata:</span>
                  <strong className="text-brand font-bold tabular-nums">
                    +{formatMoney(duplicateModalScenario.extraMonthlyPayment, currency)} / mc
                  </strong>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={onCloseDuplicateScenario}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text-main hover:bg-surface-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={duplicateScenarioInput.trim().length < 2}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brand text-text-inverse hover:bg-brand-hover transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                >
                  Utwórz kopię
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
