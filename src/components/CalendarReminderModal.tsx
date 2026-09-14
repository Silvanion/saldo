
import { getLocalDateIso } from "../utils";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { buildCalendarReminder } from "../services/localParsers";
import React, { useState, useEffect, useRef, useContext } from "react";
import { motion } from "motion/react";
import { Payment } from "../types";
import { Calendar, Clock, Bell, AlertCircle, Check, Loader2, Sparkles, X } from "lucide-react";
import { validateCalendarEventInput } from "../services/calendarValidation";
import { formatMoney } from "../utils/format";
import { AppContext } from "../app/providers/AppContext";
import { callAiApi, getAiConfig } from "../services/aiClient";
import { ReasonCard } from "./shared/ReasonCard";

interface CalendarReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  calendarToken: string | null;
  onConnectCalendar?: () => void;
  onCalendarAuthInvalid?: () => void;
}

export function CalendarReminderModal({
  isOpen,
  onClose,
  payment,
  calendarToken,
  onConnectCalendar,
  onCalendarAuthInvalid
}: CalendarReminderModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);
  const appCtx = useContext(AppContext);
  const isAiEnabled = appCtx?.state?.aiMode === "local";
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);

  // Suggested event fields
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("10:00");
  const [isAllDay, setIsAllDay] = useState(false);
  const [recurrence, setRecurrence] = useState("none");
  const [reminders, setReminders] = useState<number[]>([1440, 120]); // default: 1 day, 2 hours

  // Status & loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [calendarScopeMissing, setCalendarScopeMissing] = useState(false);

  // When calendarToken becomes available, clear calendarScopeMissing so the user sees the form with preserved fields
  useEffect(() => {
    if (calendarToken) {
      setCalendarScopeMissing(false);
    }
  }, [calendarToken]);

  // Fetch suggestions when an existing payment is provided
  useEffect(() => {
    if (isOpen && payment) {
      fetchEventSuggestion(payment);
    } else if (isOpen) {
      // Clean up fields if opened without payment
      setSummary("");
      setDescription("");
      setEventDate(getLocalDateIso());
      setEventTime("10:00");
      setIsAllDay(false);
      setRecurrence("none");
      setReminders([1440, 120]);
      setErrorMsg(null);
      setSuccessMsg(null);
      setCalendarScopeMissing(false);
    }
  }, [isOpen, payment]);

  if (!isOpen || !payment) return null;

  // Treść przypomnienia powstaje lokalnie — natychmiast, offline i bez limitów zapytań.
  const fetchEventSuggestion = (p: Payment) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const draft = buildCalendarReminder(p, getLocalDateIso());

    setSummary(draft.summary);
    setDescription(draft.description);
    setEventDate(p.dueDate || getLocalDateIso());
    setEventTime(draft.suggestedTime.slice(0, 5));
    setReminders(draft.reminders);
  };

  // Optional AI-assisted version of the same suggestion, using the locally
  // running Ollama model (see src/server/ai/providers/localProvider.ts::suggestEvent).
  // Only ever pre-fills the form below — nothing is sent to Google Calendar here.
  const handleAiSuggest = async () => {
    if (!payment || isAiSuggesting) return;
    setIsAiSuggesting(true);
    setErrorMsg(null);
    try {
      const result = await callAiApi("suggest-event", {
        payment: { name: payment.name, amount: payment.amount, dueDate: payment.dueDate },
        currentDate: getLocalDateIso()
      }, getAiConfig(appCtx?.state));

      if (typeof result.summary === "string" && result.summary.trim()) setSummary(result.summary);
      if (typeof result.description === "string" && result.description.trim()) setDescription(result.description);
      if (typeof result.suggestedDate === "string" && result.suggestedDate.trim()) setEventDate(result.suggestedDate);
      if (typeof result.suggestedTime === "string" && result.suggestedTime.trim()) setEventTime(result.suggestedTime.slice(0, 5));
      if (Array.isArray(result.suggestedReminders) && result.suggestedReminders.length > 0) {
        setReminders(result.suggestedReminders.filter((m: unknown) => typeof m === "number").slice(0, 5));
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Nie udało się uzyskać propozycji od AI.");
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const calculateEndTime = (timeStr: string): string => {
    try {
      const [h, m] = timeStr.split(":").map(Number);
      const endH = (h + 1) % 24;
      return `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    } catch (e) {
      return "11:00";
    }
  };

  const handleSubmitToCalendar = async () => {
    if (!calendarToken) {
      setErrorMsg("Połącz konto Google z Kalendarzem, aby kontynuować.");
      setCalendarScopeMissing(true);
      return;
    }

    const validation = validateCalendarEventInput({
      summary,
      description,
      eventDate,
      eventTime,
      reminders,
      isAllDay
    });

    if (!validation.isValid) {
      setErrorMsg(validation.error || "Wprowadzono nieprawidłowe dane wydarzenia.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const event: any = {
      summary: summary.trim(),
      description: description.trim(),
      reminders: {
        useDefault: false,
        overrides: reminders.map((min) => ({ method: "popup", minutes: min }))
      }
    };

    if (isAllDay) {
      event.start = { date: eventDate };
      const nextDay = new Date(eventDate);
      nextDay.setDate(nextDay.getDate() + 1);
      event.end = { date: nextDay.toISOString().split("T")[0] };
    } else {
      const startTime = `${eventDate}T${eventTime}:00`;
      const endTime = `${eventDate}T${calculateEndTime(eventTime)}:00`;
      event.start = {
        dateTime: startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      event.end = {
        dateTime: endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }

    if (recurrence === "monthly") {
      event.recurrence = ["RRULE:FREQ=MONTHLY"];
    } else if (recurrence === "yearly") {
      event.recurrence = ["RRULE:FREQ=YEARLY"];
    }

    try {
      const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${calendarToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setCalendarScopeMissing(true);
          if (onCalendarAuthInvalid) onCalendarAuthInvalid();
          throw new Error("Brak dostępu do Kalendarza Google (401/403). Kliknij 'Połącz kalendarz', aby odnowić dostęp.");
        }
        throw new Error(`Nie udało się zapisać w kalendarzu. Kod błędu: ${response.status}`);
      }

      setSuccessMsg("Dodano do Kalendarza Google! 🎉");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Calendar insert error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleReminder = (mins: number) => {
    setReminders(prev => {
      if (prev.includes(mins)) {
        return prev.filter(m => m !== mins);
      }
      if (prev.length >= 5) {
        setErrorMsg("Możesz wybrać maksymalnie 5 powiadomień.");
        return prev;
      }
      setErrorMsg(null);
      return [...prev, mins].sort((a,b)=>b-a);
    });
  };

  const availableReminders = [
    { label: "W dniu wydarzenia", value: 0 },
    { label: "1 godzina przed", value: 60 },
    { label: "2 godziny przed", value: 120 },
    { label: "1 dzień przed", value: 1440 },
    { label: "2 dni przed", value: 2880 },
    { label: "1 tydzień przed", value: 10080 }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="bg-bg-base/95 backdrop-blur-2xl border border-border/70 rounded-xl w-full max-w-lg shadow-lg overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-modal-title"
       ref={modalRef}>
        {/* Header */}
        <div className="shrink-0 px-6 py-5 border-b border-border/70 flex items-center justify-between bg-bg-base/95 backdrop-blur-2xl relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-surface-2 text-text-muted flex items-center justify-center shadow-xs border border-border/70 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="calendar-modal-title" className="text-lg font-bold text-text-main leading-tight truncate" title="Przypomnienie w Kalendarzu">Przypomnienie w Kalendarzu</h2>
              <p className="text-xs text-text-muted font-medium truncate" title="Zarządzaj terminami łatwo">Zarządzaj terminami łatwo</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            aria-label="Zamknij"
            className="text-text-muted hover:text-text-main hover:bg-surface-2 p-2 rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
            id="btn-close-calendar-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-6 overflow-y-auto custom-scrollbar bg-surface/50 space-y-6">
          {!calendarToken || calendarScopeMissing ? (
            <div className="bg-warning-subtle border border-warning/20 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-surface text-warning flex items-center justify-center mb-1 border border-border">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-warning mb-1">Połącz kalendarz</h3>
                <p className="text-xs text-warning max-w-xs leading-relaxed">
                  Aby zaplanować wydarzenie, połącz swoje konto Google i zezwól na dostęp do kalendarza.
                </p>
              </div>
              {errorMsg && (
                <div className="p-3 bg-danger-subtle border border-danger/20 rounded-xl text-danger text-xs flex gap-2 text-left">
                  <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <button
                type="button"
                onClick={onConnectCalendar}
                className="bg-brand border border-brand text-text-inverse px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:bg-brand-hover transition cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                id="btn-connect-calendar"
              >
                Połącz kalendarz
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {(
                <div className="space-y-4 p-5 bg-bg-base/95 backdrop-blur-2xl border border-border rounded-2xl shadow-sm animate-fade-in relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-brand"></div>
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand" />
                      <span className="text-xs font-medium text-text-muted">Szczegóły przypomnienia w Kalendarzu</span>
                    </div>
                    {isAiEnabled && (
                      <button
                        type="button"
                        onClick={handleAiSuggest}
                        disabled={isAiSuggesting}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand bg-brand-subtle hover:bg-brand-subtle/70 border border-brand/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-focus-ring"
                        id="btn-ai-suggest-calendar-event"
                      >
                        {isAiSuggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {isAiSuggesting ? "AI proponuje..." : "Zaproponuj przez AI"}
                      </button>
                    )}
                  </div>

                  {!isAiEnabled && (
                    <ReasonCard
                      className="mb-1"
                      reason={{
                        code: "calendar-ai-suggest-disabled",
                        severity: "info",
                        title: "Chcesz, by AI dopracowało treść przypomnienia?",
                        message: "Powyższa treść jest już wygenerowana lokalnie i działa od razu. Włącz lokalne AI (Ollama) w Ustawieniach → Automatyzacja, aby dodatkowo poprosić model o bardziej dopracowaną wersję.",
                        actionLabel: "Przejdź do Ustawień",
                        onAction: () => {
                          onClose();
                          appCtx?.setActiveView("settings");
                        }
                      }}
                    />
                  )}

                  {/* Event Summary */}
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">Tytuł wydarzenia</label>
                    <input
                      required
                      type="text"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring transition"
                      id="input-event-summary"
                    />
                  </div>

                  {/* Event Description */}
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">Opis</label>
                    <textarea
                      required
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring transition leading-relaxed"
                      id="input-event-description"
                    />
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-text-muted mb-1.5">Data</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-brand absolute left-3 top-2.5" />
                        <input
                          required
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring transition cursor-pointer"
                          id="input-event-date"
                        />
                      </div>
                    </div>
                    {!isAllDay && (
                      <div>
                        <label className="block text-xs font-medium text-text-muted mb-1.5">Godzina</label>
                        <div className="relative">
                          <Clock className="w-4 h-4 text-brand absolute left-3 top-2.5" />
                          <input
                            required
                            type="time"
                            value={eventTime}
                            onChange={(e) => setEventTime(e.target.value)}
                            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm font-bold text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring transition cursor-pointer"
                            id="input-event-time"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* All Day & Recurrence */}
                  <div className="flex items-center gap-4 bg-surface p-4 rounded-xl border border-border/70">
                    <label className="flex items-center gap-2 cursor-pointer group flex-1">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isAllDay ? 'bg-brand border-brand text-text-inverse' : 'border-border/70 bg-surface-2 group-hover:border-brand/50'}`}>
                        {isAllDay && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={isAllDay} 
                        onChange={(e) => setIsAllDay(e.target.checked)} 
                        className="hidden" 
                      />
                      <span className="text-xs font-medium text-text-main group-hover:text-brand transition-colors">Całodniowe</span>
                    </label>
                    <div className="w-px h-6 bg-border/70"></div>
                    <div className="flex-1 flex items-center gap-2">
                       <span className="text-xs font-medium text-text-muted shrink-0">Powtarzaj:</span>
                       <select
                          value={recurrence}
                          onChange={(e) => setRecurrence(e.target.value)}
                          className="w-full bg-surface-2 border border-border/70 rounded-xl px-2.5 py-2 text-xs text-text-main outline-none focus:border-brand"
                       >
                         <option value="none">Nigdy</option>
                         <option value="monthly">Co miesiąc</option>
                         <option value="yearly">Co rok</option>
                       </select>
                    </div>
                  </div>

                  {/* Reminders Toggles */}
                  <div className="pt-2 border-t border-border">
                    <label className="block text-xs font-medium text-text-muted mb-2 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" />
                      Powiadomienia w Kalendarzu
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableReminders.map((rem) => {
                        const isSelected = reminders.includes(rem.value);
                        return (
                          <button
                            key={rem.value}
                            type="button"
                            onClick={() => toggleReminder(rem.value)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all focus-visible:ring-2 focus-visible:ring-focus-ring ${
                              isSelected
                                ? "bg-brand text-text-inverse border-brand shadow-sm scale-105"
                                : "bg-surface text-text-muted border-border hover:bg-surface-2"
                            }`}
                          >
                            {rem.label} {isSelected && "✓"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Error / Success feedback inside modal */}
              {errorMsg && (
                <div className="p-3.5 bg-danger-subtle border border-danger/20 rounded-xl text-danger text-xs flex gap-2">
                  <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              
              {successMsg && (
                <div className="p-4 bg-brand-subtle border border-brand/20 rounded-xl text-brand text-xs flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>{successMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions - extracted to footer */}
        {(calendarToken && !calendarScopeMissing) && (
          <div className="shrink-0 flex items-center gap-3 p-6 pt-4 border-t border-border bg-bg-base/95 backdrop-blur-2xl rounded-b-3xl">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-surface border border-border py-3 text-xs font-bold text-text-main hover:bg-surface-2 transition cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="btn-cancel-calendar"
            >
              Anuluj
            </button>
            <button
              type="button"
              disabled={isSubmitting || !calendarToken}
              onClick={handleSubmitToCalendar}
              className="flex-2 rounded-xl bg-brand border border-brand hover:bg-brand-hover py-3 text-xs font-bold text-text-inverse shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring"
              id="btn-confirm-calendar"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span className="truncate">Zapisywanie...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span className="truncate">Zapisz w Kalendarzu Google</span>
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

