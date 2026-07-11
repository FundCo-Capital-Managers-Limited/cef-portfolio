'use client';

export default function Pagination({ page, totalPages, totalCount, onPageChange, itemLabel = 'items' }) {
  if (totalPages <= 1) {
    return totalCount > 0 ? (
      <p className="text-xs text-gray-400">{totalCount} {itemLabel}</p>
    ) : null;
  }

  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-xs text-gray-500">
        Page {page} of {totalPages} · {totalCount} {itemLabel}
      </p>
      <div className="flex gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
        >
          ← Prev
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
