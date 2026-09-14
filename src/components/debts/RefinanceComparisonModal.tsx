import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Plus,
  Trash2,
  TrendingDown,
  Scale,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Layers,
  Award,
  ArrowRight,
  Calculator,
  RefreshCw
} from "lucide-react";
import { DebtItem } from "../../types";
import { formatMoney, parseAmountInput } from "../../utils/format";
import {
  calculateMultiOfferRefinanceComparison,
  RefinanceOfferInput,
  RefinanceBenefitStatus
} from "../../services/debtCalculations";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface RefinanceComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtItem | null;
}

interface OfferState {
  id: string;
  name: string;
  newRate: string;
  closingCosts: string;
  newTermYears: string;
}

export function RefinanceComparisonModal({
  isOpen,
  onClose,
  debt
}: RefinanceComparisonModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const [offers, setOffers] = useState<OfferState[]>([
    {
      id: "offer-1",
      name: "Oferta A (np. Bank A)",
      newRate: "5.85",
      closingCosts: "4500",
      newTermYears: "20"
    },
    {
      id: "offer-2",
      name: "Oferta B (np. Bank B)",
      newRate: "5.45",
      closingCosts: "6000",
      newTermYears: "20"
    }
  ]);

  const [activeOfferId, setActiveOfferId] = useState<string>("offer-1");

  useEffect(() => {
    if (isOpen && debt) {
      const suggestedRateA = Math.max(1, Math.round((debt.interestRate - 0.8) * 100) / 100);
      const suggestedRateB = Math.max(1, Math.round((debt.interestRate - 1.3) * 100) / 100);
      const years = debt.remainingMonths ? Math.round(debt.remainingMonths / 12) : 20;
      const initialTerm = String(Math.max(1, years));

      setOffers([
        {
          id: "offer-1",
          name: "Oferta A (np. stałe 5 lat)",
          newRate: String(suggestedRateA),
          closingCosts: "4500",
          newTermYears: initialTerm
        },
        {
          id: "offer-2",
          name: "Oferta B (np. niższa marża)",
          newRate: String(suggestedRateB),
          closingCosts: "6500",
          newTermYears: initialTerm
        }
      ]);
      setActiveOfferId("offer-1");
    }
  }, [isOpen, debt]);

  // Add offer (max 3)
  const handleAddOffer = () => {
    if (offers.length >= 3 || !debt) return;
    const nextIndex = offers.length + 1;
    const newId = `offer-${Date.now()}`;
    const years = debt.remainingMonths ? Math.round(debt.remainingMonths / 12) : 20;
    const suggestedRate = Math.max(1, Math.round((debt.interestRate - 1.0) * 100) / 100);

    const newOffer: OfferState = {
      id: newId,
      name: `Oferta ${String.fromCharCode(64 + nextIndex)} (np. Bank ${String.fromCharCode(64 + nextIndex)})`,
      newRate: String(suggestedRate),
      closingCosts: "5000",
      newTermYears: String(Math.max(1, years))
    };

    setOffers([...offers, newOffer]);
    setActiveOfferId(newId);
  };

  // Remove offer (min 1)
  const handleRemoveOffer = (idToRemove: string) => {
    if (offers.length <= 1) return;
    const updated = offers.filter((o) => o.id !== idToRemove);
    setOffers(updated);
    if (activeOfferId === idToRemove) {
      setActiveOfferId(updated[0].id);
    }
  };

  // Update field of an offer
  const handleUpdateOffer = (id: string, field: keyof OfferState, value: string) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };

  // Quick preset apply to active offer
  const applyPreset = (presetType: "lower_rate" | "zero_costs" | "shorter_term") => {
    if (!debt) return;
    const active = offers.find((o) => o.id === activeOfferId);
    if (!active) return;

    if (presetType === "lower_rate") {
      const lower = Math.max(1, Math.round((debt.interestRate - 1.5) * 100) / 100);
      handleUpdateOffer(active.id, "newRate", String(lower));
    } else if (presetType === "zero_costs") {
      handleUpdateOffer(active.id, "closingCosts", "0");
    } else if (presetType === "shorter_term") {
      const currentY = Math.max(2, parseAmountInput(active.newTermYears) ?? 20);
      handleUpdateOffer(active.id, "newTermYears", String(Math.max(1, currentY - 5)));
    }
  };

  // Perform multi-offer calculation
  const multiComparison = useMemo(() => {
    if (!debt) return null;

    const offerInputs: RefinanceOfferInput[] = offers.map((o) => {
      const parsedRate = Math.max(0, parseAmountInput(o.newRate) ?? 0);
      const parsedCosts = Math.max(0, parseAmountInput(o.closingCosts) ?? 0);
      const parsedYears = Math.max(1, parseAmountInput(o.newTermYears) ?? 1);
      const parsedMonths = Math.round(parsedYears * 12);

      return {
        id: o.id,
        name: o.name.trim() || `Oferta (${o.id})`,
        newRate: parsedRate,
        closingCosts: parsedCosts,
        newTermMonths: parsedMonths
      };
    });

    return calculateMultiOfferRefinanceComparison(
      {
        balance: debt.balance,
        currentRate: debt.interestRate,
        currentMonthlyPayment: debt.monthlyPayment,
        currentRemainingMonths: debt.remainingMonths
      },
      offerInputs
    );
  }, [debt, offers]);

  if (!isOpen || !debt || typeof document === "undefined") return null;

  const currency = debt.currency || "PLN";

  const getStatusBadge = (status: RefinanceBenefitStatus) => {
    switch (status) {
      case "likely_beneficial":
        return {
          label: "Prawdopodobnie korzystne",
          className: "bg-success-subtle text-success border-success/30",
          icon: <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
        };
      case "marginal":
        return {
          label: "Umiarkowana korzyść / Neutralne",
          className: "bg-warning-subtle text-warning border-warning/30",
          icon: <AlertCircle className="w-4 h-4 text-warning shrink-0" />
        };
      case "not_beneficial":
      default:
        return {
          label: "Nieopłacalne na tych warunkach",
          className: "bg-danger-subtle text-danger border-danger/30",
          icon: <AlertCircle className="w-4 h-4 text-danger shrink-0" />
        };
    }
  };

  const activeOffer = offers.find((o) => o.id === activeOfferId) || offers[0];
  const activeOfferResult = multiComparison?.offers.find((o) => o.offer.id === activeOffer?.id);
  const bestOfferItem = multiComparison?.offers.find((o) => o.isBestOffer);

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15 }}
          className="bg-surface border border-border/70 w-full max-w-4xl rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[92vh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="refinance-modal-title"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-border/70 flex items-center justify-between shrink-0 bg-surface-2/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h2 id="refinance-modal-title" className="text-base sm:text-lg font-bold text-text-main">
                  Wieloofertowy kalkulator refinansowania
                </h2>
                <p className="text-xs text-text-muted">
                  {debt.name} ({debt.institution}) • Saldo: {formatMoney(debt.balance, currency)} • Obecne oprocentowanie: {debt.interestRate.toFixed(2)}%
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-full transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
              aria-label="Zamknij"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
            {/* Offer Selector & Management Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap border-b border-border pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                {offers.map((off, idx) => {
                  const evalItem = multiComparison?.offers.find((o) => o.offer.id === off.id);
                  const isBest = evalItem?.isBestOffer;
                  const isActive = activeOfferId === off.id;

                  return (
                    <button
                      key={off.id}
                      onClick={() => setActiveOfferId(off.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
                        isActive
                          ? "bg-brand text-text-inverse border-brand shadow-xs"
                          : "bg-surface-2 text-text-muted hover:text-text-main border-border"
                      }`}
                    >
                      <span>{off.name || `Oferta ${idx + 1}`}</span>
                      {isBest && (
                        <span
                          className={`text-xs font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                            isActive
                              ? "bg-text-inverse/20 text-text-inverse"
                              : "bg-brand-subtle text-brand border border-brand/30"
                          }`}
                        >
                          <Award className="w-3 h-3" />
                          TOP
                        </span>
                      )}
                    </button>
                  );
                })}

                {offers.length < 3 && (
                  <button
                    onClick={handleAddOffer}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-brand bg-brand-subtle/50 hover:bg-brand-subtle border border-brand/30 transition flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Dodaj ofertę ({offers.length}/3)</span>
                  </button>
                )}
              </div>

              {offers.length > 1 && (
                <button
                  onClick={() => handleRemoveOffer(activeOfferId)}
                  className="text-xs font-semibold text-danger hover:text-danger-hover flex items-center gap-1 p-1.5 rounded-lg hover:bg-danger-subtle/30 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                  title="Usuń aktywną ofertę"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Usuń tę ofertę</span>
                </button>
              )}
            </div>

            {/* Active Offer Form */}
            {activeOffer && (
              <div className="bg-surface-2/40 border border-border/80 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1">
                      Nazwa oferty / Banku
                    </label>
                    <input
                      type="text"
                      value={activeOffer.name}
                      onChange={(e) => handleUpdateOffer(activeOffer.id, "name", e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
                      placeholder="np. mBank promocyjna marża"
                    />
                  </div>

                  {/* Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap self-end">
                    <span className="text-xs text-text-faint font-bold uppercase mr-1">Szablony:</span>
                    <button
                      type="button"
                      onClick={() => applyPreset("lower_rate")}
                      className="px-2.5 py-1 text-xs font-bold bg-surface border border-border rounded-lg text-text-muted hover:text-brand hover:border-brand/40 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                    >
                      -1.5% stopa
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("zero_costs")}
                      className="px-2.5 py-1 text-xs font-bold bg-surface border border-border rounded-lg text-text-muted hover:text-brand hover:border-brand/40 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                    >
                      0 zł prowizji
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("shorter_term")}
                      className="px-2.5 py-1 text-xs font-bold bg-surface border border-border rounded-lg text-text-muted hover:text-brand hover:border-brand/40 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                    >
                      -5 lat okres
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                      Nowe oprocentowanie (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        value={activeOffer.newRate}
                        onChange={(e) => handleUpdateOffer(activeOffer.id, "newRate", e.target.value)}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none tabular-nums pr-8"
                        placeholder="5.85"
                      />
                      <span className="absolute right-3 top-2 text-xs text-text-muted font-bold pointer-events-none">
                        %
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                      Koszty przejścia / opłaty
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="100"
                        min="0"
                        value={activeOffer.closingCosts}
                        onChange={(e) => handleUpdateOffer(activeOffer.id, "closingCosts", e.target.value)}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none tabular-nums pr-12"
                        placeholder="4500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-text-muted font-bold pointer-events-none">
                        {currency}
                      </span>
                    </div>
                    <span className="text-xs text-text-faint block mt-1">wycena, prowizja, opłaty sądowe</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-faint uppercase tracking-wider mb-1.5">
                      Nowy okres spłaty (lata)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="35"
                      value={activeOffer.newTermYears}
                      onChange={(e) => handleUpdateOffer(activeOffer.id, "newTermYears", e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none tabular-nums"
                      placeholder="20"
                    />
                    <span className="text-xs text-text-faint block mt-1">
                      {Math.round((parseAmountInput(activeOffer.newTermYears) ?? 1) * 12)} miesięcy
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Best Offer Callout Banner */}
            {bestOfferItem ? (
              <div className="p-4 rounded-2xl bg-brand-subtle/40 border border-brand/30 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand text-text-inverse flex items-center justify-center shrink-0 mt-0.5">
                  <Award className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-black uppercase tracking-wider text-xs text-brand">
                      Najbardziej opłacalna oferta: {bestOfferItem.offer.name}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 bg-brand text-text-inverse font-bold rounded">
                      Ranga #1
                    </span>
                  </div>
                  <p className="font-medium text-text-main leading-relaxed">
                    Wybierając tę ofertę oszczędzasz szacunkowo{" "}
                    <strong>{formatMoney(bestOfferItem.result.comparison.netLifetimeSavings, currency)} netto</strong>{" "}
                    po odliczeniu kosztów wejścia. Zwrot opłat nastąpi po{" "}
                    <strong>
                      {bestOfferItem.result.comparison.breakEvenMonths !== null
                        ? `${bestOfferItem.result.comparison.breakEvenMonths} miesiącach`
                        : "dłuższym okresie"}
                    </strong>
                    .
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-surface-2 border border-border flex items-start gap-3 text-xs text-text-muted">
                <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p>
                  Żadna z wprowadzonych ofert nie przynosi jednoznacznej korzyści finansowej netto po uwzględnieniu kosztów wejścia.
                </p>
              </div>
            )}

            {/* Side-by-Side Comparison Matrix Table */}
            {multiComparison && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-faint flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-brand" />
                    Zestawienie porównawcze ofert vs Obecny kredyt
                  </h3>
                </div>

                <div className="overflow-x-auto border border-border rounded-2xl bg-surface">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-surface-2/60 text-text-faint font-bold uppercase text-xs tracking-wider">
                        <th className="py-3 px-4 w-1/4">Parametr / Metryka</th>
                        <th className="py-3 px-3 text-right bg-surface-2/30">
                          <div>Obecny kredyt</div>
                          <div className="text-xs font-normal text-text-muted">{debt.institution}</div>
                        </th>
                        {multiComparison.offers.map((item) => (
                          <th
                            key={item.offer.id}
                            className={`py-3 px-3 text-right ${
                              item.isBestOffer
                                ? "bg-brand-subtle/50 text-brand border-x border-brand/20 font-black"
                                : ""
                            }`}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {item.isBestOffer && <Award className="w-3 h-3 text-brand" />}
                              <span>{item.offer.name}</span>
                            </div>
                            <div className="text-xs font-normal text-text-muted">
                              Ranga #{item.rank}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {/* Row 1: Interest Rate */}
                      <tr className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-text-main">Oprocentowanie nominalne</td>
                        <td className="py-2.5 px-3 text-right font-bold text-text-main tabular-nums bg-surface-2/20">
                          {debt.interestRate.toFixed(2)}%
                        </td>
                        {multiComparison.offers.map((item) => (
                          <td
                            key={item.offer.id}
                            className={`py-2.5 px-3 text-right font-bold tabular-nums ${
                              item.isBestOffer ? "bg-brand-subtle/30 text-brand border-x border-brand/20 font-black" : "text-text-main"
                            }`}
                          >
                            {item.offer.newRate.toFixed(2)}%
                          </td>
                        ))}
                      </tr>

                      {/* Row 2: Monthly Payment */}
                      <tr className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-text-main">Miesięczna rata</td>
                        <td className="py-2.5 px-3 text-right font-bold text-text-main tabular-nums bg-surface-2/20">
                          {formatMoney(multiComparison.current.monthlyPayment, currency)}
                        </td>
                        {multiComparison.offers.map((item) => (
                          <td
                            key={item.offer.id}
                            className={`py-2.5 px-3 text-right font-bold tabular-nums ${
                              item.isBestOffer ? "bg-brand-subtle/30 text-brand border-x border-brand/20 font-black" : "text-text-main"
                            }`}
                          >
                            {formatMoney(item.result.refinanced.monthlyPayment, currency)}
                          </td>
                        ))}
                      </tr>

                      {/* Row 3: Monthly Difference */}
                      <tr className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-text-main">Różnica w racie co miesiąc</td>
                        <td className="py-2.5 px-3 text-right text-text-muted bg-surface-2/20">—</td>
                        {multiComparison.offers.map((item) => {
                          const diff = item.result.comparison.monthlyDifference;
                          return (
                            <td
                              key={item.offer.id}
                              className={`py-2.5 px-3 text-right font-bold tabular-nums ${
                                item.isBestOffer ? "bg-brand-subtle/30 border-x border-brand/20" : ""
                              } ${diff > 0 ? "text-success" : "text-text-muted"}`}
                            >
                              {diff > 0 ? `-${formatMoney(diff, currency)}` : `+${formatMoney(Math.abs(diff), currency)}`}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row 4: Closing Costs */}
                      <tr className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-text-main">Koszty przejścia (opłaty)</td>
                        <td className="py-2.5 px-3 text-right text-text-muted bg-surface-2/20">0 zł</td>
                        {multiComparison.offers.map((item) => (
                          <td
                            key={item.offer.id}
                            className={`py-2.5 px-3 text-right font-bold tabular-nums text-text-muted ${
                              item.isBestOffer ? "bg-brand-subtle/30 border-x border-brand/20" : ""
                            }`}
                          >
                            {formatMoney(item.result.refinanced.closingCosts, currency)}
                          </td>
                        ))}
                      </tr>

                      {/* Row 5: Break-Even */}
                      <tr className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-text-main">Czas zwrotu (Break-even)</td>
                        <td className="py-2.5 px-3 text-right text-text-muted bg-surface-2/20">—</td>
                        {multiComparison.offers.map((item) => {
                          const be = item.result.comparison.breakEvenMonths;
                          return (
                            <td
                              key={item.offer.id}
                              className={`py-2.5 px-3 text-right font-black tabular-nums ${
                                item.isBestOffer ? "bg-brand-subtle/30 text-brand border-x border-brand/20" : "text-text-main"
                              }`}
                            >
                              {be !== null ? `${be} mies.` : "Brak zwrotu"}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row 6: 5-Year Savings */}
                      <tr className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-text-main">Szacunek oszczędności (5 lat)</td>
                        <td className="py-2.5 px-3 text-right text-text-muted bg-surface-2/20">—</td>
                        {multiComparison.offers.map((item) => {
                          const s5 = item.result.comparison.fiveYearNetSavings;
                          return (
                            <td
                              key={item.offer.id}
                              className={`py-2.5 px-3 text-right font-bold tabular-nums ${
                                item.isBestOffer ? "bg-brand-subtle/30 border-x border-brand/20" : ""
                              } ${s5 > 0 ? "text-brand" : "text-text-muted"}`}
                            >
                              {s5 > 0 ? `+${formatMoney(s5, currency)}` : formatMoney(s5, currency)}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row 7: Net Lifetime Gain */}
                      <tr className="hover:bg-surface-hover/50 transition-colors bg-surface-2/20 font-bold">
                        <td className="py-3 px-4 text-text-main">Łączny zysk netto po kosztach</td>
                        <td className="py-3 px-3 text-right text-text-muted bg-surface-2/40">—</td>
                        {multiComparison.offers.map((item) => {
                          const net = item.result.comparison.netLifetimeSavings;
                          return (
                            <td
                              key={item.offer.id}
                              className={`py-3 px-3 text-right text-sm tabular-nums font-black ${
                                item.isBestOffer
                                  ? "bg-brand-subtle/60 text-brand border-x border-brand/30"
                                  : net > 0
                                  ? "text-brand"
                                  : "text-danger"
                              }`}
                            >
                              {net > 0 ? `+${formatMoney(net, currency)}` : formatMoney(net, currency)}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Row 8: Status Badge */}
                      <tr className="hover:bg-surface-hover/50 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-text-main">Ocena opłacalności</td>
                        <td className="py-2.5 px-3 text-right text-text-muted bg-surface-2/20">Bazowy</td>
                        {multiComparison.offers.map((item) => {
                          const badge = getStatusBadge(item.result.comparison.benefitStatus);
                          return (
                            <td
                              key={item.offer.id}
                              className={`py-2.5 px-3 text-right ${
                                item.isBestOffer ? "bg-brand-subtle/30 border-x border-brand/20" : ""
                              }`}
                            >
                              <span
                                title={item.result.comparison.statusReason}
                                className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md border cursor-help ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="text-xs text-text-muted flex items-start gap-2 bg-surface-2 p-3.5 rounded-xl border border-border">
              <ShieldAlert className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <p>
                <strong>Zastrzeżenie:</strong> Obliczenia mają charakter symulacyjny i orientacyjny. Ostateczna oferta bankowa zależy od indywidualnej zdolności kredytowej, wyceny nieruchomości, dodatkowych ubezpieczeń (na życie/pomostowych) oraz ewentualnych prowizji za wcześniejszą spłatę dotychczasowego kredytu.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-border flex items-center justify-end gap-3 bg-surface-2/30 shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-text-inverse text-xs font-bold rounded-xl shadow-xs transition-all focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] cursor-pointer min-h-[44px]"
            >
              Zamknij
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
