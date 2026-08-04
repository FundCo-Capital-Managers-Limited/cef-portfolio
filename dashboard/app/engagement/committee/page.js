import BackLink from '../../dashboard/BackLink';
import CommitteeRosterPanel from '../CommitteeRosterPanel';
import { getCurrentUserProfile } from '../../../lib/data';
import { AUTO_IC_ROLES } from '../../../lib/icAccess';

export const metadata = { title: 'IC Committee Roster' };

export default async function CommitteePage() {
  const profile = await getCurrentUserProfile();
  const autoManage = AUTO_IC_ROLES.includes(profile?.role);

  return (
    <div className="space-y-4">
      <div>
        <BackLink href="/engagement">IC Engagement</BackLink>
        <h1 className="text-xl font-semibold mt-1">Committee Roster</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Who's currently on the IC. Membership isn't fixed - add, remove, or change the Chair/Secretary as needed.
        </p>
      </div>
      <CommitteeRosterPanel currentUserId={profile?.id} autoManage={autoManage} />
    </div>
  );
}
