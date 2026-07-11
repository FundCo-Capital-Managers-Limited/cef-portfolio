import { getCurrentUserProfile } from '../../../lib/data';
import DevConsolePanel from './DevConsolePanel';

export const metadata = { title: 'Developer Console' };

export default async function DevConsolePage() {
  const profile = await getCurrentUserProfile();

  if (profile?.role !== 'assetco_dev') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">This page is only available to AssetCo Developer accounts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold dark:text-white">Developer Console</h1>
        <p className="text-sm text-gray-500">
          Manage your own AssetCo integration credentials — no need to wait on CEF for this.
        </p>
      </div>

      <DevConsolePanel />
    </div>
  );
}
