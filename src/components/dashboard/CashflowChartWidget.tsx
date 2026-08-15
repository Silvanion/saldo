import React, { memo } from "react";
import { DelayedTooltip } from "./DelayedTooltip";
import { DashboardChartPoint } from "../../hooks/useDashboardMetrics";
import { formatMoney } from "../../utils/format";

interface CashflowChartWidgetProps {
  currency: string;
  chartData: DashboardChartPoint[];
}

export const CashflowChartWidget = memo(function CashflowChartWidget({ chartData, currency }: CashflowChartWidgetProps) {
  return (
    <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between h-full max-h-[440px] relative overflow-hidden group hover:bg-surface transition" id="widget-content-chart-box">
      <div className="flex items-center justify-between gap-4 mb-4 relative z-10">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-text-faint uppercase tracking-wider mb-0.5 truncate" title="Przepływy">Przepływy</p>
          <h3 className="text-base font-bold text-text-main truncate" title="Ostatnie 6 miesięcy">Ostatnie 6 miesięcy</h3>
        </div>
        <div className="flex gap-3 shrink-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-brand shrink-0"></div>
            <span className="text-xs text-text-muted font-medium truncate" title="Przychody">Przychody</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-danger shrink-0"></div>
            <span className="text-xs text-text-muted font-medium truncate" title="Wydatki">Wydatki</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-end justify-between gap-1.5 sm:gap-3 pt-6 border-b border-border pb-3 h-48 relative z-10">
        {chartData.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end items-center relative h-full group/bar min-w-0">
            <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full relative">
              <DelayedTooltip
                className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity z-30 pointer-events-none"
                label={<div className="text-center font-bold text-xs">{`+${formatMoney(d.income, currency)}`}<br />{`-${formatMoney(d.expense, currency)}`}</div>}
                tooltipClassName="whitespace-nowrap rounded-lg py-1.5 px-2.5 bg-surface border border-border text-text-main shadow-xl"
              >
                <div className="w-full h-full absolute inset-0" />
              </DelayedTooltip>
              <div 
                className="w-1/2 max-w-[14px] bg-brand rounded-t transition-all duration-500 group-hover/bar:brightness-110 shadow-xs"
                style={{ height: `${d.incomeHeight}%` }}
              ></div>
              <div 
                className="w-1/2 max-w-[14px] bg-danger rounded-t transition-all duration-500 group-hover/bar:brightness-110 shadow-xs"
                style={{ height: `${d.expenseHeight}%` }}
              ></div>
            </div>
            <span className={`text-[11px] mt-2 uppercase tracking-widest truncate w-full text-center ${d.isCurrent ? 'font-bold text-brand' : 'font-medium text-text-faint group-hover/bar:text-text-muted'}`} title={d.label}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
