import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WalletCards, ShieldCheck, ArrowRight, ArrowLeft, Delete, Check } from "lucide-react";
import { AvatarPicker } from "../components/avatar/AvatarPicker";
import { DEFAULT_AVATAR_ICON, DEFAULT_AVATAR_COLOR, type AvatarIconId, type AvatarColorId } from "../constants/avatars";
import type { SupportedCurrency } from "../types";

interface OnboardingWizardProps {
  onComplete: (data: {
    name: string;
    kind: "personal" | "shared";
    partnerName: string;
    pin: string;
    avatar: string;
    color: string;
    currency: SupportedCurrency;
  }) => void | Promise<void>;
  onEnterDemo: () => void;
}

type Step = "welcome" | "profile" | "pin" | "done";

const CURRENCIES: { value: SupportedCurrency; label: string }[] = [
  { value: "PLN", label: "PLN (Polski Złoty)" },
  { value: "EUR", label: "EUR (Euro)" },
  { value: "USD", label: "USD (Dolar amerykański)" },
  { value: "GBP", label: "GBP (Funt brytyjski)" },
];

const cardTransition = { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const };

export function OnboardingWizard({ onComplete, onEnterDemo }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"personal" | "shared">("personal");
  const [partnerName, setPartnerName] = useState("");
  const [avatar, setAvatar] = useState<AvatarIconId>(DEFAULT_AVATAR_ICON);
  const [avatarColor, setAvatarColor] = useState<AvatarColorId>(DEFAULT_AVATAR_COLOR);
  const [currency, setCurrency] = useState<SupportedCurrency>("PLN");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinStage, setPinStage] = useState<"enter" | "confirm">("enter");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProfileNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (kind === "shared" && !partnerName.trim()) return;
    setStep("pin");
  };

  const finish = async (finalPin: string) => {
    setIsSubmitting(true);
    try {
      await onComplete({
        name: name.trim(),
        kind,
        partnerName: kind === "shared" ? partnerName.trim() : "",
        pin: finalPin,
        avatar,
        color: avatarColor,
        currency,
      });
      setStep("done");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinDigit = (digit: string) => {
    setPinError(null);
    if (pinStage === "enter") {
      if (pin.length >= 6) return;
      const next = pin + digit;
      setPin(next);
      if (next.length === 4) {
        setTimeout(() => setPinStage("confirm"), 150);
      }
    } else {
      if (pinConfirm.length >= 6) return;
      const next = pinConfirm + digit;
      setPinConfirm(next);
      if (next.length === pin.length) {
        if (next === pin) {
          finish(pin);
        } else {
          setPinError("Kody PIN nie są zgodne. Spróbuj ponownie.");
          setPin("");
          setPinConfirm("");
          setPinStage("enter");
        }
      }
    }
  };

  const handlePinDelete = () => {
    setPinError(null);
    if (pinStage === "enter") {
      setPin((p) => p.slice(0, -1));
    } else {
      setPinConfirm((p) => p.slice(0, -1));
    }
  };

  const activePinValue = pinStage === "enter" ? pin : pinConfirm;

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4" id="onboarding-wizard">
      <div className="max-w-md w-full bg-bg-base/95 backdrop-blur-2xl rounded-3xl shadow-sm border border-border p-6 sm:p-10">
        <AnimatePresence initial={false}>
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={cardTransition}
              className="text-center space-y-6"
            >
              <div className="flex justify-center">
                <div className="bg-brand text-text-inverse p-3.5 rounded-2xl shadow-lg">
                  <WalletCards className="w-8 h-8" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black text-text-main tracking-tight">saldo</h1>
                <p className="text-text-muted text-sm leading-relaxed">
                  Twoje finanse, w pełni prywatne i bezpieczne na Twoim urządzeniu.
                </p>
              </div>
              <div className="rounded-xl bg-surface-2 p-4 text-left">
                <p className="text-xs text-text-main leading-relaxed flex gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <span>Dane zostają lokalnie na tym komputerze. Nie musisz logować się kontem e-mail ani Google, żeby zacząć korzystać z aplikacji.</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep("profile")}
                className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-text-inverse shadow-lg hover:bg-brand-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
                id="btn-onboarding-start"
              >
                Rozpocznij <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onEnterDemo}
                className="text-xs font-medium text-text-muted hover:text-text-main transition-colors cursor-pointer"
                id="btn-onboarding-demo"
              >
                Wypróbuj tryb demonstracyjny
              </button>
            </motion.div>
          )}

          {step === "profile" && (
            <motion.form
              key="profile"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={cardTransition}
              onSubmit={handleProfileNext}
              className="space-y-4"
            >
              <div className="text-center space-y-1 mb-2">
                <h2 className="text-xl font-bold text-text-main">Twój profil</h2>
                <p className="text-xs text-text-muted">Utwórz lokalny profil finansowy — możesz go później w pełni edytować.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="input-onboarding-name">Nazwa profilu</label>
                <input
                  required
                  autoFocus
                  maxLength={80}
                  placeholder="np. Budżet Seweryna, Domowy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border p-2.5 bg-surface text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
                  id="input-onboarding-name"
                />
              </div>

              <AvatarPicker
                iconId={avatar}
                colorId={avatarColor}
                onChange={(iconId, colorId) => { setAvatar(iconId); setAvatarColor(colorId); }}
              />

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="select-onboarding-kind">Rodzaj profilu</label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as "personal" | "shared")}
                  className="w-full rounded-xl border border-border p-2.5 bg-surface text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
                  id="select-onboarding-kind"
                >
                  <option value="personal">Tylko dla mnie (osobisty)</option>
                  <option value="shared">Wspólny budżet dla rodziny</option>
                </select>
              </div>

              {kind === "shared" && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="input-onboarding-partner">Imię partnera</label>
                  <input
                    required
                    pattern=".*\S+.*"
                    maxLength={80}
                    placeholder="np. Ania, Marta, Piotr"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    className="w-full rounded-xl border border-border p-2.5 bg-surface text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
                    id="input-onboarding-partner"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="select-onboarding-currency">Waluta bazowa</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                  className="w-full rounded-xl border border-border p-2.5 bg-surface text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors"
                  id="select-onboarding-currency"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("welcome")}
                  className="rounded-xl border border-border bg-surface text-text-muted font-bold py-3 px-4 text-xs hover:bg-surface-offset active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-text-inverse shadow-lg hover:bg-brand-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
                  id="btn-onboarding-profile-next"
                >
                  Dalej <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.form>
          )}

          {step === "pin" && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={cardTransition}
              className="space-y-5"
            >
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-text-main">
                  {pinStage === "enter" ? "Ustaw kod PIN" : "Powtórz kod PIN"}
                </h2>
                <p className="text-xs text-text-muted">
                  {pinStage === "enter"
                    ? "Zabezpiecz profil 4-cyfrowym kodem. Możesz to pominąć."
                    : "Wpisz ten sam kod jeszcze raz, aby potwierdzić."}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3" aria-live="polite">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
                      i < activePinValue.length ? "bg-brand border-brand" : "border-border"
                    }`}
                  />
                ))}
              </div>

              {pinError && (
                <p role="alert" className="text-xs font-medium text-danger text-center">{pinError}</p>
              )}

              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                  <button
                    key={d}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handlePinDigit(d)}
                    className="py-3.5 rounded-xl bg-surface border border-border text-lg font-bold text-text-main hover:bg-surface-offset active:scale-[0.96] transition-all cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => finish("")}
                  disabled={isSubmitting || pinStage === "confirm"}
                  className="py-3.5 rounded-xl text-[11px] font-bold text-text-muted hover:text-text-main hover:bg-surface-offset active:scale-[0.96] transition-all cursor-pointer disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-focus-ring"
                  id="btn-onboarding-skip-pin"
                >
                  Pomiń
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handlePinDigit("0")}
                  className="py-3.5 rounded-xl bg-surface border border-border text-lg font-bold text-text-main hover:bg-surface-offset active:scale-[0.96] transition-all cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  0
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handlePinDelete}
                  aria-label="Usuń cyfrę"
                  className="py-3.5 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-offset active:scale-[0.96] transition-all cursor-pointer flex items-center justify-center disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setStep("profile"); setPin(""); setPinConfirm(""); setPinStage("enter"); setPinError(null); }}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 text-xs text-text-muted font-bold hover:text-text-main transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Wróć
              </button>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={cardTransition}
              className="text-center space-y-4 py-4"
            >
              <div className="flex justify-center">
                <div className="bg-success text-text-inverse p-3.5 rounded-2xl shadow-lg">
                  <Check className="w-8 h-8" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-text-main">Gotowe!</h2>
              <p className="text-xs text-text-muted">Twój profil jest gotowy. Przenoszę Cię do pulpitu…</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
