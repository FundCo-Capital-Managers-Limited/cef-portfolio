import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAssetCoDetail } from '../../../lib/data';
import { formatCurrency, timeAgo } from '../../../lib/format';

export default async function AssetCoDashboardPage({ params }) {
  const detail = await getAssetCoDetail(params.assetco);

  if (!detail.assetco) notFound();

  const { assetco, assets, openFaults, customerBreakdown, recentActivity, pipelineCustomers, pipelineSummary } = detail;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
            ← Portfolio
          </Link>
          <h1 className="text-xl font-semibold mt-1">{assetco.name} Dashboard</h1>
        </div>
        <Link href={`/dashboard/${assetco.id}/profile`} className="text-sm text-gray-500 hover:text-gray-800">
          Profile →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Asset Cashflow Performance</h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b">
                <tr>
                  <th className="p-3">Asset</th>
                  <th className="p-3">Collected</th>
                  <th className="p-3">Outstanding</th>
                  <th className="p-3">Missed</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {assets.map((a) => (
                  <tr key={a.asset_id}>
                    <td className="p-3">
                      <Link href={`/dashboard/${assetco.id}/assets/${a.asset_id}`} className="text-blue-600 hover:underline">
                        {a.asset_id}
                      </Link>
                    </td>
                    <td className="p-3">{formatCurrency(a.total_collected)}</td>
                    <td className="p-3">{formatCurrency(a.outstanding_balance)}</td>
                    <td className="p-3">{a.missed_count}</td>
                    <td className="p-3">
                      {a.is_defaulted ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">defaulted</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">current</span>
                      )}
                    </td>
                  </tr>
                ))}
                {assets.length === 0 && (
                  <tr><td className="p-3 text-gray-500" colSpan={5}>No assets recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
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
              <div key={f.id} className="p-3 text-sm flex justify-between">
                <span>{f.asset_id}</span>
                <span className="text-gray-500">{timeAgo(f.detected_at)}</span>
              </div>
            ))}
            {openFaults.length === 0 && <p className="text-sm text-gray-500 p-4">No open faults.</p>}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y max-h-80 overflow-y-auto">
            {recentActivity.map((e) => (
              <div key={e.id} className="p-3 text-sm flex justify-between">
                <span>{e.event_type} — {e.asset_id || '—'}</span>
                <span className="text-gray-500">{timeAgo(e.received_at)}</span>
              </div>
            ))}
            {recentActivity.length === 0 && <p className="text-sm text-gray-500 p-4">No events yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
