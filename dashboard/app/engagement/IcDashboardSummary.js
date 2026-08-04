'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/apiClient';
import { formatDateTime } from '../../lib/format';

function StatTile({ label, count, href }) {
  return (
    <Link
      href={href}
      className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-brand-blue transition-colors"
    >
      <p className="text-2xl font-semibold text-brand-navy dark:text-gray-100">{count}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </Link>
  );
}

// Deliberately basic per Milestone 9's own scope - a few counts and short
// lists rather than the full CIO/member/portfolio dashboard split from the
// IC Operating System scope doc's Section 17.
export default function IcDashboardSummary() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/api/ic/dashboard')
      .then((data) => setSummary(data.summary))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!summary) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-4 gap-4">
        <StatTile label="Open / Under Review Matters" count={summary.openMattersCount} href="/engagement/matters" />
        <StatTile label="Upcoming Meetings" count={summary.upcomingMeetingsCount} href="/engagement/meetings" />
        <StatTile label="Overdue Conditions (portfolio-wide)" count={summary.overdueConditionsCount} href="/engagement/matters" />
        <StatTile label="My Open Conditions" count={summary.myConditionsCount} href="/engagement/matters" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-2">Upcoming Meetings</h2>
          {summary.upcomingMeetings.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-400">None scheduled.</p>}
          <div className="space-y-1.5">
            {summary.upcomingMeetings.map((m) => (
              <Link key={m.id} href={`/engagement/meetings/${m.id}`} className="block text-sm text-blue-600 hover:underline">
                {formatDateTime(m.meeting_date)}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-2">Matters Needing Attention</h2>
          {summary.openMatters.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-400">Nothing open right now.</p>}
          <div className="space-y-1.5">
            {summary.openMatters.map((m) => (
              <Link key={m.id} href={`/engagement/matters/${m.id}`} className="block text-sm text-blue-600 hover:underline">
                {m.title}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-2">My Open Conditions</h2>
          {summary.myConditions.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-400">Nothing assigned to you.</p>}
          <div className="space-y-1.5">
            {summary.myConditions.map((c) => (
              <Link key={c.id} href={`/engagement/matters/${c.matter_id}`} className="block text-sm">
                <span className="text-blue-600 hover:underline">{c.wording}</span>
                {c.due_date && <span className="text-xs text-gray-500 dark:text-gray-400"> — due {c.due_date}</span>}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-2">Overdue Conditions</h2>
          {summary.overdueConditions.length === 0 && <p className="text-xs text-gray-500 dark:text-gray-400">Nothing overdue.</p>}
          <div className="space-y-1.5">
            {summary.overdueConditions.map((c) => (
              <Link key={c.id} href={`/engagement/matters/${c.matter_id}`} className="block text-sm">
                <span className="text-red-600 hover:underline">{c.wording}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400"> — due {c.due_date}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
