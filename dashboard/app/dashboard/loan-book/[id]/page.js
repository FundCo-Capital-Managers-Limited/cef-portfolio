import BackLink from '../../BackLink';
import FacilityDetail from '../FacilityDetail';
import { getCurrentUserProfile } from '../../../../lib/data';

export const metadata = { title: 'Facility Detail' };

export default async function FacilityDetailPage({ params }) {
  const profile = await getCurrentUserProfile();

  return (
    <div className="space-y-4">
      <BackLink href="/dashboard/loan-book">Back to Loan Book</BackLink>
      <FacilityDetail facilityId={params.id} currentUserRole={profile?.role} currentUserAssetcoId={profile?.assetco_id} />
    </div>
  );
}
