'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartCard from './ChartCard';
import AngledAxisTick from './AngledAxisTick';
import { formatCurrency } from '../../../lib/format';

const MIN_WIDTH_PER_BAR = 90;

export default function LoanBookChart({ byAssetCo }) {
  const data = byAssetCo.map((row) => ({
    name: row.assetCoName,
    deployed: row.totalFacilityNgn,
    repaid: row.totalRepaidNgn,
    outstanding: row.outstandingNgn,
  }));
  const chartWidth = Math.max(data.length * MIN_WIDTH_PER_BAR, 480);

  return (
    <ChartCard
      title="Loan Book by AssetCo"
      description="CEF facility principal deployed vs. repaid per AssetCo: shows recovery progress on CEF's own capital, distinct from customer collections."
      isEmpty={data.length === 0}
      emptyHint="No CEF facilities recorded yet. This chart will compare deployed vs. repaid capital per AssetCo once facilities are created."
    >
      <div className="overflow-x-auto">
        <div style={{ minWidth: chartWidth }}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" interval={0} height={60} tick={<AngledAxisTick />} />
              <YAxis tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v)} tick={{ fontSize: 11 }} width={48} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="deployed" fill="#1B2A6B" name="Deployed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="repaid" fill="#22B0C7" name="Repaid" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
}
