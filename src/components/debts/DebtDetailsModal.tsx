import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Home,
  CreditCard,
  Banknote,
  Percent,
  Calendar,
  Layers,
  Sparkles,
  TrendingDown,
  Scale,
  ShieldCheck,
  FileText,
  Clock,
  ArrowRight,
  Info
} from "lucide-react";
import { MockDebtItem, MOCK_AMORTIZATION_SCHEDULE } from "./mockData";
import { formatMoney } from "../../utils/format";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export type DebtDetailTab = "overview" | "schedule" | "overpayment" | "refinance" | "terms";

interface DebtDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: MockDebtItem | null;
  initialTab?: DebtDetailTab;
  onOpenOverpaymentModal?: (debt: MockDebtItem) => void;
  onOpenRefinanceModal?: (debt: MockDebtItem) => void;
}

export function DebtDetailsModal({
  isOpen,
  onClose,
  debt,
  initialTab = "overview",
  onOpenOverpaymentModal,
  onOpenRefinanceModal
}: DebtDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const [activeTab, setActiveTab] = useState<DebtDetailTab>(initialTab);
  const [scheduleMode, setScheduleMode] = useState<"baseline" | "overpayment">("baseline");

  // Keep activeTab in sync with initialTab on open
  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen || !debt || typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-xs">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15 }}
          className="bg-surface border border-border w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          role="dialog"
          aria-modal="true"
        >
          {/* Top Header */}
          <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between shrink-0 bg-surface-2/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0">
                <Home className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-text-main truncate">
                    {debt.name}
                  </h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-brand-subtle text-brand border border-brand/20">
                    {debt.typeLabel}
                  </span>
                </div>
                <p className="text-xs text-text-muted truncate">
                  {debt.institution} • Umowa z dnia 12.03.2021 • Saldo: {formatMoney(debt.balance, "PLN")}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-full transition cursor-pointer"
              aria-label="Zamknij szczegóły"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Internal Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 px-5 sm:px-6 border-b border-border bg-surface-2/20 overflow-x-auto custom-scrollbar shrink-0">
            <button
              onClick={() => setActiveTab("overview")}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "overview"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              Przegląd
            </button>

            <button
              onClick={() => setActiveTab("schedule")}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "schedule"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              Harmonogram spłat
            </button>

            <button
              onClick={() => setActiveTab("overpayment")}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "overpayment"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              Nadpłata
            </button>

            <button
              onClick={() => setActiveTab("refinance")}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "refinance"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              Refinansowanie
            </button>

            <button
              onClick={() => setActiveTab("terms")}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "terms"
                  ? "border-brand text-brand"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              Koszty i warunki umowy
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6 animate-fade-in">
                {/* KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-surface-2/60 border border-border">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                      Pozostały kapitał
                    </span>
                    <span className="text-lg sm:text-xl font-black text-text-main tabular-nums">
                      {formatMoney(debt.balance, "PLN")}
                    </span>
                    <span className="text-[10px] text-text-muted block mt-0.5">
                      z {formatMoney(debt.originalAmount, "PLN")}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-2/60 border border-border">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                      Bieżąca rata
                    </span>
                    <span className="text-lg sm:text-xl font-black text-text-main tabular-nums">
                      {formatMoney(debt.monthlyPayment, "PLN")}
                    </span>
                    <span className="text-[10px] text-text-muted block mt-0.5">
                      Raty równe (annuitetowe)
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-2/60 border border-border">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                      Oprocentowanie
                    </span>
                    <span className="text-lg sm:text-xl font-black text-brand tabular-nums">
                      {debt.interestRate.toFixed(2)}%
                    </span>
                    <span className="text-[10px] text-text-muted block mt-0.5">
                      Stała stopa do 03.2028
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-2/60 border border-border">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-faint block mb-1">
                      Wskaźnik LTV
                    </span>
                    <span className="text-lg sm:text-xl font-black text-text-main tabular-nums">
                      {debt.ltv || 71}%
                    </span>
                    <span className="text-[10px] text-text-muted block mt-0.5">
                      Wartość: 540 000 zł
                    </span>
                  </div>
                </div>

                {/* Visual Chart Placeholders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Amortization Curve Mock */}
                  <div className="p-4 sm:p-5 bg-surface border border-border rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-text-faint">
                          Krzywa spłaty kapitału w czasie
                        </h4>
                        <p className="text-xs text-text-muted">Projekcja salda do 2051 roku</p>
                      </div>
                    </div>

                    <div className="h-44 bg-surface-2/50 rounded-xl border border-dashed border-border/80 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                      {/* Stylized SVG curve representation */}
                      <svg className="w-full h-28 text-brand" viewBox="0 0 300 100" fill="none">
                        <path
                          d="M 10 10 Q 120 70 290 90"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                        />
                        <path
                          d="M 10 10 Q 120 70 290 90 L 290 100 L 10 100 Z"
                          fill="currentColor"
                          fillOpacity="0.08"
                        />
                      </svg>
                      <div className="flex justify-between w-full text-[10px] text-text-faint px-2 mt-2">
                        <span>2026 (382 tys.)</span>
                        <span>2035 (260 tys.)</span>
                        <span>2045 (110 tys.)</span>
                        <span>2051 (0 zł)</span>
                      </div>
                    </div>
                  </div>

                  {/* Capital vs Interest breakdown */}
                  <div className="p-4 sm:p-5 bg-surface border border-border rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-text-faint">
                          Struktura raty: Kapitał vs Odsetki
                        </h4>
                        <p className="text-xs text-text-muted">Obecnie 75% raty stanowią odsetki</p>
                      </div>
                    </div>

                    <div className="h-44 bg-surface-2/50 rounded-xl border border-dashed border-border/80 p-4 flex flex-col justify-center gap-3">
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-text-muted">Część odsetkowa (75%)</span>
                          <span className="text-text-main">2 198 zł</span>
                        </div>
                        <div className="w-full h-3 bg-surface-offset rounded-full overflow-hidden">
                          <div className="h-full bg-danger/80 rounded-full" style={{ width: "75%" }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-text-muted">Część kapitałowa (25%)</span>
                          <span className="text-text-main">742 zł</span>
                        </div>
                        <div className="w-full h-3 bg-surface-offset rounded-full overflow-hidden">
                          <div className="h-full bg-brand rounded-full" style={{ width: "25%" }} />
                        </div>
                      </div>

                      <span className="text-[11px] text-text-faint mt-1 text-center">
                        Łączna rata miesięczna: 2 940,00 zł
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key Insights Strip */}
                <div className="p-4 bg-brand-subtle/30 border border-brand/20 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Kluczowe wnioski analityczne
                  </h4>
                  <ul className="text-xs text-text-muted space-y-1.5 list-disc list-inside">
                    <li>
                      <strong>Wysoki potencjał nadpłaty:</strong> Nawet 500 zł miesięcznie skróci okres kredytowania o 3 lata i 8 miesięcy.
                    </li>
                    <li>
                      <strong>Koniec stałej stopy:</strong> W marcu 2028 nastąpi przejście na stawkę zmienną (WIBOR 3M + 1.95%).
                    </li>
                    <li>
                      <strong>Opcja refinansowania:</strong> Oferty rynkowe na poziomie 5.90% mogą obniżyć miesięczną ratę o ok. 280 zł.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 2: SCHEDULE */}
            {activeTab === "schedule" && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
                  <div>
                    <h3 className="text-sm font-bold text-text-main">Harmonogram spłat (Amortyzacja)</h3>
                    <p className="text-xs text-text-muted">Rozbicie raty miesiąc po miesiącu</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setScheduleMode("baseline")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        scheduleMode === "baseline"
                          ? "bg-brand text-text-inverse shadow-xs"
                          : "bg-surface-2 text-text-muted hover:text-text-main border border-border"
                      }`}
                    >
                      Plan bazowy
                    </button>
                    <button
                      onClick={() => setScheduleMode("overpayment")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        scheduleMode === "overpayment"
                          ? "bg-brand text-text-inverse shadow-xs"
                          : "bg-surface-2 text-text-muted hover:text-text-main border border-border"
                      }`}
                    >
                      Z nadpłatą (+1000 zł)
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-border rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-2 text-text-faint font-bold border-b border-border uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Miesiąc</th>
                        <th className="py-2.5 px-3 text-right">Rata łączna</th>
                        <th className="py-2.5 px-3 text-right">Kapitał</th>
                        <th className="py-2.5 px-3 text-right">Odsetki</th>
                        <th className="py-2.5 px-3 text-right">Saldo po racie</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-medium">
                      {MOCK_AMORTIZATION_SCHEDULE.map((row, idx) => (
                        <tr key={idx} className="hover:bg-surface-hover transition-colors">
                          <td className="py-2.5 px-3 font-bold text-text-main">{row.month}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-text-main tabular-nums">
                            {formatMoney(scheduleMode === "overpayment" ? row.installment + 1000 : row.installment, "PLN")}
                          </td>
                          <td className="py-2.5 px-3 text-right text-brand font-bold tabular-nums">
                            {formatMoney(scheduleMode === "overpayment" ? row.principal + 1000 : row.principal, "PLN")}
                          </td>
                          <td className="py-2.5 px-3 text-right text-text-muted tabular-nums">
                            {formatMoney(row.interest, "PLN")}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-text-main tabular-nums">
                            {formatMoney(scheduleMode === "overpayment" ? row.balance - 1000 * (idx + 1) : row.balance, "PLN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-[11px] text-text-faint text-center">
                  Pokazano pierwsze 12 miesięcy projekcji spłaty.
                </p>
              </div>
            )}

            {/* TAB 3: OVERPAYMENT */}
            {activeTab === "overpayment" && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-surface-2/60 border border-border p-5 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-sm font-bold text-text-main">Kalkulator nadpłat dla tej hipoteki</h3>
                    <p className="text-xs text-text-muted">
                      Sprawdź ile zyskasz skracając czas spłaty lub obniżając miesięczną ratę.
                    </p>
                  </div>
                  {onOpenOverpaymentModal && (
                    <button
                      onClick={() => onOpenOverpaymentModal(debt)}
                      className="px-4 py-2 bg-brand text-text-inverse text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-[0.98] transition cursor-pointer"
                    >
                      Otwórz pełny symulator
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-surface border border-border rounded-xl">
                    <span className="text-xs font-bold text-text-faint uppercase block mb-1">Scenariusz A: Nadpłata 500 zł / mc</span>
                    <span className="text-xl font-black text-brand block mb-2">-3 lata 8 mies.</span>
                    <p className="text-xs text-text-muted">Oszczędność: 23 400 zł na odsetkach</p>
                  </div>

                  <div className="p-4 bg-surface border border-brand/30 rounded-xl">
                    <span className="text-xs font-bold text-brand uppercase block mb-1">Scenariusz B: Nadpłata 1 000 zł / mc</span>
                    <span className="text-xl font-black text-brand block mb-2">-6 lat 0 mies.</span>
                    <p className="text-xs text-text-muted">Oszczędność: 39 800 zł na odsetkach</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: REFINANCE */}
            {activeTab === "refinance" && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-surface-2/60 border border-border p-5 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-sm font-bold text-text-main">Analiza opłacalności refinansowania</h3>
                    <p className="text-xs text-text-muted">
                      Obecna stawka: 6.85% • Najlepsze oferty rynkowe: od 5.85% do 6.10%
                    </p>
                  </div>
                  {onOpenRefinanceModal && (
                    <button
                      onClick={() => onOpenRefinanceModal(debt)}
                      className="px-4 py-2 bg-brand text-text-inverse text-xs font-bold rounded-xl hover:bg-brand-hover active:scale-[0.98] transition cursor-pointer"
                    >
                      Porównaj z nową ofertą
                    </button>
                  )}
                </div>

                <div className="p-4 bg-surface border border-border rounded-xl space-y-2 text-xs text-text-muted">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span>Szacowany czas zwrotu kosztów (Break-Even):</span>
                    <span className="font-bold text-text-main">18-19 miesięcy</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span>Zysk po 5 latach:</span>
                    <span className="font-bold text-brand">+16 800 PLN</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Rekomendacja:</span>
                    <span className="font-bold text-brand">Refinansowanie wysoce opłacalne</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: TERMS */}
            {activeTab === "terms" && (
              <div className="space-y-4 animate-fade-in text-xs">
                <h3 className="text-sm font-bold text-text-main">Parametry i warunki umowy kredytowej</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-surface-2/60 rounded-xl border border-border">
                    <span className="text-text-faint font-bold block uppercase tracking-wider text-[10px]">Rodzaj oprocentowania</span>
                    <span className="font-bold text-text-main">Stałe 6.85% (do 15.03.2028)</span>
                  </div>

                  <div className="p-3 bg-surface-2/60 rounded-xl border border-border">
                    <span className="text-text-faint font-bold block uppercase tracking-wider text-[10px]">Stawka po okresie stałym</span>
                    <span className="font-bold text-text-main">WIBOR 3M + marża 1.95%</span>
                  </div>

                  <div className="p-3 bg-surface-2/60 rounded-xl border border-border">
                    <span className="text-text-faint font-bold block uppercase tracking-wider text-[10px]">Wcześniejsza spłata / Nadpłata</span>
                    <span className="font-bold text-text-main">0% prowizji po 36 mies. (obecnie bezpłatna)</span>
                  </div>

                  <div className="p-3 bg-surface-2/60 rounded-xl border border-border">
                    <span className="text-text-faint font-bold block uppercase tracking-wider text-[10px]">Ubezpieczenie pomostowe / Nieruchomości</span>
                    <span className="font-bold text-text-main">48,00 zł / miesięcznie (PZU)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-border flex items-center justify-between gap-3 bg-surface-2/20 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main rounded-xl hover:bg-surface-2 transition cursor-pointer"
            >
              Zamknij
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenOverpaymentModal?.(debt)}
                className="px-4 py-2 bg-brand-subtle text-brand hover:bg-brand-subtle/80 text-xs font-bold rounded-xl border border-brand/20 transition cursor-pointer"
              >
                Przelicz nadpłatę
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-text-inverse text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                Gotowe
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
