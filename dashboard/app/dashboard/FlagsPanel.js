'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/apiClient';
import { timeAgo } from '../../lib/format';

const STATUS_STYLES = {
  open: 'bg-amber-100 text-amber-700',
  acknowledged: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
};

const ENTITY_TYPES = ['facility', 'series', 'assetco', 'customer', 'asset', 'general'];

export default function FlagsPanel() {
  const [flags, setFlags] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ entityType: 'general', entityId: '', title: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  async function loadFlags() {
    try {
      const data = await apiFetch('/api/flags');
      setFlags(data.flags);
    } catch (err) {
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    loadFlags();
  }, []);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/api/flags', {
        method: 'POST',
        body: {
          entityType: form.entityType,
          entityId: form.entityId || undefined,
          title: form.title,
          description: form.description || undefined,
        },
      });
      setForm({ entityType: 'general', entityId: '', title: '', description: '' });
      setShowForm(false);
      await loadFlags();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = statusFilter ? (flags || []).filter((f) => f.status === statusFilter) : flags || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded hover:bg-brand-blue transition-all active:scale-95"
        >
          {showForm ? 'Cancel' : 'Raise a Flag'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">What does this relate to?</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={form.entityType}
                onChange={(e) => setForm((f) => ({ ...f, entityType: e.target.value }))}
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Reference ID (optional)</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                placeholder="e.g. facility or series ID"
                value={form.entityId}
                onChange={(e) => setForm((f) => ({ ...f, entityId: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Title</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Description (optional)</label>
            <textarea
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <button
            disabled={submitting || !form.title}
            onClick={handleCreate}
            className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue transition-all active:scale-95"
          >
            {submitting ? 'Submitting…' : 'Submit Flag'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 divide-y">
        {filtered.length === 0 && flags && <p className="p-4 text-sm text-gray-500">No flags to show.</p>}
        {loadError && <p className="p-4 text-sm text-red-600">{loadError}</p>}
        {filtered.map((f) => (
          <Link
            key={f.id}
            href={`/dashboard/flags/${f.id}`}
            className="block p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-sm">{f.title}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[f.status] || 'bg-gray-100 text-gray-500'}`}>
                {f.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {f.entity_type}{f.entity_id ? ` · ${f.entity_id}` : ''} · raised by {f.created_by_email} · {timeAgo(f.created_at)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
