import Link from 'next/link';
import { getPipelineBoard, getCurrentUserProfile } from '../../../lib/data';
import PipelineBoard from './PipelineBoard';

export default async function PipelineBoardPage() {
  const [assetcos, profile] = await Promise.all([getPipelineBoard(), getCurrentUserProfile()]);
  const canAdvance = ['management', 'it_admin'].includes(profile?.role);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
          ← Portfolio
        </Link>
        <h1 className="text-xl font-semibold mt-1">Pipeline Board</h1>
        <p className="text-sm text-gray-500">
          Every AssetCo from first contact through active portfolio monitoring.
        </p>
      </div>

      <PipelineBoard assetcos={assetcos} canAdvance={canAdvance} />
    </div>
  );
}
