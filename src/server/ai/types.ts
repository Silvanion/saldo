export type CloudAiProvider = "gemini" | "openai" | "anthropic" | "custom";

export interface CloudAiConfig {
  provider: CloudAiProvider;
  model: string;
  /** Referencja do klucza API przechowywanego w SecurityVault */
  apiKeyRef: string;
  /** Custom base URL (dla providera "custom") */
  baseUrl?: string;
}

export type AiMode = "none" | "local" | "cloud";

export interface AiProvider {
  parseNatural(text: string, currentDate: string): Promise<any>;
  parseStatement(text: string, currentDate: string): Promise<any>;
  parseStatementImage?(imageBase64: string, mimeType: string, currentDate: string): Promise<any>;
  chat(message: string, profileData: any): Promise<any>;
  scanInvoice(imageBase64: string, mimeType: string): Promise<any>;
}

export interface AiConfig {
  mode: AiMode;
  localEndpoint?: string;
  localAiModel?: string;
  cloudAiConfig?: CloudAiConfig;
}
