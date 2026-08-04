'use client';

import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { apiFetch } from '../../lib/apiClient';
import { formatDateTime } from '../../lib/format';

const STATUS_STYLES = {
  DRAFT: 'bg-gray-100 text-gray-600',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700',
  LOCKED: 'bg-green-100 text-green-700',
};

// Draft/edit while DRAFT or UNDER_REVIEW; locking is one-way (no unlock
// exists) - once locked, the textarea and status control disappear entirely
// rather than just being disabled, so it's visually obvious the record is
// now final.
export default function MinutesPanel({ meetingId, canLock }) {
  const [minutes, setMinutes] = useState(null);
  const [draftContent, setDraftContent] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);

  async function load() {
    try {
      const data = await apiFetch(`/api/ic/meetings/${meetingId}/minutes`);
      setMinutes(data.minutes);
      setDraftContent(data.minutes.content);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/ic/meetings/${meetingId}/minutes`, { method: 'PATCH', body: { content: draftContent } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status) {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/ic/meetings/${meetingId}/minutes`, { method: 'PATCH', body: { status } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLock() {
    if (!confirm('Lock these minutes? This cannot be undone - no further edits will be possible.')) return;
    setLocking(true);
    setError(null);
    try {
      await apiFetch(`/api/ic/meetings/${meetingId}/minutes/lock`, { method: 'POST' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLocking(false);
    }
  }

  if (!minutes) return <p className="text-sm text-gray-500">Loading minutes…</p>;

  const isLocked = minutes.status === 'LOCKED';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Minutes</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[minutes.status] || 'bg-gray-100 text-gray-500'}`}>
          {minutes.status.replace(/_/g, ' ')}
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isLocked ? (
        <>
          <p className="text-sm whitespace-pre-wrap">{minutes.content}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Lock size={12} /> Locked by {minutes.locked_by_email} on {formatDateTime(minutes.locked_at)}
          </p>
        </>
      ) : (
        <>
          <textarea
            className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
            rows={8}
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={saving}
              onClick={handleSave}
              className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue transition-all active:scale-95"
            >
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            {minutes.status === 'DRAFT' && (
              <button
                disabled={saving}
                onClick={() => handleStatusChange('UNDER_REVIEW')}
                className="text-sm border border-gray-300 dark:border-gray-700 rounded px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                Send for Review
              </button>
            )}
            {canLock && (
              <button
                disabled={locking}
                onClick={handleLock}
                className="text-sm border border-red-300 text-red-600 rounded px-3 py-1.5 hover:bg-red-50 disabled:opacity-50 ml-auto"
              >
                {locking ? 'Locking…' : 'Lock Minutes'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
