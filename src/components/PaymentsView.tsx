import React, { useState, useRef } from "react";
import { Profile, Payment } from "../types";
import { formatDate, requestNotificationPermission, getLocalDateIso } from "../utils";
import { SuggestedPaymentsPanel } from "./SuggestedPaymentsPanel";
import { Bell, BellOff, BellRing, Plus, CalendarClock, AlertCircle, Clock, CalendarDays, Calendar } from "lucide-react";
import { getHorizonSummary } from "./dashboard/PaymentsTimelineWidget";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { formatMoney } from "../utils/format";

interface PaymentsViewProps {
  profile: Profile;
  selectedDate: Date;
  onOpenPaymentModal: (payment?: Payment) => void;
  onTogglePaymentStatus: (paymentId: string) => void;
  onAddPayment: (payment: any) => void;
  onDeletePayment: (paymentId: string, mode?: "payment-only" | "payment-and-linked-transaction") => void;
  calendarToken: string | null;
  onTriggerCalendarAi: (p: Payment) => void;
}

export function PaymentsView({
  profile,
  selectedDate,
  onOpenPaymentModal,
  onTogglePaymentStatus,
  onAddPayment,
  onDeletePayment,
  calendarToken,
  onTriggerCalendarAi
}: PaymentsViewProps) {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied"
  );
  const [notificationStatusMsg, setNotificationStatusMsg] = useState<string>("");
  const [paidByFilter, setPaidByFilter] = useState<"all" | "me" | "partner" | "joint">("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "overdue" | "today" | "week" | "month">("all");
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  useScrollLock(!!paymentToDelete);
  useFocusTrap(deleteModalRef, !!paymentToDelete, () => setPaymentToDelete(null));

  const handleEnableNotifications = async () => {
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        setNotificationStatusMsg("Powiadomienia zostały pomyślnie aktywowane!");
        // Instantly trigger a confirmation notification
        new Notification("Aplikacja Saldo", {
          body: "Powiadomienia przeglądarkowe zostały włączone! Będziemy Cię informować o zbliżających się płatnościach. 👍",
        });
        setTimeout(() => setNotificationStatusMsg(""), 5000);
      } else if (permission === "denied") {
        setNotificationStatusMsg("Uprawnienia zostały odrzucone lub zablokowane w przeglądarce.");
        setTimeout(() => setNotificationStatusMsg(""), 5000);
      }
    } catch (e) {
      console.error("Błąd przy włączaniu powiadomień:", e);
    }
  };

  // Helper to calculate days remaining and badge details for payments
  const getDueStatus = (dueDateStr: string, isPaid: boolean) => {
    if (isPaid) return { label: null, badgeClass: "" };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pDate = new Date(`${dueDateStr}T00:00:00`);
    const diffTime = pDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return {
        label: "Przeterminowane!",
        badgeClass: "bg-danger-subtle text-danger border-danger/20 text-xs font-bold shadow-sm"
      };
    } else if (diffDays === 0) {
      return {
        label: "Dzisiaj!",
        badgeClass: "bg-danger-subtle text-danger border-danger/20 animate-pulse text-xs font-bold"
      };
    } else if (diffDays === 1) {
      return {
        label: "Jutro",
        badgeClass: "bg-danger-subtle text-danger border-danger/20 text-xs font-bold"
      };
    } else if (diffDays <= 3) {
      return {
        label: `Za ${diffDays} dni`,
        badgeClass: "bg-warning-subtle text-warning border-warning/20 text-xs font-bold"
      };
    }
    return {
      label: null,
      badgeClass: ""
    };
  };

  const { unpaidCount, totalUnpaidSum } = React.useMemo(() => {
    let count = 0;
    let sum = 0;
    for (const p of profile.payments) {
      if (p.status !== "Opłacono") {
        count++;
        sum += p.amount;
      }
    }
    return { unpaidCount: count, totalUnpaidSum: sum };
  }, [profile.payments]);

  const horizonSummary = React.useMemo(() => {
    return getHorizonSummary(profile.payments);
  }, [profile.payments]);

  const filteredPayments = React.useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const todayTime = todayDate.getTime();

    return profile.payments.filter(p => {
      if (profile.kind === "shared" && paidByFilter !== "all") {
        if (p.paidBy !== paidByFilter) return false;
      }
      
      if (timeFilter !== "all") {
        if (p.status === "Opłacono") return false;
        const pDate = new Date(`${p.dueDate}T00:00:00`);
        const diffTime = pDate.getTime() - todayTime;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (timeFilter === "overdue" && diffDays >= 0) return false;
        if (timeFilter === "today" && diffDays !== 0) return false;
        if (timeFilter === "week" && (diffDays < 0 || diffDays > 6)) return false;
        if (timeFilter === "month" && (diffDays < 0 || diffDays > 29)) return false;
      }
      
      return true;
    });
  }, [profile.payments, profile.kind, paidByFilter, timeFilter]);

  const sortedPayments = React.useMemo(() => {
    return [...filteredPayments].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "Do opłacenia" ? -1 : 1;
      }
      return a.dueDate.localeCompare(b.dueDate);
    });
  }, [filteredPayments]);

  return (
    <div className="space-y-6" id="payments-view-container">
      {/* Overview header + CTA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-2 p-5 rounded-2xl border border-border shadow-lg">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-text-main uppercase tracking-wider truncate" title="Rachunki i Subskrypcje">
              Rachunki i Subskrypcje
            </h3>
            {unpaidCount > 0 && (
              <span className="text-xs bg-danger-subtle text-danger border border-danger/20 px-2 py-0.5 rounded-full font-bold">
                {unpaidCount} do opłacenia
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted truncate">
            Śledź okresowe opłaty, abonamenty i kredyty, by nigdy nie zalegać z płatnościami.
          </p>
        </div>
        <button
          onClick={() => onOpenPaymentModal()}
          className="bg-brand text-text-inverse border border-brand font-bold py-2.5 px-4 rounded-xl hover:bg-brand-hover active:scale-[0.98] transition-all shadow-sm text-xs flex items-center gap-1.5 cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring"
          id="btn-add-payment"
        >
          <Plus className="w-4 h-4" />
          <span>Dodaj nową opłatę</span>
        </button>
      </div>

      {/* 4-Pillar Horizon Cashflow Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Overdue */}
        <button
          onClick={() => setTimeFilter(timeFilter === "overdue" ? "all" : "overdue")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-sm ${
            timeFilter === "overdue"
              ? "bg-danger-subtle border-danger ring-2 ring-danger/20"
              : "bg-surface border-border hover:border-danger/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-danger mb-1">
            <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Zaległe</span>
            <span className="bg-danger/10 px-2 py-0.5 rounded-full">{horizonSummary.overdue.count}</span>
          </div>
          <div className="text-lg font-black text-danger truncate" title={formatMoney(horizonSummary.overdue.total, profile.currency || "PLN")}>
            {formatMoney(horizonSummary.overdue.total, profile.currency || "PLN")}
          </div>
          <p className="text-[10px] text-text-faint mt-1">Wymagają natychmiastowej spłaty</p>
        </button>

        {/* Today */}
        <button
          onClick={() => setTimeFilter(timeFilter === "today" ? "all" : "today")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-sm ${
            timeFilter === "today"
              ? "bg-warning-subtle border-warning ring-2 ring-warning/20"
              : "bg-surface border-border hover:border-warning/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-warning mb-1">
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Na dzisiaj</span>
            <span className="bg-warning/10 px-2 py-0.5 rounded-full">{horizonSummary.today.count}</span>
          </div>
          <div className="text-lg font-black text-warning truncate" title={formatMoney(horizonSummary.today.total, profile.currency || "PLN")}>
            {formatMoney(horizonSummary.today.total, profile.currency || "PLN")}
          </div>
          <p className="text-[10px] text-text-faint mt-1">Termin upływa dzisiaj</p>
        </button>

        {/* Next 7 Days */}
        <button
          onClick={() => setTimeFilter(timeFilter === "week" ? "all" : "week")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-sm ${
            timeFilter === "week"
              ? "bg-brand-subtle border-brand ring-2 ring-brand/20"
              : "bg-surface border-border hover:border-brand/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-brand mb-1">
            <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Najbliższe 7 dni</span>
            <span className="bg-brand/10 px-2 py-0.5 rounded-full">{horizonSummary.week.count}</span>
          </div>
          <div className="text-lg font-black text-brand truncate" title={formatMoney(horizonSummary.week.total, profile.currency || "PLN")}>
            {formatMoney(horizonSummary.week.total, profile.currency || "PLN")}
          </div>
          <p className="text-[10px] text-text-faint mt-1">Obciążenie tego tygodnia</p>
        </button>

        {/* Next 30 Days */}
        <button
          onClick={() => setTimeFilter(timeFilter === "month" ? "all" : "month")}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-sm ${
            timeFilter === "month"
              ? "bg-surface-2 border-text-main ring-2 ring-border"
              : "bg-surface border-border hover:border-text-muted"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-text-muted mb-1">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Najbliższe 30 dni</span>
            <span className="bg-surface-2 px-2 py-0.5 rounded-full">{horizonSummary.month.count}</span>
          </div>
          <div className="text-lg font-black text-text-main truncate" title={formatMoney(horizonSummary.month.total, profile.currency || "PLN")}>
            {formatMoney(horizonSummary.month.total, profile.currency || "PLN")}
          </div>
          <p className="text-[10px] text-text-faint mt-1">Miesięczny horyzont płynności</p>
        </button>
      </div>

      {/* Browser Notifications Setup Card */}
      <div className="bg-surface rounded-2xl border border-border shadow-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className={`p-2.5 rounded-xl shrink-0 ${
            notificationPermission === "granted" 
              ? "bg-brand-subtle text-brand"
              : notificationPermission === "denied"
                ? "bg-danger-subtle text-danger"
                : "bg-warning-subtle text-warning"
          }`}>
            {notificationPermission === "granted" ? (
              <Bell className="w-5 h-5 text-brand" />
            ) : notificationPermission === "denied" ? (
              <BellOff className="w-5 h-5 text-danger" />
            ) : (
              <BellRing className="w-5 h-5 text-warning animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-text-main truncate" title="Powiadomienia o płatnościach">Powiadomienia o płatnościach</h4>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed truncate" title={
              notificationPermission === "granted"
                ? "Włączone! Otrzymasz natychmiastowe powiadomienie na pulpicie, gdy zbliży się termin płatności rachunku (do 3 dni wstecz)."
                : notificationPermission === "denied"
                  ? "Powiadomienia są wyłączone lub zablokowane. Aby otrzymywać przypomnienia o rachunkach, odblokuj uprawnienia w pasku adresu przeglądarki."
                  : "Chcesz dostawać powiadomienia na pulpicie o zbliżających się rachunkach? Włącz powiadomienia jednym kliknięciem."
            }>
              {notificationPermission === "granted"
                ? "Włączone! Otrzymasz natychmiastowe powiadomienie na pulpicie, gdy zbliży się termin płatności rachunku (do 3 dni wstecz)."
                : notificationPermission === "denied"
                  ? "Powiadomienia są wyłączone lub zablokowane. Aby otrzymywać przypomnienia o rachunkach, odblokuj uprawnienia w pasku adresu przeglądarki."
                  : "Chcesz dostawać powiadomienia na pulpicie o zbliżających się rachunkach? Włącz powiadomienia jednym kliknięciem."}
            </p>
            {notificationStatusMsg && (
              <p className={`text-xs font-semibold mt-2 ${notificationPermission === "granted" ? "text-brand" : "text-danger"}`}>
                {notificationStatusMsg}
              </p>
            )}
          </div>
        </div>
        
        {notificationPermission !== "granted" && (
          <button
            onClick={handleEnableNotifications}
            className={`font-bold py-2.5 px-4 rounded-lg text-xs active:scale-[0.98] transition-all cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring ${
              notificationPermission === "denied"
                ? "bg-surface-2 text-text-muted hover:bg-surface-offset hover:text-text-main border border-border"
                : "bg-brand text-text-inverse hover:bg-brand-hover shadow-sm border border-brand"
            }`}
            id="btn-enable-desktop-notifications"
          >
            {notificationPermission === "denied" ? "Zmień uprawnienia" : "🔔 Włącz powiadomienia"}
          </button>
        )}
      </div>

      <SuggestedPaymentsPanel currency={profile.currency} payments={profile.payments}
        selectedDate={selectedDate}
        onAddPayment={onAddPayment}
      />

      <div className="bg-surface rounded-2xl border border-border shadow-lg p-6 min-w-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4 min-w-0">
          <h3 className="text-base font-bold text-text-main shrink-0 truncate" title="Lista Twoich opłat">Lista Twoich opłat</h3>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto min-w-0">
            <div className="flex flex-wrap bg-surface p-1 rounded-xl w-full sm:w-auto max-w-full border border-border">
              <button
                onClick={() => setTimeFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                  timeFilter === "all" ? "bg-brand-subtle text-brand shadow-sm border border-brand/20" : "text-text-muted hover:text-text-main"
                }`}
              >Wszystkie</button>
              <button
                onClick={() => setTimeFilter("overdue")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                  timeFilter === "overdue" ? "bg-danger-subtle text-danger shadow-sm border border-danger/20" : "text-text-muted hover:text-danger"
                }`}
              >Zaległe</button>
              <button
                onClick={() => setTimeFilter("today")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                  timeFilter === "today" ? "bg-warning-subtle text-warning shadow-sm border border-warning/20" : "text-text-muted hover:text-warning"
                }`}
              >Dzisiaj</button>
              <button
                onClick={() => setTimeFilter("week")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                  timeFilter === "week" ? "bg-brand-subtle text-brand shadow-sm border border-brand/20" : "text-text-muted hover:text-text-main"
                }`}
              >7 dni</button>
              <button
                onClick={() => setTimeFilter("month")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                  timeFilter === "month" ? "bg-surface-2 text-text-main shadow-sm border border-border" : "text-text-muted hover:text-text-main"
                }`}
              >30 dni</button>
            </div>
            {profile.kind === "shared" && (
              <div className="flex flex-wrap bg-surface p-1 rounded-xl w-full sm:w-auto max-w-full border border-border">
                <button
                  onClick={() => setPaidByFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                    paidByFilter === "all" ? "bg-brand-subtle text-brand shadow-sm border border-brand/20" : "text-text-muted hover:text-text-main"
                  }`}
                >
                  Wszystkie role
                </button>
                <button
                  onClick={() => setPaidByFilter("me")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                    paidByFilter === "me" ? "bg-brand-subtle text-brand shadow-sm border border-brand/20" : "text-text-muted hover:text-text-main"
                  }`}
                >
                  Ja
                </button>
                <button
                  onClick={() => setPaidByFilter("partner")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                    paidByFilter === "partner" ? "bg-brand-subtle text-brand shadow-sm border border-brand/20" : "text-text-muted hover:text-text-main"
                  }`}
                >
                  Partner
                </button>
                <button
                  onClick={() => setPaidByFilter("joint")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer ${
                    paidByFilter === "joint" ? "bg-brand-subtle text-brand shadow-sm border border-brand/20" : "text-text-muted hover:text-text-main"
                  }`}
                >Wspólne</button>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          {sortedPayments.length === 0 ? (
            <div className="text-center py-10">
              {profile.payments.length > 0 ? (
                <p className="text-sm text-text-muted">Brak płatności pasujących do wybranego filtra (np. "Kto zapłacił").</p>
              ) : (
                <>
                  <p className="text-sm text-text-muted">Brak zdefiniowanych płatności.</p>
                  <button
                    onClick={() => onOpenPaymentModal()}
                    className="text-brand text-xs font-semibold hover:underline mt-1 active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer rounded"
                  >
                    Dodaj swój pierwszy rachunek już teraz &rarr;
                  </button>
                </>
              )}
            </div>
          ) : (
            sortedPayments.map((p) => {
              const isPaid = p.status === "Opłacono";
              return (
                <div
                  key={p.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition min-w-0 ${
                    isPaid ? "bg-surface/20 border-border/30 opacity-75" : "bg-surface border-border shadow-sm hover:border-brand/50"
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3 sm:mb-0 min-w-0">
                    <span
                      className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                        isPaid ? "bg-brand-subtle text-brand" : "bg-danger-subtle text-danger"
                      }`}
                    >
                      {isPaid ? "✓" : "◷"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <h4 className="text-sm font-bold text-text-main flex items-center gap-1.5 min-w-0 max-w-full">
                          <span className="truncate" title={p.name}>{p.name}</span>
                          {profile.kind === "shared" && p.paidBy && (
                            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-surface-2 text-text-muted border border-border shrink-0 truncate max-w-[80px]" title={p.paidBy === 'me' ? 'Ja' : p.paidBy === 'partner' ? 'Partner' : 'Wspólne'}>
                              {p.paidBy === 'me' ? 'Ja' : p.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                              {p.splitMode === 'equal' ? ' (50-50)' : ''}
                            </span>
                          )}
                        </h4>
                        {(() => {
                          const status = getDueStatus(p.dueDate, isPaid);
                          if (status.label) {
                            return (
                              <span className={`px-2 py-0.5 rounded-md border shrink-0 truncate max-w-[100px] ${status.badgeClass}`} id={`payment-item-badge-${p.id}`} title={status.label}>
                                {status.label}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <p className="text-xs text-text-muted truncate" title={`Termin płatności: ${formatDate(p.dueDate)}`}>Termin płatności: {formatDate(p.dueDate)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 mt-3 sm:mt-0">
                    <span className="text-sm font-bold text-text-main whitespace-nowrap shrink-0" title={formatMoney(p.amount, p.currency || profile?.currency || 'PLN')}>{formatMoney(p.amount, p.currency || profile?.currency || 'PLN')}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isPaid && (
                        <button
                          onClick={() => onTriggerCalendarAi(p)}
                          className="bg-surface hover:bg-surface-2 text-text-main font-bold px-3 py-1.5 rounded-lg active:scale-[0.98] transition-all text-xs flex items-center gap-1.5 cursor-pointer border border-border shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring"
                          title="Dodaj przypomnienie do Kalendarza Google (AI)"
                          id={`btn-calendar-ai-${p.id}`}
                        >
                          <span className="truncate max-w-[120px]">🗓️ Zaplanuj AI</span>
                        </button>
                      )}
                      <button
                        onClick={() => onTogglePaymentStatus(p.id)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all shrink-0 max-w-[120px] truncate focus-visible:ring-2 cursor-pointer ${
                          isPaid
                            ? "bg-brand-subtle text-brand hover:bg-brand/20 focus-visible:ring-focus-ring"
                            : "bg-surface border border-border text-text-main hover:bg-brand-subtle hover:text-brand hover:border-brand/20 focus-visible:ring-focus-ring"
                        }`}
                        id={`btn-toggle-payment-${p.id}`}
                        title={isPaid ? "Opłacono" : "Zaznacz jako opłacone"}
                      >
                        {isPaid ? "Opłacono" : "Zaznacz jako opłacone"}
                      </button>
                      <button
                        onClick={() => onOpenPaymentModal(p)}
                        className="p-1.5 text-text-muted hover:text-text-main rounded active:scale-[0.98] transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                        title="Edytuj rachunek"
                        aria-label="Edytuj rachunek"
                        id={`btn-edit-payment-${p.id}`}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setPaymentToDelete(p)}
                        className="p-1.5 text-text-muted hover:text-danger rounded active:scale-[0.98] transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                        title="Usuń rachunek"
                        aria-label="Usuń rachunek"
                        id={`btn-delete-payment-${p.id}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {paymentToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            ref={deleteModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-payment-title"
            className="bg-surface rounded-2xl max-w-sm w-full p-6 shadow-xl border border-border/30 animate-in fade-in zoom-in-95 duration-200"
          >
            <h3 id="delete-payment-title" className="text-xl font-bold text-text-main mb-2">Usunąć płatność?</h3>
            
            {profile.transactions.some(tx => tx.sourcePaymentId === paymentToDelete.id) ? (
              <>
                <p className="text-sm text-text-muted mb-6">
                  Ta płatność ma powiązaną transakcję w historii wydatków. Możesz usunąć tylko płatność albo płatność razem z transakcją.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      onDeletePayment(paymentToDelete.id, "payment-and-linked-transaction");
                      setPaymentToDelete(null);
                    }}
                    className="w-full bg-danger-subtle text-danger font-bold py-2.5 rounded-xl border border-danger/20 hover:bg-danger-subtle active:scale-[0.98] transition-all text-sm focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                  >
                    Usuń płatność i transakcję
                  </button>
                  <button
                    onClick={() => {
                      onDeletePayment(paymentToDelete.id, "payment-only");
                      setPaymentToDelete(null);
                    }}
                    className="w-full bg-surface border border-border text-text-main font-bold py-2.5 rounded-xl hover:bg-surface-2 active:scale-[0.98] transition-all text-sm focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                  >
                    Usuń tylko płatność
                  </button>
                  <button
                    onClick={() => setPaymentToDelete(null)}
                    className="w-full text-text-muted font-bold py-2 hover:text-text-main active:scale-[0.98] transition-colors text-sm focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer rounded-xl"
                  >
                    Anuluj
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-text-muted mb-6">
                  Tej operacji nie da się łatwo cofnąć.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentToDelete(null)}
                    className="flex-1 bg-surface border border-border text-text-main font-bold py-2 rounded-xl hover:bg-surface-2 active:scale-[0.98] transition-all text-sm focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={() => {
                      onDeletePayment(paymentToDelete.id, "payment-only");
                      setPaymentToDelete(null);
                    }}
                    className="flex-1 bg-danger-subtle text-danger border border-danger/20 font-bold py-2 rounded-xl hover:bg-danger-subtle active:scale-[0.98] transition-all text-sm shadow-md focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                  >
                    Usuń
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
