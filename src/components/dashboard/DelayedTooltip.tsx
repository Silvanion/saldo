import React from "react";

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
  const [open, setOpen] = React.useState(false);
  const timeoutRef = React.useRef<number | null>(null);

  const clearPending = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleEnter = () => {
    clearPending();
    timeoutRef.current = window.setTimeout(() => {
      setOpen(true);
      timeoutRef.current = null;
    }, delayMs);
  };

  const handleLeave = () => {
    clearPending();
    setOpen(false);
  };

  React.useEffect(() => {
    return clearPending;
  }, []);

  return (
    <div className={`relative ${className}`}>
      <span
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        className="inline-block"
      >
        {children}
      </span>
      <div
        className={`absolute z-10 bottom-full left-1/2 mb-3 -translate-x-1/2 rounded-xl bg-slate-800 p-2 text-left text-[10px] font-medium normal-case tracking-normal text-white shadow-lg pointer-events-none transition-all duration-200 ${
          open ? "visible opacity-100 translate-y-0" : "invisible opacity-0 translate-y-2"
        } ${tooltipClassName}`}
      >
        {label}
      </div>
    </div>
  );
}
