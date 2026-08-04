'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';

const TYPES = ['FINANCIAL', 'REPORTING', 'OPERATIONAL', 'NEGATIVE'];
const COMPLIANCE_STYLES = {
  COMPLIANT: 'bg-green-100 text-green-700',
  NON_COMPLIANT: 'bg-red-100 text-red-600',
  PENDING: 'bg-amber-100 text-amber-700',
};
const COMPLIANCE_OPTIONS = Object.keys(COMPLIANCE_STYLES);

// Module E: Covenant Monitoring Register.
export default function FacilityCovenantsPanel({ facilityId }) {
  const [covenants, setCovenants] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ covenantDescription: '', covenantType: 'FINANCIAL', frequency: '' });
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try {
      const data = await apiFetch(`/api/facilities/${facilityId}/covenants`);
      setCovenants(data.covenants);
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
      await apiFetch(`/api/facilities/${facilityId}/covenants`, {
        method: 'POST',
        body: { covenantDescription: form.covenantDescription, covenantType: form.covenantType, frequency: form.frequency || undefined },
      });
      setForm({ covenantDescription: '', covenantType: 'FINANCIAL', frequency: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplianceChange(id, complianceStatus) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/facilities/covenants/${id}`, { method: 'PATCH', body: { complianceStatus } });
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
        <h2 className="text-sm font-semibold">Covenants</h2>
        <button onClick={() => setShowForm((v) => !v)} className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
          {showForm ? 'Cancel' : 'Add Covenant'}
        </button>
      </div>

      {showForm && (
        <div className="border border-gray-200 rounded p-3 space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <select className="border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.covenantType}
              onChange={(e) => setForm((f) => ({ ...f, covenantType: e.target.value }))}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="text" placeholder="Frequency (e.g. Bi-Annual)" className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))} />
          </div>
          <textarea placeholder="Covenant description" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" rows={2}
            value={form.covenantDescription} onChange={(e) => setForm((f) => ({ ...f, covenantDescription: e.target.value }))} />
          <button disabled={submitting || !form.covenantDescription} onClick={handleCreate}
            className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue">
            {submitting ? 'Adding…' : 'Add Covenant'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {covenants && covenants.length === 0 && <p className="text-sm text-gray-500">No covenants recorded yet.</p>}

      <div className="divide-y divide-gray-100">
        {(covenants || []).map((c) => (
          <div key={c.id} className="py-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{c.covenant_type} {c.frequency ? `· ${c.frequency}` : ''}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${COMPLIANCE_STYLES[c.compliance_status]}`}>
                {c.compliance_status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-700">{c.covenant_description}</p>
            <select disabled={busyId === c.id} value={c.compliance_status} onChange={(e) => handleComplianceChange(c.id, e.target.value)}
              className="text-xs border border-gray-300 rounded px-1.5 py-1">
              {COMPLIANCE_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
