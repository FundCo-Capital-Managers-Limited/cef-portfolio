'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/apiClient';

export default function InternalNotesEditor({ assetcoId, initialNotes }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleBlur() {
    if (notes === (initialNotes || '')) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/assetcos/${assetcoId}`, { method: 'PATCH', body: { internalNotes: notes } });
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleBlur}
        rows={4}
        placeholder="Internal notes about this AssetCo (not visible to AssetCo users)…"
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
      />
      {saving && <p className="text-xs text-gray-400 mt-1">Saving…</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
