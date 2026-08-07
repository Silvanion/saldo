import React, { useState, useRef, useEffect, useCallback } from "react";

type DelayedTooltipProps = {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tooltipClassName?: string;
  delayMs?: number;
};

export function DelayedTooltip({
  label,
  children,
  className = "inline-block",
  tooltipClassName = "",
  delayMs = 300,
}: DelayedTooltipProps) {
  const [open, setOpen] = useState(false);
  const [positionClass, setPositionClass] = useState("bottom-full left-1/2 -translate-x-1/2 mb-3");
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const isTouchRef = useRef(false);

  const clearPending = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleEnter = () => {
    if (isTouchRef.current) return;
    clearPending();
    if (!open) {
      timeoutRef.current = window.setTimeout(() => setOpen(true), delayMs);
    }
  };

  const handleLeave = () => {
    if (isTouchRef.current) return;
    clearPending();
    if (open) {
      hideTimeoutRef.current = window.setTimeout(() => setOpen(false), 150);
    }
  };

  const handleTouch = () => {
    isTouchRef.current = true;
    clearPending();
    setOpen((prev) => !prev);
    setTimeout(() => {
      isTouchRef.current = false;
    }, 500);
  };

  useEffect(() => {
    return clearPending;
  }, [clearPending]);

  useEffect(() => {
    const handleOutsideInteraction = (e: MouseEvent | TouchEvent) => {
      if (open && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    
    if (open) {
      document.addEventListener("mousedown", handleOutsideInteraction);
      document.addEventListener("touchstart", handleOutsideInteraction);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);
      document.removeEventListener("touchstart", handleOutsideInteraction);
    };
  }, [open]);

  useEffect(() => {
    if (open && containerRef.current && tooltipRef.current) {
      const cRect = containerRef.current.getBoundingClientRect();
      const ttRect = tooltipRef.current.getBoundingClientRect();
      const padding = 16;
      
      let newClass = "bottom-full mb-3 ";
      
      if (cRect.top - ttRect.height - padding < 0) {
        newClass = "top-full mt-3 ";
      }
      
      const centerLeft = cRect.left + cRect.width / 2 - ttRect.width / 2;
      if (centerLeft < padding) {
        newClass += "left-0";
      } else if (centerLeft + ttRect.width > window.innerWidth - padding) {
        newClass += "right-0";
      } else {
        newClass += "left-1/2 -translate-x-1/2";
      }
      
      setPositionClass(newClass);
    }
  }, [open, label]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <span
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        onTouchStart={handleTouch}
        className="inline-block cursor-help"
      >
        {children}
      </span>
      <div
        ref={tooltipRef}
        className={`absolute z-[100] p-2.5 rounded-xl bg-surface border border-border shadow-lg text-left text-xs font-medium normal-case tracking-normal text-text-main pointer-events-none transition-all duration-200 max-w-xs w-max [text-wrap:pretty] ${positionClass} ${
          open ? "visible opacity-100 translate-y-0" : "invisible opacity-0 scale-95"
        } ${tooltipClassName}`}
      >
        {label}
      </div>
    </div>
  );
}
