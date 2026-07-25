import React, { memo } from "react";
import { formatPln } from "../../utils";
import { DashboardChartPoint } from "../../hooks/useDashboardMetrics";

interface CashflowChartWidgetProps {
  chartData: DashboardChartPoint[];
}

export const CashflowChartWidget = memo(function CashflowChartWidget({ chartData }: CashflowChartWidgetProps) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between h-full" id="widget-content-chart-box">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Przepływy</p>
          <h3 className="text-base font-bold text-slate-900">Ostatnie 6 miesięcy</h3>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#137566]"></div>
            <span className="text-[10px] text-slate-500 font-medium">Przych.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#d55e50]"></div>
            <span className="text-[10px] text-slate-500 font-medium">Wyd.</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-end justify-between gap-1 sm:gap-2 pt-4 border-b border-slate-100 pb-2 h-32">
        {chartData.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full">
            <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full relative">
              {/* Tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-10 transition-opacity">
                +{formatPln(d.income)}<br/>-{formatPln(d.expense)}
              </div>
              <div 
                className="w-1/2 max-w-[12px] bg-gradient-to-t from-[#137566]/80 to-[#137566] rounded-t-sm transition-all duration-500"
                style={{ height: `${d.incomeHeight}%` }}
              ></div>
              <div 
                className="w-1/2 max-w-[12px] bg-gradient-to-t from-[#d55e50]/80 to-[#d55e50] rounded-t-sm transition-all duration-500"
                style={{ height: `${d.expenseHeight}%` }}
              ></div>
            </div>
            <span className={`text-[9px] mt-2 uppercase tracking-widest ${d.isCurrent ? 'font-black text-[#153a35]' : 'font-medium text-slate-400'}`}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
