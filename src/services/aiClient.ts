import { auth } from "../firebase";

export interface AiConfig {
  aiMode: "none" | "local";
  localAiEndpoint?: string;
  localAiModel?: string;
}

/**
 * Helper to construct a validated AiConfig from AppState or component state.
 */
export function getAiConfig(state?: { aiMode?: string; localAiEndpoint?: string; localAiModel?: string }): AiConfig {
  const rawMode = state?.aiMode?.toLowerCase();
  const validMode = (rawMode === "local" || rawMode === "none")
    ? (rawMode as "none" | "local")
    : "none";

  return {
    aiMode: validMode,
    localAiEndpoint: state?.localAiEndpoint || "http://localhost:11434/api/generate",
    localAiModel: state?.localAiModel,
  };
}

/**
 * Centralized API invoker for /api/ai/* endpoints.
 * Receives explicit AI configuration from app state.
 */
export async function callAiApi(endpoint: string, payload: any, config: AiConfig) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-ai-mode": config.aiMode || "none",
  };

  if (config.aiMode === "local" && config.localAiEndpoint) {
    headers["x-ai-local-endpoint"] = config.localAiEndpoint;
    if (config.localAiModel) {
      headers["x-ai-local-model"] = config.localAiModel;
    }
  }

  // Attach auth token when available
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`/api/ai/${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Błąd serwera: ${response.status}`);
  }

  return response.json();
}
