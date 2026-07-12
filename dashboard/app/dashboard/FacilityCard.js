'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/apiClient';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { FACILITY_STATUS_STYLES, PAYMENT_TYPES } from '../../lib/constants';

const SCHEDULE_ROW_STYLES = {
  PAID: 'bg-green-50',
  MISSED: 'bg-red-50',
  PARTIALLY_PAID: 'bg-amber-50',
};

function RepaymentForm({ facilityId, onClose, onSaved }) {
  const [form, setForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    principalPaidNgn: '',
    interestPaidNgn: '',
    feesPaidNgn: '',
    paymentReference: '',
    paymentType: 'SCHEDULED',
    periodCovered: '',
    notes: '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/facilities/${facilityId}/repayments`, {
        method: 'POST',
        body: {
          ...form,
          principalPaidNgn: Number(form.principalPaidNgn || 0),
          interestPaidNgn: Number(form.interestPaidNgn || 0),
          feesPaidNgn: Number(form.feesPaidNgn || 0),
        },
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm space-y-3">
        <h3 className="font-semibold">Record Repayment</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Payment date</label>
            <input type="date" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.paymentDate} onChange={(e) => set('paymentDate', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Period (YYYY-MM)</label>
            <input placeholder="2026-06" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.periodCovered} onChange={(e) => set('periodCovered', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Principal paid</label>
            <input type="number" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.principalPaidNgn} onChange={(e) => set('principalPaidNgn', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Interest paid</label>
            <input type="number" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.interestPaidNgn} onChange={(e) => set('interestPaidNgn', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Payment type</label>
          <select className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.paymentType} onChange={(e) => set('paymentType', e.target.value)}>
            {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Reference</label>
          <input className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={form.paymentReference} onChange={(e) => set('paymentReference', e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-gray-300">Cancel</button>
          <button onClick={handleSave} disabled={submitting} className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue transition-all active:scale-95">
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FacilityCard({ facility }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRepaymentForm, setShowRepaymentForm] = useState(false);

  const outstanding = facility.outstanding_balance_ngn ?? facility.principal_amount_ngn - facility.total_repaid_ngn;
  const repaidPct = facility.principal_amount_ngn > 0 ? (facility.total_repaid_ngn / facility.principal_amount_ngn) * 100 : 0;
  const barColor = repaidPct > 80 ? 'bg-green-500' : repaidPct >= 40 ? 'bg-amber-500' : 'bg-red-500';

  async function toggleSchedule() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch(`/api/facilities/${facility.id}`);
      setSchedule(data.schedule);
    } finally {
      setLoading(false);
      setExpanded(true);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{facility.facility_reference || 'Unnamed Facility'}</span>
        <div className="flex gap-1">
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{facility.facility_type}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${FACILITY_STATUS_STYLES[facility.facility_status] || 'bg-gray-100 text-gray-500'}`}>
            {facility.facility_status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between"><span>Principal</span><span>{formatCurrency(facility.principal_amount_ngn)}</span></div>
          <div className="flex justify-between"><span>Interest rate</span><span>{facility.interest_rate_percent ? `${facility.interest_rate_percent}% p.a.` : 'N/A'}</span></div>
          <div className="flex justify-between"><span>Tenor</span><span>{facility.tenor_months} months</span></div>
          <div className="flex justify-between"><span>Disbursed</span><span>{facility.disbursement_date || 'N/A'}</span></div>
          <div className="flex justify-between"><span>Maturity</span><span>{facility.maturity_date || 'N/A'}</span></div>
          <div className="flex justify-between"><span>Frequency</span><span>{facility.repayment_frequency}</span></div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">{formatCurrency(facility.total_repaid_ngn)} repaid of {formatCurrency(facility.principal_amount_ngn)}</p>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
            <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${Math.min(repaidPct, 100)}%` }} />
          </div>
          <p className="font-medium">Outstanding: {formatCurrency(outstanding)}</p>
        </div>
      </div>

      <div className="flex gap-3 mt-3 pt-3 border-t">
        <button onClick={toggleSchedule} className="text-xs text-blue-600 hover:underline">
          {loading ? 'Loading…' : expanded ? 'Hide Schedule' : 'View Repayment Schedule'}
        </button>
        <button onClick={() => setShowRepaymentForm(true)} className="text-xs text-blue-600 hover:underline">
          Record Repayment
        </button>
      </div>

      {expanded && schedule && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="p-2">Period</th>
                <th className="p-2">Due Date</th>
                <th className="p-2">Principal</th>
                <th className="p-2">Interest</th>
                <th className="p-2">Total Due</th>
                <th className="p-2">Status</th>
                <th className="p-2">Paid</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row) => (
                <tr key={row.id} className={SCHEDULE_ROW_STYLES[row.status] || ''}>
                  <td className="p-2">{row.period}</td>
                  <td className="p-2">{row.due_date}</td>
                  <td className="p-2">{formatCurrency(row.principal_due_ngn)}</td>
                  <td className="p-2">{formatCurrency(row.interest_due_ngn)}</td>
                  <td className="p-2">{formatCurrency(row.total_due_ngn ?? Number(row.principal_due_ngn) + Number(row.interest_due_ngn))}</td>
                  <td className="p-2">{row.status}</td>
                  <td className="p-2">{row.paid_date ? formatDateTime(row.paid_date) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showRepaymentForm && (
        <RepaymentForm
          facilityId={facility.id}
          onClose={() => setShowRepaymentForm(false)}
          onSaved={() => {
            setShowRepaymentForm(false);
            setExpanded(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
