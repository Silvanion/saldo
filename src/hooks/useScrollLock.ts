import { useEffect } from "react";

export function useScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    // Aplikacja używa #canvas-view jako głównego kontenera scrollującego
    const scrollContainer = document.getElementById("canvas-view");
    if (!scrollContainer) return;

    const originalOverflow = scrollContainer.style.overflow;
    scrollContainer.style.overflow = "hidden";

    return () => {
      scrollContainer.style.overflow = originalOverflow;
    };
  }, [isOpen]);
}
