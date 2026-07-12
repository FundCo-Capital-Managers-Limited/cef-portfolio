import { getPipelineBoard, getCurrentUserProfile } from '../../../lib/data';
import PipelineBoard from './PipelineBoard';
import BackLink from '../BackLink';

export const metadata = { title: "Pipeline Board" };

export default async function PipelineBoardPage() {
  const [assetcos, profile] = await Promise.all([getPipelineBoard(), getCurrentUserProfile()]);
  const canAdvance = ['management', 'it_admin'].includes(profile?.role);

  return (
    <div className="space-y-4">
      <div>
        <BackLink href="/dashboard">Portfolio</BackLink>
        <h1 className="text-xl font-semibold mt-1">Pipeline Board</h1>
        <p className="text-sm text-gray-500">
          Every AssetCo from first contact through active portfolio monitoring.
        </p>
      </div>

      <PipelineBoard assetcos={assetcos} canAdvance={canAdvance} />
    </div>
  );
}
