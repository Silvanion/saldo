import React, { useState, useEffect } from "react";
import { motion } from "motion/react";

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; kind: "personal" | "shared"; partnerName: string; pin: string; avatar: string }) => void;
}

const AVATAR_OPTIONS = ["👤", "👨‍💻", "👩‍💻", "🏠", "💼", "💰", "💎", "🌟", "✨", "🚀", "🐶", "🐱"];

export function ProfileModal({ isOpen, onClose, onSave }: ProfileModalProps) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"personal" | "shared">("personal");
  const [partnerName, setPartnerName] = useState("");
  const [pin, setPin] = useState("");
  const [avatar, setAvatar] = useState("👤");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!name.trim()) return;
    if (kind === "shared" && !partnerName.trim()) {
      alert("Proszę podać imię partnera dla profilu wspólnego.");
      return;
    }
    setIsSubmitting(true);
    onSave({ name: name.trim(), kind, partnerName: kind === "shared" ? partnerName.trim() : "", pin, avatar });
    onClose();
    setName("");
    setKind("personal");
    setPartnerName("");
    setPin("");
    setAvatar("👤");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="profile-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-slate-900/95 backdrop-blur-2xl p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-slate-400 hover:text-slate-300" id="close-profile-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">Zarządzanie profilami</p>
        <h2 className="text-2xl font-bold text-white mb-4">Utwórz profil</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white mb-1">Nazwa profilu (np. Moje Finanse)</label>
            <input
              required
              maxLength={80}
              placeholder="np. Budżet Seweryna, Domowy"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-700/50 p-2.5 outline-none focus:border-emerald-500/50"
              id="input-profile-name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white mb-1">Ikona profilu</label>
            <details className="group border border-slate-700/50 rounded-xl relative">
              <summary className="p-2.5 text-xs font-semibold text-slate-200 cursor-pointer bg-slate-800/60 hover:bg-slate-700/50 flex items-center justify-between list-none select-none rounded-xl group-open:rounded-b-none group-open:border-b group-open:border-slate-700/50">
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">{avatar}</span>
                  <span>Wybierz ikonę profilu</span>
                </div>
                <span className="group-open:rotate-180 transition-transform mr-2 text-slate-400">▼</span>
              </summary>
              <div className="p-3 border-t border-slate-700/50 bg-slate-900/95 backdrop-blur-2xl absolute w-full z-10 shadow-lg rounded-b-lg">
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setAvatar(emoji);
                        if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur();
                        }
                      }}
                      className={`text-2xl p-2 rounded-xl border transition-all ${avatar === emoji ? 'bg-emerald-50 border-slate-900 shadow-sm' : 'bg-slate-800/60 border-slate-700/50 hover:bg-slate-700/50 grayscale hover:grayscale-0'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </details>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white mb-1">Rodzaj profilu</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "personal" | "shared")}
              className="w-full rounded-xl border border-slate-700/50 p-2.5 outline-none bg-slate-800/50 text-white placeholder-slate-400 focus:border-emerald-500/50"
              id="select-profile-kind"
            >
              <option value="personal">Tylko dla mnie (osobisty)</option>
              <option value="shared">Wspólny budżet dla rodziny (dwóch osób)</option>
            </select>
          </div>

          {kind === "shared" && (
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Imię partnera / członka rodziny</label>
              <input
                required
                pattern=".*\S+.*"
                title="Imię partnera nie może składać się z samych spacji"
                maxLength={80}
                placeholder="np. Ania, Marta, Piotr"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                className="w-full rounded-xl border border-slate-700/50 p-2.5 outline-none focus:border-emerald-500/50"
                id="input-profile-partner"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-white mb-1">Opcjonalny kod PIN (do blokady profilu)</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              minLength={4}
              maxLength={8}
              placeholder="Wpisz 4 do 8 cyfr"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-xl border border-slate-700/50 p-2.5 outline-none focus:border-emerald-500/50"
              id="input-profile-pin"
            />
            <p className="text-[11px] text-slate-400 mt-1">Pozostaw puste, aby nie nakładać blokady.</p>
          </div>

          <div className="rounded-xl bg-slate-700/50 p-4">
            <p className="text-[12px] text-white leading-relaxed">
              <strong>Wskazówka rodzinna:</strong> Wspólny profil jest zsynchronizowany na serwerze w czasie rzeczywistym. Każdy członek rodziny wchodzący na ten sam link ma dostęp do tych samych danych.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-900/95 backdrop-blur-2xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            id="btn-profile-submit"
          >
            {isSubmitting ? "Tworzenie..." : "Utwórz profil"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
