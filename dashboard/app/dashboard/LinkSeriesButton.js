'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/apiClient';
import { INSTRUMENT_TYPES, SERIES_LINK_STATUSES } from '../../lib/constants';

export default function LinkSeriesButton({ assetcoId, allSeries }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    seriesId: allSeries[0]?.id || '',
    disbursementAmountNgn: '',
    disbursementDate: '',
    instrumentType: 'DEBT',
    status: 'CANDIDATE',
    notes: '',
  });

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/assetcos/${assetcoId}/series`, {
        method: 'POST',
        body: {
          ...form,
          disbursementAmountNgn: form.disbursementAmountNgn ? Number(form.disbursementAmountNgn) : null,
          disbursementDate: form.disbursementDate || null,
        },
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-blue-600 hover:underline">
        Add Series
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm space-y-3">
            <h3 className="font-semibold">Link to CEF Series</h3>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Series</label>
              <select value={form.seriesId} onChange={(e) => set('seriesId', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                {allSeries.map((s) => (
                  <option key={s.id} value={s.id}>{s.display_name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Disbursement (NGN)</label>
                <input type="number" value={form.disbursementAmountNgn} onChange={(e) => set('disbursementAmountNgn', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Disbursement date</label>
                <input type="date" value={form.disbursementDate} onChange={(e) => set('disbursementDate', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Instrument</label>
                <select value={form.instrumentType} onChange={(e) => set('instrumentType', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                  {INSTRUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Status</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                  {SERIES_LINK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="text-sm px-3 py-1.5 rounded border border-gray-300">Cancel</button>
              <button onClick={handleSave} disabled={submitting} className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded disabled:opacity-50">
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
