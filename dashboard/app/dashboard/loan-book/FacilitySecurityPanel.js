'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import { formatCurrency } from '../../../lib/format';

// Module B: Security Monitoring Register. perfection/insurance status are
// free text on purpose - the framework's own real values are narrative
// ("Pending Upstamping", "Sighted Asset Policy - Needs Renewal") not fixed
// codes.
export default function FacilitySecurityPanel({ facilityId }) {
  const [security, setSecurity] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ securityType: '', valueNgn: '', perfectionStatus: '', insuranceStatus: '', insuranceExpiryDate: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try {
      const data = await apiFetch(`/api/facilities/${facilityId}/security`);
      setSecurity(data.security);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/facilities/${facilityId}/security`, {
        method: 'POST',
        body: {
          securityType: form.securityType,
          valueNgn: form.valueNgn ? Number(form.valueNgn) : undefined,
          perfectionStatus: form.perfectionStatus || undefined,
          insuranceStatus: form.insuranceStatus || undefined,
          insuranceExpiryDate: form.insuranceExpiryDate || undefined,
          notes: form.notes || undefined,
        },
      });
      setForm({ securityType: '', valueNgn: '', perfectionStatus: '', insuranceStatus: '', insuranceExpiryDate: '', notes: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateField(id, field, value) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/facilities/security/${id}`, { method: 'PATCH', body: { [field]: value } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Security &amp; Collateral</h2>
        <button onClick={() => setShowForm((v) => !v)} className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
          {showForm ? 'Cancel' : 'Add Security'}
        </button>
      </div>

      {showForm && (
        <div className="border border-gray-200 rounded p-3 space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <input type="text" placeholder="Security type (e.g. All-Assets Debenture)" className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={form.securityType} onChange={(e) => setForm((f) => ({ ...f, securityType: e.target.value }))} />
            <input type="number" placeholder="Value (NGN)" className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={form.valueNgn} onChange={(e) => setForm((f) => ({ ...f, valueNgn: e.target.value }))} />
          </div>
          <input type="text" placeholder="Perfection status (e.g. Pending Upstamping)" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            value={form.perfectionStatus} onChange={(e) => setForm((f) => ({ ...f, perfectionStatus: e.target.value }))} />
          <input type="text" placeholder="Insurance status" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            value={form.insuranceStatus} onChange={(e) => setForm((f) => ({ ...f, insuranceStatus: e.target.value }))} />
          <label className="block text-xs text-gray-500">
            Insurance expiry date (optional — enables expiry alerts)
            <input type="date" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mt-0.5"
              value={form.insuranceExpiryDate} onChange={(e) => setForm((f) => ({ ...f, insuranceExpiryDate: e.target.value }))} />
          </label>
          <button disabled={submitting || !form.securityType} onClick={handleCreate}
            className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue">
            {submitting ? 'Adding…' : 'Add Security'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {security && security.length === 0 && <p className="text-sm text-gray-500">No security recorded yet.</p>}

      <div className="divide-y divide-gray-100">
        {(security || []).map((s) => (
          <div key={s.id} className="py-2 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{s.security_type}</p>
              {s.value_ngn ? <p className="text-sm text-gray-600">{formatCurrency(s.value_ngn)}</p> : <p className="text-xs text-red-600">No value recorded</p>}
            </div>
            <div className="grid sm:grid-cols-2 gap-2 pt-1">
              <input
                type="text"
                placeholder="Perfection status"
                defaultValue={s.perfection_status || ''}
                disabled={busyId === s.id}
                onBlur={(e) => e.target.value !== (s.perfection_status || '') && handleUpdateField(s.id, 'perfectionStatus', e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              />
              <input
                type="text"
                placeholder="Insurance status"
                defaultValue={s.insurance_status || ''}
                disabled={busyId === s.id}
                onBlur={(e) => e.target.value !== (s.insurance_status || '') && handleUpdateField(s.id, 'insuranceStatus', e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <label className="text-xs text-gray-500">Insurance expiry:</label>
              <input
                type="date"
                defaultValue={s.insurance_expiry_date || ''}
                disabled={busyId === s.id}
                onBlur={(e) => e.target.value !== (s.insurance_expiry_date || '') && handleUpdateField(s.id, 'insuranceExpiryDate', e.target.value)}
                className={`text-xs border rounded px-1.5 py-1 ${s.insurance_expiry_date && new Date(s.insurance_expiry_date) < new Date() ? 'border-red-300 text-red-600' : 'border-gray-300'}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
