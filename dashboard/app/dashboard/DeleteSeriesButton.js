'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/apiClient';

export default function DeleteSeriesButton({ seriesId, seriesName }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const nameMatches = typedName.trim().toLowerCase() === seriesName.trim().toLowerCase();

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

  function reset() {
    setConfirming(false);
    setTypedName('');
    setError(null);
  }

  if (confirming) {
    return (
      <div className="text-xs bg-red-50 border border-red-200 rounded p-2 space-y-1.5 w-56">
        <p className="text-red-800">
          This deletes <strong>{seriesName}</strong> permanently (only possible if no AssetCo or asset is linked to
          it). Type the series name to confirm.
        </p>
        <input
          autoFocus
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder={seriesName}
          className="w-full border border-red-300 rounded px-2 py-1 text-xs"
        />
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            disabled={submitting || !nameMatches}
            onClick={handleDelete}
            className="text-red-700 font-medium hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {submitting ? 'Deleting…' : 'Confirm delete'}
          </button>
          <button onClick={reset} className="text-gray-500 hover:underline">Cancel</button>
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
