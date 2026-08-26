import React from "react";

export type StatCardTone = "brand" | "success" | "warning" | "danger" | "neutral";

interface StatCardProps {
  icon: React.ReactNode;
  tone?: StatCardTone;
  label: string;
  value: React.ReactNode;
  valueTitle?: string;
  caption?: React.ReactNode;
  valueClassName?: string;
}

const iconToneClasses: Record<StatCardTone, string> = {
  brand: "bg-brand-subtle text-brand border-brand/20",
  success: "bg-success-subtle text-success border-success/20",
  warning: "bg-warning-subtle text-warning border-warning/20",
  danger: "bg-danger-subtle text-danger border-danger/20",
  neutral: "bg-surface-2 text-text-muted border-border"
};

// Karta wskaźnika — ta sama plakietka ikony (kolor = tone), etykieta i duża liczba
// w każdej karcie KPI w aplikacji, niezależnie od widoku. Wcześniej część kart miała
// plakietkę ikony, część goły kolorowy tekst w etykiecie — to je ujednolica.
export function StatCard({ icon, tone = "neutral", label, value, valueTitle, caption, valueClassName = "" }: StatCardProps) {
  return (
    <div className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-2 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${iconToneClasses[tone]}`}>
          {icon}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint truncate">{label}</span>
      </div>
      <span
        className={`text-xl sm:text-2xl font-black text-text-main tabular-nums truncate ${valueClassName}`}
        title={valueTitle}
      >
        {value}
      </span>
      {caption && <span className="text-[11px] text-text-muted truncate">{caption}</span>}
    </div>
  );
}
