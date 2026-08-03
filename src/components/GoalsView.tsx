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
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Planowanie Przyszłości</p>
            <h2 className="text-xl font-bold text-slate-900">Cele oszczędnościowe</h2>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm leading-relaxed">
              <strong>Zarezerwowane na cele:</strong> wpłaty nie tworzą wydatków. Środki odłożone na cele są po prostu odejmowane od salda "Do wydania" jako rezerwa.
            </p>
          </div>
          <button
            onClick={onOpenGoalModal}
            className="bg-[#137566] text-white font-bold py-2 px-5 rounded-xl hover:bg-[#0f5d51] transition shadow-md text-sm"
            id="btn-add-goal"
          >
            ＋ Nowy cel
          </button>
        </div>

        {profile.goals.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center shadow-sm">
            <span className="text-3xl">🎯</span>
            <p className="text-sm font-bold text-slate-500 mt-2">Nie zdefiniowałeś jeszcze celów oszczędnościowych.</p>
            <button
              onClick={onOpenGoalModal}
              className="text-[#137566] text-xs font-bold hover:underline mt-1"
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
                badgeInfo = { text: "Osiągnięty 🎉", colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200" };
              } else if (percent >= 90) {
                badgeInfo = { text: "Prawie u celu!", colorClass: "bg-amber-50 text-amber-700 border-amber-200" };
              } else if (percent > 0) {
                badgeInfo = { text: "W trakcie", colorClass: "bg-blue-50 text-blue-700 border-blue-200" };
              } else {
                badgeInfo = { text: "Do startu", colorClass: "bg-slate-50 text-slate-600 border-slate-200" };
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
                <div key={g.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow transition flex flex-col justify-between h-[13rem] relative">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border ${isCompleted ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-teal-50 text-[#137566] border-teal-100"}`}>
                        {isCompleted ? "🏆" : "🎯"}
                      </span>
                      <div className="flex items-center gap-2">
                        {badgeInfo && (
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeInfo.colorClass}`}>
                            {badgeInfo.text}
                          </span>
                        )}
                        <button
                          onClick={() => onDeleteGoal(g.id)}
                          className="text-slate-300 hover:text-red-500 text-xs transition px-1"
                          title="Usuń cel"
                          id={`btn-delete-goal-${g.id}`}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{g.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatMoney(g.saved, g.currency || profile?.currency || 'PLN')} z {formatMoney(g.target, g.currency || profile?.currency || 'PLN')}
                    </p>
                    {paceText && (
                      <p className="text-[10px] text-amber-700 mt-1.5 font-semibold bg-amber-50/80 inline-block px-2 py-1 rounded-md border border-amber-100/50">
                        {paceText}
                      </p>
                    )}
                  </div>
                  <div>
                    {/* Progress */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3 mb-1">
                      <div
                        style={{ width: `${percent}%` }}
                        className={`${isCompleted ? "bg-emerald-500" : "bg-[#137566]"} h-full rounded-full transition-all duration-500`}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400">{percent}% celu</span>
                      <button
                        onClick={() => onOpenGoalDepositModal(g)}
                        className="text-xs font-bold text-[#137566] hover:underline"
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
      <div className="border-t border-slate-200 pt-6 mt-8 p-6 bg-slate-50/50 rounded-3xl border-dashed">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-xl font-bold text-slate-900">Inwestycje długoterminowe</h2>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md border border-slate-300">Moduł informacyjny</span>
        </div>
        <p className="text-[11px] text-slate-500 max-w-3xl leading-relaxed mb-6">
          Ta sekcja służy wyłącznie do ewidencji wpłat kapitałowych. Wpisy <strong>nie są</strong> traktowane jako zysk, <strong>nie są</strong> oszczędnościami bieżącymi i <strong>nie wpływają</strong> na wynik budżetu ani <em>Safe-to-spend</em>.
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick contribute form */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Rejestruj wpłatę kapitałową</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Zapisz kwoty odkładane na IKE, IKZE, fundusze inwestycyjne, akcje lub obligacje skarbowe.
            </p>
            <form onSubmit={handleInvSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Kategoria</label>
                <select
                  value={invType}
                  onChange={(e) => setInvType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-[#137566]"
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
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Nazwa aktywa / konta</label>
                <input
                  required
                  placeholder="np. Obligacje Skarbowe, IKE mBank"
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-[#137566]"
                  id="input-inv-name"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Wpłacona kwota (zł)</label>
                <input
                  required
                  type="number"
                  min="1"
                  placeholder="0,00"
                  value={invAmount}
                  onChange={(e) => setInvAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs outline-none focus:border-[#137566]"
                  id="input-inv-amount"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#137566] text-white font-bold py-2 rounded-xl hover:bg-[#0f5d51] transition text-xs shadow"
                id="btn-inv-submit"
              >
                Dodaj wpłatę
              </button>
            </form>
          </div>

          {/* Investment log book */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Wniesiony kapitał (podsumowanie)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(
                  profile.investments.reduce((acc, inv) => {
                    const t = inv.type || "Inne";
                    acc[t] = (acc[t] || 0) + inv.amount;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, total]) => (
                  <div key={type} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wide truncate" title={type}>{type}</span>
                    <strong className="text-sm text-slate-800">{formatMoney(total, profile?.currency || 'PLN')}</strong>
                  </div>
                ))}
                {profile.investments.length === 0 && (
                  <p className="text-xs text-slate-400 col-span-full">Brak danych inwestycyjnych.</p>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Historia wpłat kapitałowych</h3>
              <div className="divide-y divide-slate-50 overflow-y-auto max-h-[14rem] pr-1">
                {profile.investments.length === 0 ? (
                  <p className="text-xs text-slate-400 py-10 text-center italic">
                    Nie wprowadzono jeszcze żadnych wpłat inwestycyjnych.
                  </p>
                ) : (
                  [...profile.investments]
                    .sort((a, b) => b.isoDate.localeCompare(a.isoDate))
                    .map((inv) => (
                      <div key={inv.id} className="flex justify-between items-center py-3">
                        <div>
                          <strong className="text-xs text-slate-800 block">{inv.name}</strong>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400">{formatDate(inv.isoDate)}</span>
                            {inv.type && (
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{inv.type}</span>
                            )}
                          </div>
                        </div>
                        <strong className="text-sm text-[#137566]">{formatMoney(inv.amount, inv.currency || profile?.currency || 'PLN')}</strong>
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
