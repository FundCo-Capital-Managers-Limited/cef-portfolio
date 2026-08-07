'use client';

import { useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import { formatDateTime } from '../../../lib/format';
import { FACILITY_STATUSES, FACILITY_STATUS_STYLES } from '../../../lib/constants';

const CLASSIFICATION_OVERRIDE_ROLES = ['management', 'risk', 'executive'];

// The KRI-derived facility_status keeps recomputing automatically (recordRepayment,
// nightly arrears check); classification_override is a separate, deliberate
// management call layered on top of it — e.g. "aware of a one-off delay,
// treat as performing" despite a raw missed-payment signal. The badge always
// shows the effective status (override if set, otherwise the computed one),
// with the computed status still visible underneath for transparency.
export default function FacilityClassificationPanel({ facility, currentUserRole, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState(facility.facility_status);
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const canOverride = CLASSIFICATION_OVERRIDE_ROLES.includes(currentUserRole);
  const effectiveStatus = facility.classification_override || facility.facility_status;
  const isOverridden = Boolean(facility.classification_override);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/facilities/${facility.id}/classification-override`, {
        method: 'PATCH',
        body: { status, reason },
      });
      setShowForm(false);
      setReason('');
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/facilities/${facility.id}/classification-override`, { method: 'DELETE' });
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!canOverride && !isOverridden) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Classification</h2>
        {canOverride && (
          <button onClick={() => setShowForm((v) => !v)} className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
            {showForm ? 'Cancel' : isOverridden ? 'Change Override' : 'Override'}
          </button>
        )}
      </div>

      {isOverridden && (
        <div className="text-sm space-y-1">
          <p>
            Overridden to{' '}
            <span className={`text-xs px-2 py-0.5 rounded-full ${FACILITY_STATUS_STYLES[effectiveStatus] || 'bg-gray-100 text-gray-500'}`}>
              {effectiveStatus}
            </span>{' '}
            <span className="text-gray-500">(computed: {facility.facility_status})</span>
          </p>
          <p className="text-xs text-gray-500">{facility.classification_override_reason}</p>
          <p className="text-xs text-gray-400">{formatDateTime(facility.classification_override_at)}</p>
          {canOverride && (
            <button onClick={handleClear} disabled={busy} className="text-xs text-red-600 hover:underline disabled:opacity-50">
              Clear override
            </button>
          )}
        </div>
      )}

      {showForm && (
        <div className="border border-gray-200 rounded p-3 space-y-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
            {FACILITY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Reason for this override (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            rows={2}
          />
          <button
            disabled={busy || !reason.trim()}
            onClick={handleSubmit}
            className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue"
          >
            {busy ? 'Saving…' : 'Save Override'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
