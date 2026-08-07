'use client';

import { useState } from 'react';
import Image from 'next/image';

const SECTORS = ['SOLAR', 'MINI_GRID', 'EV_MOBILITY', 'BATTERY_STORAGE', 'OTHER'];

const inputCls = 'mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue';

function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function splitList(value) {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export default function ApplyPage() {
  const [form, setForm] = useState({
    companyName: '',
    legalEntityName: '',
    registrationNumber: '',
    website: '',
    sector: '',
    businessDescription: '',
    hqState: '',
    operatingStates: '',
    assetTypes: '',
    customerTypes: '',
    businessModels: '',
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          operatingStates: splitList(form.operatingStates),
          assetTypes: splitList(form.assetTypes),
          customerTypes: splitList(form.customerTypes),
          businessModels: splitList(form.businessModels),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-6 px-4">
        <Image src="/logo.png" alt="Clean Energy Local Currency Fund" width={200} height={45} priority />
        <div className="max-w-md text-center bg-white p-8 rounded-lg shadow border-t-4 border-brand-green">
          <h1 className="text-xl font-semibold text-brand-navy mb-2">Application received</h1>
          <p className="text-sm text-gray-600">
            Thank you for your interest in partnering with the Clean Energy Fund. Our team will review your
            submission and reach out to the contact details you provided.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center bg-gray-50 gap-6 px-4 py-10">
      <Image src="/logo.png" alt="Clean Energy Local Currency Fund" width={200} height={45} priority />

      <form onSubmit={handleSubmit} className="w-full max-w-xl bg-white p-8 rounded-lg shadow space-y-4 border-t-4 border-brand-blue">
        <div>
          <h1 className="text-xl font-semibold text-brand-navy">AssetCo Onboarding Application</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tell us about your company. A CEF reviewer will follow up once your application has been assessed.
          </p>
        </div>

        <Field label="Company name" required>
          <input className={inputCls} required value={form.companyName} onChange={update('companyName')} />
        </Field>
        <Field label="Legal entity name">
          <input className={inputCls} value={form.legalEntityName} onChange={update('legalEntityName')} />
        </Field>
        <Field label="Registration number">
          <input className={inputCls} value={form.registrationNumber} onChange={update('registrationNumber')} />
        </Field>
        <Field label="Website">
          <input className={inputCls} value={form.website} onChange={update('website')} />
        </Field>
        <Field label="Sector">
          <select className={inputCls} value={form.sector} onChange={update('sector')}>
            <option value="">Select…</option>
            {SECTORS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </Field>
        <Field label="Business description">
          <textarea className={inputCls} rows={3} value={form.businessDescription} onChange={update('businessDescription')} />
        </Field>
        <Field label="Headquarters state">
          <input className={inputCls} value={form.hqState} onChange={update('hqState')} />
        </Field>
        <Field label="Operating states (comma-separated)">
          <input className={inputCls} placeholder="Lagos, Ogun, Oyo" value={form.operatingStates} onChange={update('operatingStates')} />
        </Field>
        <Field label="Asset types you work with (comma-separated)">
          <input className={inputCls} placeholder="Solar Home System, Smart Meter" value={form.assetTypes} onChange={update('assetTypes')} />
        </Field>
        <Field label="Customer types (comma-separated)">
          <input className={inputCls} placeholder="RESIDENTIAL, SME" value={form.customerTypes} onChange={update('customerTypes')} />
        </Field>
        <Field label="Business model(s) (comma-separated)">
          <input className={inputCls} placeholder="C&I, C2C, PAYG" value={form.businessModels} onChange={update('businessModels')} />
        </Field>

        <hr className="border-gray-200" />

        <Field label="Primary contact name" required>
          <input className={inputCls} required value={form.primaryContactName} onChange={update('primaryContactName')} />
        </Field>
        <Field label="Primary contact email" required>
          <input type="email" className={inputCls} required value={form.primaryContactEmail} onChange={update('primaryContactEmail')} />
        </Field>
        <Field label="Primary contact phone">
          <input className={inputCls} value={form.primaryContactPhone} onChange={update('primaryContactPhone')} />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand-navy hover:bg-brand-blue transition-colors text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Application'}
        </button>
      </form>
    </main>
  );
}
