'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/apiClient';
import { SERIES_STATUSES } from '../../lib/constants';

export default function AddSeriesButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: '',
    displayName: '',
    status: 'PLANNING',
    totalFundSizeNgn: '',
    description: '',
  });

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/api/series', {
        method: 'POST',
        body: {
          ...form,
          code: form.code.toUpperCase(),
          totalFundSizeNgn: form.totalFundSizeNgn ? Number(form.totalFundSizeNgn) : null,
        },
      });
      setOpen(false);
      setForm({ code: '', displayName: '', status: 'PLANNING', totalFundSizeNgn: '', description: '' });
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded hover:bg-brand-blue transition-all active:scale-95"
      >
        New Series
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm space-y-3">
            <h3 className="font-semibold">New CEF Series</h3>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Code (e.g. SERIES_D)</label>
              <input
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Display name</label>
              <input
                value={form.displayName}
                onChange={(e) => set('displayName', e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Status</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                  {SERIES_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Fund size (NGN)</label>
                <input
                  type="number"
                  value={form.totalFundSizeNgn}
                  onChange={(e) => set('totalFundSizeNgn', e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="text-sm px-3 py-1.5 rounded border border-gray-300">Cancel</button>
              <button
                onClick={handleSave}
                disabled={submitting || !form.code || !form.displayName}
                className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue transition-all active:scale-95"
              >
                {submitting ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
