import React, { useState, useEffect, useRef } from "react";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { motion } from "motion/react";
import { DelayedTooltip } from "./dashboard/DelayedTooltip";
import { X } from "lucide-react";
import { AvatarPicker } from "./avatar/AvatarPicker";
import { DEFAULT_AVATAR_ICON, DEFAULT_AVATAR_COLOR, type AvatarIconId, type AvatarColorId } from "../constants/avatars";

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; kind: "personal" | "shared"; partnerName: string; pin: string; avatar: string; color: string }) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export function ProfileModal({ isOpen, onClose, onSave, showToast }: ProfileModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"personal" | "shared">("personal");
  const [partnerName, setPartnerName] = useState("");
  const [pin, setPin] = useState("");
  const [avatar, setAvatar] = useState<AvatarIconId>(DEFAULT_AVATAR_ICON);
  const [avatarColor, setAvatarColor] = useState<AvatarColorId>(DEFAULT_AVATAR_COLOR);
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
    onSave({ name: name.trim(), kind, partnerName: kind === "shared" ? partnerName.trim() : "", pin, avatar, color: avatarColor });
    onClose();
    setName("");
    setKind("personal");
    setPartnerName("");
    setPin("");
    setAvatar(DEFAULT_AVATAR_ICON);
    setAvatarColor(DEFAULT_AVATAR_COLOR);
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
        className="relative w-full max-w-md rounded-xl bg-bg-base/95 backdrop-blur-2xl border border-border/70 shadow-lg flex flex-col max-h-[90vh] overflow-hidden"
       ref={modalRef}>
        <div className="shrink-0 p-6 pb-4 border-b border-border/70 relative bg-bg-base/95 backdrop-blur-2xl sticky top-0 z-20">
          <button onClick={onClose} aria-label="Zamknij" className="absolute top-5 right-5 text-text-muted hover:text-text-main hover:bg-surface-offset w-8 h-8 flex items-center justify-center rounded-xl transition-colors active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer" id="close-profile-modal">
            <X className="w-5 h-5" />
          </button>
          <p className="text-xs font-medium text-text-muted truncate" title="Zarządzanie profilami">Zarządzanie profilami</p>
          <h2 id="profile-modal-title" className="text-2xl font-bold text-text-main min-w-0 truncate" title="Utwórz profil">Utwórz profil</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 min-w-0">
          <div className="flex-1 overflow-y-auto min-w-0 p-6 space-y-4 custom-scrollbar">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="input-profile-name">Nazwa profilu (np. Moje Finanse)</label>
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

          <AvatarPicker
            iconId={avatar}
            colorId={avatarColor}
            onChange={(iconId, colorId) => { setAvatar(iconId); setAvatarColor(colorId); }}
          />

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="select-profile-kind">Rodzaj profilu</label>
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
              <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="input-profile-partner">Imię partnera / członka rodziny</label>
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
            <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="input-profile-pin">Opcjonalny kod PIN (do blokady profilu)</label>
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
              <strong>Jak to działa:</strong> Profil wspólny pozostaje w Twoim koncie — to Ty nim zarządzasz. Służy do oznaczania, kto zapłacił za co (Ty / Partner / Wspólnie) i automatycznego wyliczania salda rozliczeń między Wami. Partner nie loguje się osobno i nie ma własnego dostępu do aplikacji — jeśli chcecie razem edytować dane z osobnych urządzeń, musicie korzystać z tego samego konta logowania.
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
