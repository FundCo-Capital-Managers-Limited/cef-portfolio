import BackLink from '../../../dashboard/BackLink';
import MatterDetail from '../../MatterDetail';

export const metadata = { title: 'Matter Detail' };

export default function MatterDetailPage({ params }) {
  return (
    <div className="space-y-4">
      <BackLink href="/engagement/matters">Back to Matters</BackLink>
      <MatterDetail matterId={params.id} />
    </div>
  );
}
