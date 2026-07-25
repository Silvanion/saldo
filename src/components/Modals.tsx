import { auth } from "../firebase";
import { Camera, Loader2, Lock, AlertTriangle, Download } from "lucide-react";
import { callAiApi, getAiConfig } from "../services/aiClient";
import { useApp } from "../app/providers/AppContext";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Profile } from "../types";
import { expenseCategories, incomeCategories, budgetCategories, iconByCategory, getLocalDateIso } from "../utils";
import { checkDuplicate } from "../services/duplicateDetector";

interface TransactionModalProps {
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
  
  useEffect(() => {
    if (type === "income") {
      setSplitMode("none");
    } else {
      setSplitMode("equal");
    }
  }, [type]);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      if (initialData) {
        setType(initialData.type);
        setAmount(initialData.amount.toString());
        setName(initialData.name);
        setCategory(initialData.category);
        setCategoryIcon(initialData.categoryIcon || "✨");
        setAccount(initialData.account);
        setDate(initialData.isoDate);
        setTags(initialData.tags || []);
        if (initialData.paidBy) setPaidBy(initialData.paidBy);
        if (initialData.splitMode) setSplitMode(initialData.splitMode);
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
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (initialData && initialData.category) return; // Do not override if editing
    const defaultCats = type === "income" ? incomeCategories : expenseCategories;
    const initialCat = defaultCats[0];
    setCategory(initialCat);
    setCategoryIcon(iconByCategory[initialCat] || "✨");
  }, [type, initialData]);

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
    const payload: any = { name, amount: numAmt, category, categoryIcon, account, type, isoDate: date, tags };
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
  };

  const duplicateWarning = React.useMemo(() => {
    const numAmt = parseFloat(amount.replace(",", "."));
    if (isNaN(numAmt) || numAmt <= 0 || !name || !date) return null;
    const res = checkDuplicate(
      { name, amount: numAmt, category, categoryIcon, account, type, isoDate: date, tags },
      activeProfile?.transactions || []
    );
    return res.isLikelyDuplicate ? res : null;
  }, [name, amount, type, date, category, activeProfile]);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="tx-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-slate-400 hover:text-slate-600" id="close-tx-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">Nowy Wpis</p>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Dodaj transakcję</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              className={`w-1/2 rounded-md py-2 text-sm font-bold transition ${
                type === "expense" ? "bg-white text-[#d55e50] shadow" : "text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => setType("expense")}
              id="btn-type-expense"
            >
              Wydatek
            </button>
            <button
              type="button"
              className={`w-1/2 rounded-md py-2 text-sm font-bold transition ${
                type === "income" ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => setType("income")}
              id="btn-type-income"
            >
              Przychód
            </button>
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
              id="input-tx-amount"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Opis transakcji</label>
            <input
              required
              maxLength={120}
              placeholder="np. Zakupy Biedronka"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-slate-400"
              id="input-tx-name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">Kategoria</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 outline-none bg-white focus:border-slate-400"
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
              <label className="block text-xs font-semibold text-slate-900 mb-1">Konto / Portfel</label>

              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 outline-none bg-white focus:border-slate-400"
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
            <label className="block text-xs font-semibold text-slate-900 mb-1">Ikona kategorii</label>
            <div className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-xl">
              <span className="text-2xl w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-900 rounded-xl border border-slate-200 font-bold shrink-0">
                {categoryIcon}
              </span>
              <div className="flex-1 overflow-x-auto whitespace-nowrap py-1 flex gap-1.5 max-w-[310px] scrollbar-thin">
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
            <label className="block text-xs font-semibold text-slate-900 mb-1">Data</label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-slate-400"
              id="input-tx-date"
            />
          </div>

          {/* Tagowanie wydatków */}
          <div className="border-t border-slate-100 pt-3">
            <label className="block text-xs font-semibold text-slate-900 mb-1">Tagi (opcjonalnie)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Dodaj tag (np. wakacje) i wciśnij Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                className="flex-1 rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-slate-400"
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
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
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
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200/60"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Sugerowane tagi */}
            <div className="mt-2.5">
              <p className="text-[10px] text-slate-400 font-medium mb-1">Szybkie sugestie:</p>
              <div className="flex flex-wrap gap-1">
                {suggestions.map((sug) => {
                  const isSelected = tags.includes(sug);
                  return (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => isSelected ? handleRemoveTag(sug) : handleAddTag(sug)}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition ${
                        isSelected
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
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
            <div className="border-t border-slate-100 pt-3">
              {!activeProfile.partnerName ? (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 text-center font-medium">
                  Uzupełnij imię partnera w ustawieniach profilu, by dzielić koszty.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Kto {type === 'expense' ? 'zapłacił' : 'otrzymał'}?</label>
                    <select
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 p-2 text-sm outline-none focus:border-slate-400 bg-white"
                      id="select-transaction-paidby"
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
                <p className="text-[11px] text-amber-700">{duplicateWarning.reason}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            id="btn-tx-submit"
          >
            {isSubmitting ? "Zapisywanie..." : "Zapisz transakcję"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

interface PaymentModalProps {
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


interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; target: number }) => void;
}

export function GoalModal({ isOpen, onClose, onSave }: GoalModalProps) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
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
    const numTgt = parseFloat(target.replace(",", "."));
    if (isNaN(numTgt) || numTgt <= 0) return;
    setIsSubmitting(true);
    onSave({ name, target: numTgt });
    onClose();
    setName("");
    setTarget("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="goal-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-slate-400 hover:text-slate-600" id="close-goal-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">Oszczędności</p>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Nowy cel oszczędnościowy</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Nazwa celu (np. Wakacje)</label>
            <input
              required
              maxLength={120}
              placeholder="np. Poduszka finansowa, Remont, Nowy laptop"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-slate-400"
              id="input-goal-name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Kwota docelowa (zł)</label>
            <input
              required
              type="number"
              min="1"
              placeholder="np. 15000"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-slate-400"
              id="input-goal-target"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            id="btn-goal-submit"
          >
            {isSubmitting ? "Tworzenie..." : "Utwórz cel"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

interface GoalDepositModalProps {
  isOpen: boolean;
  goalName: string;
  onClose: () => void;
  onSave: (amount: number) => void;
}

export function GoalDepositModal({ isOpen, goalName, onClose, onSave }: GoalDepositModalProps) {
  const [amount, setAmount] = useState("");
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
    const numAmt = parseFloat(amount.replace(",", "."));
    if (isNaN(numAmt) || numAmt === 0) return; // allow negative
    setIsSubmitting(true);
    onSave(numAmt);
    onClose();
    setAmount("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="goal-deposit-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-slate-400 hover:text-slate-600" id="close-goal-deposit-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">Transfer Celu</p>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Transfer: {goalName}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Kwota (wpłata lub wypłata)</label>
            <input
              required
              type="number"
              step="0.01"
              placeholder="np. 100 (wpłata) lub -50 (wypłata)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-slate-400"
              id="input-goal-deposit-amount"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            id="btn-goal-deposit-submit"
          >
            {isSubmitting ? "Zapisywanie..." : "Zapisz wpłatę"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudgets: Record<string, number>;
  onSave: (budgets: Record<string, number>) => void;
}

export function BudgetModal({ isOpen, onClose, currentBudgets, onSave }: BudgetModalProps) {
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const initialized: Record<string, string> = {};
    budgetCategories.forEach((cat) => {
      initialized[cat] = currentBudgets[cat] ? String(currentBudgets[cat]) : "";
    });
    setBudgets(initialized);
  }, [currentBudgets, isOpen]);

  if (!isOpen) return null;

  const handleChange = (cat: string, val: string) => {
    setBudgets((prev) => ({ ...prev, [cat]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const finalBudgets: Record<string, number> = {};
    budgetCategories.forEach((cat) => {
      const num = parseFloat(budgets[cat]?.replace(",", "."));
      finalBudgets[cat] = isNaN(num) || num < 0 ? 0 : num;
    });
    setIsSubmitting(true);
    onSave(finalBudgets);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="budget-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-slate-400 hover:text-slate-600" id="close-budget-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">Limity Miesięczne</p>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Ustaw limity wydatków</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {budgetCategories.map((category) => (
              <div key={category}>
                <label className="block text-xs font-semibold text-slate-900 mb-1">{category} (zł)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Brak limitu"
                  value={budgets[category] || ""}
                  onChange={(e) => handleChange(category, e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-slate-400"
                  id={`input-budget-${category}`}
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            id="btn-budget-submit"
          >
            {isSubmitting ? "Zapisywanie..." : "Zapisz limity"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

interface ProfileModalProps {
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
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-slate-400 hover:text-slate-600" id="close-profile-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">Zarządzanie profilami</p>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Utwórz profil</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Nazwa profilu (np. Moje Finanse)</label>
            <input
              required
              maxLength={80}
              placeholder="np. Budżet Seweryna, Domowy"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-slate-400"
              id="input-profile-name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Ikona profilu</label>
            <details className="group border border-slate-200 rounded-xl relative">
              <summary className="p-2.5 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 hover:bg-slate-100 flex items-center justify-between list-none select-none rounded-xl group-open:rounded-b-none group-open:border-b group-open:border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">{avatar}</span>
                  <span>Wybierz ikonę profilu</span>
                </div>
                <span className="group-open:rotate-180 transition-transform mr-2 text-slate-400">▼</span>
              </summary>
              <div className="p-3 border-t border-slate-200 bg-white absolute w-full z-10 shadow-lg rounded-b-lg">
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
                      className={`text-2xl p-2 rounded-xl border transition-all ${avatar === emoji ? 'bg-emerald-50 border-slate-900 shadow-sm' : 'bg-slate-50 border-slate-100 hover:bg-slate-100 grayscale hover:grayscale-0'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </details>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Rodzaj profilu</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "personal" | "shared")}
              className="w-full rounded-xl border border-slate-200 p-2.5 outline-none bg-white focus:border-slate-400"
              id="select-profile-kind"
            >
              <option value="personal">Tylko dla mnie (osobisty)</option>
              <option value="shared">Wspólny budżet dla rodziny (dwóch osób)</option>
            </select>
          </div>

          {kind === "shared" && (
            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">Imię partnera / członka rodziny</label>
              <input
                required
                pattern=".*\S+.*"
                title="Imię partnera nie może składać się z samych spacji"
                maxLength={80}
                placeholder="np. Ania, Marta, Piotr"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-slate-400"
                id="input-profile-partner"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Opcjonalny kod PIN (do blokady profilu)</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              minLength={4}
              maxLength={8}
              placeholder="Wpisz 4 do 8 cyfr"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 outline-none focus:border-slate-400"
              id="input-profile-pin"
            />
            <p className="text-[11px] text-slate-500 mt-1">Pozostaw puste, aby nie nakładać blokady.</p>
          </div>

          <div className="rounded-xl bg-slate-100 p-4">
            <p className="text-[12px] text-slate-900 leading-relaxed">
              <strong>Wskazówka rodzinna:</strong> Wspólny profil jest zsynchronizowany na serwerze w czasie rzeczywistym. Każdy członek rodziny wchodzący na ten sam link ma dostęp do tych samych danych.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            id="btn-profile-submit"
          >
            {isSubmitting ? "Tworzenie..." : "Utwórz profil"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pin: string) => void;
  onExportData?: () => void;
}

export function PinModal({ isOpen, onClose, onSave, onExportData }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [hasAcceptedWarning, setHasAcceptedWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setHasAcceptedWarning(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAcceptedWarning) return;
    if (!/^\d{4,8}$/.test(pin)) return;
    onSave(pin);
    onClose();
    setPin("");
    setHasAcceptedWarning(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      id="pin-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-slate-400 hover:text-slate-600 cursor-pointer" id="close-pin-modal">
          &times;
        </button>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#849590]">Ochrona profilu</p>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Ustaw kod PIN</h2>

        {/* Warning Copy Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Ostrzeżenie o braku odzyskiwania PIN</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Kod PIN służy do lokalnego szyfrowania danych profilu (AES-GCM / PBKDF2). Aplikacja działa w modelu zero-knowledge – <strong>Twój PIN nie jest przechowywany na żadnym serwerze</strong>.
          </p>
          <p className="text-[11px] font-semibold text-amber-900">
            W przypadku utraty PIN-u dostęp do danych profilu zostanie trwale zablokowany bez możliwości resetu.
          </p>

          {/* Export backup button */}
          {onExportData && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onExportData}
                className="w-full bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold py-2 px-3 rounded-lg text-xs transition flex items-center justify-center gap-2 border border-amber-300/60 shadow-2xs cursor-pointer"
                id="btn-export-backup-before-pin"
              >
                <Download className="w-3.5 h-3.5 text-amber-800" />
                Najpierw eksportuj backup (.json)
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1">Kod PIN (4-8 cyfr)</label>
            <input
              required
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              placeholder="np. 1234"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-center text-xl tracking-widest outline-none focus:border-slate-400"
              id="input-pin-code"
            />
          </div>

          <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/80 cursor-pointer text-xs text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={hasAcceptedWarning}
              onChange={(e) => setHasAcceptedWarning(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
              id="checkbox-pin-recovery-warning"
            />
            <span>Rozumiem, że utrata PIN = utrata danych profilu</span>
          </label>

          <button
            type="submit"
            disabled={!hasAcceptedWarning || !/^\d{4,8}$/.test(pin)}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            id="btn-pin-submit"
          >
            Zapisz PIN
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

interface UnlockModalProps {
  isOpen: boolean;
  profileName: string;
  onUnlock: (pin: string) => Promise<boolean>;
  onSelectOtherProfile: () => void;
}

export function UnlockModal({ isOpen, profileName, onUnlock, onSelectOtherProfile }: UnlockModalProps) {
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const success = await onUnlock(pin);
    if (success) {
      setPin("");
    } else {
      setErrorMsg("Nieprawidłowy kod PIN. Spróbuj ponownie.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 p-4 backdrop-blur-xs"
      id="unlock-modal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl ${isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-900">
            <Lock className="w-8 h-8" />
          </div>
        </div>
        
        <p className="text-[10px] font-bold uppercase tracking-wider text-center text-[#849590]">Zabezpieczony Profil</p>
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Podaj PIN</h2>
        <p className="text-sm text-slate-500 text-center mb-8">Profil <strong>{profileName}</strong> wymaga autoryzacji.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              required
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              placeholder="••••"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className={`w-full rounded-xl border-2 p-4 text-center text-3xl tracking-[1em] outline-none transition ${errorMsg ? 'border-red-300 focus:border-red-500 text-red-600 bg-red-50' : 'border-slate-100 focus:border-slate-400 text-slate-800'}`}
              id="input-unlock-pin"
            />
          </div>

          {errorMsg && (
            <p className="text-sm text-center text-[#d55e50] font-bold animate-fade-in" id="unlock-error-msg">
              {errorMsg}
            </p>
          )}

          <div className="pt-4 space-y-3">
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 py-4 text-sm font-bold text-white shadow-lg hover:bg-slate-800 hover:scale-[1.02] transition-all"
              id="btn-unlock-submit"
            >
              Odblokuj profil
            </button>
            
            <button
              type="button"
              onClick={onSelectOtherProfile}
              className="w-full rounded-xl py-3 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
              id="btn-unlock-other"
            >
              Wróć do wyboru profili
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export { ChangelogModal } from "./ChangelogModal";
