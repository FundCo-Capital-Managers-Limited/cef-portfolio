'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DREEF_STAGE_LABELS, DREEF_STAGES, PIPELINE_STAGE_LABELS } from '../../../lib/constants';
import { usePaginatedList } from '../../../lib/usePaginatedList';
import Pagination from '../Pagination';

const DREEF_BADGE_STYLES = {
  MANDATED: 'bg-green-100 text-green-700',
  UNDER_GUARANTEE: 'bg-green-100 text-green-700',
  DISBURSED: 'bg-green-100 text-green-700',
  INITIAL_ASSESSMENT: 'bg-amber-100 text-amber-700',
  NOT_STARTED: 'bg-gray-100 text-gray-500',
  NOT_APPLICABLE: 'bg-gray-100 text-gray-500',
};

function searchRelationship(r, term) {
  return (
    (r.assetco?.name || r.assetco_id || '').toLowerCase().includes(term) ||
    (r.assetco?.sector || '').toLowerCase().includes(term)
  );
}

export default function DreefTable({ relationships }) {
  const [stageFilter, setStageFilter] = useState('');
  const preFiltered = stageFilter ? relationships.filter((r) => r.dreef_stage === stageFilter) : relationships;

  const { search, setSearch, page, setPage, totalPages, totalCount, paginated } = usePaginatedList(preFiltered, {
    searchFn: searchRelationship,
    pageSize: 15,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          type="text"
          placeholder="Search AssetCo or sector…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs border border-gray-300 rounded px-3 py-1.5 text-sm"
        />
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">All DREEF stages</option>
          {DREEF_STAGES.map((s) => <option key={s} value={s}>{DREEF_STAGE_LABELS[s] || s}</option>)}
        </select>
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
            {paginated.map((r) => (
              <tr key={r.id}>
                <td className="p-3">
                  <Link href={`/dashboard/${r.assetco?.id}/profile`} className="text-blue-600 hover:underline">
                    {r.assetco?.name || r.assetco_id}
                  </Link>
                </td>
                <td className="p-3">{r.assetco?.sector || 'N/A'}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${DREEF_BADGE_STYLES[r.dreef_stage] || 'bg-gray-100 text-gray-500'}`}>
                    {DREEF_STAGE_LABELS[r.dreef_stage] || r.dreef_stage}
                  </span>
                </td>
                <td className="p-3">{PIPELINE_STAGE_LABELS[r.assetco?.pipeline_stage] || 'N/A'}</td>
                <td className="p-3">
                  {r.assetco?.pipeline_stage === 'PORTFOLIO_MONITORING' ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Yes</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">No</span>
                  )}
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td className="p-3 text-gray-500" colSpan={5}>No InfraCredit/DREEF relationships match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} itemLabel="AssetCos" />
    </div>
  );
}
