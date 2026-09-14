import { useContext } from "react";
import { AppContext } from "../app/providers/AppContext";
import { callAiApi, getAiConfig } from "../services/aiClient";
import type { CalculationReason } from "../types";

/**
 * Optional AI elaboration layer for <ReasonCard> (src/components/shared/ReasonCard.tsx).
 * The deterministic reason text always renders on its own — this only adds a
 * "Zapytaj AI o szczegóły" button, and only when local AI is actually enabled.
 *
 * Uses AppContext directly (not the throwing useApp()) so components that host
 * a ReasonCard can still be unit-tested in isolation, outside an AppProvider —
 * in that case isAiEnabled is simply false and the button never renders.
 */
export function useAiExplain() {
  const ctx = useContext(AppContext);
  const state = ctx?.state;
  const isAiEnabled = state?.aiMode === "local";

  const explainReason = async (reason: CalculationReason): Promise<string> => {
    const result = await callAiApi("explain", {
      reasonCode: reason.code,
      title: reason.title,
      message: reason.message,
      missingFields: reason.missingFields
    }, getAiConfig(state));

    if (typeof result?.explanation !== "string") {
      throw new Error("AI nie zwróciło poprawnego wyjaśnienia.");
    }
    return result.explanation;
  };

  return { isAiEnabled, explainReason };
}
