'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/apiClient';
import { DREEF_STAGES, DREEF_STAGE_LABELS, GUARANTEE_TYPES } from '../../lib/constants';

export default function DreefEditButton({ assetcoId, existing }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    dreefStage: existing?.dreef_stage || 'NOT_STARTED',
    infracreditReference: existing?.infracredit_reference || '',
    mandateDate: existing?.mandate_date || '',
    guaranteeType: existing?.guarantee_type || '',
    guaranteeAmountNgn: existing?.guarantee_amount_ngn || '',
    guaranteeTenorYears: existing?.guarantee_tenor_years || '',
    infracreditContactName: existing?.infracredit_contact_name || '',
    infracreditContactEmail: existing?.infracredit_contact_email || '',
    dreefNotes: existing?.dreef_notes || '',
  });

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        ...form,
        guaranteeAmountNgn: form.guaranteeAmountNgn ? Number(form.guaranteeAmountNgn) : null,
        guaranteeTenorYears: form.guaranteeTenorYears ? Number(form.guaranteeTenorYears) : null,
        mandateDate: form.mandateDate || null,
        guaranteeType: form.guaranteeType || null,
      };
      await apiFetch(`/api/assetcos/${assetcoId}/infracredit`, { method: existing ? 'PUT' : 'POST', body });
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
        {existing ? 'Edit' : 'Add DREEF Record'}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold">InfraCredit / DREEF Relationship</h3>

            <div>
              <label className="block text-xs text-gray-600 mb-1">DREEF stage</label>
              <select value={form.dreefStage} onChange={(e) => set('dreefStage', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                {DREEF_STAGES.map((s) => (
                  <option key={s} value={s}>{DREEF_STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">InfraCredit reference</label>
                <input value={form.infracreditReference} onChange={(e) => set('infracreditReference', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Mandate date</label>
                <input type="date" value={form.mandateDate || ''} onChange={(e) => set('mandateDate', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Guarantee type</label>
                <select value={form.guaranteeType} onChange={(e) => set('guaranteeType', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                  <option value="">—</option>
                  {GUARANTEE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Guarantee amount (NGN)</label>
                <input type="number" value={form.guaranteeAmountNgn} onChange={(e) => set('guaranteeAmountNgn', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Guarantee tenor (years)</label>
              <input type="number" value={form.guaranteeTenorYears} onChange={(e) => set('guaranteeTenorYears', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Contact name</label>
                <input value={form.infracreditContactName} onChange={(e) => set('infracreditContactName', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Contact email</label>
                <input value={form.infracreditContactEmail} onChange={(e) => set('infracreditContactEmail', e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Notes</label>
              <textarea value={form.dreefNotes} onChange={(e) => set('dreefNotes', e.target.value)} rows={2} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="text-sm px-3 py-1.5 rounded border border-gray-300">Cancel</button>
              <button onClick={handleSave} disabled={submitting} className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50">
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
