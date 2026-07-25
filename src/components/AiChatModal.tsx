import { callAiApi, getAiConfig } from "../services/aiClient";
import { useApp } from "../app/providers/AppContext";
import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { X, Sparkles, Send, User, Bot, Loader2 } from "lucide-react";
import { Profile } from "../types";

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: Profile | null;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
}

export function AiChatModal({ isOpen, onClose, activeProfile }: AiChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: "initial",
    sender: "ai",
    text: "Cześć! Jestem Twoim osobistym doradcą finansowym AI. W czym mogę Ci dzisiaj pomóc? Możesz mnie zapytać o swoje wydatki, sposoby na oszczędzanie lub pomysły na inwestycje."
  }]);
  const { state } = useApp();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (state.aiMode === "local") {
        setMessages(prev => {
          if (prev.some(m => m.id === "local-ai-info")) return prev;
          return [...prev, {
            id: "local-ai-info",
            sender: "ai",
            text: "Wskazówka: Używasz lokalnego trybu AI (Ollama).\n\nJeśli czat nie odpowiada lub zgłasza błąd połączenia, upewnij się, że:\n1. Masz zainstalowaną i uruchomioną aplikację Ollama (ollama.com).\n2. Pobrałeś model wpisując w terminalu np. `ollama run llama3`.\n3. Twój serwer Ollama akceptuje żądania z tej przeglądarki (ustaw zmienną środowiskową OLLAMA_ORIGINS=\"*\").\n\nJeśli wolisz, możesz zawsze wrócić do trybu Chmury AI w zakładce Ustawienia aplikacji."
          }];
        });
      }
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages.length, isOpen, state.aiMode]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: inputValue.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const aiConfig = getAiConfig(state);
      const data = await callAiApi("chat", { message: inputValue.trim(), profileData: activeProfile }, aiConfig);
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: data.reply,
      };
      
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: error?.message || "Przepraszam, wystąpił błąd. Nie mogłem połączyć się z serwerem AI.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="ai-chat-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col w-full max-w-lg h-[80vh] max-h-[800px] rounded-2xl bg-white shadow-2xl overflow-hidden"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#137566] to-[#1a9c88] px-5 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Doradca Finansowy AI</h2>
              <p className="text-xs text-emerald-100 opacity-90">Twój wirtualny asystent budżetowy</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {(state.aiMode || "none") === "none" && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-2 mb-2">
              <p className="font-bold">Tryb "Brak AI" jest obecnie aktywny</p>
              <p>
                Interaktywny asystent konwersacyjny wymaga włączenia trybu <strong>Lokalne AI (Ollama)</strong> lub <strong>Chmura AI (Gemini)</strong> w zakładce Ustawienia.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-slide-up`}>
              <div className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === "user" ? "bg-[#153a35] text-white" : "bg-emerald-100 text-[#137566]"}`}>
                  {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                  msg.sender === "user" 
                    ? "bg-[#153a35] text-white rounded-tr-sm" 
                    : "bg-white text-slate-800 border border-slate-150 rounded-tl-sm"
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-slide-up">
              <div className="flex gap-3 max-w-[85%] flex-row">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#137566] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-5 py-4 rounded-2xl bg-white border border-slate-150 rounded-tl-sm flex items-center gap-2 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-[#137566]" />
                  <span className="text-xs text-slate-500 font-medium">Asystent pisze...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-150 shrink-0">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Zapytaj o swój budżet, inwestycje..."
              className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#137566] focus:ring-1 focus:ring-[#137566] transition text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="absolute right-2 p-2 bg-[#137566] text-white rounded-xl hover:bg-[#1a9c88] transition disabled:opacity-50 disabled:hover:bg-[#137566]"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 text-center">
            <span className="text-[10px] text-slate-400">Asystent ma dostęp do historii Twoich transakcji i celów, aby lepiej doradzać.</span>
          </div>
        </form>

      </motion.div>
    </motion.div>
  );
}
