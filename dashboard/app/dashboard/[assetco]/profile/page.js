import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { getAssetcoProfile, getCurrentUserProfile, getCefSeriesList, getAssetcoFacilities } from '../../../../lib/data';
import { formatCurrency, formatDateTime, timeAgo } from '../../../../lib/format';
import { PIPELINE_STAGE_LABELS, DREEF_STAGE_LABELS } from '../../../../lib/constants';
import AdvanceStageButton from '../../AdvanceStageButton';
import InternalNotesEditor from '../../InternalNotesEditor';
import DreefEditButton from '../../DreefEditButton';
import LinkSeriesButton from '../../LinkSeriesButton';
import AddFacilityButton from '../../AddFacilityButton';
import FacilityCard from '../../FacilityCard';
import RegenerateSecretButton from '../../RegenerateSecretButton';
import RunReconciliationButton from '../../RunReconciliationButton';
import BackLink from '../../BackLink';

const DREEF_BADGE_STYLES = {
  MANDATED: 'bg-green-100 text-green-700',
  UNDER_GUARANTEE: 'bg-green-100 text-green-700',
  DISBURSED: 'bg-green-100 text-green-700',
  INITIAL_ASSESSMENT: 'bg-amber-100 text-amber-700',
  NOT_STARTED: 'bg-gray-100 text-gray-500',
  NOT_APPLICABLE: 'bg-gray-100 text-gray-500',
};

export const metadata = { title: "AssetCo Profile" };

