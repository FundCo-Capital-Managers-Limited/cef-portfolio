'use client';

import { ChevronUp, ChevronDown } from 'lucide-react';
import { usePaginatedList } from '../../lib/usePaginatedList';
import AssetCoRegistryCards from './AssetCoRegistryCards';
import Pagination from './Pagination';

function searchAssetCo(co, term) {
  return co.name.toLowerCase().includes(term) || co.id.toLowerCase().includes(term);
}

const SORT_OPTIONS = [
  { key: 'name', label: 'Name' },
  { key: 'activeAssets', label: 'Active assets' },
  { key: 'monthlyCollection', label: 'Monthly collection' },
  { key: 'defaultCount', label: 'Defaults' },
  { key: 'openFaultCount', label: 'Open faults' },
  { key: 'lastSyncedAt', label: 'Last sync' },
];

export default function AssetCoRegistryList({ assetCoCards }) {
  const { search, setSearch, page, setPage, totalPages, totalCount, paginated, sortKey, sortDir, toggleSort } =
    usePaginatedList(assetCoCards, { searchFn: searchAssetCo, pageSize: 9, initialSortKey: 'name' });

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          type="text"
          placeholder="Search AssetCo name or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs border border-gray-300 rounded px-3 py-1.5 text-sm"
        />
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <span className="text-xs">Sort by</span>
          <select
            value={sortKey}
            onChange={(e) => toggleSort(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => toggleSort(sortKey)}
            className="flex items-center gap-0.5 text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
            title="Toggle ascending/descending"
          >
            {sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {sortDir === 'asc' ? 'Asc' : 'Desc'}
          </button>
        </div>
      </div>

      <AssetCoRegistryCards assetCoCards={paginated} />

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} itemLabel="AssetCos" />
    </div>
  );
}
