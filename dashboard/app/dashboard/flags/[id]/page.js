import BackLink from '../../BackLink';
import FlagDetail from '../../FlagDetail';

export const metadata = { title: 'Flag Detail' };

export default function FlagDetailPage({ params }) {
  return (
    <div className="space-y-4">
      <BackLink href="/dashboard/flags">Back to Flags</BackLink>
      <FlagDetail flagId={params.id} />
    </div>
  );
}
