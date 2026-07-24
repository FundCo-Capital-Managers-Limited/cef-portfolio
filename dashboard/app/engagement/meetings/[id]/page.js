import BackLink from '../../../dashboard/BackLink';
import MeetingDetail from '../../MeetingDetail';

export const metadata = { title: 'Meeting Detail' };

export default function MeetingDetailPage({ params }) {
  return (
    <div className="space-y-4">
      <BackLink href="/engagement/meetings">Back to Meetings</BackLink>
      <MeetingDetail meetingId={params.id} />
    </div>
  );
}
