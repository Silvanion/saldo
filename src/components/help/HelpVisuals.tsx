import React from "react";
import {
  ShieldCheck,
  Zap,
  TrendingUp,
  Wallet,
  Clock,
  Users,
  FileSpreadsheet,
  Globe,
  Command,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
  Search,
  Target,
  Cpu
} from "lucide-react";

export interface StepHighlightProps {
  key?: React.Key;
  step: number;
  label: string;
  description: string;
}

export function StepHighlight({ step, label, description }: StepHighlightProps) {
  return (
    <div className="flex items-start gap-3 bg-surface p-3 sm:p-4 rounded-xl border border-border/50 shadow-xs">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-subtle text-brand font-bold text-xs shrink-0 border border-brand/20">
        {step}
      </div>
      <div>
        <h5 className="font-bold text-text-main text-xs sm:text-sm">{label}</h5>
        <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export interface MockScreenShotProps {
  title: string;
  badge: string;
  children: React.ReactNode;
  steps?: StepHighlightProps[];
}

export function MockScreenShot({ title, badge, children, steps }: MockScreenShotProps) {
  return (
    <div className="my-5 border border-border rounded-2xl overflow-hidden bg-bg-base shadow-sm text-text-main">
      {/* Mock Window Header */}
      <div className="bg-surface px-4 py-2.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="text-xs font-bold text-text-muted ml-2">{title}</span>
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-surface-2 text-text-muted border border-border rounded-md shadow-xs">
          {badge}
        </span>
      </div>

      {/* Mock Visual Interface Body */}
      <div className="p-4 sm:p-5 bg-bg-base/60 font-sans">
        {children}
      </div>

      {/* Step by Step Action Markers */}
      {steps && steps.length > 0 && (
        <div className="bg-surface p-4 sm:p-5 border-t border-border grid gap-2.5 sm:grid-cols-2">
          {steps.map((s) => (
            <StepHighlight key={s.step} step={s.step} label={s.label} description={s.description} />
          ))}
        </div>
      )}
    </div>
  );
}

export interface ScreenshotProps {
  title: string;
  badge?: string;
  src: string;
  alt: string;
  caption?: string;
  steps?: StepHighlightProps[];
}

/**
 * Renders a real, captured screenshot of the Saldo app in the same "browser window"
 * chrome as MockScreenShot, with an optional caption explaining what's shown.
 */
export function Screenshot({ title, badge, src, alt, caption, steps }: ScreenshotProps) {
  return (
    <div className="my-5 border border-border rounded-2xl overflow-hidden bg-bg-base shadow-sm text-text-main">
      <div className="bg-surface px-4 py-2.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
          <div className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="text-xs font-bold text-text-muted ml-2">{title}</span>
        </div>
        {badge && (
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-surface-2 text-text-muted border border-border rounded-md shadow-xs">
            {badge}
          </span>
        )}
      </div>

      <img src={src} alt={alt} loading="lazy" className="w-full h-auto block" />

      {caption && (
        <p className="px-4 sm:px-5 py-3 text-xs text-text-muted border-t border-border bg-surface leading-relaxed">
          {caption}
        </p>
      )}

      {steps && steps.length > 0 && (
        <div className="bg-surface p-4 sm:p-5 border-t border-border grid gap-2.5 sm:grid-cols-2">
          {steps.map((s) => (
            <StepHighlight key={s.step} step={s.step} label={s.label} description={s.description} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Mock UI: Dashboard Safe-to-Spend & Runway visual
 */
export function MockDashboardVisual() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 bg-surface rounded-xl border border-brand/20 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand uppercase tracking-wider">Safe-to-Spend</span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-subtle text-brand border border-brand/20 rounded-full">Wolne środki</span>
          </div>
          <div className="text-2xl font-black text-text-main tabular-nums">3 450,00 PLN</div>
          <p className="text-[11px] text-text-muted">Po odliczeniu rachunków i celów na ten miesiąc</p>
        </div>

        <div className="p-4 bg-surface rounded-xl border border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Poduszka (Runway)</span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-success-subtle text-success border border-success/20 rounded-full">Bezpiecznie</span>
          </div>
          <div className="text-2xl font-black text-text-main tabular-nums">6.2 mies.</div>
          <p className="text-[11px] text-text-muted">Płynne oszczędności / średni miesięczny koszt życia</p>
        </div>
      </div>

      <div className="p-3 bg-surface-2 rounded-xl border border-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-text-muted" />
          <span className="text-text-muted font-medium">Nadchodzące rachunki do końca miesiąca:</span>
        </div>
        <strong className="text-danger font-bold tabular-nums">-1 240,00 PLN</strong>
      </div>
    </div>
  );
}

/**
 * Mock UI: 50/30/20 and Simulators visual
 */
export function MockAnalysisVisual() {
  return (
    <div className="space-y-3">
      {/* 50/30/20 Rule mini card */}
      <div className="p-4 bg-surface rounded-xl border border-border shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-text-main">
          <span>Reguła 50 / 30 / 20</span>
          <span className="text-brand tabular-nums">Bilans: Zrównoważony</span>
        </div>
        <div className="space-y-1.5 text-xs">
          <div>
            <div className="flex justify-between text-[11px] text-text-muted mb-0.5">
              <span>Potrzeby bazowe (Cel: 50%)</span>
              <strong className="text-text-main tabular-nums">48% (3 600 PLN)</strong>
            </div>
            <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
              <div className="h-full bg-brand rounded-full" style={{ width: "48%" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-text-muted mb-0.5">
              <span>Zachcianki i styl życia (Cel: 30%)</span>
              <strong className="text-text-main tabular-nums">28% (2 100 PLN)</strong>
            </div>
            <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
              <div className="h-full bg-brand/60 rounded-full" style={{ width: "28%" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-text-muted mb-0.5">
              <span>Oszczędności &amp; Inwestycje (Cel: 20%)</span>
              <strong className="text-text-main tabular-nums">24% (1 800 PLN)</strong>
            </div>
            <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
              <div className="h-full bg-success rounded-full" style={{ width: "24%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Simulator Mini Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-surface rounded-xl border border-border/70 shadow-xs">
          <span className="font-semibold text-brand flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-brand" />
            <span>Poduszka 6M</span>
          </span>
          <p className="text-text-muted text-[11px]">Cel: 32 400 PLN | Posiadasz: 21 000 PLN</p>
          <p className="text-text-main font-bold mt-1 tabular-nums">Osiągnięcie celu za ok. 7 miesięcy</p>
        </div>
        <div className="p-3 bg-surface rounded-xl border border-border/70 shadow-xs">
          <span className="font-semibold text-danger flex items-center gap-1.5 mb-1">
            <Zap className="w-3.5 h-3.5 text-danger" />
            <span>Kaskada Kuli Śnieżnej</span>
          </span>
          <p className="text-text-muted text-[11px]">Priorytet 1: Karta kredytowa (1 200 PLN)</p>
          <p className="text-text-main font-bold mt-1 tabular-nums">+250 PLN/mies. skróci spłatę o 4 mies.</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Mock UI: Multi-currency conversion visual
 */
export function MockCurrencyVisual() {
  return (
    <div className="p-4 bg-surface rounded-xl border border-border shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-brand" />
          <span className="text-xs font-bold text-text-main">Przelicznik kursowy NBP (Tabela A)</span>
        </div>
        <span className="text-[10px] font-bold bg-brand-subtle text-brand border border-brand/20 px-2 py-0.5 rounded-md">
          Offline Cache
        </span>
      </div>

      <div className="p-3 bg-surface-2 rounded-xl border border-border flex items-center justify-between text-xs">
        <div>
          <span className="text-text-muted block text-[11px]">Transakcja oryginalna:</span>
          <strong className="text-text-main font-bold tabular-nums">120,00 EUR</strong>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted shrink-0 mx-2" />
        <div>
          <span className="text-text-muted block text-[11px]">Po kursie NBP (4.3210 PLN):</span>
          <strong className="text-brand font-black tabular-nums">518,52 PLN</strong>
        </div>
      </div>
    </div>
  );
}

/**
 * Mock UI: Shared profile & settlement visual
 */
export function MockSettlementVisual() {
  return (
    <div className="p-4 bg-surface rounded-xl border border-border shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-brand" />
          <span className="text-xs font-bold text-text-main">Profil Wspólny — Rozliczenia</span>
        </div>
        <span className="text-[10px] font-bold bg-surface-2 text-text-muted border border-border px-2 py-0.5 rounded-md">
          Podział 50 / 50
        </span>
      </div>

      <div className="p-3 bg-brand-subtle border border-brand/20 rounded-xl flex items-center justify-between text-xs">
        <div>
          <span className="text-text-muted block text-[11px]">Wynik bilansu wydatków:</span>
          <strong className="text-brand font-bold">Partner jest Ci winien</strong>
        </div>
        <div className="text-lg font-black text-brand tabular-nums">185,00 PLN</div>
      </div>
    </div>
  );
}

/**
 * Mock UI: Command Palette (Cmd+K)
 */
export function MockCommandPaletteVisual() {
  return (
    <div className="p-3 bg-surface rounded-xl border border-brand/30 shadow-md space-y-2 max-w-md mx-auto">
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-surface-2 rounded-lg border border-border text-xs text-text-main">
        <Search className="w-3.5 h-3.5 text-text-faint" />
        <span className="font-medium text-text-main">Biedronka</span>
        <span className="ml-auto text-[10px] text-text-faint font-mono">ESC aby zamknąć</span>
      </div>
      <div className="space-y-1 text-xs">
        <div className="p-2 rounded-lg bg-brand-subtle text-brand font-bold flex justify-between items-center">
          <span>Biedronka — Zakupy spożywcze</span>
          <span className="tabular-nums">-84,50 PLN</span>
        </div>
        <div className="p-2 rounded-lg text-text-muted hover:bg-surface-2 flex justify-between items-center">
          <span>+ Dodaj nową transakcję</span>
          <span className="text-[10px] font-mono text-text-faint">Enter</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Mock UI: Lokalne AI (Ollama) — sugestie kategorii i odczyt tekstu wyciągu
 */
export function MockLocalAiVisual() {
  return (
    <div className="p-4 bg-surface rounded-xl border border-border shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-brand" />
          <span className="text-xs font-bold text-text-main">Lokalne AI (Ollama) — działa offline na Twoim komputerze</span>
        </div>
        <span className="text-[10px] font-bold bg-success-subtle text-success border border-success/20 px-2 py-0.5 rounded-md">
          Opcjonalne
        </span>
      </div>

      <div className="p-3 bg-surface-2 rounded-xl border border-border text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Wklejony wiersz wyciągu:</span>
        </div>
        <div className="font-mono text-[11px] text-text-main bg-bg-base p-2 rounded-lg border border-border">
          "ŻABKA Z0512 WARSZAWA — 23,40"
        </div>
        <div className="flex items-center gap-2 text-text-main">
          <ArrowRight className="w-3.5 h-3.5 text-brand shrink-0" />
          <span>Sugestia: <strong className="text-brand">Żywność</strong>, kwota <strong className="tabular-nums">23,40 PLN</strong></span>
        </div>
      </div>

      <p className="text-[11px] text-text-muted leading-relaxed">
        Sugestia zawsze trafia do podglądu przed importem — nic nie zapisuje się automatycznie, a żadne dane nie opuszczają urządzenia.
      </p>
    </div>
  );
}

export function Terminal(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}
