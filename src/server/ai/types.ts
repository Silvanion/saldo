export interface AiProvider {
  suggestEvent(payment: any, currentDate: string, uid?: string): Promise<any>;
  parseNatural(text: string, currentDate: string): Promise<any>;
  parseStatement(text: string, currentDate: string): Promise<any>;
  chat(message: string, profileData: any): Promise<any>;
  scanInvoice(imageBase64: string, mimeType: string): Promise<any>;
}

export interface AiConfig {
  mode: "none" | "local" | "cloud";
  localEndpoint?: string;
}
