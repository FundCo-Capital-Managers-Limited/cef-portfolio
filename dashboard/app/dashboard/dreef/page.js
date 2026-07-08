import Link from 'next/link';
import { getDreefPipeline } from '../../../lib/data';
import { DREEF_STAGE_LABELS } from '../../../lib/constants';
import { PIPELINE_STAGE_LABELS } from '../../../lib/constants';

const DREEF_BADGE_STYLES = {
  MANDATED: 'bg-green-100 text-green-700',
  UNDER_GUARANTEE: 'bg-green-100 text-green-700',
  DISBURSED: 'bg-green-100 text-green-700',
  INITIAL_ASSESSMENT: 'bg-amber-100 text-amber-700',
  NOT_STARTED: 'bg-gray-100 text-gray-500',
  NOT_APPLICABLE: 'bg-gray-100 text-gray-500',
};

export default async function DreefPipelinePage() {
  const relationships = await getDreefPipeline();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
          ← Portfolio
        </Link>
        <h1 className="text-xl font-semibold mt-1">DREEF Pipeline</h1>
        <p className="text-sm text-gray-500">
          Every AssetCo with an InfraCredit/DREEF relationship — including those not yet funded by CEF.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 border-b">
            <tr>
              <th className="p-3">AssetCo</th>
              <th className="p-3">Sector</th>
              <th className="p-3">DREEF Stage</th>
              <th className="p-3">CEF Pipeline Stage</th>
              <th className="p-3">CEF Invested</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {relationships.map((r) => (
              <tr key={r.id}>
                <td className="p-3">
                  <Link href={`/dashboard/${r.assetco?.id}/profile`} className="text-blue-600 hover:underline">
                    {r.assetco?.name || r.assetco_id}
                  </Link>
                </td>
                <td className="p-3">{r.assetco?.sector || '—'}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${DREEF_BADGE_STYLES[r.dreef_stage] || 'bg-gray-100 text-gray-500'}`}>
                    {DREEF_STAGE_LABELS[r.dreef_stage] || r.dreef_stage}
                  </span>
                </td>
                <td className="p-3">{PIPELINE_STAGE_LABELS[r.assetco?.pipeline_stage] || '—'}</td>
                <td className="p-3">
                  {r.assetco?.pipeline_stage === 'PORTFOLIO_MONITORING' ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Yes</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">No</span>
                  )}
                </td>
              </tr>
            ))}
            {relationships.length === 0 && (
              <tr><td className="p-3 text-gray-500" colSpan={5}>No InfraCredit/DREEF relationships recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
