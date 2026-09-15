import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Scale, GitCompare, ArrowRight, PlusCircle } from "lucide-react";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export interface DebtScenarioChooserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOffer: () => void;
  onSelectScenario: () => void;
}

export function DebtScenarioChooserModal({
  isOpen,
  onClose,
  onSelectOffer,
  onSelectScenario
}: DebtScenarioChooserModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15 }}
          className="bg-surface border border-border/70 w-full max-w-lg rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[90vh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="scenario-chooser-modal-title"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-border/70 flex items-center justify-between shrink-0 bg-surface-2/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 id="scenario-chooser-modal-title" className="text-base sm:text-lg font-bold text-text-main">
                  Wybierz rodzaj analizy
                </h2>
                <p className="text-xs text-text-muted">
                  Wybierz, czy chcesz porównać ofertę refinansowania, czy zaplanować strategię spłaty
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-full transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
              aria-label="Zamknij"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Options */}
          <div className="p-5 sm:p-6 space-y-3.5">
            {/* Option 1: Refinance Offer */}
            <button
              type="button"
              id="btn-choose-offer"
              onClick={() => {
                onSelectOffer();
                onClose();
              }}
              className="w-full text-left p-4 sm:p-5 rounded-2xl border border-border hover:border-brand/50 bg-surface-2/30 hover:bg-surface-2/70 transition-all group cursor-pointer space-y-2 flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] outline-none"
              aria-label="Wybierz: Nowa oferta refinansowania kredytu"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-text-main group-hover:text-brand transition-colors">
                      Nowa oferta / Refinansowanie
                    </h3>
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-faint">
                      Pojedynczy kredyt vs nowa propozycja banku
                    </span>
                  </div>
                </div>
                <span className="p-2 rounded-xl bg-surface border border-border text-text-muted group-hover:text-brand group-hover:border-brand/30 transition-all shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed pl-13">
                Wprowadź warunki nowej oferty (np. niższa marża, prowizja) i sprawdź, po ilu miesiącach refinansowanie się zwróci (Break-even).
              </p>
            </button>

            {/* Option 2: Payoff Strategy Scenario */}
            <button
              type="button"
              id="btn-choose-scenario"
              onClick={() => {
                onSelectScenario();
                onClose();
              }}
              className="w-full text-left p-4 sm:p-5 rounded-2xl border border-border hover:border-brand/50 bg-surface-2/30 hover:bg-surface-2/70 transition-all group cursor-pointer space-y-2 flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] outline-none"
              aria-label="Wybierz: Nowy scenariusz spłaty portfela"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <GitCompare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-text-main group-hover:text-brand transition-colors">
                      Scenariusz spłaty portfela
                    </h3>
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-faint">
                      Strategia spłaty całego portfela zadłużenia
                    </span>
                  </div>
                </div>
                <span className="p-2 rounded-xl bg-surface border border-border text-text-muted group-hover:text-brand group-hover:border-brand/30 transition-all shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed pl-13">
                Skonfiguruj przyspieszoną spłatę portfela (Lawina, Kula Śnieżna, Własna kolejność) z dodatkową kwotą miesięczną i zapisz scenariusz do porównania.
              </p>
            </button>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-border flex items-center justify-end shrink-0 bg-surface-2/30">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-text-main hover:bg-surface-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
            >
              Zamknij
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
