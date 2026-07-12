'use client';

import { useMemo, useState } from 'react';

/**
 * Client-side search + filter + pagination over an already-fetched array.
 * Fine at current data volumes (reads come back as a single array from
 * Supabase/the API with no server-side paging yet) — if a list grows large
 * enough that fetching it whole becomes the bottleneck, this is the seam to
 * swap for server-side range()/limit+offset without touching callers much,
 * since the returned shape (paginated rows + page controls) stays the same.
 */
export function usePaginatedList(rows, { searchFn, pageSize = 10, initialSortKey = null, initialSortDir = 'asc' } = {}) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(initialSortKey);
  const [sortDir, setSortDir] = useState(initialSortDir);

  function setFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  function updateSearch(value) {
    setSearch(value);
    setPage(1);
  }

  // Toggling the same column flips direction; picking a new column starts
  // ascending — the usual spreadsheet/table convention.
  function toggleSort(key) {
    setSortKey((current) => {
      if (current === key) {
        setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        return current;
      }
      setSortDir('asc');
      return key;
    });
    setPage(1);
  }

  const filtered = useMemo(() => {
    let result = rows;
    const activeFilterEntries = Object.entries(filters).filter(([, v]) => v);
    if (activeFilterEntries.length) {
      result = result.filter((row) => activeFilterEntries.every(([key, value]) => row[key] === value));
    }
    const term = search.trim().toLowerCase();
    if (term && searchFn) {
      result = result.filter((row) => searchFn(row, term));
    }
    return result;
  }, [rows, filters, search, searchFn]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    search,
    setSearch: updateSearch,
    filters,
    setFilter,
    page: safePage,
    setPage,
    totalPages,
    totalCount: sorted.length,
    paginated,
    sortKey,
    sortDir,
    toggleSort,
  };
}
