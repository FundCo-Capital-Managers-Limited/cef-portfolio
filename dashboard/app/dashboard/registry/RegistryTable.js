'use client';

import { useState } from 'react';
import Link from 'next/link';
import { timeAgo } from '../../../lib/format';
import { usePaginatedList } from '../../../lib/usePaginatedList';
import Pagination from '../Pagination';

const SYNC_STATUSES = ['SYNCED', 'PENDING', 'STALE', 'ERROR'];
const ASSET_STATUSES = ['created', 'deployed', 'disabled', 'enabled', 'decommissioned'];

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

function searchAsset(a, term) {
  return (
    a.id.toLowerCase().includes(term) ||
    a.assetco_id.toLowerCase().includes(term) ||
    (a.customerName || '').toLowerCase().includes(term) ||
    (a.asset_type || '').toLowerCase().includes(term)
  );
}

export default function RegistryTable({ assets }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [syncFilter, setSyncFilter] = useState('');

  const preFiltered = assets
    .filter((a) => !statusFilter || a.status === statusFilter)
    .filter((a) => !syncFilter || a.sync_status === syncFilter);

  const { search, setSearch, page, setPage, totalPages, totalCount, paginated } = usePaginatedList(preFiltered, {
    searchFn: searchAsset,
    pageSize: 15,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          type="text"
          placeholder="Search asset ID, AssetCo, customer, or type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs border border-gray-300 rounded px-3 py-1.5 text-sm"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">All statuses</option>
          {ASSET_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={syncFilter} onChange={(e) => setSyncFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">All sync states</option>
          {SYNC_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
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
            {paginated.map((a) => (
              <tr key={a.id}>
                <td className="p-3">
                  <Link href={`/dashboard/${a.assetco_id}/assets/${a.id}`} className="text-blue-600 hover:underline">
                    {a.id}
                  </Link>
                </td>
                <td className="p-3">
                  <div>{a.asset_type || 'N/A'}</div>
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
                  ) : 'N/A'}
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
                  {!a.isDefaulted && !a.hasOpenFault && <span className="text-gray-400">None</span>}
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td className="p-3 text-gray-500" colSpan={8}>No assets match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} itemLabel="assets" />
    </div>
  );
}
