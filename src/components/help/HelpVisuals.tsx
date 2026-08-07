import React from "react";

// Note: HelpVisuals.tsx is a shared module between content and view to avoid cyclic dependencies.

export interface StepHighlightProps {
  key?: React.Key;
  step: number;
  label: string;
  description: string;
}

export function StepHighlight({ step, label, description }: StepHighlightProps) {
  return (
    <div className="flex items-start gap-3 bg-surface p-3 sm:p-4 rounded-xl border border-border/50">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-2 text-text-main font-bold text-xs shrink-0 border border-border">
        {step}
      </div>
      <div>
        <h5 className="font-semibold text-text-main text-sm">{label}</h5>
        <p className="text-xs sm:text-sm text-text-muted mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export interface MockScreenShotProps {
  title: string;
  badge: string;
  children: React.ReactNode;
  steps: StepHighlightProps[];
}

export function MockScreenShot({ title, badge, children, steps }: MockScreenShotProps) {
  return (
    <div className="my-6 border border-border rounded-2xl overflow-hidden bg-bg-base shadow-sm text-text-main">
      {/* Mock Window Header */}
      <div className="bg-surface px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="text-[11px] font-medium text-text-muted ml-2">{title}</span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-surface-2 text-text-muted border border-border/50 rounded-md">
          {badge}
        </span>
      </div>

      {/* Mock Visual Interface Body */}
      <div className="p-4 sm:p-5 bg-bg-base font-sans">
        {children}
      </div>

      {/* Step by Step Action Markers */}
      {steps.length > 0 && (
        <div className="bg-surface p-4 sm:p-5 border-t border-border grid gap-2 sm:grid-cols-2">
          {steps.map((s) => (
            <StepHighlight key={s.step} step={s.step} label={s.label} description={s.description} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Terminal(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}
