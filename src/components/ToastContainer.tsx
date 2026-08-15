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
              flex items-start gap-3 p-4 rounded-xl shadow-lg
              transition-all duration-300 ease-in-out
              motion-reduce:transition-none
              ${
                isError
                  ? "bg-red-50 dark:bg-red-900/50 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
                  : isSuccess
                  ? "bg-green-50 dark:bg-green-900/50 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
                  : "bg-blue-50 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
              }
            `}
          >
            <div className="shrink-0 mt-0.5">
              {isError && <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />}
              {isSuccess && <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />}
              {!isError && !isSuccess && <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />}
            </div>
            
            <div className="flex-1 text-sm font-medium pt-0.5">
              {toast.message}
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className={`
                shrink-0 p-1 rounded-md transition-colors
                focus:outline-none focus:ring-2 focus:ring-offset-2
                ${
                  isError
                    ? "hover:bg-red-100 dark:hover:bg-red-800 focus:ring-red-500"
                    : isSuccess
                    ? "hover:bg-green-100 dark:hover:bg-green-800 focus:ring-green-500"
                    : "hover:bg-blue-100 dark:hover:bg-blue-800 focus:ring-blue-500"
                }
              `}
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
