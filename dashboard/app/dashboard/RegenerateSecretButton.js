'use client';

import { useState } from 'react';
import { apiFetch } from '../../lib/apiClient';

export default function RegenerateSecretButton({ assetcoId }) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [secret, setSecret] = useState(null);

  async function handleRegenerate() {
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/assetcos/${assetcoId}/regenerate-secret`, { method: 'POST' });
      setSecret(data.hmacSecret);
      setConfirming(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (secret) {
    return (
      <div className="text-sm bg-green-50 border border-green-200 rounded p-3 text-green-800">
        <p>New HMAC signing secret for <strong>{assetcoId}</strong>:</p>
        <p className="mt-1">
          <code className="bg-white px-1 py-0.5 rounded border break-all">{secret}</code>
        </p>
        <p className="mt-1 text-xs text-green-700">
          Shown only once. Send it to the AssetCo's developers securely now. Their old secret stopped working
          the moment this one was generated, so events they send with it will fail signature verification
          until they update their config.
        </p>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="text-sm bg-amber-50 border border-amber-200 rounded p-3 text-amber-800 space-y-2">
        <p>
          This immediately invalidates the AssetCo's current signing secret. Coordinate with their developers
          first, or their event webhooks will start failing until they update it. Continue?
        </p>
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            disabled={submitting}
            onClick={handleRegenerate}
            className="text-xs bg-amber-600 text-white px-2.5 py-1 rounded hover:bg-amber-700 disabled:opacity-50"
          >
            {submitting ? 'Regenerating…' : 'Yes, regenerate'}
          </button>
          <button
            disabled={submitting}
            onClick={() => setConfirming(false)}
            className="text-xs text-gray-600 hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className="text-xs text-brand-blue hover:underline">
      Regenerate HMAC Secret
    </button>
  );
}
