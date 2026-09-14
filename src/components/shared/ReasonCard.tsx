import React, { useState } from "react";
import { AlertCircle, AlertTriangle, Info, Sparkles, Loader2 } from "lucide-react";
import type { CalculationReason, ReasonSeverity } from "../../types";

const SEVERITY_STYLES: Record<ReasonSeverity, {
  Icon: typeof Info;
  wrapper: string;
  iconWrapper: string;
  title: string;
}> = {
  blocker: {
    Icon: AlertCircle,
    wrapper: "border-danger/30 bg-danger-subtle/40",
    iconWrapper: "bg-danger-subtle text-danger border border-danger/20",
    title: "text-text-main"
  },
  warning: {
    Icon: AlertTriangle,
    wrapper: "border-warning/30 bg-warning-subtle/40",
    iconWrapper: "bg-warning-subtle text-warning border border-warning/20",
    title: "text-text-main"
  },
  info: {
    Icon: Info,
    wrapper: "border-brand/20 bg-brand-subtle/30",
    iconWrapper: "bg-brand-subtle text-brand border border-brand/20",
    title: "text-text-main"
  }
};

export interface ReasonCardProps {
  reason: CalculationReason;
  className?: string;
  /**
   * Optional: when provided, renders a "Zapytaj AI o szczegóły" button. The
   * deterministic reason above always renders immediately regardless — this
   * only adds an AI-generated elaboration underneath once the user asks for it.
   */
  onAskAi?: () => Promise<string>;
}

/**
 * Generic "why this tool has no result / is inactive" card. Renders a
 * CalculationReason (code/severity/title/message/missingFields/action) with
 * consistent styling wherever a calculator can't produce a real result.
 * For the debt-payoff simulator's richer, domain-specific empty states, see
 * DebtScenarioFallbackState — this component is for new call sites instead.
 */
export function ReasonCard({ reason, className, onAskAi }: ReasonCardProps) {
  const [aiState, setAiState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [aiText, setAiText] = useState("");
  const style = SEVERITY_STYLES[reason.severity];
  const Icon = style.Icon;

  const handleAskAi = async () => {
    if (!onAskAi || aiState === "loading") return;
    setAiState("loading");
    try {
      const text = await onAskAi();
      setAiText(text);
      setAiState("done");
    } catch {
      setAiState("error");
    }
  };

  return (
    <div
      id={`reason-${reason.code}`}
      className={`p-5 rounded-2xl border shadow-xs space-y-3 motion-safe:animate-fade-in motion-reduce:animate-none ${style.wrapper} ${className || ""}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${style.iconWrapper}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0 space-y-1">
          <h4 className={`font-bold text-sm ${style.title}`}>{reason.title}</h4>
          <p className="text-xs text-text-muted leading-relaxed">{reason.message}</p>
        </div>
      </div>

      {reason.missingFields && reason.missingFields.length > 0 && (
        <ul className="pl-4 space-y-0.5 text-xs text-text-muted list-disc">
          {reason.missingFields.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
      )}

      {(reason.actionLabel && reason.onAction) || onAskAi ? (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {reason.actionLabel && reason.onAction && (
            <button
              type="button"
              onClick={reason.onAction}
              className="text-xs font-bold text-text-inverse bg-brand hover:bg-brand-hover px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
            >
              {reason.actionLabel}
            </button>
          )}
          {onAskAi && aiState !== "done" && (
            <button
              type="button"
              onClick={handleAskAi}
              disabled={aiState === "loading"}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand bg-surface hover:bg-surface-2 border border-border px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {aiState === "loading" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {aiState === "loading" ? "Pytam AI..." : "Zapytaj AI o szczegóły"}
            </button>
          )}
        </div>
      ) : null}

      {aiState === "done" && (
        <p className="text-xs text-text-main bg-surface border border-border/70 rounded-xl p-3 leading-relaxed">
          <Sparkles className="w-3 h-3 text-brand inline mr-1.5 -mt-0.5" />
          {aiText}
        </p>
      )}
      {aiState === "error" && (
        <p className="text-xs text-danger">Nie udało się uzyskać wyjaśnienia od lokalnego AI. Spróbuj ponownie.</p>
      )}
    </div>
  );
}
