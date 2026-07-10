import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCustomerDetail } from '../../../../../lib/data';
import { formatCurrency, formatDateTime, timeAgo } from '../../../../../lib/format';
import { OWNERSHIP_MODEL_LABELS } from '../../../../../lib/constants';

const STATUS_STYLES = {
  PIPELINE: 'bg-gray-100 text-gray-600',
  ASSET_ORDERED: 'bg-blue-100 text-blue-700',
  INSTALLATION_SCHEDULED: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-green-100 text-green-700',
  IN_ARREARS: 'bg-amber-100 text-amber-700',
  DEFAULTED: 'bg-red-100 text-red-700',
  CHURNED: 'bg-gray-100 text-gray-500',
};

export default async function CustomerDetailPage({ params }) {
  const { customer, assets, payments, faults } = await getCustomerDetail(params.customerId);

  if (!customer) notFound();

  const dealType = assets[0]?.ownership_model;

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/dashboard/${params.assetco}`} className="text-sm text-gray-500 hover:text-gray-800">
          ← {params.assetco} Dashboard
        </Link>
        <div className="flex items-center gap-2 mt-1">
          <h1 className="text-xl font-semibold">{customer.name || customer.id}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[customer.status] || 'bg-gray-100 text-gray-500'}`}>
            {customer.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Customer Profile</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-gray-500">Customer ID</span><span>{customer.id}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Segment</span><span>{customer.customer_segment || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Deal type</span><span>{dealType ? OWNERSHIP_MODEL_LABELS[dealType] || dealType : 'Not yet assigned'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Location</span><span>{[customer.location_lga, customer.location_state].filter(Boolean).join(', ') || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Contract signed</span><span>{customer.contract_signed_date || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Expected installation</span><span>{customer.expected_installation_date || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Expected monthly payment</span><span>{customer.expected_monthly_payment_ngn ? formatCurrency(customer.expected_monthly_payment_ngn) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Contract term</span><span>{customer.contract_term_months ? `${customer.contract_term_months} months` : '—'}</span></div>
            {customer.pipeline_notes && <p className="text-gray-600 pt-2 border-t">{customer.pipeline_notes}</p>}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Assets ({assets.length})</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y">
            {assets.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/${params.assetco}/assets/${a.id}`}
                className="p-3 text-sm flex justify-between hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-blue-600 hover:underline">{a.id}</p>
                  <p className="text-xs text-gray-500">{a.asset_type || 'type n/a'} · {OWNERSHIP_MODEL_LABELS[a.ownership_model] || a.ownership_model}</p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>{a.status}</p>
                  {a.cashflow?.is_defaulted && <span className="text-red-600">defaulted</span>}
                </div>
              </Link>
            ))}
            {assets.length === 0 && (
              <p className="p-4 text-sm text-gray-500">
                No assets deployed yet — this customer is in the pre-deployment pipeline.
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Payment History</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Asset</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="p-3">{formatDateTime(p.occurred_at)}</td>
                  <td className="p-3">
                    <Link href={`/dashboard/${params.assetco}/assets/${p.asset_id}`} className="text-blue-600 hover:underline">
                      {p.asset_id}
                    </Link>
                  </td>
                  <td className="p-3">{formatCurrency(p.amount, p.currency)}</td>
                  <td className="p-3">{p.status}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={4}>No payments recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Fault Log</h2>
        <div className="bg-white rounded-lg border border-gray-200 divide-y">
          {faults.map((f) => (
            <div key={f.id} className="p-3 text-sm flex justify-between">
              <span>{f.asset_id} — {f.status === 'open' ? 'Open' : 'Resolved'}</span>
              <span className="text-gray-500">{timeAgo(f.detected_at)}</span>
            </div>
          ))}
          {faults.length === 0 && <p className="text-sm text-gray-500 p-4">No faults recorded.</p>}
        </div>
      </div>
    </div>
  );
}
