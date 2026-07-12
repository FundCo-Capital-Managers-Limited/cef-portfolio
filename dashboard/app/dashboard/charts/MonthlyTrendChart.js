'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ChartCard from './ChartCard';
import { formatCurrency } from '../../../lib/format';

function monthLabel(ym) {
  const [year, month] = ym.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

export default function MonthlyTrendChart({ data, scope }) {
  const hasData = data.some((d) => d.amount > 0);

  return (
    <ChartCard
      title="Monthly Collections"
      description={`Customer payments received per month over the last 12 months${scope ? ` for ${scope}` : ' across the portfolio'}: the core signal of collection health over time.`}
      isEmpty={!hasData}
      emptyHint="No payments recorded in the last 12 months yet. This chart will fill in as payment.received events arrive."
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v)} tick={{ fontSize: 11 }} width={48} />
          <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={monthLabel} />
          <Line type="monotone" dataKey="amount" stroke="#2D8FE0" strokeWidth={2} dot={{ r: 3 }} name="Collected" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
