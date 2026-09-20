import { auth } from "../firebase";

export type CloudAiProvider = "gemini" | "openai" | "anthropic" | "custom";

export interface CloudAiConfig {
  provider: CloudAiProvider;
  model: string;
  /** Referencja do klucza API przechowywanego w SecurityVault (np. "ai_gemini_key") */
  apiKeyRef: string;
  /** Custom base URL (dla providera "custom") */
  baseUrl?: string;
}

export type AiMode = "none" | "local" | "cloud";

export interface AiConfig {
  aiMode: AiMode;
  localAiEndpoint?: string;
  localAiModel?: string;
  cloudAiConfig?: CloudAiConfig;
}

/**
 * Helper to construct a validated AiConfig from AppState or component state.
 */
export function getAiConfig(state?: {
  aiMode?: string;
  localAiEndpoint?: string;
  localAiModel?: string;
  cloudAiProvider?: string;
  cloudAiModel?: string;
  cloudAiApiKeyRef?: string;
  cloudAiBaseUrl?: string;
}): AiConfig {
  const rawMode = state?.aiMode?.toLowerCase();
  const validMode = (rawMode === "local" || rawMode === "cloud" || rawMode === "none")
    ? (rawMode as AiMode)
    : "none";

  const config: AiConfig = {
    aiMode: validMode,
    localAiEndpoint: state?.localAiEndpoint || "http://localhost:11434/api/generate",
    localAiModel: state?.localAiModel,
  };

  if (validMode === "cloud" && state?.cloudAiProvider && state?.cloudAiModel && state?.cloudAiApiKeyRef) {
    config.cloudAiConfig = {
      provider: state.cloudAiProvider as CloudAiProvider,
      model: state.cloudAiModel,
      apiKeyRef: state.cloudAiApiKeyRef,
      baseUrl: state.cloudAiBaseUrl,
    };
  }

  return config;
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

  if (config.aiMode === "cloud" && config.cloudAiConfig) {
    headers["x-ai-cloud-provider"] = config.cloudAiConfig.provider;
    headers["x-ai-cloud-model"] = config.cloudAiConfig.model;
    headers["x-ai-cloud-api-key-ref"] = config.cloudAiConfig.apiKeyRef;
    if (config.cloudAiConfig.baseUrl) {
      headers["x-ai-cloud-base-url"] = config.cloudAiConfig.baseUrl;
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
