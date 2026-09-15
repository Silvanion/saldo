import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeftRight,
  FileSpreadsheet,
  Database,
  ShieldCheck,
  LogOut,
  ChevronDown
} from "lucide-react";
import { Profile } from "../../types";
import { ModernAvatar } from "../avatar/ModernAvatar";

export interface ProfileDropdownProps {
  activeProfile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  onSwitchProfile: () => void;
  onExportReports: () => void;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  onOpenSecurityInfo: () => void;
  googleUser: any | null;
  onLogoutGoogle: () => void;
  triggerId?: string;
}

/**
 * ProfileDropdown - Odporne na overflow i -webkit-app-region menu profilu
 * Montowane w document.body przez React Portal z dynamicznym pozycjonowaniem.
 */
export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  activeProfile,
  isOpen,
  onClose,
  onToggle,
  onSwitchProfile,
  onExportReports,
  isDemoMode,
  onToggleDemoMode,
  onOpenSecurityInfo,
  googleUser,
  onLogoutGoogle,
  triggerId = "btn-top-user-menu"
}) => {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; right: number; width: number }>({
    top: 0,
    right: 16,
    width: 256
  });

  // Obliczenie pozycji względem przycisku wyzwalającego
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 256;
    const rightMargin = Math.max(12, window.innerWidth - rect.right);
    const topMargin = rect.bottom + 8;

    setCoords({
      top: topMargin,
      right: rightMargin,
      width: menuWidth
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();
      window.addEventListener("resize", handleResize, { passive: true });
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("scroll", handleScroll);
      };
    }
  }, [isOpen, updatePosition]);

  // Obsługa kliknięcia poza menu (pointerdown) oraz klawisza Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const initials = activeProfile.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative inline-block [-webkit-app-region:no-drag]">
      {/* Przycisk aktywacyjny w pasku nagłówka */}
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-lg border border-border/70 bg-surface hover:bg-surface-2 hover:border-brand/30 transition-all cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-focus-ring group [-webkit-app-region:no-drag]"
        id={triggerId}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Menu profilu i akcji"
      >
        {activeProfile.avatar ? (
          <ModernAvatar iconId={activeProfile.avatar} colorId={activeProfile.color} size="sm" className="border border-brand/20 shadow-2xs" />
        ) : (
          <span className="w-6 h-6 rounded-full bg-brand-subtle text-brand text-xs font-bold flex items-center justify-center select-none shadow-2xs shrink-0 border border-brand/20">
            {initials}
          </span>
        )}
        <span className="text-xs font-semibold text-text-main max-w-[85px] truncate hidden md:inline">
          {activeProfile.name}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          strokeWidth={1.75}
        />
      </button>

      {/* Menu montowane przez Portal w document.body (niezależne od ograniczeń paska okna) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <div
                ref={menuRef}
                role="menu"
                id="top-user-actions-menu"
                className="fixed z-[9999] [-webkit-app-region:no-drag]"
                style={{
                  top: `${coords.top}px`,
                  right: `${coords.right}px`,
                  width: `${coords.width}px`
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -6 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="bg-surface/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl overflow-hidden py-1.5 ring-1 ring-black/5 dark:ring-white/10"
                >
                  {/* Nagłówek danych profilu */}
                  <div className="px-4 py-2.5 border-b border-border/50">
                    <p className="text-xs font-bold text-text-main truncate">
                      {activeProfile.name}
                    </p>
                    <p className="text-[11px] text-text-muted truncate mt-0.5">
                      {activeProfile.kind === "shared"
                        ? `Budżet wspólny (${activeProfile.partnerName || "Partner"})`
                        : "Budżet osobisty"}
                    </p>
                  </div>

                  {/* Pozycje nawigacyjne menu */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSwitchProfile();
                      }}
                      role="menuitem"
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-medium text-text-main hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-focus-ring text-left"
                      id="btn-header-switch-profile"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={1.75} />
                      <span>Przełącz profil</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onExportReports();
                      }}
                      role="menuitem"
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-medium text-text-main hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-focus-ring text-left"
                      id="btn-header-export-reports"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={1.75} />
                      <span>Raporty i eksport</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onToggleDemoMode();
                      }}
                      role="menuitem"
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-medium text-text-main hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-focus-ring text-left"
                      id="btn-header-toggle-demo"
                    >
                      <Database className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={1.75} />
                      <span>{isDemoMode ? "Tryb: Lokalne Saldo" : "Tryb: Chmura"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSecurityInfo();
                      }}
                      role="menuitem"
                      className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-medium text-text-main hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-focus-ring text-left"
                      id="btn-header-security-info"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-brand shrink-0" strokeWidth={1.75} />
                      <span>Szczegóły ochrony</span>
                    </button>
                  </div>

                  {googleUser && (
                    <div className="border-t border-border/50 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onLogoutGoogle();
                        }}
                        role="menuitem"
                        className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-medium text-danger hover:bg-danger-subtle transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-focus-ring text-left"
                        id="btn-header-logout"
                      >
                        <LogOut className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                        <span>Wyloguj z konta Google</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
