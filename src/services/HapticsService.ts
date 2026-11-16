import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

export class HapticsService {
  /**
   * Lekkie stuknięcie wibracyjne (np. kliknięcie przycisku, zmiana widoku)
   */
  static async lightImpact(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {}
  }

  /**
   * Średnie stuknięcie wibracyjne (np. przełączenie przełącznika, zatwierdzenie)
   */
  static async mediumImpact(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {}
  }

  /**
   * Wibracja potwierdzająca sukces (np. pomyślne zapisanie transakcji lub odblokowanie)
   */
  static async success(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {}
  }

  /**
   * Wibracja sygnalizująca błąd lub ostrzeżenie (np. błędny PIN)
   */
  static async error(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch {}
  }
}
