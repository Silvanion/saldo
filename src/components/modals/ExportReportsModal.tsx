import React, { useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  FileText,
  FileSpreadsheet,
  Database,
  Download,
  Share2,
  Filter,
  TrendingUp,
  TrendingDown,
  Scale,
  Percent,
  ShieldCheck,
  CreditCard,
  PieChart
} from "lucide-react";
import { Profile } from "../../types";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import {
  getMonthName,
  formatMoney,
  generateCsvContent,
  generateBudgetCsvContent,
  generateDebtsCsvContent,
  downloadFile,
  shareOrDownloadBlob
} from "../../utils";

export interface ExportReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: Profile;
  initialTab?: "pdf" | "csv" | "backup";
  onExportData?: () => void;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
}

export function ExportReportsModal({
  isOpen,
  onClose,
  activeProfile,
  initialTab = "pdf",
  onExportData,
  showToast
}: ExportReportsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const [activeTab, setActiveTab] = useState<"pdf" | "csv" | "backup">(initialTab);

  // PDF state
  const currentDate = useMemo(() => new Date(), []);
  const [reportType, setReportType] = useState<"monthly" | "annual">("monthly");
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // CSV state
  const [csvDataType, setCsvDataType] = useState<"transactions" | "budget" | "debts">("transactions");
  const [txDateScope, setTxDateScope] = useState<"all" | "current_month" | "current_year" | "prev_year">("all");
  const [txTypeFilter, setTxTypeFilter] = useState<"all" | "expense" | "income">("all");
  const [txAccountFilter, setTxAccountFilter] = useState<string>("all");

  const [budgetCsvYear, setBudgetCsvYear] = useState<number>(currentDate.getFullYear());
  const [budgetCsvMonth, setBudgetCsvMonth] = useState<number>(currentDate.getMonth());

  // Available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentDate.getFullYear());
    years.add(currentDate.getFullYear() - 1);
    (activeProfile.transactions || []).forEach((t) => {
      if (t.isoDate) {
        const y = new Date(`${t.isoDate}T12:00:00`).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [activeProfile.transactions, currentDate]);

  // Available accounts
  const availableAccounts = useMemo(() => {
    return activeProfile.accounts || [];
  }, [activeProfile.accounts]);

  // Calculations for PDF preview
  const pdfPeriodStats = useMemo(() => {
    const txs = (activeProfile.transactions || []).filter((t) => {
      if (!t.isoDate) return false;
      const d = new Date(`${t.isoDate}T12:00:00`);
      if (d.getFullYear() !== selectedYear) return false;
      if (reportType === "monthly" && d.getMonth() !== selectedMonth) return false;
      return true;
    });

    const income = txs
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const expense = txs
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const balance = income - expense;
    const savingsRate = income > 0 ? (balance / income) * 100 : 0;

    return {
      count: txs.length,
      income,
      expense,
      balance,
      savingsRate
    };
  }, [activeProfile.transactions, selectedYear, selectedMonth, reportType]);

  // Filtered transactions for CSV export preview
  const filteredCsvTransactions = useMemo(() => {
    return (activeProfile.transactions || []).filter((t) => {
      if (!t.isoDate) return false;
      const d = new Date(`${t.isoDate}T12:00:00`);
      const y = d.getFullYear();
      const m = d.getMonth();

      if (txDateScope === "current_month") {
        if (y !== currentDate.getFullYear() || m !== currentDate.getMonth()) return false;
      } else if (txDateScope === "current_year") {
        if (y !== currentDate.getFullYear()) return false;
      } else if (txDateScope === "prev_year") {
        if (y !== currentDate.getFullYear() - 1) return false;
      }

      if (txTypeFilter !== "all" && t.type !== txTypeFilter) {
        return false;
      }

      if (txAccountFilter !== "all" && t.account !== txAccountFilter) {
        return false;
      }

      return true;
    });
  }, [activeProfile.transactions, txDateScope, txTypeFilter, txAccountFilter, currentDate]);

  // Handler for PDF Download
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const { generateReportPdf, generateAnnualReportPdf } = await import("../../services/pdfGenerator");
      if (reportType === "monthly") {
        generateReportPdf(activeProfile, selectedYear, selectedMonth, activeProfile.currency || "PLN");
      } else {
        generateAnnualReportPdf(activeProfile, selectedYear, activeProfile.currency || "PLN");
      }
      showToast?.("Raport PDF został pobrany", "success");
    } catch (err) {
      console.error("PDF generation failed:", err);
      showToast?.("Nie udało się wygenerować raportu PDF", "error");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handler for PDF Share
  const handleSharePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const { generateReportPdf, generateAnnualReportPdf } = await import("../../services/pdfGenerator");
      let blob: Blob | void;
      let filename = "";
      let title = "";

      if (reportType === "monthly") {
        const monthName = getMonthName(selectedMonth);
        filename = `Raport_Saldo_${monthName}_${selectedYear}.pdf`;
        title = `Raport Finansowy Saldo: ${monthName} ${selectedYear}`;
        blob = generateReportPdf(activeProfile, selectedYear, selectedMonth, activeProfile.currency || "PLN", {
          returnBlob: true
        });
      } else {
        filename = `Roczne_Podsumowanie_Saldo_${selectedYear}.pdf`;
        title = `Roczne Podsumowanie Saldo ${selectedYear}`;
        blob = generateAnnualReportPdf(activeProfile, selectedYear, activeProfile.currency || "PLN", {
          returnBlob: true
        });
      }

      if (blob instanceof Blob) {
        const result = await shareOrDownloadBlob(blob, filename, title);
        if (result.shared) {
          showToast?.("Raport został pomyślnie udostępniony", "success");
        } else {
          showToast?.("Raport został pobrany na dysk", "success");
        }
      }
    } catch (err) {
      console.error("PDF sharing failed:", err);
      showToast?.("Nie udało się udostępnić raportu", "error");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handler for CSV Export
  const handleDownloadCsv = () => {
    try {
      if (csvDataType === "transactions") {
        const content = generateCsvContent(filteredCsvTransactions);
        const filename = `transakcje_saldo_${new Date().toISOString().slice(0, 10)}.csv`;
        downloadFile(content, filename, "text/csv;charset=utf-8;");
        showToast?.(`Wyeksportowano ${filteredCsvTransactions.length} transakcji do CSV`, "success");
      } else if (csvDataType === "budget") {
        const content = generateBudgetCsvContent(activeProfile, budgetCsvYear, budgetCsvMonth);
        const monthName = getMonthName(budgetCsvMonth);
        const filename = `budzet_saldo_${monthName}_${budgetCsvYear}.csv`;
        downloadFile(content, filename, "text/csv;charset=utf-8;");
        showToast?.(`Wyeksportowano budżet za ${monthName} ${budgetCsvYear} do CSV`, "success");
      } else if (csvDataType === "debts") {
        const debts = activeProfile.debts || [];
        const content = generateDebtsCsvContent(debts, activeProfile.currency || "PLN");
        const filename = `zobowiazania_saldo_${new Date().toISOString().slice(0, 10)}.csv`;
        downloadFile(content, filename, "text/csv;charset=utf-8;");
        showToast?.(`Wyeksportowano ${debts.length} zobowiązań do CSV`, "success");
      }
    } catch (err) {
      console.error("CSV export failed:", err);
      showToast?.("Wystąpił błąd podczas generowania pliku CSV", "error");
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.15 }}
          className="bg-surface border border-border/70 w-full max-w-2xl rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[90vh]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-reports-title"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-border/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 id="export-reports-title" className="text-base sm:text-lg font-bold text-text-main">
                  Centrum Raportów i Eksportu
                </h2>
                <p className="text-xs text-text-muted">
                  Generuj czytelne zestawienia PDF, pobieraj pliki CSV lub twórz kopię zapasową.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2 text-text-muted hover:text-text-main hover:bg-surface-hover rounded-full transition flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
              aria-label="Zamknij okno raportów"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab navigation pills */}
          <div className="px-5 sm:px-6 pt-4 pb-2 border-b border-border/50 shrink-0 bg-surface">
            <div className="grid grid-cols-3 gap-2 p-1 bg-surface-hover/80 rounded-2xl border border-border/40">
              <button
                type="button"
                onClick={() => setActiveTab("pdf")}
                className={`min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
                  activeTab === "pdf"
                    ? "bg-surface text-brand shadow-xs border border-border/60"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Raporty PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("csv")}
                className={`min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
                  activeTab === "csv"
                    ? "bg-surface text-brand shadow-xs border border-border/60"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Eksporty CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("backup")}
                className={`min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
                  activeTab === "backup"
                    ? "bg-surface text-brand shadow-xs border border-border/60"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Kopia bazy</span>
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {/* TAB 1: RAPORTY PDF */}
            {activeTab === "pdf" && (
              <div className="space-y-5">
                {/* Typ raportu: Miesięczny vs Roczny */}
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
                    Zakres raportu PDF
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReportType("monthly")}
                      className={`min-h-[44px] p-3 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
                        reportType === "monthly"
                          ? "border-brand bg-brand/5 ring-1 ring-brand/20"
                          : "border-border hover:bg-surface-hover"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          reportType === "monthly" ? "border-brand bg-brand" : "border-text-muted"
                        }`}
                      >
                        {reportType === "monthly" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-main">Miesięczny raport</div>
                        <div className="text-[11px] text-text-muted">Szczegółowa lista i bilans miesiąca</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportType("annual")}
                      className={`min-h-[44px] p-3 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
                        reportType === "annual"
                          ? "border-brand bg-brand/5 ring-1 ring-brand/20"
                          : "border-border hover:bg-surface-hover"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          reportType === "annual" ? "border-brand bg-brand" : "border-text-muted"
                        }`}
                      >
                        {reportType === "annual" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-main">Roczne podsumowanie</div>
                        <div className="text-[11px] text-text-muted">12 miesięcy, kategorie, cele i majątek</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Selektory daty */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-surface-hover/40 border border-border/60 rounded-2xl">
                  <div>
                    <label className="text-xs font-medium text-text-muted block mb-1.5">
                      Rok obrachunkowy
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-full min-h-[44px] px-3 py-2 bg-surface border border-border rounded-xl text-xs font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none cursor-pointer"
                    >
                      {availableYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  {reportType === "monthly" && (
                    <div>
                      <label className="text-xs font-medium text-text-muted block mb-1.5">
                        Miesiąc
                      </label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="w-full min-h-[44px] px-3 py-2 bg-surface border border-border rounded-xl text-xs font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none cursor-pointer"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i}>
                            {getMonthName(i)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Live KPI Preview */}
                <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-main flex items-center gap-1.5">
                      <PieChart className="w-4 h-4 text-brand" />
                      Podgląd danych do raportu
                    </span>
                    <span className="text-[11px] font-medium text-text-muted">
                      {pdfPeriodStats.count} {pdfPeriodStats.count === 1 ? "transakcja" : "transakcji"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-xl bg-income/5 border border-income/20">
                      <div className="text-[11px] font-medium text-income flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Przychody
                      </div>
                      <div className="text-xs font-bold text-income mt-1">
                        {formatMoney(pdfPeriodStats.income, activeProfile.currency || "PLN")}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-expense/5 border border-expense/20">
                      <div className="text-[11px] font-medium text-expense flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        Wydatki
                      </div>
                      <div className="text-xs font-bold text-expense mt-1">
                        {formatMoney(pdfPeriodStats.expense, activeProfile.currency || "PLN")}
                      </div>
                    </div>

                    <div
                      className={`p-2.5 rounded-xl border ${
                        pdfPeriodStats.balance >= 0
                          ? "bg-brand/5 border-brand/20 text-brand"
                          : "bg-expense/5 border-expense/20 text-expense"
                      }`}
                    >
                      <div className="text-[11px] font-medium flex items-center gap-1">
                        <Scale className="w-3 h-3" />
                        Bilans
                      </div>
                      <div className="text-xs font-bold mt-1">
                        {formatMoney(pdfPeriodStats.balance, activeProfile.currency || "PLN")}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-hover/80 border border-border text-text-main">
                      <div className="text-[11px] font-medium text-text-muted flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        Stopa oszcz.
                      </div>
                      <div className="text-xs font-bold mt-1">
                        {pdfPeriodStats.savingsRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* PDF Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="w-full sm:flex-1 min-h-[44px] px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isGeneratingPdf ? "Generowanie raportu..." : "Pobierz raport PDF"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSharePdf}
                    disabled={isGeneratingPdf}
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-surface-hover hover:bg-surface-hover/80 text-text-main border border-border rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                  >
                    <Share2 className="w-4 h-4 text-brand" />
                    <span>Udostępnij</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: EKSPORTY CSV */}
            {activeTab === "csv" && (
              <div className="space-y-5">
                {/* Typ zestawu danych CSV */}
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-2">
                    Wybierz zbiór danych do eksportu CSV
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setCsvDataType("transactions")}
                      className={`min-h-[44px] p-3 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
                        csvDataType === "transactions"
                          ? "border-brand bg-brand/5 ring-1 ring-brand/20"
                          : "border-border hover:bg-surface-hover"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          csvDataType === "transactions" ? "border-brand bg-brand" : "border-text-muted"
                        }`}
                      >
                        {csvDataType === "transactions" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-main">Transakcje</div>
                        <div className="text-[11px] text-text-muted">Historia wpisów z filtrami</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCsvDataType("budget")}
                      className={`min-h-[44px] p-3 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
                        csvDataType === "budget"
                          ? "border-brand bg-brand/5 ring-1 ring-brand/20"
                          : "border-border hover:bg-surface-hover"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          csvDataType === "budget" ? "border-brand bg-brand" : "border-text-muted"
                        }`}
                      >
                        {csvDataType === "budget" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-main">Budżet</div>
                        <div className="text-[11px] text-text-muted">Limity i wykonanie</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCsvDataType("debts")}
                      className={`min-h-[44px] p-3 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98] ${
                        csvDataType === "debts"
                          ? "border-brand bg-brand/5 ring-1 ring-brand/20"
                          : "border-border hover:bg-surface-hover"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          csvDataType === "debts" ? "border-brand bg-brand" : "border-text-muted"
                        }`}
                      >
                        {csvDataType === "debts" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-main">Kredyty</div>
                        <div className="text-[11px] text-text-muted">Portfel zadłużenia</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Filtry dla transakcji */}
                {csvDataType === "transactions" && (
                  <div className="p-4 bg-surface-hover/40 border border-border/60 rounded-2xl space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-text-main">
                      <Filter className="w-3.5 h-3.5 text-brand" />
                      Filtry eksportu transakcji
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-text-muted block mb-1">
                          Zakres czasowy
                        </label>
                        <select
                          value={txDateScope}
                          onChange={(e) => setTxDateScope(e.target.value as any)}
                          className="w-full min-h-[44px] px-3 py-2 bg-surface border border-border rounded-xl text-xs font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none cursor-pointer"
                        >
                          <option value="all">Wszystkie transakcje</option>
                          <option value="current_month">Bieżący miesiąc</option>
                          <option value="current_year">Bieżący rok</option>
                          <option value="prev_year">Poprzedni rok</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-text-muted block mb-1">
                          Rodzaj przepływu
                        </label>
                        <select
                          value={txTypeFilter}
                          onChange={(e) => setTxTypeFilter(e.target.value as any)}
                          className="w-full min-h-[44px] px-3 py-2 bg-surface border border-border rounded-xl text-xs font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none cursor-pointer"
                        >
                          <option value="all">Wszystkie rodzaje</option>
                          <option value="expense">Tylko wydatki</option>
                          <option value="income">Tylko przychody</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-text-muted block mb-1">
                          Rachunek / Konto
                        </label>
                        <select
                          value={txAccountFilter}
                          onChange={(e) => setTxAccountFilter(e.target.value)}
                          className="w-full min-h-[44px] px-3 py-2 bg-surface border border-border rounded-xl text-xs font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none cursor-pointer"
                        >
                          <option value="all">Wszystkie konta</option>
                          {availableAccounts.map((acc) => (
                            <option key={acc.id} value={acc.name}>
                              {acc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 text-xs text-text-muted flex items-center justify-between border-t border-border/40">
                      <span>Liczba rekordów do eksportu:</span>
                      <span className="font-bold text-text-main">
                        {filteredCsvTransactions.length} wpisów
                      </span>
                    </div>
                  </div>
                )}

                {/* Filtry dla budżetu */}
                {csvDataType === "budget" && (
                  <div className="p-4 bg-surface-hover/40 border border-border/60 rounded-2xl space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-text-muted block mb-1">
                          Rok budżetowy
                        </label>
                        <select
                          value={budgetCsvYear}
                          onChange={(e) => setBudgetCsvYear(Number(e.target.value))}
                          className="w-full min-h-[44px] px-3 py-2 bg-surface border border-border rounded-xl text-xs font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none cursor-pointer"
                        >
                          {availableYears.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-text-muted block mb-1">
                          Miesiąc
                        </label>
                        <select
                          value={budgetCsvMonth}
                          onChange={(e) => setBudgetCsvMonth(Number(e.target.value))}
                          className="w-full min-h-[44px] px-3 py-2 bg-surface border border-border rounded-xl text-xs font-semibold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none cursor-pointer"
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i} value={i}>
                              {getMonthName(i)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 text-xs text-text-muted flex items-center justify-between border-t border-border/40">
                      <span>Skonfigurowane kategorie budżetowe:</span>
                      <span className="font-bold text-text-main">
                        {Object.keys(activeProfile.budgets || {}).length} kategorii
                      </span>
                    </div>
                  </div>
                )}

                {/* Informacja dla kredytów */}
                {csvDataType === "debts" && (
                  <div className="p-4 bg-surface-hover/40 border border-border/60 rounded-2xl space-y-2">
                    <div className="text-xs font-bold text-text-main flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-brand" />
                      Portfel zobowiązań kredytowych
                    </div>
                    <p className="text-xs text-text-muted">
                      Eksport obejmuje pełną listę aktywnych i spłaconych kredytów, aktualne saldo,
                      wysokość raty, oprocentowanie oraz liczbę pozostałych miesięcy.
                    </p>
                    <div className="pt-2 text-xs text-text-muted flex items-center justify-between border-t border-border/40">
                      <span>Liczba zobowiązań w portfelu:</span>
                      <span className="font-bold text-text-main">
                        {(activeProfile.debts || []).length} pozycji
                      </span>
                    </div>
                  </div>
                )}

                {/* CSV Actions */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    className="w-full min-h-[44px] px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Pobierz plik CSV</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: KOPIA BAZY DANYCH */}
            {activeTab === "backup" && (
              <div className="space-y-5">
                <div className="p-5 rounded-xl bg-brand/5 border border-brand/20 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center shrink-0">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-text-main">
                        Pełna kopia zapasowa JSON
                      </h3>
                      <p className="text-[11px] text-text-muted">
                        Zawiera całą bazę Saldo: profile, historię, cele, kredyty i ustawienia.
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-text-muted leading-relaxed">
                    Plik JSON umożliwia natychmiastowe przeniesienie Twojej bazy danych na inny
                    komputer, smartfon lub przywrócenie w razie wyczyszczenia pamięci przeglądarki.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      onExportData?.();
                      showToast?.("Kopia zapasowa JSON została wygenerowana", "success");
                    }}
                    className="min-h-[44px] px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Pobierz pełną kopię zapasową (.json)</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl border border-border/80 bg-surface flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-income shrink-0 mt-0.5" />
                  <div className="text-xs text-text-muted leading-relaxed">
                    <strong className="text-text-main block mb-0.5">
                      Prywatność i bezpieczeństwo na 1. miejscu
                    </strong>
                    Twoje dane finansowe są przetwarzane i przechowywane w 100% lokalnie na Twoim
                    urządzeniu. Żadne informacje nie trafiają na zewnętrzne serwery.
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
