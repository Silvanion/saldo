import React, { memo } from "react";
import { DelayedTooltip } from "./DelayedTooltip";
import {} from "../../utils";
import { DashboardChartPoint } from "../../hooks/useDashboardMetrics";
import { formatMoney } from "../../utils/format";

interface CashflowChartWidgetProps {
  currency: string;
  chartData: DashboardChartPoint[];
}

export const CashflowChartWidget = memo(function CashflowChartWidget({ chartData, currency }: CashflowChartWidgetProps) {
  return (
    <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between h-full relative overflow-hidden group hover:bg-surface transition" id="widget-content-chart-box">
      <div className="absolute inset-0  pointer-events-none" />
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5 ">Przepływy</p>
          <h3 className="text-base font-bold text-text-main">Ostatnie 6 miesięcy</h3>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 "></div>
            <span className="text-[10px] text-text-muted font-medium">Przych.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-400 "></div>
            <span className="text-[10px] text-text-muted font-medium">Wyd.</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-end justify-between gap-1 sm:gap-2 pt-4 border-b border-border pb-2 h-32 relative z-10">
        {chartData.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end items-center relative h-full group/bar">
            <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full relative">
              <DelayedTooltip
                className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity"
                label={<>{`+${formatMoney(d.income, currency)}`}<br />{`-${formatMoney(d.expense, currency)}`}</>}
                tooltipClassName="whitespace-nowrap rounded-lg py-1 px-2 bg-bg-base border-border text-text-main shadow-xl"
              >
                <div className="w-full h-full absolute inset-0" />
              </DelayedTooltip>
              <div 
                className="w-1/2 max-w-[12px] bg-gradient-to-t from-emerald-600/80 to-emerald-400 rounded-t-sm transition-all duration-500  group-hover/bar:brightness-110"
                style={{ height: `${d.incomeHeight}%` }}
              ></div>
              <div 
                className="w-1/2 max-w-[12px] bg-gradient-to-t from-rose-600/80 to-rose-400 rounded-t-sm transition-all duration-500  group-hover/bar:brightness-110"
                style={{ height: `${d.expenseHeight}%` }}
              ></div>
            </div>
            <span className={`text-[9px] mt-2 uppercase tracking-widest ${d.isCurrent ? 'font-black text-amber-400 drop-' : 'font-medium text-text-faint group-hover/bar:text-text-muted'}`}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
