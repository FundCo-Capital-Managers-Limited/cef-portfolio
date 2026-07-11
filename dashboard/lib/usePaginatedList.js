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
export function usePaginatedList(rows, { searchFn, pageSize = 10 } = {}) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);

  function setFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  function updateSearch(value) {
    setSearch(value);
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    search,
    setSearch: updateSearch,
    filters,
    setFilter,
    page: safePage,
    setPage,
    totalPages,
    totalCount: filtered.length,
    paginated,
  };
}
