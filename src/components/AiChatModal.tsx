import React, { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, User, X } from "lucide-react";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useApp } from "../app/providers/AppContext";
import { callAiApi, getAiConfig } from "../services/aiClient";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
}

export function AiChatModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { state, activeProfile } = useApp();
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
      const result = await callAiApi("chat", { message: text, profileData: activeProfile }, getAiConfig(state));
      setMessages((current) => [...current, {
        id: `${Date.now()}-ai`,
        sender: "ai",
        text: typeof result.reply === "string" ? result.reply : "AI nie zwróciło poprawnej odpowiedzi."
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
          {state.aiMode === "none" && <div className="rounded-xl border border-warning/20 bg-warning-subtle p-3 text-xs text-text-main">Włącz lokalne AI (Ollama) w Ustawieniach, aby otrzymywać odpowiedzi.</div>}
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-2 ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
              {message.sender === "ai" && <Bot className="mt-2 h-4 w-4 shrink-0 text-brand" />}
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${message.sender === "user" ? "bg-brand text-text-inverse" : "border border-border bg-surface-2 text-text-main"}`}>
                {message.text}
              </div>
              {message.sender === "user" && <User className="mt-2 h-4 w-4 shrink-0 text-brand" />}
            </div>
          ))}
          {loading && <div className="flex items-center gap-2 text-xs text-text-muted"><Loader2 className="h-4 w-4 animate-spin text-brand" /> Asystent pisze...</div>}
          <div ref={endRef} />
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
