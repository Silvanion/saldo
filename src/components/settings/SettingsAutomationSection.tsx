import React, { useState } from "react";
import { Sliders, Trash2, Calendar } from "lucide-react";
import { AppState, RecurringRule, TransactionRule, SupportedCurrency } from "../../types";
import { expenseCategories, incomeCategories, iconByCategory } from "../../utils";

export function TransactionRulesManager({
  transactionRules,
  onSaveTransactionRules
}: {
  transactionRules: TransactionRule[];
  onSaveTransactionRules: (rules: TransactionRule[]) => void;
}) {
  const [rulePattern, setRulePattern] = useState("");
  const [ruleCategory, setRuleCategory] = useState("Żywność");

  const handleAddTransactionRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rulePattern.trim()) return;
    const newRule: TransactionRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      pattern: rulePattern.trim(),
      category: ruleCategory,
      categoryIcon: iconByCategory[ruleCategory] || "✨"
    };
    onSaveTransactionRules([...transactionRules, newRule]);
    setRulePattern("");
  };

  const handleDeleteTransactionRule = (id: string) => {
    onSaveTransactionRules(transactionRules.filter((r) => r.id !== id));
  };

  return (
    <div className="bg-surface rounded-xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-category-rules-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-border/40">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-main">Automatyzacja kategoryzacji</h3>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              Słowa kluczowe automatycznie przypisujące kategorie do nowych i importowanych transakcji.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-subtle text-brand border border-brand/20 shrink-0 self-start sm:self-auto">
          {transactionRules.length} {transactionRules.length === 1 ? "reguła" : "reguł"}
        </span>
      </div>

      <form onSubmit={handleAddTransactionRule} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 p-4 rounded-xl bg-surface-2/60 border border-border/70 shadow-xs">
        <div>
          <label className="block text-xs font-bold text-text-muted uppercase mb-1">Słowo kluczowe (Fraza)</label>
          <input
            type="text"
            value={rulePattern}
            onChange={(e) => setRulePattern(e.target.value)}
            placeholder="np. biedronka, netflix, orlen"
            className="w-full text-xs rounded-lg border border-border/70 p-2.5 bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-text-muted uppercase mb-1">Przypisz do kategorii</label>
          <select
            value={ruleCategory}
            onChange={(e) => setRuleCategory(e.target.value)}
            className="w-full text-xs rounded-lg border border-border/70 p-2.5 bg-surface focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs cursor-pointer"
          >
            {expenseCategories.concat(incomeCategories).filter((v, i, a) => a.indexOf(v) === i).map((cat) => (
              <option key={cat} value={cat}>
                {iconByCategory[cat] || "✨"} {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full bg-brand-subtle text-brand border border-brand/20 hover:bg-brand-subtle font-bold py-2.5 px-4 rounded-lg text-xs active:scale-[0.98] transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            ＋ Zapisz dopasowanie
          </button>
        </div>
      </form>

      {transactionRules.length === 0 ? (
        <div className="p-8 bg-surface-2/30 rounded-xl border border-dashed border-border/70 text-center flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center text-text-muted border border-border/70">
            <Sliders className="w-5 h-5" />
          </div>
          <p className="text-xs text-text-main font-bold">Brak zapisanych dopasowań</p>
          <p className="text-[11px] text-text-muted max-w-sm">Zdefiniuj własne słowa kluczowe, by automatycznie przypisywać kategorie wydatków.</p>
        </div>
      ) : (
        <div className="border border-border/70 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-2 border-b border-border/70 text-text-muted font-bold">
                <th className="py-2.5 px-3">Słowo kluczowe</th>
                <th className="py-2.5 px-3">Kategoria docelowa</th>
                <th className="py-2.5 px-3 text-right">Akcja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70 bg-surface">
              {transactionRules.map((r) => (
                <tr key={r.id} className="hover:bg-surface-2/50 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-text-main">{r.pattern}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 bg-brand-subtle text-brand px-2 py-0.5 rounded-full text-xs font-bold border border-brand/20 shadow-xs">
                      <span>{r.categoryIcon || "✨"}</span>
                      {r.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteTransactionRule(r.id)}
                      aria-label={`Usuń regułę dla ${r.pattern}`}
                      className="text-text-muted hover:text-danger hover:bg-danger-subtle p-1.5 rounded-lg active:scale-95 transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface SettingsAutomationSectionProps {
  state: AppState;
  saveState: (s: AppState) => Promise<void>;
  transactionRules: TransactionRule[];
  onSaveTransactionRules: (rules: TransactionRule[]) => void;
  recurringRules: RecurringRule[];
  onSaveRecurringRules: (rules: RecurringRule[]) => void;
  currency: SupportedCurrency;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function SettingsAutomationSection({
  transactionRules,
  onSaveTransactionRules,
  recurringRules,
  onSaveRecurringRules,
  currency,
  showToast
}: SettingsAutomationSectionProps) {
  // Form states for Recurring Rules
  const [recName, setRecName] = useState("");
  const [recAmount, setRecAmount] = useState<number | "">("");
  const [recType, setRecType] = useState<"expense" | "income">("expense");
  const [recCategory, setRecCategory] = useState("Żywność");
  const [recAccount, setRecAccount] = useState("Konto główne");
  const [recFrequency, setRecFrequency] = useState<"weekly" | "biweekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [recNextDate, setRecNextDate] = useState("");

  const handleAddRecurringRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recName.trim() || !recAmount || !recNextDate) {
      showToast("Proszę uzupełnić nazwę, kwotę i termin pierwszej płatności.", "error");
      return;
    }
    const newRule: RecurringRule = {
      id: `rec-rule-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: recName.trim(),
      amount: Number(recAmount),
      type: recType,
      category: recCategory,
      categoryIcon: iconByCategory[recCategory] || "✨",
      account: recAccount.trim(),
      frequency: recFrequency,
      nextDueDate: recNextDate,
      isActive: true,
      currency: currency || "PLN"
    };
    onSaveRecurringRules([...recurringRules, newRule]);
    setRecName("");
    setRecAmount("");
    setRecNextDate("");
  };

  const handleDeleteRecurringRule = (id: string) => {
    onSaveRecurringRules(recurringRules.filter((r) => r.id !== id));
  };

  const handleToggleRecurringRule = (id: string) => {
    onSaveRecurringRules(
      recurringRules.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  return (
    <div className="space-y-6">
      {/* Category Automation Rules */}
      <TransactionRulesManager
        transactionRules={transactionRules}
        onSaveTransactionRules={onSaveTransactionRules}
      />

      {/* SECTION: RECURRING TRANSACTIONS SCHEDULER */}
      <div className="bg-surface rounded-2xl border border-border/70 shadow-xs p-5 sm:p-6" id="settings-recurring-rules-card">
        <div className="flex items-start sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-border/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text-main tracking-tight truncate">
                  Automatyczne transakcje cykliczne
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-2 text-text-muted border border-border">
                  {recurringRules.length}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Automatyczne rejestrowanie stałych wpływów (np. pensja) oraz opłat abonamentowych
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleAddRecurringRule} className="p-4 rounded-xl bg-surface-2/60 border border-border/80 space-y-3 mb-5 shadow-xs">
          <strong className="block text-xs font-bold text-text-muted">Utwórz nową transakcję cykliczną</strong>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Nazwa transakcji</label>
              <input
                type="text"
                value={recName}
                onChange={(e) => setRecName(e.target.value)}
                placeholder="np. Abonament Netflix, Pensja"
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Kwota ({currency})</label>
              <input
                type="number"
                step="0.01"
                value={recAmount}
                onChange={(e) => setRecAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="np. 43.99"
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Typ</label>
              <select
                value={recType}
                onChange={(e) => setRecType(e.target.value as "expense" | "income")}
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
              >
                <option value="expense">Wydatek (Koszt)</option>
                <option value="income">Przychód (Wpływ)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Kategoria</label>
              <select
                value={recCategory}
                onChange={(e) => setRecCategory(e.target.value)}
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
              >
                {expenseCategories.concat(incomeCategories).filter((v, i, a) => a.indexOf(v) === i).map((cat) => (
                  <option key={cat} value={cat}>
                    {iconByCategory[cat] || "✨"} {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Konto / Portfel</label>
              <input
                type="text"
                value={recAccount}
                onChange={(e) => setRecAccount(e.target.value)}
                placeholder="np. Konto główne"
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Częstotliwość</label>
              <select
                value={recFrequency}
                onChange={(e) => setRecFrequency(e.target.value as any)}
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs"
              >
                <option value="weekly">Co tydzień</option>
                <option value="biweekly">Co dwa tygodnie</option>
                <option value="monthly">Co miesiąc</option>
                <option value="quarterly">Co kwartał</option>
                <option value="yearly">Co rok</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Pierwszy termin płatności</label>
              <input
                type="date"
                value={recNextDate}
                onChange={(e) => setRecNextDate(e.target.value)}
                className="w-full bg-surface text-xs rounded-xl border border-border p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums shadow-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-brand text-text-inverse hover:bg-brand-hover font-bold py-2.5 px-6 rounded-xl text-xs active:scale-[0.98] transition-all shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              ＋ Dodaj harmonogram płatności
            </button>
          </div>
        </form>

        {recurringRules.length === 0 ? (
          <div className="p-8 bg-bg-base/30 rounded-xl border border-dashed border-border text-center">
            <p className="text-xs text-text-main font-bold">Brak zdefiniowanych transakcji cyklicznych</p>
            <p className="text-[11px] text-text-faint mt-0.5">Dodaj stałe koszty lub wpływy (np. abonamenty, pensję), by automatyzować budżet.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead>
                  <tr className="bg-surface-2 border-b border-border text-text-muted font-bold">
                    <th className="py-2.5 px-3">Nazwa / Kategoria</th>
                    <th className="py-2.5 px-3">Częstotliwość</th>
                    <th className="py-2.5 px-3">Najbliższy termin</th>
                    <th className="py-2.5 px-3">Konto</th>
                    <th className="py-2.5 px-3 text-right">Kwota</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {recurringRules.map((r) => {
                    const freqLabels = {
                      weekly: "Co tydzień",
                      biweekly: "Co 2 tygodnie",
                      monthly: "Co miesiąc",
                      quarterly: "Co kwartał",
                      yearly: "Co rok"
                    };
                    return (
                      <tr key={r.id} className={`hover:bg-surface-2/50 transition ${!r.isActive ? "opacity-60" : ""}`}>
                        <td className="py-2.5 px-3">
                          <strong className="block text-text-main">{r.name}</strong>
                          <span className="text-xs text-text-muted font-medium">
                            {r.categoryIcon} {r.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-text-muted">
                          {freqLabels[r.frequency] || r.frequency}
                        </td>
                        <td className="py-2.5 px-3 text-text-muted tabular-nums">
                          {r.nextDueDate}
                        </td>
                        <td className="py-2.5 px-3 text-text-muted">
                          {r.account}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-black tabular-nums ${r.type === "income" ? "text-brand" : "text-danger"}`}>
                          {r.type === "income" ? "+" : "-"} {r.amount.toFixed(2)} {currency}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRecurringRule(r.id)}
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-extrabold cursor-pointer border active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs ${
                              r.isActive
                                ? "bg-brand-subtle border-brand/20 text-brand"
                                : "bg-surface-2 border-border text-text-muted"
                            }`}
                          >
                            {r.isActive ? "Aktywny" : "Wstrzymany"}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteRecurringRule(r.id)}
                            aria-label={`Usuń regułę cykliczną ${r.name}`}
                            className="text-text-muted hover:text-danger hover:bg-danger-subtle p-1.5 rounded-xl active:scale-95 transition-colors cursor-pointer inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-focus-ring"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
