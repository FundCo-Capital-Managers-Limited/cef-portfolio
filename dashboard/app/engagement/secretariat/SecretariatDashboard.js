'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../lib/apiClient';
import { formatDateTime } from '../../../lib/format';

const CONDITION_STATUS_STYLES = {
  OPEN: 'bg-blue-100 text-blue-700',
  PENDING_EVIDENCE: 'bg-amber-100 text-amber-700',
  UNDER_REVIEW: 'bg-purple-100 text-purple-700',
  OVERDUE: 'bg-red-100 text-red-600',
  BREACHED: 'bg-red-200 text-red-800',
};

const MINUTES_STATUS_STYLES = {
  NOT_STARTED: 'bg-gray-100 text-gray-500',
  DRAFT: 'bg-amber-100 text-amber-700',
  UNDER_REVIEW: 'bg-purple-100 text-purple-700',
  LOCKED: 'bg-green-100 text-green-700',
};

export default function SecretariatDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const todayIso = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    apiFetch('/api/ic/secretariat')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6">
      {data.meetingsNeedingMinutes.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
            {data.meetingsNeedingMinutes.length} meeting(s) need minutes locked
          </h2>
          <div className="space-y-1.5">
            {data.meetingsNeedingMinutes.map((m) => (
              <Link
                key={m.id}
                href={`/engagement/meetings/${m.id}`}
                className="block text-sm text-amber-900 dark:text-amber-200 hover:underline"
              >
                {formatDateTime(m.meeting_date)} — minutes {m.minutes_status.replace(/_/g, ' ').toLowerCase()}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Open Conditions &amp; Actions ({data.openConditions.length})</h2>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {data.openConditions.length === 0 && <p className="p-4 text-sm text-gray-500">Nothing open right now.</p>}
          {data.openConditions.map((c) => {
            const isOverdue = c.due_date && c.due_date < todayIso;
            return (
              <Link key={c.id} href={`/engagement/matters/${c.matter_id}`} className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{c.matter_title || 'Untitled matter'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${CONDITION_STATUS_STYLES[isOverdue ? 'OVERDUE' : c.status] || 'bg-gray-100 text-gray-500'}`}>
                    {isOverdue ? 'OVERDUE' : c.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{c.wording}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.due_date ? `Due ${c.due_date}` : 'No due date'}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Meetings</h2>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
          {data.meetings.map((m) => (
            <Link key={m.id} href={`/engagement/meetings/${m.id}`} className="p-4 flex items-center justify-between gap-2 hover:bg-gray-50 dark:hover:bg-gray-800">
              <span className="text-sm">{formatDateTime(m.meeting_date)}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-500">{m.status}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${MINUTES_STATUS_STYLES[m.minutes_status] || 'bg-gray-100 text-gray-500'}`}>
                  {m.minutes_status.replace(/_/g, ' ')}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
