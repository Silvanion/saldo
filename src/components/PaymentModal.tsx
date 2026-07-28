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
      if (initialData) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="payment-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-slate-400 hover:text-slate-600" id="close-payment-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">{initialData ? "Edycja Płatności" : "Nowa Płatność"}</p>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">{initialData ? "Edytuj rachunek" : "Dodaj rachunek"}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Nazwa (np. Internet Orange)</label>
            <input
              required
              maxLength={120}
              placeholder="np. Prąd Enea, Netflix, Internet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-slate-400"
              id="input-payment-name"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Kwota (zł)</label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-slate-400"
              id="input-payment-amount"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Termin płatności</label>
            <input
              required
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-slate-400"
              id="input-payment-date"
            />
          </div>
          
          {activeProfile?.kind === "shared" && (
            <div className="border-t border-slate-100 pt-3">
              {!activeProfile.partnerName ? (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 text-center font-medium">
                  Uzupełnij imię partnera w ustawieniach profilu, by dzielić koszty.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Kto płaci?</label>
                    <select
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none focus:border-slate-400 bg-white"
                      id="select-payment-paidby"
                    >
                      <option value="me">Ja ({activeProfile.name})</option>
                      <option value="partner">Partner ({activeProfile.partnerName})</option>
                      <option value="joint">Wspólne konto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Dzielimy 50/50?</label>
                    <select
                      value={splitMode}
                      onChange={(e) => setSplitMode(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none focus:border-slate-400 bg-white"
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            id="btn-payment-submit"
          >
            {isSubmitting ? "Zapisywanie..." : initialData ? "Zapisz zmiany" : "Dodaj płatność"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
