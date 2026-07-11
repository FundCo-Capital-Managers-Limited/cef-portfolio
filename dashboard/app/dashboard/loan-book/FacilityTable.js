'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDateTime } from '../../../lib/format';
import { FACILITY_STATUS_STYLES, FACILITY_STATUSES } from '../../../lib/constants';
import { usePaginatedList } from '../../../lib/usePaginatedList';
import Pagination from '../Pagination';

function searchFacility(f, term) {
  return (
    f.assetCoName.toLowerCase().includes(term) ||
    (f.facilityReference || '').toLowerCase().includes(term) ||
    (f.seriesName || '').toLowerCase().includes(term)
  );
}

export default function FacilityTable({ facilities }) {
  const [statusFilter, setStatusFilter] = useState('');
  const { search, setSearch, page, setPage, totalPages, totalCount, paginated } = usePaginatedList(
    statusFilter ? facilities.filter((f) => f.facilityStatus === statusFilter) : facilities,
    { searchFn: searchFacility, pageSize: 10 }
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search AssetCo, facility reference, or series…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs border border-gray-300 rounded px-3 py-1.5 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          {FACILITY_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 border-b">
            <tr>
              <th className="p-3">AssetCo</th>
              <th className="p-3">Facility Ref</th>
              <th className="p-3">Series</th>
              <th className="p-3">Type</th>
              <th className="p-3">Principal</th>
              <th className="p-3">Repaid</th>
              <th className="p-3">Outstanding</th>
              <th className="p-3">Status</th>
              <th className="p-3">Disbursed</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginated.map((f) => (
              <tr key={f.id}>
                <td className="p-3">
                  <Link href={`/dashboard/${f.assetCoId}/profile`} className="text-blue-600 hover:underline">
                    {f.assetCoName}
                  </Link>
                </td>
                <td className="p-3 text-gray-600">{f.facilityReference || '—'}</td>
                <td className="p-3 text-gray-600">{f.seriesName || '—'}</td>
                <td className="p-3 text-gray-600">{f.facilityType}</td>
                <td className="p-3">{formatCurrency(f.principalAmountNgn)}</td>
                <td className="p-3">{formatCurrency(f.totalRepaidNgn)}</td>
                <td className="p-3">{formatCurrency(f.outstandingBalanceNgn)}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${FACILITY_STATUS_STYLES[f.facilityStatus] || 'bg-gray-100 text-gray-500'}`}>
                    {f.facilityStatus}
                  </span>
                </td>
                <td className="p-3 text-gray-500 text-xs">{f.disbursementDate ? formatDateTime(f.disbursementDate) : '—'}</td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td className="p-3 text-gray-500" colSpan={9}>No facilities match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} itemLabel="facilities" />
    </div>
  );
}
