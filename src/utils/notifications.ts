import { Payment } from "../types";

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  const permission = await Notification.requestPermission();
  return permission;
}

export function checkAndNotifyPayments(payments: Payment[]) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = payments.filter((p) => {
    if (p.status === "Opłacono") return false;
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    const diffTime = pDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Notify if due today, tomorrow, or in the next 3 days
    return diffDays >= 0 && diffDays <= 3;
  });

  if (upcoming.length === 0) return;

  // Check if we already notified about these specific payments in this session to prevent spamming
  const notifiedKeysStr = sessionStorage.getItem("saldo_notified_payments");
  const notifiedKeys: string[] = notifiedKeysStr ? JSON.parse(notifiedKeysStr) : [];

  // Filter out payments that have already been notified
  const toNotify = upcoming.filter((p) => !notifiedKeys.includes(`${p.id}_${p.status}_${p.dueDate}`));

  if (toNotify.length === 0) return;

  // Update notified list
  const newNotifiedKeys = [...notifiedKeys, ...toNotify.map((p) => `${p.id}_${p.status}_${p.dueDate}`)];
  sessionStorage.setItem("saldo_notified_payments", JSON.stringify(newNotifiedKeys));

  // Send notification
  if (toNotify.length === 1) {
    const p = toNotify[0];
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    const diffDays = Math.ceil((pDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let timeLabel = "";
    if (diffDays === 0) timeLabel = "dzisiaj";
    else if (diffDays === 1) timeLabel = "jutro";
    else timeLabel = `za ${diffDays} dni`;

    new Notification("Zbliżający się termin płatności!", {
      body: `Rachunek "${p.name}" na kwotę ${p.amount.toFixed(2)} PLN jest do opłacenia ${timeLabel} (${p.dueDate}).`,
    });
  } else {
    const listNames = toNotify.map((p) => p.name).join(", ");
    new Notification("Masz zbliżające się płatności!", {
      body: `Do opłacenia masz ${toNotify.length} rachunki: ${listNames}.`,
    });
  }
}
