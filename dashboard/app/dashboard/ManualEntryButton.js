'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/apiClient';
import { CUSTOMER_STATUSES } from '../../lib/constants';

const TABS = ['New Customer', 'New Asset', 'Record Payment', 'Report Fault', 'Update Status'];

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded px-2 py-1.5 text-sm';

export default function ManualEntryButton({ assetcoId, customers, assetIds }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(TABS[0]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [customerForm, setCustomerForm] = useState({ customerName: '', segment: '', state: '', status: '' });
  const [assetForm, setAssetForm] = useState({
    customerId: customers[0]?.id || '',
    assetType: '',
    equipmentSpec: '',
    ownershipModel: 'LEASE_TO_OWN',
    oemModel: '',
    oemManufacturer: '',
    remoteControlSupported: false,
  });
  const [paymentForm, setPaymentForm] = useState({ assetId: assetIds[0] || '', amount: '', status: 'RECEIVED', period: '' });
  const [faultForm, setFaultForm] = useState({ assetId: assetIds[0] || '', faultDescription: '', severity: 'Medium' });
  const [statusForm, setStatusForm] = useState({ customerId: customers[0]?.id || '', status: 'ACTIVE', notes: '' });

  async function submit(path, body, onDone) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(path, { method: path.includes('/status') ? 'PATCH' : 'POST', body });
      setSuccess('Saved.');
      onDone?.();
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded hover:bg-brand-blue">
        Add Data
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Manual Data Entry</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="flex flex-wrap gap-1 p-3 border-b text-xs">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(null); setSuccess(null); }}
                  className={`px-2 py-1 rounded ${tab === t ? 'bg-brand-navy text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-3">
              {tab === 'New Customer' && (
                <>
                  <Field label="Customer name">
                    <input className={inputCls} value={customerForm.customerName} onChange={(e) => setCustomerForm((f) => ({ ...f, customerName: e.target.value }))} />
                  </Field>
                  <Field label="Segment">
                    <input className={inputCls} placeholder="RESIDENTIAL / SME / COMMERCIAL / COMMUNITY / INSTITUTION" value={customerForm.segment} onChange={(e) => setCustomerForm((f) => ({ ...f, segment: e.target.value }))} />
                  </Field>
                  <Field label="State">
                    <input className={inputCls} value={customerForm.state} onChange={(e) => setCustomerForm((f) => ({ ...f, state: e.target.value }))} />
                  </Field>
                  <Field label="Initial status (leave blank for Pipeline)">
                    <select className={inputCls} value={customerForm.status} onChange={(e) => setCustomerForm((f) => ({ ...f, status: e.target.value }))}>
                      <option value="">Pipeline (default)</option>
                      {CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <button
                    disabled={submitting || !customerForm.customerName}
                    onClick={() => submit('/api/manual/customers', {
                      assetCoId: assetcoId,
                      customerName: customerForm.customerName,
                      segment: customerForm.segment || undefined,
                      state: customerForm.state || undefined,
                      status: customerForm.status || undefined,
                    }, () => setCustomerForm({ customerName: '', segment: '', state: '', status: '' }))}
                    className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50"
                  >
                    {submitting ? 'Saving…' : 'Save Customer'}
                  </button>
                </>
              )}

              {tab === 'New Asset' && (
                <>
                  <Field label="Customer">
                    <select className={inputCls} value={assetForm.customerId} onChange={(e) => setAssetForm((f) => ({ ...f, customerId: e.target.value }))}>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Asset type">
                    <input className={inputCls} placeholder="e.g. SOLAR_SYSTEM, METER, EV_BIKE" value={assetForm.assetType} onChange={(e) => setAssetForm((f) => ({ ...f, assetType: e.target.value }))} />
                  </Field>
                  <Field label="Equipment spec">
                    <input className={inputCls} placeholder="e.g. 100kWp Solar Panel Array, 125kWh Battery Bank" value={assetForm.equipmentSpec} onChange={(e) => setAssetForm((f) => ({ ...f, equipmentSpec: e.target.value }))} />
                  </Field>
                  <Field label="Deal type">
                    <select className={inputCls} value={assetForm.ownershipModel} onChange={(e) => setAssetForm((f) => ({ ...f, ownershipModel: e.target.value }))}>
                      <option value="OUTRIGHT_PURCHASE">Outright Purchase</option>
                      <option value="LEASE_TO_OWN">Lease-to-Own</option>
                      <option value="PAYG_METERED">Energy as a Service (metered)</option>
                    </select>
                  </Field>
                  <Field label="OEM model">
                    <input className={inputCls} value={assetForm.oemModel} onChange={(e) => setAssetForm((f) => ({ ...f, oemModel: e.target.value }))} />
                  </Field>
                  <Field label="OEM manufacturer">
                    <input className={inputCls} value={assetForm.oemManufacturer} onChange={(e) => setAssetForm((f) => ({ ...f, oemManufacturer: e.target.value }))} />
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={assetForm.remoteControlSupported} onChange={(e) => setAssetForm((f) => ({ ...f, remoteControlSupported: e.target.checked }))} />
                    Remote control supported
                  </label>
                  <button
                    disabled={submitting || !assetForm.customerId}
                    onClick={() => submit('/api/manual/assets', { assetCoId: assetcoId, ...assetForm })}
                    className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50"
                  >
                    {submitting ? 'Saving…' : 'Save Asset'}
                  </button>
                </>
              )}

              {tab === 'Record Payment' && (
                <>
                  <Field label="Asset">
                    <select className={inputCls} value={paymentForm.assetId} onChange={(e) => setPaymentForm((f) => ({ ...f, assetId: e.target.value }))}>
                      {assetIds.map((id) => <option key={id} value={id}>{id}</option>)}
                    </select>
                  </Field>
                  <Field label="Amount (NGN)">
                    <input type="number" className={inputCls} value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))} />
                  </Field>
                  <Field label="Status">
                    <select className={inputCls} value={paymentForm.status} onChange={(e) => setPaymentForm((f) => ({ ...f, status: e.target.value }))}>
                      <option value="RECEIVED">Received</option>
                      <option value="MISSED">Missed</option>
                    </select>
                  </Field>
                  <Field label="Period (YYYY-MM)">
                    <input className={inputCls} placeholder="2026-06" value={paymentForm.period} onChange={(e) => setPaymentForm((f) => ({ ...f, period: e.target.value }))} />
                  </Field>
                  <button
                    disabled={submitting || !paymentForm.assetId || !paymentForm.amount || !paymentForm.period}
                    onClick={() => submit('/api/manual/payments', {
                      assetCoId: assetcoId,
                      assetId: paymentForm.assetId,
                      amount: Number(paymentForm.amount),
                      status: paymentForm.status,
                      period: paymentForm.period,
                    })}
                    className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50"
                  >
                    {submitting ? 'Saving…' : 'Save Payment'}
                  </button>
                </>
              )}

              {tab === 'Report Fault' && (
                <>
                  <Field label="Asset">
                    <select className={inputCls} value={faultForm.assetId} onChange={(e) => setFaultForm((f) => ({ ...f, assetId: e.target.value }))}>
                      {assetIds.map((id) => <option key={id} value={id}>{id}</option>)}
                    </select>
                  </Field>
                  <Field label="Description">
                    <textarea className={inputCls} rows={2} value={faultForm.faultDescription} onChange={(e) => setFaultForm((f) => ({ ...f, faultDescription: e.target.value }))} />
                  </Field>
                  <Field label="Severity">
                    <select className={inputCls} value={faultForm.severity} onChange={(e) => setFaultForm((f) => ({ ...f, severity: e.target.value }))}>
                      {['Critical', 'High', 'Medium', 'Low'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <button
                    disabled={submitting || !faultForm.assetId || !faultForm.faultDescription}
                    onClick={() => submit('/api/manual/faults', { assetCoId: assetcoId, ...faultForm })}
                    className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50"
                  >
                    {submitting ? 'Saving…' : 'Save Fault'}
                  </button>
                </>
              )}

              {tab === 'Update Status' && (
                <>
                  <Field label="Customer">
                    <select className={inputCls} value={statusForm.customerId} onChange={(e) => setStatusForm((f) => ({ ...f, customerId: e.target.value }))}>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="New status">
                    <select className={inputCls} value={statusForm.status} onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))}>
                      {CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Notes">
                    <textarea className={inputCls} rows={2} value={statusForm.notes} onChange={(e) => setStatusForm((f) => ({ ...f, notes: e.target.value }))} />
                  </Field>
                  <button
                    disabled={submitting || !statusForm.customerId}
                    onClick={() => submit(`/api/customers/${statusForm.customerId}/status`, { status: statusForm.status, notes: statusForm.notes })}
                    className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50"
                  >
                    {submitting ? 'Saving…' : 'Update Status'}
                  </button>
                </>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
