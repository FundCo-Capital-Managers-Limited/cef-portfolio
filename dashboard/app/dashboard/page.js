import Link from 'next/link';
import { getPortfolioSummary, getLoanBook, getMonthlyCollectionsTrend } from '../../lib/data';
import { formatCurrency, timeAgo } from '../../lib/format';
import { FACILITY_STATUS_STYLES } from '../../lib/constants';
import { alertRoute } from '../../lib/entityRoutes';
import MonthlyTrendChart from './charts/MonthlyTrendChart';
import AssetCoComparisonChart from './charts/AssetCoComparisonChart';
import LoanBookChart from './charts/LoanBookChart';

function StatCard({ label, value, tone }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 border-t-4 border-t-brand-blue p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${tone || 'text-brand-navy'}`}>{value}</p>
    </div>
  );
}

function repaymentRateTone(rate) {
  if (rate > 80) return 'text-green-600';
  if (rate >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export default async function PortfolioDashboardPage() {
  const [summary, loanBook, monthlyTrend] = await Promise.all([
    getPortfolioSummary(),
    getLoanBook(),
    getMonthlyCollectionsTrend(),
  ]);

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
                <div className="flex items-center gap-1">
                  {co.pipelineCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Pipeline: {co.pipelineCount}
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      co.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {co.isActive ? 'active' : 'inactive'}
                  </span>
                </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MonthlyTrendChart data={monthlyTrend} />
        <AssetCoComparisonChart assetCoCards={summary.assetCoCards} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">CEF Loan Book</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <StatCard label="Total Capital Deployed" value={formatCurrency(loanBook.totalFacilitiesNgn)} />
          <StatCard label="Total Repaid to CEF" value={formatCurrency(loanBook.totalRepaidNgn)} />
          <StatCard label="Outstanding Loan Book" value={formatCurrency(loanBook.totalOutstandingNgn)} />
          <StatCard
            label="Repayment Rate"
            value={`${loanBook.repaymentRatePercent.toFixed(1)}%`}
            tone={repaymentRateTone(loanBook.repaymentRatePercent)}
          />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="p-3">AssetCo</th>
                <th className="p-3">Facility Amount</th>
                <th className="p-3">Repaid</th>
                <th className="p-3">Outstanding</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loanBook.byAssetCo.map((row) => (
                <tr key={row.assetCoId}>
                  <td className="p-3">
                    <Link href={`/dashboard/${row.assetCoId}/profile`} className="text-blue-600 hover:underline">
                      {row.assetCoName}
                    </Link>
                  </td>
                  <td className="p-3">{formatCurrency(row.totalFacilityNgn)}</td>
                  <td className="p-3">{formatCurrency(row.totalRepaidNgn)}</td>
                  <td className="p-3">{formatCurrency(row.outstandingNgn)}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${FACILITY_STATUS_STYLES[row.facilityStatus] || 'bg-gray-100 text-gray-500'}`}>
                      {row.facilityStatus}
                    </span>
                  </td>
                </tr>
              ))}
              {loanBook.byAssetCo.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={5}>No CEF facilities recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <LoanBookChart byAssetCo={loanBook.byAssetCo} />
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
            {summary.recentAlerts.map((alert) => {
              const route = alertRoute(alert);
              const body = (
                <>
                  <p className="font-medium">{alert.alert_type}</p>
                  <p className="text-gray-600">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(alert.sent_at)}</p>
                </>
              );
              return route ? (
                <Link key={alert.id} href={route} className="block p-3 text-sm hover:bg-gray-50 transition-colors">
                  {body}
                </Link>
              ) : (
                <div key={alert.id} className="p-3 text-sm">
                  {body}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
