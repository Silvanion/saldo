
import { getLocalDateIso } from "../utils";
import { callAiApi, getAiConfig } from "../services/aiClient";
import { useApp } from "../app/providers/AppContext";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Payment } from "../types";
import { Calendar, Clock, Bell, AlertCircle, Check, Loader2 } from "lucide-react";
import { validateCalendarEventInput } from "../services/calendarValidation";
import { formatMoney } from "../utils/format";

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
  const { state, canUseAiChat } = useApp();
  
  // Suggested event fields
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("10:00");
  const [reminders, setReminders] = useState<number[]>([1440, 120]); // default: 1 day, 2 hours

  // Status & loading
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
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
      setReminders([1440, 120]);
      setErrorMsg(null);
      setSuccessMsg(null);
      setCalendarScopeMissing(false);
    }
  }, [isOpen, payment]);

  if (!isOpen || !payment) return null;

  const fetchEventSuggestion = async (p: Payment) => {
    setIsLoadingSuggestion(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (!canUseAiChat) {
        setSummary(`💸 Płatność: ${p.name} (${p.amount} ${(p.currency || state?.currencyPreference || "PLN")})`);
        setDescription(`Przypomnienie o uregulowaniu rachunku/subskrypcji.\n\nNazwa: ${p.name}\nKwota: ${p.amount} ${(p.currency || state?.currencyPreference || "PLN")}\nTermin: ${p.dueDate}\n\n[Wygenerowano z aplikacji Saldo]`);
        setEventDate(p.dueDate || getLocalDateIso());
        setEventTime("10:00");
        setIsLoadingSuggestion(false);
        return;
      }
      const aiConfig = getAiConfig(state);
      const data = await callAiApi("suggest-event", { payment: p, currentDate: getLocalDateIso() }, aiConfig);
      
      setSummary(data.summary || `Płatność: ${p.name}`);
      setDescription(data.description || `Termin płatności za ${p.name} na kwotę ${p.amount} zł.`);
      setEventDate(p.dueDate || getLocalDateIso());
      setEventTime(data.suggestedTime?.slice(0, 5) || "10:00");
      if (Array.isArray(data.reminders)) {
        setReminders(data.reminders.slice(0, 5));
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Błąd generowania sugestii AI.");
      // Fallback details
      setSummary(`Przypomnienie: ${p.name} - ${p.amount} ${(p.currency || state?.currencyPreference || "PLN")}`);
      setDescription(`Ureguluj płatność ${p.name} na kwotę ${p.amount} ${(p.currency || state?.currencyPreference || "PLN")}.`);
      setEventDate(p.dueDate || getLocalDateIso());
      setEventTime("10:00");
    } finally {
      setIsLoadingSuggestion(false);
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
      reminders
    });

    if (!validation.isValid) {
      setErrorMsg(validation.error || "Wprowadzono nieprawidłowe dane wydarzenia.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const startTime = `${eventDate}T${eventTime}:00`;
    const endTime = `${eventDate}T${calculateEndTime(eventTime)}:00`;

    const event = {
      summary: summary.trim(),
      description: description.trim(),
      start: {
        dateTime: startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      reminders: {
        useDefault: false,
        overrides: reminders.map((min) => ({ method: "popup", minutes: min }))
      }
    };

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs transition-opacity"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between bg-slate-900/95 backdrop-blur-2xl relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-700/50 text-slate-300 flex items-center justify-center shadow-sm border border-slate-700/50">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 leading-tight">Przypomnienie w Kalendarzu</h2>
              <p className="text-xs text-slate-400 font-medium">Zarządzaj terminami łatwo</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 p-2 rounded-xl transition cursor-pointer"
            id="btn-close-calendar-modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-800/60/50 space-y-6">
          {!calendarToken || calendarScopeMissing ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-1">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900 mb-1">Połącz kalendarz</h3>
                <p className="text-xs text-amber-700 max-w-xs leading-relaxed">
                  Aby zaplanować wydarzenie, połącz swoje konto Google i zezwól na dostęp do kalendarza.
                </p>
              </div>
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex gap-2 text-left">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <button
                type="button"
                onClick={onConnectCalendar}
                className="bg-amber-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:bg-amber-700 transition cursor-pointer"
                id="btn-connect-calendar"
              >
                Połącz kalendarz
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {isLoadingSuggestion && (
                <div className="flex flex-col items-center justify-center p-8 space-y-3 bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-slate-700/50/60 shadow-sm">
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                  <p className="text-sm font-medium text-slate-300">Przygotowuję szczegóły z AI...</p>
                </div>
              )}

              {!isLoadingSuggestion && (
                <div className="space-y-4 p-5 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shadow-sm animate-fade-in relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#137566]"></div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-[#137566]" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#153a35]">Szczegóły przypomnienia w Kalendarzu</span>
                  </div>
                  
                  {/* Event Summary */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Tytuł wydarzenia</label>
                    <input
                      required
                      type="text"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      className="w-full rounded-xl border border-slate-700/50 p-2.5 text-sm font-bold text-slate-100 outline-none focus:border-[#137566] focus:ring-1 focus:ring-[#137566] transition"
                      id="input-event-summary"
                    />
                  </div>

                  {/* Event Description */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Opis {canUseAiChat ? "(Wygenerowany przez AI)" : ""}</label>
                    <textarea
                      required
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-xl border border-slate-700/50 p-2.5 text-xs text-slate-200 outline-none focus:border-[#137566] focus:ring-1 focus:ring-[#137566] transition leading-relaxed"
                      id="input-event-description"
                    />
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Data</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-[#137566] absolute left-3 top-2.5" />
                        <input
                          required
                          type="date"
                          value={eventDate}
                          onChange={(e) => setEventDate(e.target.value)}
                          className="w-full rounded-xl border border-slate-700/50 py-2.5 pl-9 pr-3 text-sm font-bold text-slate-100 outline-none focus:border-[#137566] transition cursor-pointer"
                          id="input-event-date"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Godzina</label>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-[#137566] absolute left-3 top-2.5" />
                        <input
                          required
                          type="time"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                          className="w-full rounded-xl border border-slate-700/50 py-2.5 pl-9 pr-3 text-sm font-bold text-slate-100 outline-none focus:border-[#137566] transition cursor-pointer"
                          id="input-event-time"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reminders Toggles */}
                  <div className="pt-2 border-t border-slate-700/50">
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
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
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                              isSelected
                                ? "bg-[#137566] text-white border-[#137566] shadow-sm scale-105"
                                : "bg-slate-800/60 text-slate-300 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-300"
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
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
              
              {successMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Bottom Actions */}
              {!isLoadingSuggestion && (
                <div className="flex items-center gap-3 pt-3 border-t border-slate-700/50">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-slate-700/50 py-3 text-xs font-bold text-slate-300 hover:bg-slate-800/60 transition cursor-pointer"
                    id="btn-cancel-calendar"
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || !calendarToken}
                    onClick={handleSubmitToCalendar}
                    className="flex-2 rounded-xl bg-[#137566] hover:bg-[#0f5d51] py-3 text-xs font-bold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5 cursor-pointer"
                    id="btn-confirm-calendar"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Zapisywanie...
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4" />
                        Zapisz w Kalendarzu Google
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

