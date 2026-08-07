'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiClient';
import { formatDateTime } from '../../lib/format';

// Pre-meeting Q&A (Ade's ask, 2026-08-05 walkthrough): IC members read a
// matter and post questions/comments ahead of the meeting, so discussion in
// the room is targeted rather than starting cold. The matter's creator and
// deal lead are notified per comment (icMatterCommentService.notifyMatterOwners).
export default function MatterCommentsPanel({ matterId }) {
  const [comments, setComments] = useState(null);
  const [error, setError] = useState(null);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const data = await apiFetch(`/api/ic/matters/${matterId}/comments`);
      setComments(data.comments);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matterId]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/ic/matters/${matterId}/comments`, { method: 'POST', body: { body } });
      setBody('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
      <h2 className="text-sm font-semibold">Questions &amp; Comments</h2>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {comments && comments.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No questions or comments yet.</p>}

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {(comments || []).map((c) => (
          <div key={c.id} className="py-2 space-y-1">
            <p className="text-sm text-gray-800 dark:text-gray-200">{c.body}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {c.author_email} · {formatDateTime(c.created_at)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <textarea
          placeholder="Ask a question or leave a comment ahead of the meeting…"
          className="flex-1 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button
          disabled={submitting || !body.trim()}
          onClick={handleSubmit}
          className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue self-end shrink-0"
        >
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
}
