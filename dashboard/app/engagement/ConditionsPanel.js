'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';
import { formatDateTime } from '../../lib/format';

const TYPES = [
  'CP_TO_DOCUMENTATION', 'CP_TO_FIRST_DRAWDOWN', 'CP_TO_LATER_DRAWDOWN',
  'CONDITION_SUBSEQUENT', 'COVENANT', 'INFORMATION_UNDERTAKING',
  'MONITORING_REQUIREMENT', 'MANAGEMENT_ACTION', 'IC_ACTION',
];

const STATUS_STYLES = {
  OPEN: 'bg-blue-100 text-blue-700',
  PENDING_EVIDENCE: 'bg-amber-100 text-amber-700',
  UNDER_REVIEW: 'bg-purple-100 text-purple-700',
  SATISFIED: 'bg-green-100 text-green-700',
  WAIVED: 'bg-gray-100 text-gray-600',
  OVERDUE: 'bg-red-100 text-red-600',
  BREACHED: 'bg-red-200 text-red-800',
};

const STATUS_OPTIONS = Object.keys(STATUS_STYLES);

// Structured records per the IC scope doc's Section 9 - conditions precedent/
// subsequent, covenants, and follow-up actions from a decision, each with an
// owner, a due date, and a status tracked to closure (not just an audit-log
// entry). Assigning/reassigning an owner notifies them (see
// icConditionService.notifyOwner on the backend).
export default function ConditionsPanel({ matterId }) {
  const [conditions, setConditions] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'CONDITION_SUBSEQUENT', wording: '', ownerUserId: '', dueDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try {
      const [conditionsData, candidatesData] = await Promise.all([
        apiFetch(`/api/ic/matters/${matterId}/conditions`),
        apiFetch('/api/ic/committee/candidates'),
      ]);
      setConditions(conditionsData.conditions);
      setCandidates(candidatesData.users);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matterId]);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/ic/matters/${matterId}/conditions`, {
        method: 'POST',
        body: {
          type: form.type,
          wording: form.wording,
          ownerUserId: form.ownerUserId || undefined,
          dueDate: form.dueDate || undefined,
        },
      });
      setForm({ type: 'CONDITION_SUBSEQUENT', wording: '', ownerUserId: '', dueDate: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(conditionId, status) {
    setBusyId(conditionId);
    setError(null);
    try {
      await apiFetch(`/api/ic/conditions/${conditionId}`, { method: 'PATCH', body: { status } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleOwnerChange(conditionId, ownerUserId) {
    setBusyId(conditionId);
    setError(null);
    try {
      await apiFetch(`/api/ic/conditions/${conditionId}`, { method: 'PATCH', body: { ownerUserId: ownerUserId || null } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Conditions &amp; Actions</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs border border-gray-300 dark:border-gray-700 rounded px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {showForm ? 'Cancel' : 'Add Condition'}
        </button>
      </div>

      {showForm && (
        <div className="border border-gray-200 dark:border-gray-800 rounded p-3 space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Type</label>
              <select
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Due date (optional)</label>
              <input
                type="date"
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Owner (optional)</label>
            <select
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
              value={form.ownerUserId}
              onChange={(e) => setForm((f) => ({ ...f, ownerUserId: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>{c.name || c.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Exact wording</label>
            <textarea
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
              rows={2}
              value={form.wording}
              onChange={(e) => setForm((f) => ({ ...f, wording: e.target.value }))}
            />
          </div>
          <button
            disabled={submitting || !form.wording}
            onClick={handleCreate}
            className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue transition-all active:scale-95"
          >
            {submitting ? 'Adding…' : 'Add Condition'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {conditions && conditions.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No conditions recorded yet.</p>}

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {(conditions || []).map((c) => (
          <div key={c.id} className="py-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{c.type.replace(/_/g, ' ')}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[c.status] || 'bg-gray-100 text-gray-500'}`}>
                {c.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{c.wording}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {c.due_date ? `Due ${c.due_date}` : 'No due date'} · added by {c.created_by_email} · {formatDateTime(c.created_at)}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <select
                disabled={busyId === c.id}
                value={c.owner_user_id || ''}
                onChange={(e) => handleOwnerChange(c.id, e.target.value)}
                className="text-xs border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-1.5 py-1"
              >
                <option value="">Unassigned</option>
                {candidates.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
              <select
                disabled={busyId === c.id}
                value={c.status}
                onChange={(e) => handleStatusChange(c.id, e.target.value)}
                className="text-xs border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-1.5 py-1"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
