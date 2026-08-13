
import { formatMoney } from "../utils/format";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { callAiApi, getAiConfig } from "../services/aiClient";
import { useApp } from "../app/providers/AppContext";
import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { Transaction } from "../types";
import { expenseCategories, incomeCategories, iconByCategory, getLocalDateIso } from "../utils";
import { UploadCloud, FileText, Sparkles, Loader2, FileSpreadsheet, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { DelayedTooltip } from "./dashboard/DelayedTooltip";
import { checkDuplicate } from "../services/duplicateDetector";
import {
  BANK_PRESETS,
  BankPreset,
  parseAndMapCsv,
  autoDetectBankColumns,
  cleanCsvBomAndEncoding,
  detectCsvSeparator
} from "../services/parseCsv";

interface ImportTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transactions: Transaction[]) => void;
  onBeforeImport?: () => void;
}

export function ImportTransactionsModal({ isOpen, onClose, onImport, onBeforeImport }: ImportTransactionsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);
  const { state, activeProfile } = useApp();
  const isAiAvailable = state.aiMode !== "none";
  const [tab, setTab] = useState<"csv" | "ai">("csv");
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Input, 2: Mapping, 3: Preview

  // CSV State
  const [selectedPresetId, setSelectedPresetId] = useState<BankPreset["id"]>("generic");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [detectedDelimiter, setDetectedDelimiter] = useState<string>(";");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mapping state
  const [mapName, setMapName] = useState("");
  const [mapAmount, setMapAmount] = useState("");
  const [mapDate, setMapDate] = useState("");
  const [mapCategory, setMapCategory] = useState("");
  const [defaultCategory, setDefaultCategory] = useState("Inne");
  const [defaultAccount, setDefaultAccount] = useState("Konto główne");
  const [typeStrategy, setTypeStrategy] = useState<"auto" | "expense" | "income">("auto");

  // AI State
  const [aiText, setAiText] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiError, setAiError] = useState("");

  const [mappedTransactions, setMappedTransactions] = useState<Transaction[]>([]);
  const [importStats, setImportStats] = useState({
    invalidAmount: 0,
    invalidDate: 0,
    skippedEmpty: 0,
    tooMany: false
  });

  const duplicateAnalysis = React.useMemo(() => {
    const existing = activeProfile?.transactions || [];
    let duplicateCount = 0;
    const enriched = mappedTransactions.map((tx) => {
      const res = checkDuplicate(tx, existing);
      if (res.isLikelyDuplicate) duplicateCount++;
      return { tx, warning: res.isLikelyDuplicate ? res : null };
    });
    return { enriched, duplicateCount };
  }, [mappedTransactions, activeProfile]);

  if (!isOpen) return null;

  const processRawCsvString = (text: string, name: string = "Wklejony tekst CSV") => {
    setFileName(name);
    setCsvText(text);

    const cleaned = cleanCsvBomAndEncoding(text);
    const result = parseAndMapCsv({
      rawCsvText: cleaned,
      presetId: selectedPresetId,
      rules: activeProfile?.transactionRules || []
    });

    setHeaders(result.headers);
    setParsedRows(result.parsedRows);
    setDetectedDelimiter(result.detectedSeparator);

    const autoCols = autoDetectBankColumns(result.headers, selectedPresetId);
    setMapName(autoCols.mapName);
    setMapAmount(autoCols.mapAmount);
    setMapDate(autoCols.mapDate);
    setMapCategory(autoCols.mapCategory);

    setStep(2);
  };

  // --- CSV Handlers ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processRawCsvString(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleGenerateCsvPreview = () => {
    const result = parseAndMapCsv({
      rawCsvText: csvText,
      presetId: selectedPresetId,
      mapName,
      mapAmount,
      mapDate,
      mapCategory,
      defaultCategory,
      defaultAccount,
      typeStrategy,
      rules: activeProfile?.transactionRules || []
    });

    setMappedTransactions(result.transactions);
    setImportStats({
      invalidAmount: result.stats.invalidAmountCount,
      invalidDate: result.stats.invalidDateCount,
      skippedEmpty: result.stats.skippedEmptyCount,
      tooMany: result.transactions.length >= 2000
    });
    setStep(3);
  };

  // --- AI Handlers ---
  const handleAiProcess = async () => {
    if (!aiText.trim()) return;
    setIsAiProcessing(true);
    setAiError("");
    try {
      const data = await callAiApi("parse-statement", { text: aiText, currentDate: getLocalDateIso() }, getAiConfig(state));

      const processed: Transaction[] = (data.transactions || []).map((t: any) => ({
        id: "tx-ai-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        name: t.name || "Nieznana transakcja",
        amount: t.amount || 0,
        type: t.type === "income" ? "income" : "expense",
        isoDate: t.isoDate || getLocalDateIso(),
        category: t.category || defaultCategory,
        categoryIcon: iconByCategory[t.category] || "✨",
        account: t.account || defaultAccount
      }));

      setMappedTransactions(processed);
      setStep(3);
    } catch (err: any) {
      setAiError(err.message || "Wystąpił problem podczas przetwarzania tekstu.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleConfirmImport = (skipDuplicates = false) => {
    if (onBeforeImport) onBeforeImport();
    if (skipDuplicates) {
      onImport(duplicateAnalysis.enriched.filter((item) => !item.warning).map((item) => item.tx));
    } else {
      onImport(mappedTransactions);
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-bg-base/40 backdrop-blur-xs"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="bg-bg-base/95 backdrop-blur-2xl rounded-2xl shadow-sm w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
       ref={modalRef}>
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-bg-base/95 backdrop-blur-2xl sticky top-0 z-20">
          <div>
            <h2 id="import-modal-title" className="text-lg font-black text-text-main tracking-tight flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-brand" />
              Import historii transakcji bankowych
            </h2>
            <p className="text-xs text-text-muted font-medium">Szybki import historii z wyciągów bankowych (.csv) z podglądem i detekcją duplikatów.</p>
          </div>
          <button onClick={onClose} aria-label="Zamknij" className="text-text-muted hover:text-text-main hover:bg-surface-offset p-2 rounded-full transition-colors active:scale-95 shrink-0 w-10 h-10 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-focus-ring">
            &times;
          </button>
        </div>

        {/* TABS */}
        {step === 1 && isAiAvailable && (
          <div className="flex border-b border-border">
            <button
              onClick={() => setTab("csv")}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset ${
                tab === "csv" ? "text-brand border-b-2 border-brand bg-brand-surface" : "text-text-muted hover:bg-surface"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" /> Wgraj / wklej plik CSV (Darmowe)
            </button>
            <button
              onClick={() => setTab("ai")}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset ${
                tab === "ai" ? "text-brand border-b-2 border-brand bg-brand-surface" : "text-text-muted hover:bg-surface"
              }`}
            >
              <Sparkles className="w-4 h-4" /> Analiza tekstu (AI)
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar min-w-0">
          {step === 1 && tab === "ai" && isAiAvailable && (
            <div className="space-y-4">
              <div className="bg-brand-subtle p-4 rounded-xl border border-brand/20">
                <p className="text-sm text-brand font-medium mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> <strong>Analiza tekstu za pomocą AI</strong>
                </p>
                <p className="text-xs text-text-muted leading-relaxed">
                  Skopiuj surowy tekst wyciągu ze strony banku lub maila i wklej go poniżej. Model AI wyciągnie kwoty i daty, a szybka automatyzacja przypisze kategorie w tle.
                </p>
              </div>
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder="Wklej historię transakcji z banku tutaj..."
                className="w-full h-48 p-4 border border-border rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-focus-ring resize-none transition-colors"
              ></textarea>
              {aiError && <p className="text-danger text-xs font-semibold">{aiError}</p>}
              <button
                onClick={handleAiProcess}
                disabled={isAiProcessing || !aiText.trim()}
                className="w-full bg-brand text-text-inverse font-bold py-3 px-6 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex justify-center items-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                {isAiProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {isAiProcessing ? "Analizowanie..." : "Analizuj transakcje AI"}
              </button>
            </div>
          )}

          {step === 1 && tab === "csv" && (
            <div className="space-y-5">
              {/* Presets Selection Bar (Task D1 #1) */}
              <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
                <label className="text-xs font-semibold text-text-main block">
                  1. Wybierz preset bankowy
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {BANK_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`p-3 rounded-xl border transition-all active:scale-[0.98] flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-focus-ring ${
                        selectedPresetId === preset.id
                          ? "border-brand bg-brand-subtle shadow-sm ring-1 ring-brand"
                          : "border-border bg-bg-base/95 backdrop-blur-2xl hover:border-border hover:bg-surface-2"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-text-main">{preset.name}</span>
                        {selectedPresetId === preset.id && <CheckCircle2 className="w-4 h-4 text-brand" />}
                      </div>
                      <span className="text-xs text-text-muted mt-1">{preset.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Encoding & Security note (Task D1 #2 & #7) */}
              <div className="bg-brand-subtle p-3.5 rounded-xl border border-brand/20 flex items-start gap-2.5 text-xs text-text-main">
                <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-text-main">Bezpieczny lokalny import (UTF-8 / Windows-1250)</p>
                  <p className="text-xs text-text-muted">
                    Oczyszczanie nagłówków z znaku BOM jest automatyczne. Dane są przetwarzane wyłącznie lokalnie w przeglądarce i nie opuszczają Twojego urządzenia.
                  </p>
                </div>
              </div>

              {/* Drag & Drop File */}
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                  dragActive ? "border-brand bg-brand-surface" : "border-border bg-surface"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <FileText className={`w-8 h-8 mx-auto mb-2 ${dragActive ? "text-brand" : "text-text-muted"}`} />
                <p className="text-xs font-semibold text-text-main mb-0.5">2. Przeciągnij i upuść plik CSV z banku</p>
                <p className="text-xs text-text-muted mb-3">lub kliknij przycisk, aby wybrać plik .csv z komputera</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-surface border border-border text-text-main hover:bg-surface-2 active:scale-[0.98] transition-all font-bold py-2 px-5 rounded-xl text-xs shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  Wybierz plik .csv
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-4 text-xs font-medium text-text-muted">albo wklej zawartość pliku CSV</span>
                <div className="flex-grow border-t border-border"></div>
              </div>

              <div className="space-y-2">
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Tutaj możesz wkleić skopiowane wiersze z pliku CSV (np. z nagłówkiem: Data;Kwota;Tytuł)..."
                  className="w-full h-28 p-3 border border-border rounded-xl text-xs font-mono focus-visible:ring-2 focus-visible:ring-focus-ring resize-none transition-colors"
                ></textarea>
                <button
                  onClick={() => processRawCsvString(csvText, "Wklejony tekst CSV")}
                  disabled={!csvText.trim()}
                  className="w-full bg-brand text-text-inverse font-bold py-2.5 px-4 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-xs text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  Przetwórz wklejony tekst CSV &rarr;
                </button>
              </div>
            </div>
          )}

          {step === 2 && tab === "csv" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-bold text-text-main">Mapowanie kolumn z {fileName}</h3>
                <span className="text-xs font-mono bg-surface-2 text-text-muted px-2.5 py-1 rounded-md">
                  Wykryty separator: <strong className="text-text-main">&quot;{detectedDelimiter}&quot;</strong>
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-muted">Kolumna tytułu/nazwy</label>
                  <select value={mapName} onChange={(e) => setMapName(e.target.value)} className="w-full text-xs rounded-xl border border-border p-2 focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors">
                    <option value="">-- Wybierz --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-muted">Kolumna kwoty</label>
                  <select value={mapAmount} onChange={(e) => setMapAmount(e.target.value)} className="w-full text-xs rounded-xl border border-border p-2 focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors">
                    <option value="">-- Wybierz --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-muted">Kolumna daty</label>
                  <select value={mapDate} onChange={(e) => setMapDate(e.target.value)} className="w-full text-xs rounded-xl border border-border p-2 focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors">
                    <option value="">-- Wybierz --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-muted">Kategoria domyślna</label>
                  <select value={defaultCategory} onChange={(e) => setDefaultCategory(e.target.value)} className="w-full text-xs rounded-xl border border-border p-2 focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors">
                    {expenseCategories.concat(incomeCategories).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Categorization Rules Notice */}
              {activeProfile?.transactionRules && activeProfile.transactionRules.length > 0 && (
                <p className="text-xs text-text-main bg-surface-2 border border-border p-2.5 rounded-xl">
                  ✨ Szybka automatyzacja przypisze kategorie w tle (wykryto <strong>{activeProfile.transactionRules.length} zapisanych reguł</strong>).
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button onClick={() => setStep(1)} className="bg-transparent text-text-muted hover:text-text-main hover:bg-surface-offset active:scale-[0.98] transition-colors rounded-xl px-4 py-2 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-focus-ring">
                  Wstecz
                </button>
                <button onClick={handleGenerateCsvPreview} className="bg-brand text-text-inverse font-bold py-2 px-5 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all text-xs focus-visible:ring-2 focus-visible:ring-focus-ring">
                  Generuj podgląd &rarr;
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 flex flex-col flex-1 overflow-hidden">
              {(importStats.invalidAmount > 0 || importStats.invalidDate > 0 || importStats.skippedEmpty > 0 || importStats.tooMany) && (
                <div className="bg-danger-subtle px-4 py-3 rounded-xl border border-danger/20 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-danger">Podsumowanie problemów z parsowaniem pliku:</h4>
                    <ul className="list-disc list-inside text-xs text-text-muted mt-1 space-y-0.5">
                      {importStats.tooMany && <li>Osiągnięto limit 2000 transakcji. Pozostałe zostały zignorowane.</li>}
                      {importStats.invalidAmount > 0 && <li>Odrzucono {importStats.invalidAmount} wierszy ze względu na nieprawidłową kwotę (NaN lub 0).</li>}
                      {importStats.invalidDate > 0 && <li>Odrzucono {importStats.invalidDate} wierszy ze względu na nieprawidłowy/pusty format daty.</li>}
                      {importStats.skippedEmpty > 0 && <li>Pominięto {importStats.skippedEmpty} pustych/komentarzowych wierszy.</li>}
                    </ul>
                  </div>
                </div>
              )}

              <div className="bg-brand-subtle px-4 py-3 rounded-xl border border-brand/20 flex items-center justify-between">
                <span className="text-xs font-semibold text-brand">
                  Nowe transakcje gotowe do zaimportowania: <strong className="text-xl font-extrabold">{mappedTransactions.length}</strong>
                </span>
                <button onClick={() => setStep(tab === "csv" ? 2 : 1)} className="text-xs text-brand hover:text-brand-hover hover:underline font-bold transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring">
                  Wróć i popraw
                </button>
              </div>

              {duplicateAnalysis.duplicateCount > 0 && (
                <div className="bg-warning-subtle px-4 py-3 rounded-xl border border-warning/20 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-warning">
                      Wykryto potencjalne duplikaty: {duplicateAnalysis.duplicateCount}
                    </h4>
                    <p className="text-xs text-text-muted mt-0.5">Te transakcje istnieją już w profilu. Są podświetlone poniżej na żółto.</p>
                  </div>
                </div>
              )}

              <div className="overflow-y-auto border border-border rounded-xl flex-1 max-h-[350px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface border-b border-border font-bold text-text-muted sticky top-0 z-10">
                      <th className="py-2.5 px-3">Opis</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Kategoria</th>
                      <th className="py-2.5 px-3">Konto</th>
                      <th className="py-2.5 px-3 text-right">Kwota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-bg-base/95 backdrop-blur-2xl">
                    {duplicateAnalysis.enriched.map(({ tx, warning }, idx) => (
                      <tr key={idx} className={`transition-colors ${warning ? "bg-warning-subtle hover:bg-warning-subtle/80" : "hover:bg-surface"}`}>
                        <td className="py-2 px-3">
                          <div className="font-bold text-text-main flex items-center gap-1.5 min-w-0">
                            {warning && (
                              <DelayedTooltip label={warning.reason}>
                                <AlertTriangle className="w-3 h-3 text-warning shrink-0" />
                              </DelayedTooltip>
                            )}
                            <span className="truncate block max-w-[150px] sm:max-w-xs" title={tx.name}>{tx.name}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-text-muted whitespace-nowrap">{tx.isoDate}</td>
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center gap-1 bg-surface-2 border border-border px-2 py-0.5 rounded-full text-xs">
                            <span>{tx.categoryIcon}</span>
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-text-muted">{tx.account}</td>
                        <td className={`py-2 px-3 text-right font-bold ${tx.type === "income" ? "text-brand" : "text-danger"}`}>
                          {tx.type === "income" ? "+" : "-"} {formatMoney(tx.amount, tx.currency || state?.currencyPreference || "PLN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                {duplicateAnalysis.duplicateCount > 0 && (
                  <button
                    onClick={() => handleConfirmImport(true)}
                    className="bg-surface border border-border text-text-main font-bold py-3 px-5 rounded-xl hover:bg-surface-2 active:scale-[0.98] transition-all text-xs focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    Pomiń duplikaty ({mappedTransactions.length - duplicateAnalysis.duplicateCount}) i importuj
                  </button>
                )}
                <button
                  onClick={() => handleConfirmImport(false)}
                  className="bg-brand text-text-inverse font-bold py-3 px-8 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-md text-xs focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  ✓ Zaimportuj wszystko ({mappedTransactions.length})
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
