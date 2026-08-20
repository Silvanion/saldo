import React from "react";
import { useApp } from "../app/providers/AppContext";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full sm:w-auto px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const isError = toast.type === "error";
        const isSuccess = toast.type === "success";
        
        return (
          <div
            key={toast.id}
            role={isError ? "alert" : "status"}
            className={`
              flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md
              transition-all duration-300 ease-in-out
              motion-reduce:transition-none
              ${
                isError
                  ? "bg-danger-subtle text-text-main border-danger/30"
                  : isSuccess
                  ? "bg-success-subtle text-text-main border-success/30"
                  : "bg-brand-subtle text-text-main border-brand/30"
              }
            `}
          >
            <div className="shrink-0 mt-0.5">
              {isError && <AlertCircle className="w-5 h-5 text-danger" />}
              {isSuccess && <CheckCircle className="w-5 h-5 text-success" />}
              {!isError && !isSuccess && <Info className="w-5 h-5 text-brand" />}
            </div>
            
            <div className="flex-1 text-sm font-medium pt-0.5">
              {toast.message}
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-offset transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
              aria-label="Zamknij powiadomienie"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
