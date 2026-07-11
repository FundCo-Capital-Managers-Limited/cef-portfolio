import Link from 'next/link';
import { getAssetRegistry } from '../../../lib/data';
import RegistryTable from './RegistryTable';

export const metadata = { title: "Asset Registry" };

export default async function AssetRegistryPage() {
  const assets = await getAssetRegistry();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
          ← Portfolio
        </Link>
        <h1 className="text-xl font-semibold mt-1">Asset Registry</h1>
        <p className="text-sm text-gray-500">
          Unified inventory of every CEF-funded asset across all AssetCos ({assets.length} total).
        </p>
      </div>

      <RegistryTable assets={assets} />
    </div>
  );
}
