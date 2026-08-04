'use client';

import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { apiFetch } from '../../lib/apiClient';
import { formatDateTime } from '../../lib/format';

// Sent from the team's verified updates.fundco.ng domain (not a new
// ic.cleanenergyfund.ng one - Resend's free plan only allows one verified
// domain) with the sender's own name shown. The sender is automatically
// CC'd and set as reply-to on the backend, so a copy lands in their own
// mailbox and any reply goes straight to them, not a shared inbox.
export default function ComposeEmailPanel({ matterId }) {
  const [toEmails, setToEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(null);
  const [history, setHistory] = useState(null);

  async function loadHistory() {
    try {
      const query = matterId ? `?matterId=${matterId}` : '';
      const data = await apiFetch(`/api/ic/email${query}`);
      setHistory(data.emails);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matterId]);

  async function handleSend() {
    setSending(true);
    setError(null);
    setSent(null);
    try {
      const emails = toEmails.split(',').map((e) => e.trim()).filter(Boolean);
      await apiFetch('/api/ic/email', {
        method: 'POST',
        body: { matterId: matterId || undefined, toEmails: emails, subject, body },
      });
      setSent(`Sent to ${emails.join(', ')}`);
      setToEmails('');
      setSubject('');
      setBody('');
      await loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
      <h2 className="text-sm font-semibold">Compose Email</h2>

      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">To (comma-separated)</label>
        <input
          type="text"
          placeholder="sponsor@example.com, counsel@example.com"
          className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
          value={toEmails}
          onChange={(e) => setToEmails(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Subject</label>
        <input
          type="text"
          className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Message</label>
        <textarea
          className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        You'll be CC'd on this email and any reply will go straight to your own inbox.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {sent && <p className="text-sm text-green-700 dark:text-green-500">{sent}</p>}

      <button
        disabled={sending || !toEmails.trim() || !subject || !body}
        onClick={handleSend}
        className="inline-flex items-center gap-1.5 text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue transition-all active:scale-95"
      >
        <Send size={14} /> {sending ? 'Sending…' : 'Send Email'}
      </button>

      {history && history.length > 0 && (
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Sent history</p>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {history.map((e) => (
              <div key={e.id} className="py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-gray-800 dark:text-gray-200">{e.subject}</p>
                  {e.send_error && <span className="text-red-600 shrink-0">Failed to deliver</span>}
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  {e.sender_name || e.sender_email} → {e.to_emails.join(', ')} · {formatDateTime(e.sent_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
