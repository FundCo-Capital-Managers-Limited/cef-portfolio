import BackLink from '../../dashboard/BackLink';
import ComposeEmailPanel from '../ComposeEmailPanel';

export const metadata = { title: 'IC Email' };

export default function EmailPage() {
  return (
    <div className="space-y-4">
      <div>
        <BackLink href="/engagement">IC Engagement</BackLink>
        <h1 className="text-xl font-semibold mt-1">Email</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Send correspondence to sponsors, counsel, or other external parties directly from the portal.
        </p>
      </div>
      <ComposeEmailPanel />
    </div>
  );
}
