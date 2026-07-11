'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ChartCard from './ChartCard';
import AngledAxisTick from './AngledAxisTick';
import { formatCurrency } from '../../../lib/format';

const MIN_WIDTH_PER_BAR = 70;

export default function AssetCoComparisonChart({ assetCoCards }) {
  const data = assetCoCards.map((co) => ({ name: co.name, collected: co.monthlyCollection, defaults: co.defaultCount }));
  const hasData = data.some((d) => d.collected > 0);
  const chartWidth = Math.max(data.length * MIN_WIDTH_PER_BAR, 480);

  return (
    <ChartCard
      title="AssetCo Performance Comparison"
      description="Total collections per AssetCo — a quick read on which AssetCos are driving portfolio cashflow."
      isEmpty={!hasData}
      emptyHint="No collections recorded yet — this chart will compare AssetCos by total collected once payments start flowing in."
    >
      <div className="overflow-x-auto">
        <div style={{ minWidth: chartWidth }}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" interval={0} height={60} tick={<AngledAxisTick />} />
              <YAxis tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v)} tick={{ fontSize: 11 }} width={48} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="collected" fill="#4CAF6D" name="Collected" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
}
