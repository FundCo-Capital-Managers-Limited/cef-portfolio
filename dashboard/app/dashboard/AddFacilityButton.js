'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/apiClient';
import { FACILITY_TYPES, REPAYMENT_FREQUENCIES } from '../../lib/constants';

export default function AddFacilityButton({ assetcoId, allSeries }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    facilityReference: '',
    facilityType: 'LOAN',
    principalAmountNgn: '',
    interestRatePercent: '',
    tenorMonths: '',
    disbursementDate: '',
    repaymentFrequency: 'MONTHLY',
    seriesId: allSeries[0]?.id || '',
  });

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/api/facilities', {
        method: 'POST',
        body: {
          assetCoId: assetcoId,
          ...form,
          principalAmountNgn: Number(form.principalAmountNgn),
          interestRatePercent: form.interestRatePercent ? Number(form.interestRatePercent) : undefined,
          tenorMonths: Number(form.tenorMonths),
          seriesId: form.seriesId || undefined,
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
        Add Facility
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm space-y-3">
            <h3 className="font-semibold">New CEF Facility</h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Reference</label>
                <input className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.facilityReference} onChange={(e) => set('facilityReference', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Type</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.facilityType} onChange={(e) => set('facilityType', e.target.value)}>
                  {FACILITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Principal (NGN)</label>
                <input type="number" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.principalAmountNgn} onChange={(e) => set('principalAmountNgn', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Interest rate (%)</label>
                <input type="number" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.interestRatePercent} onChange={(e) => set('interestRatePercent', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Tenor (months)</label>
                <input type="number" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.tenorMonths} onChange={(e) => set('tenorMonths', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Disbursement date</label>
                <input type="date" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.disbursementDate} onChange={(e) => set('disbursementDate', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Repayment frequency</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.repaymentFrequency} onChange={(e) => set('repaymentFrequency', e.target.value)}>
                  {REPAYMENT_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">CEF Series</label>
                <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.seriesId} onChange={(e) => set('seriesId', e.target.value)}>
                  <option value="">—</option>
                  {allSeries.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="text-sm px-3 py-1.5 rounded border border-gray-300">Cancel</button>
              <button
                onClick={handleSave}
                disabled={submitting || !form.principalAmountNgn || !form.tenorMonths}
                className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue transition-all active:scale-95"
              >
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
