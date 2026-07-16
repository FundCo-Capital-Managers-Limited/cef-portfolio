'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';
import { timeAgo } from '../../lib/format';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

function actionLabel(actionType) {
  return actionType.replace('SERIES_', 'Series ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

export default function ApprovalsPanel({ isApprover }) {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState(null);
  const [decidingId, setDecidingId] = useState(null);

  async function load() {
    try {
      const data = await apiFetch('/api/approvals');
      setRequests(data.requests);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDecide(id, decision) {
    setDecidingId(id);
    setError(null);
    try {
      await apiFetch(`/api/approvals/${id}/${decision}`, { method: 'POST' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDecidingId(null);
    }
  }

  if (error && !requests) return <p className="text-sm text-red-600">{error}</p>;
  if (!requests) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="bg-white rounded-lg border border-gray-200 divide-y">
      {requests.length === 0 && <p className="p-4 text-sm text-gray-500">No requests to show.</p>}
      {error && <p className="p-4 text-sm text-red-600">{error}</p>}
      {requests.map((r) => (
        <div key={r.id} className="p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm">
              {actionLabel(r.action_type)}{r.payload?.code ? `: ${r.payload.code}` : ''}
              {r.payload?.display_name ? ` (${r.payload.display_name})` : ''}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-500'}`}>
              {r.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Requested by {r.requested_by_email} · {timeAgo(r.created_at)}
          </p>
          {r.status !== 'pending' && (
            <p className="text-xs text-gray-500 mt-1">
              {r.status === 'approved' ? 'Approved' : 'Rejected'} by {r.decided_by_email} · {timeAgo(r.decided_at)}
              {r.decision_notes ? ` — ${r.decision_notes}` : ''}
            </p>
          )}
          {isApprover && r.status === 'pending' && (
            <div className="flex gap-2 mt-3">
              <button
                disabled={decidingId === r.id}
                onClick={() => handleDecide(r.id, 'approve')}
                className="text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700 disabled:opacity-50"
              >
                {decidingId === r.id ? 'Working…' : 'Approve'}
              </button>
              <button
                disabled={decidingId === r.id}
                onClick={() => handleDecide(r.id, 'reject')}
                className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
              >
                {decidingId === r.id ? 'Working…' : 'Reject'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
