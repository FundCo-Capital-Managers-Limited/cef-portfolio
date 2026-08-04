import ApprovalsPanel from '../ApprovalsPanel';
import { getCurrentUserProfile } from '../../../lib/data';

export const metadata = { title: 'Approvals' };

export default async function ApprovalsPage() {
  const profile = await getCurrentUserProfile();
  const isApprover = ['management', 'it_admin'].includes(profile?.role);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Approvals</h1>
        <p className="text-sm text-gray-500">
          {isApprover
            ? 'CEF Series changes submitted by Finance or Risk wait here until you approve or reject them.'
            : 'Track the status of CEF Series changes you have submitted for approval.'}
        </p>
      </div>
      <ApprovalsPanel isApprover={isApprover} />
    </div>
  );
}
