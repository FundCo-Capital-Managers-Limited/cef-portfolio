'use client';

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export default function SortHeader({ label, sortKey: key, activeSortKey, sortDir, onSort }) {
  const isActive = activeSortKey === key;
  const Icon = isActive ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;

  return (
    <button
      type="button"
      onClick={() => onSort(key)}
      className={`flex items-center gap-1 hover:text-gray-800 dark:hover:text-gray-200 ${isActive ? 'text-gray-800 dark:text-gray-200' : ''}`}
    >
      {label}
      <Icon size={13} className={isActive ? '' : 'text-gray-300 dark:text-gray-600'} />
    </button>
  );
}
