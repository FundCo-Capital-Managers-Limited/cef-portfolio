'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';
import { timeAgo, formatDateTime } from '../../lib/format';

const STATUS_STYLES = {
  open: 'bg-amber-100 text-amber-700',
  acknowledged: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
};

export default function FlagDetail({ flagId }) {
  const [flag, setFlag] = useState(null);
  const [error, setError] = useState(null);
  const [commentBody, setCommentBody] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  async function load() {
    try {
      const data = await apiFetch(`/api/flags/${flagId}`);
      setFlag(data.flag);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [flagId]);

  async function handleComment() {
    setSubmittingComment(true);
    setError(null);
    try {
      await apiFetch(`/api/flags/${flagId}/comments`, { method: 'POST', body: { body: commentBody } });
      setCommentBody('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleStatusChange(status) {
    setChangingStatus(true);
    setError(null);
    try {
      await apiFetch(`/api/flags/${flagId}/status`, { method: 'PATCH', body: { status } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingStatus(false);
    }
  }

  if (error && !flag) return <p className="text-sm text-red-600">{error}</p>;
  if (!flag) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">{flag.title}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[flag.status] || 'bg-gray-100 text-gray-500'}`}>
            {flag.status}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {flag.entity_type}{flag.entity_id ? ` · ${flag.entity_id}` : ''} · raised by {flag.created_by_email} · {timeAgo(flag.created_at)}
        </p>
        {flag.description && <p className="text-sm text-gray-700 mt-3">{flag.description}</p>}
        {flag.status === 'resolved' && (
          <p className="text-xs text-green-700 mt-2">Resolved by {flag.resolved_by_email} · {formatDateTime(flag.resolved_at)}</p>
        )}

        <div className="flex gap-2 mt-4 pt-3 border-t">
          {flag.status !== 'acknowledged' && flag.status !== 'resolved' && (
            <button
              disabled={changingStatus}
              onClick={() => handleStatusChange('acknowledged')}
              className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
            >
              Mark Acknowledged
            </button>
          )}
          {flag.status !== 'resolved' && (
            <button
              disabled={changingStatus}
              onClick={() => handleStatusChange('resolved')}
              className="text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700 disabled:opacity-50"
            >
              Mark Resolved
            </button>
          )}
          {flag.status === 'resolved' && (
            <button
              disabled={changingStatus}
              onClick={() => handleStatusChange('open')}
              className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50"
            >
              Reopen
            </button>
          )}
        </div>

        {flag.views?.length > 0 && (
          <p className="text-xs text-gray-400 mt-3 pt-3 border-t">
            Viewed by: {flag.views.map((v) => v.email).join(', ')}
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold">Comments</h2>
        {flag.comments.length === 0 && <p className="text-sm text-gray-500">No comments yet.</p>}
        {flag.comments.map((c) => (
          <div key={c.id} className="text-sm border-b last:border-b-0 pb-2">
            <p>{c.body}</p>
            <p className="text-xs text-gray-400 mt-1">{c.author_email} · {timeAgo(c.created_at)}</p>
          </div>
        ))}
        <div className="pt-2 flex gap-2">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
            placeholder="Add a comment…"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
          />
          <button
            disabled={submittingComment || !commentBody}
            onClick={handleComment}
            className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue transition-all active:scale-95"
          >
            {submittingComment ? 'Posting…' : 'Post'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
