import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useApp } from "../app/providers/AppContext";
import { getLocalDateIso } from "../utils";

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  onSave: (data: { name: string; amount: number; dueDate: string; paidBy?: "me" | "partner" | "joint"; splitMode?: "none" | "equal" }) => void;
}

export function PaymentModal({ isOpen, onClose, initialData, onSave }: PaymentModalProps) {
  const { state } = useApp();
  const activeProfile = state.profiles.find(p => p.id === state.activeProfileId);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(getLocalDateIso());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [paidBy, setPaidBy] = useState<"me" | "partner" | "joint">("me");
  const [splitMode, setSplitMode] = useState<"none" | "equal">("equal");

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      if (initialData && typeof initialData === "object" && !("nativeEvent" in initialData) && "amount" in initialData) {
        setName(initialData.name);
        setAmount(initialData.amount.toString());
        setDueDate(initialData.dueDate);
        if (initialData.paidBy) setPaidBy(initialData.paidBy);
        if (initialData.splitMode) setSplitMode(initialData.splitMode);
      } else {
        setName("");
        setAmount("");
        setDueDate(getLocalDateIso());
        setPaidBy("me");
        setSplitMode("equal");
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const numAmt = parseFloat(amount.replace(",", "."));
    if (isNaN(numAmt) || numAmt <= 0) return;
    setIsSubmitting(true);
    const payload: { name: string; amount: number; dueDate: string; paidBy?: "me" | "partner" | "joint"; splitMode?: "none" | "equal" } = { name, amount: numAmt, dueDate };
    if (activeProfile?.kind === "shared") {
      payload.paidBy = paidBy;
      payload.splitMode = splitMode;
    }
    onSave(payload);
    onClose();
    setPaidBy("me");
    setSplitMode("equal");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs"
      id="payment-modal"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-3xl bg-bg-base/95 backdrop-blur-2xl shadow-sm flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="shrink-0 p-6 pb-4 border-b border-border relative bg-bg-base/95 backdrop-blur-2xl sticky top-0 z-20">
          <button onClick={onClose} aria-label="Zamknij" className="absolute top-5 right-5 text-2xl leading-none text-text-muted hover:text-text-main hover:bg-surface-offset p-2 rounded-full transition-colors active:scale-95 shrink-0 w-10 h-10 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" id="close-payment-modal">
            &times;
          </button>
          <p className="text-xs font-medium text-text-muted truncate" title={initialData ? "Edycja Płatności" : "Nowa Płatność"}>{initialData ? "Edycja Płatności" : "Nowa Płatność"}</p>
          <h2 id="payment-modal-title" className="text-2xl font-bold text-text-main min-w-0 truncate" title={initialData ? "Edytuj rachunek" : "Dodaj rachunek"}>{initialData ? "Edytuj rachunek" : "Dodaj rachunek"}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 min-w-0">
          <div className="flex-1 overflow-y-auto min-w-0 p-6 space-y-4 custom-scrollbar">
          <div>
            <label className="block text-xs font-semibold text-text-main mb-1">Nazwa (np. Internet Orange)</label>
            <input
              required
              maxLength={120}
              placeholder="np. Prąd Enea, Netflix, Internet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border p-2.5 outline-none focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand bg-surface text-text-main placeholder:text-text-faint transition-colors"
              id="input-payment-name"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-main mb-1">Kwota (zł)</label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-border p-2.5 outline-none focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand bg-surface text-text-main placeholder:text-text-faint transition-colors"
              id="input-payment-amount"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-main mb-1">Termin płatności</label>
            <input
              required
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-border p-2.5 outline-none focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand bg-surface text-text-main placeholder:text-text-faint transition-colors"
              id="input-payment-date"
            />
          </div>
          
          {activeProfile?.kind === "shared" && (
            <div className="border-t border-border pt-3">
              {!activeProfile.partnerName ? (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 text-center font-medium">
                  Uzupełnij imię partnera w ustawieniach profilu, by dzielić koszty.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">Kto płaci?</label>
                    <select
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value as any)}
                      className="w-full rounded-xl border border-border p-2 text-sm outline-none focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand bg-surface transition-colors"
                      id="select-payment-paidby"
                    >
                      <option value="me">Ja ({activeProfile.name})</option>
                      <option value="partner">Partner ({activeProfile.partnerName})</option>
                      <option value="joint">Wspólne konto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">Dzielimy 50/50?</label>
                    <select
                      value={splitMode}
                      onChange={(e) => setSplitMode(e.target.value as any)}
                      className="w-full rounded-xl border border-border p-2 text-sm outline-none focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand bg-surface transition-colors"
                      id="select-payment-splitmode"
                    >
                      <option value="equal">Tak</option>
                      <option value="none">Nie</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          </div>
          
          <div className="shrink-0 p-6 pt-4 border-t border-border bg-bg-base/95 backdrop-blur-2xl rounded-b-3xl">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand text-white hover:bg-brand-hover active:scale-[0.98] transition-all font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              id="btn-payment-submit"
            >
              <span className="truncate" title={isSubmitting ? "Zapisywanie..." : initialData ? "Zapisz zmiany" : "Dodaj płatność"}>
                {isSubmitting ? "Zapisywanie..." : initialData ? "Zapisz zmiany" : "Dodaj płatność"}
              </span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
