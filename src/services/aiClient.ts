import { auth } from "../firebase";

export interface AiConfig {
  aiMode: "none" | "local" | "cloud";
  localAiEndpoint?: string;
}

/**
 * Helper to construct a validated AiConfig from AppState or component state.
 */
export function getAiConfig(state?: { aiMode?: string; localAiEndpoint?: string }): AiConfig {
  const rawMode = state?.aiMode?.toLowerCase();
  const validMode = (rawMode === "cloud" || rawMode === "local" || rawMode === "none")
    ? (rawMode as "none" | "local" | "cloud")
    : "none";

  return {
    aiMode: validMode,
    localAiEndpoint: state?.localAiEndpoint || "http://localhost:11434/api/generate",
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
  }

  // Attach auth token when available (required for 'cloud' mode, optional for local/none)
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
