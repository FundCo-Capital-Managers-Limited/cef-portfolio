import BackLink from '../../dashboard/BackLink';
import SecretariatDashboard from './SecretariatDashboard';

export const metadata = { title: 'Secretariat' };

export default function SecretariatPage() {
  return (
    <div className="space-y-4">
      <div>
        <BackLink href="/engagement">IC Engagement</BackLink>
        <h1 className="text-xl font-semibold mt-1">Secretariat</h1>
        <p className="text-sm text-gray-500">
          Meeting organization and minutes, plus every open condition or action across the matter register — the working list secretariat staff triage from.
        </p>
      </div>
      <SecretariatDashboard />
    </div>
  );
}
