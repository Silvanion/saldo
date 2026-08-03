import React, { useState } from 'react';
import { DelayedTooltip } from './DelayedTooltip';
import { Profile, SettlementEntry } from '../../types';
import { calculatePartnerSettlement } from '../../services/settlementEngine';
import { formatDate, getLocalDateIso } from '../../utils';
import { CheckCircle2, History, Trash2, X, ArrowRightLeft } from 'lucide-react';
import { formatMoney } from "../../utils/format";

interface SettlementWidgetProps {
  profile: Profile;
  onAddSettlement?: (entry: { amount: number; isoDate: string; note?: string }) => void;
  onDeleteSettlement?: (settlementId: string) => void;
}

export function SettlementWidget({ profile, onAddSettlement, onDeleteSettlement }: SettlementWidgetProps) {
  if (profile.kind !== 'shared') return null;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const settlement = calculatePartnerSettlement(profile);
  const { historyNet, upcomingNet } = settlement;
  const partnerName = profile.partnerName || "Partner";

  // Modal form states
  const [direction, setDirection] = useState<'partner_paid_me' | 'i_paid_partner'>(
    historyNet < 0 ? 'i_paid_partner' : 'partner_paid_me'
  );
  const [amountStr, setAmountStr] = useState<string>(
    historyNet !== 0 ? Math.abs(historyNet).toString() : ""
  );
  const [isoDate, setIsoDate] = useState<string>(getLocalDateIso());
  const [note, setNote] = useState<string>("");

  const handleOpenModal = () => {
    setDirection(historyNet < 0 ? 'i_paid_partner' : 'partner_paid_me');
    setAmountStr(historyNet !== 0 ? Math.abs(historyNet).toString() : "");
    setIsoDate(getLocalDateIso());
    setNote("");
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      alert("Proszę podać poprawną kwotę większą od zera.");
      return;
    }

    const finalAmount = direction === 'partner_paid_me' ? val : -val;
    if (onAddSettlement) {
      onAddSettlement({
        amount: finalAmount,
        isoDate,
        note: note.trim() || undefined
      });
    }
    setIsModalOpen(false);
  };

  let statusText = "Wszystko rozliczone z historii";
  let statusColor = "text-slate-400";
  let bgColor = "bg-slate-800/40 border-slate-700/50 backdrop-blur-xl shadow-2xl relative overflow-hidden";
  let dropShadowClass = "drop-shadow-[0_0_5px_rgba(148,163,184,0.3)]";

  if (historyNet > 0) {
    statusText = `${partnerName} jest Ci winien: ${formatMoney(historyNet, profile?.currency || 'PLN')}`;
    statusColor = "text-emerald-400";
    bgColor = "bg-emerald-900/20 border-emerald-500/30 backdrop-blur-xl shadow-2xl relative overflow-hidden";
    dropShadowClass = "drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]";
  } else if (historyNet < 0) {
    statusText = `Jesteś winien ${partnerName}: ${formatMoney(Math.abs(historyNet), profile?.currency || 'PLN')}`;
    statusColor = "text-rose-400";
    bgColor = "bg-rose-900/20 border-rose-500/30 backdrop-blur-xl shadow-2xl relative overflow-hidden";
    dropShadowClass = "drop-shadow-[0_0_5px_rgba(244,63,94,0.3)]";
  }

  let upcomingText = "";
  if (upcomingNet > 0) {
    upcomingText = `Dodatkowo z nieopłaconych rachunków: ${partnerName} będzie Ci winien ${formatMoney(upcomingNet, profile?.currency || 'PLN')}`;
  } else if (upcomingNet < 0) {
    upcomingText = `Dodatkowo z nieopłaconych rachunków: będziesz winien ${partnerName} ${formatMoney(Math.abs(upcomingNet), profile?.currency || 'PLN')}`;
  }

  const settlementsList: SettlementEntry[] = profile.settlements || [];

  return (
    <div className={`p-5 rounded-2xl border ${bgColor} mb-6`} id="settlement-widget">
      <div className={`absolute inset-0 bg-gradient-to-br ${historyNet > 0 ? "from-emerald-500/5" : historyNet < 0 ? "from-rose-500/5" : "from-slate-500/5"} to-transparent pointer-events-none`} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
          <DelayedTooltip
            className="mb-1"
            label="Na podstawie zrealizowanych transakcji 50/50 oraz zarejestrowanych rozliczeń ręcznych."
            tooltipClassName="w-48 bg-slate-800 border-slate-700 text-slate-200"
          >
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-help border-b border-dashed border-slate-600 drop-shadow-sm pb-0.5">
              Do rozliczenia (Historia)
            </p>
          </DelayedTooltip>
          <h3 className={`text-sm sm:text-base font-bold ${statusColor} ${dropShadowClass}`}>{statusText}</h3>
          {upcomingText && (
            <p className="text-xs text-slate-400 mt-1 font-medium" id="settlement-upcoming-info">
              {upcomingText}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onAddSettlement && (
            <button
              onClick={handleOpenModal}
              id="open-settlement-modal-btn"
              className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl transition shadow-[0_0_10px_rgba(52,211,153,0.1)] backdrop-blur-md"
            >
              Rozlicz
            </button>
          )}

          {settlementsList.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              id="settlement-history-toggle-btn"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-inner backdrop-blur-md"
            >
              <History className="w-4 h-4 text-slate-400" />
              Historia ({settlementsList.length})
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      {showHistory && settlementsList.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 relative z-10" id="settlement-history-section">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 drop-shadow-sm">
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
            Historia rozliczeń ręcznych
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {settlementsList.map((s) => {
              const isPartnerPaid = s.amount > 0;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-xs shadow-inner"
                >
                  <div>
                    <span className="font-bold text-slate-200">
                      {isPartnerPaid ? `${partnerName} oddał(a) Tobie` : `Oddałeś(aś) ${partnerName}`}
                    </span>
                    <span className="text-slate-500 ml-2">{formatDate(s.isoDate)}</span>
                    {s.note && <p className="text-slate-400 text-[11px] mt-0.5">{s.note}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${isPartnerPaid ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]' : 'text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.3)]'}`}>
                      {isPartnerPaid ? `+${formatMoney(s.amount, profile?.currency || 'PLN')}` : `-${formatMoney(Math.abs(s.amount), profile?.currency || 'PLN')}`}
                    </span>
                    {onDeleteSettlement && (
                      <button
                        onClick={() => onDeleteSettlement(s.id)}
                        id={`delete-settlement-${s.id}`}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:drop-shadow-[0_0_5px_rgba(244,63,94,0.3)] transition cursor-pointer"
                        title="Usuń wpis rozliczenia"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Settlement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
            id="settlement-modal"
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-500 hover:text-slate-300 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Rozlicz saldo z partnerem</h3>
                <p className="text-xs text-slate-400">
                  Zarejestruj płatność wyrównującą bez dodawania transakcji wydatku.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Kierunek płatności
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('partner_paid_me')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      direction === 'partner_paid_me'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.1)]'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {partnerName} oddał(a) mi
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('i_paid_partner')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      direction === 'i_paid_partner'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    Ja oddałem(am) {partnerName}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Kwota ({(profile?.currency || "PLN")})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-shadow"
                  id="settlement-amount-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Data rozliczenia
                </label>
                <input
                  type="date"
                  required
                  value={isoDate}
                  onChange={(e) => setIsoDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-shadow [color-scheme:dark]"
                  id="settlement-date-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Notatka (opcjonalnie)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="np. Przelew BLIK, wyrównanie za wakacje"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-shadow"
                  id="settlement-note-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded-xl transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  id="settlement-submit-btn"
                  className="px-5 py-2 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl transition shadow-[0_0_10px_rgba(52,211,153,0.1)]"
                >
                  Zapisz rozliczenie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
