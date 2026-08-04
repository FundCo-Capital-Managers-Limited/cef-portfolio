import BackLink from '../../dashboard/BackLink';
import MeetingsPanel from '../MeetingsPanel';

export const metadata = { title: 'IC Meetings' };

export default function MeetingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <BackLink href="/engagement">IC Engagement</BackLink>
        <h1 className="text-xl font-semibold mt-1">Meetings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled IC meetings and their agendas.</p>
      </div>
      <MeetingsPanel />
    </div>
  );
}
