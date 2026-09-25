import { AIProviderAdapter, AIProviderType } from "./types";
import { GeminiProvider } from "./providers/geminiProvider";
import { AnthropicProvider } from "./providers/anthropicProvider";

export class ProviderRegistry {
  private adapters: Map<AIProviderType, AIProviderAdapter> = new Map();

  constructor() {
    this.register(new GeminiProvider());
    this.register(new AnthropicProvider());
  }

  register(adapter: AIProviderAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  getAdapter(name: AIProviderType): AIProviderAdapter | null {
    return this.adapters.get(name) || null;
  }

  getAllAdapters(): AIProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  isSupported(name: string): name is AIProviderType {
    return name === "gemini" || name === "anthropic";
  }

  getDefaultModel(provider: AIProviderType): string {
    const adapter = this.getAdapter(provider);
    return adapter ? adapter.defaultModel : "";
  }

  static getModelsForProvider(provider: AIProviderType) {
    const adapter = providerRegistry.getAdapter(provider);
    return adapter ? adapter.availableModels : [];
  }

  static getProviderLabel(provider: AIProviderType): string {
    if (provider === "gemini") return "Google Gemini";
    if (provider === "anthropic") return "Anthropic Claude";
    return provider;
  }

  static getDefaultModel(provider: AIProviderType): string {
    return providerRegistry.getDefaultModel(provider);
  }
}

export const providerRegistry = new ProviderRegistry();

