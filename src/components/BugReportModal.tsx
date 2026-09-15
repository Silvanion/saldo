import React, { useState } from "react";
import { motion } from "motion/react";
import { Bug, Send, X, Lightbulb, Loader2, ImagePlus, Trash2, Info } from "lucide-react";
import { useScrollLock } from "../hooks/useScrollLock";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { submitBugReport } from "../firebase";
import { isFirebaseConfigured } from "../firebase";
import { UpdateManager } from "../services/UpdateManager";

export function BugReportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const modalRef = React.useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const [type, setType] = useState<"bug" | "suggestion">("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [usedMailFallback, setUsedMailFallback] = useState(false);

  if (!isOpen) return null;

  const openMailFallback = () => {
    const rawSubject = `[${type.toUpperCase()}] ${title}`;
    const rawBody = `${description}\n\nKontakt: ${contactEmail || 'Brak'}\nWersja: ${UpdateManager.CURRENT_VERSION}`;
    // mailto: nic nie robi, jeśli użytkownik nie ma skonfigurowanego domyślnego
    // klienta pocztowego — bez kopii do schowka zgłoszenie przepadałoby wtedy
    // bez śladu i bez żadnej informacji dla użytkownika.
    navigator.clipboard?.writeText(`${rawSubject}\n\n${rawBody}`).catch(() => {});
    window.location.href = `mailto:kontakt@saldo.app?subject=${encodeURIComponent(rawSubject)}&body=${encodeURIComponent(rawBody)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Tytuł i opis są wymagane.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setUsedMailFallback(false);

    if (isFirebaseConfigured) {
      try {
        await submitBugReport({
          title: title.trim(),
          description: description.trim(),
          type,
          contactEmail: contactEmail.trim(),
          appVersion: UpdateManager.CURRENT_VERSION,
          screenshotBase64: screenshot || undefined,
        });
        setSuccess(true);
        setTimeout(() => {
          onClose();
          resetForm();
        }, 2000);
      } catch (err: any) {
        // Baza danych zgłoszeń bywa czasem niedostępna (np. przerwa w połączeniu) —
        // zamiast zostawiać użytkownika z samym komunikatem błędu, od razu otwieramy
        // gotowy do wysłania e-mail, żeby zgłoszenie nie przepadło bezpowrotnie.
        openMailFallback();
        setUsedMailFallback(true);
        setSuccess(true);
        setTimeout(() => {
          onClose();
          resetForm();
        }, 2500);
      }
    } else {
      openMailFallback();
      setUsedMailFallback(true);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1500);
    }

    setIsSubmitting(false);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setContactEmail("");
    setScreenshot(null);
    setType("bug");
    setSuccess(false);
    setError(null);
    setUsedMailFallback(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15 }}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-report-title"
        className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-sm"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            {type === "bug" ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10 text-danger">
                <Bug className="h-5 w-5" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Lightbulb className="h-5 w-5" />
              </div>
            )}
            <div>
              <h2 id="bug-report-title" className="font-bold text-text-main">
                Zgłoś {type === "bug" ? "Błąd" : "Sugestię"}
              </h2>
              <p className="text-xs text-text-muted">Pomóż nam ulepszyć aplikację Saldo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Zamknij"
            className="rounded-lg p-2 text-text-muted hover:bg-surface-2 hover:text-text-main active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="p-5">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/20 text-success">
                <Send className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-text-main">Dziękujemy!</h3>
              <p className="mt-2 text-sm text-text-muted">
                {usedMailFallback
                  ? "Otworzyliśmy gotowy e-mail z Twoim zgłoszeniem — wyślij go ze swojego programu pocztowego. Treść skopiowaliśmy też do schowka na wypadek, gdyby e-mail się nie otworzył."
                  : "Twoje zgłoszenie zostało wysłane."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex rounded-xl bg-surface-2 p-1 border border-border">
                <button
                  type="button"
                  onClick={() => setType("bug")}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    type === "bug" ? "bg-surface text-danger shadow-sm border border-border/50" : "text-text-muted hover:text-text-main"
                  }`}
                >
                  Błąd aplikacji
                </button>
                <button
                  type="button"
                  onClick={() => setType("suggestion")}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    type === "suggestion" ? "bg-surface text-brand shadow-sm border border-border/50" : "text-text-muted hover:text-text-main"
                  }`}
                >
                  Sugestia zmiany
                </button>
              </div>

              <div className="rounded-xl border border-brand/20 bg-brand/5 p-3 text-xs text-text-muted flex gap-2">
                <Info className="w-4 h-4 shrink-0 text-brand" />
                <p>
                  Zgłoszenia są przesyłane bezpośrednio do bazy danych aplikacji i pomagają nam w szybkim reagowaniu na problemy. Jeśli podasz e-mail, będziemy mogli poprosić Cię o dodatkowe informacje lub powiadomić o rozwiązaniu.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-main">
                  Krótki opis (Tytuł)
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={type === "bug" ? "Niedziałający przycisk dodawania..." : "Proponowana funkcja..."}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-main">
                  Szczegóły
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={type === "bug" ? "Kroki by odtworzyć błąd..." : "Dokładny opis jak to ma działać..."}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-main">
                  Twój e-mail (opcjonalnie)
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="kontakt@twojadomena.pl"
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand"
                />
                <p className="mt-1 text-xs text-text-muted">Podaj adres email, jeśli chcesz abyśmy wrócili z odpowiedzią.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-main">
                  Zrzut ekranu (opcjonalnie)
                </label>
                {screenshot ? (
                  <div className="relative inline-block">
                    <img src={screenshot} alt="Podgląd" className="h-24 w-auto rounded-lg border border-border object-cover" />
                    <button
                      type="button"
                      onClick={() => setScreenshot(null)}
                      aria-label="Usuń zrzut ekranu"
                      className="absolute -right-2 -top-2 rounded-full bg-danger p-1 text-text-inverse hover:bg-danger-hover active:scale-[0.98] transition-all shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface px-4 py-4 text-sm text-text-muted hover:bg-surface-2 transition-colors">
                    <ImagePlus className="h-5 w-5" />
                    <span>Kliknij, aby dodać zdjęcie...</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 500 * 1024) {
                            setError("Zdjęcie jest za duże (max 500KB) — dokumenty w bazie zgłoszeń mają twardy limit 1MB.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setScreenshot(ev.target?.result as string);
                            setError(null);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                  {error}
                </div>
              )}
              
              {!isFirebaseConfigured && (
                 <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                    Pracujesz offline / bez chmury Firebase. Zgłoszenie zostanie otwarte w Twoim programie pocztowym.
                 </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-text-inverse transition-colors hover:bg-brand-hover disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Wysyłanie...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" /> Wyślij Zgłoszenie
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
