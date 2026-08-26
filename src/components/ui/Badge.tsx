import React from "react";

export type BadgeTone = "brand" | "success" | "warning" | "danger" | "neutral";

interface BadgeProps {
  tone?: BadgeTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const toneClasses: Record<BadgeTone, string> = {
  brand: "bg-brand-subtle text-brand border-brand/20",
  success: "bg-success-subtle text-success border-success/20",
  warning: "bg-warning-subtle text-warning border-warning/20",
  danger: "bg-danger-subtle text-danger border-danger/20",
  neutral: "bg-surface-2 text-text-muted border-border"
};

// Odznaka statusu — zawsze pigułka z tłem w kolorze tonu, nigdy goły kolorowy tekst.
// Jeden wzorzec dla wszystkich odznak w aplikacji (kierunek "B" ujednolicenia UI).
export function Badge({ tone = "neutral", icon, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${toneClasses[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
