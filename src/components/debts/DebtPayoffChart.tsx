import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { PortfolioPayoffComparison } from '../../services/debtCalculations';

interface DebtPayoffChartProps {
  comparison: PortfolioPayoffComparison | null;
  activeStrategy: string;
}

export const DebtPayoffChart: React.FC<DebtPayoffChartProps> = ({ comparison, activeStrategy }) => {
  if (!comparison) return null;

  const getActiveResult = () => {
    switch (activeStrategy) {
      case "avalanche": return comparison.avalanche;
      case "snowball": return comparison.snowball;
      case "custom": return comparison.custom || comparison.baseline;
      case "baseline":
      default: return comparison.baseline;
    }
  };

  const activeRes = getActiveResult();
  const baselineRes = comparison.baseline;

  if (!activeRes.timeline || activeRes.timeline.length === 0) return null;

  // Merge timelines based on month
  const maxMonth = Math.max(
    activeRes.timeline[activeRes.timeline.length - 1]?.month || 0,
    baselineRes.timeline?.[baselineRes.timeline.length - 1]?.month || 0
  );

  const data = [];
  for (let m = 0; m <= maxMonth; m++) {
    const activeData = activeRes.timeline.find(t => t.month === m);
    const baseData = baselineRes.timeline?.find(t => t.month === m);

    // If month exceeds a strategy's payoff, balance is 0
    data.push({
      month: m,
      monthLabel: `Miesiąc ${m}`,
      activeBalance: activeData ? activeData.balance : 0,
      baselineBalance: baseData ? baseData.balance : 0,
    });
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="w-full h-72 sm:h-80 mt-6 bg-surface-main rounded-xl p-4 border border-border-main shadow-sm">
      <h3 className="text-lg font-semibold text-text-main mb-4">Porównanie spadku salda kapitału</h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#4B5563" />
          <XAxis 
            dataKey="monthLabel" 
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            minTickGap={30}
          />
          <YAxis 
            tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} 
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            width={55}
          />
          <Tooltip 
            formatter={(value: number) => [formatCurrency(value), "Saldo"]}
            labelStyle={{ color: '#1F2937', fontWeight: 600 }}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          />
          <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
          <Line 
            type="monotone" 
            dataKey="activeBalance" 
            name="Wybrana Strategia" 
            stroke="#10B981" 
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: "#10B981", stroke: "#fff" }}
          />
          {activeStrategy !== "baseline" && (
            <Line 
              type="monotone" 
              dataKey="baselineBalance" 
              name="Status Quo (Tylko raty)" 
              stroke="#6B7280" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
