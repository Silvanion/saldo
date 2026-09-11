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
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export function SettlementWidget({ profile, onAddSettlement, onDeleteSettlement, showToast }: SettlementWidgetProps) {
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
      showToast("Proszę podać poprawną kwotę większą od zera.", "error");
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
  let containerClass = "bg-surface border-border";

  if (historyNet > 0) {
    statusText = `${partnerName} jest Ci winien: ${formatMoney(historyNet, profile?.currency || 'PLN')}`;
    statusColor = "text-brand";
    containerClass = "bg-brand-subtle/30 border-brand/30";
  } else if (historyNet < 0) {
    statusText = `Jesteś winien ${partnerName}: ${formatMoney(Math.abs(historyNet), profile?.currency || 'PLN')}`;
    statusColor = "text-danger";
    containerClass = "bg-danger-subtle/30 border-danger/30";
  }

  let upcomingText = "";
  if (upcomingNet > 0) {
    upcomingText = `Dodatkowo z nieopłaconych rachunków: ${partnerName} będzie Ci winien ${formatMoney(upcomingNet, profile?.currency || 'PLN')}`;
  } else if (upcomingNet < 0) {
    upcomingText = `Dodatkowo z nieopłaconych rachunków: będziesz winien ${partnerName} ${formatMoney(Math.abs(upcomingNet), profile?.currency || 'PLN')}`;
  }

  const settlementsList: SettlementEntry[] = profile.settlements || [];

  return (
    <div className={`p-4 sm:p-5 rounded-xl border ${containerClass} shadow-xs mb-6 relative overflow-hidden`} id="settlement-widget">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 min-w-0">
        <div className="min-w-0 flex-1">
          <DelayedTooltip
            className="mb-0.5 inline-flex min-w-0 max-w-full"
            label="Na podstawie zrealizowanych transakcji 50/50 oraz zarejestrowanych rozliczeń ręcznych."
            tooltipClassName="w-48 bg-surface border-border text-text-main"
          >
            <p className="text-[11px] font-semibold text-text-faint uppercase tracking-wider cursor-help border-b border-dashed border-border/60 pb-0.5 truncate" title="Rozliczenie z partnerem">
              Rozliczenie z partnerem
            </p>
          </DelayedTooltip>
          <div className="flex items-center gap-2 min-w-0 mt-0.5">
            <h3 className={`text-base font-bold truncate ${statusColor}`} title={statusText}>{statusText}</h3>
            {historyNet !== 0 ? (
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold shrink-0 border ${
                historyNet > 0 ? "bg-brand-subtle text-brand border-brand/20" : "bg-danger-subtle text-danger border-danger/30"
              }`}>
                {historyNet > 0 ? "Nadpłata" : "Niedopłata"}
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold shrink-0 border bg-surface-2 text-text-muted border-border">
                Uregulowane
              </span>
            )}
          </div>
          {upcomingText && (
            <p className="text-xs text-text-muted mt-1 font-medium truncate" title={upcomingText} id="settlement-upcoming-info">
              {upcomingText}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {onAddSettlement && (
            <button
              onClick={handleOpenModal}
              id="open-settlement-modal-btn"
              className="text-xs font-semibold text-brand bg-brand-subtle hover:bg-brand-subtle/80 border border-brand/20 px-2.5 py-1.5 rounded-lg active:scale-[0.98] transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
              title="Rozlicz saldo z partnerem"
            >
              Rozlicz
            </button>
          )}

          {settlementsList.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              id="settlement-history-toggle-btn"
              className="text-xs font-semibold text-text-muted bg-surface-2/60 border border-border/70 hover:bg-surface-2 hover:text-text-main px-2.5 py-1.5 rounded-lg active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-focus-ring shrink-0"
              title="Pokaż historię rozliczeń"
            >
              <History className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={1.75} />
              <span>Historia ({settlementsList.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      {showHistory && settlementsList.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border relative z-10 min-w-0" id="settlement-history-section">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5 min-w-0">
            <ArrowRightLeft className="w-3.5 h-3.5 text-text-faint shrink-0" />
            <span className="truncate" title="Historia rozliczeń ręcznych">Historia rozliczeń ręcznych</span>
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar min-h-0">
            {settlementsList.map((s) => {
              const isPartnerPaid = s.amount > 0;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 bg-surface hover:bg-surface-offset border border-border rounded-xl text-xs shadow-sm gap-3 group transition-colors min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-text-main group-hover:text-brand transition-colors truncate" title={isPartnerPaid ? `${partnerName} oddał(a) Tobie` : `Oddałeś(aś) ${partnerName}`}>
                        {isPartnerPaid ? `${partnerName} oddał(a) Tobie` : `Oddałeś(aś) ${partnerName}`}
                      </span>
                      <span className="text-text-faint font-medium shrink-0">{formatDate(s.isoDate)}</span>
                    </div>
                    {s.note && <p className="text-text-muted text-xs mt-0.5 truncate font-medium" title={s.note}>{s.note}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2 max-w-[40%]">
                    <span className={`font-black truncate ${isPartnerPaid ? 'text-brand' : 'text-danger'}`} title={isPartnerPaid ? `+${formatMoney(s.amount, profile?.currency || 'PLN')}` : `-${formatMoney(Math.abs(s.amount), profile?.currency || 'PLN')}`}>
                      {isPartnerPaid ? `+${formatMoney(s.amount, profile?.currency || 'PLN')}` : `-${formatMoney(Math.abs(s.amount), profile?.currency || 'PLN')}`}
                    </span>
                    {onDeleteSettlement && (
                      <button
                        onClick={() => onDeleteSettlement(s.id)}
                        id={`delete-settlement-${s.id}`}
                        className="p-1 text-text-faint hover:text-danger hover:bg-danger-subtle rounded-lg active:scale-95 transition-all cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring"
                        title="Usuń wpis rozliczenia"
                        aria-label="Usuń wpis rozliczenia"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-md rounded-xl bg-bg-base/95 backdrop-blur-2xl shadow-lg flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-border/70"
            id="settlement-modal"
          >
            <div className="shrink-0 p-6 pb-4 border-b border-border/70 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 leading-none text-text-muted hover:text-text-main hover:bg-surface-offset rounded-xl active:scale-95 transition-colors shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                title="Zamknij"
                aria-label="Zamknij"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 min-w-0 pr-8">
                <div className="p-3 bg-brand-subtle text-brand rounded-xl border border-brand/20 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-extrabold text-text-main truncate" title="Rozlicz saldo z partnerem">Rozlicz saldo z partnerem</h3>
                  <p className="text-xs text-text-muted truncate" title="Zarejestruj płatność wyrównującą bez dodawania transakcji wydatku.">
                    Zarejestruj płatność wyrównującą bez dodawania transakcji wydatku.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-w-0 p-6 custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-4" id="settlement-form">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    Kierunek płatności
                  </label>
                  <div className="grid grid-cols-2 gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => setDirection('partner_paid_me')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border active:scale-[0.98] transition-all min-w-0 truncate cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
                        direction === 'partner_paid_me'
                          ? 'bg-brand-subtle border-brand/40 text-brand'
                          : 'bg-surface border-border text-text-muted hover:bg-surface-2'
                      }`}
                      title={`${partnerName} oddał(a) mi`}
                    >
                      {partnerName} oddał(a) mi
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('i_paid_partner')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border active:scale-[0.98] transition-all min-w-0 truncate cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring ${
                        direction === 'i_paid_partner'
                          ? 'bg-danger-subtle border-danger/40 text-danger'
                          : 'bg-surface border-border text-text-muted hover:bg-surface-2'
                      }`}
                      title={`Ja oddałem(am) ${partnerName}`}
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
                    className="w-full px-3.5 py-2.5 bg-surface-2 border border-border rounded-xl text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring transition-shadow"
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
                    className="w-full px-3.5 py-2.5 bg-surface-2 border border-border rounded-xl text-sm font-medium text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring transition-shadow"
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
                    className="w-full px-3.5 py-2.5 bg-surface-2 border border-border rounded-xl text-sm font-medium text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring transition-shadow"
                    id="settlement-note-input"
                  />
                </div>
              </form>
            </div>

            <div className="shrink-0 p-6 pt-4 border-t border-border bg-bg-base/95 backdrop-blur-2xl flex items-center justify-end gap-3 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main hover:bg-surface-offset rounded-xl active:scale-[0.98] transition-colors shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Anuluj
              </button>
              <button
                type="submit"
                form="settlement-form"
                id="settlement-submit-btn"
                className="px-5 py-2 bg-brand hover:bg-brand-hover text-text-inverse text-xs font-bold rounded-xl active:scale-[0.98] transition-all shrink-0 shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Zapisz rozliczenie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

