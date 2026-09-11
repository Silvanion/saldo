import { useEffect, RefObject } from "react";

const focusableSelectors = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useFocusTrap(ref: RefObject<HTMLElement | null>, isOpen: boolean, onClose?: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    let cleanupListeners: (() => void) | undefined;
    let initialFocusTimeout: ReturnType<typeof setTimeout> | undefined;
    let isCancelled = false;

    const setupTrap = () => {
      if (isCancelled || typeof document === "undefined") return false;
      const modalElement = ref.current;
      if (!modalElement) return false;

      const previousFocus = document.activeElement as HTMLElement | null;

      const isVisible = (el: HTMLElement) => {
        if (typeof el.checkVisibility === "function") {
          return el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true });
        }
        return el.getClientRects().length > 0 || (el.offsetWidth > 0 && el.offsetHeight > 0);
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && onClose) {
          e.preventDefault();
          onClose();
          return;
        }

        if (e.key !== "Tab") return;

        const focusableElements = Array.from(
          modalElement.querySelectorAll<HTMLElement>(focusableSelectors)
        ).filter(el => isVisible(el as HTMLElement));

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === firstElement ||
            document.activeElement === modalElement ||
            !modalElement.contains(document.activeElement)
          ) {
            e.preventDefault();
            (lastElement as HTMLElement).focus();
          }
        } else {
          if (
            document.activeElement === lastElement ||
            !modalElement.contains(document.activeElement)
          ) {
            e.preventDefault();
            (firstElement as HTMLElement).focus();
          }
        }
      };

      document.addEventListener("keydown", handleKeyDown);

      // Initial focus on the first element if none is focused within the modal
      initialFocusTimeout = setTimeout(() => {
        if (!isCancelled && typeof document !== "undefined" && ref.current && !ref.current.contains(document.activeElement)) {
          const focusableElements = Array.from(
            ref.current.querySelectorAll<HTMLElement>(focusableSelectors)
          ).filter(el => isVisible(el as HTMLElement));
          
          if (focusableElements.length > 0) {
            (focusableElements[0] as HTMLElement).focus();
          }
        }
      }, 50);

      cleanupListeners = () => {
        isCancelled = true;
        document.removeEventListener("keydown", handleKeyDown);
        if (initialFocusTimeout) clearTimeout(initialFocusTimeout);
        
        // Restore focus when closing
        if (previousFocus && typeof previousFocus.focus === "function") {
          previousFocus.focus();
        }
      };

      return true;
    };

    if (!setupTrap()) {
      const raf = requestAnimationFrame(() => {
        setupTrap();
      });
      return () => {
        cancelAnimationFrame(raf);
        cleanupListeners?.();
      };
    }

    return () => {
      cleanupListeners?.();
    };
  }, [isOpen, ref, onClose]);
}
