'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/apiClient';
import { formatDateTime } from '../../../../lib/format';

const STATUS_STYLES = {
  DRAFT: 'bg-gray-100 text-gray-600',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  EXECUTED: 'bg-emerald-100 text-emerald-700',
  SUPERSEDED: 'bg-amber-100 text-amber-700',
  EXPIRED: 'bg-red-100 text-red-600',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

// AssetCo-side data-room contribution (Ade's ask, 2026-08-05 walkthrough):
// an AssetCo rep can add/link documents for their own IC matters here, but
// they land at DRAFT and stay invisible to the board (IC-external) until
// CEF staff review and approve them — see icDocumentService's
// IC_EXTERNAL_VISIBLE_STATUSES gate on the backend.
export default function AssetcoDataRoomPanel({ assetcoId }) {
  const [matters, setMatters] = useState(null);
  const [selectedMatterId, setSelectedMatterId] = useState('');
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', classification: '', sharepointUrl: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch('/api/assetco-data-room/matters')
      .then((data) => {
        setMatters(data.matters);
        if (data.matters.length > 0) setSelectedMatterId(data.matters[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function loadDocuments(matterId) {
    try {
      const data = await apiFetch(`/api/assetco-data-room/matters/${matterId}/documents`);
      setDocuments(data.documents);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (selectedMatterId) loadDocuments(selectedMatterId);
  }, [selectedMatterId]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/assetco-data-room/matters/${selectedMatterId}/documents`, {
        method: 'POST',
        body: { title: form.title, classification: form.classification, sharepointUrl: form.sharepointUrl || undefined },
      });
      setForm({ title: '', classification: '', sharepointUrl: '' });
      setShowForm(false);
      await loadDocuments(selectedMatterId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (matters && matters.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">IC Data Room</h2>
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        {!matters && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {matters && matters.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-2">
              <select
                value={selectedMatterId}
                onChange={(e) => setSelectedMatterId(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm flex-1"
              >
                {matters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
              <button onClick={() => setShowForm((v) => !v)} className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 shrink-0">
                {showForm ? 'Cancel' : 'Add Document'}
              </button>
            </div>

            {showForm && (
              <div className="border border-gray-200 rounded p-3 space-y-2">
                <div className="grid sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Title"
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Classification (e.g. Progress Evidence)"
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                    value={form.classification}
                    onChange={(e) => setForm((f) => ({ ...f, classification: e.target.value }))}
                  />
                </div>
                <input
                  type="url"
                  placeholder="SharePoint URL (once uploaded)"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  value={form.sharepointUrl}
                  onChange={(e) => setForm((f) => ({ ...f, sharepointUrl: e.target.value }))}
                />
                <button
                  disabled={submitting || !form.title || !form.classification}
                  onClick={handleSubmit}
                  className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue"
                >
                  {submitting ? 'Submitting…' : 'Submit for CEF review'}
                </button>
              </div>
            )}

            <div className="divide-y divide-gray-100">
              {documents && documents.length === 0 && <p className="text-sm text-gray-500">No documents submitted for this matter yet.</p>}
              {(documents || []).map((d) => (
                <div key={d.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-gray-500">
                      {d.classification} · submitted {formatDateTime(d.created_at)}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[d.status] || 'bg-gray-100 text-gray-500'}`}>{d.status}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
