'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '../../../lib/format';
import { OWNERSHIP_MODEL_LABELS, CUSTOMER_STATUSES } from '../../../lib/constants';
import { usePaginatedList } from '../../../lib/usePaginatedList';
import Pagination from '../Pagination';
import SortHeader from '../SortHeader';

function searchCustomer(c, term) {
  return (
    (c.name || c.id).toLowerCase().includes(term) ||
    c.assetTypes.join(' ').toLowerCase().includes(term)
  );
}

export default function CustomerTable({ assetcoId, customers }) {
  const [statusFilter, setStatusFilter] = useState('');
  const preFiltered = statusFilter ? customers.filter((c) => c.status === statusFilter) : customers;

  const { search, setSearch, page, setPage, totalPages, totalCount, paginated, sortKey, sortDir, toggleSort } =
    usePaginatedList(preFiltered, { searchFn: searchCustomer, pageSize: 10 });

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          type="text"
          placeholder="Search customer or asset type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs border border-gray-300 rounded px-3 py-1.5 text-sm"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">All statuses</option>
          {CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 border-b">
            <tr>
              <th className="p-3"><SortHeader label="Customer" sortKey="name" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} /></th>
              <th className="p-3">Deal Type</th>
              <th className="p-3">Asset Type(s)</th>
              <th className="p-3"><SortHeader label="Project Value" sortKey="projectValueNgn" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} /></th>
              <th className="p-3"><SortHeader label="Status" sortKey="status" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} /></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginated.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-3">
                  <Link href={`/dashboard/${assetcoId}/customers/${c.id}`} className="text-blue-600 hover:underline">
                    {c.name || c.id}
                  </Link>
                </td>
                <td className="p-3">{c.dealType ? OWNERSHIP_MODEL_LABELS[c.dealType] || c.dealType : 'N/A'}</td>
                <td className="p-3">{c.assetTypes.length ? c.assetTypes.join(', ') : 'N/A'}</td>
                <td className="p-3">{formatCurrency(c.projectValueNgn)}</td>
                <td className="p-3">
                  {c.isDefaulted ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">defaulted</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">{c.status}</span>
                  )}
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td className="p-3 text-gray-500" colSpan={5}>No customers match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} itemLabel="customers" />
    </div>
  );
}
