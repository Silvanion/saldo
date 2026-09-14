import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Landmark,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Flame,
  ArrowRight,
  PiggyBank,
  Briefcase,
  Building2,
  Wallet,
  CreditCard,
  Receipt,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Profile } from "../../types";
import {
  calculateNetWorthSummary,
  generateNetWorthTimeline,
} from "../../services/netWorthCalculations";
import { formatMoney } from "../../utils";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export interface NetWorthModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  onChangeView?: (view: string) => void;
}

export function NetWorthModal({
  isOpen,
  onClose,
  profile,
  onChangeView,
}: NetWorthModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useScrollLock(isOpen);
  useFocusTrap(modalRef, isOpen, onClose);

  const [periodMonths, setPeriodMonths] = useState<3 | 6 | 12>(6);
  const [simulatedPayoffDebtId, setSimulatedPayoffDebtId] = useState<string>("");

  const summary = useMemo(() => calculateNetWorthSummary(profile), [profile]);
  const cur = profile.currency || "PLN";

  const timelineData = useMemo(() => {
    return generateNetWorthTimeline(profile, periodMonths);
  }, [profile, periodMonths]);

  const activeDebts = useMemo(() => {
    return (profile.debts || []).filter((d) => d.status !== "closed" && Number(d.balance) > 0);
  }, [profile.debts]);

  const simulatedSummary = useMemo(() => {
    if (!simulatedPayoffDebtId) return null;
    const debt = activeDebts.find((d) => d.id === simulatedPayoffDebtId);
    if (!debt) return null;

    const balancePaid = Number(debt.balance) || 0;
    const newDebtsTotal = Math.max(0, summary.liabilities.debts - balancePaid);
    const newTotalLiabilities = newDebtsTotal + summary.liabilities.unpaidBills;
    const newNetWorth = summary.assets.totalAssets - newTotalLiabilities;
    const newDebtRatio =
      summary.assets.totalAssets > 0
        ? (newTotalLiabilities / summary.assets.totalAssets) * 100
        : 0;

    return {
      debtName: debt.name,
      balancePaid,
      newNetWorth,
      newTotalLiabilities,
      newDebtRatio,
      ratioImprovement: summary.debtToAssetsRatio - newDebtRatio,
    };
  }, [simulatedPayoffDebtId, activeDebts, summary]);

  if (!isOpen) return null;

  const isNetPositive = summary.netWorth >= 0;
  const debtRatio = summary.debtToAssetsRatio;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="net-worth-modal-title"
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-surface border border-border/70 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border/60 bg-surface-2/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-subtle text-brand border border-brand/20">
                <Landmark className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    id="net-worth-modal-title"
                    className="text-lg sm:text-xl font-bold text-text-main tracking-tight"
                  >
                    Bilans Majątku Netto
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Wealthfolio Core
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Kompletne zestawienie Twoich aktywów, pasywów oraz trajektoria wzrostu
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-focus-ring"
              aria-label="Zamknij modal majątku netto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            {/* Hero Net Worth Card */}
            <div className="bg-gradient-to-br from-surface-2/80 to-surface border border-border/70 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-text-muted block mb-1">
                  Twój aktualny majątek netto
                </span>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span
                    className={`text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums ${
                      isNetPositive ? "text-text-main" : "text-rose-500"
                    }`}
                  >
                    {formatMoney(summary.netWorth, cur)}
                  </span>
                  {summary.momChange.absolute !== 0 && (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                        summary.momChange.absolute > 0
                          ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                          : "text-rose-500 bg-rose-500/10 border-rose-500/20"
                      }`}
                    >
                      {summary.momChange.absolute > 0 ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      {summary.momChange.absolute > 0 ? "+" : ""}
                      {formatMoney(summary.momChange.absolute, cur)} (
                      {summary.momChange.percentage.toFixed(1)}% m/m)
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Aktywa brutto: <strong>{formatMoney(summary.assets.totalAssets, cur)}</strong> | Zobowiązania:{" "}
                  <strong>{formatMoney(summary.liabilities.totalLiabilities, cur)}</strong>
                </p>
              </div>

              {/* Badges / Metrics */}
              <div className="flex flex-wrap gap-2.5 sm:gap-3 shrink-0">
                <div className="bg-surface p-3 rounded-xl border border-border/60 min-w-[130px]">
                  <div className="flex items-center gap-1.5 text-text-muted mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[11px] font-semibold">Zadłużenie / Aktywa</span>
                  </div>
                  <span
                    className={`text-base font-bold tabular-nums ${
                      debtRatio <= 30
                        ? "text-emerald-500"
                        : debtRatio <= 60
                        ? "text-amber-500"
                        : "text-rose-500"
                    }`}
                  >
                    {debtRatio.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-text-muted block">
                    {debtRatio <= 30 ? "Bezpieczny" : debtRatio <= 60 ? "Umiarkowany" : "Wysoki"}
                  </span>
                </div>

                <div className="bg-surface p-3 rounded-xl border border-border/60 min-w-[130px]">
                  <div className="flex items-center gap-1.5 text-text-muted mb-1">
                    <Flame className="w-3.5 h-3.5 text-brand" />
                    <span className="text-[11px] font-semibold">Poduszka (Runway)</span>
                  </div>
                  <span className="text-base font-bold text-text-main tabular-nums">
                    {summary.liquidRunwayMonths >= 99
                      ? "Bez limitu"
                      : `${summary.liquidRunwayMonths} mies.`}
                  </span>
                  <span className="text-[10px] text-text-muted block">Bezpieczeństwo płynne</span>
                </div>
              </div>
            </div>

            {/* Timeline Area Chart */}
            <div className="bg-surface border border-border/70 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-text-main tracking-tight">
                    Trajektoria Majątku Netto
                  </h3>
                  <p className="text-xs text-text-muted">Historia akumulacji majątku w czasie</p>
                </div>

                {/* Period Selector */}
                <div className="flex items-center bg-surface-2 p-1 rounded-xl border border-border/60 text-xs">
                  {([3, 6, 12] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPeriodMonths(m)}
                      className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        periodMonths === m
                          ? "bg-brand text-white shadow-xs"
                          : "text-text-muted hover:text-text-main"
                      }`}
                    >
                      {m}M
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full h-60 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={timelineData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="liabilitiesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.15)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#888888", fontSize: 11 }}
                      axisLine={{ stroke: "rgba(150,150,150,0.2)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#888888", fontSize: 11 }}
                      axisLine={{ stroke: "rgba(150,150,150,0.2)" }}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-surface p-3 rounded-xl border border-border shadow-lg text-xs space-y-1">
                            <span className="font-bold text-text-main block">{data.label}</span>
                            <div className="flex justify-between gap-4 text-emerald-500 font-semibold">
                              <span>Majątek Netto:</span>
                              <span>{formatMoney(data.netWorth, cur)}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-text-muted">
                              <span>Aktywa:</span>
                              <span>{formatMoney(data.assets, cur)}</span>
                            </div>
                            <div className="flex justify-between gap-4 text-rose-500">
                              <span>Zobowiązania:</span>
                              <span>{formatMoney(data.liabilities, cur)}</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="netWorth"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#netWorthGradient)"
                      name="Majątek Netto"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Two-Column Assets vs Liabilities Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assets Breakdown */}
              <div className="bg-surface border border-border/70 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <PiggyBank className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-text-main">Struktura Aktywów</h4>
                    </div>
                    <span className="text-sm font-bold text-emerald-500 tabular-nums">
                      {formatMoney(summary.assets.totalAssets, cur)}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2/60 border border-border/40">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-text-muted" />
                        <span className="text-text-main font-medium">Środki płynne (konta)</span>
                      </div>
                      <span className="font-bold tabular-nums text-text-main">
                        {formatMoney(summary.assets.liquidCash, cur)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2/60 border border-border/40">
                      <div className="flex items-center gap-2">
                        <PiggyBank className="w-4 h-4 text-text-muted" />
                        <span className="text-text-main font-medium">Cele oszczędnościowe</span>
                      </div>
                      <span className="font-bold tabular-nums text-text-main">
                        {formatMoney(summary.assets.savings, cur)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2/60 border border-border/40">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-text-muted" />
                        <span className="text-text-main font-medium">Inwestycje</span>
                      </div>
                      <span className="font-bold tabular-nums text-text-main">
                        {formatMoney(summary.assets.investments, cur)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2/60 border border-border/40">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-text-muted" />
                        <span className="text-text-main font-medium">Nieruchomości / Zabezpieczenia</span>
                      </div>
                      <span className="font-bold tabular-nums text-text-main">
                        {formatMoney(summary.assets.property, cur)}
                      </span>
                    </div>
                  </div>
                </div>

                {onChangeView && (
                  <div className="pt-4 mt-3 border-t border-border/50 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onChangeView("goals");
                      }}
                      className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Zarządzaj celami i oszczędnościami</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Liabilities Breakdown */}
              <div className="bg-surface border border-border/70 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-text-main">Struktura Zobowiązań</h4>
                    </div>
                    <span className="text-sm font-bold text-rose-500 tabular-nums">
                      {formatMoney(summary.liabilities.totalLiabilities, cur)}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2/60 border border-border/40">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-text-muted" />
                        <span className="text-text-main font-medium">Kredyty i pożyczki aktywne</span>
                      </div>
                      <span className="font-bold tabular-nums text-rose-500">
                        {formatMoney(summary.liabilities.debts, cur)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2/60 border border-border/40">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-text-muted" />
                        <span className="text-text-main font-medium">Bieżące rachunki (nieopłacone)</span>
                      </div>
                      <span className="font-bold tabular-nums text-text-main">
                        {formatMoney(summary.liabilities.unpaidBills, cur)}
                      </span>
                    </div>
                  </div>
                </div>

                {onChangeView && (
                  <div className="pt-4 mt-3 border-t border-border/50 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onChangeView("debts");
                      }}
                      className="text-xs font-semibold text-rose-500 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Zarządzaj długami i strategią spłat</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Payoff Simulation Card */}
            {activeDebts.length > 0 && (
              <div className="bg-surface-2/40 border border-border/70 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-brand/10 text-brand">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-main">
                      Symulator Wpływu Spłaty Długu na Majątek Netto
                    </h4>
                    <p className="text-xs text-text-muted">
                      Wybierz zobowiązanie, aby sprawdzić jak zmieni się Twój wskaźnik majątku netto
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={simulatedPayoffDebtId}
                    onChange={(e) => setSimulatedPayoffDebtId(e.target.value)}
                    className="bg-surface border border-border/80 rounded-xl px-3 py-2 text-xs text-text-main focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
                    aria-label="Wybierz dług do symulacji"
                  >
                    <option value="">Wybierz dług do symulacji...</option>
                    {activeDebts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({formatMoney(d.balance, cur)})
                      </option>
                    ))}
                  </select>

                  {simulatedSummary && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs flex-1 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-text-main">
                        Po spłacie <strong>{simulatedSummary.debtName}</strong>: Twój majątek wzrośnie do{" "}
                        <strong className="text-emerald-500">
                          {formatMoney(simulatedSummary.newNetWorth, cur)}
                        </strong>
                      </span>
                      <span className="font-bold text-emerald-500">
                        Wskaźnik długu spadnie o -{simulatedSummary.ratioImprovement.toFixed(1)} pp.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
