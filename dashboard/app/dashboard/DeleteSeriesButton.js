'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/apiClient';

export default function DeleteSeriesButton({ seriesId, seriesName }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/series/${seriesId}`, { method: 'DELETE' });
      router.refresh();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (confirming) {
    return (
      <div className="text-xs bg-red-50 border border-red-200 rounded p-2 space-y-1.5">
        <p className="text-red-800">Delete {seriesName}? This only works if no AssetCo is linked to it.</p>
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            disabled={submitting}
            onClick={handleDelete}
            className="text-red-700 font-medium hover:underline disabled:opacity-50"
          >
            {submitting ? 'Deleting…' : 'Confirm delete'}
          </button>
          <button onClick={() => setConfirming(false)} className="text-gray-500 hover:underline">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title="Delete series"
      className="text-gray-400 hover:text-red-600 transition-colors"
    >
      <Trash2 size={14} />
    </button>
  );
}
