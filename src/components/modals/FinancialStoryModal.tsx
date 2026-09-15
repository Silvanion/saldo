import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Sparkles,
  Share2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Wallet,
  PieChart,
  Check,
  Award,
  ShieldCheck,
  ArrowRight
} from "lucide-react";
import { Profile } from "../../types";
import {
  generateFinancialStory,
  FinancialStory,
  FinancialStorySlide,
  MONTH_NAMES_PL
} from "../../services/financialStory";
import { formatMoney } from "../../utils";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export interface FinancialStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  initialYear?: number;
  initialMonthIdx?: number;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
}

const SLIDE_DURATION_MS = 6000;

export function FinancialStoryModal({
  isOpen,
  onClose,
  profile,
  initialYear,
  initialMonthIdx,
  showToast
}: FinancialStoryModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear ?? now.getFullYear());
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(initialMonthIdx ?? now.getMonth());

  const [currentSlideIdx, setCurrentSlideIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [slideProgress, setSlideProgress] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(now.getFullYear());
    years.add(now.getFullYear() - 1);
    (profile.transactions || []).forEach((t) => {
      if (t.isoDate) {
        const y = new Date(`${t.isoDate}T12:00:00`).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [profile.transactions, now]);

  const story: FinancialStory = useMemo(() => {
    return generateFinancialStory(profile, selectedYear, selectedMonthIdx);
  }, [profile, selectedYear, selectedMonthIdx]);

  const totalSlides = story.slides.length;
  const currentSlide: FinancialStorySlide = story.slides[currentSlideIdx] || story.slides[0];

  const handleNextSlide = useCallback(() => {
    setCurrentSlideIdx((prev) => (prev + 1 < totalSlides ? prev + 1 : 0));
    setSlideProgress(0);
  }, [totalSlides]);

  const handlePrevSlide = useCallback(() => {
    setCurrentSlideIdx((prev) => (prev > 0 ? prev - 1 : totalSlides - 1));
    setSlideProgress(0);
  }, [totalSlides]);

  // Reset slide when month/year changes
  useEffect(() => {
    setCurrentSlideIdx(0);
    setSlideProgress(0);
  }, [selectedYear, selectedMonthIdx]);

  // Story ticker progress loop
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    const intervalStep = 50; // update every 50ms
    const timer = setInterval(() => {
      setSlideProgress((prev) => {
        const next = prev + (intervalStep / SLIDE_DURATION_MS) * 100;
        if (next >= 100) {
          handleNextSlide();
          return 0;
        }
        return next;
      });
    }, intervalStep);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, handleNextSlide]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        handleNextSlide();
      } else if (e.key === "ArrowLeft") {
        handlePrevSlide();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNextSlide, handlePrevSlide]);

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(story.shareableSummaryText);
      setCopied(true);
      showToast?.("Podsumowanie skopiowane do schowka!", "success");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast?.("Nie udało się skopiować tekstu", "error");
    }
  };

  const handleExportPng = () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
      bgGrad.addColorStop(0, "#090d16");
      bgGrad.addColorStop(0.5, "#151b2e");
      bgGrad.addColorStop(1, "#05070c");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Top badge
      ctx.fillStyle = "rgba(99, 102, 241, 0.15)";
      ctx.beginPath();
      ctx.roundRect(80, 100, 920, 120, 24);
      ctx.fill();
      ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#818cf8";
      ctx.font = "bold 44px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✨ SALDO WRAPPED", 540, 175);

      // Period Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 76px sans-serif";
      ctx.fillText(story.periodLabel, 540, 310);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "38px sans-serif";
      ctx.fillText(currentSlide.subtitle, 540, 380);

      // Main Content Box
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.beginPath();
      ctx.roundRect(80, 460, 920, 1100, 36);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.stroke();

      // Card Content rendering based on slide type
      if (currentSlide.type === "intro" || currentSlide.type === "executive") {
        const balanceVal = currentSlide.balance;
        ctx.fillStyle = balanceVal >= 0 ? "#10b981" : "#ef4444";
        ctx.font = "bold 92px sans-serif";
        ctx.fillText(
          `${balanceVal >= 0 ? "+" : ""}${Math.round(balanceVal).toLocaleString("pl-PL")} ${story.currency}`,
          540,
          680
        );

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "40px sans-serif";
        ctx.fillText("Bilans finansowy miesiąca", 540, 760);

        // Savings Rate Box
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.beginPath();
        ctx.roundRect(140, 840, 800, 200, 24);
        ctx.fill();

        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 56px sans-serif";
        ctx.fillText(
          currentSlide.savingsRate !== null ? `${Math.round(currentSlide.savingsRate)}%` : "--",
          540,
          930
        );
        ctx.fillStyle = "#94a3b8";
        ctx.font = "34px sans-serif";
        ctx.fillText("Stopa zaoszczędzonych wpływów", 540, 990);

        // Highlight/Quote text
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "italic 38px sans-serif";
        const textToWrap =
          currentSlide.type === "intro" ? currentSlide.highlightText : currentSlide.summaryQuote;
        ctx.fillText(textToWrap, 540, 1200);
      } else if (currentSlide.type === "expenses") {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 54px sans-serif";
        ctx.fillText("Największe kategorie wydatków", 540, 580);

        let yOffset = 680;
        currentSlide.categories.forEach((cat, idx) => {
          ctx.fillStyle = "#f1f5f9";
          ctx.font = "bold 42px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(`${idx + 1}. ${cat.name}`, 140, yOffset);

          ctx.textAlign = "right";
          ctx.fillText(`${Math.round(cat.amount).toLocaleString("pl-PL")} ${story.currency}`, 940, yOffset);

          // Bar
          ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
          ctx.beginPath();
          ctx.roundRect(140, yOffset + 20, 800, 24, 12);
          ctx.fill();

          ctx.fillStyle = "#ec4899";
          ctx.beginPath();
          ctx.roundRect(140, yOffset + 20, (800 * cat.percent) / 100, 24, 12);
          ctx.fill();

          yOffset += 150;
        });

        ctx.textAlign = "center";
        ctx.fillStyle = "#a855f7";
        ctx.font = "38px sans-serif";
        ctx.fillText(currentSlide.comparedToPrevMonthText, 540, 1420);
      } else if (currentSlide.type === "health") {
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 130px sans-serif";
        ctx.fillText(`${currentSlide.healthScore}/100`, 540, 740);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 56px sans-serif";
        ctx.fillText(`Ocena: ${currentSlide.gradeLabel}`, 540, 850);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "38px sans-serif";
        ctx.fillText("Główny atut:", 540, 990);
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 40px sans-serif";
        ctx.fillText(currentSlide.mainPositive, 540, 1060);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "38px sans-serif";
        ctx.fillText("Wskazówka na kolejny miesiąc:", 540, 1200);
        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 38px sans-serif";
        ctx.fillText(currentSlide.mainRecommendation, 540, 1270);
      } else {
        // Generic fallback for habits and wealth
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 56px sans-serif";
        ctx.fillText(currentSlide.title, 540, 700);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "40px sans-serif";
        ctx.fillText(currentSlide.subtitle, 540, 800);

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 48px sans-serif";
        if (currentSlide.type === "habits") {
          ctx.fillText(`Dzień największych zakupów: ${currentSlide.busiestDayName}`, 540, 980);
          ctx.fillStyle = "#94a3b8";
          ctx.font = "38px sans-serif";
          ctx.fillText(currentSlide.insightsText, 540, 1100);
        } else if (currentSlide.type === "wealth") {
          ctx.fillText(
            `Majątek netto: ${Math.round(currentSlide.currentNetWorth).toLocaleString("pl-PL")} ${story.currency}`,
            540,
            980
          );
          ctx.fillStyle = "#94a3b8";
          ctx.font = "38px sans-serif";
          ctx.fillText(currentSlide.wealthInsightText, 540, 1100);
        }
      }

      // Footer branding
      ctx.textAlign = "center";
      ctx.fillStyle = "#64748b";
      ctx.font = "32px sans-serif";
      ctx.fillText("Wygenerowano w aplikacji Saldo • saldo.app", 540, 1800);

      // Download link
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `Saldo_Wrapped_${story.monthName}_${story.year}_Karta_${currentSlideIdx + 1}.png`;
      link.href = dataUrl;
      link.click();

      showToast?.("Karta podsumowania została pobrana jako PNG!", "success");
    } catch {
      showToast?.("Nie udało się wyeksportować grafiki", "error");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="financial-story-modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[92vh] max-h-[820px]"
      >
        {/* Top Story Progress Segments */}
        <div className="absolute top-0 left-0 right-0 z-30 p-3 pt-4 flex gap-1.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {story.slides.map((slide, idx) => {
            let widthPercent = 0;
            if (idx < currentSlideIdx) widthPercent = 100;
            else if (idx === currentSlideIdx) widthPercent = slideProgress;

            return (
              <button
                key={slide.id}
                onClick={() => {
                  setCurrentSlideIdx(idx);
                  setSlideProgress(0);
                }}
                className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer hover:bg-white/30 active:scale-y-150 transition-all focus-visible:ring-2 focus-visible:ring-white/60 focus:outline-none"
                title={`Slajd ${idx + 1}: ${slide.title}`}
                aria-label={`Slajd ${idx + 1}: ${slide.title}`}
              >
                <div
                  className="h-full bg-white rounded-full transition-all duration-75 ease-linear"
                  style={{ width: `${widthPercent}%` }}
                />
              </button>
            );
          })}
        </div>

        {/* Header toolbar */}
        <div className="relative z-20 flex items-center justify-between px-4 pt-8 pb-3 bg-gradient-to-b from-black/60 to-transparent text-white">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </span>
            <div className="flex flex-col">
              <span
                id="financial-story-modal-title"
                className="text-xs font-semibold tracking-wider uppercase text-indigo-300"
              >
                Saldo Wrapped
              </span>
              <div className="flex items-center gap-1">
                <select
                  value={selectedMonthIdx}
                  onChange={(e) => setSelectedMonthIdx(Number(e.target.value))}
                  className="bg-slate-900/80 border border-slate-700 text-white text-xs rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  aria-label="Wybierz miesiąc"
                >
                  {MONTH_NAMES_PL.map((m, idx) => (
                    <option key={idx} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-slate-900/80 border border-slate-700 text-white text-xs rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  aria-label="Wybierz rok"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title={isPlaying ? "Pauza (Spacja)" : "Odtwórz (Spacja)"}
              aria-label={isPlaying ? "Pauza" : "Odtwórz"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Zamknij (Esc)"
              aria-label="Zamknij"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main interactive Story Card body */}
        <div className="relative flex-1 overflow-hidden flex flex-col">
          {/* Left / Right click zones for touch and desktop */}
          <button
            onClick={handlePrevSlide}
            className="absolute left-0 top-0 bottom-0 w-1/4 z-10 opacity-0 cursor-pointer"
            aria-label="Poprzednia karta"
          />
          <button
            onClick={handleNextSlide}
            className="absolute right-0 top-0 bottom-0 w-1/4 z-10 opacity-0 cursor-pointer"
            aria-label="Następna karta"
          />

          <AnimatePresence initial={false}>
            <motion.div
              key={`${currentSlide.id}-${selectedYear}-${selectedMonthIdx}`}
              initial={{ opacity: 0, scale: 0.96, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.96, x: -20 }}
              transition={{ duration: 0.25 }}
              className={`flex-1 flex flex-col justify-between p-6 bg-gradient-to-br ${currentSlide.bgGradient} text-white shadow-inner select-none`}
            >
              {/* Badge & Subtitle */}
              <div>
                {currentSlide.badge && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black/30 backdrop-blur-md border border-white/15 text-white/90 shadow-sm mb-3">
                    {currentSlide.badge}
                  </span>
                )}
                <h3 className="text-2xl font-bold tracking-tight text-white mb-1">
                  {currentSlide.title}
                </h3>
                <p className="text-sm text-white/75">{currentSlide.subtitle}</p>
              </div>

              {/* Slide Specific Content Body */}
              <div className="my-auto py-4">
                {currentSlide.type === "intro" && (
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-4 rounded-3xl bg-black/25 backdrop-blur-md border border-white/10 w-full shadow-lg">
                      <span className="text-xs uppercase tracking-wider text-white/60 font-semibold">
                        Wynik netto miesiąca
                      </span>
                      <div
                        className={`text-4xl sm:text-5xl font-extrabold my-2 tracking-tight ${
                          currentSlide.balance >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {currentSlide.balance >= 0 ? "+" : ""}
                        {formatMoney(currentSlide.balance, currentSlide.currency)}
                      </div>
                      <div className="flex justify-around text-xs text-white/80 pt-2 border-t border-white/10 mt-2">
                        <div>
                          <span className="text-white/50 block">Wpływy</span>
                          <span className="font-semibold text-emerald-300">
                            {formatMoney(currentSlide.totalIncome, currentSlide.currency)}
                          </span>
                        </div>
                        <div>
                          <span className="text-white/50 block">Wydatki</span>
                          <span className="font-semibold text-rose-300">
                            {formatMoney(currentSlide.totalExpenses, currentSlide.currency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {currentSlide.savingsRate !== null && (
                      <div className="w-full bg-black/20 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
                        <div className="flex justify-between items-center text-xs text-white/80 mb-1.5">
                          <span>Stopa oszczędności</span>
                          <span className="font-bold text-white">
                            {Math.round(currentSlide.savingsRate)}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, currentSlide.savingsRate))}%`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <p className="text-sm text-white/90 italic font-medium px-2 leading-relaxed">
                      {currentSlide.highlightText}
                    </p>
                  </div>
                )}

                {currentSlide.type === "expenses" && (
                  <div className="space-y-3.5">
                    <div className="space-y-2.5">
                      {currentSlide.categories.length > 0 ? (
                        currentSlide.categories.map((cat, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-black/25 backdrop-blur-sm border border-white/10 flex flex-col gap-1.5"
                          >
                            <div className="flex justify-between items-center text-sm font-semibold">
                              <span>
                                {idx + 1}. {cat.name}
                              </span>
                              <span>{formatMoney(cat.amount, currentSlide.currency)}</span>
                            </div>
                            <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-pink-400 to-rose-400 rounded-full"
                                style={{ width: `${cat.percent}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-white/60 text-right">
                              {cat.percent}% wydatków
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-white/70 text-sm">
                          Brak zarejestrowanych wydatków w tym miesiącu.
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-400/20 text-xs text-purple-200 text-center font-medium">
                      {currentSlide.comparedToPrevMonthText}
                    </div>
                  </div>
                )}

                {currentSlide.type === "habits" && (
                  <div className="space-y-4 text-center">
                    <div className="p-4 rounded-2xl bg-black/30 backdrop-blur-sm border border-white/10 flex flex-col items-center">
                      <span className="text-xs uppercase text-white/60 font-semibold mb-1">
                        Dzień największych zakupów
                      </span>
                      <span className="text-3xl font-extrabold text-amber-300">
                        {currentSlide.busiestDayName}
                      </span>
                      {currentSlide.busiestDayAmount > 0 && (
                        <span className="text-xs text-white/70 mt-1">
                          Suma zakupów: {formatMoney(currentSlide.busiestDayAmount, currentSlide.currency)}
                        </span>
                      )}
                    </div>

                    {currentSlide.biggestTransaction && (
                      <div className="p-3.5 rounded-xl bg-black/20 backdrop-blur-sm border border-white/10 text-left">
                        <span className="text-[11px] uppercase tracking-wider text-white/50 block mb-1">
                          Największa transakcja
                        </span>
                        <div className="flex justify-between items-center text-sm font-bold">
                          <span className="truncate pr-2">
                            {currentSlide.biggestTransaction.title}
                          </span>
                          <span className="text-rose-300 shrink-0">
                            {formatMoney(currentSlide.biggestTransaction.amount, currentSlide.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-white/60 mt-1">
                          <span>{currentSlide.biggestTransaction.category}</span>
                          <span>{currentSlide.biggestTransaction.date}</span>
                        </div>
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-black/20 border border-white/10 text-xs text-white/80">
                      Średni dzienny wydatek:{" "}
                      <strong className="text-white">
                        {formatMoney(currentSlide.dailyAverageExpense, currentSlide.currency)}
                      </strong>
                    </div>
                  </div>
                )}

                {currentSlide.type === "wealth" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-black/30 backdrop-blur-sm border border-white/10 text-center">
                      <span className="text-xs uppercase text-white/60 font-semibold">
                        Twój majątek netto
                      </span>
                      <div className="text-3xl font-extrabold text-teal-300 mt-1">
                        {formatMoney(currentSlide.currentNetWorth, currentSlide.currency)}
                      </div>
                      <span className="text-xs text-white/70 mt-1 block">
                        Płynna gotówka i oszczędności:{" "}
                        {formatMoney(currentSlide.liquidSavings, currentSlide.currency)}
                      </span>
                    </div>

                    {currentSlide.goalsProgress.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-white/70 uppercase">
                          Postęp celów oszczędnościowych
                        </span>
                        {currentSlide.goalsProgress.map((g, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl bg-black/20 border border-white/10"
                          >
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span>{g.title}</span>
                              <span>{g.percent}%</span>
                            </div>
                            <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-teal-400 rounded-full"
                                style={{ width: `${g.percent}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-white/80 italic text-center">
                      {currentSlide.wealthInsightText}
                    </p>
                  </div>
                )}

                {currentSlide.type === "health" && (
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="relative flex items-center justify-center w-36 h-36 rounded-full bg-black/40 border-4 border-indigo-400/40 shadow-xl">
                      <div className="flex flex-col items-center">
                        <span className="text-4xl font-extrabold text-indigo-300">
                          {currentSlide.healthScore}
                        </span>
                        <span className="text-[11px] text-white/60 uppercase font-semibold">
                          / 100 pkt
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 w-full">
                      <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-200 text-left flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-emerald-300">Mocna strona:</strong>
                          <span>{currentSlide.mainPositive}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 text-xs text-amber-200 text-left flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-amber-300">Rada na kolejny okres:</strong>
                          <span>{currentSlide.mainRecommendation}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentSlide.type === "executive" && (
                  <div className="flex flex-col items-center text-center space-y-4 p-2">
                    <div className="w-full p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl space-y-3">
                      <div className="flex justify-between items-center text-xs text-white/70 border-b border-white/10 pb-2">
                        <span>{currentSlide.monthName} {currentSlide.year}</span>
                        <span className="font-bold text-indigo-400">Saldo Summary</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-left pt-1">
                        <div className="p-2 rounded-lg bg-white/5">
                          <span className="text-[11px] text-white/50 block">Bilans</span>
                          <span
                            className={`text-base font-bold ${
                              currentSlide.balance >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {currentSlide.balance >= 0 ? "+" : ""}
                            {formatMoney(currentSlide.balance, currentSlide.currency)}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5">
                          <span className="text-[11px] text-white/50 block">Oszczędności</span>
                          <span className="text-base font-bold text-white">
                            {currentSlide.savingsRate !== null
                              ? `${Math.round(currentSlide.savingsRate)}%`
                              : "--"}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5">
                          <span className="text-[11px] text-white/50 block">Top wydatek</span>
                          <span className="text-xs font-bold text-white truncate block">
                            {currentSlide.topCategory || "Brak"}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5">
                          <span className="text-[11px] text-white/50 block">Health Score</span>
                          <span className="text-base font-bold text-indigo-300">
                            {currentSlide.healthScore}/100
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-white/80 italic pt-2 border-t border-white/10">
                        {currentSlide.summaryQuote}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-indigo-300/80">
                      <Award className="w-4 h-4" />
                      <span>Gotowe do pobrania i udostępnienia!</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Persistent Card Footer Indicator */}
          <div className="relative z-20 flex justify-between items-center text-xs text-white/60 px-6 py-2 bg-slate-950/80 border-t border-slate-800/80">
            <span>
              Karta {currentSlideIdx + 1} z {totalSlides}
            </span>
            <span className="text-[11px] font-mono text-slate-400">saldo.app</span>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="relative z-20 flex items-center justify-between p-3 bg-slate-900 border-t border-slate-800 text-white gap-2">
          <button
            onClick={handlePrevSlide}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            title="Poprzedni slajd (Strzałka w lewo)"
            aria-label="Poprzedni slajd"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPng}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow transition-colors disabled:opacity-50 cursor-pointer"
              title="Pobierz aktualną kartę jako grafikę PNG"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? "Zapis..." : "Pobierz PNG"}</span>
            </button>

            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors cursor-pointer"
              title="Kopiuj podsumowanie tekstowe"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Skopiowano" : "Kopiuj"}</span>
            </button>
          </div>

          <button
            onClick={handleNextSlide}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            title="Następny slajd (Strzałka w prawo)"
            aria-label="Następny slajd"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
