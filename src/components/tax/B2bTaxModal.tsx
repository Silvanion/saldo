import React, { useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Briefcase,
  Scale,
  Percent,
  Calendar,
  Sparkles,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  PiggyBank,
  CheckCircle2,
  RefreshCw,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Profile } from "../../types";
import { formatMoney, parseAmountInput } from "../../utils/format";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import {
  ZusTier,
  RyczaltRate,
  TaxForm,
  compareAllTaxForms,
  calculateCurrentMonthTaxBuffer,
  TAX_CONSTANTS_PL,
} from "../../services/taxCalculations";

export type B2bTaxTab = "comparison" | "monthly_buffer" | "calendar_tips";

export interface B2bTaxModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  initialRevenue?: number;
  initialCosts?: number;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export function B2bTaxModal({
  isOpen,
  onClose,
  profile,
  initialRevenue = 20000,
  initialCosts = 1500,
  showToast,
}: B2bTaxModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const [activeTab, setActiveTab] = useState<B2bTaxTab>("comparison");
  const [revenue, setRevenue] = useState<number>(initialRevenue);
  const [costs, setCosts] = useState<number>(initialCosts);
  const [zusTier, setZusTier] = useState<ZusTier>("full");
  const [includeSickPay, setIncludeSickPay] = useState<boolean>(true);
  const [ryczaltRate, setRyczaltRate] = useState<RyczaltRate>(12);
  const [isVatPayer, setIsVatPayer] = useState<boolean>(true);
  const [selectedForm, setSelectedForm] = useState<TaxForm>("ryczalt");

  const currency = profile.currency || "PLN";

  // Porównanie 3 form opodatkowania na żywo
  const comparison = useMemo(() => {
    return compareAllTaxForms({
      monthlyRevenue: revenue,
      monthlyCosts: costs,
      zusTier,
      includeSickPay,
      ryczaltRate,
      isVatPayer,
      vatRate: 23,
    });
  }, [revenue, costs, zusTier, includeSickPay, ryczaltRate, isVatPayer]);

  // Obliczenia na podstawie bieżących transakcji Saldo
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();

  const liveBuffer = useMemo(() => {
    return calculateCurrentMonthTaxBuffer(
      profile.transactions || [],
      currentYear,
      currentMonthIdx,
      {
        zusTier,
        includeSickPay,
        ryczaltRate,
        isVatPayer,
        selectedForm,
      }
    );
  }, [profile.transactions, currentYear, currentMonthIdx, zusTier, includeSickPay, ryczaltRate, isVatPayer, selectedForm]);

  const handleSyncFromTransactions = () => {
    if (liveBuffer.revenue > 0 || liveBuffer.costs > 0) {
      setRevenue(liveBuffer.revenue);
      setCosts(liveBuffer.costs);
      showToast?.(
        `Zaciągnięto dane z Saldo: ${formatMoney(liveBuffer.revenue, currency)} przychodu, ${formatMoney(liveBuffer.costs, currency)} kosztów`,
        "success"
      );
    } else {
      showToast?.("Brak transakcji przychodowych w bieżącym miesiącu w tym profilu", "info");
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="bg-surface border border-border/70 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="b2b-tax-modal-title"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/60 flex items-center justify-between shrink-0 bg-surface-2/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
                <Briefcase className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="b2b-tax-modal-title" className="text-base sm:text-lg font-black text-text-main tracking-tight truncate">
                    Kalkulator Podatkowy & B2B / JDG
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-brand-subtle text-brand text-[10px] font-bold border border-brand/20 uppercase tracking-wider">
                    POLSKA 2025/2026
                  </span>
                </div>
                <p className="text-xs text-text-muted truncate">
                  Optymalizator form opodatkowania, wyliczanie ZUS i składki zdrowotnej oraz rezerwa podatkowa
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-2 active:scale-95 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shrink-0"
              aria-label="Zamknij kalkulator podatkowy"
              id="btn-close-b2b-tax"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center border-b border-border/60 bg-surface px-4 sm:px-6 overflow-x-auto shrink-0 gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab("comparison")}
              className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring flex items-center gap-2 ${
                activeTab === "comparison"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
              id="tab-tax-comparison"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Porównywarka Form (Ryczałt vs Liniowy vs Skala)</span>
            </button>

            <button
              onClick={() => setActiveTab("monthly_buffer")}
              className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring flex items-center gap-2 ${
                activeTab === "monthly_buffer"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
              id="tab-tax-monthly-buffer"
            >
              <PiggyBank className="w-3.5 h-3.5" />
              <span>Rezerwa Podatkowa z Transakcji Saldo</span>
            </button>

            <button
              onClick={() => setActiveTab("calendar_tips")}
              className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring flex items-center gap-2 ${
                activeTab === "calendar_tips"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
              id="tab-tax-calendar-tips"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Terminarz i Wskazówki JDG</span>
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-surface/50">
            {/* TAB 1: PORÓWNYWARKA FORM OPODATKOWANIA */}
            {activeTab === "comparison" && (
              <div className="space-y-6 animate-fade-in" id="tax-comparison-content">
                {/* Parametry wejściowe */}
                <div className="bg-surface border border-border/70 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                    <h3 className="text-xs font-bold text-text-faint uppercase tracking-wider">
                      Parametry Finansowe Działalności (Miesięcznie)
                    </h3>
                    <button
                      onClick={handleSyncFromTransactions}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline cursor-pointer"
                      id="btn-sync-tax-inputs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Uzupełnij z bieżących transakcji Saldo</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Przychód netto */}
                    <div>
                      <label className="block text-xs font-bold text-text-muted mb-1.5">
                        Przychód netto na fakturach
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="500"
                          value={revenue}
                          onChange={(e) => setRevenue(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-12"
                          id="input-tax-revenue"
                        />
                        <span className="absolute right-3.5 top-2 text-xs text-text-muted font-bold pointer-events-none">
                          {currency}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 overflow-x-auto">
                        {[10000, 15000, 20000, 25000, 35000].map((val) => (
                          <button
                            key={val}
                            onClick={() => setRevenue(val)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-2 hover:bg-surface-3 text-text-muted cursor-pointer"
                          >
                            {val / 1000}k
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Koszty uzyskania przychodów */}
                    <div>
                      <label className="block text-xs font-bold text-text-muted mb-1.5">
                        Koszty firmowe netto (sprzęt, biuro itp.)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="200"
                          value={costs}
                          onChange={(e) => setCosts(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring tabular-nums pr-12"
                          id="input-tax-costs"
                        />
                        <span className="absolute right-3.5 top-2 text-xs text-text-muted font-bold pointer-events-none">
                          {currency}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 overflow-x-auto">
                        {[0, 1000, 2500, 5000, 10000].map((val) => (
                          <button
                            key={val}
                            onClick={() => setCosts(val)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-2 hover:bg-surface-3 text-text-muted cursor-pointer"
                          >
                            {val === 0 ? "0" : `${val / 1000}k`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ZUS Społeczny */}
                    <div>
                      <label className="block text-xs font-bold text-text-muted mb-1.5">
                        Składki ZUS Społeczne
                      </label>
                      <select
                        value={zusTier}
                        onChange={(e) => setZusTier(e.target.value as ZusTier)}
                        className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                        id="select-tax-zus-tier"
                      >
                        <option value="full">Duży ZUS (Pełny ~1 774 zł)</option>
                        <option value="preferential">Mały ZUS (Preferencyjny ~450 zł)</option>
                        <option value="relief_start">Ulga na start (0 zł społecznego)</option>
                      </select>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-text-muted">
                        <input
                          type="checkbox"
                          checked={includeSickPay}
                          onChange={(e) => setIncludeSickPay(e.target.checked)}
                          className="rounded border-border text-brand focus:ring-brand"
                        />
                        <span>Dobrowolne chorobowe</span>
                      </label>
                    </div>

                    {/* Stawka Ryczałtu & VAT */}
                    <div>
                      <label className="block text-xs font-bold text-text-muted mb-1.5">
                        Stawka ryczałtu ewidencjonowanego
                      </label>
                      <select
                        value={ryczaltRate}
                        onChange={(e) => setRyczaltRate(Number(e.target.value) as RyczaltRate)}
                        className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-xs font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                        id="select-tax-ryczalt-rate"
                      >
                        <option value={12}>12% – IT / programiści / doradztwo sprzętowe</option>
                        <option value={15}>15% – Usługi prawne, doradcze, architekci</option>
                        <option value={8.5}>8.5% – Usługi ogólne i inne</option>
                        <option value={14}>14% – Usługi opieki zdrowotnej / inżynierowie</option>
                        <option value={5.5}>5.5% – Działalność budowlana / wytwórcza</option>
                        <option value={3}>3% – Handel i gastronomia</option>
                        <option value={17}>17% – Wolne zawody bez zatrudnienia</option>
                      </select>

                      <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-text-muted">
                        <input
                          type="checkbox"
                          checked={isVatPayer}
                          onChange={(e) => setIsVatPayer(e.target.checked)}
                          className="rounded border-border text-brand focus:ring-brand"
                          id="toggle-is-vat-payer"
                        />
                        <span>Płatnik VAT (23%)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Banner Rekomendacji i Wniosków */}
                <div
                  className="bg-brand-subtle/50 border border-brand/30 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs"
                  id="tax-recommendation-banner"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-brand text-text-inverse flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-brand uppercase tracking-wider">
                          Najbardziej opłacalny wybór:
                        </span>
                        <strong className="text-sm sm:text-base font-black text-text-main">
                          {comparison.bestFormLabel}
                        </strong>
                      </div>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">
                        {comparison.recommendationReason}
                      </p>
                    </div>
                  </div>

                  {comparison.annualDifferenceBestVsWorst > 0 && (
                    <div className="bg-surface border border-brand/20 rounded-xl px-4 py-2.5 shrink-0 text-right">
                      <span className="text-[10px] font-bold text-text-muted block uppercase">
                        Roczna różnica (Zysk)
                      </span>
                      <span className="text-lg font-black text-emerald-500 tabular-nums">
                        +{formatMoney(comparison.annualDifferenceBestVsWorst, currency)}
                      </span>
                      <span className="text-[10px] text-text-faint block">względem najmniej korzystnej</span>
                    </div>
                  )}
                </div>

                {/* 3 Kolumny Porównania Form Opodatkowania */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="tax-cards-grid">
                  {[comparison.ryczalt, comparison.linear, comparison.scale].map((res) => {
                    const isBest = res.form === comparison.bestForm;
                    return (
                      <div
                        key={res.form}
                        className={`bg-surface rounded-xl border p-5 flex flex-col justify-between transition-all relative ${
                          isBest
                            ? "border-brand ring-2 ring-brand/30 shadow-md"
                            : "border-border/70 hover:border-border"
                        }`}
                      >
                        {isBest && (
                          <div className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full bg-brand text-text-inverse text-[10px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Zwycięzca</span>
                          </div>
                        )}

                        <div className="space-y-4">
                          <div className="border-b border-border/50 pb-3">
                            <h4 className="text-base font-black text-text-main">{res.formLabel}</h4>
                            <span className="text-xs text-text-muted">
                              Efektywne obciążenie: <strong className="text-text-main font-bold">{res.effectiveTaxRatePercent}%</strong>
                            </span>
                          </div>

                          {/* Kwota na rękę */}
                          <div className="bg-surface-2/60 rounded-xl p-3.5 border border-border/40">
                            <span className="text-[11px] font-semibold text-text-muted block">
                              Miesięcznie na czysto (Na rękę):
                            </span>
                            <span className={`text-2xl font-black tabular-nums block mt-0.5 ${isBest ? "text-brand" : "text-text-main"}`}>
                              {formatMoney(res.netIncome, currency)}
                            </span>
                            <span className="text-[11px] text-text-faint tabular-nums block mt-1">
                              Rocznie: {formatMoney(res.annualNetIncome, currency)}
                            </span>
                          </div>

                          {/* Rozbicie danin */}
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between text-text-muted">
                              <span>Składki ZUS Społeczne:</span>
                              <strong className="text-text-main font-semibold tabular-nums">
                                {formatMoney(res.zusSocial, currency)}
                              </strong>
                            </div>

                            <div className="flex items-center justify-between text-text-muted">
                              <span>Składka Zdrowotna:</span>
                              <strong className="text-text-main font-semibold tabular-nums">
                                {formatMoney(res.healthInsurance, currency)}
                              </strong>
                            </div>

                            <div className="flex items-center justify-between text-text-muted">
                              <span>Podatek Dochodowy (PIT):</span>
                              <strong className="text-text-main font-semibold tabular-nums">
                                {formatMoney(res.incomeTax, currency)}
                              </strong>
                            </div>

                            {res.vatDue > 0 && (
                              <div className="flex items-center justify-between text-text-muted border-t border-border/40 pt-1.5">
                                <span>Podatek VAT (do urzędu):</span>
                                <strong className="text-amber-500 font-semibold tabular-nums">
                                  {formatMoney(res.vatDue, currency)}
                                </strong>
                              </div>
                            )}

                            <div className="flex items-center justify-between font-bold text-text-main border-t border-border/50 pt-2">
                              <span>Łączna rezerwa do odłożenia:</span>
                              <strong className="text-danger font-bold tabular-nums">
                                {formatMoney(res.taxBufferToSetAside, currency)}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedForm(res.form);
                            setActiveTab("monthly_buffer");
                          }}
                          className="mt-5 w-full py-2 bg-surface hover:bg-surface-2 border border-border/80 text-text-main text-xs font-bold rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>Śledź tę formę w buforze</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: BUFOR PODATKOWY Z TRANSAKCJI */}
            {activeTab === "monthly_buffer" && (
              <div className="space-y-6 animate-fade-in" id="tax-monthly-buffer-content">
                <div className="bg-surface border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-text-main">
                        Kalkulator Bufora Podatkowego na Bieżący Miesiąc
                      </h3>
                      <p className="text-xs text-text-muted">
                        Wylicza dokładną kwotę, jaką należy odłożyć na subkonto podatkowe przed 20. i 25. dniem miesiąca.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={selectedForm}
                        onChange={(e) => setSelectedForm(e.target.value as TaxForm)}
                        className="bg-surface-2 text-text-main font-bold px-3 py-1.5 rounded-lg border border-border text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                        id="select-buffer-tax-form"
                      >
                        <option value="ryczalt">Rozliczenie: Ryczałt ({ryczaltRate}%)</option>
                        <option value="linear">Rozliczenie: Podatek Liniowy (19%)</option>
                        <option value="scale">Rozliczenie: Skala Podatkowa (12/32%)</option>
                      </select>
                    </div>
                  </div>

                  {/* Karta Głównego Bufora */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-danger-subtle/40 border border-danger/20 rounded-xl p-4 shadow-xs">
                      <span className="text-xs font-bold text-danger block uppercase tracking-wider mb-1">
                        Kwota do odłożenia na podatki
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-danger tabular-nums block" id="val-tax-buffer-total">
                        {formatMoney(liveBuffer.activeResult.taxBufferToSetAside, currency)}
                      </span>
                      <span className="text-xs text-text-muted block mt-1">
                        ZUS + Zdrowotna + PIT {liveBuffer.activeResult.vatDue > 0 ? "+ VAT" : ""}
                      </span>
                    </div>

                    <div className="bg-emerald-subtle/40 border border-emerald-500/20 rounded-xl p-4 shadow-xs">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider mb-1">
                        Zysk czysty do dyspozycji
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums block">
                        {formatMoney(liveBuffer.activeResult.netIncome, currency)}
                      </span>
                      <span className="text-xs text-text-muted block mt-1">
                        Po potrąceniu wszystkich danin i kosztów
                      </span>
                    </div>

                    <div className="bg-surface-2 border border-border/70 rounded-xl p-4 shadow-xs">
                      <span className="text-xs font-bold text-text-muted block uppercase tracking-wider mb-1">
                        Przychód w bieżącym miesiącu
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-text-main tabular-nums block">
                        {formatMoney(liveBuffer.revenue, currency)}
                      </span>
                      <span className="text-xs text-text-muted block mt-1">
                        Koszty operacyjne: {formatMoney(liveBuffer.costs, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Szczegółowy plan przelewów podatkowych */}
                  <div className="border border-border/70 rounded-xl p-4 bg-surface-2/30 space-y-3">
                    <h4 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-brand" />
                      <span>Terminarz i przelewy skarbowe w tym miesiącu:</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-surface border border-border rounded-xl space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text-main">Przelew ZUS (DRA)</span>
                          <span className="px-2 py-0.5 rounded bg-brand-subtle text-brand font-bold text-[10px]">
                            Do 20. dnia miesiąca
                          </span>
                        </div>
                        <p className="text-text-muted">Społeczne + Zdrowotna na indywidualny rachunek składkowy (NRS):</p>
                        <p className="text-sm font-black text-text-main tabular-nums">
                          {formatMoney(liveBuffer.activeResult.zusSocial + liveBuffer.activeResult.healthInsurance, currency)}
                        </p>
                      </div>

                      <div className="p-3 bg-surface border border-border rounded-xl space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text-main">Zaliczka PIT do Urzędu Skarbowego</span>
                          <span className="px-2 py-0.5 rounded bg-brand-subtle text-brand font-bold text-[10px]">
                            Do 20. dnia miesiąca
                          </span>
                        </div>
                        <p className="text-text-muted">Mikrorachunek podatkowy podatnika:</p>
                        <p className="text-sm font-black text-text-main tabular-nums">
                          {formatMoney(liveBuffer.activeResult.incomeTax, currency)}
                        </p>
                      </div>

                      {liveBuffer.activeResult.vatDue > 0 && (
                        <div className="p-3 bg-surface border border-border rounded-xl space-y-1 text-xs sm:col-span-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-text-main">Podatek VAT (JPK_V7)</span>
                            <span className="px-2 py-0.5 rounded bg-amber-subtle text-amber-600 font-bold text-[10px]">
                              Do 25. dnia miesiąca
                            </span>
                          </div>
                          <p className="text-text-muted">Mikrorachunek podatkowy (VAT należny - naliczony):</p>
                          <p className="text-sm font-black text-amber-500 tabular-nums">
                            {formatMoney(liveBuffer.activeResult.vatDue, currency)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: TERMINARZ I WSKAZÓWKI JDG */}
            {activeTab === "calendar_tips" && (
              <div className="space-y-6 animate-fade-in" id="tax-calendar-tips-content">
                {/* Terminarz */}
                <div className="bg-surface border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
                  <h3 className="text-base font-bold text-text-main flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand" />
                    <span>Oficjalne Terminy Podatkowe dla Przedsiębiorców w Polsce</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-brand/30 bg-brand-subtle/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-text-main">20. dzień każdego miesiąca</span>
                        <span className="px-2 py-0.5 rounded-full bg-brand text-text-inverse text-[10px] font-bold">
                          ZUS & PIT
                        </span>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed">
                        Ostateczny termin opłacenia składek ZUS (społeczne + zdrowotna) za poprzedni miesiąc oraz wpłaty zaliczki na podatek dochodowy (PIT-5, PIT-5L lub ryczałt PPE) do Urzędu Skarbowego.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-surface-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-text-main">25. dzień każdego miesiąca</span>
                        <span className="px-2 py-0.5 rounded-full bg-surface text-text-main border border-border text-[10px] font-bold">
                          VAT & JPK
                        </span>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed">
                        Termin wysłania jednolitego pliku kontrolnego JPK_V7 (deklaracja + ewidencja) oraz zapłaty podatku VAT za poprzedni miesiąc (dla podatników VAT czynnych).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Złote Zasady Bezpieczeństwa Podatkowego */}
                <div className="bg-surface border border-border/70 rounded-xl p-5 shadow-xs space-y-4">
                  <h3 className="text-base font-bold text-text-main flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand" />
                    <span>Dobre Praktyki i Optymalizacje B2B w Saldo</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 bg-surface-2 rounded-xl border border-border/70 space-y-1.5">
                      <strong className="text-text-main font-bold block">1. Osobne Subkonto Podatkowe</strong>
                      <p className="text-text-muted leading-relaxed">
                        W dniu opłacenia faktury przez klienta od razu przelej kwotę wyliczoną w Saldo (PIT + ZUS + VAT) na osobne konto oszczędnościowe. Dzięki temu nigdy nie „przejesz” podatków.
                      </p>
                    </div>

                    <div className="p-3.5 bg-surface-2 rounded-xl border border-border/70 space-y-1.5">
                      <strong className="text-text-main font-bold block">2. Koszty a Ryczałt</strong>
                      <p className="text-text-muted leading-relaxed">
                        Pamiętaj, że na ryczałcie koszty nie pomniejszają podatku dochodowego (pomniejszają jedynie VAT). Jeśli planujesz duży zakup (np. samochód, sprzęt), policz, czy w danym roku nie opłaca się skala lub liniowy.
                      </p>
                    </div>

                    <div className="p-3.5 bg-surface-2 rounded-xl border border-border/70 space-y-1.5">
                      <strong className="text-text-main font-bold block">3. Odliczenie Zdrowotnej</strong>
                      <p className="text-text-muted leading-relaxed">
                        Na ryczałcie odliczasz 50% zapłaconej składki zdrowotnej od przychodu. Na podatku liniowym odliczasz ją od dochodu do rocznego limitu (ok. 11 600 zł). Na skali składka nie podlega odliczeniu.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-border/60 bg-surface-2/30 flex items-center justify-between shrink-0 gap-3">
            <span className="text-xs text-text-faint truncate">
              Wszystkie wyliczenia podatkowe oparte są na aktualnych przepisach RP i wykonywane lokalnie.
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-surface hover:bg-surface-2 border border-border text-text-main rounded-xl text-xs font-bold active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring shrink-0"
              id="btn-close-tax-modal-footer"
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
export default B2bTaxModal;
