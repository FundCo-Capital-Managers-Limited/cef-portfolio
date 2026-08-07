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

const DELEGATED_AUTHORITY_STATUSES = ['NOT_REQUIRED', 'PENDING', 'GRANTED'];
const TRUSTEE_NO_OBJECTION_STATUSES = ['NOT_REQUIRED', 'PENDING', 'RECEIVED'];

const AUTHORITY_STATUS_STYLES = {
  NOT_REQUIRED: 'bg-gray-100 text-gray-500',
  PENDING: 'bg-amber-100 text-amber-700',
  GRANTED: 'bg-green-100 text-green-700',
  RECEIVED: 'bg-green-100 text-green-700',
};

export default function MatterDetail({ matterId }) {
  const [matter, setMatter] = useState(null);
  const [error, setError] = useState(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const [changingAuthority, setChangingAuthority] = useState(false);

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

  async function handleAuthorityChange(field, value) {
    setChangingAuthority(true);
    setError(null);
    try {
      await apiFetch(`/api/ic/matters/${matterId}`, { method: 'PATCH', body: { [field]: value } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingAuthority(false);
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

      <div className="pt-3 border-t border-gray-100 dark:border-gray-800 grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Delegated Authority</label>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${AUTHORITY_STATUS_STYLES[matter.delegated_authority_status] || 'bg-gray-100 text-gray-500'}`}>
              {matter.delegated_authority_status.replace(/_/g, ' ')}
            </span>
            <select
              disabled={changingAuthority}
              value={matter.delegated_authority_status}
              onChange={(e) => handleAuthorityChange('delegatedAuthorityStatus', e.target.value)}
              className="text-xs border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-1.5 py-1"
            >
              {DELEGATED_AUTHORITY_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Trustee No-Objection</label>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${AUTHORITY_STATUS_STYLES[matter.trustee_no_objection_status] || 'bg-gray-100 text-gray-500'}`}>
              {matter.trustee_no_objection_status.replace(/_/g, ' ')}
            </span>
            <select
              disabled={changingAuthority}
              value={matter.trustee_no_objection_status}
              onChange={(e) => handleAuthorityChange('trusteeNoObjectionStatus', e.target.value)}
              className="text-xs border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-1.5 py-1"
            >
              {TRUSTEE_NO_OBJECTION_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
