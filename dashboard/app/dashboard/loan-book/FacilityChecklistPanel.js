'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';

const BUSINESS_MODELS = ['C&I', 'C2C', 'PAYG', 'HYBRID'];
const STATUS_STYLES = {
  PENDING: 'bg-gray-100 text-gray-600',
  DONE: 'bg-green-100 text-green-700',
  NOT_APPLICABLE: 'bg-gray-100 text-gray-400',
};
const STATUS_OPTIONS = Object.keys(STATUS_STYLES);

// Onboarding/gap-diagnostic checklist, tied to business model rather than
// AssetCo (one AssetCo can run more than one business model) — mirrors the
// kind of requirements DREEF/InfraCredit's own onboarding checklists carry.
export default function FacilityChecklistPanel({ facilityId }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [businessModel, setBusinessModel] = useState(BUSINESS_MODELS[0]);
  const [applying, setApplying] = useState(false);
  const [adHocLabel, setAdHocLabel] = useState('');
  const [addingAdHoc, setAddingAdHoc] = useState(false);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try {
      const data = await apiFetch(`/api/facilities/${facilityId}/checklist`);
      setItems(data.items);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  async function handleApply() {
    setApplying(true);
    setError(null);
    try {
      await apiFetch(`/api/facilities/${facilityId}/checklist/apply`, { method: 'POST', body: { businessModel } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  }

  async function handleAddAdHoc() {
    setAddingAdHoc(true);
    setError(null);
    try {
      await apiFetch(`/api/facilities/${facilityId}/checklist`, { method: 'POST', body: { label: adHocLabel } });
      setAdHocLabel('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingAdHoc(false);
    }
  }

  async function handleStatusChange(id, status) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/facilities/checklist/${id}`, { method: 'PATCH', body: { status } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const doneCount = (items || []).filter((i) => i.status !== 'PENDING').length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Onboarding Checklist {items && items.length > 0 && <span className="text-xs text-gray-500 font-normal">({doneCount}/{items.length})</span>}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={businessModel} onChange={(e) => setBusinessModel(e.target.value)} className="text-xs border border-gray-300 rounded px-2 py-1">
          {BUSINESS_MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button disabled={applying} onClick={handleApply} className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50">
          {applying ? 'Applying…' : 'Apply Default Checklist'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {items && items.length === 0 && <p className="text-sm text-gray-500">No checklist applied yet.</p>}

      <div className="divide-y divide-gray-100">
        {(items || []).map((item) => (
          <div key={item.id} className="py-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm">{item.label}</p>
              {item.completed_by_email && <p className="text-xs text-gray-500">Completed by {item.completed_by_email}</p>}
            </div>
            <select
              disabled={busyId === item.id}
              value={item.status}
              onChange={(e) => handleStatusChange(item.id, e.target.value)}
              className={`text-xs border rounded px-1.5 py-1 shrink-0 ${STATUS_STYLES[item.status]}`}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <input
          type="text"
          placeholder="Add a custom checklist item"
          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
          value={adHocLabel}
          onChange={(e) => setAdHocLabel(e.target.value)}
        />
        <button
          disabled={addingAdHoc || !adHocLabel.trim()}
          onClick={handleAddAdHoc}
          className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue shrink-0"
        >
          Add
        </button>
      </div>
    </div>
  );
}
