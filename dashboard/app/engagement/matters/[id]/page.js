import BackLink from '../../../dashboard/BackLink';
import MatterDetail from '../../MatterDetail';
import DocumentsPanel from '../../DocumentsPanel';
import ConditionsPanel from '../../ConditionsPanel';
import ComposeEmailPanel from '../../ComposeEmailPanel';

export const metadata = { title: 'Matter Detail' };

export default function MatterDetailPage({ params }) {
  return (
    <div className="space-y-4">
      <BackLink href="/engagement/matters">Back to Matters</BackLink>
      <MatterDetail matterId={params.id} />
      <ConditionsPanel matterId={params.id} />
      <DocumentsPanel matterId={params.id} />
      <ComposeEmailPanel matterId={params.id} />
    </div>
  );
}
