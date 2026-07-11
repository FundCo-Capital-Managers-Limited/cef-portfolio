import Link from 'next/link';
import { getDreefPipeline } from '../../../lib/data';
import DreefTable from './DreefTable';

export default async function DreefPipelinePage() {
  const relationships = await getDreefPipeline();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
          ← Portfolio
        </Link>
        <h1 className="text-xl font-semibold mt-1">DREEF Pipeline</h1>
        <p className="text-sm text-gray-500">
          Every AssetCo with an InfraCredit/DREEF relationship — including those not yet funded by CEF.
        </p>
      </div>

      <DreefTable relationships={relationships} />
    </div>
  );
}
