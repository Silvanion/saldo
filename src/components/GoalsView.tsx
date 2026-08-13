import React, { useState } from "react";
import { Profile, Goal, Investment } from "../types";
import { formatDate } from "../utils";
import { formatMoney } from "../utils/format";

interface GoalsViewProps {
  profile: Profile;
  onOpenGoalModal: () => void;
  onOpenGoalDepositModal: (goal: Goal) => void;
  onAddInvestment: (name: string, amount: number, type?: string) => void;
  onDeleteGoal: (goalId: string) => void;
}

export function GoalsView({
  profile,
  onOpenGoalModal,
  onOpenGoalDepositModal,
  onAddInvestment,
  onDeleteGoal
}: GoalsViewProps) {
  const [invName, setInvName] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invType, setInvType] = useState("Poduszka finansowa");

  const handleInvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(invAmount.replace(",", "."));
    if (!invName.trim() || isNaN(amountNum) || amountNum <= 0) return;
    onAddInvestment(invName.trim(), amountNum, invType);
    setInvName("");
    setInvAmount("");
  };

  return (
    <div className="space-y-6" id="goals-view-container">
      {/* SECTION 1: SAVINGS GOALS */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 min-w-0">
          <div className="min-w-0">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider truncate" title="Planowanie Przyszłości">Planowanie Przyszłości</p>
            <h2 className="text-xl font-bold text-text-main truncate" title="Cele oszczędnościowe">Cele oszczędnościowe</h2>
            <p className="text-xs text-text-muted mt-1 max-w-sm leading-relaxed">
              <strong>Zarezerwowane na cele:</strong> wpłaty nie tworzą wydatków. Środki odłożone na cele są po prostu odejmowane od salda "Do wydania" jako rezerwa.
            </p>
          </div>
          <button
            onClick={onOpenGoalModal}
            className="bg-brand text-text-inverse font-bold py-2 px-5 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-lg text-sm shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            id="btn-add-goal"
          >
            ＋ Nowy cel
          </button>
        </div>

        {profile.goals.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center shadow-lg">
            <span className="text-3xl">🎯</span>
            <p className="text-sm font-bold text-text-muted mt-2">Nie zdefiniowałeś jeszcze celów oszczędnościowych.</p>
            <button
              onClick={onOpenGoalModal}
              className="text-brand text-xs font-bold hover:text-brand-hover active:scale-[0.98] transition-all mt-1 inline-block cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
            >
              Stwórz swój pierwszy cel &rarr;
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="goals-grid">
            {profile.goals.map((g) => {
              const percent = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
              const isCompleted = g.saved >= g.target;
              const remaining = Math.max(0, g.target - g.saved);
              
              let paceText = "";
              let badgeInfo = null;

              if (isCompleted) {
                badgeInfo = { text: "Osiągnięty 🎉", colorClass: "bg-brand-subtle text-brand border-brand/20" };
              } else if (percent >= 90) {
                badgeInfo = { text: "Prawie u celu!", colorClass: "bg-warning-subtle text-warning border-warning/20" };
              } else if (percent > 0) {
                badgeInfo = { text: "W trakcie", colorClass: "bg-brand-subtle text-brand border-brand/20" };
              } else {
                badgeInfo = { text: "Do startu", colorClass: "bg-surface text-text-muted border-border" };
              }

              if (!isCompleted) {
                if (g.targetDate) {
                  const targetD = new Date(g.targetDate);
                  const now = new Date();
                  const monthsDiff = (targetD.getFullYear() - now.getFullYear()) * 12 + targetD.getMonth() - now.getMonth();
                  if (monthsDiff > 0) {
                    const required = remaining / monthsDiff;
                    paceText = `Potrzeba ok. ${formatMoney(required, g.currency || profile?.currency || 'PLN')} / m-c`;
                  } else if (monthsDiff === 0) {
                    paceText = "To ostatni miesiąc na realizację!";
                  } else {
                    paceText = "Czas minął! Zaktualizuj termin.";
                  }
                } else {
                  paceText = `Brakuje ${formatMoney(remaining, g.currency || profile?.currency || 'PLN')}`;
                }
              }

              return (
                <div key={g.id} className="bg-surface border border-border rounded-2xl p-5 shadow-lg hover:shadow-xl hover:bg-surface transition flex flex-col justify-between h-[13rem] relative min-w-0">
                  <div className="min-w-0">
                    <div className="flex justify-between items-start mb-2 min-w-0 gap-2">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border shrink-0 ${isCompleted ? "bg-brand-subtle text-brand border-brand/20" : "bg-surface-2 text-text-main border-border"}`}>
                        {isCompleted ? "🏆" : "🎯"}
                      </span>
                      <div className="flex items-center gap-2 shrink-0 min-w-0">
                        {badgeInfo && (
                          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 truncate max-w-[80px] ${badgeInfo.colorClass}`} title={badgeInfo.text}>
                            {badgeInfo.text}
                          </span>
                        )}
                        <button
                          onClick={() => onDeleteGoal(g.id)}
                          className="text-text-muted hover:text-danger text-xs active:scale-[0.98] transition-all px-1 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring rounded"
                          title="Usuń cel"
                          aria-label="Usuń cel"
                          id={`btn-delete-goal-${g.id}`}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-text-main line-clamp-1" title={g.name}>{g.name}</h3>
                    <p className="text-xs text-text-muted mt-0.5 truncate" title={`${formatMoney(g.saved, g.currency || profile?.currency || 'PLN')} z ${formatMoney(g.target, g.currency || profile?.currency || 'PLN')}`}>
                      {formatMoney(g.saved, g.currency || profile?.currency || 'PLN')} z {formatMoney(g.target, g.currency || profile?.currency || 'PLN')}
                    </p>
                    {paceText && (
                      <p className="text-xs text-text-muted mt-1.5 font-semibold bg-surface-2 inline-block px-2 py-1 rounded-md border border-border truncate max-w-full" title={paceText}>
                        {paceText}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0">
                    {/* Progress */}
                    <div className="w-full bg-surface-2 h-2 rounded-full overflow-hidden mt-3 mb-1">
                      <div
                        style={{ width: `${percent}%` }}
                        className={`${isCompleted ? "bg-brand" : "bg-brand"} h-full rounded-full transition-all duration-500`}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-text-muted shrink-0 truncate" title={`${percent}% celu`}>{percent}% celu</span>
                      <button
                        onClick={() => onOpenGoalDepositModal(g)}
                        className="text-xs font-bold text-brand hover:text-brand-hover active:scale-[0.98] transition-all shrink-0 truncate max-w-[100px] cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring rounded px-1"
                        id={`btn-deposit-goal-${g.id}`}
                      >
                        ⇄ Transfer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: LONG-TERM INVESTMENTS */}
      <div className="border-t border-border pt-6 mt-8 p-6 bg-surface/20 rounded-3xl border-dashed min-w-0">
        <div className="flex items-center gap-3 mb-2 min-w-0">
          <h2 className="text-xl font-bold text-text-main truncate" title="Inwestycje długoterminowe">Inwestycje długoterminowe</h2>
          <span className="text-xs font-bold uppercase tracking-wider bg-surface-2 text-text-muted px-2 py-0.5 rounded-md border border-border shrink-0 truncate max-w-[120px]" title="Moduł informacyjny">Moduł informacyjny</span>
        </div>
        <p className="text-xs text-text-muted max-w-3xl leading-relaxed mb-6">
          Ta sekcja służy wyłącznie do ewidencji wpłat kapitałowych. Wpisy <strong>nie są</strong> traktowane jako zysk, <strong>nie są</strong> oszczędnościami bieżącymi i <strong>nie wpływają</strong> na wynik budżetu ani <em>Safe-to-spend</em>.
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick contribute form */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-text-main mb-3">Rejestruj wpłatę kapitałową</h3>
            <p className="text-xs text-text-muted leading-relaxed mb-4">
              Zapisz kwoty odkładane na IKE, IKZE, fundusze inwestycyjne, akcje lub obligacje skarbowe.
            </p>
            <form onSubmit={handleInvSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1">Kategoria</label>
                <select
                  value={invType}
                  onChange={(e) => setInvType(e.target.value)}
                  className="w-full rounded-xl border bg-surface border-border p-2 text-xs focus-visible:ring-2 focus-visible:ring-focus-ring text-text-main placeholder-text-faint transition-shadow"
                >
                  <option value="Poduszka finansowa">Poduszka finansowa</option>
                  <option value="IKE / IKZE (Emerytura)">IKE / IKZE (Emerytura)</option>
                  <option value="Lokaty / Obligacje">Lokaty / Obligacje</option>
                  <option value="Akcje / ETF">Akcje / ETF</option>
                  <option value="Kryptowaluty">Kryptowaluty</option>
                  <option value="Inne">Inne</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1">Nazwa aktywa / konta</label>
                <input
                  required
                  placeholder="np. Obligacje Skarbowe, IKE mBank"
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  className="w-full rounded-xl border bg-surface border-border p-2 text-xs focus-visible:ring-2 focus-visible:ring-focus-ring text-text-main placeholder-text-faint transition-shadow"
                  id="input-inv-name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1">Wpłacona kwota (zł)</label>
                <input
                  required
                  type="number"
                  min="1"
                  placeholder="0,00"
                  value={invAmount}
                  onChange={(e) => setInvAmount(e.target.value)}
                  className="w-full rounded-xl border bg-surface border-border p-2 text-xs focus-visible:ring-2 focus-visible:ring-focus-ring text-text-main placeholder-text-faint transition-shadow"
                  id="input-inv-amount"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-brand text-text-inverse font-bold py-2 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all text-xs shadow-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                id="btn-inv-submit"
              >
                Dodaj wpłatę
              </button>
            </form>
          </div>

          {/* Investment log book */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-surface border border-border rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-bold text-text-main mb-3">Wniesiony kapitał (podsumowanie)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(
                  profile.investments.reduce((acc, inv) => {
                    const t = inv.type || "Inne";
                    acc[t] = (acc[t] || 0) + inv.amount;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, total]) => (
                  <div key={type} className="p-3 bg-surface border border-border rounded-xl min-w-0">
                    <span className="block text-xs text-text-muted uppercase tracking-wide truncate" title={type}>{type}</span>
                    <strong className="text-sm text-text-main block truncate max-w-full" title={formatMoney(total, profile?.currency || 'PLN')}>{formatMoney(total, profile?.currency || 'PLN')}</strong>
                  </div>
                ))}
                {profile.investments.length === 0 && (
                  <p className="text-xs text-text-faint col-span-full">Brak danych inwestycyjnych.</p>
                )}
              </div>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-bold text-text-main mb-3">Historia wpłat kapitałowych</h3>
              <div className="divide-y divide-border overflow-y-auto max-h-[14rem] pr-1">
                {profile.investments.length === 0 ? (
                  <p className="text-xs text-text-faint py-10 text-center italic">
                    Nie wprowadzono jeszcze żadnych wpłat inwestycyjnych.
                  </p>
                ) : (
                  [...profile.investments]
                    .sort((a, b) => b.isoDate.localeCompare(a.isoDate))
                    .map((inv) => (
                      <div key={inv.id} className="flex justify-between items-center py-3 min-w-0 gap-4">
                        <div className="min-w-0 flex-1">
                          <strong className="text-xs text-text-main block truncate" title={inv.name}>{inv.name}</strong>
                          <div className="flex items-center gap-2 mt-0.5 min-w-0">
                            <span className="text-xs text-text-muted shrink-0 truncate">{formatDate(inv.isoDate)}</span>
                            {inv.type && (
                              <span className="text-xs bg-surface-2 text-text-muted px-1.5 py-0.5 rounded font-medium max-w-[100px] truncate block shrink-0" title={inv.type}>{inv.type}</span>
                            )}
                          </div>
                        </div>
                        <strong className="text-sm text-text-main shrink-0 whitespace-nowrap" title={formatMoney(inv.amount, inv.currency || profile?.currency || 'PLN')}>{formatMoney(inv.amount, inv.currency || profile?.currency || 'PLN')}</strong>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
