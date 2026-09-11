import React, { useState, useEffect, useRef } from "react";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { motion } from "motion/react";
import { useApp } from "../app/providers/AppContext";
import { getLocalDateIso, parseAmountInput } from "../utils";
import { callAiApi, getAiConfig } from "../services/aiClient";
import { AlertCircle, Loader2, ScanLine, X } from "lucide-react";

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
  const [isScanningInvoice, setIsScanningInvoice] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  
  const [paidBy, setPaidBy] = useState<"me" | "partner" | "joint">("me");
  const [splitMode, setSplitMode] = useState<"none" | "equal">("equal");

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setIsScanningInvoice(false);
      setScanError(null);
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

  const handleInvoiceScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setScanError("Wybierz obraz JPG, PNG lub WebP.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setScanError("Obraz faktury jest zbyt duży (maksymalnie 3 MB).");
      return;
    }
    if (state.aiMode !== "cloud") {
      setScanError("Skanowanie faktur wymaga trybu chmurowego AI (Gemini).");
      return;
    }
    setIsScanningInvoice(true);
    setScanError(null);
    try {
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = typeof reader.result === "string" ? reader.result : "";
          const [, base64] = result.split(",", 2);
          base64 ? resolve(base64) : reject(new Error("Nie udało się odczytać obrazu."));
        };
        reader.onerror = () => reject(new Error("Nie udało się odczytać pliku faktury."));
        reader.readAsDataURL(file);
      });
      const result = await callAiApi("scan-invoice", {
        imageBase64,
        mimeType: file.type
      }, getAiConfig(state));
      const scannedName = typeof result?.name === "string" ? result.name.trim() : "";
      const scannedAmount = Number(result?.amount);
      const scannedDueDate = typeof result?.dueDate === "string" ? result.dueDate : "";
      if (!scannedName || !Number.isFinite(scannedAmount) || scannedAmount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(scannedDueDate)) {
        throw new Error("AI zwróciło niepełne dane faktury. Uzupełnij formularz ręcznie.");
      }
      setName(scannedName);
      setAmount(String(scannedAmount));
      setDueDate(scannedDueDate);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Nie udało się zeskanować faktury.");
    } finally {
      setIsScanningInvoice(false);
    }
  };

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
          <div className="rounded-xl border border-brand/20 bg-brand-subtle p-3">
            <div className="flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-brand" />
              <div>
                <p className="text-xs font-bold text-text-main">Skanuj fakturę</p>
                <p className="text-[11px] text-text-muted">Gemini odczyta nazwę, kwotę i termin. Sprawdź wynik przed zapisaniem.</p>
              </div>
            </div>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-brand/20 bg-surface px-3 py-2 text-xs font-bold text-brand hover:bg-surface-2">
              {isScanningInvoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5" />}
              {isScanningInvoice ? "Skanowanie..." : "Wybierz obraz faktury"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleInvoiceScan} disabled={isScanningInvoice} />
            </label>
            {scanError && (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-danger">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {scanError}
              </p>
            )}
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
