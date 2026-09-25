import React, { useState, useEffect } from "react";
import { Sparkles, Key, CheckCircle2, XCircle, Loader2, Trash2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { AIService } from "../../services/ai/aiService";
import { ProviderRegistry } from "../../services/ai/providerRegistry";
import { AIProviderType, TestConnectionResult } from "../../services/ai/types";

interface AiProviderSettingsCardProps {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  onConfigChange?: (provider: AIProviderType, model: string) => void;
}

export const AiProviderSettingsCard: React.FC<AiProviderSettingsCardProps> = ({
  showToast,
  onConfigChange
}) => {
  const [provider, setProvider] = useState<AIProviderType>("gemini");
  const [model, setModel] = useState<string>("gemini-2.5-flash");
  const [inputApiKey, setInputApiKey] = useState("");
  const [showPlainKey, setShowPlainKey] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [metadata, setMetadata] = useState<{ maskedKey: string; keyPresent: boolean } | null>(null);

  // Załaduj metadane zapisanego klucza dla wybranego dostawcy
  useEffect(() => {
    const meta = AIService.getKeyMetadata(provider);
    setMetadata(meta);
    setIsEditingKey(!meta.keyPresent);
    setInputApiKey("");
    setTestResult(null);

    const availableModels = ProviderRegistry.getModelsForProvider(provider);
    if (meta.model && availableModels.some(m => m.id === meta.model)) {
      setModel(meta.model);
    } else {
      setModel(ProviderRegistry.getDefaultModel(provider));
    }
  }, [provider]);

  const handleProviderChange = (newProvider: AIProviderType) => {
    setProvider(newProvider);
    const defaultM = ProviderRegistry.getDefaultModel(newProvider);
    setModel(defaultM);
    onConfigChange?.(newProvider, defaultM);
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    onConfigChange?.(provider, newModel);
  };

  const handleSaveKey = async () => {
    if (!inputApiKey.trim()) {
      showToast("Wprowadź poprawny klucz API przed zapisaniem.", "error");
      return;
    }

    try {
      await AIService.storeApiKey(provider, inputApiKey.trim(), model);
      const meta = AIService.getKeyMetadata(provider);
      setMetadata(meta);
      setIsEditingKey(false);
      setInputApiKey("");
      showToast(`Klucz API dla ${ProviderRegistry.getProviderLabel(provider)} został bezpiecznie zapisany.`, "success");
      onConfigChange?.(provider, model);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd podczas zapisywania klucza.", "error");
    }
  };

  const handleDeleteKey = async () => {
    try {
      await AIService.removeApiKey(provider);
      setMetadata(null);
      setIsEditingKey(true);
      setInputApiKey("");
      setTestResult(null);
      showToast(`Klucz API dla ${ProviderRegistry.getProviderLabel(provider)} został usunięty.`, "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Błąd podczas usuwania klucza.", "error");
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Jeśli użytkownik wpisuje nowy klucz, przetestuj go bezpośrednio
      const keyToTest = inputApiKey.trim() || undefined;
      const result = await AIService.testConnection(provider, model, keyToTest);
      setTestResult(result);

      if (result.status === "SUCCESS") {
        showToast("Połączenie z API powiodło się!", "success");
      } else {
        showToast(`Błąd połączenia: ${result.message}`, "error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Nieoczekiwany błąd połączenia.";
      setTestResult({
        status: "PROVIDER_ERROR",
        message: msg
      });
      showToast(msg, "error");
    } finally {
      setIsTesting(false);
    }
  };

  const availableModels = ProviderRegistry.getModelsForProvider(provider);

  return (
    <div className="bg-surface rounded-2xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-ai-provider-card">
      <div className="flex items-start sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-border/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-text-main tracking-tight truncate">
                Model AI / Dostawca AI (BYOK)
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                Własny Klucz API
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Bezpieczna integracja z Google Gemini i Claude. Twój klucz nigdy nie opuszcza urządzenia.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Dostawca AI */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-text-main" htmlFor="ai-provider-select">
            Dostawca AI (Provider)
          </label>
          <div className="grid grid-cols-2 gap-2" id="ai-provider-select">
            <button
              type="button"
              onClick={() => handleProviderChange("gemini")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                provider === "gemini"
                  ? "border-brand bg-brand-subtle text-brand ring-1 ring-brand"
                  : "border-border bg-surface-2/40 text-text-muted hover:bg-surface-2"
              }`}
            >
              <span>Google Gemini</span>
            </button>
            <button
              type="button"
              onClick={() => handleProviderChange("anthropic")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                provider === "anthropic"
                  ? "border-brand bg-brand-subtle text-brand ring-1 ring-brand"
                  : "border-border bg-surface-2/40 text-text-muted hover:bg-surface-2"
              }`}
            >
              <span>Anthropic (Claude)</span>
            </button>
          </div>
        </div>

        {/* Model AI */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-text-main" htmlFor="ai-model-select">
            Model
          </label>
          <select
            id="ai-model-select"
            value={model}
            onChange={(e) => handleModelChange(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
          >
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.recommended ? "★ (Rekomendowany)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Klucz API */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-text-main" htmlFor="ai-api-key-input">
              Klucz API ({ProviderRegistry.getProviderLabel(provider)})
            </label>
            {metadata?.keyPresent && !isEditingKey && (
              <button
                type="button"
                onClick={() => setIsEditingKey(true)}
                className="text-[11px] font-medium text-brand hover:underline cursor-pointer"
              >
                Zmień klucz
              </button>
            )}
          </div>

          {metadata?.keyPresent && !isEditingKey ? (
            <div className="flex items-center justify-between p-2.5 bg-surface-2/50 border border-border rounded-xl">
              <div className="flex items-center gap-2 font-mono text-xs text-text-main">
                <Key className="w-3.5 h-3.5 text-text-muted" />
                <span>{metadata.maskedKey}</span>
              </div>
              <button
                type="button"
                onClick={handleDeleteKey}
                title="Usuń zapisany klucz"
                className="p-1 text-text-muted hover:text-danger hover:bg-danger-subtle rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <input
                  id="ai-api-key-input"
                  type={showPlainKey ? "text" : "password"}
                  value={inputApiKey}
                  onChange={(e) => setInputApiKey(e.target.value)}
                  placeholder={provider === "gemini" ? "AIzaSy..." : "sk-ant-api03-..."}
                  className="w-full bg-surface border border-border rounded-xl p-2.5 pr-10 text-xs text-text-main font-mono focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPlainKey(!showPlainKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main p-1"
                  title={showPlainKey ? "Ukryj klucz" : "Pokaż klucz"}
                >
                  {showPlainKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveKey}
                  disabled={!inputApiKey.trim()}
                  className="px-3 py-1.5 bg-brand hover:bg-brand-hover text-text-inverse text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Zapisz klucz
                </button>
                {metadata?.keyPresent && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingKey(false);
                      setInputApiKey("");
                    }}
                    className="px-3 py-1.5 bg-surface border border-border text-text-muted hover:text-text-main text-xs font-medium rounded-xl transition-all cursor-pointer"
                  >
                    Anuluj
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Akcje testowania & Status */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/40">
          <button
            type="button"
            disabled={isTesting || (!metadata?.keyPresent && !inputApiKey.trim())}
            onClick={handleTestConnection}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-surface-2 hover:bg-surface-3 border border-border text-text-main text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            id="btn-test-ai-connection"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
                <span>Testowanie połączenia...</span>
              </>
            ) : (
              <span>Testuj połączenie</span>
            )}
          </button>

          {/* Status połączenia */}
          {testResult && (
            <div className="flex items-center gap-2 text-xs animate-fade-in">
              {testResult.status === "SUCCESS" ? (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>● Połączono ({testResult.latencyMs} ms)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-danger font-medium">
                  <XCircle className="w-4 h-4 text-danger shrink-0" />
                  <span>● Błąd połączenia: {testResult.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Informacja o bezpieczeństwie */}
        <div className="mt-3 p-3 bg-surface-2/40 border border-border/50 rounded-xl flex items-start gap-2.5 text-[11px] text-text-muted">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p>
            Klucz API jest przechowywany wyłącznie lokalnie na Twoim urządzeniu w bezpiecznym magazynie (Keychain/Vault).
            Nigdy nie trafia do bazy Firestore ani nie jest wysyłany na zewnętrzne serwery Saldo.
          </p>
        </div>
      </div>
    </div>
  );
};
