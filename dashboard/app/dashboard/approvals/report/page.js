import ApprovalTrailReport from './ApprovalTrailReport';
import BackLink from '../../BackLink';

export const metadata = { title: 'Approval Trail' };

export default function ApprovalTrailReportPage() {
  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <BackLink href="/dashboard/approvals">Approvals</BackLink>
        <h1 className="text-xl font-semibold mt-1">Approval Trail</h1>
        <p className="text-sm text-gray-500">
          A printable, chronological record of every approval decision — who requested it, who decided it, and when.
        </p>
      </div>
      <ApprovalTrailReport />
    </div>
  );
}
