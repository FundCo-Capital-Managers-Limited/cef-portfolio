import Link from 'next/link';
import { getPortfolioSummary } from '../../lib/data';
import { formatCurrency, timeAgo } from '../../lib/format';

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

export default async function PortfolioDashboardPage() {
  const summary = await getPortfolioSummary();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-4">Portfolio Cashflow Summary</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Collected" value={formatCurrency(summary.totalCollected)} />
          <StatCard label="Outstanding" value={formatCurrency(summary.totalOutstanding)} />
          <StatCard
            label="Collection Rate"
            value={summary.collectionRate === null ? '—' : `${Math.round(summary.collectionRate * 100)}%`}
          />
          <StatCard label="Defaulting Customers" value={summary.defaultCount} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">AssetCo Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summary.assetCoCards.map((co) => (
            <Link
              key={co.id}
              href={`/dashboard/${co.id}`}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow transition"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{co.name}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    co.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {co.isActive ? 'active' : 'inactive'}
                </span>
              </div>
              <dl className="mt-3 text-sm text-gray-600 space-y-1">
                <div className="flex justify-between"><dt>Active assets</dt><dd>{co.activeAssets}</dd></div>
                <div className="flex justify-between"><dt>Monthly collection</dt><dd>{formatCurrency(co.monthlyCollection)}</dd></div>
                <div className="flex justify-between"><dt>Defaults</dt><dd>{co.defaultCount}</dd></div>
                <div className="flex justify-between"><dt>Open faults</dt><dd>{co.openFaultCount}</dd></div>
                <div className="flex justify-between"><dt>Last sync</dt><dd>{timeAgo(co.lastSyncedAt)}</dd></div>
              </dl>
            </Link>
          ))}
          {summary.assetCoCards.length === 0 && (
            <p className="text-sm text-gray-500">No AssetCos onboarded yet.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Open Faults</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-2xl font-semibold">{summary.openFaultCount}</p>
            <p className="text-sm text-gray-500">across all AssetCos</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Active Alerts</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y">
            {summary.recentAlerts.length === 0 && (
              <p className="text-sm text-gray-500 p-4">No alerts yet.</p>
            )}
            {summary.recentAlerts.map((alert) => (
              <div key={alert.id} className="p-3 text-sm">
                <p className="font-medium">{alert.alert_type}</p>
                <p className="text-gray-600">{alert.message}</p>
                <p className="text-xs text-gray-400 mt-1">{timeAgo(alert.sent_at)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
