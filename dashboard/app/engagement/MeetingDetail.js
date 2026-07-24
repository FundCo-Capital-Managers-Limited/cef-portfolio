'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, X } from 'lucide-react';
import { apiFetch } from '../../lib/apiClient';
import { formatDateTime } from '../../lib/format';

const STATUS_STYLES = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

const STATUS_OPTIONS = Object.keys(STATUS_STYLES);

export default function MeetingDetail({ meetingId }) {
  const [meeting, setMeeting] = useState(null);
  const [openMatters, setOpenMatters] = useState([]);
  const [selectedMatterId, setSelectedMatterId] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [meetingData, mattersData] = await Promise.all([
        apiFetch(`/api/ic/meetings/${meetingId}`),
        apiFetch('/api/ic/matters'),
      ]);
      setMeeting(meetingData.meeting);
      setOpenMatters(mattersData.matters.filter((m) => m.status === 'OPEN' || m.status === 'UNDER_REVIEW'));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [meetingId]);

  async function handleStatusChange(status) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/ic/meetings/${meetingId}`, { method: 'PATCH', body: { status } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddAgendaItem() {
    if (!selectedMatterId) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/ic/meetings/${meetingId}/agenda`, { method: 'POST', body: { matterId: selectedMatterId } });
      setSelectedMatterId('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveAgendaItem(itemId) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/ic/meetings/${meetingId}/agenda/${itemId}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !meeting) return <p className="text-sm text-red-600">{error}</p>;
  if (!meeting) return <p className="text-sm text-gray-500">Loading…</p>;

  const agendaMatterIds = new Set(meeting.agendaItems.map((a) => a.matter_id));
  const availableMatters = openMatters.filter((m) => !agendaMatterIds.has(m.id));

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">{formatDateTime(meeting.meeting_date)}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[meeting.status] || 'bg-gray-100 text-gray-500'}`}>
            {meeting.status.replace(/_/g, ' ')}
          </span>
        </div>
        {meeting.teams_link && (
          <a
            href={meeting.teams_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink size={14} /> Join Teams meeting
          </a>
        )}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          {STATUS_OPTIONS.filter((s) => s !== meeting.status).map((s) => (
            <button
              key={s}
              disabled={busy}
              onClick={() => handleStatusChange(s)}
              className="text-xs border border-gray-300 dark:border-gray-700 rounded px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
        <h2 className="text-sm font-semibold">Agenda</h2>

        {meeting.agendaItems.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No matters on the agenda yet.</p>}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {meeting.agendaItems.map((item, idx) => (
            <div key={item.id} className="py-2 flex items-center justify-between gap-2">
              <Link href={`/engagement/matters/${item.matter_id}`} className="text-sm text-blue-600 hover:underline">
                {idx + 1}. {item.matter?.title || item.matter_id}
              </Link>
              <button
                disabled={busy}
                onClick={() => handleRemoveAgendaItem(item.id)}
                className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                aria-label="Remove from agenda"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <select
            className="flex-1 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
            value={selectedMatterId}
            onChange={(e) => setSelectedMatterId(e.target.value)}
          >
            <option value="">Add a matter to the agenda…</option>
            {availableMatters.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
          <button
            disabled={busy || !selectedMatterId}
            onClick={handleAddAgendaItem}
            className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue transition-all active:scale-95"
          >
            Add
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
