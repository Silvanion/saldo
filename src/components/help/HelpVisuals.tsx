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
    <div className="flex items-start gap-3 bg-surface p-3 rounded-xl border border-emerald-500/20 shadow-sm">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#137566] text-white font-bold text-xs shrink-0 shadow-sm">
        {step}
      </div>
      <div>
        <h5 className="font-bold text-text-main text-sm">{label}</h5>
        <p className="text-sm text-text-muted mt-0.5 leading-relaxed">{description}</p>
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
    <div className="my-5 border border-border rounded-2xl overflow-hidden bg-bg-base shadow-lg text-white">
      {/* Mock Window Header */}
      <div className="bg-surface/90 px-4 py-2.5 border-b border-border/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="text-xs font-mono text-text-muted ml-2">{title}</span>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#137566]/30 text-emerald-300 border border-emerald-500/30 rounded-full">
          {badge}
        </span>
      </div>

      {/* Mock Visual Interface Body */}
      <div className="p-4 sm:p-5 bg-slate-950/60 font-sans">
        {children}
      </div>

      {/* Step by Step Action Markers */}
      {steps.length > 0 && (
        <div className="bg-surface/50 p-4 border-t border-border/60 grid gap-2 sm:grid-cols-2">
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
