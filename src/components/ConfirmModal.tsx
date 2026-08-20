import React, { useRef, useState } from "react";
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
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200"
      id="confirm-modal"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-description"
        className="relative w-full max-w-md rounded-2xl bg-bg-base/95 backdrop-blur-2xl border border-border flex flex-col shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
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
              className="shrink-0 p-1.5 -mr-1.5 -mt-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-bg-subtle transition-colors focus:outline-none focus:ring-2 focus:ring-brand"
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
              className="px-4 py-2 text-sm font-medium text-text-main bg-bg-surface hover:bg-bg-subtle border border-border rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                isDanger
                  ? "bg-red-600 hover:bg-red-700 focus:ring-red-500 shadow-sm shadow-red-500/20"
                  : isWarning
                  ? "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 shadow-sm shadow-amber-500/20"
                  : "bg-brand hover:bg-brand-hover focus:ring-brand shadow-sm shadow-brand/20"
              }`}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
