import React, { useState } from "react";
import { Landmark, Trash2, Info } from "lucide-react";
import { BankAccount } from "../../types";
import { formatMoney } from "../../utils/format";

export function BankAccountsManager({
  accounts,
  onSaveAccounts,
  currency
}: {
  accounts: BankAccount[];
  onSaveAccounts: (accounts: BankAccount[]) => void;
  currency: string;
}) {
  const [accName, setAccName] = useState("");
  const [accBankName, setAccBankName] = useState("");
  const [accHasLimit, setAccHasLimit] = useState(false);
  const [accLimitAmount, setAccLimitAmount] = useState<number | "">("");

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;
    const newAcc: BankAccount = {
      id: "acc-" + Date.now(),
      name: accName.trim(),
      bankName: accBankName.trim(),
      hasCreditLimit: accHasLimit,
      creditLimit: accHasLimit && typeof accLimitAmount === "number" ? accLimitAmount : 0
    };
    onSaveAccounts([...accounts, newAcc]);
    setAccName("");
    setAccBankName("");
    setAccHasLimit(false);
    setAccLimitAmount("");
  };

  const handleDeleteAccount = (id: string) => {
    onSaveAccounts(accounts.filter((a) => a.id !== id));
  };

  return (
    <div className="bg-surface rounded-xl border border-border/70 shadow-xs p-5 sm:p-6 min-w-0" id="settings-bank-accounts-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-border/40">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-main">Konta operacyjne</h3>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
              Miejsca operacyjne przypisane do wydatków i wpływów z buforem awaryjnym (poza "safe-to-spend").
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-subtle text-brand border border-brand/20 shrink-0 self-start sm:self-auto">
          {accounts.length} {accounts.length === 1 ? "konto" : "kont"}
        </span>
      </div>

      <form onSubmit={handleAddAccount} className="space-y-3 mb-5 p-4 sm:p-5 rounded-xl bg-surface-2/60 border border-border/70 min-w-0 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Nazwa konta / portfela *</label>
            <input required value={accName} onChange={(e) => setAccName(e.target.value)} placeholder="np. Konto bieżące, Gotówka" className="w-full bg-surface text-xs rounded-lg border border-border/70 p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring min-w-0 shadow-xs" />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Opis dodatkowy (opcjonalnie)</label>
            <input value={accBankName} onChange={(e) => setAccBankName(e.target.value)} placeholder="np. nazwa banku" className="w-full bg-surface text-xs rounded-lg border border-border/70 p-2.5 focus-visible:ring-2 focus-visible:ring-focus-ring shadow-xs" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center cursor-pointer select-none">
              <input type="checkbox" checked={accHasLimit} onChange={(e) => setAccHasLimit(e.target.checked)} className="sr-only peer" />
              <div className="w-9 h-5 bg-surface-offset peer-focus-visible:ring-2 peer-focus-visible:ring-focus-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
              <span className="ml-2 text-xs font-bold text-text-muted">Bufor awaryjny</span>
            </label>
            {accHasLimit && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-muted uppercase">Limit:</span>
                <input type="number" min="0" step="0.01" value={accLimitAmount} onChange={(e) => setAccLimitAmount(parseFloat(e.target.value) || "")} placeholder="0.00" className="w-28 bg-surface text-xs rounded-lg border border-border/70 p-2 focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums shadow-xs" />
              </div>
            )}
          </div>
          <button type="submit" className="px-5 py-2 bg-surface border border-border/70 text-brand hover:border-brand/30 hover:bg-surface-offset font-bold rounded-lg active:scale-[0.98] transition-all text-xs shadow-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ml-auto">
            + Dodaj konto
          </button>
        </div>
      </form>

      {accounts.length > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map((acc, index) => (
              <div key={acc.id} className="flex items-center justify-between p-3.5 bg-surface border border-border/70 rounded-xl hover:border-brand/30 transition shadow-xs">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-xs text-text-main font-bold truncate">{acc.name}</strong>
                    {index === 0 && <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-subtle text-brand border border-brand/20 px-2 py-0.5 rounded shadow-xs">Domyślne</span>}
                  </div>
                  {acc.bankName && <span className="mt-1 inline-block text-xs text-text-muted bg-surface-2 border border-border/70 px-2 py-0.5 rounded shadow-xs">{acc.bankName}</span>}
                  {acc.hasCreditLimit && (
                    <p className="text-xs text-brand font-bold mt-1 tabular-nums">Bufor awaryjny: {formatMoney(acc.creditLimit, currency)}</p>
                  )}
                </div>
                <button type="button" onClick={() => handleDeleteAccount(acc.id)} aria-label={`Usuń konto bankowe ${acc.name}`} className="text-text-muted hover:text-danger hover:bg-danger-subtle active:scale-95 transition-colors p-1.5 cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-focus-ring shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-surface-2/60 border border-border/70 text-xs text-text-muted flex items-center gap-2">
            <Info className="w-4 h-4 text-brand shrink-0" />
            <span><strong>Wskazówka:</strong> pierwsze konto z listy będzie domyślnie podpowiadane przy wprowadzaniu nowej transakcji.</span>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-surface-2/30 rounded-xl border border-dashed border-border/70 text-center flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center text-text-muted border border-border/70">
            <Landmark className="w-5 h-5" />
          </div>
          <p className="text-xs text-text-main font-bold">Brak kont operacyjnych</p>
          <p className="text-[11px] text-text-muted max-w-sm">Nie dodałeś jeszcze żadnych kont. Będziesz je wpisywać ręcznie przy dodawaniu wydatków.</p>
        </div>
      )}
    </div>
  );
}

export function SettingsAccountsSection({
  accounts,
  onSaveAccounts,
  currency
}: {
  accounts: BankAccount[];
  onSaveAccounts: (accounts: BankAccount[]) => void;
  currency: string;
}) {
  return (
    <BankAccountsManager
      accounts={accounts}
      onSaveAccounts={onSaveAccounts}
      currency={currency}
    />
  );
}
