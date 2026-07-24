import BackLink from '../../dashboard/BackLink';
import MattersPanel from '../MattersPanel';

export const metadata = { title: 'IC Matters' };

export default function MattersPage() {
  return (
    <div className="space-y-4">
      <div>
        <BackLink href="/engagement">IC Engagement</BackLink>
        <h1 className="text-xl font-semibold mt-1">Matter Register</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Every IC matter — new investments, disbursements, portfolio and problem-asset decisions, exits, and policy changes — in one place.
        </p>
      </div>
      <MattersPanel />
    </div>
  );
}
