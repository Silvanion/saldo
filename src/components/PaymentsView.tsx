import React, { useState } from "react";
import { Profile, Payment } from "../types";
import { formatDate, requestNotificationPermission, getLocalDateIso } from "../utils";
import { SuggestedPaymentsPanel } from "./SuggestedPaymentsPanel";
import { Bell, BellOff, BellRing } from "lucide-react";
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
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

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
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold shadow-sm"
      };
    } else if (diffDays === 0) {
      return {
        label: "Dzisiaj!",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 animate-pulse text-[10px] font-bold"
      };
    } else if (diffDays === 1) {
      return {
        label: "Jutro",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold"
      };
    } else if (diffDays <= 3) {
      return {
        label: `Za ${diffDays} dni`,
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold"
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
        
        if (timeFilter === "today" && diffDays > 0) return false;
        if (timeFilter === "week" && diffDays > 7) return false;
        if (timeFilter === "month" && diffDays > 30) return false;
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
      {/* Overview ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50 p-5 rounded-2xl border border-emerald-200  shadow-lg">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-text-main uppercase tracking-wider mb-1 truncate" title="Rachunki i Subskrypcje">Rachunki i Subskrypcje</h3>
          <p className="text-xs text-text-muted truncate" title="Śledź okresowe opłaty, abonamenty i kredyty, by nigdy nie zalegać z płatnościami.">
            Śledź okresowe opłaty, abonamenty i kredyty, by nigdy nie zalegać z płatnościami.
          </p>
        </div>
        <div className="flex justify-between sm:justify-end items-center gap-4 flex-wrap min-w-0">
          <div className="text-right mr-2 min-w-0">
            <span className="block text-[10px] uppercase font-semibold text-text-muted truncate" title="Do opłacenia">Do opłacenia</span>
            <span className="text-lg font-bold text-rose-700 block truncate max-w-full" title={`${unpaidCount} rachunki (${formatMoney(totalUnpaidSum, profile?.currency || 'PLN')})`}>
              {unpaidCount} rachunki ({formatMoney(totalUnpaidSum, profile?.currency || 'PLN')})
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => onOpenPaymentModal()}
              className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold py-2 px-4 rounded-xl hover:bg-emerald-100 active:scale-[0.98] transition-all shadow-sm text-xs flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              id="btn-add-payment"
            >
              <span>＋ Dodaj opłatę</span>
            </button>
          </div>
        </div>
      </div>

      {/* Browser Notifications Setup Card */}
      <div className="bg-surface rounded-2xl border border-border shadow-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className={`p-2.5 rounded-xl shrink-0 ${
            notificationPermission === "granted" 
              ? "bg-emerald-50 text-emerald-700" 
              : notificationPermission === "denied"
                ? "bg-rose-50 text-rose-700"
                : "bg-amber-50 text-amber-700"
          }`}>
            {notificationPermission === "granted" ? (
              <Bell className="w-5 h-5 text-emerald-700" />
            ) : notificationPermission === "denied" ? (
              <BellOff className="w-5 h-5" />
            ) : (
              <BellRing className="w-5 h-5 animate-pulse" />
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
              <p className={`text-xs font-semibold mt-2 ${notificationPermission === "granted" ? "text-emerald-700" : "text-rose-700"}`}>
                {notificationStatusMsg}
              </p>
            )}
          </div>
        </div>
        
        {notificationPermission !== "granted" && (
          <button
            onClick={handleEnableNotifications}
            className={`font-bold py-2.5 px-4 rounded-lg text-xs active:scale-[0.98] transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
              notificationPermission === "denied"
                ? "bg-slate-100 text-text-muted hover:bg-slate-200 border border-border"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-50 shadow-sm border border-emerald-200"
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
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer ${
                  timeFilter === "all" ? "bg-emerald-50 text-emerald-700 dark:bg-slate-700 dark:text-white shadow-sm border border-emerald-200 dark:border-transparent" : "text-text-muted hover:text-text-main"
                }`}
              >Wszystkie</button>
              <button
                onClick={() => setTimeFilter("today")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer ${
                  timeFilter === "today" ? "bg-emerald-50 text-emerald-700 dark:bg-slate-700 dark:text-white shadow-sm border border-emerald-200 dark:border-transparent" : "text-text-muted hover:text-text-main"
                }`}
              >Dzisiaj/Zaległe</button>
              <button
                onClick={() => setTimeFilter("week")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer ${
                  timeFilter === "week" ? "bg-emerald-50 text-emerald-700 dark:bg-slate-700 dark:text-white shadow-sm border border-emerald-200 dark:border-transparent" : "text-text-muted hover:text-text-main"
                }`}
              >Ten tydzień</button>
              <button
                onClick={() => setTimeFilter("month")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer ${
                  timeFilter === "month" ? "bg-emerald-50 text-emerald-700 dark:bg-slate-700 dark:text-white shadow-sm border border-emerald-200 dark:border-transparent" : "text-text-muted hover:text-text-main"
                }`}
              >Ten miesiąc</button>
            </div>
            {profile.kind === "shared" && (
              <div className="flex flex-wrap bg-surface p-1 rounded-xl w-full sm:w-auto max-w-full border border-border">
                <button
                  onClick={() => setPaidByFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer ${
                    paidByFilter === "all" ? "bg-emerald-50 text-emerald-700 dark:bg-slate-700 dark:text-white shadow-sm border border-emerald-200 dark:border-transparent" : "text-text-muted hover:text-text-main"
                  }`}
                >
                  Wszystkie role
                </button>
                <button
                  onClick={() => setPaidByFilter("me")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer ${
                    paidByFilter === "me" ? "bg-emerald-50 text-emerald-700 dark:bg-slate-700 dark:text-white shadow-sm border border-emerald-200 dark:border-transparent" : "text-text-muted hover:text-text-main"
                  }`}
                >
                  Ja
                </button>
                <button
                  onClick={() => setPaidByFilter("partner")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer ${
                    paidByFilter === "partner" ? "bg-emerald-50 text-emerald-700 dark:bg-slate-700 dark:text-white shadow-sm border border-emerald-200 dark:border-transparent" : "text-text-muted hover:text-text-main"
                  }`}
                >
                  Partner
                </button>
                <button
                  onClick={() => setPaidByFilter("joint")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer ${
                    paidByFilter === "joint" ? "bg-emerald-50 text-emerald-700 dark:bg-slate-700 dark:text-white shadow-sm border border-emerald-200 dark:border-transparent" : "text-text-muted hover:text-text-main"
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
                    className="text-emerald-700 text-xs font-semibold hover:underline mt-1 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer rounded"
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
                    isPaid ? "bg-surface/20 border-border/30 opacity-75" : "bg-surface border-border shadow-sm hover:border-emerald-500/50"
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3 sm:mb-0 min-w-0">
                    <span
                      className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                        isPaid ? "bg-teal-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {isPaid ? "✓" : "◷"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <h4 className="text-sm font-bold text-text-main flex items-center gap-1.5 min-w-0 max-w-full">
                          <span className="truncate" title={p.name}>{p.name}</span>
                          {profile.kind === "shared" && p.paidBy && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm bg-slate-100 text-slate-700 border border-border shrink-0 truncate max-w-[80px]" title={p.paidBy === 'me' ? 'Ja' : p.paidBy === 'partner' ? 'Partner' : 'Wspólne'}>
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
                          className="bg-surface/50 hover:bg-slate-100 text-text-main font-bold px-3 py-1.5 rounded-lg active:scale-[0.98] transition-all text-xs flex items-center gap-1.5 cursor-pointer border border-border shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                          title="Dodaj przypomnienie do Kalendarza Google (AI)"
                          id={`btn-calendar-ai-${p.id}`}
                        >
                          <span className="truncate max-w-[120px]">🗓️ Zaplanuj AI</span>
                        </button>
                      )}
                      <button
                        onClick={() => onTogglePaymentStatus(p.id)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all shrink-0 max-w-[120px] truncate focus-visible:outline-none focus-visible:ring-2 cursor-pointer ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 hover:bg-[#d1e8e2] focus-visible:ring-emerald-500/50"
                            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 focus-visible:ring-amber-500/50"
                        }`}
                        id={`btn-toggle-payment-${p.id}`}
                        title={isPaid ? "Opłacono" : "Zaznacz jako opłacone"}
                      >
                        {isPaid ? "Opłacono" : "Zaznacz jako opłacone"}
                      </button>
                      <button
                        onClick={() => onOpenPaymentModal(p)}
                        className="p-1.5 text-text-muted hover:text-text-main rounded active:scale-[0.98] transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 cursor-pointer"
                        title="Edytuj rachunek"
                        aria-label="Edytuj rachunek"
                        id={`btn-edit-payment-${p.id}`}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setPaymentToDelete(p)}
                        className="p-1.5 text-text-muted hover:text-red-500 rounded active:scale-[0.98] transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 cursor-pointer"
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
        <div className="fixed inset-0 bg-black/80  z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-text-main mb-2">Usunąć płatność?</h3>
            
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
                    className="w-full bg-rose-50 text-rose-700 font-bold py-2.5 rounded-xl border border-rose-200 hover:bg-rose-100 active:scale-[0.98] transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 cursor-pointer"
                  >
                    Usuń płatność i transakcję
                  </button>
                  <button
                    onClick={() => {
                      onDeletePayment(paymentToDelete.id, "payment-only");
                      setPaymentToDelete(null);
                    }}
                    className="w-full bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-200 active:scale-[0.98] transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50 cursor-pointer"
                  >
                    Usuń tylko płatność
                  </button>
                  <button
                    onClick={() => setPaymentToDelete(null)}
                    className="w-full text-text-muted font-bold py-2 hover:text-slate-700 active:scale-[0.98] transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50 cursor-pointer rounded-xl"
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
                    className="flex-1 bg-slate-100 text-slate-700 font-bold py-2 rounded-xl hover:bg-slate-200 active:scale-[0.98] transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50 cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={() => {
                      onDeletePayment(paymentToDelete.id, "payment-only");
                      setPaymentToDelete(null);
                    }}
                    className="flex-1 bg-rose-50 text-rose-700 border border-rose-200 font-bold py-2 rounded-xl hover:bg-rose-100 active:scale-[0.98] transition-all text-sm shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 cursor-pointer"
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
