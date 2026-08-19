import React, { useState } from "react";
import { Profile, Goal, Investment } from "../types";
import { formatDate } from "../utils";
import { formatMoney } from "../utils/format";
import { calculateNetWorth } from "../services/budgetCalculations";
import { NetWorthHeroCard } from "./wealth/NetWorthHeroCard";
import { Plus, Trash2, ArrowLeftRight, Target, TrendingUp } from "lucide-react";

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

  const netWorthData = calculateNetWorth(profile);

  const handleInvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(invAmount.replace(",", "."));
    if (!invName.trim() || isNaN(amountNum) || amountNum <= 0) return;
    onAddInvestment(invName.trim(), amountNum, invType);
    setInvName("");
    setInvAmount("");
  };

  return (
    <div className="space-y-8" id="goals-view-container">
      {/* HERO SECTION: NET WORTH / WEALTH SYNTHESIS */}
      <NetWorthHeroCard netWorthData={netWorthData} currency={profile?.currency || "PLN"} />

      {/* SECTION 1: SAVINGS GOALS */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 min-w-0">
          <div className="min-w-0">
            <p className="text-xs font-bold text-text-faint uppercase tracking-wider mb-0.5 truncate" title="Planowanie Przyszłości">
              Planowanie Przyszłości
            </p>
            <h2 className="text-xl font-bold text-text-main truncate" title="Cele oszczędnościowe">
              Cele oszczędnościowe
            </h2>
            <p className="text-xs text-text-muted mt-1 max-w-lg leading-relaxed">
              <strong>Zarezerwowane na cele:</strong> wpłaty nie tworzą wydatków. Środki odłożone na cele są po prostu odejmowane od salda &bdquo;Do wydania&rdquo; jako rezerwa.
            </p>
          </div>
          <button
            onClick={onOpenGoalModal}
            className="bg-brand text-text-inverse font-bold py-2.5 px-4 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-sm text-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            id="btn-add-goal"
          >
            <Plus className="w-4 h-4" />
            <span>Nowy cel</span>
          </button>
        </div>

        {profile.goals.length === 0 ? (
          <div className="text-center py-10 px-6 bg-bg-base/30 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-brand-subtle flex items-center justify-center mb-3 border border-brand/20 shadow-xs">
              <Target className="w-6 h-6 text-brand" />
            </div>
            <h3 className="text-sm font-bold text-text-main">Nie zdefiniowałeś jeszcze celów oszczędnościowych</h3>
            <p className="text-xs text-text-muted max-w-sm mt-1 mb-4">
              Wyznacz cel oszczędnościowy (np. wakacje, poduszka finansowa), aby łatwo odkładać rezerwę.
            </p>
            <button
              onClick={onOpenGoalModal}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand bg-brand-subtle hover:bg-brand-subtle/80 border border-brand/20 px-3.5 py-2 rounded-xl active:scale-[0.98] transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Stwórz swój pierwszy cel</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="goals-grid">
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
                <div
                  key={g.id}
                  className="bg-surface border border-border rounded-2xl p-5 shadow-sm hover:border-brand/30 transition-colors flex flex-col justify-between min-h-[12.5rem] relative min-w-0 space-y-3"
                >
                  <div className="min-w-0">
                    <div className="flex justify-between items-start mb-2.5 min-w-0 gap-2">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border shrink-0 shadow-xs ${isCompleted ? "bg-brand-subtle text-brand border-brand/20" : "bg-surface-2 text-text-main border-border"}`}>
                        {isCompleted ? "🏆" : "🎯"}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 min-w-0">
                        {badgeInfo && (
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 truncate max-w-[100px] ${badgeInfo.colorClass}`} title={badgeInfo.text}>
                            {badgeInfo.text}
                          </span>
                        )}
                        <button
                          onClick={() => onDeleteGoal(g.id)}
                          className="text-text-muted hover:text-danger hover:bg-danger-subtle/50 text-xs active:scale-[0.98] transition-all p-1 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring rounded-lg border border-transparent hover:border-danger/20"
                          title="Usuń cel"
                          aria-label={`Usuń cel ${g.name}`}
                          id={`btn-delete-goal-${g.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-text-main line-clamp-1" title={g.name}>{g.name}</h3>
                    <p className="text-xs text-text-muted mt-0.5 truncate" title={`${formatMoney(g.saved, g.currency || profile?.currency || 'PLN')} z ${formatMoney(g.target, g.currency || profile?.currency || 'PLN')}`}>
                      <span className="font-bold text-text-main tabular-nums">{formatMoney(g.saved, g.currency || profile?.currency || 'PLN')}</span>
                      <span className="text-text-faint"> z </span>
                      <span className="tabular-nums">{formatMoney(g.target, g.currency || profile?.currency || 'PLN')}</span>
                    </p>
                    {paceText && (
                      <p className="text-[11px] text-text-muted mt-2 font-medium bg-surface-2 inline-block px-2 py-1 rounded-md border border-border truncate max-w-full" title={paceText}>
                        {paceText}
                      </p>
                    )}
                  </div>

                  <div className="min-w-0 pt-1">
                    {/* Progress */}
                    <div className="w-full bg-surface-2 h-2 rounded-full overflow-hidden mb-2 border border-border/50" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                      <div
                        style={{ width: `${percent}%` }}
                        className={`${isCompleted ? "bg-brand" : "bg-brand"} h-full rounded-full transition-all duration-500`}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-text-muted tabular-nums shrink-0 truncate" title={`${percent}% celu`}>
                        {percent}% celu
                      </span>
                      <button
                        onClick={() => onOpenGoalDepositModal(g)}
                        className="text-xs font-bold text-brand hover:text-brand-hover bg-brand-subtle hover:bg-brand-subtle/80 border border-brand/20 active:scale-[0.98] transition-all shrink-0 truncate cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring rounded-lg px-2.5 py-1 flex items-center gap-1 shadow-xs"
                        id={`btn-deposit-goal-${g.id}`}
                        aria-label={`Transfer na cel ${g.name}`}
                      >
                        <ArrowLeftRight className="w-3 h-3" />
                        <span>Transfer</span>
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
      <div className="border-t border-border pt-6 mt-8 p-5 sm:p-6 bg-surface-2/30 rounded-3xl border border-border/70 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5 mb-2 min-w-0">
          <span className="p-1 rounded-lg bg-brand-subtle text-brand border border-brand/20">
            <TrendingUp className="w-4 h-4" />
          </span>
          <h2 className="text-xl font-bold text-text-main truncate" title="Inwestycje długoterminowe">
            Inwestycje długoterminowe
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-surface text-text-muted px-2 py-0.5 rounded-full border border-border shrink-0 truncate max-w-[130px]" title="Moduł informacyjny">
            Moduł informacyjny
          </span>
        </div>
        <p className="text-xs text-text-muted max-w-3xl leading-relaxed mb-6">
          Ta sekcja służy wyłącznie do ewidencji wpłat kapitałowych. Wpisy <strong>nie są</strong> traktowane jako zysk, <strong>nie są</strong> oszczędnościami bieżącymi i <strong>nie wpływają</strong> na wynik budżetu ani <em>Safe-to-spend</em>.
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick contribute form */}
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-text-main">Rejestruj wpłatę kapitałową</h3>
              <p className="text-xs text-text-muted leading-relaxed mt-1">
                Zapisz kwoty odkładane na IKE, IKZE, fundusze, akcje lub obligacje skarbowe.
              </p>
            </div>
            <form onSubmit={handleInvSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="select-inv-type">Kategoria</label>
                <select
                  value={invType}
                  onChange={(e) => setInvType(e.target.value)}
                  className="w-full rounded-xl border bg-surface border-border p-2.5 text-xs focus-visible:ring-2 focus-visible:ring-focus-ring text-text-main placeholder-text-faint transition-shadow cursor-pointer"
                  id="select-inv-type"
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
                <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="input-inv-name">Nazwa aktywa / konta</label>
                <input
                  required
                  placeholder="np. Obligacje Skarbowe, IKE mBank"
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  className="w-full rounded-xl border bg-surface border-border p-2.5 text-xs focus-visible:ring-2 focus-visible:ring-focus-ring text-text-main placeholder-text-faint transition-shadow"
                  id="input-inv-name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="input-inv-amount">Wpłacona kwota (zł)</label>
                <input
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0,00"
                  value={invAmount}
                  onChange={(e) => setInvAmount(e.target.value)}
                  className="w-full rounded-xl border bg-surface border-border p-2.5 text-xs focus-visible:ring-2 focus-visible:ring-focus-ring text-text-main placeholder-text-faint transition-shadow"
                  id="input-inv-amount"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-brand text-text-inverse font-bold py-2.5 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all text-xs shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring flex items-center justify-center gap-1.5"
                id="btn-inv-submit"
              >
                <Plus className="w-4 h-4" />
                <span>Dodaj wpłatę</span>
              </button>
            </form>
          </div>

          {/* Investment log book */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-text-main mb-3">Wniesiony kapitał (podsumowanie)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(
                  profile.investments.reduce((acc, inv) => {
                    const t = inv.type || "Inne";
                    acc[t] = (acc[t] || 0) + inv.amount;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, total]) => (
                  <div key={type} className="p-3 bg-surface-2/60 border border-border/80 rounded-xl min-w-0 shadow-xs space-y-0.5">
                    <span className="block text-[11px] font-medium text-text-muted uppercase tracking-wider truncate" title={type}>{type}</span>
                    <strong className="text-sm font-bold text-text-main tabular-nums block truncate max-w-full" title={formatMoney(total, profile?.currency || 'PLN')}>{formatMoney(total, profile?.currency || 'PLN')}</strong>
                  </div>
                ))}
                {profile.investments.length === 0 && (
                  <p className="text-xs text-text-faint col-span-full py-1">Brak danych inwestycyjnych.</p>
                )}
              </div>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-text-main mb-3">Historia wpłat kapitałowych</h3>
              <div className="divide-y divide-border/60 overflow-y-auto max-h-[14rem] pr-1">
                {profile.investments.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-bg-base/30 rounded-xl border border-dashed border-border/70 my-1">
                    <p className="text-xs text-text-muted font-medium">Brak historii wpłat</p>
                    <p className="text-[11px] text-text-faint mt-0.5">Użyj formularza obok, aby zarejestrować pierwszą wpłatę kapitałową.</p>
                  </div>
                ) : (
                  [...profile.investments]
                    .sort((a, b) => b.isoDate.localeCompare(a.isoDate))
                    .map((inv) => (
                      <div key={inv.id} className="flex justify-between items-center py-2.5 px-1 min-w-0 gap-3 hover:bg-surface-2/40 rounded-lg transition-colors">
                        <div className="min-w-0 flex-1">
                          <strong className="text-xs font-bold text-text-main block truncate" title={inv.name}>{inv.name}</strong>
                          <div className="flex items-center gap-2 mt-0.5 min-w-0">
                            <span className="text-[11px] text-text-faint shrink-0 whitespace-nowrap">{formatDate(inv.isoDate)}</span>
                            {inv.type && (
                              <span className="text-[10px] bg-surface-2 text-text-muted px-1.5 py-0.5 rounded-md font-medium border border-border shrink-0 max-w-[120px] truncate" title={inv.type}>{inv.type}</span>
                            )}
                          </div>
                        </div>
                        <strong className="text-sm font-bold text-text-main tabular-nums shrink-0 whitespace-nowrap" title={formatMoney(inv.amount, inv.currency || profile?.currency || 'PLN')}>{formatMoney(inv.amount, inv.currency || profile?.currency || 'PLN')}</strong>
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
