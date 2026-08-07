import React, { useState, useEffect, useRef } from "react";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { motion } from "motion/react";
import { useApp } from "../app/providers/AppContext";
import { expenseCategories, incomeCategories, iconByCategory, getLocalDateIso } from "../utils";
import { checkDuplicate } from "../services/duplicateDetector";

export interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile?: any;
  initialData?: any;
  onSave: (data: {
    name: string;
    amount: number;
    category: string;
    categoryIcon?: string;
    account: string;
    type: "income" | "expense";
    isoDate: string;
    tags?: string[];
  }) => void;
}

export function TransactionModal({ isOpen, onClose, activeProfile, initialData, onSave }: TransactionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const { state } = useApp();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("🛒");
  const [account, setAccount] = useState("Konto główne");
  const [date, setDate] = useState(getLocalDateIso());
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [paidBy, setPaidBy] = useState<"me" | "partner" | "joint">("me");
  const [splitMode, setSplitMode] = useState<"none" | "equal">("equal");
  const [currency, setCurrency] = useState<import("../types").SupportedCurrency>("PLN");
  
  useEffect(() => {
    if (type === "income") {
      setSplitMode("none");
    } else {
      setSplitMode("equal");
    }
  }, [type]);

  const isEditing = initialData && typeof initialData === "object" && "amount" in initialData && "name" in initialData;

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      if (isEditing) {
        setType(initialData.type);
        setAmount(initialData.amount.toString());
        setName(initialData.name);
        setCategory(initialData.category);
        setCategoryIcon(initialData.categoryIcon || "✨");
        setAccount(initialData.account);
        setDate(initialData.isoDate);
        setTags(initialData.tags || []);
        if (activeProfile?.kind === "shared" && "paidBy" in initialData) {
          setPaidBy(initialData.paidBy as "me" | "partner" | "joint" || "me");
          setSplitMode(initialData.splitMode as "none" | "equal" || "equal");
        }
        setCurrency(initialData.currency || activeProfile?.currency || "PLN");
      } else {
        // defaults
        setType("expense");
        setAmount("");
        setName("");
        setAccount("Konto główne");
        setDate(getLocalDateIso());
        setTags([]);
        setPaidBy("me");
        setSplitMode("equal");
        setCurrency(activeProfile?.currency || "PLN");
      }
    }
  }, [isOpen, initialData, activeProfile]);

  useEffect(() => {
    if (isEditing && initialData.category) return; // Do not override if editing
    const defaultCats = type === "income" ? incomeCategories : expenseCategories;
    const initialCat = defaultCats[0];
    setCategory(initialCat);
    setCategoryIcon(iconByCategory[initialCat] || "✨");
  }, [type, initialData]);

  const duplicateWarning = React.useMemo(() => {
    if (!isOpen) return null;
    const numAmt = parseFloat(amount.replace(",", "."));
    if (isNaN(numAmt) || numAmt <= 0 || !name || !date) return null;
    const res = checkDuplicate(
      { name, amount: numAmt, category, categoryIcon, account, type, isoDate: date, tags, currency },
      activeProfile?.transactions || []
    );
    return res.isLikelyDuplicate ? res : null;
  }, [name, amount, type, date, category, currency, activeProfile, isOpen]);

  if (!isOpen) return null;

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    setCategoryIcon(iconByCategory[newCat] || "✨");
  };

  const handleAddTag = (text: string) => {
    const clean = text.trim().toLowerCase();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmed = tagInput.replace(",", "").trim();
      if (trimmed) {
        handleAddTag(trimmed);
        setTagInput("");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const numAmt = parseFloat(amount.replace(",", "."));
    if (isNaN(numAmt) || numAmt <= 0) return;
    setIsSubmitting(true);
    const payload: any = { name, amount: numAmt, category, categoryIcon, account, type, isoDate: date, tags, currency };
    if (activeProfile?.kind === "shared") {
      payload.paidBy = paidBy;
      payload.splitMode = splitMode;
    }
    onSave(payload);
    onClose();
    // Reset form
    setAmount("");
    setName("");
    setType("expense");
    setAccount("Konto główne");
    setDate(getLocalDateIso());
    setTags([]);
    setTagInput("");
    setPaidBy("me");
    setSplitMode("equal");
    setCurrency(activeProfile?.currency || "PLN");
  };

  const categories = type === "income" ? incomeCategories : expenseCategories;
  const suggestions = ["wakacje", "remont", "rozrywka", "prezent", "zakupy", "dom", "hobby", "zdrowie"];

  const availableIcons = [
    "🛒", "🏠", "🚗", "❤️", "🎬", "✨", "🍕", "☕", "🍺", "🍏",
    "🔑", "💡", "🔌", "🚲", "✈️", "🩺", "💊", "🎮", "🍿", "🛍️",
    "💰", "💼", "🎁", "↩️", "📈", "💵", "💳", "📱", "🎓", "🧱"
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs"
      id="tx-modal"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-3xl bg-bg-base/95 backdrop-blur-2xl shadow-sm flex flex-col max-h-[90vh] overflow-hidden"
       ref={modalRef}>
        <div className="shrink-0 p-6 pb-4 border-b border-border relative bg-bg-base/95 backdrop-blur-2xl sticky top-0 z-20">
          <button onClick={onClose} aria-label="Zamknij" className="absolute top-5 right-5 text-2xl leading-none text-text-muted hover:text-text-main hover:bg-surface-offset p-2 rounded-full transition-colors active:scale-95 shrink-0 w-10 h-10 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" id="close-tx-modal">
            &times;
          </button>
          <p className="text-xs font-medium text-text-muted truncate" title="Nowy Wpis">Nowy Wpis</p>
          <h2 id="tx-modal-title" className="text-2xl font-bold text-text-main min-w-0 truncate" title="Dodaj transakcję">Dodaj transakcję</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 min-w-0">
          <div className="flex-1 overflow-y-auto min-w-0 p-6 space-y-4 custom-scrollbar">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              className={`w-1/2 rounded-md py-2 text-sm font-bold transition-all active:scale-[0.98] ${
                type === "expense" ? "bg-surface text-rose-600 border border-border shadow-sm" : "text-text-muted hover:text-text-main hover:bg-surface-offset"
              }`}
              onClick={() => setType("expense")}
              id="btn-type-expense"
            >
              Wydatek
            </button>
            <button
              type="button"
              className={`w-1/2 rounded-md py-2 text-sm font-bold transition-all active:scale-[0.98] ${
                type === "income" ? "bg-brand text-white shadow-sm border border-brand/20" : "text-text-muted hover:text-text-main hover:bg-surface-offset"
              }`}
              onClick={() => setType("income")}
              id="btn-type-income"
            >
              Przychód
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-muted mb-1">Kwota</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-border p-2.5 outline-none focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand bg-surface text-text-main placeholder:text-text-faint transition-colors"
                id="input-tx-amount"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Waluta</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full rounded-xl border border-border p-2.5 outline-none bg-surface text-text-main placeholder:text-text-faint focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand transition-colors"
              >
                <option value="PLN">PLN</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Opis transakcji</label>
            <input
              required
              maxLength={120}
              placeholder="np. Zakupy Biedronka"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-border p-2.5 outline-none focus-visible:border-brand/50 bg-surface text-text-main placeholder:text-text-faint"
              id="input-tx-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Kategoria</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full rounded-xl border border-border p-2.5 outline-none bg-surface text-text-main placeholder:text-text-faint focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand transition-colors"
                id="select-tx-category"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Konto / Portfel</label>

              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full rounded-xl border border-border p-2.5 outline-none bg-surface text-text-main placeholder:text-text-faint focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand transition-colors"
                id="select-tx-account"
              >
                {(activeProfile?.accounts && activeProfile.accounts.length > 0) ? (
                  activeProfile.accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.name}>{acc.name} {acc.bankName ? `(${acc.bankName})` : ''}</option>
                  ))
                ) : (
                  <>
                    <option value="Konto główne">Konto główne</option>
                    <option value="Gotówka">Gotówka</option>
                    <option value="Konto oszczędnościowe">Oszczędnościowe</option>
                  </>
                )}
              </select>

            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Ikona kategorii</label>
            <div className="flex items-center gap-3 p-2.5 border border-border rounded-xl">
              <span className="text-2xl w-10 h-10 flex items-center justify-center bg-surface text-text-main rounded-xl border border-border font-bold shrink-0">
                {categoryIcon}
              </span>
              <div className="flex-1 flex flex-wrap gap-1.5 py-1 min-w-0 max-h-32 overflow-y-auto custom-scrollbar">
                {availableIcons.map((ico) => (
                  <button
                    key={ico}
                    type="button"
                    onClick={() => setCategoryIcon(ico)}
                    className={`text-lg p-1 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition shrink-0 ${
                      categoryIcon === ico ? "bg-slate-100 border-2 border-slate-900" : "border border-transparent"
                    }`}
                  >
                    {ico}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Data</label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-border p-2.5 outline-none focus-visible:border-brand/50 bg-surface text-text-main placeholder:text-text-faint"
              id="input-tx-date"
            />
          </div>

          {/* Tagowanie wydatków */}
          <div className="border-t border-border pt-3">
            <label className="block text-xs font-medium text-text-muted mb-1">Tagi (opcjonalnie)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Dodaj tag (np. wakacje) i wciśnij Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                className="flex-1 rounded-xl border border-border p-2 text-xs outline-none focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand bg-surface text-text-main placeholder:text-text-faint transition-colors"
                id="input-tx-tag"
              />
              <button
                type="button"
                onClick={() => {
                  if (tagInput.trim()) {
                    handleAddTag(tagInput);
                    setTagInput("");
                  }
                }}
                className="rounded-xl bg-surface-offset px-3 py-2 text-xs font-semibold text-text-main hover:bg-border active:scale-[0.98] transition-all"
                id="btn-tx-add-tag"
              >
                Dodaj
              </button>
            </div>

            {/* Wybrane tagi */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2" id="tx-tags-list">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-text-main border border-border/60"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-xs font-medium text-text-muted hover:text-text-muted"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Sugerowane tagi */}
            <div className="mt-2.5">
              <p className="text-xs font-medium text-text-muted mb-1">Szybkie sugestie:</p>
              <div className="flex flex-wrap gap-1">
                {suggestions.map((sug) => {
                  const isSelected = tags.includes(sug);
                  return (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => isSelected ? handleRemoveTag(sug) : handleAddTag(sug)}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border transition-all active:scale-[0.98] ${
                        isSelected
                          ? "bg-surface text-brand border-brand/30 shadow-sm"
                          : "bg-surface text-text-muted border-border hover:bg-surface-offset hover:text-text-main"
                      }`}
                    >
                      +{sug}
                    </button>
                  );
                })}
              </div>
            </div>
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
                    <label className="block text-xs font-medium text-text-muted mb-1">Kto {type === 'expense' ? 'zapłacił' : 'otrzymał'}?</label>
                    <select
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value as any)}
                      className="w-full rounded-xl border border-border p-2 text-sm outline-none focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand bg-surface transition-colors"
                      id="select-transaction-paidby"
                    >
                      <option value="me">Ja ({activeProfile.name})</option>
                      <option value="partner">Partner ({activeProfile.partnerName})</option>
                      <option value="joint">Wspólne konto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Dzielimy 50/50?</label>
                    <select
                      value={splitMode}
                      onChange={(e) => setSplitMode(e.target.value as any)}
                      className="w-full rounded-xl border border-border p-2 text-sm outline-none focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand bg-surface transition-colors"
                      id="select-transaction-splitmode"
                    >
                      <option value="equal">Tak</option>
                      <option value="none">Nie</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {duplicateWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <span className="text-xl mt-0.5">⚠️</span>
              <div>
                <p className="text-xs font-semibold text-amber-900">Prawdopodobny duplikat</p>
                <p className="text-xs text-amber-700">{duplicateWarning.reason}</p>
              </div>
            </div>
          )}

          </div>

          <div className="shrink-0 p-6 pt-4 border-t border-border bg-bg-base/95 backdrop-blur-2xl rounded-b-3xl">
            {isEditing ? (
              <button
                type="button"
                onClick={() => onClose()}
                className="w-full bg-surface-offset text-text-main hover:bg-border active:scale-[0.98] transition-all font-bold py-3.5 px-4 rounded-xl mb-3 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Anuluj
              </button>
            ) : null}

            <button
              type="submit"
              disabled={!amount || !name || isSubmitting || !!duplicateWarning}
              className="w-full bg-brand text-white hover:bg-brand-hover active:scale-[0.98] transition-all font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <span className="truncate" title={isSubmitting ? "Zapisywanie..." : isEditing ? "Zapisz zmiany" : "Dodaj transakcję"}>
                {isSubmitting ? "Zapisywanie..." : isEditing ? "Zapisz zmiany" : "Dodaj transakcję"}
              </span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
