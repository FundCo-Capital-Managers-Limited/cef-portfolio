'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import { formatCurrency, formatDateTime } from '../../../lib/format';

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-600',
};

// AssetCos repay CEF by bank transfer, not through the platform - a rep
// submits "we paid X" here, and finance/risk/management/it_admin confirm it
// (which actually records the repayment) or reject it with a reason.
export default function FacilityRepaymentNotificationsPanel({ facilityId, canConfirm, canSubmit }) {
  const [notifications, setNotifications] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amountNgn: '', paymentDate: '', paymentReference: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  async function load() {
    try {
      const data = await apiFetch(`/api/facilities/${facilityId}/repayment-notifications`);
      setNotifications(data.notifications);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/facilities/${facilityId}/repayment-notifications`, {
        method: 'POST',
        body: {
          amountNgn: Number(form.amountNgn),
          paymentDate: form.paymentDate,
          paymentReference: form.paymentReference || undefined,
          notes: form.notes || undefined,
        },
      });
      setForm({ amountNgn: '', paymentDate: '', paymentReference: '', notes: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(id) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/facilities/repayment-notifications/${id}/confirm`, { method: 'POST' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/facilities/repayment-notifications/${id}/reject`, { method: 'POST', body: { reason: rejectReason || undefined } });
      setRejectingId(null);
      setRejectReason('');
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
        <h2 className="text-sm font-semibold">Repayment Notifications</h2>
        {canSubmit && (
          <button onClick={() => setShowForm((v) => !v)} className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
            {showForm ? 'Cancel' : 'Notify a Payment'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="border border-gray-200 rounded p-3 space-y-2">
          <p className="text-xs text-gray-500">Let CEF know you've made a bank transfer — finance will confirm it once verified.</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <input type="number" placeholder="Amount (NGN)" className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={form.amountNgn} onChange={(e) => setForm((f) => ({ ...f, amountNgn: e.target.value }))} />
            <input type="date" className="border border-gray-300 rounded px-2 py-1.5 text-sm"
              value={form.paymentDate} onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))} />
          </div>
          <input type="text" placeholder="Bank reference (optional)" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            value={form.paymentReference} onChange={(e) => setForm((f) => ({ ...f, paymentReference: e.target.value }))} />
          <button disabled={submitting || !form.amountNgn || !form.paymentDate} onClick={handleSubmit}
            className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue">
            {submitting ? 'Submitting…' : 'Submit Notification'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {notifications && notifications.length === 0 && <p className="text-sm text-gray-500">No repayment notifications yet.</p>}

      <div className="divide-y divide-gray-100">
        {(notifications || []).map((n) => (
          <div key={n.id} className="py-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{formatCurrency(n.amount_ngn)}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[n.status]}`}>{n.status}</span>
            </div>
            <p className="text-xs text-gray-500">
              Paid {formatDateTime(n.payment_date)} · notified by {n.submitted_by_email}
              {n.payment_reference ? ` · ref ${n.payment_reference}` : ''}
            </p>
            {n.rejection_reason && <p className="text-xs text-red-600">Rejected: {n.rejection_reason}</p>}
            {canConfirm && n.status === 'PENDING' && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button disabled={busyId === n.id} onClick={() => handleConfirm(n.id)} className="text-xs bg-green-600 text-white rounded px-2 py-1 hover:bg-green-700 disabled:opacity-50">
                  Confirm
                </button>
                {rejectingId === n.id ? (
                  <>
                    <input type="text" placeholder="Reason" className="text-xs border border-gray-300 rounded px-1.5 py-1"
                      value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                    <button disabled={busyId === n.id} onClick={() => handleReject(n.id)} className="text-xs bg-red-600 text-white rounded px-2 py-1 hover:bg-red-700 disabled:opacity-50">
                      Confirm Reject
                    </button>
                  </>
                ) : (
                  <button onClick={() => setRejectingId(n.id)} className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
                    Reject
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
