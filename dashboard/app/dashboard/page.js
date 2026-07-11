import Link from 'next/link';
import { Wallet, TrendingDown, Percent, AlertTriangle, Landmark, PiggyBank, ShieldCheck, Zap, Bell, ArrowRight } from 'lucide-react';
import { getPortfolioSummary, getLoanBook, getMonthlyCollectionsTrend } from '../../lib/data';
import { formatCurrency, timeAgo } from '../../lib/format';
import { alertRoute } from '../../lib/entityRoutes';
import MonthlyTrendChart from './charts/MonthlyTrendChart';
import AssetCoComparisonChart from './charts/AssetCoComparisonChart';
import StatCard from './StatCard';

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
        <h1 className="text-xl font-semibold mb-4 dark:text-white">Portfolio Cashflow Summary</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Collected" value={formatCurrency(summary.totalCollected)} Icon={Wallet} iconTone="green" />
          <StatCard label="Outstanding" value={formatCurrency(summary.totalOutstanding)} Icon={TrendingDown} iconTone="amber" />
          <StatCard
            label="Collection Rate"
            value={summary.collectionRate === null ? '—' : `${Math.round(summary.collectionRate * 100)}%`}
            Icon={Percent}
            iconTone="blue"
          />
          <StatCard label="Defaulting Customers" value={summary.defaultCount} Icon={AlertTriangle} iconTone="red" />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 dark:text-white">AssetCo Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summary.assetCoCards.map((co) => (
            <Link
              key={co.id}
              href={`/dashboard/${co.id}`}
              className="group bg-white rounded-lg border border-gray-200 border-t-4 border-t-brand-teal p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium dark:text-white group-hover:text-brand-blue transition-colors">{co.name}</h3>
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
            <Landmark size={18} className="text-brand-navy dark:text-brand-teal" />
            CEF Loan Book
          </h2>
          <Link href="/dashboard/loan-book" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            View full Loan Book <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Capital Deployed" value={formatCurrency(loanBook.totalFacilitiesNgn)} Icon={Landmark} iconTone="navy" />
          <StatCard label="Total Repaid to CEF" value={formatCurrency(loanBook.totalRepaidNgn)} Icon={PiggyBank} iconTone="green" />
          <StatCard label="Outstanding Loan Book" value={formatCurrency(loanBook.totalOutstandingNgn)} Icon={TrendingDown} iconTone="amber" />
          <StatCard
            label="Repayment Rate"
            value={`${loanBook.repaymentRatePercent.toFixed(1)}%`}
            tone={repaymentRateTone(loanBook.repaymentRatePercent)}
            Icon={ShieldCheck}
            iconTone="green"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Showing {loanBook.byAssetCo.length} AssetCo{loanBook.byAssetCo.length === 1 ? '' : 's'} with an active CEF
          facility. See the full Loan Book for every AssetCo, series breakdown, and individual facilities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 dark:text-white">
            <Zap size={18} className="text-amber-500" />
            Open Faults ({summary.openFaultCount})
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-2xl font-semibold dark:text-white">{summary.openFaultCount}</p>
            <p className="text-sm text-gray-500">across all AssetCos</p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 dark:text-white">
            <Bell size={18} className="text-brand-blue" />
            Active Alerts
          </h2>
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
