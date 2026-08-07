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
    if (!isOpen || !ref.current) return;

    const modalElement = ref.current;
    const previousFocus = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const focusableElements = Array.from(
        modalElement.querySelectorAll<HTMLElement>(focusableSelectors)
      ).filter(el => {
        if ((el as HTMLElement).offsetParent === null) return false;
        return true;
      });

      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement || document.activeElement === modalElement) {
          e.preventDefault();
          (lastElement as HTMLElement).focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          (firstElement as HTMLElement).focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Initial focus on the first element if none is focused within the modal
    const initialFocusTimeout = setTimeout(() => {
      if (ref.current && !ref.current.contains(document.activeElement)) {
        const focusableElements = Array.from(
          ref.current.querySelectorAll<HTMLElement>(focusableSelectors)
        ).filter(el => (el as HTMLElement).offsetParent !== null);
        
        if (focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus();
        }
      }
    }, 50);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(initialFocusTimeout);
      
      // Restore focus when closing
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
    };
  }, [isOpen, ref, onClose]);
}
