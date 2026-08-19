import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["mousemove", "keydown", "touchstart", "click", "scroll"] as const;

interface UseIdleLockOptions {
  isEnabled: boolean;
  timeoutMs: number;
  onLock: () => void;
}

export function useIdleLock({ isEnabled, timeoutMs, onLock }: UseIdleLockOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;

  useEffect(() => {
    if (!isEnabled || timeoutMs <= 0) return;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onLockRef.current();
      }, timeoutMs);
    };

    const handleActivity = () => {
      if (document.visibilityState === "visible") {
        resetTimer();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        // Tab went to background — start shorter timer (keep existing timeout)
        // Don't reset, let the existing timer run
      } else {
        // Tab came back — reset timer since user is active
        resetTimer();
      }
    };

    // Initial timer start
    resetTimer();

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handleActivity);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isEnabled, timeoutMs]);
}
