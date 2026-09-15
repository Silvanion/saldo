
import { formatMoney } from "../utils/format";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { callAiApi, getAiConfig } from "../services/aiClient";
import { parseStatementText } from "../services/localParsers";
import { resolveLocalAiConfig, extractTransactionsWithLocalAi, categorizeDescriptionsWithLocalAi } from "../services/localAi";
import { useApp } from "../app/providers/AppContext";
import { createPortal } from "react-dom";
import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { SupportedCurrency, Transaction } from "../types";
import { expenseCategories, incomeCategories, iconByCategory, getLocalDateIso } from "../utils";
import {
  UploadCloud,
  FileText,
  Loader2,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Globe,
  Check,
  Cpu,
  Sparkles
} from "lucide-react";
import { DelayedTooltip } from "./dashboard/DelayedTooltip";
import { checkDuplicate, DuplicateCheckResult } from "../services/duplicateDetector";
import {
  BANK_PRESETS,
  BankPreset,
  parseAndMapCsv,
  autoDetectBankColumns,
  cleanCsvBomAndEncoding,
  detectCsvSeparator,
  RejectedCsvRow
} from "../services/parseCsv";
import { extractPdfText, renderPdfPages, parsePdfTransactions, normalizeAiPdfTransactions, findPdfDuplicates } from "../services/parsePdf";

interface ImportTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transactions: Transaction[]) => void;
  onBeforeImport?: () => void;
  // Pre-supplied file (dropped on the OS window/Dock icon, or opened via
  // "Open with Saldo") to process automatically as soon as the modal mounts,
  // instead of waiting for the user to pick/drop a file in the dropzone.
  initialFile?: File | null;
  onConsumeInitialFile?: () => void;
}

