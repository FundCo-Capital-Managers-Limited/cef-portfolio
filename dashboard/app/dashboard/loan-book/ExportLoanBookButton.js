'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { createClient } from '../../../lib/supabaseClient';

// apiFetch (lib/apiClient.js) always parses the response as JSON, which a
// CSV attachment isn't — this fetches the same way (bearer token from the
// current session) but reads the body as a blob and triggers a download.
export default function ExportLoanBookButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleExport() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/portfolio/loan-book/export`, {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cef-loan-book-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleExport}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-sm border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
      >
        <Download size={14} />
        {busy ? 'Exporting…' : 'Export CSV'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
