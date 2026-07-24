import BackLink from '../../../dashboard/BackLink';
import MeetingDetail from '../../MeetingDetail';
import { getCurrentUserProfile } from '../../../../lib/data';
import { AUTO_IC_ROLES } from '../../../../lib/icAccess';

export const metadata = { title: 'Meeting Detail' };

export default async function MeetingDetailPage({ params }) {
  const profile = await getCurrentUserProfile();
  const autoManage = AUTO_IC_ROLES.includes(profile?.role);

  return (
    <div className="space-y-4">
      <BackLink href="/engagement/meetings">Back to Meetings</BackLink>
      <MeetingDetail meetingId={params.id} currentUserId={profile?.id} autoManage={autoManage} />
    </div>
  );
}
