'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';
import { timeAgo } from '../../lib/format';

const STATUS_STYLES = {
  OPEN: 'bg-amber-100 text-amber-700',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  SCHEDULED: 'bg-purple-100 text-purple-700',
  DECIDED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
  WITHDRAWN: 'bg-red-100 text-red-600',
};

// A matter's status is a linear-ish progression, but any status can move to
// WITHDRAWN or back to OPEN — this isn't a strict state machine yet (voting/
// decision-locking arrives in a later milestone), just a manual status field.
const STATUS_OPTIONS = Object.keys(STATUS_STYLES);

export default function MatterDetail({ matterId }) {
  const [matter, setMatter] = useState(null);
  const [error, setError] = useState(null);
  const [changingStatus, setChangingStatus] = useState(false);

  async function load() {
    try {
      const data = await apiFetch(`/api/ic/matters/${matterId}`);
      setMatter(data.matter);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [matterId]);

  async function handleStatusChange(status) {
    setChangingStatus(true);
    setError(null);
    try {
      await apiFetch(`/api/ic/matters/${matterId}`, { method: 'PATCH', body: { status } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingStatus(false);
    }
  }

  if (error && !matter) return <p className="text-sm text-red-600">{error}</p>;
  if (!matter) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">{matter.title}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[matter.status] || 'bg-gray-100 text-gray-500'}`}>
          {matter.status.replace(/_/g, ' ')}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {matter.category.replace(/_/g, ' ')} · {matter.decision_type}
        {matter.assetco_id ? ` · ${matter.assetco_id}` : ''} · raised by {matter.created_by_email} · {timeAgo(matter.created_at)}
      </p>
      {matter.description && <p className="text-sm text-gray-700 dark:text-gray-300">{matter.description}</p>}

      <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Change status</label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.filter((s) => s !== matter.status).map((s) => (
            <button
              key={s}
              disabled={changingStatus}
              onClick={() => handleStatusChange(s)}
              className="text-xs border border-gray-300 dark:border-gray-700 rounded px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>
    </div>
  );
}
