export interface AiProvider {
  suggestEvent(payment: any, currentDate: string, uid?: string): Promise<any>;
  parseNatural(text: string, currentDate: string): Promise<any>;
  parseStatement(text: string, currentDate: string): Promise<any>;
  parseStatementImage?(imageBase64: string, mimeType: string, currentDate: string): Promise<any>;
  chat(message: string, profileData: any): Promise<any>;
  scanInvoice(imageBase64: string, mimeType: string): Promise<any>;
  /** Natural-language elaboration on a deterministic CalculationReason (see src/types.ts). */
  explain(reasonCode: string, title: string, message: string, missingFields?: string[]): Promise<any>;
}

export interface AiConfig {
  mode: "none" | "local";
  localEndpoint?: string;
  localAiModel?: string;
}
