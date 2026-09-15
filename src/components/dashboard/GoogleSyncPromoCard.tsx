import React from "react";
import { CloudUpload, X } from "lucide-react";

interface GoogleSyncPromoCardProps {
  onConnect: () => void;
  onDismiss: () => void;
}

export function GoogleSyncPromoCard({ onConnect, onDismiss }: GoogleSyncPromoCardProps) {
  return (
    <div
      id="dashboard-google-sync-promo"
      className="mb-6 bg-surface border border-border/70 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10"
    >
      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
          <CloudUpload className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-main">Połącz z Google, by mieć kopię zapasową w chmurze</p>
          <p className="text-xs text-text-muted mt-0.5">Synchronizacja między urządzeniami i automatyczny backup danych — w pełni opcjonalne.</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <button
          type="button"
          onClick={onConnect}
          id="btn-dash-connect-google"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-subtle hover:bg-brand/15 border border-brand/20 text-brand active:scale-[0.98] transition-all text-xs font-bold cursor-pointer shadow-xs focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Połącz teraz
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Nie teraz"
          id="btn-dash-dismiss-google-promo"
          className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-2 active:scale-95 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
