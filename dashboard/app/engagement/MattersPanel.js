'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../lib/apiClient';
import { timeAgo } from '../../lib/format';

const CATEGORIES = ['NEW_INVESTMENT', 'DISBURSEMENT', 'PORTFOLIO_MANAGEMENT', 'PROBLEM_ASSET', 'EXIT_CLOSURE', 'POLICY'];

const STATUS_STYLES = {
  OPEN: 'bg-amber-100 text-amber-700',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  SCHEDULED: 'bg-purple-100 text-purple-700',
  DECIDED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
  WITHDRAWN: 'bg-red-100 text-red-600',
};

export default function MattersPanel() {
  const [matters, setMatters] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: 'NEW_INVESTMENT', decisionType: '', title: '', description: '', assetcoId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  async function loadMatters() {
    try {
      const data = await apiFetch('/api/ic/matters');
      setMatters(data.matters);
    } catch (err) {
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    loadMatters();
  }, []);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/api/ic/matters', {
        method: 'POST',
        body: {
          category: form.category,
          decisionType: form.decisionType,
          title: form.title,
          description: form.description || undefined,
          assetcoId: form.assetcoId || undefined,
        },
      });
      setForm({ category: 'NEW_INVESTMENT', decisionType: '', title: '', description: '', assetcoId: '' });
      setShowForm(false);
      await loadMatters();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = statusFilter ? (matters || []).filter((m) => m.status === statusFilter) : matters || [];

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
            {Object.keys(STATUS_STYLES).map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded hover:bg-brand-blue transition-all active:scale-95"
        >
          {showForm ? 'Cancel' : 'New Matter'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Category</label>
              <select
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Decision type</label>
              <input
                type="text"
                placeholder="e.g. Preliminary approval, Covenant breach"
                className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
                value={form.decisionType}
                onChange={(e) => setForm((f) => ({ ...f, decisionType: e.target.value }))}
              />
            </div>
          </div>
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
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Linked AssetCo ID (optional)</label>
            <input
              type="text"
              placeholder="e.g. GROSOLAR"
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
              value={form.assetcoId}
              onChange={(e) => setForm((f) => ({ ...f, assetcoId: e.target.value.toUpperCase() }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Description (optional)</label>
            <textarea
              className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-2 py-1.5 text-sm"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <button
            disabled={submitting || !form.title || !form.decisionType}
            onClick={handleCreate}
            className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue transition-all active:scale-95"
          >
            {submitting ? 'Creating…' : 'Create Matter'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        {filtered.length === 0 && matters && <p className="p-4 text-sm text-gray-500 dark:text-gray-400">No matters to show.</p>}
        {loadError && <p className="p-4 text-sm text-red-600">{loadError}</p>}
        {filtered.map((m) => (
          <Link
            key={m.id}
            href={`/engagement/matters/${m.id}`}
            className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-sm">{m.title}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[m.status] || 'bg-gray-100 text-gray-500'}`}>
                {m.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {m.category.replace(/_/g, ' ')} · {m.decision_type}{m.assetco_id ? ` · ${m.assetco_id}` : ''} · raised by {m.created_by_email} · {timeAgo(m.created_at)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
