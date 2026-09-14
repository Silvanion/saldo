import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  Wrench,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Filter,
  Copy,
  Trash2,
  ArrowRight,
  Database,
  Calendar,
  Layers,
  FileCheck
} from "lucide-react";
import { Profile } from "../../types";
import {
  runDataAudit,
  repairAuditIssue,
  autoRepairAllIssues,
  DataAuditReport,
  DataAuditIssue,
  AuditIssueType
} from "../../services/dataAuditor";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export interface DataAuditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  onApplyRepair: (updatedProfile: Profile) => void;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
}

export function DataAuditorModal({
  isOpen,
  onClose,
  profile,
  onApplyRepair,
  showToast
}: DataAuditorModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const [activeFilter, setActiveFilter] = useState<"all" | AuditIssueType>("all");
  const [ignoredIssueIds, setIgnoredIssueIds] = useState<Set<string>>(new Set());

  const report: DataAuditReport = useMemo(() => {
    return runDataAudit(profile);
  }, [profile]);

  const visibleIssues = useMemo(() => {
    return report.issues.filter((issue) => {
      if (ignoredIssueIds.has(issue.id)) return false;
      if (activeFilter === "all") return true;
      return issue.type === activeFilter;
    });
  }, [report.issues, ignoredIssueIds, activeFilter]);

  if (!isOpen) return null;

  const handleRepairSingle = (issueId: string) => {
    try {
      const repairedProfile = repairAuditIssue(profile, issueId);
      onApplyRepair(repairedProfile);
      showToast?.("Pomyślnie naprawiono anomalię!", "success");
    } catch {
      showToast?.("Nie udało się naprawić problemu", "error");
    }
  };

  const handleRepairAll = () => {
    try {
      const { updatedProfile, repairedCount, messages } = autoRepairAllIssues(profile);
      onApplyRepair(updatedProfile);
      showToast?.(
        `Ukończono samonaprawę! Rozwiązano ${repairedCount} anomalii.`,
        "success"
      );
    } catch {
      showToast?.("Wystąpił błąd podczas automatycznej naprawy", "error");
    }
  };

  const handleIgnore = (issueId: string) => {
    setIgnoredIssueIds((prev) => new Set(prev).add(issueId));
  };

  // Severity style helper
  const getSeverityBadge = (severity: DataAuditIssue["severity"]) => {
    switch (severity) {
      case "critical":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3 h-3" /> Krytyczny
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" /> Ostrzeżenie
          </span>
        );
      case "info":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Info className="w-3 h-3" /> Sugestia
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-auditor-modal-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-subtle text-brand border border-brand/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="data-auditor-modal-title"
                className="text-lg font-bold text-text-main flex items-center gap-2"
              >
                <span>Doktor Saldo</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand/10 text-brand border border-brand/20">
                  Data Integrity & Self-Healing
                </span>
              </h2>
              <p className="text-xs text-text-muted">
                Autonomiczny audytor spójności bazy, duplikatów i anomalii
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-offset transition-colors cursor-pointer"
            aria-label="Zamknij modal audytora"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary / Health Gauge Banner */}
        <div className="p-5 border-b border-border bg-gradient-to-r from-surface-offset/60 via-surface to-surface-offset/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-18 h-18 rounded-2xl bg-surface border border-border shadow-xs shrink-0">
              <span
                id="data-auditor-health-score"
                className={`text-2xl font-extrabold ${
                  report.healthScore >= 90
                    ? "text-emerald-500"
                    : report.healthScore >= 70
                    ? "text-amber-500"
                    : "text-rose-500"
                }`}
              >
                {report.healthScore}%
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-main">
                  Wskaźnik Spójności Danych
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                    report.status === "perfect"
                      ? "bg-emerald-500/15 text-emerald-500"
                      : report.status === "good"
                      ? "bg-blue-500/15 text-blue-500"
                      : "bg-amber-500/15 text-amber-500"
                  }`}
                >
                  {report.status === "perfect" && "Stan Idealny"}
                  {report.status === "good" && "Stan Dobry"}
                  {report.status === "needs_attention" && "Wymaga Uwagi"}
                  {report.status === "critical" && "Wymagana Naprawa"}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Przeskanowano: {report.scannedCounts.transactions} transakcji,{" "}
                {report.scannedCounts.payments} rachunków, {report.scannedCounts.accounts} kont,{" "}
                {report.scannedCounts.goals} celów.
              </p>
            </div>
          </div>

          {report.issuesCount > 0 && (
            <button
              onClick={handleRepairAll}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-text-inverse hover:bg-brand-hover font-bold text-xs shadow-sm active:scale-[0.98] transition-all cursor-pointer"
              id="btn-heal-all-issues"
            >
              <Sparkles className="w-4 h-4" />
              <span>Napraw wszystko ({report.issuesCount})</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        {report.issuesCount > 0 && (
          <div className="px-5 py-2.5 border-b border-border bg-surface/30 flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-text-muted font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filtruj:
            </span>
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                activeFilter === "all"
                  ? "bg-brand text-text-inverse"
                  : "bg-surface text-text-muted hover:text-text-main"
              }`}
            >
              Wszystkie ({report.issues.length})
            </button>
            <button
              onClick={() => setActiveFilter("duplicate")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                activeFilter === "duplicate"
                  ? "bg-brand text-text-inverse"
                  : "bg-surface text-text-muted hover:text-text-main"
              }`}
            >
              Duplikaty (
              {report.issues.filter((i) => i.type === "duplicate").length})
            </button>
            <button
              onClick={() => setActiveFilter("orphaned_account")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                activeFilter === "orphaned_account"
                  ? "bg-brand text-text-inverse"
                  : "bg-surface text-text-muted hover:text-text-main"
              }`}
            >
              Konta (
              {report.issues.filter((i) => i.type === "orphaned_account").length})
            </button>
            <button
              onClick={() => setActiveFilter("missing_category")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                activeFilter === "missing_category"
                  ? "bg-brand text-text-inverse"
                  : "bg-surface text-text-muted hover:text-text-main"
              }`}
            >
              Kategorie (
              {report.issues.filter((i) => i.type === "missing_category").length})
            </button>
            <button
              onClick={() => setActiveFilter("date_anomaly")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                activeFilter === "date_anomaly"
                  ? "bg-brand text-text-inverse"
                  : "bg-surface text-text-muted hover:text-text-main"
              }`}
            >
              Daty (
              {report.issues.filter((i) => i.type === "date_anomaly").length})
            </button>
            <button
              onClick={() => setActiveFilter("unlinked_payment")}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                activeFilter === "unlinked_payment"
                  ? "bg-brand text-text-inverse"
                  : "bg-surface text-text-muted hover:text-text-main"
              }`}
            >
              Rachunki (
              {report.issues.filter((i) => i.type === "unlinked_payment").length})
            </button>
          </div>
        )}

        {/* Issues List Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {report.issuesCount === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 my-6">
              <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <ShieldCheck className="w-12 h-12" />
              </div>
              <h3 className="text-base font-bold text-text-main">
                Baza danych w 100% spójna!
              </h3>
              <p className="text-xs text-text-muted max-w-sm">
                Doktor Saldo nie wykrył żadnych duplikatów, osieroconych kont ani
                anomalii w Twoich finansach. Wszystkie wpisy są w należytym porządku.
              </p>
            </div>
          ) : visibleIssues.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-muted">
              Brak problemów w wybranej kategorii filtru.
            </div>
          ) : (
            visibleIssues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 rounded-xl bg-surface-offset/50 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-border-focus transition shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(issue.severity)}
                    <span className="text-sm font-semibold text-text-main">
                      {issue.title}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {issue.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleIgnore(issue.id)}
                    className="px-2.5 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-main hover:bg-surface transition cursor-pointer"
                    title="Ukryj z obecnego widoku"
                  >
                    Ignoruj
                  </button>
                  <button
                    onClick={() => handleRepairSingle(issue.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-offset text-text-main border border-border text-xs font-semibold hover:border-brand/40 transition shadow-xs cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5 text-brand" />
                    <span>{issue.suggestedActionLabel}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-border bg-surface/50 flex items-center justify-between text-xs text-text-muted">
          <span>Kopia bezpieczeństwa (Undo) jest tworzona automatycznie przed każdą naprawą.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-surface hover:bg-surface-offset text-text-main border border-border font-medium cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
