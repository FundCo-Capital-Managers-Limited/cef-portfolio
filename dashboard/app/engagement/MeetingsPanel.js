'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/apiClient';
import { formatDateTime } from '../../lib/format';

const STATUS_STYLES = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

export default function MeetingsPanel() {
  const [meetings, setMeetings] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ meetingDate: '', teamsLink: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const [meetingsData, linkData] = await Promise.all([
        apiFetch('/api/ic/meetings'),
        apiFetch('/api/ic/meetings/default-teams-link'),
      ]);
      setMeetings(meetingsData.meetings);
      setForm((f) => (f.teamsLink ? f : { ...f, teamsLink: linkData.teamsLink || '' }));
    } catch (err) {
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/api/ic/meetings', {
        method: 'POST',
        body: { meetingDate: new Date(form.meetingDate).toISOString(), teamsLink: form.teamsLink || undefined },
      });
      setForm((f) => ({ ...f, meetingDate: '' }));
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded hover:bg-brand-blue transition-all active:scale-95"
        >
          {showForm ? 'Cancel' : 'Schedule Meeting'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Date and time</label>
            <input
              type="datetime-local"
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
              value={form.meetingDate}
              onChange={(e) => setForm((f) => ({ ...f, meetingDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Teams link <span className="text-gray-400">(pre-filled from the last meeting — edit if it's changed)</span>
            </label>
            <input
              type="url"
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
              value={form.teamsLink}
              onChange={(e) => setForm((f) => ({ ...f, teamsLink: e.target.value }))}
            />
          </div>
          <button
            disabled={submitting || !form.meetingDate}
            onClick={handleCreate}
            className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue transition-all active:scale-95"
          >
            {submitting ? 'Scheduling…' : 'Schedule Meeting'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        {meetings && meetings.length === 0 && <p className="p-4 text-sm text-gray-500 dark:text-gray-400">No meetings scheduled yet.</p>}
        {loadError && <p className="p-4 text-sm text-red-600">{loadError}</p>}
        {(meetings || []).map((m) => (
          <Link
            key={m.id}
            href={`/engagement/meetings/${m.id}`}
            className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-sm">{formatDateTime(m.meeting_date)}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[m.status] || 'bg-gray-100 text-gray-500'}`}>
                {m.status.replace(/_/g, ' ')}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
