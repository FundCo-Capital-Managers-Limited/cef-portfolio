'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import { formatDateTime } from '../../../lib/format';

const STATUS_STYLES = {
  PENDING: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  DELAYED: 'bg-amber-100 text-amber-700',
};
const STATUS_OPTIONS = Object.keys(STATUS_STYLES);

// Project-development facilities (EML-style) are often better tracked by
// delivery milestones than by repayment cadence, especially before
// repayment starts — this is a separate register from the repayment
// schedule, not a replacement for it.
export default function FacilityMilestonesPanel({ facilityId }) {
  const [milestones, setMilestones] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', targetDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try {
      const data = await apiFetch(`/api/facilities/${facilityId}/milestones`);
      setMilestones(data.milestones);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/facilities/${facilityId}/milestones`, {
        method: 'POST',
        body: { title: form.title, description: form.description || undefined, targetDate: form.targetDate || undefined },
      });
      setForm({ title: '', description: '', targetDate: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id, status) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/facilities/milestones/${id}`, { method: 'PATCH', body: { status } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleEvidenceBlur(id, evidenceUrl) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/facilities/milestones/${id}`, { method: 'PATCH', body: { evidenceUrl } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Milestones</h2>
        <button onClick={() => setShowForm((v) => !v)} className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
          {showForm ? 'Cancel' : 'Add Milestone'}
        </button>
      </div>

      {showForm && (
        <div className="border border-gray-200 rounded p-3 space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Milestone (e.g. Site survey complete)"
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <input
              type="date"
              className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={form.targetDate}
              onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
            />
          </div>
          <textarea
            placeholder="Description (optional)"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <button
            disabled={submitting || !form.title}
            onClick={handleCreate}
            className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue"
          >
            {submitting ? 'Adding…' : 'Add Milestone'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {milestones && milestones.length === 0 && <p className="text-sm text-gray-500">No milestones recorded yet.</p>}

      <div className="divide-y divide-gray-100">
        {(milestones || []).map((m) => (
          <div key={m.id} className="py-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{m.title}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[m.status]}`}>{m.status.replace(/_/g, ' ')}</span>
            </div>
            {m.description && <p className="text-sm text-gray-700">{m.description}</p>}
            <p className="text-xs text-gray-500">
              {m.target_date ? `Target: ${formatDateTime(m.target_date)}` : 'No target date'}
              {m.completed_date ? ` · Completed: ${formatDateTime(m.completed_date)}` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <select
                disabled={busyId === m.id}
                value={m.status}
                onChange={(e) => handleStatusChange(m.id, e.target.value)}
                className="text-xs border border-gray-300 rounded px-1.5 py-1"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Evidence link (SharePoint)"
                defaultValue={m.evidence_url || ''}
                disabled={busyId === m.id}
                onBlur={(e) => e.target.value !== (m.evidence_url || '') && handleEvidenceBlur(m.id, e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 flex-1 min-w-[10rem]"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
