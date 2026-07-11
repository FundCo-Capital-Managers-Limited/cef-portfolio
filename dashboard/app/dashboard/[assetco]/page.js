import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAssetCoDetail, getAssetcoCustomers, getCurrentUserProfile, getMonthlyCollectionsTrend } from '../../../lib/data';
import { formatCurrency, timeAgo } from '../../../lib/format';
import ManualEntryButton from '../ManualEntryButton';
import { canManageAssetco } from '../../../lib/access';
import MonthlyTrendChart from '../charts/MonthlyTrendChart';
import CustomerTable from './CustomerTable';

export const metadata = { title: "AssetCo Dashboard" };

export default async function AssetCoDashboardPage({ params }) {
  const [detail, customers, profile, monthlyTrend] = await Promise.all([
    getAssetCoDetail(params.assetco),
    getAssetcoCustomers(params.assetco),
    getCurrentUserProfile(),
    getMonthlyCollectionsTrend(params.assetco),
  ]);

  if (!detail.assetco) notFound();

  const { assetco, openFaults, customerBreakdown, recentActivity, pipelineCustomers, pipelineSummary, allCustomers, allAssetIds } = detail;

  const showManualEntry =
    ['MANUAL', 'HYBRID'].includes(assetco.integration_type) && canManageAssetco(profile, assetco.id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
            ← Portfolio
          </Link>
          <h1 className="text-xl font-semibold mt-1">{assetco.name} Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          {showManualEntry && <ManualEntryButton assetcoId={assetco.id} customers={allCustomers} assetIds={allAssetIds} />}
          <Link href={`/dashboard/${assetco.id}/profile`} className="text-sm text-gray-500 hover:text-gray-800">
            Profile →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Customers</h2>
          <CustomerTable assetcoId={assetco.id} customers={customers} />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Customer Status Breakdown</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-4 grid grid-cols-2 gap-4">
            <div><p className="text-sm text-gray-500">Current</p><p className="text-xl font-semibold">{customerBreakdown.current}</p></div>
            <div><p className="text-sm text-gray-500">1 month arrears</p><p className="text-xl font-semibold">{customerBreakdown.arrears1}</p></div>
            <div><p className="text-sm text-gray-500">2+ months arrears</p><p className="text-xl font-semibold">{customerBreakdown.arrears2Plus}</p></div>
            <div><p className="text-sm text-gray-500">Defaulted</p><p className="text-xl font-semibold">{customerBreakdown.defaulted}</p></div>
          </div>
        </div>
      </div>

      <MonthlyTrendChart data={monthlyTrend} scope={assetco.name} />

      <div>
        <h2 className="text-lg font-semibold mb-3">Customer Pipeline</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center text-sm mb-4">
            <div>
              <p className="text-xl font-semibold">{pipelineSummary.pipeline}</p>
              <p className="text-gray-500 text-xs">Pipeline</p>
            </div>
            <div>
              <p className="text-xl font-semibold">{pipelineSummary.assetOrdered}</p>
              <p className="text-gray-500 text-xs">Asset Ordered</p>
            </div>
            <div>
              <p className="text-xl font-semibold">{pipelineSummary.installationScheduled}</p>
              <p className="text-gray-500 text-xs">Install Scheduled</p>
            </div>
            <div>
              <p className="text-xl font-semibold">{pipelineSummary.active}</p>
              <p className="text-gray-500 text-xs">Active</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-amber-600">{pipelineSummary.inArrears}</p>
              <p className="text-gray-500 text-xs">In Arrears</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-red-600">{pipelineSummary.defaulted}</p>
              <p className="text-gray-500 text-xs">Defaulted</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Total Pipeline Value: <span className="font-medium">{formatCurrency(pipelineSummary.totalPipelineValueNgn)}</span>
          </p>
          <div className="border-t divide-y">
            {pipelineCustomers.map((c) => (
              <div key={c.id} className="py-2 text-sm flex justify-between">
                <div>
                  <p>{c.id} <span className="text-xs text-gray-400">· {c.customer_segment || 'segment n/a'}</span></p>
                  <p className="text-xs text-gray-500">{c.location_state || 'state n/a'} · {c.status}</p>
                </div>
                <div className="text-right">
                  <p>{c.expected_monthly_payment_ngn ? formatCurrency(c.expected_monthly_payment_ngn) : '—'}/mo</p>
                  <p className="text-xs text-gray-500">expected install: {c.expected_installation_date || 'TBD'}</p>
                </div>
              </div>
            ))}
            {pipelineCustomers.length === 0 && <p className="py-3 text-sm text-gray-500">No customers in the pre-deployment pipeline.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Open Faults ({openFaults.length})</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y">
            {openFaults.map((f) => (
              <Link
                key={f.id}
                href={`/dashboard/${assetco.id}/assets/${f.asset_id}`}
                className="p-3 text-sm flex justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-blue-600 hover:underline">{f.asset_id}</span>
                <span className="text-gray-500">{timeAgo(f.detected_at)}</span>
              </Link>
            ))}
            {openFaults.length === 0 && <p className="text-sm text-gray-500 p-4">No open faults.</p>}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y max-h-80 overflow-y-auto">
            {recentActivity.map((e) =>
              e.asset_id ? (
                <Link
                  key={e.id}
                  href={`/dashboard/${assetco.id}/assets/${e.asset_id}`}
                  className="p-3 text-sm flex justify-between hover:bg-gray-50 transition-colors"
                >
                  <span>{e.event_type} — <span className="text-blue-600 hover:underline">{e.asset_id}</span></span>
                  <span className="text-gray-500">{timeAgo(e.received_at)}</span>
                </Link>
              ) : (
                <div key={e.id} className="p-3 text-sm flex justify-between">
                  <span>{e.event_type}</span>
                  <span className="text-gray-500">{timeAgo(e.received_at)}</span>
                </div>
              )
            )}
            {recentActivity.length === 0 && <p className="text-sm text-gray-500 p-4">No events yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
