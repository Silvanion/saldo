import React, { useState, useEffect, useRef } from "react";
import { Sliders, Trash2, Cpu, Sparkles, CheckCircle, AlertTriangle, Calendar } from "lucide-react";
import { AppState, RecurringRule, TransactionRule, SupportedCurrency } from "../../types";
import { expenseCategories, incomeCategories, iconByCategory } from "../../utils";
import {
  DEFAULT_LOCAL_AI_ENDPOINT,
  DEFAULT_LOCAL_AI_MODEL,
  resolveLocalAiConfig,
  checkLocalAiHealth,
  isLocalAiLikelyUnsupported,
  isLocalEndpointSafe
} from "../../services/localAi";

export interface RecommendedAiModel {
  tag: string;
  title: string;
  badge: string;
  description: string;
  sizeEst: string;
  isVision: boolean;
}

export const RECOMMENDED_AI_MODELS: RecommendedAiModel[] = [
  {
    tag: "llama3.2:3b",
    title: "Llama 3.2 3B",
    badge: "Lekki & Szybki",
    description: "Niskie zużycie RAM (~2.0 GB). Błyskawiczna kategoryzacja i małe obciążenie.",
    sizeEst: "~2.0 GB",
    isVision: false
  },
  {
    tag: "qwen2.5:7b",
    title: "Qwen 2.5 7B",
    badge: "Rekomendowany do Saldo",
    description: "Najwyższa celność w ewaluacji Saldo. Ścisły JSON i polskie kategorie.",
    sizeEst: "~4.7 GB",
    isVision: false
  },
  {
    tag: "llama3.2-vision:11b",
    title: "Llama 3.2 Vision 11B",
    badge: "OCR, Skany & Faktury",
    description: "Model multimodalny. Wymagany do odczytu zdjęć faktur i skanów PDF.",
    sizeEst: "~7.9 GB",
    isVision: true
  }
];

function getLocalAiRecommendation(): { primary: string; alternatives: string[]; reason: string; hardwareSummary: string } {
  const browser = typeof navigator !== "undefined" ? (navigator as Navigator & {
    deviceMemory?: number;
    userAgentData?: { architecture?: string };
  }) : null;
  const cores = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4;
  const memory = browser?.deviceMemory || 8;
  const architecture = `${browser?.userAgentData?.architecture || ""} ${typeof navigator !== "undefined" ? (navigator.platform || "") + " " + navigator.userAgent : ""}`.toLowerCase();
  const appleSilicon = architecture.includes("arm") && architecture.includes("mac");

  const hardwareSummary = appleSilicon
    ? `Apple Silicon (${cores} rdzeni, ~${memory} GB RAM)`
    : `${cores} rdzeni CPU, ~${memory} GB RAM`;

  if (memory <= 4 || cores <= 4) {
    return {
      primary: "llama3.2:3b",
      alternatives: ["qwen2.5:3b", "gemma2:2b"],
      reason: "Zoptymalizowany pod kątem mniejszego zużycia pamięci RAM.",
      hardwareSummary
    };
  }
  if (memory >= 16 || cores >= 10 || appleSilicon) {
    return {
      primary: "qwen2.5:7b",
      alternatives: ["llama3.2:3b", "llama3.2-vision:11b"],
      reason: appleSilicon
        ? "Wykryto Apple Silicon — rekomendowany Qwen 2.5 7B lub Llama 3.2 Vision dla pełnego OCR."
        : "Wydajne urządzenie — rekomendowany Qwen 2.5 7B dla najwyższej precyzji finansowej.",
      hardwareSummary
    };
  }
  return {
    primary: "qwen2.5:7b",
    alternatives: ["llama3.2:3b", "llama3.2-vision:11b"],
    reason: "Optymalny kompromis precyzji, szybkości i zużycia pamięci.",
    hardwareSummary
  };
}

