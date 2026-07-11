'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/apiClient';

export default function RunReconciliationButton({ assetcoId, hasBaseUrl }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleRun() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiFetch(`/api/assetcos/${assetcoId}/reconciliation/run`, { method: 'POST' });
      setResult(data.result);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasBaseUrl) {
    return <p className="text-xs text-gray-400">Set a base URL to enable reconciliation.</p>;
  }

  return (
    <div className="space-y-1.5">
      <button
        disabled={submitting}
        onClick={handleRun}
        className="text-xs text-brand-blue hover:underline disabled:opacity-50"
      >
        {submitting ? 'Running…' : 'Run Reconciliation Now'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {result && (
        <p className={`text-xs ${result.status === 'OK' ? 'text-green-700' : result.status === 'MISMATCH' ? 'text-amber-700' : 'text-red-600'}`}>
          {result.status}
          {result.mismatches?.length ? ` — ${result.mismatches.length} mismatch(es)` : ''}
        </p>
      )}
    </div>
  );
}
