import React from "react";

export function ModalFallback({ label = "Ładowanie..." }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="status"
      aria-label="Ładowanie okna dialogowego..."
    >
      <div className="bg-surface border border-border p-5 rounded-2xl shadow-xl flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-brand/20 border-t-brand animate-spin" />
        <span className="text-sm font-bold text-text-main">{label}</span>
      </div>
    </div>
  );
}
