import React, { useRef, useState } from "react";
import { motion } from "motion/react";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { ConfirmPayload } from "../uiTypes";
import { AlertTriangle, AlertCircle, Info, Loader2, X } from "lucide-react";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: ConfirmPayload | null;
}

export function ConfirmModal({ isOpen, onClose, payload }: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !payload) return null;

  const {
    title,
    message,
    confirmLabel = "Potwierdź",
    cancelLabel = "Anuluj",
    tone = "default",
    onConfirm
  } = payload;

  const handleConfirm = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Błąd podczas potwierdzania operacji:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDanger = tone === "danger";
  const isWarning = tone === "warning";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs"
      id="confirm-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-description"
        className="relative w-full max-w-md rounded-2xl bg-bg-base/95 backdrop-blur-2xl border border-border flex flex-col shadow-xl overflow-hidden"
        ref={modalRef}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`shrink-0 p-2.5 rounded-xl border ${
                isDanger
                  ? "bg-danger-subtle text-danger border-danger/20"
                  : isWarning
                  ? "bg-warning-subtle text-warning border-warning/20"
                  : "bg-brand-subtle text-brand border-brand/20"
              }`}
            >
              {isDanger && <AlertCircle className="w-6 h-6" />}
              {isWarning && <AlertTriangle className="w-6 h-6" />}
              {!isDanger && !isWarning && <Info className="w-6 h-6" />}
            </div>

            <div className="flex-1 min-w-0">
              <h2
                id="confirm-modal-title"
                className="text-lg font-bold text-text-main"
              >
                {title}
              </h2>
              <p
                id="confirm-modal-description"
                className="mt-2 text-sm text-text-muted leading-relaxed whitespace-pre-line"
              >
                {message}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="shrink-0 p-1.5 -mr-1.5 -mt-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-surface-2 active:scale-[0.98] transition-all cursor-pointer disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-focus-ring"
              aria-label="Zamknij"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-bold text-text-main bg-surface hover:bg-surface-2 border border-border rounded-xl active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className={`px-4 py-2 text-sm font-bold text-text-inverse rounded-xl active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus-visible:ring-2 focus-visible:ring-focus-ring ${
                isDanger
                  ? "bg-danger hover:bg-danger/90"
                  : isWarning
                  ? "bg-warning hover:bg-warning/90"
                  : "bg-brand hover:bg-brand-hover"
              }`}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
