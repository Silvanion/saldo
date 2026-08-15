import { useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((current) => [...current, { id, message, type }]);

      setTimeout(() => {
        dismissToast(id);
      }, 5000); // 5 seconds duration
    },
    [dismissToast]
  );

  return { toasts, showToast, dismissToast };
};
