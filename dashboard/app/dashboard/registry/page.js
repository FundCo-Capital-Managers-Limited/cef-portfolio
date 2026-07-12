import Link from 'next/link';
import { getAssetRegistry, getPortfolioSummary } from '../../../lib/data';
import AssetCoRegistryCards from '../AssetCoRegistryCards';
import RegistryTable from './RegistryTable';

export const metadata = { title: "AssetCo Registry" };

export default async function AssetCoRegistryPage() {
  const [assets, summary] = await Promise.all([getAssetRegistry(), getPortfolioSummary()]);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
          ← Portfolio
        </Link>
        <h1 className="text-xl font-semibold mt-1 dark:text-white">AssetCo Registry</h1>
        <p className="text-sm text-gray-500">
          Every AssetCo CEF has onboarded ({summary.assetCoCards.length} total).
        </p>
      </div>

      <AssetCoRegistryCards assetCoCards={summary.assetCoCards} />

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold dark:text-white">Asset Registry</h2>
          <p className="text-sm text-gray-500">
            Unified inventory of every CEF-funded asset across all AssetCos ({assets.length} total).
          </p>
        </div>

        <RegistryTable assets={assets} />
      </div>
    </div>
  );
}
