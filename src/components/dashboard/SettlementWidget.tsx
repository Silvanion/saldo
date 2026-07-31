import React, { useState } from 'react';
import { DelayedTooltip } from './DelayedTooltip';
import { Profile, SettlementEntry } from '../../types';
import { calculatePartnerSettlement } from '../../services/settlementEngine';
import { formatPln, formatDate, getLocalDateIso } from '../../utils';
import { CheckCircle2, History, Trash2, X, ArrowRightLeft } from 'lucide-react';

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
  let statusColor = "text-slate-600";
  let bgColor = "bg-slate-50 border-slate-200/60";

  if (historyNet > 0) {
    statusText = `${partnerName} jest Ci winien: ${formatPln(historyNet)}`;
    statusColor = "text-emerald-700";
    bgColor = "bg-emerald-50/70 border-emerald-200/60";
  } else if (historyNet < 0) {
    statusText = `Jesteś winien ${partnerName}: ${formatPln(Math.abs(historyNet))}`;
    statusColor = "text-rose-700";
    bgColor = "bg-rose-50/70 border-rose-200/60";
  }

  let upcomingText = "";
  if (upcomingNet > 0) {
    upcomingText = `Dodatkowo z nieopłaconych rachunków: ${partnerName} będzie Ci winien ${formatPln(upcomingNet)}`;
  } else if (upcomingNet < 0) {
    upcomingText = `Dodatkowo z nieopłaconych rachunków: będziesz winien ${partnerName} ${formatPln(Math.abs(upcomingNet))}`;
  }

  const settlementsList: SettlementEntry[] = profile.settlements || [];

  return (
    <div className={`p-5 rounded-2xl border ${bgColor} shadow-sm mb-6`} id="settlement-widget">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <DelayedTooltip
            className="mb-1"
            label="Na podstawie zrealizowanych transakcji 50/50 oraz zarejestrowanych rozliczeń ręcznych."
            tooltipClassName="w-48"
          >
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-help border-b border-dashed border-slate-400">
              Do rozliczenia (Historia)
            </p>
          </DelayedTooltip>
          <h3 className={`text-sm sm:text-base font-bold ${statusColor}`}>{statusText}</h3>
          {upcomingText && (
            <p className="text-xs text-slate-500 mt-1 font-medium" id="settlement-upcoming-info">
              {upcomingText}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onAddSettlement && (
            <button
              onClick={handleOpenModal}
              id="open-settlement-modal-btn"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              Rozlicz
            </button>
          )}

          {settlementsList.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              id="settlement-history-toggle-btn"
              className="px-4 py-2 bg-white border border-slate-200/60 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <History className="w-4 h-4 text-slate-500" />
              Historia ({settlementsList.length})
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      {showHistory && settlementsList.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200/60" id="settlement-history-section">
          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
            Historia rozliczeń ręcznych
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {settlementsList.map((s) => {
              const isPartnerPaid = s.amount > 0;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2.5 bg-white/80 border border-slate-200 rounded-lg text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">
                      {isPartnerPaid ? `${partnerName} oddał(a) Tobie` : `Oddałeś(aś) ${partnerName}`}
                    </span>
                    <span className="text-slate-400 ml-2">{formatDate(s.isoDate)}</span>
                    {s.note && <p className="text-slate-500 text-[11px] mt-0.5">{s.note}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${isPartnerPaid ? 'text-emerald-600' : 'text-blue-600'}`}>
                      {isPartnerPaid ? `+${formatPln(s.amount)}` : `-${formatPln(Math.abs(s.amount))}`}
                    </span>
                    {onDeleteSettlement && (
                      <button
                        onClick={() => onDeleteSettlement(s.id)}
                        id={`delete-settlement-${s.id}`}
                        className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 relative"
            id="settlement-modal"
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Rozlicz saldo z partnerem</h3>
                <p className="text-xs text-slate-500">
                  Zarejestruj płatność wyrównującą bez dodawania transakcji wydatku.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Kierunek płatności
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('partner_paid_me')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      direction === 'partner_paid_me'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {partnerName} oddał(a) mi
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('i_paid_partner')}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                      direction === 'i_paid_partner'
                        ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Ja oddałem(am) {partnerName}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kwota (PLN)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  id="settlement-amount-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Data rozliczenia
                </label>
                <input
                  type="date"
                  required
                  value={isoDate}
                  onChange={(e) => setIsoDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  id="settlement-date-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notatka (opcjonalnie)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="np. Przelew BLIK, wyrównanie za wakacje"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  id="settlement-note-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  id="settlement-submit-btn"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
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
