'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import { formatCurrency, formatDateTime } from '../../../lib/format';
import { FACILITY_STATUS_STYLES } from '../../../lib/constants';
import FacilityDocumentsPanel from './FacilityDocumentsPanel';
import FacilitySecurityPanel from './FacilitySecurityPanel';
import FacilityCovenantsPanel from './FacilityCovenantsPanel';
import FacilityRepaymentNotificationsPanel from './FacilityRepaymentNotificationsPanel';
import FacilityClassificationPanel from './FacilityClassificationPanel';

const CEF_STAFF_ROLES = ['management', 'it_admin', 'finance', 'risk'];

export default function FacilityDetail({ facilityId, currentUserRole, currentUserAssetcoId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    return apiFetch(`/api/facilities/${facilityId}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-gray-500">Loading…</p>;

  const { facility, repayments } = data;
  const canConfirm = CEF_STAFF_ROLES.includes(currentUserRole);
  const canSubmit = canConfirm || (currentUserRole === 'assetco_admin' && currentUserAssetcoId === facility.assetco_id);
  const effectiveStatus = facility.classification_override || facility.facility_status;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">{facility.facility_reference || facility.id}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${FACILITY_STATUS_STYLES[effectiveStatus] || 'bg-gray-100 text-gray-500'}`}>
            {effectiveStatus}
          </span>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500">Principal</p>
            <p className="font-medium">{formatCurrency(facility.principal_amount_ngn)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Repaid</p>
            <p className="font-medium">{formatCurrency(facility.total_repaid_ngn)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Outstanding</p>
            <p className="font-medium">{formatCurrency(facility.outstanding_balance_ngn)}</p>
          </div>
        </div>
      </div>

      <FacilityClassificationPanel facility={facility} currentUserRole={currentUserRole} onChanged={load} />
      <FacilityRepaymentNotificationsPanel facilityId={facilityId} canConfirm={canConfirm} canSubmit={canSubmit} />
      <FacilityDocumentsPanel facilityId={facilityId} />
      <FacilitySecurityPanel facilityId={facilityId} />
      <FacilityCovenantsPanel facilityId={facilityId} />

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold mb-2">Repayment History</h2>
        {(repayments || []).length === 0 && <p className="text-sm text-gray-500">No repayments recorded yet.</p>}
        <div className="divide-y divide-gray-100">
          {(repayments || []).map((r) => (
            <div key={r.id} className="py-2 flex items-center justify-between gap-2 text-sm">
              <span>{formatDateTime(r.payment_date)}</span>
              <span>{formatCurrency(r.total_paid_ngn)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
