import Link from 'next/link';
import { getSeriesOverview } from '../../../lib/data';
import { formatCurrency } from '../../../lib/format';

const STATUS_STYLES = {
  OPEN: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
  UPCOMING: 'bg-blue-100 text-blue-700',
  PLANNING: 'bg-amber-100 text-amber-700',
};

export default async function SeriesOverviewPage() {
  const series = await getSeriesOverview();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
          ← Portfolio
        </Link>
        <h1 className="text-xl font-semibold mt-1">CEF Series</h1>
        <p className="text-sm text-gray-500">Each fundraising round and the AssetCos funded under it.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {series.map((s) => (
          <div key={s.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">{s.display_name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[s.status] || 'bg-gray-100 text-gray-500'}`}>
                {s.status}
              </span>
            </div>
            <div className="text-sm space-y-1 mb-3">
              <div className="flex justify-between"><span className="text-gray-500">Fund size</span><span>{s.total_fund_size_ngn ? formatCurrency(s.total_fund_size_ngn) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total deployed</span><span>{formatCurrency(s.totalDeployedNgn)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">AssetCos</span><span>{s.links.length}</span></div>
            </div>
            {s.description && <p className="text-xs text-gray-500 mb-2">{s.description}</p>}
            <div className="divide-y border-t text-sm">
              {s.links.map((link) => (
                <div key={link.id} className="py-2 flex justify-between">
                  <Link href={`/dashboard/${link.assetco?.id}/profile`} className="text-blue-600 hover:underline">
                    {link.assetco?.name || link.assetco_id}
                  </Link>
                  <span>{link.disbursement_amount_ngn ? formatCurrency(link.disbursement_amount_ngn) : '—'}</span>
                </div>
              ))}
              {s.links.length === 0 && <p className="py-2 text-xs text-gray-400">No AssetCos linked yet.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