export function TransactionRulesManager({
  transactionRules,
  onSaveTransactionRules
}: {
  transactionRules: TransactionRule[];
  onSaveTransactionRules: (rules: TransactionRule[]) => void;
}) {
  const [rulePattern, setRulePattern] = useState("");
  const [ruleCategory, setRuleCategory] = useState("Żywność");

  const handleAddTransactionRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rulePattern.trim()) return;
    const newRule: TransactionRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      pattern: rulePattern.trim(),
      category: ruleCategory,
      categoryIcon: iconByCategory[ruleCategory] || "✨"
    };
    onSaveTransactionRules([...transactionRules, newRule]);
    setRulePattern("");
  };

  const handleDeleteTransactionRule = (id: string) => {
    onSaveTransactionRules(transactionRules.filter((r) => r.id !== id));
  };

  return (
    <div className="bg-surface rounded-xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-category-rules-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-border/40">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-main">Automatyzacja kategoryzacji</h3>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              Słowa kluczowe automatycznie przypisujące kategorie do nowych i importowanych transakcji.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-subtle text-brand border border-brand/20 shrink-0 self-start sm:self-auto">
          {transactionRules.length} {transactionRules.length === 1 ? "reguła" : "reguł"}
        </span>
      </div>

      <form onSubmit={handleAddTransactionRule} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 p-4 rounded-xl bg-surface-2/60 border border-border/70 shadow-xs">
        <div>
          <label className="block text-xs font-bold text-text-muted uppercase mb-1">Słowo kluczowe (Fraza)</label>
          <input
            type="text"
            value={rulePattern}
            onChange={(e) => setRulePattern(e.target.value)}
            placeholder="np. biedronka, netflix, orlen"
            className="w-full text-xs rounded-lg border border-border/70 p-2.5 bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-text-muted uppercase mb-1">Przypisz do kategorii</label>
          <select
            value={ruleCategory}
            onChange={(e) => setRuleCategory(e.target.value)}
            className="w-full text-xs rounded-lg border border-border/70 p-2.5 bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs cursor-pointer"
          >
            {expenseCategories.concat(incomeCategories).filter((v, i, a) => a.indexOf(v) === i).map((cat) => (
              <option key={cat} value={cat}>
                {iconByCategory[cat] || "✨"} {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full bg-brand-subtle text-brand border border-brand/20 hover:bg-brand-subtle font-bold py-2.5 px-4 rounded-lg text-xs active:scale-[0.98] transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            ＋ Zapisz dopasowanie
          </button>
        </div>
      </form>

      {transactionRules.length === 0 ? (
        <div className="p-8 bg-surface-2/30 rounded-xl border border-dashed border-border/70 text-center flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center text-text-muted border border-border/70">
            <Sliders className="w-5 h-5" />
          </div>
          <p className="text-xs text-text-main font-bold">Brak zapisanych dopasowań</p>
          <p className="text-[11px] text-text-muted max-w-sm">Zdefiniuj własne słowa kluczowe, by automatycznie przypisywać kategorie wydatków.</p>
        </div>
      ) : (
        <div className="border border-border/70 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-2 border-b border-border/70 text-text-muted font-bold">
                <th className="py-2.5 px-3">Słowo kluczowe</th>
                <th className="py-2.5 px-3">Kategoria docelowa</th>
                <th className="py-2.5 px-3 text-right">Akcja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70 bg-surface">
              {transactionRules.map((r) => (
                <tr key={r.id} className="hover:bg-surface-2/50 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-text-main">{r.pattern}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 bg-brand-subtle text-brand px-2 py-0.5 rounded-full text-xs font-bold border border-brand/20 shadow-xs">
                      <span>{r.categoryIcon || "✨"}</span>
                      {r.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteTransactionRule(r.id)}
                      aria-label={`Usuń regułę dla ${r.pattern}`}
                      className="text-text-muted hover:text-danger hover:bg-danger-subtle p-1.5 rounded-lg active:scale-95 transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface SettingsAutomationSectionProps {
  state: AppState;
  saveState: (s: AppState) => Promise<void>;
  transactionRules: TransactionRule[];
  onSaveTransactionRules: (rules: TransactionRule[]) => void;
  recurringRules: RecurringRule[];
  onSaveRecurringRules: (rules: RecurringRule[]) => void;
  currency: SupportedCurrency;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function SettingsAutomationSection({
  state,
  saveState,
  transactionRules,
  onSaveTransactionRules,
  recurringRules,
  onSaveRecurringRules,
  currency,
  showToast
}: SettingsAutomationSectionProps) {
  // Local AI State
  const [localAiModels, setLocalAiModels] = useState<Array<{ name: string; size?: number; vision?: boolean }>>([]);
  const [isLocalAiChecking, setIsLocalAiChecking] = useState(false);
  const [localAiVisionAvailable, setLocalAiVisionAvailable] = useState<boolean | null>(null);
  const [isLocalAiPulling, setIsLocalAiPulling] = useState(false);
  const [localAiPullProgress, setLocalAiPullProgress] = useState<{ status: string; completed: number; total: number } | null>(null);
  const localAiPullController = useRef<AbortController | null>(null);
  const localAiRecommendation = getLocalAiRecommendation();

  const [isTestingLocalAi, setIsTestingLocalAi] = useState(false);
  const [localAiTestResult, setLocalAiTestResult] = useState<{
    ok: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  // Form states for Recurring Rules
  const [recName, setRecName] = useState("");
  const [recAmount, setRecAmount] = useState<number | "">("");
  const [recType, setRecType] = useState<"expense" | "income">("expense");
  const [recCategory, setRecCategory] = useState("Żywność");
  const [recAccount, setRecAccount] = useState("Konto główne");
  const [recFrequency, setRecFrequency] = useState<"weekly" | "biweekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [recNextDate, setRecNextDate] = useState("");

  const refreshLocalAiModels = async (silent = false) => {
    const config = resolveLocalAiConfig(state);
    if (!isLocalEndpointSafe(config.endpoint)) {
      if (!silent) showToast("Endpoint lokalnego AI musi wskazywać na localhost.", "error");
      return;
    }
    setIsLocalAiChecking(true);
    try {
      const tagsUrl = config.endpoint.replace(/\/api\/generate\/?$/, "/api/tags");
      const response = await fetch(tagsUrl);
      if (!response.ok) throw new Error(`Ollama odpowiedziała błędem HTTP ${response.status}.`);
      const data = await response.json() as {
        models?: Array<{ name?: string; model?: string; size?: number; capabilities?: string[] }>
      };
      const models = (data.models || [])
        .map((model) => ({
          name: model.name || model.model || "",
          size: model.size,
          vision: model.capabilities?.includes("vision") || false
        }))
        .filter((model) => model.name);
      setLocalAiModels(models);
      const selected = models.find((model) => model.name === config.model) || models[0];
      setLocalAiVisionAvailable(selected?.vision ?? false);
      if (selected && selected.name !== config.model && !state.localAiModel) {
        await saveState({ ...state, localAiModel: selected.name });
      }
      if (!silent) {
        showToast(models.length ? `Wykryto ${models.length} modeli Ollama.` : "Ollama działa, ale nie ma pobranych modeli.", models.length ? "success" : "info");
      }
    } catch (error) {
      setLocalAiModels([]);
      setLocalAiVisionAvailable(null);
      if (!silent) {
        showToast(error instanceof Error ? error.message : "Nie udało się pobrać listy modeli Ollama.", "error");
      }
    } finally {
      setIsLocalAiChecking(false);
    }
  };

  useEffect(() => {
    if (state.aiMode === "local") {
      void refreshLocalAiModels(true);
    }
  }, [state.aiMode]);

  const pullLocalAiModel = async (overrideModel?: string) => {
    const targetModel = (typeof overrideModel === "string" && overrideModel.trim())
      ? overrideModel.trim()
      : (state.localAiModel?.trim() || DEFAULT_LOCAL_AI_MODEL);
    const config = resolveLocalAiConfig(state);
    if (!isLocalEndpointSafe(config.endpoint) || !targetModel) return;
    localAiPullController.current?.abort();
    const controller = new AbortController();
    localAiPullController.current = controller;
    setIsLocalAiPulling(true);
    setLocalAiPullProgress({ status: `Rozpoczynanie pobierania ${targetModel}...`, completed: 0, total: 0 });
    try {
      const pullUrl = config.endpoint.replace(/\/api\/generate\/?$/, "/api/pull");
      const response = await fetch(pullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: targetModel, stream: true }),
        signal: controller.signal
      });
      if (!response.ok || !response.body) throw new Error(`Nie udało się pobrać modelu (HTTP ${response.status}).`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const update = JSON.parse(line) as { status?: string; completed?: number; total?: number };
          setLocalAiPullProgress({
            status: update.status || "Pobieranie...",
            completed: update.completed || 0,
            total: update.total || 0
          });
        }
        if (done) break;
      }
      showToast(`Model ${targetModel} jest gotowy.`, "success");
      if (state.localAiModel !== targetModel) {
        await saveState({ ...state, localAiModel: targetModel });
      }
      await refreshLocalAiModels(true);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        showToast(error instanceof Error ? error.message : "Nie udało się pobrać modelu Ollama.", "error");
      }
    } finally {
      setIsLocalAiPulling(false);
      localAiPullController.current = null;
    }
  };

  const handleAddRecurringRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recName.trim() || !recAmount || !recNextDate) {
      showToast("Proszę uzupełnić nazwę, kwotę i termin pierwszej płatności.", "error");
      return;
    }
    const newRule: RecurringRule = {
      id: `rec-rule-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: recName.trim(),
      amount: Number(recAmount),
      type: recType,
      category: recCategory,
      categoryIcon: iconByCategory[recCategory] || "✨",
      account: recAccount.trim(),
      frequency: recFrequency,
      nextDueDate: recNextDate,
      isActive: true,
      currency: currency || "PLN"
    };
    onSaveRecurringRules([...recurringRules, newRule]);
    setRecName("");
    setRecAmount("");
    setRecNextDate("");
  };

  const handleDeleteRecurringRule = (id: string) => {
    onSaveRecurringRules(recurringRules.filter((r) => r.id !== id));
  };

  const handleToggleRecurringRule = (id: string) => {
    onSaveRecurringRules(
      recurringRules.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  return (
    <div className="space-y-6">
      {/* Category Automation Rules */}
      <TransactionRulesManager
        transactionRules={transactionRules}
        onSaveTransactionRules={onSaveTransactionRules}
      />

      {/* Local AI (Ollama) */}
      <div className="bg-surface rounded-2xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-local-ai-card">
        <div className="flex items-start sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-border/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text-main tracking-tight truncate">
                  Lokalne AI (Ollama)
                </h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  state.aiMode === "local" 
                    ? "bg-brand-subtle text-brand border-brand/20" 
                    : "bg-surface-2 text-text-muted border-border"
                }`}>
                  {state.aiMode === "local" ? "Aktywne" : "Wyłączone"}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Prywatne rozpoznawanie transakcji i kategoryzacja bez wysyłania danych do chmury
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.aiMode === "local"}
            onClick={() =>
              saveState({
                ...state,
                aiMode: state.aiMode === "local" ? "none" : "local",
                localAiEndpoint: state.localAiEndpoint || DEFAULT_LOCAL_AI_ENDPOINT,
                localAiModel: state.localAiModel || DEFAULT_LOCAL_AI_MODEL
              })
            }
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
              state.aiMode === "local" ? "bg-brand" : "bg-surface-2 border border-border"
            }`}
            id="toggle-local-ai"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                state.aiMode === "local" ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-text-muted mb-4 leading-relaxed">
          Sugestie kategorii dla nierozpoznanych transakcji i rozpoznawanie wklejonego tekstu wyciągu przez model
          uruchomiony na Twoim komputerze (Ollama). Nic nie opuszcza urządzenia — przeglądarka łączy się
          bezpośrednio z <code className="bg-surface-2 px-1.5 py-0.5 rounded border border-border text-brand font-mono text-[11px]">localhost</code>.
          Wynik zawsze trafia do podglądu przed importem — nic nie zapisuje się automatycznie.
        </p>

        <div className="mb-4 rounded-xl border border-border/70 bg-surface-2/50 p-3">
          <div className="mb-2 text-xs font-bold text-text-main">Tryb modułu AI</div>
          <div className="flex flex-wrap gap-2">
            {([
              ["none", "Wyłączone"],
              ["local", "Lokalne (Ollama)"]
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => saveState({
                  ...state,
                  aiMode: mode,
                  ...(mode === "local"
                    ? {
                        localAiEndpoint: state.localAiEndpoint || DEFAULT_LOCAL_AI_ENDPOINT,
                        localAiModel: state.localAiModel || DEFAULT_LOCAL_AI_MODEL
                      }
                    : {})
                })}
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                  state.aiMode === mode
                    ? "border-brand/30 bg-brand-subtle text-brand"
                    : "border-border bg-surface text-text-muted hover:bg-surface-2"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-text-muted">Dane są przetwarzane lokalnie przez Ollama. Tryb chmurowy Gemini został usunięty.</p>
        </div>

        {isLocalAiLikelyUnsupported() && (
          <div className="mb-4 p-3.5 bg-warning-subtle border border-warning/20 rounded-xl flex items-start gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-text-main">
              Safari blokuje połączenia do <code className="bg-surface px-1 py-0.5 rounded border border-border">localhost</code> ze
              stron HTTPS (znany błąd WebKit). Użyj Chrome lub Firefox, aby korzystać z lokalnego AI w tej aplikacji.
            </p>
          </div>
        )}

        {state.aiMode === "local" && (
          <div className="p-4 bg-brand-subtle border border-brand/20 rounded-xl space-y-3 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-main" htmlFor="input-local-ai-endpoint">
                  Endpoint
                </label>
                <input
                  id="input-local-ai-endpoint"
                  type="text"
                  value={state.localAiEndpoint || DEFAULT_LOCAL_AI_ENDPOINT}
                  onChange={(e) => saveState({ ...state, localAiEndpoint: e.target.value })}
                  placeholder={DEFAULT_LOCAL_AI_ENDPOINT}
                  className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-text-main font-mono focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-text-main" htmlFor="input-local-ai-model">
                  Model
                </label>
                <input
                  id="input-local-ai-model"
                  type="text"
                  value={state.localAiModel || DEFAULT_LOCAL_AI_MODEL}
                  onChange={(e) => saveState({ ...state, localAiModel: e.target.value })}
                  placeholder={DEFAULT_LOCAL_AI_MODEL}
                  className="w-full bg-surface border border-border rounded-xl p-2.5 text-xs text-text-main font-mono focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isTestingLocalAi}
                onClick={async () => {
                  setIsTestingLocalAi(true);
                  const startTime = performance.now();
                  try {
                    const result = await checkLocalAiHealth(resolveLocalAiConfig(state));
                    const latencyMs = Math.round(performance.now() - startTime);
                    if (result.ok) {
                      setLocalAiTestResult({
                        ok: true,
                        message: `Ollama odpowiada prawidłowo (${latencyMs} ms). Model: ${state.localAiModel || DEFAULT_LOCAL_AI_MODEL}`,
                        latencyMs
                      });
                      showToast("Połączenie udane! Lokalny model odpowiada prawidłowo.", "success");
                    } else {
                      setLocalAiTestResult({
                        ok: false,
                        message: result.reason || "Nie udało się połączyć z lokalnym AI."
                      });
                      showToast(result.reason || "Nie udało się połączyć z lokalnym AI.", "error");
                    }
                  } finally {
                    setIsTestingLocalAi(false);
                  }
                }}
                className="px-3 py-2 bg-brand hover:bg-brand-hover text-text-inverse text-xs font-bold rounded-xl active:scale-[0.98] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-focus-ring"
                id="btn-test-local-ai"
              >
                {isTestingLocalAi ? "Testowanie..." : "Testuj połączenie"}
              </button>

              <button
                type="button"
                onClick={() => refreshLocalAiModels(false)}
                disabled={isLocalAiChecking}
                className="px-3 py-2 bg-surface border border-border text-text-main text-xs font-bold rounded-xl hover:bg-surface-2 disabled:opacity-50 cursor-pointer"
                id="btn-detect-local-ai-models"
              >
                {isLocalAiChecking ? "Wykrywanie..." : "Wykryj modele"}
              </button>

              <button
                type="button"
                onClick={() => pullLocalAiModel()}
                disabled={isLocalAiPulling || !state.localAiModel}
                className="px-3 py-2 bg-surface border border-border text-text-main text-xs font-bold rounded-xl hover:bg-surface-2 disabled:opacity-50 cursor-pointer"
                id="btn-pull-local-ai-model"
              >
                {isLocalAiPulling ? "Pobieranie..." : `Pobierz ${state.localAiModel || DEFAULT_LOCAL_AI_MODEL}`}
              </button>
            </div>

            {localAiTestResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  localAiTestResult.ok
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : "bg-danger-subtle border-danger/20 text-danger"
                }`}
              >
                <div className="flex items-center gap-2">
                  {localAiTestResult.ok ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
                  )}
                  <span>{localAiTestResult.message}</span>
                </div>
                {localAiTestResult.latencyMs !== undefined && (
                  <span className="font-mono text-[11px] opacity-75 shrink-0 ml-2">
                    {localAiTestResult.latencyMs} ms
                  </span>
                )}
              </div>
            )}

            {/* REKOMENDOWANE MODELE DO URZĄDZENIA */}
            <div className="rounded-xl border border-border/70 bg-surface p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand" />
                  <span className="text-xs font-bold text-text-main">Rekomendowane modele do Saldo</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-2 text-text-muted border border-border">
                  {localAiRecommendation.hardwareSummary}
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                {localAiRecommendation.reason}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {RECOMMENDED_AI_MODELS.map((rec) => {
                  const isSelected = state.localAiModel === rec.tag;
                  const isInstalled = localAiModels.some((m) => m.name === rec.tag || m.name.startsWith(rec.tag.split(":")[0] + ":"));
                  return (
                    <div
                      key={rec.tag}
                      className={`p-2.5 rounded-xl border flex flex-col justify-between transition-colors ${
                        isSelected
                          ? "border-brand/40 bg-brand-subtle"
                          : "border-border/80 bg-surface-2/40 hover:bg-surface-2/80"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-text-main truncate">{rec.title}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            rec.isVision ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" : "bg-surface text-text-muted border border-border"
                          }`}>
                            {rec.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed mb-2">
                          {rec.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                        <span className="text-[10px] font-mono text-text-muted">{rec.sizeEst}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            await saveState({ ...state, localAiModel: rec.tag });
                            if (!isInstalled) {
                              void pullLocalAiModel(rec.tag);
                            }
                          }}
                          className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-brand text-text-inverse"
                              : isInstalled
                              ? "bg-surface border border-border text-text-main hover:bg-surface-2"
                              : "bg-brand/15 text-brand hover:bg-brand/25 border border-brand/30"
                          }`}
                        >
                          {isSelected ? "Wybrany" : isInstalled ? "Wybierz" : "Pobierz"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {localAiModels.length > 0 && (
              <div className="rounded-xl border border-border/70 bg-surface p-3 space-y-2">
                <div className="text-xs font-bold text-text-main">Modele dostępne w Ollama</div>
                <div className="flex flex-wrap gap-2">
                  {localAiModels.map((model) => (
                    <button
                      key={model.name}
                      type="button"
                      onClick={() => saveState({ ...state, localAiModel: model.name })}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                        state.localAiModel === model.name ? "border-brand/30 bg-brand-subtle text-brand" : "border-border text-text-muted hover:bg-surface-2"
                      }`}
                    >
                      {model.name}{model.vision ? " · vision" : ""}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-text-muted">
                  {localAiVisionAvailable ? "Wybrany model obsługuje obrazy i OCR skanów PDF." : "Wybrany model obsługuje tekst. Do skanów PDF wybierz model vision."}
                </p>
              </div>
            )}

            {localAiPullProgress && (
              <div className="rounded-xl border border-brand/20 bg-brand-subtle p-3 text-xs text-text-main" aria-live="polite">
                <div className="flex justify-between gap-2">
                  <span>{localAiPullProgress.status}</span>
                  {localAiPullProgress.total > 0 && <span>{Math.round((localAiPullProgress.completed / localAiPullProgress.total) * 100)}%</span>}
                </div>
                {localAiPullProgress.total > 0 && (
                  <progress className="mt-2 h-2 w-full accent-brand" value={localAiPullProgress.completed} max={localAiPullProgress.total} />
                )}
              </div>
            )}

            <p className="text-xs text-text-muted leading-relaxed">
              Wymaga zainstalowanej i uruchomionej <a href="https://ollama.com/" target="_blank" rel="noopener noreferrer" className="text-brand underline font-medium">Ollama</a> z
              pobranym modelem: <code className="bg-surface-2 px-1.5 py-0.5 rounded border border-border text-brand">ollama pull {state.localAiModel || DEFAULT_LOCAL_AI_MODEL}</code>.
              Ze względów bezpieczeństwa dozwolone są wyłącznie adresy lokalne.
            </p>
          </div>
        )}
      </div>

      {/* SECTION: RECURRING TRANSACTIONS SCHEDULER */}
      <div className="bg-surface rounded-2xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-recurring-rules-card">
        <div className="flex items-start sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-border/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text-main tracking-tight truncate">
                  Automatyczne transakcje cykliczne
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-2 text-text-muted border border-border">
                  {recurringRules.length}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Automatyczne rejestrowanie stałych wpływów (np. pensja) oraz opłat abonamentowych
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleAddRecurringRule} className="p-4 rounded-xl bg-surface-2/60 border border-border/80 space-y-3 mb-5 shadow-xs">
          <strong className="block text-xs font-bold text-text-muted">Utwórz nową transakcję cykliczną</strong>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Nazwa transakcji</label>
              <input
                type="text"
                value={recName}
                onChange={(e) => setRecName(e.target.value)}
                placeholder="np. Abonament Netflix, Pensja"
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Kwota ({currency})</label>
              <input
                type="number"
                step="0.01"
                value={recAmount}
                onChange={(e) => setRecAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="np. 43.99"
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Typ</label>
              <select
                value={recType}
                onChange={(e) => setRecType(e.target.value as "expense" | "income")}
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
              >
                <option value="expense">Wydatek (Koszt)</option>
                <option value="income">Przychód (Wpływ)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Kategoria</label>
              <select
                value={recCategory}
                onChange={(e) => setRecCategory(e.target.value)}
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
              >
                {expenseCategories.concat(incomeCategories).filter((v, i, a) => a.indexOf(v) === i).map((cat) => (
                  <option key={cat} value={cat}>
                    {iconByCategory[cat] || "✨"} {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Konto / Portfel</label>
              <input
                type="text"
                value={recAccount}
                onChange={(e) => setRecAccount(e.target.value)}
                placeholder="np. Konto główne"
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Częstotliwość</label>
              <select
                value={recFrequency}
                onChange={(e) => setRecFrequency(e.target.value as any)}
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
              >
                <option value="weekly">Co tydzień</option>
                <option value="biweekly">Co dwa tygodnie</option>
                <option value="monthly">Co miesiąc</option>
                <option value="quarterly">Co kwartał</option>
                <option value="yearly">Co rok</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Pierwszy termin płatności</label>
              <input
                type="date"
                value={recNextDate}
                onChange={(e) => setRecNextDate(e.target.value)}
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums shadow-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-brand text-text-inverse hover:bg-brand-hover font-bold py-2.5 px-6 rounded-xl text-xs active:scale-[0.98] transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              ＋ Dodaj harmonogram płatności
            </button>
          </div>
        </form>

        {recurringRules.length === 0 ? (
          <div className="p-8 bg-bg-base/30 rounded-xl border border-dashed border-border text-center">
            <p className="text-xs text-text-main font-bold">Brak zdefiniowanych transakcji cyklicznych</p>
            <p className="text-[11px] text-text-faint mt-0.5">Dodaj stałe koszty lub wpływy (np. abonamenty, pensję), by automatyzować budżet.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead>
                  <tr className="bg-surface-2 border-b border-border text-text-muted font-bold">
                    <th className="py-2.5 px-3">Nazwa / Kategoria</th>
                    <th className="py-2.5 px-3">Częstotliwość</th>
                    <th className="py-2.5 px-3">Najbliższy termin</th>
                    <th className="py-2.5 px-3">Konto</th>
                    <th className="py-2.5 px-3 text-right">Kwota</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {recurringRules.map((r) => {
                    const freqLabels = {
                      weekly: "Co tydzień",
                      biweekly: "Co 2 tygodnie",
                      monthly: "Co miesiąc",
                      quarterly: "Co kwartał",
                      yearly: "Co rok"
                    };
                    return (
                      <tr key={r.id} className={`hover:bg-surface-2/50 transition ${!r.isActive ? "opacity-60" : ""}`}>
                        <td className="py-2.5 px-3">
                          <strong className="block text-text-main">{r.name}</strong>
                          <span className="text-xs text-text-muted font-medium">
                            {r.categoryIcon} {r.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-text-muted">
                          {freqLabels[r.frequency] || r.frequency}
                        </td>
                        <td className="py-2.5 px-3 text-text-muted tabular-nums">
                          {r.nextDueDate}
                        </td>
                        <td className="py-2.5 px-3 text-text-muted">
                          {r.account}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-black tabular-nums ${r.type === "income" ? "text-brand" : "text-danger"}`}>
                          {r.type === "income" ? "+" : "-"} {r.amount.toFixed(2)} {currency}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRecurringRule(r.id)}
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-extrabold cursor-pointer border active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs ${
                              r.isActive
                                ? "bg-brand-subtle border-brand/20 text-brand"
                                : "bg-surface-2 border-border text-text-muted"
                            }`}
                          >
                            {r.isActive ? "Aktywny" : "Wstrzymany"}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteRecurringRule(r.id)}
                            aria-label={`Usuń regułę cykliczną ${r.name}`}
                            className="text-text-muted hover:text-danger hover:bg-danger-subtle p-1.5 rounded-xl active:scale-95 transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-focus-ring"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