export function ImportTransactionsModal({ isOpen, onClose, onImport, onBeforeImport, initialFile, onConsumeInitialFile }: ImportTransactionsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);
  const { activeProfile, state } = useApp();
  const isLocalAiEnabled = state.aiMode === "local";
  const isAiAvailable = state.aiMode !== "none";
  const [tab, setTab] = useState<"csv" | "text" | "pdf">("csv");
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
  const [mapCurrency, setMapCurrency] = useState("");
  const [defaultCategory, setDefaultCategory] = useState("Inne");
  const [defaultAccount, setDefaultAccount] = useState("Konto główne");
  const [typeStrategy, setTypeStrategy] = useState<"auto" | "expense" | "income">("auto");

  // Stan zakładki "wklej tekst wyciągu"
  const [pastedText, setPastedText] = useState("");
  const [isTextProcessing, setIsTextProcessing] = useState(false);
  const [textError, setTextError] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);

  // Lokalne AI: alternatywna ekstrakcja tekstu + sugestie kategorii w podglądzie
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [isAiCategorizing, setIsAiCategorizing] = useState(false);
  const [aiInconsistentIds, setAiInconsistentIds] = useState<Set<string>>(new Set());

  const [mappedTransactions, setMappedTransactions] = useState<Transaction[]>([]);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [rejectedRows, setRejectedRows] = useState<RejectedCsvRow[]>([]);
  const [detectedCurrencies, setDetectedCurrencies] = useState<Record<SupportedCurrency, number>>({
    PLN: 0,
    EUR: 0,
    USD: 0,
    GBP: 0
  });
  const [showRejectedDetails, setShowRejectedDetails] = useState(false);

  const [importStats, setImportStats] = useState({
    invalidAmount: 0,
    invalidDate: 0,
    skippedEmpty: 0,
    tooMany: false,
    truncated: 0
  });

  // Wynik jednego przebiegu checkDuplicate per transakcja, ustawiany razem z
  // mappedTransactions (patrz scanForDuplicates niżej). Trzymanie tego w stanie zamiast
  // przeliczania w useMemo na podstawie mappedTransactions+activeProfile eliminuje
  // podwójne skanowanie O(n * liczba_istniejących_transakcji) — dawniej ten sam
  // checkDuplicate biegł raz w handlerze (do zaznaczenia domyślnego) i drugi raz tutaj
  // (do wyświetlenia ostrzeżeń), za każdym razem gdy zmieniały się mappedTransactions.
  const [duplicateWarningsByTxId, setDuplicateWarningsByTxId] = useState<Record<string, DuplicateCheckResult>>({});

  const duplicateAnalysis = React.useMemo(() => {
    let duplicateCount = 0;
    const enriched = mappedTransactions.map((tx) => {
      const warning = duplicateWarningsByTxId[tx.id] || null;
      if (warning) duplicateCount++;
      return { tx, warning };
    });
    return { enriched, duplicateCount };
  }, [mappedTransactions, duplicateWarningsByTxId]);

  // Jedyne miejsce, w którym faktycznie biegnie checkDuplicate dla nowego zestawu
  // transakcji z importu. Zwraca zarówno mapę ostrzeżeń (do stanu/UI), jak i zbiór id
  // transakcji NIE będących duplikatami (do domyślnego zaznaczenia) — bez powtórnego skanu.
  const scanForDuplicates = (transactions: Transaction[]) => {
    const existing = activeProfile?.transactions || [];
    const warningsMap: Record<string, DuplicateCheckResult> = {};
    const nonDuplicateIds = new Set<string>();
    for (const tx of transactions) {
      const res = checkDuplicate(tx, existing);
      if (res.isLikelyDuplicate) {
        warningsMap[tx.id] = res;
      } else {
        nonDuplicateIds.add(tx.id);
      }
    }
    return { warningsMap, nonDuplicateIds };
  };

  const uncategorizedCount = React.useMemo(
    () => mappedTransactions.filter((t) => t.category === "Inne").length,
    [mappedTransactions]
  );

  const processRawCsvString = (text: string, name: string = "Wklejony tekst CSV") => {
    setFileName(name);
    setCsvText(text);

    const cleaned = cleanCsvBomAndEncoding(text);
    const result = parseAndMapCsv({
      rawCsvText: cleaned,
      presetId: selectedPresetId,
      currency: activeProfile?.currency || "PLN",
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
    setMapCurrency(autoCols.mapCurrency);

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

  const handleFile = (file: File, targetTab: "csv" | "pdf" = tab === "pdf" ? "pdf" : "csv") => {
    if (targetTab === "pdf") {
      void handlePdfFile(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processRawCsvString(text, file.name);
    };
    reader.readAsText(file);
  };

  // A file supplied from outside the dropzone (OS-level drag & drop onto the
  // window/Dock icon) — process it once, then let the parent clear the
  // signal so re-opening the modal later doesn't reprocess the same file.
  useEffect(() => {
    if (!initialFile) return;
    const targetTab = /\.pdf$/i.test(initialFile.name) ? "pdf" : "csv";
    setTab(targetTab);
    handleFile(initialFile, targetTab);
    onConsumeInitialFile?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  if (!isOpen) return null;

  const handlePdfFile = async (file: File) => {
    setIsPdfProcessing(true);
    setPdfError("");
    setFileName(file.name);
    try {
      const text = await extractPdfText(file);
      if (!text.trim()) {
        if (!isAiAvailable) {
          throw new Error("Ten PDF nie zawiera warstwy tekstowej. Włącz lokalne AI (z modelem vision w Ustawieniach), aby przeanalizować skan.");
        }
        const pages = await renderPdfPages(file);
        if (state.aiMode === "local") {
          const healthResponse = await fetch("/api/ai/health", {
            headers: {
              "x-ai-mode": "local",
              "x-ai-local-endpoint": state.localAiEndpoint || "http://localhost:11434/api/generate",
              ...(state.localAiModel ? { "x-ai-local-model": state.localAiModel } : {})
            }
          });
          const health = await healthResponse.json().catch(() => ({}));
          if (!healthResponse.ok || health.selectedModelVisionAvailable !== true) {
            throw new Error("Wybrany model Ollama nie obsługuje obrazów. Wybierz model multimodalny, np. gemma3:4b, i spróbuj ponownie.");
          }
        }
        const aiResults = [];
        for (const imageBase64 of pages) {
          const data = await callAiApi("parse-statement-image", {
            imageBase64,
            mimeType: "image/png",
            currentDate: getLocalDateIso()
          }, getAiConfig(state));
          aiResults.push(...(data.transactions || []));
        }
        if (!aiResults.length) throw new Error("AI nie rozpoznało transakcji na stronach PDF.");
        const normalized = normalizeAiPdfTransactions(aiResults, {
          currency: activeProfile?.currency || "PLN",
          account: defaultAccount,
          rules: activeProfile?.transactionRules || []
        });
        if (!normalized.transactions.length) {
          throw new Error("AI nie zwróciło żadnej poprawnej transakcji. Sprawdź jakość skanu.");
        }
        const processed = normalized.transactions;
        setMappedTransactions(processed);
        setRejectedRows(normalized.rejectedRows);
        const duplicateIds = findPdfDuplicates(processed, activeProfile?.transactions || []);
        setSelectedTxIds(new Set(processed.filter((transaction) => !duplicateIds.has(transaction.id)).map((transaction) => transaction.id)));
        setImportStats({ invalidAmount: 0, invalidDate: 0, skippedEmpty: 0, tooMany: processed.length >= 2000 });
        setStep(3);
        return;
      }
      const result = parsePdfTransactions(text, {
        currency: activeProfile?.currency || "PLN",
        account: defaultAccount,
        rules: activeProfile?.transactionRules || []
      });
      if (!result.transactions.length) {
        throw new Error("Nie udało się rozpoznać transakcji w PDF. Sprawdź, czy to tekstowy wyciąg bankowy.");
      }
      setMappedTransactions(result.transactions);
      setRejectedRows(result.rejectedRows);
      const duplicateIds = findPdfDuplicates(result.transactions, activeProfile?.transactions || []);
      setSelectedTxIds(new Set(result.transactions
        .filter((transaction) => !duplicateIds.has(transaction.id))
        .map((transaction) => transaction.id)));
      setImportStats({
        invalidAmount: result.rejectedRows.filter((row) => row.reason.includes("kwoty")).length,
        invalidDate: result.rejectedRows.filter((row) => row.reason.includes("daty")).length,
        skippedEmpty: 0,
        tooMany: result.transactions.length >= 2000
      });
      setStep(3);
    } catch (error: any) {
      setPdfError(error.message || "Nie udało się odczytać pliku PDF.");
    } finally {
      setIsPdfProcessing(false);
    }
  };

  const handleGenerateCsvPreview = () => {
    const result = parseAndMapCsv({
      rawCsvText: csvText,
      presetId: selectedPresetId,
      mapName,
      mapAmount,
      mapDate,
      mapCategory,
      mapCurrency,
      defaultCategory,
      defaultAccount,
      typeStrategy,
      currency: activeProfile?.currency || "PLN",
      rules: activeProfile?.transactionRules || []
    });

    setMappedTransactions(result.transactions);
    setAiInconsistentIds(new Set());
    setRejectedRows(result.rejectedRows || []);
    setDetectedCurrencies(result.detectedCurrencies || { PLN: 0, EUR: 0, USD: 0, GBP: 0 });

    // Pre-select all non-duplicate transactions by default (jeden skan, patrz scanForDuplicates)
    const { warningsMap, nonDuplicateIds } = scanForDuplicates(result.transactions);
    setDuplicateWarningsByTxId(warningsMap);

    // If all were duplicates or 0 non-duplicates, default to select all so user can choose
    const initialSelection = nonDuplicateIds.size > 0
      ? nonDuplicateIds
      : new Set(result.transactions.map((tx) => tx.id));
    setSelectedTxIds(initialSelection);

    setImportStats({
      invalidAmount: result.stats.invalidAmountCount,
      invalidDate: result.stats.invalidDateCount,
      skippedEmpty: result.stats.skippedEmptyCount,
      tooMany: result.stats.truncatedCount > 0,
      truncated: result.stats.truncatedCount
    });
    setStep(3);
  };

  // --- Wklejony tekst wyciągu (parser lokalny, bez sieci) ---
  const handleTextProcess = () => {
    if (!pastedText.trim()) return;
    setIsTextProcessing(true);
    setTextError("");
    try {
      const parsed = parseStatementText(
        pastedText,
        getLocalDateIso(),
        activeProfile?.transactionRules || [],
        defaultAccount
      );

      if (parsed.length === 0) {
        setTextError("Nie rozpoznano żadnej transakcji. Sprawdź, czy każdy wiersz zawiera opis i kwotę.");
        return;
      }

      const processed: Transaction[] = parsed.map((t, idx) => ({
        id: `tx-txt-${Date.now()}-${idx}`,
        name: t.name,
        amount: t.amount,
        type: t.type,
        isoDate: t.isoDate,
        category: t.category || defaultCategory,
        categoryIcon: t.categoryIcon || iconByCategory[t.category] || "✨",
        account: t.account || defaultAccount,
        currency: activeProfile?.currency || "PLN"
      }));

      setMappedTransactions(processed);
      setDuplicateWarningsByTxId(scanForDuplicates(processed).warningsMap);
      setSelectedTxIds(new Set(processed.map((t) => t.id)));
      setRejectedRows([]);
      setAiInconsistentIds(new Set());
      setDetectedCurrencies({ [activeProfile?.currency || "PLN"]: processed.length } as any);
      setStep(3);
    } catch (err: any) {
      setTextError(err.message || "Wystąpił problem podczas przetwarzania tekstu.");
    } finally {
      setIsTextProcessing(false);
    }
  };

  // --- Wklejony tekst wyciągu przez lokalne AI (alternatywa, gdy reguły nic nie znajdą) ---
  const handleAiTextProcess = async () => {
    if (!pastedText.trim()) return;
    setIsAiExtracting(true);
    setTextError("");
    try {
      const config = resolveLocalAiConfig(state);
      let rows = await extractTransactionsWithLocalAi(pastedText, config);

      // A reasoning model may return an empty JSON object despite valid input.
      // Keep the import usable without accepting model-generated guesses.
      if (rows.length === 0) {
        const fallbackRows = parseStatementText(
          pastedText,
          getLocalDateIso(),
          activeProfile?.transactionRules || [],
          defaultAccount
        );
        rows = fallbackRows.map((row) => ({
          ...row,
          amountConsistent: true
        }));
      }

      if (rows.length === 0) {
        setTextError("Lokalne AI nie rozpoznało żadnej transakcji w tym tekście.");
        return;
      }

      const inconsistent = new Set<string>();
      const processed: Transaction[] = rows.map((r, idx) => {
        const id = `tx-ai-${Date.now()}-${idx}`;
        if (!r.amountConsistent) inconsistent.add(id);
        return {
          id,
          name: r.name,
          amount: r.amount,
          type: r.type,
          isoDate: r.isoDate || getLocalDateIso(),
          category: r.category,
          categoryIcon: r.categoryIcon,
          account: defaultAccount,
          currency: activeProfile?.currency || "PLN"
        };
      });

      setMappedTransactions(processed);
      setDuplicateWarningsByTxId(scanForDuplicates(processed).warningsMap);
      // Wiersze z kwotą niepotwierdzoną w tekście źródłowym nie są zaznaczone domyślnie —
      // wymagają świadomej decyzji użytkownika, tak jak wykryte duplikaty. Jeśli wszystkie
      // wiersze budzą wątpliwość, zaznacz wszystko — użytkownik i tak musi przejrzeć podgląd.
      const consistentIds = processed.filter((t) => !inconsistent.has(t.id)).map((t) => t.id);
      setSelectedTxIds(new Set(consistentIds.length > 0 ? consistentIds : processed.map((t) => t.id)));
      setRejectedRows([]);
      setAiInconsistentIds(inconsistent);
      setDetectedCurrencies({ [activeProfile?.currency || "PLN"]: processed.length } as any);
      setStep(3);
    } catch (err: any) {
      setTextError(err.message || "Wystąpił problem podczas rozpoznawania tekstu przez lokalne AI.");
    } finally {
      setIsAiExtracting(false);
    }
  };

  // --- Sugestie kategorii dla nierozpoznanych ("Inne") wierszy w podglądzie ---
  const handleSuggestCategories = async () => {
    const toCategorize = mappedTransactions.filter((t) => t.category === "Inne");
    if (toCategorize.length === 0) return;

    setIsAiCategorizing(true);
    try {
      const config = resolveLocalAiConfig(state);
      const suggestions = await categorizeDescriptionsWithLocalAi(
        toCategorize.map((t) => t.name),
        config
      );

      if (suggestions.size === 0) {
        setTextError("Lokalne AI nie zwróciło żadnych sugestii kategorii.");
        return;
      }

      setMappedTransactions((prev) =>
        prev.map((t) => {
          if (t.category !== "Inne") return t;
          const suggested = suggestions.get(t.name);
          if (!suggested) return t;
          return { ...t, category: suggested, categoryIcon: iconByCategory[suggested] || t.categoryIcon };
        })
      );
    } catch (err: any) {
      setTextError(err.message || "Wystąpił problem podczas sugerowania kategorii.");
    } finally {
      setIsAiCategorizing(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedTxIds.size === mappedTransactions.length) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(mappedTransactions.map((tx) => tx.id)));
    }
  };

  const handleDeselectDuplicates = () => {
    const nonDuplicates = duplicateAnalysis.enriched
      .filter((item) => !item.warning)
      .map((item) => item.tx.id);
    setSelectedTxIds(new Set(nonDuplicates));
  };

  const handleToggleRow = (txId: string) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(txId)) {
        next.delete(txId);
      } else {
        next.add(txId);
      }
      return next;
    });
  };

  const handleConfirmImport = () => {
    if (onBeforeImport) onBeforeImport();
    const toImport = mappedTransactions.filter((tx) => selectedTxIds.has(tx.id));
    if (toImport.length > 0) {
      onImport(toImport);
    }
    onClose();
  };

  const modalContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs"
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
        {step === 1 && (
          <div className="flex border-b border-border">
            <button
              onClick={() => setTab("csv")}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset ${
                tab === "csv" ? "text-brand border-b-2 border-brand bg-brand-subtle" : "text-text-muted hover:bg-surface-2"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" /> Wgraj / wklej plik CSV (Darmowe)
            </button>
            <button
              onClick={() => setTab("text")}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset ${
                tab === "text" ? "text-brand border-b-2 border-brand bg-brand-subtle" : "text-text-muted hover:bg-surface-2"
              }`}
            >
              <FileText className="w-4 h-4" /> Wklej tekst wyciągu
            </button>
            <button
              onClick={() => setTab("pdf")}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset ${
                tab === "pdf" ? "text-brand border-b-2 border-brand bg-brand-subtle" : "text-text-muted hover:bg-surface-2"
              }`}
            >
              <FileText className="w-4 h-4" /> Importuj PDF
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar min-w-0">
          {step === 1 && tab === "text" && (
            <div className="space-y-4">
              <div className="bg-brand-subtle p-4 rounded-xl border border-brand/20">
                <p className="text-sm text-brand font-medium mb-1 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> <strong>Wklej tekst wyciągu</strong>
                </p>
                <p className="text-xs text-text-muted leading-relaxed">
                  Skopiuj historię transakcji ze strony banku lub maila i wklej ją poniżej. Kwoty, daty i kategorie
                  rozpoznawane są na Twoim urządzeniu — dane nigdzie nie są wysyłane i działa to również offline.
                </p>
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Wklej historię transakcji z banku tutaj..."
                className="w-full h-48 p-4 border border-border rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-focus-ring resize-none transition-colors"
              ></textarea>
              {textError && <p className="text-danger text-xs font-semibold">{textError}</p>}
              <div className={isLocalAiEnabled ? "grid grid-cols-1 sm:grid-cols-2 gap-2" : ""}>
                <button
                  onClick={handleTextProcess}
                  disabled={isTextProcessing || isAiExtracting || !pastedText.trim()}
                  className="w-full bg-brand text-text-inverse font-bold py-3 px-6 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex justify-center items-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {isTextProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                  {isTextProcessing ? "Przetwarzanie..." : "Rozpoznaj transakcje"}
                </button>
                {isLocalAiEnabled && (
                  <button
                    onClick={handleAiTextProcess}
                    disabled={isTextProcessing || isAiExtracting || !pastedText.trim()}
                    title="Przydatne dla tekstu, którego reguły nie rozpoznają, np. skopiowanego z maila lub PDF-a"
                    className="w-full bg-surface border border-border text-text-main font-bold py-3 px-6 rounded-xl hover:bg-surface-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex justify-center items-center gap-2 focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    {isAiExtracting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Cpu className="w-5 h-5" />}
                    {isAiExtracting ? "Analizowanie..." : "Spróbuj z lokalnym AI"}
                  </button>
                )}
              </div>
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
                  dragActive ? "border-brand bg-brand-subtle" : "border-border bg-surface"
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

          {step === 1 && tab === "pdf" && (
            <div className="space-y-4">
              <div className="bg-brand-subtle p-4 rounded-xl border border-brand/20">
                <p className="text-sm text-brand font-medium mb-1"><strong>Import tekstowego wyciągu PDF</strong></p>
                <p className="text-xs text-text-muted leading-relaxed">
                  Saldo odczyta tekstowe tabele z wyciągu, a skany przeanalizuje przez model multimodalny. W obu przypadkach sprawdzi daty, kwoty i duplikaty, a następnie pokaże podgląd przed zapisem.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleChange}
              />
              <button
                type="button"
                disabled={isPdfProcessing}
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-brand text-text-inverse font-bold py-3 px-6 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                {isPdfProcessing ? "Odczytywanie PDF..." : "Wybierz plik PDF"}
              </button>
              {pdfError && <p className="text-xs text-danger font-medium">{pdfError}</p>}
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
                  <label className="text-xs font-semibold text-text-muted">Kolumna waluty (opcjonalnie)</label>
                  <select value={mapCurrency} onChange={(e) => setMapCurrency(e.target.value)} className="w-full text-xs rounded-xl border border-border p-2 focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors">
                    <option value="">-- Domyślna ({activeProfile?.currency || "PLN"}) --</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-text-muted">Kategoria domyślna</label>
                  <select value={defaultCategory} onChange={(e) => setDefaultCategory(e.target.value)} className="w-full text-xs rounded-xl border border-border p-2 focus-visible:ring-2 focus-visible:ring-focus-ring transition-colors">
                    {Array.from(new Set([...expenseCategories, ...incomeCategories])).map((c) => (
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
            <div className="space-y-4 flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Truncation notice — plik miał więcej wierszy niż limit importu na raz */}
              {importStats.truncated > 0 && (
                <p className="text-xs text-warning bg-warning-subtle border border-warning/30 p-2.5 rounded-xl flex items-start gap-2 shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Plik zawierał więcej wierszy niż limit jednorazowego importu — wczytano pierwsze{" "}
                    <strong>{mappedTransactions.length}</strong>, pominięto{" "}
                    <strong>{importStats.truncated}</strong> kolejnych. Podziel wyciąg na mniejsze części i
                    zaimportuj resztę osobno.
                  </span>
                </p>
              )}

              {/* 1. Pre-import Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
                <div className="bg-surface border border-border p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-text-muted">Do zaimportowania</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-lg font-black text-brand">{selectedTxIds.size}</span>
                    <span className="text-xs text-text-muted">/ {mappedTransactions.length}</span>
                  </div>
                </div>

                <div className={`border p-3 rounded-xl flex flex-col justify-between ${duplicateAnalysis.duplicateCount > 0 ? "bg-warning-subtle border-warning/30" : "bg-surface border-border"}`}>
                  <span className="text-[11px] font-semibold text-text-muted">Duplikaty</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className={`text-lg font-black ${duplicateAnalysis.duplicateCount > 0 ? "text-warning" : "text-text-muted"}`}>
                      {duplicateAnalysis.duplicateCount}
                    </span>
                    <span className="text-[10px] text-text-muted">w profilu</span>
                  </div>
                </div>

                <div className={`border p-3 rounded-xl flex flex-col justify-between ${rejectedRows.length > 0 ? "bg-danger-subtle border-danger/30" : "bg-surface border-border"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-text-muted">Odrzucone</span>
                    {rejectedRows.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowRejectedDetails(!showRejectedDetails)}
                        className="text-[10px] font-bold text-danger hover:underline flex items-center gap-0.5"
                      >
                        {showRejectedDetails ? "Ukryj" : "Szczegóły"}
                        {showRejectedDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className={`text-lg font-black ${rejectedRows.length > 0 ? "text-danger" : "text-text-muted"}`}>
                      {rejectedRows.length}
                    </span>
                    <span className="text-[10px] text-text-muted">błędnych</span>
                  </div>
                </div>

                <div className="bg-surface border border-border p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-text-muted flex items-center gap-1">
                    <Globe className="w-3 h-3 text-text-muted" /> Waluty
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(Object.entries(detectedCurrencies) as [SupportedCurrency, number][])
                      .filter(([_, count]) => count > 0)
                      .map(([curr, count]) => {
                        const isMismatch = curr !== (activeProfile?.currency || "PLN");
                        return (
                          <span
                            key={curr}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              isMismatch
                                ? "bg-warning-subtle text-warning border-warning/30"
                                : "bg-surface-2 text-text-main border-border"
                            }`}
                            title={isMismatch ? `Waluta inna niż waluta profilu (${activeProfile?.currency || "PLN"})` : "Waluta profilu"}
                          >
                            {curr}: {count}
                          </span>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Currency Mismatch Notice */}
              {(Object.entries(detectedCurrencies) as [SupportedCurrency, number][]).some(([curr, count]) => count > 0 && curr !== (activeProfile?.currency || "PLN")) && (
                <div className="bg-warning-subtle px-3.5 py-2.5 rounded-xl border border-warning/20 flex items-start gap-2 text-xs text-text-main shrink-0">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-warning text-xs">Wykryto transakcje w innej walucie niż waluta profilu ({activeProfile?.currency || "PLN"})</p>
                    <p className="text-[11px] text-text-muted mt-0.5">Kwoty zostaną zapisane w ich walutach źródłowych bez automatycznego przeliczania kursów FX.</p>
                  </div>
                </div>
              )}

              {/* Rejection Details Drawer */}
              {showRejectedDetails && rejectedRows.length > 0 && (
                <div className="bg-danger-subtle p-3.5 rounded-xl border border-danger/20 text-xs shrink-0 max-h-40 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-danger flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Lista odrzuconych wierszy ({rejectedRows.length})
                    </h4>
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {rejectedRows.map((rej, i) => (
                      <div key={i} className="bg-surface/80 p-2 rounded-lg border border-danger/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-danger font-bold">Linia {rej.rowIndex}: {rej.reason}</span>
                        <span className="text-text-muted truncate max-w-xs">{rej.rawText}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Selection Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-xs font-semibold text-text-muted hover:text-text-main px-2.5 py-1 rounded-lg hover:bg-surface-2 border border-border transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring"
                    id="btn-import-toggle-all"
                  >
                    {selectedTxIds.size === mappedTransactions.length ? <CheckSquare className="w-3.5 h-3.5 text-brand" /> : <Square className="w-3.5 h-3.5" />}
                    {selectedTxIds.size === mappedTransactions.length ? "Odznacz wszystkie" : "Zaznacz wszystkie"}
                  </button>

                  {duplicateAnalysis.duplicateCount > 0 && (
                    <button
                      type="button"
                      onClick={handleDeselectDuplicates}
                      className="text-xs font-semibold text-warning hover:text-warning px-2.5 py-1 rounded-lg bg-warning-subtle hover:bg-warning-subtle/80 border border-warning/20 transition-colors flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-focus-ring"
                      id="btn-import-deselect-duplicates"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" /> Odznacz duplikaty ({duplicateAnalysis.duplicateCount})
                    </button>
                  )}

                  {isLocalAiEnabled && uncategorizedCount > 0 && (
                    <button
                      type="button"
                      onClick={handleSuggestCategories}
                      disabled={isAiCategorizing}
                      className="text-xs font-semibold text-brand hover:text-brand px-2.5 py-1 rounded-lg bg-brand-subtle hover:bg-brand-subtle/80 border border-brand/20 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-focus-ring"
                      id="btn-import-suggest-categories"
                    >
                      {isAiCategorizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {isAiCategorizing ? "Sugerowanie..." : `Zasugeruj kategorie (AI) — ${uncategorizedCount}`}
                    </button>
                  )}
                </div>

                <div className="text-xs text-text-muted font-medium">
                  Zaznaczono: <strong className="text-text-main">{selectedTxIds.size}</strong> z {mappedTransactions.length}
                </div>
              </div>

              {/* 3. Transaction Preview Table with Row Checkboxes */}
              <div className="overflow-y-auto border border-border rounded-xl flex-1 max-h-[320px] custom-scrollbar min-h-0">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-surface border-b border-border font-bold text-text-muted sticky top-0 z-10">
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          id="chk-import-header-toggle"
                          checked={selectedTxIds.size === mappedTransactions.length && mappedTransactions.length > 0}
                          onChange={handleToggleSelectAll}
                          aria-label="Zaznacz lub odznacz wszystkie transakcje"
                          className="rounded border-border text-brand focus:ring-focus-ring cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Opis</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Kategoria</th>
                      <th className="py-2.5 px-3">Konto</th>
                      <th className="py-2.5 px-3">Waluta</th>
                      <th className="py-2.5 px-3 text-right">Kwota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-bg-base/95 backdrop-blur-2xl">
                    {duplicateAnalysis.enriched.map(({ tx, warning }, idx) => {
                      const isSelected = selectedTxIds.has(tx.id);
                      const isAmountInconsistent = aiInconsistentIds.has(tx.id);
                      return (
                        <tr
                          key={tx.id || idx}
                          onClick={() => handleToggleRow(tx.id)}
                          className={`transition-colors cursor-pointer select-none ${
                            warning || isAmountInconsistent
                              ? isSelected
                                ? "bg-warning-subtle hover:bg-warning-subtle/80"
                                : "bg-warning-subtle/40 opacity-70 hover:opacity-100"
                              : isSelected
                              ? "hover:bg-surface"
                              : "opacity-60 hover:opacity-100 bg-surface-2/30"
                          }`}
                        >
                          <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              id={`chk-import-row-${idx}`}
                              checked={isSelected}
                              onChange={() => handleToggleRow(tx.id)}
                              aria-label={`Zaznacz transakcję ${tx.name}`}
                              className="rounded border-border text-brand focus:ring-focus-ring cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-text-main flex items-center gap-1.5 min-w-0">
                              {warning && (
                                <DelayedTooltip label={warning.reason}>
                                  <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                                </DelayedTooltip>
                              )}
                              <span className="truncate block max-w-[140px] sm:max-w-xs" title={tx.name}>
                                {tx.name}
                              </span>
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
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-2 border border-border text-text-muted uppercase">
                              {tx.currency || activeProfile?.currency || "PLN"}
                            </span>
                          </td>
                          <td className={`py-2 px-3 text-right font-bold ${tx.type === "income" ? "text-brand" : "text-danger"}`}>
                            <span className="inline-flex items-center gap-1.5 justify-end">
                              {isAmountInconsistent && (
                                <DelayedTooltip label="Kwota nie występuje w tekście źródłowym — sprawdź ją przed importem">
                                  <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                                </DelayedTooltip>
                              )}
                              {tx.type === "income" ? "+" : "-"} {formatMoney(tx.amount, tx.currency || activeProfile?.currency || "PLN")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 4. Action Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border shrink-0">
                <button
                  type="button"
                  onClick={() => setStep(tab === "csv" ? 2 : 1)}
                  className="text-xs font-semibold text-text-muted hover:text-text-main px-3 py-2 rounded-xl hover:bg-surface-2 transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  &larr; Wróć i popraw
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="bg-surface border border-border text-text-main font-bold py-2.5 px-4 rounded-xl hover:bg-surface-2 active:scale-[0.98] transition-all text-xs focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    id="btn-confirm-import"
                    onClick={handleConfirmImport}
                    disabled={selectedTxIds.size === 0}
                    className="bg-brand text-text-inverse font-bold py-2.5 px-6 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-md text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    <Check className="w-4 h-4" />
                    <span>Zaimportuj wybrane ({selectedTxIds.size})</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
