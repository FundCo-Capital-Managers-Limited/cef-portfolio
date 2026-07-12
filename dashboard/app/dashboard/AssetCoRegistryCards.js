import Link from 'next/link';
import { timeAgo } from '../../lib/format';
import { formatCurrency } from '../../lib/format';

// Shared between the portfolio homepage (a preview) and the dedicated
// AssetCo Registry page (the full list) so both stay visually identical.
export default function AssetCoRegistryCards({ assetCoCards }) {
  if (assetCoCards.length === 0) {
    return <p className="text-sm text-gray-500">No AssetCos onboarded yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {assetCoCards.map((co) => (
        <Link
          key={co.id}
          href={`/dashboard/${co.id}`}
          className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-t-4 border-t-brand-teal p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
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
          <dl className="mt-3 text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <div className="flex justify-between"><dt>Active assets</dt><dd>{co.activeAssets}</dd></div>
            <div className="flex justify-between"><dt>Monthly collection</dt><dd>{formatCurrency(co.monthlyCollection)}</dd></div>
            <div className="flex justify-between"><dt>Defaults</dt><dd>{co.defaultCount}</dd></div>
            <div className="flex justify-between"><dt>Open faults</dt><dd>{co.openFaultCount}</dd></div>
            <div className="flex justify-between"><dt>Last sync</dt><dd>{timeAgo(co.lastSyncedAt)}</dd></div>
          </dl>
        </Link>
      ))}
    </div>
  );
}
