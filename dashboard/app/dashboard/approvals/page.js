import Link from 'next/link';
import { FileText } from 'lucide-react';
import ApprovalsPanel from '../ApprovalsPanel';
import { getCurrentUserProfile } from '../../../lib/data';

export const metadata = { title: 'Approvals' };

export default async function ApprovalsPage() {
  const profile = await getCurrentUserProfile();
  const isApprover = ['management', 'it_admin'].includes(profile?.role);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Approvals</h1>
          <p className="text-sm text-gray-500">
            {isApprover
              ? 'CEF Series changes submitted by Finance or Risk wait here until you approve or reject them.'
              : 'Track the status of CEF Series changes you have submitted for approval.'}
          </p>
        </div>
        <Link
          href="/dashboard/approvals/report"
          className="inline-flex items-center gap-1.5 text-sm border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 shrink-0"
        >
          <FileText size={14} /> Approval Trail
        </Link>
      </div>
      <ApprovalsPanel isApprover={isApprover} />
    </div>
  );
}
