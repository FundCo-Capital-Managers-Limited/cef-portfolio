'use client';

import { useEffect, useState } from 'react';
import { Printer, Download } from 'lucide-react';
import { apiFetch } from '../../../../lib/apiClient';
import { createClient } from '../../../../lib/supabaseClient';
import { formatDateTime } from '../../../../lib/format';

function actionLabel(actionType) {
  return actionType.replace('SERIES_', 'Series ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

// window.print() renders this same DOM — the print:hidden controls above
// disappear and the table becomes the whole page (see the @media print rule
// in globals.css). No PDF library needed: "Save as PDF" is a print-dialog
// destination in every browser.
export default function ApprovalTrailReport() {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    apiFetch('/api/approvals/report')
      .then((data) => setRequests(data.requests))
      .catch((err) => setError(err.message));
  }, []);

  async function handleExportCsv() {
    setExporting(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/approvals/report/export`, {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cef-approval-trail-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!requests) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-3">
      <div className="print:hidden flex gap-2">
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 text-sm border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50">
          <Printer size={14} /> Print / Save as PDF
        </button>
        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 text-sm border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
        >
          <Download size={14} /> {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      <div className="hidden print:block mb-4">
        <h1 className="text-lg font-semibold">CEF-PIP Approval Trail</h1>
        <p className="text-xs text-gray-500">Generated {formatDateTime(new Date().toISOString())}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto print:border-0">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 border-b">
            <tr>
              <th className="p-3">Requested</th>
              <th className="p-3">Action</th>
              <th className="p-3">Requested By</th>
              <th className="p-3">Status</th>
              <th className="p-3">Decided By</th>
              <th className="p-3">Decided</th>
              <th className="p-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="p-3 text-gray-500 text-xs whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                <td className="p-3">
                  {actionLabel(r.action_type)}
                  {r.payload?.code ? `: ${r.payload.code}` : ''}
                </td>
                <td className="p-3">{r.requested_by_email}</td>
                <td className="p-3 capitalize">{r.status}</td>
                <td className="p-3">{r.decided_by_email || 'N/A'}</td>
                <td className="p-3 text-gray-500 text-xs whitespace-nowrap">{r.decided_at ? formatDateTime(r.decided_at) : 'N/A'}</td>
                <td className="p-3 text-gray-500">{r.decision_notes || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && <p className="p-4 text-sm text-gray-500">No approval requests recorded yet.</p>}
      </div>
    </div>
  );
}
