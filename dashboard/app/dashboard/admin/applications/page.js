import { getCurrentUserProfile } from '../../../../lib/data';
import BackLink from '../../BackLink';
import ApplicationsPanel from './ApplicationsPanel';

export const metadata = { title: "Onboarding Applications" };

export default async function AdminApplicationsPage() {
  const profile = await getCurrentUserProfile();
  const canReview = ['executive', 'management', 'it_admin'].includes(profile?.role);

  if (!canReview) {
    return (
      <div className="space-y-4">
        <BackLink href="/dashboard">Portfolio</BackLink>
        <p className="text-sm text-gray-600">
          Only Executive, Management, or IT Admin can review onboarding applications.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <BackLink href="/dashboard">Portfolio</BackLink>
        <h1 className="text-xl font-semibold mt-1">AssetCo Onboarding Applications</h1>
        <p className="text-sm text-gray-500">
          Prospective AssetCos who self-registered via the public onboarding form. Approving one creates a
          live AssetCo record at the Onboarding stage.
        </p>
      </div>

      <ApplicationsPanel />
    </div>
  );
}
