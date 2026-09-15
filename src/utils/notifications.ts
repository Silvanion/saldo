import { Payment, Profile, SupportedCurrency } from "../types";
import { resolveCurrency } from "./format";

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  const permission = await Notification.requestPermission();
  return permission;
}

export function checkAndNotifyPayments(profile: Profile, appCurrency?: SupportedCurrency) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const payments = profile.payments || [];
  const upcoming = payments.filter((p) => {
    if (p.status === "Opłacono") return false;
    const pDate = new Date(`${p.dueDate}T00:00:00`);
    const diffTime = pDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
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

    const resolvedCur = resolveCurrency(p.currency, profile.currency, appCurrency);
    const title = "Zbliżający się termin płatności!";
    const body = `Rachunek "${p.name}" na kwotę ${p.amount.toFixed(2)} ${resolvedCur} jest do opłacenia ${timeLabel} (${p.dueDate}).`;
    
    if (window.electronAPI) {
      window.electronAPI.showNotification(title, body);
    } else {
      new Notification(title, { body });
    }
  } else {
    const listNames = toNotify.map((p) => p.name).join(", ");
    const title = "Masz zbliżające się płatności!";
    const body = `Do opłacenia masz ${toNotify.length} rachunki: ${listNames}.`;
    
    if (window.electronAPI) {
      window.electronAPI.showNotification(title, body);
    } else {
      new Notification(title, { body });
    }
  }
}
