import React, { useState, useEffect, useRef } from "react";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { motion } from "motion/react";
import { DelayedTooltip } from "./dashboard/DelayedTooltip";

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; kind: "personal" | "shared"; partnerName: string; pin: string; avatar: string }) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const AVATAR_OPTIONS = ["👤", "👨‍💻", "👩‍💻", "🏠", "💼", "💰", "💎", "🌟", "✨", "🚀", "🐶", "🐱"];

export function ProfileModal({ isOpen, onClose, onSave, showToast }: ProfileModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);
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
      showToast("Proszę podać imię partnera dla profilu wspólnego.", "error");
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs"
      id="profile-modal"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-3xl bg-bg-base/95 backdrop-blur-2xl shadow-sm flex flex-col max-h-[90vh] overflow-hidden"
       ref={modalRef}>
        <div className="shrink-0 p-6 pb-4 border-b border-border relative bg-bg-base/95 backdrop-blur-2xl sticky top-0 z-20">
          <button onClick={onClose} aria-label="Zamknij" className="absolute top-5 right-5 text-2xl leading-none text-text-muted hover:text-text-main hover:bg-surface-offset w-8 h-8 flex items-center justify-center rounded-full transition-colors active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring" id="close-profile-modal">
            &times;
          </button>
          <p className="text-xs font-medium text-text-muted truncate" title="Zarządzanie profilami">Zarządzanie profilami</p>
          <h2 id="profile-modal-title" className="text-2xl font-bold text-text-main min-w-0 truncate" title="Utwórz profil">Utwórz profil</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 min-w-0">
          <div className="flex-1 overflow-y-auto min-w-0 p-6 space-y-4 custom-scrollbar">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Nazwa profilu (np. Moje Finanse)</label>
            <input
              required
              maxLength={80}
              placeholder="np. Budżet Seweryna, Domowy"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border p-2.5 bg-surface text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
              id="input-profile-name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Ikona profilu</label>
            <details className="group border border-border rounded-xl relative">
              <summary className="p-2.5 text-xs font-semibold text-text-main cursor-pointer bg-surface hover:bg-surface-offset transition-colors flex items-center justify-between list-none select-none rounded-xl group-open:rounded-b-none group-open:border-b group-open:border-border focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset">
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">{avatar}</span>
                  <span>Wybierz ikonę profilu</span>
                </div>
                <span className="group-open:rotate-180 transition-transform mr-2 text-text-muted">▼</span>
              </summary>
              <div className="p-3 border-t border-border bg-bg-base/95 backdrop-blur-2xl absolute w-full z-10 shadow-lg rounded-b-lg">
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
                      className={`text-2xl p-2 rounded-xl border transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-focus-ring ${avatar === emoji ? 'bg-brand-surface border-brand shadow-sm' : 'bg-surface border-border hover:bg-surface-offset grayscale hover:grayscale-0'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </details>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Rodzaj profilu</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "personal" | "shared")}
              className="w-full rounded-xl border border-border p-2.5 bg-surface text-text-main placeholder:text-text-faint focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
              id="select-profile-kind"
            >
              <option value="personal">Tylko dla mnie (osobisty)</option>
              <option value="shared">Wspólny budżet dla rodziny (dwóch osób)</option>
            </select>
          </div>

          {kind === "shared" && (
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Imię partnera / członka rodziny</label>
              <DelayedTooltip label="Imię partnera nie może składać się z samych spacji">
                <input
                  required
                  pattern=".*\S+.*"
                  maxLength={80}
                  placeholder="np. Ania, Marta, Piotr"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full rounded-xl border border-border p-2.5 bg-surface text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
                  id="input-profile-partner"
                />
              </DelayedTooltip>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Opcjonalny kod PIN (do blokady profilu)</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              minLength={4}
              maxLength={8}
              placeholder="Wpisz 4 do 8 cyfr"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-xl border border-border p-2.5 bg-surface text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
              id="input-profile-pin"
            />
            <p className="text-xs font-medium text-text-muted mt-1">Pozostaw puste, aby nie nakładać blokady.</p>
          </div>

          <div className="rounded-xl bg-surface-2 p-4">
            <p className="text-xs text-text-main leading-relaxed">
              <strong>Wskazówka rodzinna:</strong> Wspólny profil jest zsynchronizowany na serwerze w czasie rzeczywistym. Każdy członek rodziny wchodzący na ten sam link ma dostęp do tych samych danych.
            </p>
          </div>

          </div>

          <div className="shrink-0 p-6 pt-4 border-t border-border bg-bg-base/95 backdrop-blur-2xl rounded-b-3xl">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-text-inverse shadow-lg hover:bg-brand-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
              id="btn-profile-submit"
            >
              <span className="truncate" title={isSubmitting ? "Tworzenie..." : "Utwórz profil"}>
                {isSubmitting ? "Tworzenie..." : "Utwórz profil"}
              </span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
