'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import RegenerateSecretButton from '../RegenerateSecretButton';

export default function DevConsolePanel() {
  const [assetcos, setAssetcos] = useState(null);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    apiFetch('/api/assetcos')
      .then((data) => {
        setAssetcos(data.assetcos);
        if (data.assetcos.length) setSelectedId(data.assetcos[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  const selected = assetcos?.find((a) => a.id === selectedId);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!assetcos) return <p className="text-sm text-gray-500">Loading…</p>;

  if (assetcos.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        You don&apos;t have developer access to any AssetCo yet — ask CEF IT to grant it.
      </p>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">AssetCo</label>
          <select
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {assetcos.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        {selected && (
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-gray-500">AssetCo ID</span><span>{selected.id}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Integration type</span><span>{selected.integration_type || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Pipeline stage</span><span>{selected.pipeline_stage || '—'}</span></div>
            <div className="pt-2 border-t">
              <RegenerateSecretButton key={selected.id} assetcoId={selected.id} />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-sm space-y-2">
        <h2 className="font-semibold text-sm">Integration resources</h2>
        <p className="text-gray-600 dark:text-gray-300">
          The API Integration Guide covers HMAC request signing, all 14 event types, and the
          reconciliation endpoints your platform must expose.
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          The <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">sample-assetco-integration</code>{' '}
          reference implementation (CLI + a small local web UI) is the fastest way to test a new
          secret end to end before wiring up your real integration.
        </p>
        <p className="text-xs text-gray-500">
          Ask your CEF contact for a copy of both if you don&apos;t already have them.
        </p>
      </div>
    </div>
  );
}
