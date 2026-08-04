'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, FileCheck2, ShieldAlert, Gavel } from 'lucide-react';
import { apiFetch } from '../../../lib/apiClient';
import { formatCurrency } from '../../../lib/format';

// Module D: Executive Portfolio Monitoring Dashboard Blueprint - PAR
// buckets, documentation completeness, collateral coverage, and covenant
// breach concentration. Deliberately basic per the credit-risk track's own
// scope, same spirit as the IC dashboard.
export default function RiskSummaryTiles() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/api/portfolio/risk-summary')
      .then((data) => setSummary(data.summary))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return null;
  if (!summary) return <p className="text-sm text-gray-500">Loading risk summary…</p>;

  const totalPar = summary.parBuckets.par1To30 + summary.parBuckets.par31To90 + summary.parBuckets.par91Plus;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><AlertTriangle size={14} /> Portfolio at Risk</div>
        <p className="text-lg font-semibold">{formatCurrency(totalPar)}</p>
        <p className="text-xs text-gray-500 mt-1">
          1-30d {formatCurrency(summary.parBuckets.par1To30)} · 31-90d {formatCurrency(summary.parBuckets.par31To90)} · 91d+ {formatCurrency(summary.parBuckets.par91Plus)}
        </p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><FileCheck2 size={14} /> Documentation Completeness</div>
        <p className="text-lg font-semibold">{summary.documentationCompletenessPercent === null ? 'N/A' : `${summary.documentationCompletenessPercent}%`}</p>
        <p className="text-xs text-gray-500 mt-1">{summary.totalDocuments} document(s) recorded</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><ShieldAlert size={14} /> Collateral Coverage</div>
        <p className="text-lg font-semibold">{summary.collateralCoverageRatio === null ? 'N/A' : `${(summary.collateralCoverageRatio * 100).toFixed(0)}%`}</p>
        <p className="text-xs text-gray-500 mt-1">{summary.unperfectedSecurityCount} unperfected/incomplete record(s)</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Gavel size={14} /> Covenant Breaches</div>
        <p className="text-lg font-semibold">{summary.covenantBreachCount}</p>
        <p className="text-xs text-gray-500 mt-1">
          Financial {summary.covenantBreachByType.FINANCIAL} · Reporting {summary.covenantBreachByType.REPORTING} · Operational {summary.covenantBreachByType.OPERATIONAL} · Negative {summary.covenantBreachByType.NEGATIVE}
        </p>
      </div>
    </div>
  );
}
