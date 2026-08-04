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
  let statusColor = "text-text-muted";
  let bgColor = "bg-surface border-border  shadow-sm relative overflow-hidden";
  let dropShadowClass = "drop-";

  if (historyNet > 0) {
    statusText = `${partnerName} jest Ci winien: ${formatMoney(historyNet, profile?.currency || 'PLN')}`;
    statusColor = "text-emerald-700";
    bgColor = "bg-emerald-900/20 border-emerald-200  shadow-sm relative overflow-hidden";
    dropShadowClass = "drop-";
  } else if (historyNet < 0) {
    statusText = `Jesteś winien ${partnerName}: ${formatMoney(Math.abs(historyNet), profile?.currency || 'PLN')}`;
    statusColor = "text-rose-700";
    bgColor = "bg-rose-900/20 border-rose-200  shadow-sm relative overflow-hidden";
    dropShadowClass = "drop-";
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
            tooltipClassName="w-48 bg-surface border-border text-text-main"
          >
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider cursor-help border-b border-dashed border-slate-200  pb-0.5">
              Do rozliczenia (Historia)
            </p>
          </DelayedTooltip>
          <h3 className={`text-sm sm:text-base font-bold ${statusColor} ${dropShadowClass}`}>{statusText}</h3>
          {upcomingText && (
            <p className="text-xs text-text-muted mt-1 font-medium" id="settlement-upcoming-info">
              {upcomingText}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onAddSettlement && (
            <button
              onClick={handleOpenModal}
              id="open-settlement-modal-btn"
              className="px-4 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl transition  "
            >
              Rozlicz
            </button>
          )}

          {settlementsList.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              id="settlement-history-toggle-btn"
              className="px-4 py-2 bg-surface/50 border border-border hover:bg-slate-100 text-text-muted text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-inner "
            >
              <History className="w-4 h-4 text-text-muted" />
              Historia ({settlementsList.length})
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      {showHistory && settlementsList.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border relative z-10" id="settlement-history-section">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5 ">
            <ArrowRightLeft className="w-3.5 h-3.5 text-text-faint" />
            Historia rozliczeń ręcznych
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {settlementsList.map((s) => {
              const isPartnerPaid = s.amount > 0;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2.5 bg-surface border border-border rounded-lg text-xs shadow-inner"
                >
                  <div>
                    <span className="font-bold text-text-main">
                      {isPartnerPaid ? `${partnerName} oddał(a) Tobie` : `Oddałeś(aś) ${partnerName}`}
                    </span>
                    <span className="text-text-faint ml-2">{formatDate(s.isoDate)}</span>
                    {s.note && <p className="text-text-muted text-[11px] mt-0.5">{s.note}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${isPartnerPaid ? 'text-emerald-700 drop-' : 'text-blue-400 drop-'}`}>
                      {isPartnerPaid ? `+${formatMoney(s.amount, profile?.currency || 'PLN')}` : `-${formatMoney(Math.abs(s.amount), profile?.currency || 'PLN')}`}
                    </span>
                    {onDeleteSettlement && (
                      <button
                        onClick={() => onDeleteSettlement(s.id)}
                        id={`delete-settlement-${s.id}`}
                        className="p-1 text-text-faint hover:text-rose-700 hover:drop- transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80  animate-in fade-in">
          <div
            className="bg-bg-base border border-border rounded-2xl max-w-md w-full p-6 shadow-sm relative"
            id="settlement-modal"
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-text-faint hover:text-text-muted rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-main">Rozlicz saldo z partnerem</h3>
                <p className="text-xs text-text-muted">
                  Zarejestruj płatność wyrównującą bez dodawania transakcji wydatku.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Kierunek płatności
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('partner_paid_me')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      direction === 'partner_paid_me'
                        ? 'bg-emerald-50 border-emerald-500/50 text-emerald-700 '
                        : 'bg-surface border-border text-text-muted hover:bg-slate-100'
                    }`}
                  >
                    {partnerName} oddał(a) mi
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('i_paid_partner')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      direction === 'i_paid_partner'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 '
                        : 'bg-surface border-border text-text-muted hover:bg-slate-100'
                    }`}
                  >
                    Ja oddałem(am) {partnerName}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
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
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-border rounded-xl text-sm font-bold text-text-main focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-shadow"
                  id="settlement-amount-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
                  Data rozliczenia
                </label>
                <input
                  type="date"
                  required
                  value={isoDate}
                  onChange={(e) => setIsoDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-border rounded-xl text-sm font-medium text-text-main focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-shadow [color-scheme:dark]"
                  id="settlement-date-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
                  Notatka (opcjonalnie)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="np. Przelew BLIK, wyrównanie za wakacje"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-border rounded-xl text-sm font-medium text-text-main focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-shadow"
                  id="settlement-note-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-muted hover:bg-surface-2 rounded-xl transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  id="settlement-submit-btn"
                  className="px-5 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl transition "
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
