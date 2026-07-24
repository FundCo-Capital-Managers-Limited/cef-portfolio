'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../lib/apiClient';
import { timeAgo } from '../../lib/format';

const STATUS_STYLES = {
  DRAFT: 'bg-gray-100 text-gray-600',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  EXECUTED: 'bg-emerald-100 text-emerald-700',
  SUPERSEDED: 'bg-amber-100 text-amber-700',
  EXPIRED: 'bg-red-100 text-red-600',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

const STATUS_OPTIONS = Object.keys(STATUS_STYLES);

// No file ever passes through this app — the actual document lives in the
// team's own SharePoint dataroom. This is just a reference record: title,
// classification, a pasted SharePoint link, and a confirmation that it's
// been uploaded and shared, per how the team already works.
export default function DocumentsPanel({ matterId }) {
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', classification: '', sharepointUrl: '' });
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try {
      const data = await apiFetch(`/api/ic/matters/${matterId}/documents`);
      setDocuments(data.documents);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [matterId]);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/ic/matters/${matterId}/documents`, {
        method: 'POST',
        body: { title: form.title, classification: form.classification, sharepointUrl: form.sharepointUrl || undefined },
      });
      setForm({ title: '', classification: '', sharepointUrl: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(docId) {
    setBusyId(docId);
    setError(null);
    try {
      await apiFetch(`/api/ic/documents/${docId}/confirm`, { method: 'POST' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleStatusChange(docId, status) {
    setBusyId(docId);
    setError(null);
    try {
      await apiFetch(`/api/ic/documents/${docId}`, { method: 'PATCH', body: { status } });
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
        <h2 className="text-sm font-semibold">Documents</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs border border-gray-300 dark:border-gray-700 rounded px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {showForm ? 'Cancel' : 'Add Document'}
        </button>
      </div>

      {showForm && (
        <div className="border border-gray-200 dark:border-gray-800 rounded p-3 space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Title</label>
              <input
                type="text"
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Classification</label>
              <input
                type="text"
                placeholder="e.g. Board Resolution, Debenture Deed"
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
                value={form.classification}
                onChange={(e) => setForm((f) => ({ ...f, classification: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">SharePoint URL (once uploaded)</label>
            <input
              type="url"
              placeholder="https://fundco.sharepoint.com/sites/ic-dataroom/..."
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
              value={form.sharepointUrl}
              onChange={(e) => setForm((f) => ({ ...f, sharepointUrl: e.target.value }))}
            />
          </div>
          <button
            disabled={submitting || !form.title || !form.classification}
            onClick={handleCreate}
            className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue transition-all active:scale-95"
          >
            {submitting ? 'Adding…' : 'Add Document'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {documents && documents.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No documents recorded yet.</p>}

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {(documents || []).map((doc) => (
          <div key={doc.id} className="py-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{doc.title}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[doc.status] || 'bg-gray-100 text-gray-500'}`}>
                {doc.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {doc.classification} · added by {doc.created_by_email} · {timeAgo(doc.created_at)}
            </p>
            {doc.confirmed_at && (
              <p className="text-xs text-green-700 dark:text-green-500 flex items-center gap-1">
                <CheckCircle2 size={12} /> Uploaded and shared, confirmed by {doc.confirmed_by_email} · {timeAgo(doc.confirmed_at)}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {doc.sharepoint_url && (
                <a
                  href={doc.sharepoint_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <ExternalLink size={12} /> View in SharePoint
                </a>
              )}
              {doc.sharepoint_url && !doc.confirmed_at && (
                <button
                  disabled={busyId === doc.id}
                  onClick={() => handleConfirm(doc.id)}
                  className="text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700 disabled:opacity-50"
                >
                  I've uploaded this and it's shared
                </button>
              )}
              <select
                disabled={busyId === doc.id}
                value={doc.status}
                onChange={(e) => handleStatusChange(doc.id, e.target.value)}
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
