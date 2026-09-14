import React, { useEffect, useRef, useState } from "react";
import { Bot, CheckCircle2, ListTodo, Loader2, Send, Sparkles, User, X } from "lucide-react";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useApp } from "../app/providers/AppContext";
import { callAiApi, getAiConfig } from "../services/aiClient";
import { ReasonCard } from "./shared/ReasonCard";
import type { FinancialActionPlan } from "../types";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  planProposal?: FinancialActionPlan;
}

export function AiChatModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, activeProfile, openModal, setActiveView, handleSaveFinancialPlan } = useApp();
  const [savedPlanIds, setSavedPlanIds] = useState<Set<string>>(new Set());
  const modalRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", sender: "ai", text: "Cześć! Zapytaj mnie o wydatki, cele albo sposoby na oszczędzanie." }
  ]);

  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isOpen, messages.length]);

  if (!isOpen) return null;

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((current) => [...current, { id: `${Date.now()}-user`, sender: "user", text }]);
    setLoading(true);
    try {
      // The server's ChatInput schema expects { activeProfileId, profiles: [...] }
      // (see src/server/routes/ai.ts) — wrap the single active profile to match.
      const profileData = activeProfile
        ? { activeProfileId: activeProfile.id, profiles: [activeProfile] }
        : undefined;
      const result = await callAiApi("chat", { message: text, profileData }, getAiConfig(state));
      
      const replyText = typeof result.reply === "string" ? result.reply : (typeof result === "string" ? result : "AI nie zwróciło poprawnej odpowiedzi.");

      // The server already validated result.action against AiChatAction (see
      // src/services/aiActions.ts) — every branch below only pre-fills a form
      // or shows a proposal card, the user must still review and confirm
      // manually before anything saves.
      let planProposal: FinancialActionPlan | undefined;
      switch (result.action?.type) {
        case "addTransaction":
          openModal("transaction", result.action.payload);
          break;
        case "addPayment":
          openModal("payment", result.action.payload);
          break;
        case "addGoal":
          openModal("goal", result.action.payload);
          break;
        case "createFinancialPlan":
          planProposal = result.action.payload;
          break;
        default:
          break;
      }

      setMessages((current) => [...current, {
        id: `${Date.now()}-ai`,
        sender: "ai",
        text: replyText,
        planProposal
      }]);
    } catch (error) {
      setMessages((current) => [...current, {
        id: `${Date.now()}-error`,
        sender: "ai",
        text: error instanceof Error ? error.message : "Nie udało się połączyć z modułem AI."
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="ai-chat-title" className="flex h-[80vh] max-h-[800px] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-brand" />
            <div>
              <h2 id="ai-chat-title" className="font-bold text-text-main">Doradca finansowy AI</h2>
              <p className="text-xs text-text-muted">Tryb: {state.aiMode === "local" ? "Ollama" : "wyłączony"}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Zamknij" className="rounded-lg p-2 text-text-muted hover:bg-surface-2"><X className="h-5 w-5" /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {state.aiMode === "none" && (
            <ReasonCard
              reason={{
                code: "ai-chat-disabled",
                severity: "warning",
                title: "Doradca AI jest wyłączony",
                message: "Ta funkcja wymaga lokalnie uruchomionego modelu AI (Ollama). Włącz go w Ustawieniach → Automatyzacja, aby doradca mógł odpowiadać na pytania o Twój budżet.",
                actionLabel: "Przejdź do Ustawień",
                onAction: () => {
                  onClose();
                  setActiveView("settings");
                }
              }}
            />
          )}
          {messages.map((message) => (
            <div key={message.id} className={`flex flex-col gap-2 ${message.sender === "user" ? "items-end" : "items-start"}`}>
              <div className={`flex gap-2 ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                {message.sender === "ai" && <Bot className="mt-2 h-4 w-4 shrink-0 text-brand" />}
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${message.sender === "user" ? "bg-brand text-text-inverse" : "border border-border bg-surface-2 text-text-main"}`}>
                  {message.text}
                </div>
                {message.sender === "user" && <User className="mt-2 h-4 w-4 shrink-0 text-brand" />}
              </div>

              {message.planProposal && (
                <div className="ml-6 max-w-[90%] rounded-2xl border border-brand/30 bg-brand-subtle/20 p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-brand shrink-0" />
                    <h4 className="text-sm font-bold text-text-main">{message.planProposal.title}</h4>
                  </div>
                  <ul className="space-y-1 text-xs text-text-muted pl-1">
                    {message.planProposal.items.slice(0, 4).map((item) => (
                      <li key={item.id} className="flex gap-1.5">
                        <span className="text-brand shrink-0">•</span>
                        <span>{item.title}</span>
                      </li>
                    ))}
                  </ul>
                  {savedPlanIds.has(message.planProposal.id) ? (
                    <p className="flex items-center gap-1.5 text-xs font-bold text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Zapisano w Planach Działania
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        handleSaveFinancialPlan(message.planProposal!);
                        setSavedPlanIds((current) => new Set(current).add(message.planProposal!.id));
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-text-inverse bg-brand hover:bg-brand-hover px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Zapisz ten plan w Planach Działania
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && <div className="flex items-center gap-2 text-xs text-text-muted"><Loader2 className="h-4 w-4 animate-spin text-brand" /> Asystent pisze...</div>}
          <div ref={endRef} />
        </div>

        {/* Claude Skills Quick Triggers */}
        <div className="px-4 py-2 bg-surface-2/40 border-t border-border/60 flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-[11px] shrink-0">
          <span className="text-text-muted font-bold flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-brand" /> Skills:
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              openModal("financialSkills" as any);
            }}
            className="px-2.5 py-1 rounded-lg bg-surface border border-border/70 text-text-main hover:border-brand hover:text-brand transition-colors shrink-0 font-medium cursor-pointer"
          >
            📋 Centrum Planów Działań
          </button>
          <button
            type="button"
            onClick={() => {
              setInput("Przeanalizuj moje długi i zaproponuj optymalną kolejność ich spłaty.");
            }}
            className="px-2.5 py-1 rounded-lg bg-surface border border-border/70 text-text-main hover:border-brand hover:text-brand transition-colors shrink-0 font-medium cursor-pointer"
          >
            ⚡ Spłata długów
          </button>
          <button
            type="button"
            onClick={() => {
              setInput("Jak zbudować 3-miesięczną poduszkę finansową przy moich obecnych wydatkach?");
            }}
            className="px-2.5 py-1 rounded-lg bg-surface border border-border/70 text-text-main hover:border-brand hover:text-brand transition-colors shrink-0 font-medium cursor-pointer"
          >
            🛡️ Poduszka 3M
          </button>
          <button
            type="button"
            onClick={() => {
              setInput("Przeanalizuj moje wydatki cykliczne i wskaż subskrypcje do optymalizacji.");
            }}
            className="px-2.5 py-1 rounded-lg bg-surface border border-border/70 text-text-main hover:border-brand hover:text-brand transition-colors shrink-0 font-medium cursor-pointer"
          >
            ✂️ Audyt subskrypcji
          </button>
        </div>

        <form onSubmit={sendMessage} className="border-t border-border p-4">
          <div className="flex gap-2">
            <input value={input} onChange={(event) => setInput(event.target.value)} disabled={loading} placeholder="Zapytaj o swój budżet..." className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-3 text-sm focus-visible:ring-2 focus-visible:ring-focus-ring" />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Wyślij" className="rounded-xl bg-brand px-3 text-text-inverse disabled:opacity-50"><Send className="h-4 w-4" /></button>
          </div>
        </form>
      </div>
    </div>
  );
}
