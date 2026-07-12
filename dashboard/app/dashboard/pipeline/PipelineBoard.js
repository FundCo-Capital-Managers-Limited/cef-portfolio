'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '../../../lib/format';
import { PIPELINE_STAGES, PIPELINE_STAGE_LABELS } from '../../../lib/constants';
import AdvanceStageButton from '../AdvanceStageButton';

export default function PipelineBoard({ assetcos, canAdvance }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assetcos;
    return assetcos.filter(
      (a) => a.name.toLowerCase().includes(term) || (a.sector || '').toLowerCase().includes(term)
    );
  }, [assetcos, search]);

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search AssetCo or sector…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full sm:max-w-xs border border-gray-300 rounded px-3 py-1.5 text-sm"
      />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageAssetcos = filtered.filter((a) => a.pipeline_stage === stage);
          return (
            <div key={stage} className="bg-gray-100 rounded-lg p-3">
              <h2 className="text-sm font-semibold mb-1">{PIPELINE_STAGE_LABELS[stage]}</h2>
              <p className="text-xs text-gray-500 mb-3">{stageAssetcos.length} AssetCo(s)</p>
              <div className="space-y-3">
                {stageAssetcos.map((co) => (
                  <div key={co.id} className="bg-white rounded-lg border border-gray-200 p-3 text-sm">
                    <Link href={`/dashboard/${co.id}/profile`} className="font-medium text-blue-600 hover:underline">
                      {co.name}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">{co.sector || 'Sector not set'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {co.daysInStage === null ? 'stage not yet set' : `${co.daysInStage}d in stage`}
                    </p>
                    <p className="text-xs text-gray-400">{co.primary_contact_name || 'No contact set'}</p>

                    {co.cashflowSummary && (
                      <div className="mt-2 pt-2 border-t text-xs space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Collected</span>
                          <span>{formatCurrency(co.cashflowSummary.totalCollected)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Defaults</span>
                          <span>{co.cashflowSummary.defaultCount}</span>
                        </div>
                      </div>
                    )}

                    {canAdvance && (
                      <div className="mt-2">
                        <AdvanceStageButton assetcoId={co.id} currentStage={co.pipeline_stage} />
                      </div>
                    )}
                  </div>
                ))}
                {stageAssetcos.length === 0 && <p className="text-xs text-gray-400">None</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
