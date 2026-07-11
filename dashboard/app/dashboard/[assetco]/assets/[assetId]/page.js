import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAssetDetail } from '../../../../../lib/data';
import { formatCurrency, formatDateTime, timeAgo } from '../../../../../lib/format';
import { OWNERSHIP_MODEL_LABELS } from '../../../../../lib/constants';

export const metadata = { title: "Asset Detail" };

export default async function AssetDetailPage({ params }) {
  const { asset, customerName, cashflow, payments, faults } = await getAssetDetail(params.assetId);

  if (!asset) notFound();

  return (
    <div className="space-y-8">
      <div>
        {asset.customer_id ? (
          <Link href={`/dashboard/${params.assetco}/customers/${asset.customer_id}`} className="text-sm text-gray-500 hover:text-gray-800">
            ← {customerName || asset.customer_id}
          </Link>
        ) : (
          <Link href={`/dashboard/${params.assetco}`} className="text-sm text-gray-500 hover:text-gray-800">
            ← {params.assetco}
          </Link>
        )}
        <h1 className="text-xl font-semibold mt-1">
          Asset {asset.id}
          {customerName && <span className="text-gray-400 font-normal"> — {customerName}</span>}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Asset Identity</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-gray-500">AssetCo</span><span>{asset.assetco_id}</span></div>
            <div className="flex justify-between">
              <span className="text-gray-500">Customer</span>
              <span>
                {asset.customer_id ? (
                  <Link href={`/dashboard/${params.assetco}/customers/${asset.customer_id}`} className="text-blue-600 hover:underline">
                    {customerName || asset.customer_id}
                  </Link>
                ) : '—'}
              </span>
            </div>
            <div className="flex justify-between"><span className="text-gray-500">Asset type</span><span>{asset.asset_type || '—'}</span></div>
            {asset.equipment_spec && (
              <div className="flex justify-between"><span className="text-gray-500">Equipment</span><span>{asset.equipment_spec}</span></div>
            )}
            <div className="flex justify-between"><span className="text-gray-500">Status</span><span>{asset.status}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Deployed</span><span>{formatDateTime(asset.deployed_at)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Sync status</span><span>{asset.sync_status}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Last synced</span><span>{timeAgo(asset.last_synced_at)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Deal type</span><span>{OWNERSHIP_MODEL_LABELS[asset.ownership_model] || asset.ownership_model}</span></div>
            {(asset.oem_model || asset.oem_manufacturer) && (
              <div className="flex justify-between"><span className="text-gray-500">OEM</span><span>{[asset.oem_manufacturer, asset.oem_model].filter(Boolean).join(' — ')}</span></div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Financial Performance</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-gray-500">Total collected</span><span>{formatCurrency(cashflow?.total_collected)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Outstanding balance</span><span>{formatCurrency(cashflow?.outstanding_balance)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Missed payments</span><span>{cashflow?.missed_count ?? 0}</span></div>
            <div className="flex justify-between">
              <span className="text-gray-500">Default status</span>
              <span>
                {cashflow?.is_defaulted ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">defaulted {timeAgo(cashflow.defaulted_at)}</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">current</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Remote Control</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm">
          {asset.remote_control_supported ? (
            <div className="space-y-2">
              <p className="text-gray-600">
                This asset supports remote control. Control actions (dual-approval, audit trail) are a
                Phase 2 capability — these buttons are inert for now.
              </p>
              <div className="flex gap-2">
                <button
                  disabled
                  title="Remote control actions are Phase 2 — flag tracking only for now"
                  className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-400 cursor-not-allowed"
                >
                  Disable Asset
                </button>
                <button
                  disabled
                  title="Remote control actions are Phase 2 — flag tracking only for now"
                  className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-400 cursor-not-allowed"
                >
                  Enable Asset
                </button>
              </div>
            </div>
          ) : asset.oem_remote_control_api_available ? (
            <div className="bg-amber-50 text-amber-800 rounded p-3">
              <p>
                Remote control is supported by this OEM{asset.oem_model ? ` (${asset.oem_model})` : ''} but the
                integration has not yet been enabled for {asset.assetco_id}.
              </p>
              <p className="text-xs mt-1">Contact the IT team to request this feature.</p>
            </div>
          ) : (
            <div className="bg-blue-50 text-blue-800 rounded p-3">
              <p>Remote control is not available for this asset.</p>
              <p className="text-xs mt-1">
                {asset.oem_model
                  ? `(${asset.oem_model}${asset.oem_manufacturer ? ` by ${asset.oem_manufacturer}` : ''} does not support remote commands.)`
                  : '(The OEM hardware for this asset does not support remote commands.)'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Payment History</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="p-3">{formatDateTime(p.occurred_at)}</td>
                  <td className="p-3">{formatCurrency(p.amount, p.currency)}</td>
                  <td className="p-3">{p.status}</td>
                  <td className="p-3 text-gray-500">{p.source_ref || '—'}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={4}>No payments recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Fault Log</h2>
        <div className="bg-white rounded-lg border border-gray-200 divide-y">
          {faults.map((f) => (
            <div key={f.id} className="p-3 text-sm flex justify-between">
              <span>{f.status === 'open' ? 'Open' : 'Resolved'}</span>
              <span className="text-gray-500">
                detected {formatDateTime(f.detected_at)}
                {f.resolved_at ? ` · resolved ${formatDateTime(f.resolved_at)}` : ''}
              </span>
            </div>
          ))}
          {faults.length === 0 && <p className="text-sm text-gray-500 p-4">No faults recorded.</p>}
        </div>
      </div>
    </div>
  );
}
