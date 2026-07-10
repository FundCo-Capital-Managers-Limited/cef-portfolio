'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ChartCard from './ChartCard';
import { formatCurrency } from '../../../lib/format';

export default function AssetCoComparisonChart({ assetCoCards }) {
  const data = assetCoCards.map((co) => ({ name: co.name, collected: co.monthlyCollection, defaults: co.defaultCount }));
  const hasData = data.some((d) => d.collected > 0);

  return (
    <ChartCard
      title="AssetCo Performance Comparison"
      description="Total collections per AssetCo — a quick read on which AssetCos are driving portfolio cashflow."
      isEmpty={!hasData}
      emptyHint="No collections recorded yet — this chart will compare AssetCos by total collected once payments start flowing in."
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v)} tick={{ fontSize: 11 }} width={48} />
          <Tooltip formatter={(v) => formatCurrency(v)} />
          <Bar dataKey="collected" fill="#4CAF6D" name="Collected" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
