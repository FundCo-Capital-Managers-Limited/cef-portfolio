'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { apiFetch } from '../../../../lib/apiClient';
import { usePaginatedList } from '../../../../lib/usePaginatedList';
import Pagination from '../../Pagination';

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-700',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const APPLICATION_STATUSES = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];

function searchApplication(app, term) {
  return (
    app.company_name.toLowerCase().includes(term) ||
    app.primary_contact_email.toLowerCase().includes(term) ||
    app.primary_contact_name.toLowerCase().includes(term)
  );
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = `${window.location.origin}/apply`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="text-sm bg-brand-navy text-white px-3 py-1.5 rounded hover:bg-brand-blue transition-all active:scale-95"
    >
      {copied ? 'Link copied!' : 'Copy Onboarding Link'}
    </button>
  );
}

function ReviewForm({ application, onReviewed }) {
  const [assetcoId, setAssetcoId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [approvedSecret, setApprovedSecret] = useState(null);

  async function review(decision) {
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/applications/${application.id}/review`, {
        method: 'PUT',
        body: { decision, notes, assetcoId: decision === 'APPROVED' ? assetcoId : undefined },
      });
      if (decision === 'APPROVED' && data.application?.hmacSecret) {
        // Deliberately don't call onReviewed() yet — that reloads the list,
        // which flips this application's status and unmounts this form
        // before the reviewer has a chance to read/copy the one-time secret.
        setApprovedSecret({ assetcoId, secret: data.application.hmacSecret });
      } else {
        onReviewed();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (approvedSecret) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100 text-sm bg-green-50 border border-green-200 rounded p-3 text-green-800">
        <p>Approved: <strong>{approvedSecret.assetcoId}</strong> is now live in Onboarding.</p>
        <p className="mt-1">
          HMAC signing secret: <code className="bg-white px-1 py-0.5 rounded border break-all">{approvedSecret.secret}</code>
        </p>
        <p className="mt-1 text-xs text-green-700">
          Share this with the AssetCo's developers securely. It is shown only once, and it's what they use to sign
          every event they send to POST /api/v1/events (see the API Integration Guide).
        </p>
        <button
          onClick={onReviewed}
          className="mt-2 text-xs text-green-800 underline hover:no-underline"
        >
          I've saved it, refresh the queue
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
      <div>
        <label className="block text-xs text-gray-600 mb-1">New AssetCo ID (required to approve, e.g. BRIGHTFUTURE)</label>
        <input
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          value={assetcoId}
          onChange={(e) => setAssetcoId(e.target.value.toUpperCase())}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Review notes</label>
        <textarea
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button
          disabled={submitting || !assetcoId}
          onClick={() => review('APPROVED')}
          className="inline-flex items-center gap-1 text-sm bg-brand-navy text-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-brand-blue transition-all active:scale-95"
        >
          Approve <ArrowRight size={14} /> Onboarding
        </button>
        <button
          disabled={submitting}
          onClick={() => review('REJECTED')}
          className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded disabled:opacity-50 hover:bg-gray-200"
        >
          Reject
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function ApplicationsPanel() {
  const [applications, setApplications] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  async function load() {
    try {
      const data = await apiFetch('/api/applications');
      setApplications(data.applications);
    } catch (err) {
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const preFiltered = statusFilter ? (applications || []).filter((a) => a.status === statusFilter) : applications || [];
  const { search, setSearch, page, setPage, totalPages, totalCount, paginated } = usePaginatedList(preFiltered, {
    searchFn: searchApplication,
    pageSize: 10,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Share this link with prospective AssetCos. Anyone can submit; only logged-in CEF staff can copy it.
        </p>
        <CopyLinkButton />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          type="text"
          placeholder="Search company, contact name, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs border border-gray-300 rounded px-3 py-1.5 text-sm"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      <div className="space-y-3">
        {paginated.map((app) => (
          <div key={app.id} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{app.company_name}</p>
                <p className="text-sm text-gray-500">
                  {app.primary_contact_name} · {app.primary_contact_email}
                  {app.sector ? ` · ${app.sector.replace('_', ' ')}` : ''}
                </p>
                {app.business_description && (
                  <p className="text-sm text-gray-600 mt-1">{app.business_description}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLES[app.status] || 'bg-gray-100 text-gray-500'}`}>
                {app.status}
              </span>
            </div>

            {app.status === 'PENDING' || app.status === 'UNDER_REVIEW' ? (
              <ReviewForm application={app} onReviewed={load} />
            ) : (
              <p className="mt-2 text-xs text-gray-500">
                {app.status === 'APPROVED' && app.promoted_assetco_id
                  ? `Promoted to AssetCo: ${app.promoted_assetco_id}`
                  : app.review_notes || 'No notes.'}
              </p>
            )}
          </div>
        ))}
        {applications && paginated.length === 0 && (
          <p className="text-sm text-gray-500">No applications match your search.</p>
        )}
      </div>

      {applications && <Pagination page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={setPage} itemLabel="applications" />}
    </div>
  );
}
