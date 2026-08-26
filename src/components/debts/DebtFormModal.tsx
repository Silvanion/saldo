import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Landmark, Home, CreditCard, Banknote, ShoppingBag, Percent, AlertCircle } from "lucide-react";
import { DebtItem, DebtType, SupportedCurrency } from "../../types";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { parseAmountInput } from "../../utils/format";

interface DebtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<DebtItem, "id" | "createdAt">) => void;
  initialData?: DebtItem | null;
  currency?: SupportedCurrency;
}

export function DebtFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  currency = "PLN"
}: DebtFormModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const isEditing = Boolean(initialData);

  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [type, setType] = useState<DebtType>("mortgage");
  const [balance, setBalance] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [rateType, setRateType] = useState<"fixed" | "variable">("fixed");
  const [endDate, setEndDate] = useState("");
  const [fixedRateEndDate, setFixedRateEndDate] = useState("");
  const [nextPaymentDate, setNextPaymentDate] = useState("");
  const [propertyValue, setPropertyValue] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [status, setStatus] = useState<"active" | "closed">("active");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || "");
        setInstitution(initialData.institution || "");
        setType(initialData.type || "mortgage");
        setBalance(String(initialData.balance ?? ""));
        setOriginalAmount(initialData.originalAmount ? String(initialData.originalAmount) : "");
        setMonthlyPayment(String(initialData.monthlyPayment ?? ""));
        setInterestRate(String(initialData.interestRate ?? ""));
        setRateType(initialData.rateType || "fixed");
        setEndDate(initialData.endDate || "");
        setFixedRateEndDate(initialData.fixedRateEndDate || "");
        setNextPaymentDate(initialData.nextPaymentDate || "");
        setPropertyValue(initialData.propertyValue ? String(initialData.propertyValue) : "");
        setCreditLimit(initialData.creditLimit ? String(initialData.creditLimit) : "");
        setStatus(initialData.status || "active");
        setNotes(initialData.notes || "");
      } else {
        setName("");
        setInstitution("");
        setType("mortgage");
        setBalance("");
        setOriginalAmount("");
        setMonthlyPayment("");
        setInterestRate("");
        setRateType("fixed");
        setEndDate("");
        setFixedRateEndDate("");
        setNextPaymentDate("");
        setPropertyValue("");
        setCreditLimit("");
        setStatus("active");
        setNotes("");
      }
      setErrorMsg(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg("Podaj nazwę zobowiązania (np. Kredyt hipoteczny).");
      return;
    }

    const numBalance = parseAmountInput(balance);
    if (numBalance === null || numBalance < 0) {
      setErrorMsg("Podaj prawidłowe aktualne saldo zadłużenia (np. 350000).");
      return;
    }

    const numPayment = monthlyPayment ? parseAmountInput(monthlyPayment) : 0;
    if (numPayment === null || numPayment < 0) {
      setErrorMsg("Wysokość miesięcznej raty nie może być ujemna.");
      return;
    }

    const numRate = interestRate ? parseAmountInput(interestRate) : 0;
    if (numRate === null || numRate < 0) {
      setErrorMsg("Oprocentowanie nie może być ujemne.");
      return;
    }

    // originalAmount/propertyValue/creditLimit są opcjonalne, ale jeśli ktoś coś wpisał,
    // musi się dać sparsować — wcześniej śmieci ("abc", "1e999") lądowały w danych jako
    // NaN/Infinity bez żadnego komunikatu.
    if (originalAmount && parseAmountInput(originalAmount) === null) {
      setErrorMsg("Podaj prawidłową pierwotną kwotę zobowiązania albo zostaw pole puste.");
      return;
    }
    if (propertyValue && parseAmountInput(propertyValue) === null) {
      setErrorMsg("Podaj prawidłową szacowaną wartość nieruchomości albo zostaw pole puste.");
      return;
    }
    if (creditLimit && parseAmountInput(creditLimit) === null) {
      setErrorMsg("Podaj prawidłowy przyznany limit albo zostaw pole puste.");
      return;
    }

    const numOriginal = originalAmount ? parseAmountInput(originalAmount) ?? undefined : undefined;
    const numProperty = propertyValue ? parseAmountInput(propertyValue) ?? undefined : undefined;
    const numLimit = creditLimit ? parseAmountInput(creditLimit) ?? undefined : undefined;

    onSave({
      name: cleanName,
      institution: institution.trim() || "Własna",
      type,
      currency,
      balance: numBalance,
      originalAmount: numOriginal,
      monthlyPayment: numPayment,
      interestRate: numRate,
      rateType: type === "mortgage" ? rateType : undefined,
      endDate: endDate.trim() || undefined,
      fixedRateEndDate: fixedRateEndDate.trim() || undefined,
      nextPaymentDate: nextPaymentDate.trim() || undefined,
      propertyValue: numProperty,
      creditLimit: numLimit,
      status,
      notes: notes.trim() || undefined
    });

    onClose();
  };

  const getTypeLabel = (t: DebtType) => {
    switch (t) {
      case "mortgage":
        return "Hipoteka";
      case "credit_card":
        return "Karta kredytowa";
      case "cash_loan":
        return "Kredyt gotówkowy";
      case "revolving":
        return "Limit odnawialny";
      case "bnpl":
        return "Raty 0% / BNPL";
      default:
        return "Inne zadłużenie";
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15 }}
          className="bg-surface border border-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="debt-form-modal-title"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between shrink-0 bg-surface-2/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h2 id="debt-form-modal-title" className="text-base sm:text-lg font-bold text-text-main">
                  {isEditing ? "Edytuj zobowiązanie" : "Dodaj nowe zobowiązanie"}
                </h2>
                <p className="text-xs text-text-muted">
                  Wprowadź parametry długu, aby śledzić koszty, raty i symulacje nadpłat
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-full transition cursor-pointer"
              aria-label="Zamknij formularz"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5">
            {errorMsg && (
              <div className="p-3 bg-danger-subtle border border-danger/20 rounded-xl text-danger text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Type selector chips */}
            <div>
              <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-2">
                Typ zobowiązania
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(["mortgage", "credit_card", "cash_loan", "revolving", "bnpl", "other"] as DebtType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex items-center gap-2 ${
                      type === t
                        ? "bg-brand-subtle text-brand border-brand/40 shadow-2xs"
                        : "bg-surface-2 text-text-muted hover:text-text-main border-border/70"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current shrink-0" />
                    <span className="truncate">{getTypeLabel(t)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Core Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                  Nazwa zobowiązania *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={type === "mortgage" ? "Hipoteka mieszkanie" : "np. Karta Visa Gold"}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                  Bank / Instytucja
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="np. PKO BP, mBank, Santander"
                  className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                  Aktualne saldo zadłużenia *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    placeholder="350000"
                    className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-12"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-text-muted font-bold pointer-events-none">
                    {currency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                  Pierwotna kwota zobowiązania
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={originalAmount}
                    onChange={(e) => setOriginalAmount(e.target.value)}
                    placeholder="np. 350000"
                    className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-12"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-text-muted font-bold pointer-events-none">
                    {currency}
                  </span>
                </div>
                <p className="text-[11px] text-text-faint mt-1">Do wyliczenia paska postępu spłaty. Zostaw puste, jeśli nie znasz.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                  Miesięczna rata / spłata *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={monthlyPayment}
                    onChange={(e) => setMonthlyPayment(e.target.value)}
                    placeholder="2500"
                    className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-12"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-text-muted font-bold pointer-events-none">
                    {currency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                  Oprocentowanie nominalne / APR (%) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="6.85"
                    className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-8"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-text-muted font-bold pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                  Horyzont / Data końca spłaty
                </label>
                <input
                  type="text"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="np. 2051 lub 11.2028"
                  className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
              </div>
            </div>

            {/* Type-Specific Extra Fields */}
            {type === "mortgage" && (
              <div className="p-4 bg-brand-subtle/30 border border-brand/20 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand">
                  Szczegóły kredytu hipotecznego
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-faint uppercase tracking-wider mb-1">
                      Rodzaj stopy
                    </label>
                    <select
                      value={rateType}
                      onChange={(e) => setRateType(e.target.value as any)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                    >
                      <option value="fixed">Stała stopa</option>
                      <option value="variable">Zmienna stopa (WIBOR/WIRON)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-faint uppercase tracking-wider mb-1">
                      Koniec okresu stałej stopy
                    </label>
                    <input
                      type="text"
                      value={fixedRateEndDate}
                      onChange={(e) => setFixedRateEndDate(e.target.value)}
                      placeholder="np. 03.2028"
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-faint uppercase tracking-wider mb-1">
                      Szacowana wartość nieruchomości
                    </label>
                    <input
                      type="number"
                      value={propertyValue}
                      onChange={(e) => setPropertyValue(e.target.value)}
                      placeholder="np. 540000"
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums"
                    />
                  </div>
                </div>
              </div>
            )}

            {(type === "credit_card" || type === "revolving") && (
              <div className="p-4 bg-surface-2/60 border border-border rounded-2xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-faint">
                  Parametry karty / limitu
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-text-faint uppercase tracking-wider mb-1">
                      Przyznany limit całkowity
                    </label>
                    <input
                      type="number"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      placeholder="np. 15000"
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-faint uppercase tracking-wider mb-1">
                      Termin najbliższej spłaty
                    </label>
                    <input
                      type="text"
                      value={nextPaymentDate}
                      onChange={(e) => setNextPaymentDate(e.target.value)}
                      placeholder="np. 5 września"
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Status & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                  Status zobowiązania
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                >
                  <option value="active">Aktywne (spłacane)</option>
                  <option value="closed">Spłacone / Zamknięte</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                  Notatki (opcjonalnie)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="np. Kredyt z dopłatą, numer umowy"
                  className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-text-muted hover:text-text-main rounded-xl hover:bg-surface-2 transition cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-text-inverse text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                {isEditing ? "Zapisz zmiany" : "Dodaj zobowiązanie"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