export default async function AssetcoProfilePage({ params }) {
  const [{ assetco, stageLog, infracredit, seriesLinks, syncState }, profile, allSeries, facilities] = await Promise.all([
    getAssetcoProfile(params.assetco),
    getCurrentUserProfile(),
    getCefSeriesList(),
    getAssetcoFacilities(params.assetco),
  ]);

  if (!assetco) notFound();

  const canManage = ['management', 'it_admin'].includes(profile?.role);
  // Scoped narrower than canManage — finance handles series/disbursement
  // data day-to-day but shouldn't see pipeline-stage/DREEF/reconciliation
  // controls meant for management/it_admin.
  const canManageFunding = ['management', 'it_admin', 'finance'].includes(profile?.role);
  const daysInStage = assetco.stage_updated_at
    ? Math.floor((Date.now() - new Date(assetco.stage_updated_at).getTime()) / 86400000)
    : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <BackLink href={`/dashboard/${assetco.id}`}>{assetco.id} Dashboard</BackLink>
          <h1 className="text-xl font-semibold mt-1">{assetco.name} · Profile</h1>
        </div>
        <Link href="/dashboard/pipeline" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
          Pipeline Board <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Company Information</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-gray-500">Trading name</span><span>{assetco.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Legal entity</span><span>{assetco.legal_entity_name || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Registration No.</span><span>{assetco.registration_number || 'N/A'}</span></div>
            <div className="flex justify-between">
              <span className="text-gray-500">Website</span>
              <span>{assetco.website ? <a href={assetco.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{assetco.website}</a> : 'N/A'}</span>
            </div>
            <div className="flex justify-between"><span className="text-gray-500">Sector</span><span>{assetco.sector || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">HQ State</span><span>{assetco.hq_state || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Operating States</span><span>{(assetco.operating_states || []).join(', ') || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Asset Types</span><span>{(assetco.asset_types || []).join(', ') || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Customer Types</span><span>{(assetco.customer_types || []).join(', ') || 'N/A'}</span></div>
            {assetco.business_description && (
              <p className="text-gray-600 pt-2 border-t">{assetco.business_description}</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Pipeline Status</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold px-3 py-1 rounded-full bg-brand-navy text-white">
                {PIPELINE_STAGE_LABELS[assetco.pipeline_stage] || assetco.pipeline_stage}
              </span>
              {canManage && <AdvanceStageButton assetcoId={assetco.id} currentStage={assetco.pipeline_stage} />}
            </div>
            <p className="text-gray-500">{daysInStage === null ? 'Stage not yet timestamped' : `${daysInStage} day(s) in current stage`}</p>

            <div className="pt-2 border-t">
              <p className="font-medium mb-2">Stage History</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stageLog.length === 0 && <p className="text-gray-400 text-xs">No stage changes recorded yet.</p>}
                {stageLog.map((entry) => (
                  <div key={entry.id} className="text-xs border-b pb-2 last:border-b-0">
                    <p className="flex items-center gap-1">
                      {entry.from_stage && (
                        <>
                          {PIPELINE_STAGE_LABELS[entry.from_stage] || entry.from_stage}
                          <ArrowRight size={11} className="text-gray-400" />
                        </>
                      )}
                      <strong>{PIPELINE_STAGE_LABELS[entry.to_stage] || entry.to_stage}</strong>
                    </p>
                    <p className="text-gray-400">
                      {entry.changed_by_name || 'Unknown'} · {timeAgo(entry.changed_at)}
                    </p>
                    {entry.notes && <p className="text-gray-500 mt-0.5">{entry.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">InfraCredit / DREEF</h2>
            {canManage && <DreefEditButton assetcoId={assetco.id} existing={infracredit} />}
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">DREEF stage</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${DREEF_BADGE_STYLES[infracredit?.dreef_stage] || 'bg-gray-100 text-gray-500'}`}>
                {DREEF_STAGE_LABELS[infracredit?.dreef_stage] || 'Not Started'}
              </span>
            </div>
            {infracredit ? (
              <>
                <div className="flex justify-between"><span className="text-gray-500">Reference</span><span>{infracredit.infracredit_reference || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Mandate date</span><span>{infracredit.mandate_date || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Guarantee type</span><span>{infracredit.guarantee_type || 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Guarantee amount</span><span>{infracredit.guarantee_amount_ngn ? formatCurrency(infracredit.guarantee_amount_ngn) : 'N/A'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">InfraCredit contact</span><span>{infracredit.infracredit_contact_name || 'N/A'}</span></div>
                {infracredit.dreef_notes && <p className="text-gray-600 pt-2 border-t">{infracredit.dreef_notes}</p>}
              </>
            ) : (
              <p className="text-gray-500">No InfraCredit/DREEF record yet.</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">CEF Funding</h2>
            {canManageFunding && <LinkSeriesButton assetcoId={assetco.id} allSeries={allSeries} />}
          </div>
          <div className="bg-white rounded-lg border border-gray-200 divide-y text-sm">
            {seriesLinks.length === 0 && <p className="p-4 text-gray-500">Not linked to any CEF series yet.</p>}
            {seriesLinks.map((link) => (
              <div key={link.id} className="p-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{link.series?.display_name || link.series_id}</p>
                  <p className="text-xs text-gray-500">{link.instrument_type} · {link.status}</p>
                </div>
                <p>{link.disbursement_amount_ngn ? formatCurrency(link.disbursement_amount_ngn) : 'N/A'}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Contact & Integration</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-gray-500">Primary contact</span><span>{assetco.primary_contact_name || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Contact email</span><span>{assetco.primary_contact_email || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Contact phone</span><span>{assetco.primary_contact_phone || 'N/A'}</span></div>
            <div className="flex justify-between">
              <span className="text-gray-500">Integration type</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{assetco.integration_type}</span>
            </div>
            <div className="flex justify-between"><span className="text-gray-500">Last sync</span><span>{formatDateTime(assetco.updated_at)}</span></div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last reconciliation</span>
              <span>
                {syncState?.last_reconciliation_at ? (
                  <>
                    {timeAgo(syncState.last_reconciliation_at)}
                    {' · '}
                    <span className={
                      syncState.last_reconciliation_status === 'OK' ? 'text-green-700'
                        : syncState.last_reconciliation_status === 'MISMATCH' ? 'text-amber-700'
                        : 'text-red-600'
                    }>
                      {syncState.last_reconciliation_status}
                    </span>
                  </>
                ) : 'Never'}
              </span>
            </div>
            {canManage && (
              <div className="pt-2 border-t space-y-2">
                <RegenerateSecretButton assetcoId={assetco.id} />
                <RunReconciliationButton assetcoId={assetco.id} hasBaseUrl={Boolean(assetco.base_url)} />
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Internal Notes</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-sm">
            {canManage ? (
              <InternalNotesEditor assetcoId={assetco.id} initialNotes={assetco.internal_notes} />
            ) : (
              <p className="text-gray-600 whitespace-pre-wrap">{assetco.internal_notes || 'No internal notes.'}</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">CEF Facilities</h2>
          {canManage && <AddFacilityButton assetcoId={assetco.id} allSeries={allSeries} />}
        </div>
        <div className="space-y-4">
          {facilities.map((facility) => (
            <FacilityCard key={facility.id} facility={facility} />
          ))}
          {facilities.length === 0 && (
            <p className="text-sm text-gray-500 bg-white rounded-lg border border-gray-200 p-4">
              No CEF facilities recorded for this AssetCo yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
