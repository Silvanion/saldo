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
        badgeClass: "bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold shadow-sm"
      };
    } else if (diffDays === 0) {
      return {
        label: "Dzisiaj!",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-200 animate-pulse text-[10px] font-bold"
      };
    } else if (diffDays === 1) {
      return {
        label: "Jutro",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold"
      };
    } else if (diffDays <= 3) {
      return {
        label: `Za ${diffDays} dni`,
        badgeClass: "bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#e7f3f0] p-5 rounded-2xl border border-[#137566]/20">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">Rachunki i Subskrypcje</h3>
          <p className="text-xs text-slate-600">
            Śledź okresowe opłaty, abonamenty i kredyty, by nigdy nie zalegać z płatnościami.
          </p>
        </div>
        <div className="flex justify-between sm:justify-end items-center gap-4 flex-wrap">
          <div className="text-right mr-2">
            <span className="block text-[10px] uppercase font-semibold text-slate-500">Do opłacenia</span>
            <span className="text-lg font-bold text-[#d55e50]">
              {unpaidCount} rachunki ({formatMoney(totalUnpaidSum, profile?.currency || 'PLN')})
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onOpenPaymentModal()}
              className="bg-[#137566] text-white font-bold py-2 px-4 rounded-xl hover:bg-[#0f5d51] transition shadow-md text-xs flex items-center gap-1 cursor-pointer"
              id="btn-add-payment"
            >
              <span>＋ Dodaj opłatę</span>
            </button>
          </div>
        </div>
      </div>

      {/* Browser Notifications Setup Card */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl ${
            notificationPermission === "granted" 
              ? "bg-[#e7f3f0] text-[#137566]" 
              : notificationPermission === "denied"
                ? "bg-rose-50 text-rose-600"
                : "bg-amber-50 text-amber-700"
          }`}>
            {notificationPermission === "granted" ? (
              <Bell className="w-5 h-5 text-[#137566]" />
            ) : notificationPermission === "denied" ? (
              <BellOff className="w-5 h-5" />
            ) : (
              <BellRing className="w-5 h-5 animate-pulse" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Powiadomienia o płatnościach</h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              {notificationPermission === "granted"
                ? "Włączone! Otrzymasz natychmiastowe powiadomienie na pulpicie, gdy zbliży się termin płatności rachunku (do 3 dni wstecz)."
                : notificationPermission === "denied"
                  ? "Powiadomienia są wyłączone lub zablokowane. Aby otrzymywać przypomnienia o rachunkach, odblokuj uprawnienia w pasku adresu przeglądarki."
                  : "Chcesz dostawać powiadomienia na pulpicie o zbliżających się rachunkach? Włącz powiadomienia jednym kliknięciem."}
            </p>
            {notificationStatusMsg && (
              <p className={`text-xs font-semibold mt-2 ${notificationPermission === "granted" ? "text-[#137566]" : "text-rose-600"}`}>
                {notificationStatusMsg}
              </p>
            )}
          </div>
        </div>
        
        {notificationPermission !== "granted" && (
          <button
            onClick={handleEnableNotifications}
            className={`font-bold py-2.5 px-4 rounded-lg text-xs transition cursor-pointer shrink-0 ${
              notificationPermission === "denied"
                ? "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                : "bg-[#137566] text-white hover:bg-[#0f5d51] shadow-md"
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

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
          <h3 className="text-base font-bold text-slate-900">Lista Twoich opłat</h3>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto max-w-full overflow-x-auto whitespace-nowrap hide-scrollbar border border-slate-200">
              <button
                onClick={() => setTimeFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                  timeFilter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-800"
                }`}
              >Wszystkie</button>
              <button
                onClick={() => setTimeFilter("today")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                  timeFilter === "today" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-800"
                }`}
              >Dzisiaj/Zaległe</button>
              <button
                onClick={() => setTimeFilter("week")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                  timeFilter === "week" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-800"
                }`}
              >Ten tydzień</button>
              <button
                onClick={() => setTimeFilter("month")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                  timeFilter === "month" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-800"
                }`}
              >Ten miesiąc</button>
            </div>
            {profile.kind === "shared" && (
              <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto max-w-full overflow-x-auto whitespace-nowrap hide-scrollbar border border-slate-200">
                <button
                  onClick={() => setPaidByFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                    paidByFilter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  Wszystkie role
                </button>
                <button
                  onClick={() => setPaidByFilter("me")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                    paidByFilter === "me" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  Ja
                </button>
                <button
                  onClick={() => setPaidByFilter("partner")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                    paidByFilter === "partner" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  Partner
                </button>
                <button
                  onClick={() => setPaidByFilter("joint")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                    paidByFilter === "joint" ? "bg-white text-slate-800 shadow-sm" : "text-slate-600 hover:text-slate-800"
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
                <p className="text-sm text-slate-500">Brak płatności pasujących do wybranego filtra (np. "Kto zapłacił").</p>
              ) : (
                <>
                  <p className="text-sm text-slate-500">Brak zdefiniowanych płatności.</p>
                  <button
                    onClick={() => onOpenPaymentModal()}
                    className="text-[#137566] text-xs font-semibold hover:underline mt-1"
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
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition ${
                    isPaid ? "bg-slate-50/50 border-slate-100 opacity-75" : "bg-white border-slate-200 shadow-sm hover:border-[#137566]/50"
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <span
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        isPaid ? "bg-teal-50 text-[#137566]" : "bg-rose-50 text-[#d55e50]"
                      }`}
                    >
                      {isPaid ? "✓" : "◷"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          {p.name}
                          {profile.kind === "shared" && p.paidBy && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-sm bg-slate-100 text-slate-700 border border-slate-200">
                              {p.paidBy === 'me' ? 'Ja' : p.paidBy === 'partner' ? 'Partner' : 'Wspólne'}
                              {p.splitMode === 'equal' ? ' (50-50)' : ''}
                            </span>
                          )}
                        </h4>
                        {(() => {
                          const status = getDueStatus(p.dueDate, isPaid);
                          if (status.label) {
                            return (
                              <span className={`px-2 py-0.5 rounded-md border ${status.badgeClass}`} id={`payment-item-badge-${p.id}`}>
                                {status.label}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <p className="text-xs text-slate-500">Termin płatności: {formatDate(p.dueDate)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="text-sm font-bold text-slate-800">{formatMoney(p.amount, p.currency || profile?.currency || 'PLN')}</span>
                    <div className="flex items-center gap-2">
                      {!isPaid && (
                        <button
                          onClick={() => onTriggerCalendarAi(p)}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg transition text-xs flex items-center gap-1.5 cursor-pointer border border-slate-200"
                          title="Dodaj przypomnienie do Kalendarza Google (AI)"
                          id={`btn-calendar-ai-${p.id}`}
                        >
                          <span>🗓️ Zaplanuj AI</span>
                        </button>
                      )}
                      <button
                        onClick={() => onTogglePaymentStatus(p.id)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isPaid
                            ? "bg-[#e7f3f0] text-[#137566] hover:bg-[#d1e8e2]"
                            : "bg-[#fff3dc] text-amber-800 hover:bg-[#137566] hover:text-white border border-transparent dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-700/50"
                        }`}
                        id={`btn-toggle-payment-${p.id}`}
                      >
                        {isPaid ? "Opłacono" : "Zaznacz jako opłacone"}
                      </button>
                      <button
                        onClick={() => onOpenPaymentModal(p)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 rounded transition"
                        title="Edytuj rachunek"
                        id={`btn-edit-payment-${p.id}`}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setPaymentToDelete(p)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded transition"
                        title="Usuń rachunek"
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Usunąć płatność?</h3>
            
            {profile.transactions.some(tx => tx.sourcePaymentId === paymentToDelete.id) ? (
              <>
                <p className="text-sm text-slate-600 mb-6">
                  Ta płatność ma powiązaną transakcję w historii wydatków. Możesz usunąć tylko płatność albo płatność razem z transakcją.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      onDeletePayment(paymentToDelete.id, "payment-and-linked-transaction");
                      setPaymentToDelete(null);
                    }}
                    className="w-full bg-rose-100 text-rose-700 font-bold py-2.5 rounded-xl hover:bg-rose-200 transition text-sm"
                  >
                    Usuń płatność i transakcję
                  </button>
                  <button
                    onClick={() => {
                      onDeletePayment(paymentToDelete.id, "payment-only");
                      setPaymentToDelete(null);
                    }}
                    className="w-full bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-200 transition text-sm"
                  >
                    Usuń tylko płatność
                  </button>
                  <button
                    onClick={() => setPaymentToDelete(null)}
                    className="w-full text-slate-500 font-bold py-2 hover:text-slate-700 transition text-sm"
                  >
                    Anuluj
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600 mb-6">
                  Tej operacji nie da się łatwo cofnąć.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentToDelete(null)}
                    className="flex-1 bg-slate-100 text-slate-700 font-bold py-2 rounded-xl hover:bg-slate-200 transition text-sm"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={() => {
                      onDeletePayment(paymentToDelete.id, "payment-only");
                      setPaymentToDelete(null);
                    }}
                    className="flex-1 bg-rose-600 text-white font-bold py-2 rounded-xl hover:bg-rose-700 transition text-sm shadow-md"
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
