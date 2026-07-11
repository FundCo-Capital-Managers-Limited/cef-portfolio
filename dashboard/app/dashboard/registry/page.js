import Link from 'next/link';
import { getAssetRegistry } from '../../../lib/data';
import { timeAgo } from '../../../lib/format';

function SyncBadge({ status }) {
  const styles = {
    SYNCED: 'bg-green-100 text-green-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    STALE: 'bg-orange-100 text-orange-700',
    ERROR: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

export default async function AssetRegistryPage() {
  const assets = await getAssetRegistry();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
          ← Portfolio
        </Link>
        <h1 className="text-xl font-semibold mt-1">Asset Registry</h1>
        <p className="text-sm text-gray-500">
          Unified inventory of every CEF-funded asset across all AssetCos ({assets.length} total).
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 border-b">
            <tr>
              <th className="p-3">Asset</th>
              <th className="p-3">Type</th>
              <th className="p-3">AssetCo</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Status</th>
              <th className="p-3">Sync</th>
              <th className="p-3">Last Synced</th>
              <th className="p-3">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {assets.map((a) => (
              <tr key={a.id}>
                <td className="p-3">
                  <Link href={`/dashboard/${a.assetco_id}/assets/${a.id}`} className="text-blue-600 hover:underline">
                    {a.id}
                  </Link>
                </td>
                <td className="p-3">
                  <div>{a.asset_type || '—'}</div>
                  {a.equipment_spec && <div className="text-xs text-gray-400">{a.equipment_spec}</div>}
                </td>
                <td className="p-3">
                  <Link href={`/dashboard/${a.assetco_id}`} className="hover:underline">
                    {a.assetco_id}
                  </Link>
                </td>
                <td className="p-3">
                  {a.customer_id ? (
                    <Link href={`/dashboard/${a.assetco_id}/customers/${a.customer_id}`} className="text-blue-600 hover:underline">
                      {a.customerName}
                    </Link>
                  ) : '—'}
                </td>
                <td className="p-3">{a.status}</td>
                <td className="p-3"><SyncBadge status={a.sync_status} /></td>
                <td className="p-3 text-gray-500">{timeAgo(a.last_synced_at)}</td>
                <td className="p-3 space-x-1">
                  {a.isDefaulted && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">defaulted</span>
                  )}
                  {a.hasOpenFault && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">fault</span>
                  )}
                  {!a.isDefaulted && !a.hasOpenFault && <span className="text-gray-400">—</span>}
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr><td className="p-3 text-gray-500" colSpan={8}>No assets registered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
