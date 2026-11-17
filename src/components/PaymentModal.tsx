import React, { useState, useEffect, useRef } from "react";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { motion } from "motion/react";
import { useApp } from "../app/providers/AppContext";
import { getLocalDateIso, parseAmountInput } from "../utils";
import { X, ClipboardPaste, Check, ChevronDown, ChevronUp } from "lucide-react";
import { parseInvoiceText } from "../services/invoiceParser";

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  onSave: (data: { name: string; amount: number; dueDate: string; paidBy?: "me" | "partner" | "joint"; splitMode?: "none" | "equal" }) => void;
}

export function PaymentModal({ isOpen, onClose, initialData, onSave }: PaymentModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);
  const { state } = useApp();
  const activeProfile = state.profiles.find(p => p.id === state.activeProfileId);
  const currency = activeProfile?.currency || "PLN";
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(getLocalDateIso());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [paidBy, setPaidBy] = useState<"me" | "partner" | "joint">("me");
  const [splitMode, setSplitMode] = useState<"none" | "equal">("equal");

  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pastedInvoiceText, setPastedInvoiceText] = useState("");
  const [parseNotice, setParseNotice] = useState<string | null>(null);

  const handleParseInvoice = () => {
    if (!pastedInvoiceText.trim()) return;
    const parsed = parseInvoiceText(pastedInvoiceText);
    if (parsed.name) setName(parsed.name);
    if (parsed.amount) setAmount(String(parsed.amount));
    if (parsed.dueDate) setDueDate(parsed.dueDate);

    const detectedParts: string[] = [];
    if (parsed.name) detectedParts.push(`odbiorcę: ${parsed.name}`);
    if (parsed.amount) detectedParts.push(`kwotę: ${parsed.amount} ${currency}`);
    if (parsed.dueDate) detectedParts.push(`termin: ${parsed.dueDate}`);

    if (detectedParts.length > 0) {
      setParseNotice(`Rozpoznano ${detectedParts.join(", ")}.`);
      setShowPasteBox(false);
    } else {
      setParseNotice("Nie udało się rozpoznać kwoty ani terminu w podanym tekście.");
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      if (initialData && typeof initialData === "object" && !("nativeEvent" in initialData)) {
        // Payload może być częściowy (wypełnienie wstępne), więc każde pole ma wartość zapasową.
        setName(initialData.name || "");
        setAmount(
          typeof initialData.amount === "number" && Number.isFinite(initialData.amount) && initialData.amount > 0
            ? String(initialData.amount)
            : ""
        );
        setDueDate(initialData.dueDate || getLocalDateIso());
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
    const numAmt = parseAmountInput(amount);
    if (numAmt === null || numAmt <= 0) return;
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
        className="relative w-full max-w-md rounded-xl bg-surface border border-border/70 shadow-lg flex flex-col max-h-[90vh] overflow-hidden"
       ref={modalRef}>
        <div className="shrink-0 p-6 pb-4 border-b border-border/70 relative bg-surface sticky top-0 z-20">
          <button
            onClick={onClose}
            aria-label="Zamknij"
            className="absolute top-5 right-5 text-text-muted hover:text-text-main hover:bg-surface-offset p-2 rounded-xl transition-colors active:scale-95 shrink-0 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
            id="close-payment-modal"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-xs font-bold text-text-faint uppercase tracking-wider mb-0.5 truncate" title={initialData?.id ? "Edycja Płatności" : "Nowa Płatność"}>
            {initialData?.id ? "Edycja Płatności" : "Nowa Płatność"}
          </p>
          <h2 id="payment-modal-title" className="text-xl sm:text-2xl font-bold text-text-main min-w-0 truncate" title={initialData?.id ? "Edytuj rachunek" : "Dodaj rachunek"}>
            {initialData?.id ? "Edytuj rachunek" : "Dodaj rachunek"}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 min-w-0">
          <div className="flex-1 overflow-y-auto min-w-0 p-6 space-y-4 custom-scrollbar">
          {/* Szybkie uzupełnienie z tekstu faktury/przelewu */}
          <div className="bg-surface-2/60 border border-border/80 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowPasteBox(!showPasteBox)}
                className="text-xs font-semibold text-brand hover:text-brand flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                id="btn-toggle-paste-invoice"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>{showPasteBox ? "Ukryj rozpoznawanie z tekstu" : "Wklej tekst faktury lub przelewu"}</span>
                {showPasteBox ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <span className="text-[10px] text-text-muted font-medium">100% offline</span>
            </div>

            {showPasteBox && (
              <div className="space-y-2 pt-1">
                <textarea
                  rows={3}
                  placeholder="Wklej treść faktury, maila lub SMS-a (np. PGE Obrót S.A., do zapłaty: 145,50 zł, termin: 2026-05-10)..."
                  value={pastedInvoiceText}
                  onChange={(e) => setPastedInvoiceText(e.target.value)}
                  className="w-full text-xs rounded-xl border border-border p-2.5 bg-surface text-text-main placeholder:text-text-faint focus-visible:ring-2 focus-visible:ring-focus-ring custom-scrollbar"
                  id="textarea-paste-invoice"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleParseInvoice}
                    disabled={!pastedInvoiceText.trim()}
                    className="text-xs font-semibold bg-brand text-text-inverse px-3 py-1.5 rounded-lg hover:bg-brand-hover disabled:opacity-50 transition-all cursor-pointer"
                    id="btn-apply-parsed-invoice"
                  >
                    Wypełnij formularz
                  </button>
                </div>
              </div>
            )}

            {parseNotice && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5 shrink-0" /> {parseNotice}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-text-main mb-1.5" htmlFor="input-payment-name">
              Nazwa (np. Internet Orange)
            </label>
            <input
              required
              maxLength={120}
              placeholder="np. Prąd Enea, Netflix, Internet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring bg-surface text-text-main placeholder:text-text-faint transition-colors"
              id="input-payment-name"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-main mb-1.5" htmlFor="input-payment-amount">
              Kwota ({currency})
            </label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-sm rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring bg-surface text-text-main placeholder:text-text-faint transition-colors"
              id="input-payment-amount"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-main mb-1.5" htmlFor="input-payment-date">
              Termin płatności
            </label>
            <input
              required
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-sm rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring bg-surface text-text-main placeholder:text-text-faint transition-colors"
              id="input-payment-date"
            />
          </div>
          
          {activeProfile?.kind === "shared" && (
            <div className="p-4 bg-surface-2/60 border border-border/80 rounded-2xl space-y-3" id="payment-shared-section">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <p className="text-xs font-bold text-text-faint uppercase tracking-wider truncate">
                  Rozliczenie Wspólne
                </p>
                <span className="text-[10px] font-bold text-brand bg-brand-subtle border border-brand/20 px-1.5 py-0.5 rounded-md shrink-0">
                  Podział kosztów
                </span>
              </div>
              {!activeProfile.partnerName ? (
                <div className="text-xs bg-warning-subtle border border-warning/30 text-warning rounded-xl p-3 text-center font-medium">
                  Uzupełnij imię partnera w ustawieniach profilu, by dzielić koszty.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1.5" htmlFor="select-payment-paidby">
                      Kto płaci?
                    </label>
                    <select
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value as any)}
                      className="w-full text-sm rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring bg-surface text-text-main transition-colors cursor-pointer"
                      id="select-payment-paidby"
                    >
                      <option value="me">Ja ({activeProfile.name})</option>
                      <option value="partner">Partner ({activeProfile.partnerName})</option>
                      <option value="joint">Wspólne konto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-main mb-1.5" htmlFor="select-payment-splitmode">
                      Dzielimy 50/50?
                    </label>
                    <select
                      value={splitMode}
                      onChange={(e) => setSplitMode(e.target.value as any)}
                      className="w-full text-sm rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring bg-surface text-text-main transition-colors cursor-pointer"
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
          
          <div className="shrink-0 p-6 pt-4 border-t border-border bg-surface rounded-b-3xl flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-text-muted hover:text-text-main hover:bg-surface-offset border border-border rounded-xl transition-all active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="btn-payment-cancel"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-brand text-text-inverse hover:bg-brand-hover active:scale-[0.98] transition-all font-bold py-2.5 px-4 rounded-xl shadow-sm text-xs flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
              id="btn-payment-submit"
            >
              <span className="truncate" title={isSubmitting ? "Zapisywanie..." : initialData?.id ? "Zapisz zmiany" : "Dodaj płatność"}>
                {isSubmitting ? "Zapisywanie..." : initialData?.id ? "Zapisz zmiany" : "Dodaj płatność"}
              </span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
