import React, { memo } from "react";
import { NetWorthBreakdown } from "../../services/budgetCalculations";
import { formatMoney } from "../../utils/format";
import { Gem, TrendingUp, ShieldCheck, CreditCard, Info, Layers } from "lucide-react";

interface NetWorthHeroCardProps {
  netWorthData: NetWorthBreakdown;
  currency: string;
}

export const NetWorthHeroCard = memo(function NetWorthHeroCard({
  netWorthData,
  currency,
}: NetWorthHeroCardProps) {
  const {
    netWorth,
    liquidAssets,
    goalsAssets,
    investmentsAssets,
    totalAssets,
    unpaidLiabilities,
    creditLiabilities,
    totalLiabilities,
    assetClasses
  } = netWorthData;

  const totalLiquidAndGoals = liquidAssets + goalsAssets;

  return (
    <div className="bg-surface border border-border rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden space-y-6" id="net-worth-hero-card">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-brand-subtle text-brand border border-brand/20">
              <Gem className="w-4 h-4" />
            </span>
            <p className="text-xs font-bold text-text-faint uppercase tracking-wider">Majątek Netto (Net Worth)</p>
            <span className="text-xs font-bold uppercase tracking-wider bg-surface-2 text-text-muted px-2 py-0.5 rounded-full border border-border">
              Moduł informacyjny
            </span>
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <h1 className="text-3xl sm:text-4xl font-black text-text-main tracking-tight">
              {formatMoney(netWorth, currency)}
            </h1>
            <span className="text-xs font-semibold text-text-muted hidden sm:inline-block">
              (Aktywa: {formatMoney(totalAssets, currency)} − Zobowiązania: {formatMoney(totalLiabilities, currency)})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="text-left sm:text-right">
            <p className="text-xs text-text-faint font-medium">Stosunek Aktywów</p>
            <p className="text-xs font-bold text-brand">
              {totalAssets > 0 ? `${Math.round(((totalAssets - totalLiabilities) / totalAssets) * 100)}% kapitału własnego` : "100% kapitału własnego"}
            </p>
          </div>
        </div>
      </div>

      {/* 3 Pillar Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* 1. Liquid Assets & Goals */}
        <div className="bg-surface-2 border border-border p-4 rounded-2xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand" /> Środki płynne i cele
            </span>
            <span className="text-xs font-bold text-text-faint">
              {totalAssets > 0 ? `${Math.round((totalLiquidAndGoals / totalAssets) * 100)}%` : "0%"}
            </span>
          </div>
          <p className="text-xl font-black text-text-main">
            {formatMoney(totalLiquidAndGoals, currency)}
          </p>
          <div className="text-xs text-text-faint flex justify-between pt-1 border-t border-border/50">
            <span>Operacyjne: {formatMoney(liquidAssets, currency)}</span>
            <span>Cele: {formatMoney(goalsAssets, currency)}</span>
          </div>
        </div>

        {/* 2. Long-term Investment Capital */}
        <div className="bg-surface-2 border border-border p-4 rounded-2xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-brand" /> Kapitał inwestycyjny
            </span>
            <span className="text-xs font-bold text-text-faint">
              {totalAssets > 0 ? `${Math.round((investmentsAssets / totalAssets) * 100)}%` : "0%"}
            </span>
          </div>
          <p className="text-xl font-black text-text-main">
            {formatMoney(investmentsAssets, currency)}
          </p>
          <p className="text-xs text-text-faint pt-1 border-t border-border/50 truncate">
            IKE, IKZE, obligacje skarbowe, ETF
          </p>
        </div>

        {/* 3. Liabilities */}
        <div className="bg-surface-2 border border-border p-4 rounded-2xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-danger" /> Zobowiązania ogółem
            </span>
            {totalLiabilities > 0 && (
              <span className="text-xs font-bold text-danger bg-danger-subtle px-1.5 py-0.5 rounded border border-danger/20">
                Do spłaty
              </span>
            )}
          </div>
          <p className="text-xl font-black text-danger">
            {formatMoney(totalLiabilities, currency)}
          </p>
          <div className="text-xs text-text-faint flex justify-between pt-1 border-t border-border/50">
            <span>Rachunki: {formatMoney(unpaidLiabilities, currency)}</span>
            <span>Limity: {formatMoney(creditLiabilities, currency)}</span>
          </div>
        </div>
      </div>

      {/* Asset Classes Breakdown Bar */}
      {assetClasses.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-xs text-text-muted font-bold">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Struktura klas aktywów
            </span>
            <span className="text-xs text-text-faint">Łącznie: {formatMoney(totalAssets, currency)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {assetClasses.map((ac, idx) => (
              <div
                key={idx}
                className="bg-surface-2 border border-border px-3 py-1.5 rounded-xl text-xs flex items-center gap-2"
              >
                <span className="font-semibold text-text-main">{ac.name}:</span>
                <span className="font-bold text-text-muted">{formatMoney(ac.amount, currency)}</span>
                <span className="text-xs font-bold text-text-faint bg-surface px-1.5 py-0.5 rounded">
                  {ac.percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Semantic Disclaimer Box */}
      <div className="bg-surface-2/60 border border-border/70 rounded-xl p-3.5 flex items-start gap-3 text-xs text-text-muted">
        <Info className="w-4 h-4 text-text-faint shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-text-main">Zasada czystości semantycznej:</strong> Wpisy w sekcji inwestycji i kapitału mają charakter wyłącznie ewidencyjny. Nie są zyskiem bieżącym, nie powiększają kwoty <em>Safe-to-Spend</em> i nie zniekształcają miesięcznej stopy oszczędności.
        </p>
      </div>
    </div>
  );
});
